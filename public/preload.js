// This is preloaded into web contents when an electron window is created.
// To get for example the ipcRenderer, do at the same time as imports:
// const { ipcRenderer } = window.electron;

window.require = require;
window.electron = require('electron');

try {
  // For production
  window.ipcEvents = require('./electron/ipcEvents');
} catch(e) {
  // For dev
  window.ipcEvents = require('../build/electron/ipcEvents');
}

window.dummyNotification = (eventName) => {
  window.electron.ipcRenderer.send(window.ipcEvents.NOTIFICATION_DUMMY, eventName);
};