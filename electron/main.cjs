const { app, BrowserWindow, Menu, globalShortcut, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");

const isDev = !path.join(__dirname).includes("app.asar");
let backendProcess = null;

// Ensure log directory exists in AppData / userData
const logDir = path.join(app.getPath("userData"), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, "backend.log");
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

function logMsg(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  logStream.write(line);
}

function checkBackendPort(host = "127.0.0.1", port = 8000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForBackend(timeoutMs = 35000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const isReady = await checkBackendPort("127.0.0.1", 8000);
    if (isReady) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function startBackend() {
  let backendPath = isDev
    ? path.join(__dirname, "../../server/dist/ERP_Backend/ERP_Backend.exe")
    : path.join(process.resourcesPath, "ERP_Backend", "ERP_Backend.exe");

  let executable = backendPath;
  let args = [];
  let cwd = path.dirname(backendPath);

  if (fs.existsSync(backendPath)) {
    logMsg(`Starting backend executable from: ${backendPath}`);
  } else if (isDev) {
    // In dev mode, if compiled PyInstaller binary does not exist yet, fallback to python script
    const devServerPy = path.join(__dirname, "../../server/run_server.py");
    const serverDir = path.join(__dirname, "../../server");
    if (fs.existsSync(devServerPy)) {
      logMsg("Compiled backend executable not found. Falling back to 'uv run python run_server.py'");
      executable = "uv";
      args = ["run", "python", "run_server.py"];
      cwd = serverDir;
    } else {
      logMsg(`ERROR: Backend python script not found at ${devServerPy}`);
      return;
    }
  } else {
    logMsg(`ERROR: Backend executable not found at ${backendPath}`);
    return;
  }

  try {
    backendProcess = spawn(executable, args, {
      cwd: cwd,
      detached: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    backendProcess.stdout.on("data", (data) => {
      logStream.write(`[STDOUT] ${data.toString()}`);
    });

    backendProcess.stderr.on("data", (data) => {
      logStream.write(`[STDERR] ${data.toString()}`);
    });

    backendProcess.on("error", (err) => {
      logMsg(`Failed to start backend process: ${err.message}`);
    });

    backendProcess.on("exit", (code, signal) => {
      logMsg(`Backend process exited with code ${code} and signal ${signal}`);
    });
  } catch (e) {
    logMsg(`Exception while starting backend: ${e.message}`);
  }
}

function killBackend() {
  if (backendProcess) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/F", "/T", "/PID", backendProcess.pid]);
      } else {
        backendProcess.kill();
      }
    } catch (e) {
      logMsg(`Error killing backend process: ${e.message}`);
    }
    backendProcess = null;
  }
}

async function createWindow() {
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "LenDen - Khata Book",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/icon.png"),
  });

  const loadingHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            background-color: #0f172a;
            color: #f8fafc;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-left-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { margin: 0 0 8px 0; font-size: 22px; font-weight: 600; }
          p { margin: 0; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>LenDen ERP</h2>
        <p>Starting backend database & server, please wait...</p>
      </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F5" || (input.control && input.key === "r")) {
      win.webContents.reload();
    }
    if (input.control && input.shift && input.key === "I") {
      win.webContents.toggleDevTools();
    }
  });

  // Check if backend is already listening
  const isAlreadyRunning = await checkBackendPort("127.0.0.1", 8000);
  if (!isAlreadyRunning) {
    startBackend();
  } else {
    logMsg("Backend is already running on port 8000.");
  }

  const backendReady = await waitForBackend(35000);
  if (backendReady) {
    logMsg("Backend is ready! Loading frontend UI...");
    if (isDev) {
      win.loadURL("http://localhost:5173");
    } else {
      win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
  } else {
    logMsg("TIMEOUT: Backend failed to respond on port 8000 within timeout.");
    const errorHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              background-color: #0f172a;
              color: #f8fafc;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              background: #1e293b;
              border: 1px solid #ef4444;
              border-radius: 10px;
              padding: 28px;
              max-width: 520px;
              text-align: center;
            }
            h2 { color: #ef4444; margin-top: 0; font-size: 20px; }
            p { color: #cbd5e1; font-size: 14px; line-height: 1.5; margin: 12px 0; }
            .log-path {
              background: #0f172a;
              padding: 8px 12px;
              border-radius: 6px;
              font-family: monospace;
              font-size: 12px;
              color: #38bdf8;
              word-break: break-all;
            }
            button {
              margin-top: 18px;
              padding: 10px 20px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
            }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Backend Server Error</h2>
            <p>Could not connect to LenDen backend server on port 8000.</p>
            <div class="log-path">${logFilePath.replace(/\\/g, "/")}</div>
            <button onclick="location.reload()">Retry Connection</button>
          </div>
        </body>
      </html>
    `;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
  }
}

ipcMain.handle("dialog:selectDirectory", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return result.canceled ? null : result.filePaths[0];
});

app.whenReady().then(() => {
  if (!isDev) {
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.resourcesPath ? process.execPath : "",
      });
    } catch (e) {
      logMsg(`Could not set login item settings: ${e.message}`);
    }
  }

  createWindow();
});

app.on("window-all-closed", () => {
  killBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  killBackend();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
