const { app, BrowserWindow, ipcMain } = require('electron');
const EventEmitter = require('events');

const path = require('path');
const isDev = require('electron-is-dev');

const Settings = require('./settings.js');

const IRCClient = require('./twitchIRC/IRCClient.js');
const RoomTrackerWrapper = require('./twitchIRC/RoomTrackerWrapper.js');
const NotificationsWrapper = require('./twitchIRC/NotificationsWrapper.js');
const OverlayManager = require('./OverlayManager');

const Datastore = require('nedb');

const {
  STATUS_GET,
  NOTIFICATION_HISTORY,
  NOTIFICATION_NEW,
  NOTIFICATION_DUMMY,
  NOTIFICATION_DELETE,
  NOTIFICATON_HIDE,
  NOTIFICATON_UNHIDE
} = require('./ipcEvents');

class AppMain extends EventEmitter {
  constructor() {
    super();
    this.mainWindow = null;
    this.settings = null;
    this.ircClient = null;
    this.roomTracker = null;
    this.notiTracker = null;
    this.notiDB = null; // Notifications datastore
    this.initialized = false;

    this.status = {
      trackingChannel: null,
      hostedOverlay: null,
      overlays: []
    };
    this.updateIRCRooms = this.updateIRCRooms.bind(this);
    this.createWindow = this.createWindow.bind(this);
  }

  init() {
    this.settings = new Settings();
    this.ircClient = new IRCClient();
    this.roomTracker = new RoomTrackerWrapper(this.ircClient);
    this.notiTracker = new NotificationsWrapper(this.ircClient);
    this.overlayManager = new OverlayManager();
    this.notiDB = new Datastore({
      filename: path.join(app.getPath('userData'), 'notifications.db'),
      autoload: true
    });
    // Compact datastore every hour
    this.notiDB.persistence.setAutocompactionInterval(1000 * 60 * 60);

    this.createWindow();

    this.settings.wrapApp(this);

    this.refreshOverlays();
  
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
      // const time = Date.now();
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
        console.log(`NOTICE: ${event} ${data.systemMsg ? data.systemMsg : data.msg}`);
        if (this.settings.isFilteredNotification(data)) {
          this.overlayManager.submitNotification(data);
          if (this.mainWindow) this.mainWindow.webContents.send(NOTIFICATION_NEW, data);
        }
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

  refreshOverlays() {
    this.overlayManager.refreshOverlays(this.getOverlaysPath(), (err) => {
      if (err) console.log(err);
      this.status.overlays = [];
      const newOverlays = this.overlayManager.overlays;
      for (let i = 0; i < newOverlays.length; i++) {
        this.status.overlays.push({
          name: newOverlays[i].getName(),
          version: newOverlays[i].getVersion(),
          index: i
        });
      }
      console.log('STATUS UPDATE');
      if (this.mainWindow) this.mainWindow.webContents.send(STATUS_GET, this.status);
    });
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
    return isDev ? (
        process.env.ELECTRON_USE_BUILD_FOLDER ? path.join(__dirname, '../build/') : path.join(__dirname, '../public/')
      ) : (
        path.join(__dirname, '../build/')
      );
  }

  getOverlaysPath() {
    return isDev ? path.join(__dirname, '../overlays') : app.getPath('userData');
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
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(publicPath, 'favicon.ico')
    });
    this.mainWindow.loadURL((!isDev || process.env.ELECTRON_USE_BUILD_FOLDER) ? `file://${path.join(publicPath, 'index.html')}` : 'http://localhost:3000');
    this.mainWindow.on('closed', () => this.mainWindow = null);
  }
}

module.exports = AppMain;