import { app, BrowserWindow, Menu, ipcMain,screen  } from "electron";
import path from "node:path";
import dns from "node:dns";
import fs from "node:fs";
import started from "electron-squirrel-startup";
import { Server as SocketIOServer } from "socket.io";
import sqlite from "sqlite3"

// import IndividualParticipantCache from "./cacheService/IndividualParicipentCache.js";

if (started) {
  app.quit();
}

const REMOTE_HOST = "127.0.0.1:8000";
const LOCAL_FALLBACK_PORT = 5500;
const CONNECTIVITY_CHECK_HOST = "8.8.8.8";
const CONNECTIVITY_CHECK_INTERVAL_MS = 5000; // check every 5s in the background

let db;
let participantCache;
let localIo = null;
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
        apiBase: `http://${REMOTE_HOST}`,
        socketBase: `http://${REMOTE_HOST}`,
      }
    : {
        online: false,
        apiBase: `http://127.0.0.1:${LOCAL_FALLBACK_PORT}`,
        socketBase: `http://127.0.0.1:${LOCAL_FALLBACK_PORT}`,
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

/* ---------------- SQLite ---------------- */

function getDatabasePath() {
  return path.join(app.getPath("userData"), "cache.db");
}

function ensureDatabaseFile() {
  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "");
  }

  return dbPath;
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    sqlite.verbose();
    const dbPath = ensureDatabaseFile();

    db = new sqlite.Database(dbPath, (err) => {
      if (err) return reject(err);

      console.log("Connected to SQLite:", dbPath);

      db.run(
        `
        CREATE TABLE IF NOT EXISTS individual_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            screen_name TEXT NOT NULL,
            cycle TEXT NOT NULL,
            total_voltage REAL NOT NULL,
            total_amperage REAL NOT NULL,
            total_power REAL NOT NULL,
            participant_name TEXT NOT NULL,
            profile_image TEXT,
            participant_voltage REAL NOT NULL,
            participant_amperage REAL NOT NULL,
            participant_power REAL NOT NULL,
            ts REAL NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        `,
        (err2) => {
          if (err2) return reject(err2);
          // participantCache = new IndividualParticipantCache(db);
          resolve();
        }
      );
    });
  });
}

/* ---------------- Local socket.io fallback ---------------- */

function startLocalSocketServer() {
  if (localIo) return localIo;

  localIo = new SocketIOServer(LOCAL_FALLBACK_PORT, {
    cors: { origin: "*" },
  });

  localIo.on("connection", (socket) => {
    console.log("Client connected to local fallback socket.io server:", socket.id);

    socket.on("disconnect", (reason) => {
      console.log("Client disconnected from local fallback server:", socket.id, reason);
    });

    // Renderer's offline dashboard emits this when the operator manually
    // updates a score — persist it, then broadcast it back out to any
    // other connected screens so they stay in sync while offline.
    socket.on("manual_score_update", async (payload) => {
      try {
        const result = await participantCache.save({
          screen_name: payload.screen_name || "Individual",
          cycle: payload.cycle,
          total_voltage: payload.total_voltage,
          total_amperage: payload.total_amperage,
          total_power: payload.total_power,
          participant_name: payload.participant_name || "",
          profile_image: payload.profile_image || "",
          participant_voltage: payload.participant_voltage || 0,
          participant_amperage: payload.participant_amperage || 0,
          participant_power: payload.participant_power || 0,
          ts: Date.now(),
        });

        localIo.emit("score_updated", { ...payload, ...result });
      } catch (err) {
        console.error("Failed to save manual score update:", err);
        socket.emit("score_update_error", { message: err.message });
      }
    });
  });

  console.log(`Local fallback socket.io server listening on http://127.0.0.1:${LOCAL_FALLBACK_PORT}`);
  return localIo;
}

function stopLocalSocketServer() {
  if (!localIo) return;
  localIo.close(() => console.log("Local fallback socket.io server closed"));
  localIo = null;
}

/* ---------------- IPC ---------------- */

function registerIPC() {
  ipcMain.handle("network:get-config", async () => getNetworkConfig());

  // Lets the renderer's offline dashboard save a score directly via IPC too
  // (not just through the socket) — handy for a plain form submit.
  ipcMain.handle("participant:save", async (_, data) => {
    return await participantCache.save(data);
  });

  ipcMain.handle("participant:getAll", async () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM individual_participants ORDER BY cycle ASC`, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  });
}

/* ---------------- Window / app lifecycle ---------------- */

const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    title: "Electricity Power Monitor Admin",
    width,height,
     autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindowRef = mainWindow;
mainWindow.webContents.openDevTools()
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
    await initDatabase();

    startLocalSocketServer();

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
  stopLocalSocketServer();
  if (db) db.close();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopLocalSocketServer();
});