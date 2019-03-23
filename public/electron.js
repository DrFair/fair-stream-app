const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;

const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

const settings = require('./settings.js');

ipcMain.on('settings-set', (event, args) => {
  settings.set(args);
});

ipcMain.on('settings-get', (event, args) => {
  event.returnValue = settings.get();
});

let mainWindow;

function createWindow() {
  let size = 580;
  let minSize = 150;
  mainWindow = new BrowserWindow({
    width: Math.floor(size * 16 / 9),
    height: size,
    minWidth: Math.floor(minSize * 16 / 9),
    minHeight: minSize,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      preload: __dirname + '/preload.js'
    },
    icon: __dirname + '/favicon.ico'
  });
  mainWindow.loadURL((!isDev || process.env.ELECTRON_USE_BUILD_FOLDER) ? `file://${path.join(__dirname, '../build/index.html')}` : 'http://localhost:3000');
  mainWindow.on('closed', () => mainWindow = null);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});