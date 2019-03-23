const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;

const fs = require('fs');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

const settings = require('./settings.js');

ipcMain.on('settings-compare', (event, args) => {
  event.returnValue = settings.compare(args);
});

ipcMain.on('settings-set', (event, args) => {
  settings.set(args);
  event.returnValue = settings.get(); // Returns the settings again
});

ipcMain.on('settings-get', (event, args) => {
  event.returnValue = settings.get();
});

let mainWindow;

function createWindow() {
  // Try and find react dev tools from chrome extensions
  if (process.env.LOCALAPPDATA) {
    const chromeExPath = path.join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data/Default/Extensions');
    const exID = 'fmkadmapgofadopljbjfkapdkoienihi';
    const exPath = path.join(chromeExPath, exID);
    // Find version folder (just use the first folder found)
    const exVersionDirs = fs.readdirSync(exPath);
    if (exVersionDirs.length > 0) {
      const exVersionPath = path.join(exPath, exVersionDirs[0]);
      console.log(`Found react dev extension at ${exVersionPath}`)
      BrowserWindow.addDevToolsExtension(exVersionPath);
    }
  }
  
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