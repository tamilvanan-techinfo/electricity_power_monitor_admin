import { app, BrowserWindow, Menu, ipcMain, screen } from "electron";
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import started from "electron-squirrel-startup";
import config from "./config.json";

// __dirname / __filename don't exist in ESM (this file is built/loaded as
// main.mjs) — reconstruct them from import.meta.url so every existing
// path.join(__dirname, ...) call below keeps working unchanged.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (started) {
  app.quit();
}

const API_BASE = config.apiBase;
const SOCKET_BASE = config.socketBase;
//const REMOTE_HOST = "127.0.0.1:8000";
const CONNECTIVITY_CHECK_HOST = "8.8.8.8";
const CONNECTIVITY_CHECK_INTERVAL_MS = 5000; // check every 5s in the background

let isOnline = true; // assume online until first check completes
let mainWindowRef = null;

/* ---------------- Connectivity ---------------- */

function checkInternet() {
  return new Promise((resolve) => {
    dns.lookup(CONNECTIVITY_CHECK_HOST, (err) => resolve(!err));
  });
}

function getNetworkConfig() {
  return isOnline
    ? {
        online: true,
        apiBase: API_BASE,
        socketBase: SOCKET_BASE,
      }
    : {
        online: false,
        apiBase: API_BASE,
        socketBase: SOCKET_BASE,
      };
}

function broadcastNetworkStatus() {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send("network:status-changed", getNetworkConfig());
  }
}

async function pollConnectivity() {
  const online = await checkInternet();

  if (online !== isOnline) {
    isOnline = online;
    console.log(`Network status changed: ${isOnline ? "ONLINE" : "OFFLINE"}`);
    broadcastNetworkStatus(); // renderer listens for this and swaps to the offline dashboard
  }
}

function startConnectivityWatcher() {
  // runs continuously in the background for the lifetime of the app
  setInterval(pollConnectivity, CONNECTIVITY_CHECK_INTERVAL_MS);
}

/* ---------------- IPC ---------------- */

function registerIPC() {
  ipcMain.handle("network:get-config", async () => getNetworkConfig());
}

/* ---------------- Window / app lifecycle ---------------- */

const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    title: "Electricity Power Monitor Admin",
    width,
    height,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindowRef = mainWindow;
  // mainWindow.webContents.openDevTools()
  // Optional: prevent Alt key from hiding/showing it

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

app.whenReady().then(async () => {
  const template = [
    {
      label: "File",
      submenu: [{ label: "Exit", accelerator: "Alt+F4", click: () => app.quit() }],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => console.log("Electricity Power Monitor Admin"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  try {
    // do an initial synchronous check so the very first render already knows
    isOnline = await checkInternet();
    console.log(`Initial network status: ${isOnline ? "ONLINE" : "OFFLINE"}`);

    startConnectivityWatcher(); // keeps running in the background for the app's lifetime

    registerIPC();

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (err) {
    console.error("Application startup failed:", err);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});