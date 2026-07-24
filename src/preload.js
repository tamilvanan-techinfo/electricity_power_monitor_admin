// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// preload.js
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // ... your existing exposed methods (saveParticipant, getAllParticipants, etc.) go here too

  getNetworkConfig: () => ipcRenderer.invoke("network:get-config"),

  onNetworkStatusChanged: (callback) => {
    const listener = (_event, config) => callback(config);
    ipcRenderer.on("network:status-changed", listener);
    return () => ipcRenderer.removeListener("network:status-changed", listener);
  },
});