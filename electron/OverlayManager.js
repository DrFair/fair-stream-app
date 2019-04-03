const express = require('express');
const http = require('http');
const SocketIO = require('socket.io');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const async = require('async');
const Overlay = require('./Overlay');

// Events:
// name - parameters - description

// error - error - When an error happens
// iport - When tried to start the server on an invalid port
// conchange - count - When the amount of connections has changed


class OverlayManager extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.server = http.Server(this.app);
    this.io = SocketIO(this.server);
    this.sockets = []; // Array of SocketHandler's
    this.overlays = [];
    this.overlay = null;

    // this.app.get('/', (req, res) => {
    //   res.send('Hello index!');
    // });

    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'overlay.html'));
    });

    this.app.get('/_index', (req, res) => {
      res.sendFile(path.join(this.overlay.folderPath, 'index.html'));
    });

    this.app.get('*', (req, res, next) => {
      express.static(this.overlay.folderPath)(req, res, next);
    });
    
    this.io.on('connection', (socket) => {
      // Add a new handler to sockets
      const handler = new SocketHandler(socket);
      const index = this.getSocketIndex(socket.id);
      if (index !== -1) this.sockets.splice(index, 1);
      this.sockets.push(handler);
      console.log('Client connected!', socket.id, index);

      socket.on('settings', () => {
        // TODO: Send settings back
        socket.emit('settings', {});
      });

      socket.on('disconnect', () => {
        const index = this.getSocketIndex(socket.id);
        if (index !== -1) this.sockets.splice(index, 1);
        console.log('Client disconnected!', socket.id, index);
      });
    });

    this.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        this.emit('iport');
      } else {
        this.emit('error', err);
      }
    });
  }

  submitNotification(notification) {
    if (this.overlay !== null) {
      this.sockets.forEach((handler) => {
        handler.submitNotification(notification);
      });
    }
  }

  // Get all the overlays
  refreshOverlays(overlaysPath, refreshCallback) {
    this.overlays = [];
    let fileList = [];
    async.series([
      (callback) => {
        fs.exists(overlaysPath, (exists) => {
          callback(exists ? undefined : 'Overlays folder does not exist');
        });
      },
      (callback) => {
        fs.lstat(overlaysPath, (err, stats) => {
          if (err) {
            console.log('Error getting overlays folder stats:', err);
            return callback('Error getting folder stats');
          }
          callback(stats.isDirectory() ? undefined : 'Overlays folder is not a directory');
        })
      },
      (callback) => {
        fs.readdir(overlaysPath, (err, files) => {
          if (err) {
            console.log('Error getting overlays folder files:', err);
            return callback('Error getting folder files');
          }
          fileList = files;
          callback();
        });
      }
    ], (err) => {
      if (err) return refreshCallback(err);
      let overlayCallbacks = [];
      for (let i = 0; i < fileList.length; i++) {
        const overlay = new Overlay(path.join(overlaysPath, fileList[i]));
        overlayCallbacks.push((callback) => {
          overlay.isValid((err) => {
            if (!err) {
              // console.log('Found overlay:', overlay.folderPath, overlay.info);
              this.overlays.push(overlay);
            } else {
              console.log('Overlay error:', err);
            }
            callback();
          });
        });
      }
      async.parallel(overlayCallbacks, () => {
        refreshCallback();
      });
    });
  }

  start(port, overlay, callback) {
    if (this.overlay === overlay) {
      if (callback) callback();
      return;
    }
    this.port = port;
    this.stop(() => {
      this.server.listen(port, (err) => {
        this.overlay = overlay;
        if (callback) callback(err);
      });
    });
  }

  stop(callback) {
    for (let i = 0; i < this.sockets.length; i++) {
      this.sockets[i].socket.disconnect(true);
    }
    this.server.close((err) => {
      this.overlay = null;
      this.sockets = [];
      if (callback) callback(err);
    });
  }

  getSocketIndex(id) {
    for (let i = 0; i < this.sockets.length; i++) {
      if (this.sockets[i].id === id) return i;
    }
    return -1;
  }

}

class SocketHandler {
  constructor(socket) {
    this.socket = socket;
    this.id = socket.id;
    this.readyForNotification = false;
    this.notificationQueue = [];
    socket.on('requestnext', () => {
      this.readyForNotification = true;
      this.sendNextIfReady();
    });
  }

  submitNotification(notification) {
    this.notificationQueue.push(notification);
    this.sendNextIfReady();
  }

  sendNextIfReady() {
    if (this.readyForNotification && this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.splice(0, 1)[0];
      this.socket.emit('notification', notification);
      this.readyForNotification = false;
    }
  }
}

module.exports = OverlayManager;