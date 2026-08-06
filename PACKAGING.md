# UPshop Management Packaging & Production Deployment Guide

This guide provides detailed instructions on how to package, run, and distribute the UPshop Management application as a production-ready system. 

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Production Web Deployment](#2-production-web-deployment)
3. [Packaging as a Desktop App (Electron)](#3-packaging-as-a-desktop-app-electron)
4. [Transitioning to SQLite/PostgreSQL](#4-transitioning-to-sqlitepostgresql)
5. [Data Backup & Maintenance](#5-data-backup--maintenance)

---

## 1. Prerequisites

Before deploying or packaging the application, ensure you have:
- **Node.js**: v18.x or v20.x installed.
- **npm**: Installed automatically with Node.js.
- **Environment Variables**: Set up a `.env` or `.env.production` in the project root containing:
  ```env
  PORT=9002
  JWT_SECRET=your_super_secret_jwt_key_here
  ```

---

## 2. Production Web Deployment

To run this project as a robust web service accessible via local network or public domain:

### Step 2.1: Clean Production Build
Compile the TypeScript and React code into optimized, server-rendered static and dynamic assets:
```bash
# Set build environment and compile
npx next build
```

### Step 2.2: Process Management (Using PM2)
To keep the application running continuously in the background and restart it if it crashes, use **PM2**:
1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```
2. Start the Next.js production server:
   ```bash
   pm2 start npm --name "upshop-console" -- run start
   ```
3. Set PM2 to automatically startup on system boot:
   ```bash
   pm2 startup
   pm2 save
   ```

### Step 2.3: Reverse Proxy with Nginx (Recommended)
If you want users to access the app over a domain name with SSL (HTTPS), place **Nginx** in front of your Next.js app:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3. Packaging as a Desktop App (Electron)

If you want to package UPshop as a standalone desktop application (`.exe` on Windows or `.app` on Mac) that runs offline without needing manual terminal commands:

### Option A: Electron Wrapper (Fastest & Simplest)
We can package the Next.js production build and wrap it in a lightweight Electron script.

1. **Install Electron dependencies**:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. **Create an `main.js` Electron entry point** in your project root:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const { spawn } = require('child_process');
   const path = require('path');

   let serverProcess;
   let mainWindow;

   function startServer() {
     // Run next start internally
     serverProcess = spawn('npx', ['next', 'start', '-p', '9002'], {
       cwd: app.getAppPath(),
       shell: true,
       env: { ...process.env, NODE_ENV: 'production' }
     });

     serverProcess.stderr.on('data', (data) => {
       console.error(`Next.js Server error: ${data}`);
     });
   }

   function createWindow() {
     mainWindow = new BrowserWindow({
       width: 1280,
       height: 800,
       title: "UPshop Management Console",
       icon: path.join(__dirname, 'public/favicon.ico'),
       webPreferences: {
         nodeIntegration: false
       }
     });

     // Wait briefly for local server to spin up, then load the port
     setTimeout(() => {
       mainWindow.loadURL('http://localhost:9002');
     }, 1500);

     mainWindow.on('closed', () => {
       mainWindow = null;
     });
   }

   app.on('ready', () => {
     startServer();
     createWindow();
   });

   app.on('window-all-closed', () => {
     if (serverProcess) serverProcess.kill();
     if (process.platform !== 'darwin') {
       app.quit();
     }
   });
   ```

3. **Configure `package.json` for building the executable**:
   Add the following config keys:
   ```json
   "main": "main.js",
   "build": {
     "appId": "com.upshop.management",
     "productName": "UPshop",
     "files": [
       "**/*",
       "next.config.ts",
       "package.json"
     ],
     "win": {
       "target": "nsis",
       "icon": "public/favicon.ico"
     }
   }
   ```

4. **Package the executable**:
   ```bash
    npx electron-builder
    ```
    This compiles everything into a double-clickable installer under a newly created `/dist` folder.

### Common Packaging Troubleshooting:

1. **"Attempting to build a module with a space in the path" / "node-gyp failed to rebuild"**:
   - **Reason**: The C++ builder (`node-gyp`) cannot compile native SQLite binaries if the parent directory path contains spaces or parentheses (e.g., `Downloads/project (1)`).
   - **Fix**: Move or rename the project folder to a path without spaces (for example: `C:\project-upshop` or `C:\upshop`).

2. **"EPERM: operation not permitted, unlink node_sqlite3.node"**:
   - **Reason**: The database binary is locked by a running development server in the background.
   - **Fix**: Stop the local development server (kill the active terminal running `npm run dev`) before running `electron-builder` so the packer can package the database drivers.

---

## 4. Transitioning to SQLite/PostgreSQL

The current implementation utilizes `/data/db.json` for local data persistence. It is lightweight, database-driver-free, and handles simple local store management perfectly. 

If your data grows extremely large or requires concurrent terminal access, you can transition to a SQL database.

### How to transition `src/lib/db.ts` to SQLite:
1. Install sqlite3 driver or Prisma:
   ```bash
   npm install sqlite3 @types/sqlite3
   ```
2. Rewrite `/src/lib/db.ts` to query a local SQLite file instead of a JSON file:
   ```typescript
   import sqlite3 from 'sqlite3';
   import { open } from 'sqlite';

   // Open and initialize sqlite db
   export async function getSqliteDb() {
     return open({
       filename: './data/upshop.db',
       driver: sqlite3.Database
     });
   }
   ```
3. Update the CRUD handlers in `src/lib/db.ts` to execute SQL queries:
   ```typescript
   // Example translation for search/findUser
   export async function findUser(email: string) {
     const db = await getSqliteDb();
     return db.get('SELECT * FROM users WHERE email = ?', [email]);
   }
   ```

Because all API routes fetch data via these exported helper methods in `src/lib/db.ts`, **you do not need to modify the frontend pages or API routes** if you decide to change database storage engines in the future!

---

## 5. Data Backup & Maintenance

- **Backup file**: All products, warehouse stock, sales history, and user profiles are stored in:
  `[Project Root]/data/db.json`
- **How to backup**: Simply copy the `db.json` file or the entire `data` directory to a cloud backup drive (Google Drive, Dropbox, etc.) or a flash drive. 
- **Restoring**: Paste the backed up `db.json` file back into the `data` folder on any machine running the application, and all inventory data will be restored instantly.
