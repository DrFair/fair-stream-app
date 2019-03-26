const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;

const fs = require('fs');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

const settings = require('./settings.js');

const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

const IRCClient = require('./twitchIRC/IRCClient.js');
const RoomTrackerWrapper = require('./twitchIRC/RoomTrackerWrapper.js');
const NotificationsWrapper = require('./twitchIRC/NotificationsWrapper.js');

const ircClient = new IRCClient();
const roomTracker = new RoomTrackerWrapper(ircClient);
const notifications = new NotificationsWrapper(ircClient);

let mainWindow;

let status = {
  trackingChannel: null
};

// Check if channel room is joined, and if not, do it
function checkIRCRooms() {
  const channel = settings.get().channel;
  if (ircClient.isReady() && channel !== null) {
    // Leave all channels that's not needed
    roomTracker.getChannels().forEach((room) => {
      if (room.channel !== channel) {
        ircClient.part(room.channel);
      }
    });
    // Join channel that is being tracked
    if (!roomTracker.isInChannel(channel)) {
      ircClient.join(channel);
    }
  }
}

notifications.on('any', (event, channel, data) => {
  if (channel === settings.get().channel) {
    console.log(`NOTICE: ${event} ${data.systemMsg ? data.systemMsg : data.msg}`)
    if (mainWindow) mainWindow.webContents.send('notification', { event: event, data: data });
  }
});

ircClient.on('ready', () => {
  // Check in interval of 10 seconds
  setInterval(checkIRCRooms, 10000);
  checkIRCRooms();
});

roomTracker.on('change', () => {
  const channel = settings.get().channel;
  const oldTracking = status.trackingChannel;
  status.trackingChannel = channel === null ? null : (roomTracker.isInChannel(channel) ? channel : null);
  if (status.trackingChannel !== oldTracking) {
    if (mainWindow) mainWindow.webContents.send('status', status);
  }
});

ipcMain.on('settings-compare', (event, args) => {
  event.returnValue = settings.compare(args);
});

ipcMain.on('settings-set', (event, args) => {
  const oldChannel = settings.get().channel;
  settings.set(args);
  const newChannel = settings.get().channel;
  if (oldChannel !== newChannel) {
    checkIRCRooms();
  }
  event.returnValue = settings.get(); // Returns the settings again
});

ipcMain.on('settings-get', (event, args) => {
  event.returnValue = settings.get();
});

ipcMain.on('status-get', (event, args) => {
  event.returnValue = status;
});

function createWindow() {
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension: ${name}`))
    .catch((err) => console.log('An error occurred: ', err));
  
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