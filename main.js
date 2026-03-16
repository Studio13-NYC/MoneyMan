const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Load .env: dev = project root; packaged = exe dir, then userData (portable exe often runs from temp)
function loadEnv() {
  const candidates = app.isPackaged
    ? [
        path.join(path.dirname(process.execPath), '.env'),
        path.join(path.dirname(app.getPath('exe')), '.env'),
        path.join(app.getPath('userData'), '.env'),
      ]
    : [path.join(process.cwd(), '.env')];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      break;
    }
  }
}
loadEnv();

const { startPolling, stopPolling, getState, updatePollInterval } = require('./lib/poller');
const { getConfig, setConfig } = require('./lib/config');

let mainWindow = null;
let tray = null;

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  let icon = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAhklEQVQ4T2NkYGD4z0ABYBw1gGE0DBgZGBj+M/z//5+BYTQMRsOAgYGBgYHhPwPDaBiMhgEDAwPDf4b/MD4DAwMDw38YH8Zn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A/jM/xn+A8A6ewU0Rg+LAAAAABJRU5ErkJggg==');
  }
  if (process.platform === 'win32') {
    icon = icon.resize({ width: 16, height: 16 });
  }
  tray = new Tray(icon);
  tray.setToolTip('MoneyMan – OpenAI & Cursor spend');
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      mainWindow.focus();
    }
  });
  updateTrayMenu();
}

function updateTrayMenu() {
  const state = getState();
  const openItem = { label: mainWindow?.isVisible() ? 'Hide' : 'Show MoneyMan', click: () => mainWindow && (mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()) };
  const quitItem = { label: 'Quit', click: () => { stopPolling(); app.quit(); } };
  const items = [openItem];
  if (state?.lastRun) {
    items.push({ type: 'separator' });
    items.push({ label: `OpenAI: $${(state.openaiTotal ?? 0).toFixed(2)}`, enabled: false });
    items.push({ label: `Cursor: $${(state.cursorTotal ?? 0).toFixed(2)}`, enabled: false });
    items.push({ label: `Updated ${new Date(state.lastRun).toLocaleTimeString()}`, enabled: false });
  }
  items.push({ type: 'separator' }, quitItem);
  tray.setContextMenu(Menu.buildFromTemplate(items));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 520,
    minWidth: 360,
    minHeight: 400,
    show: false,
    frame: true,
    backgroundColor: '#0f0f12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'tray.png'),
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { app.isQuitting = true; stopPolling(); });

app.whenReady().then(() => {
  createTray();
  createWindow();
  const pollIntervalMs = (getConfig().pollIntervalMinutes ?? 15) * 60 * 1000;
  startPolling(pollIntervalMs, (state, notification) => {
    updateTrayMenu();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('state-update', state);
    }
    if (notification && Notification.isSupported()) {
      new Notification({
        title: 'MoneyMan',
        body: notification,
        silent: false,
      }).show();
    }
  });
  // Send initial state to renderer
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('state-update', getState());
    }
  }, 500);
});

ipcMain.handle('get-state', () => getState());
ipcMain.handle('get-config', () => getConfig());
ipcMain.handle('set-config', (_e, cfg) => {
  setConfig(cfg);
  const intervalMs = (cfg.pollIntervalMinutes ?? getConfig().pollIntervalMinutes ?? 15) * 60 * 1000;
  updatePollInterval(intervalMs);
  return getConfig();
});
ipcMain.handle('run-now', async () => {
  const { runOnce } = require('./lib/poller');
  return runOnce();
});
