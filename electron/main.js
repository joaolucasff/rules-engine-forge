const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: 'Automacao de Fluxo de Caixa'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('Carregando:', indexPath);
    mainWindow.loadFile(indexPath);
    
    // Temporario: abre DevTools em producao para debug
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  let serverDir;
  
  if (isDev) {
    serverDir = path.join(__dirname, '..', 'server');
  } else {
    serverDir = path.join(process.resourcesPath, 'server');
  }

  const serverScript = path.join(serverDir, 'dist', 'index.js');

  console.log('Server dir:', serverDir);
  console.log('Server script:', serverScript);

  if (!fs.existsSync(serverScript)) {
    console.error('Backend script not found:', serverScript);
    return;
  }

  // Usa fork em vez de spawn para usar o Node do Electron
  backendProcess = fork(serverScript, [], {
    cwd: serverDir,
    env: { 
      ...process.env, 
      NODE_ENV: isDev ? 'development' : 'production' 
    },
    silent: true
  });

  backendProcess.stdout.on('data', (data) => {
    console.log('Backend: ' + data);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('Backend Error: ' + data);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log('Backend exited with code ' + code);
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

app.whenReady().then(() => {
  startBackend();
  
  setTimeout(() => {
    createWindow();
  }, 3000);
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  stopBackend();
});