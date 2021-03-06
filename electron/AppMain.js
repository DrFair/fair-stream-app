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
  NOTIFICATION_HIDE,
  NOTIFICATION_UNHIDE,
  NOTIFICATION_SEARCH,
  OVERLAY_SET,
  OVERLAY_SETTINGS
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
      overlayError: null,
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

    this.refreshOverlays(() => {
      const overlaySetting = this.settings.get().overlay;
      const { overlays } = this.overlayManager;
      if (overlaySetting !== null) {
        for (let i = 0; i < overlays.length; i++) {
          const key = overlays[i].getName() + 'v' + overlays[i].getVersion();
          if (overlaySetting === key) {
            this.startOverlay(i, this.settings.get().hostPort);
            break;
          }
        }
      }
    });
  
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
  
    ipcMain.on(NOTIFICATION_HIDE, (event, id) => {
      if (id === 'all') {
        this.notiDB.update({}, { $set: { hidden: true } }, { multi: true });
      } else {
        this.notiDB.update({ _id: id }, { $set: { hidden: true } });
      }
    });
  
    ipcMain.on(NOTIFICATION_UNHIDE, (event, id) => {
      if (id === 'all') {
        this.notiDB.update({}, { $unset: { hidden: true } }, { multi: true });
      } else {
        this.notiDB.update({ _id: id }, { $unset: { hidden: true } });
      }
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
          console.log(`History took ${Date.now() - time} ms to find ${docs.length} docs`);
          event.sender.send(NOTIFICATION_HISTORY, docs);
        }
      });
    });

    ipcMain.on(NOTIFICATION_SEARCH, (event, query, count) => {
      count = Number(count);
      count = isNaN(count) ? 100 : Math.max(1, count);
      query = query.toLowerCase();
      const testProp = (prop) => {
        if (prop === undefined || prop === null) return false;
        return String(prop).toLowerCase().includes(query);
      }
      const testObj = (obj, ...props) => {
        if (obj === undefined || obj === null) return false;
        for (let i = 0; i < props.length; i++) {
          if (testProp(obj[props[i]])) return true;
        }
        return false;
      }
      const testArray = (array, ...props) => {
        if (array === undefined || array === null) return false;
        for (let i = 0; i < array.length; i++) {
          if (testObj(array[i], ...props)) return true;
        }
        return false;
      }
      const time = Date.now();
      const filter = {
        $where: function() {
          return testProp(this.login) ||
            testProp(this.displayName) ||
            testProp(this.systemMsg) ||
            testProp(this.event) ||
            testProp(this.msg) ||
            testProp(this.tier) ||
            (this.recepient !== undefined && testObj(this.recepient, 'login', 'displayName')) ||
            (this.recepients !== undefined && testArray(this.recepients, 'login', 'displayName'));
        }
      }
      this.notiDB.find(filter).sort({ timestamp: -1 }).limit(count).exec((err, docs) => {
        if (err) {
          console.log('Error searching for notifications:', err);
        } else {
          console.log(`Search took ${Date.now() - time} ms to find ${docs.length} docs`);
          event.sender.send(NOTIFICATION_SEARCH, docs);
        }
      });
    });

    ipcMain.on(OVERLAY_SET, (event, index, port) => {
      index = Number(index);
      if (isNaN(index)) return;
      port = Number(port);
      if (isNaN(port)) return;
      this.status.overlayError = null;
      if (port < 0 || port > 65535) {
        this.status.overlayError = 'Invalid host port';
        if (this.mainWindow) this.mainWindow.webContents.send(STATUS_GET, this.status);
        return;
      }
      this.settings.set({
        hostPort: port
      });
      const { overlays } = this.overlayManager;
      console.log(index, port);
      if (index < 0 && this.overlayManager.overlay) {
        this.overlayManager.stop((err) => {
          if (err) console.log(err);
          this.status.hostedOverlay = null;
          this.status.overlayError = null;
          if (this.mainWindow) this.mainWindow.webContents.send(STATUS_GET, this.status);
        });
        this.settings.set({
          overlay: null
        });
      } else if (index < overlays.length) {
        this.settings.set({
          overlay: overlays[index].getName() + 'v' + overlays[index].getVersion()
        });
        this.startOverlay(index, port);
      }
    })

    ipcMain.on(OVERLAY_SETTINGS, (event, settings) => {
      this.overlayManager.submitSettings(settings);
    });

    this.overlayManager.on('iport', () => {
      this.status.overlayError = 'Invalid overlay port chosen';
      if (this.mainWindow) this.mainWindow.webContents.send(STATUS_GET, this.status);
    });
  
    this.notiTracker.on('any', (event, channel, data) => {
      if (channel === this.settings.get().channel || channel === 'dummychannel') {
        data._id = data.id;
        delete data.id;
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

  startOverlay(index, port) {
    const { overlays } = this.overlayManager;
    this.overlayManager.start(port, overlays[index], (err) => {
      if (!err) {
        const newOverlay = this.overlayManager.overlay;
        const settings = {};
        for (const key in newOverlay.settings) {
          settings[key] = newOverlay.info.settings[key];
          settings[key].value = newOverlay.settings[key];
        }
        if (newOverlay) {
          this.status.hostedOverlay = {
            name: newOverlay.getName(),
            version: newOverlay.getVersion(),
            settings: settings,
            index: index,
            port: port
          };
        } else {
          this.status.hostedOverlay = null;
        }
      } else {
        console.log(err);
        this.status.hostedOverlay = null;
      }
      if (this.mainWindow) this.mainWindow.webContents.send(STATUS_GET, this.status);
    });
  }

  refreshOverlays(callback) {
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
      if (this.mainWindow) this.mainWindow.webContents.send(STATUS_GET, this.status);
      if (callback) callback();
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