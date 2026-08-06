const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  selectDirectory: () => ipcRenderer.invoke("dialog:selectDirectory"),
});
