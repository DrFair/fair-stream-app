import { app, BrowserWindow, ipcMain } from 'electron';
import EventEmitter from 'events';

import path from 'path';
import isDev from 'electron-is-dev';

import Settings from './settings.js';

import IRCClient from './twitchIRC/IRCClient.js';
import RoomTrackerWrapper from './twitchIRC/RoomTrackerWrapper.js';
import NotificationsWrapper from './twitchIRC/NotificationsWrapper.js';

import Datastore from 'nedb';

import {
  STATUS_GET,
  NOTIFICATION_HISTORY,
  NOTIFICATION_NEW,
  NOTIFICATION_DUMMY,
  NOTIFICATION_DELETE,
  NOTIFICATON_HIDE,
  NOTIFICATON_UNHIDE
} from './ipcEvents';

class AppMain extends EventEmitter {
  constructor(app) {
    super();
    this.app = app;
    this.mainWindow = null;
    this.settings = null;
    this.ircClient = null;
    this.roomTracker = null;
    this.notiTracker = null;
    this.notiDB = null; // Notifications datastore
    this.initialized = false;

    this.status = {
      trackingChannel: null
    };
    this.updateIRCRooms = this.updateIRCRooms.bind(this);
    this.createWindow = this.createWindow.bind(this);
  }

  init() {
    this.settings = new Settings();
    this.ircClient = new IRCClient();
    this.roomTracker = new RoomTrackerWrapper(this.ircClient);
    this.notiTracker = new NotificationsWrapper(this.ircClient);
    this.notiDB = new Datastore({
      filename: path.join(app.getPath('userData'), 'notifications.db'),
      autoload: true
    });
    // Compact datastore every hour
    this.notiDB.persistence.setAutocompactionInterval(1000 * 60 * 60);

    this.createWindow();

    this.settings.wrapApp(this);
  
    ipcMain.on(STATUS_GET, (event, args) => {
      event.sender.send(STATUS_GET, this.status);
    });
  
    ipcMain.on(NOTIFICATION_DUMMY, (event, name) => {
      if (!name) name = 'any';
      let channel = this.settings.get().channel || 'dummychannel'; // Will not accept notifications anyway if it's null
      this.notiTracker.sendDummyNotification(name, channel);
    });
  
    ipcMain.on(NOTIFICATION_DELETE, (event, id) => {
      this.notiDB.remove({ _id: id });
    });
  
    ipcMain.on(NOTIFICATON_HIDE, (event, id) => {
      this.notiDB.update({ _id: id }, { $set: { hidden: true } });
    });
  
    ipcMain.on(NOTIFICATON_UNHIDE, (event, id) => {
      this.notiDB.update({ _id: id }, { $unset: { hidden: true } });
    });

    ipcMain.on(NOTIFICATION_HISTORY, (event, count) => {
      count = Number(count);
      count = isNaN(count) ? 100 : Math.max(1, count);
      const filters = this.settings.getNEDBNotificationFilters();
      const time = Date.now();
      this.notiDB.find(filters).sort({ timestamp: -1 }).limit(count).exec((err, docs) => {
        if (err) {
          console.log('Error getting filtered notifications:', err)
        } else {
          // console.log(`Query took ${Date.now() - time} ms to find ${docs.length} docs`);
          event.sender.send(NOTIFICATION_HISTORY, docs);
        }
      });
    });
  
    this.notiTracker.on('any', (event, channel, data) => {
      if (channel === this.settings.get().channel || channel === 'dummychannel') {
        data._id = data.id;
        delete data._id;
        data.event = event;
        data.channel = channel;
        console.log(`NOTICE: ${event} ${data.systemMsg ? data.systemMsg : data.msg}`)
        if (this.mainWindow && this.settings.isFilteredNotification(data)) this.mainWindow.webContents.send(NOTIFICATION_NEW, data);
        this.notiDB.insert(data);
      }
    });
  
    this.ircClient.on('ready', () => {
      // Check in interval of 10 seconds
      setInterval(this.updateIRCRooms, 10000);
      this.updateIRCRooms();
    });
  
    this.roomTracker.on('change', () => {
      const channel = this.settings.get().channel;
      const oldTracking = this.status.trackingChannel;
      this.status.trackingChannel = channel === null ? null : (this.roomTracker.isInChannel(channel) ? channel : null);
      if (this.status.trackingChannel !== oldTracking) {
        if (this.mainWindow) this.mainWindow.webContents.send(STATUS_GET, this.status);
      }
    });

    this.initialized = true;
  }

  // Updates irc room
  updateIRCRooms() {
    const channel = this.settings.get().channel;
    if (this.ircClient.isReady()) {
      // Leave all channels that's not needed
      this.roomTracker.getChannels().forEach((room) => {
        if (channel === null || room.channel !== channel) {
          this.ircClient.part(room.channel);
        }
      });
      // Join channel that is being tracked
      if (channel !== null && !this.roomTracker.isInChannel(channel)) {
        this.ircClient.join(channel);
      }
    }
  }

  getPublicPath() {
    return process.env.ELECTRON_USE_WEB ? path.join(__dirname, '../../public/') : path.join(__dirname, '../');
  }
  
  // Creates the main window
  createWindow() {
    if (isDev) {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
      installExtension(REACT_DEVELOPER_TOOLS)
        .then((name) => console.log(`Added Extension: ${name}`))
        .catch((err) => console.log('An error occurred: ', err));
    }
  
    let size = 580;
    let minSize = 150;
    const publicPath = this.getPublicPath();
    this.mainWindow = new BrowserWindow({
      width: Math.floor(size * 16 / 9),
      height: size,
      minWidth: Math.floor(minSize * 16 / 9),
      minHeight: minSize,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        preload: path.join(publicPath, 'preload.js')
      },
      icon: path.join(publicPath, 'favicon.ico')
    });
    this.mainWindow.loadURL(process.env.ELECTRON_USE_WEB ? 'http://localhost:3000' : `file://${path.join(publicPath, 'index.html')}`);
    this.mainWindow.on('closed', () => this.mainWindow = null);
  }
}

module.exports = AppMain;