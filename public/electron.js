const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;

const fs = require('fs');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

const Settings = require('./settings.js');

const IRCClient = require('./twitchIRC/IRCClient.js');
const RoomTrackerWrapper = require('./twitchIRC/RoomTrackerWrapper.js');
const NotificationsWrapper = require('./twitchIRC/NotificationsWrapper.js');

const { STATUS_GET, NOTIFICATION_NEW } = require('./ipcEvents');

let mainWindow, settings, ircClient, roomTracker, notifications;

let status = {
  trackingChannel: null
};

// Check if channel room is joined, and if not, do it
function updateIRCRooms() {
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

function createWindow() {
  if (isDev) {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension: ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
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

app.on('ready', () => {
  createWindow();

  ircClient = new IRCClient();
  roomTracker = new RoomTrackerWrapper(ircClient);
  notifications = new NotificationsWrapper(ircClient);
  
  settings = new Settings();
  
  settings.wrapElectron(electron, updateIRCRooms);
        
  ipcMain.on(STATUS_GET, (event, args) => {
    event.sender.send(STATUS_GET, status);
  });
  
  notifications.on('any', (event, channel, data) => {
    if (channel === settings.get().channel) {
      data.event = event;
      data.channel = channel;
      console.log(`NOTICE: ${event} ${data.systemMsg ? data.systemMsg : data.msg}`)
      if (mainWindow) mainWindow.webContents.send(NOTIFICATION_NEW, data);
      settings.submitNotification(data);
    }
  });
  
  ircClient.on('ready', () => {
    // Check in interval of 10 seconds
    setInterval(updateIRCRooms, 10000);
    updateIRCRooms();
  });
  
  roomTracker.on('change', () => {
    const channel = settings.get().channel;
    const oldTracking = status.trackingChannel;
    status.trackingChannel = channel === null ? null : (roomTracker.isInChannel(channel) ? channel : null);
    if (status.trackingChannel !== oldTracking) {
      if (mainWindow) mainWindow.webContents.send(STATUS_GET, status);
    }
  });
});

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