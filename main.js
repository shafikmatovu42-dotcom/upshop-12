const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let serverProcess;
let mainWindow;
const PORT = process.env.PORT || 9002;
let logStream;

function setupLogging() {
  try {
    const logDir = app.getPath('userData');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, 'app-debug.log');
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      const logLine = `[${new Date().toISOString()}] [INFO] ${msg}\n`;
      logStream.write(logLine);
      originalLog(...args);
    };

    console.error = (...args) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      const logLine = `[${new Date().toISOString()}] [ERROR] ${msg}\n`;
      logStream.write(logLine);
      originalError(...args);
    };

    console.log('--- Application Startup ---');
    console.log(`userData Path: ${logDir}`);
    console.log(`App Path: ${app.getAppPath()}`);
    console.log(`Exec Path: ${process.execPath}`);
  } catch (err) {
    console.error('Failed to setup logging:', err);
  }
}

// Initialize logging immediately
setupLogging();

function startServer() {
  const nextBin = path.join(app.getAppPath(), 'node_modules/next/dist/bin/next');
  
  console.log(`Starting Next.js server with bin: ${nextBin} on port ${PORT}`);

  // Use Electron's own node process (process.execPath) to run the server.
  serverProcess = spawn(process.execPath, [nextBin, 'start', '-p', PORT], {
    cwd: app.getAppPath(),
    shell: false,
    env: { 
      ...process.env, 
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      JWT_SECRET: process.env.JWT_SECRET || 'upshop-internal-encryption-key-shafik'
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Next.js Server stdout]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Server stderr]: ${data.toString().trim()}`);
  });

  serverProcess.on('error', (err) => {
    console.error(`[Next.js Server Process Error]:`, err);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Next.js Server Process Exit]: Exited with code ${code} and signal ${signal}`);
  });
}

function pollServerAndLoad(window, url, retries = 100) {
  if (!mainWindow) return;

  http.get(url, (res) => {
    if (res.statusCode === 200) {
      window.loadURL(url);
    } else {
      setTimeout(() => pollServerAndLoad(window, url, retries - 1), 200);
    }
  }).on('error', () => {
    if (retries > 0) {
      setTimeout(() => pollServerAndLoad(window, url, retries - 1), 200);
    } else {
      console.error('Failed to connect to internal server');
      window.loadURL(`data:text/html,
        <html>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:#1e293b;color:white;text-align:center;padding:24px;">
            <h2 style="font-weight:800;color:#ef4444;">Server Boot Failed</h2>
            <p style="color:#94a3b8;font-size:14px;max-width:320px;">The background application server did not start. Please close and relaunch this app.</p>
          </body>
        </html>
      `);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "UPshop Management Console",
    icon: path.join(__dirname, 'public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove system menu for clean desktop view
  mainWindow.setMenuBarVisibility(false);

  // Splash loading screen
  mainWindow.loadURL(`data:text/html,
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:#111827;color:white;margin:0;">
        <div style="text-align:center;">
          <h2 style="margin-bottom:8px;font-weight:900;letter-spacing:-0.05em;font-size:28px;color:#f59e0b;">UPSHOP</h2>
          <p style="color:#9ca3af;font-size:13px;font-weight:600;margin-top:0;">Launching Management System...</p>
        </div>
      </body>
    </html>
  `);

  pollServerAndLoad(mainWindow, `http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
