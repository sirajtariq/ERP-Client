const { app, BrowserWindow, Menu, globalShortcut } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "LenDen - Khata Book",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/icon.png"),
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F5" || (input.control && input.key === "r")) {
      win.webContents.reload();
    }
    if (input.control && input.shift && input.key === "I") {
      win.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
