// This is preloaded into web contents when an electron window is created.
// To get for example the ipcRenderer, do at the same time as imports:
// const { ipcRenderer } = window.electron;

window.require = require;
window.electron = require('electron');

window.ipcEvents = require('./ipcEvents');

window.dummyNotification = (eventName) => {
  electron.ipcRenderer.send(window.ipcEvents.NOTIFICATION_DUMMY, eventName);
};