import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "node:path";
import dns from "node:dns";
import started from "electron-squirrel-startup";
import {WebSocketServer} from "ws";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const REMOTE_HOST = "172.25.32.1:8000";       // real backend (Django Channels etc.)
const LOCAL_FALLBACK_PORT = 5500;           // bundled local socket server
const CONNECTIVITY_CHECK_HOST = "8.8.8.8";  // used purely to test internet reachability
const CONNECTIVITY_RECHECK_MS = 15000;

let localWss = null;
let isOnline = false;
let mainWindowRef = null;

/**
 * Quick internet reachability check via DNS resolution.
 * Doesn't guarantee the REMOTE_HOST backend itself is reachable —
 * just that the machine has a route to the internet.
 */
function checkInternet() {
  return new Promise((resolve) => {
    dns.lookup(CONNECTIVITY_CHECK_HOST, (err) => {
      resolve(!err);
    });
  });
}

function broadcastNetworkStatus() {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send("network:status-changed", getNetworkConfig());
  }
}

async function refreshConnectivity() {
  const online = await checkInternet();

  if (online !== isOnline) {
    isOnline = online;
    console.log(`Network status changed: ${isOnline ? "ONLINE" : "OFFLINE"}`);
    broadcastNetworkStatus();
  }
}

function getNetworkConfig() {
  return isOnline
    ? {
        online: true,
        apiBase: `http://${REMOTE_HOST}`,
        wsBase: `ws://${REMOTE_HOST}`,
      }
    : {
        online: false,
        apiBase: `http://172.25.32.1:${LOCAL_FALLBACK_PORT}`,
        wsBase: `ws://172.25.32.1:${LOCAL_FALLBACK_PORT}`,
      };
}

/**
 * Local fallback WebSocket server — always running, so the app keeps working
 * (e.g. against locally cached/generated data) even with no internet.
 */
function startLocalSocketServer() {
  if (localWss) {
    return localWss;
  }

  localWss = new WebSocketServer({ port: LOCAL_FALLBACK_PORT, path: "/ws/" });

  localWss.on("listening", () => {
    console.log(`Local fallback WebSocket server listening on ws://172.25.32.1:${LOCAL_FALLBACK_PORT}/ws/`);
  });

  localWss.on("connection", (socket) => {
    console.log("Client connected to local fallback WebSocket server");

    socket.on("message", (message) => {
      console.log("Local WS received message:", message.toString());
    });

    socket.on("close", () => {
      console.log("Client disconnected from local fallback WebSocket server");
    });

    socket.on("error", (err) => {
      console.error("Local WS client error:", err);
    });
  });

  localWss.on("error", (err) => {
    console.error("Local fallback WebSocket server error:", err);
  });

  return localWss;
}

function stopLocalSocketServer() {
  if (!localWss) return;

  localWss.clients.forEach((client) => client.terminate());
  localWss.close(() => {
    console.log("Local fallback WebSocket server closed");
  });
  localWss = null;
}

function registerNetworkIPC() {
  ipcMain.handle("network:get-config", async () => {
    return getNetworkConfig();
  });
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    title: "Electricity Power Monitor Admin",
    width: 1400,
    height: 900,
    fullscreen: true,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindowRef = mainWindow;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
      )
    );
  }

  mainWindow.webContents.openDevTools();
};

app.whenReady().then(async () => {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "Alt+F4",
          click: () => app.quit(),
        },
      ],
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
          click: () => {
            console.log("Electricity Power Monitor Admin");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 1. Always start the local fallback socket server, whether or not we're online.
  startLocalSocketServer();

  // 2. Check connectivity once before the window opens, so the renderer's
  //    first getNetworkConfig() call already reflects reality...
  isOnline = await checkInternet();
  console.log(`Initial network status: ${isOnline ? "ONLINE" : "OFFLINE"}`);

  // 3. ...and keep rechecking periodically in case connectivity changes mid-session.
  setInterval(refreshConnectivity, CONNECTIVITY_RECHECK_MS);

  registerNetworkIPC();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopLocalSocketServer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopLocalSocketServer();
});