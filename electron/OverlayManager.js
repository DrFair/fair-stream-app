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
      console.log('Client connected!');
      socket.on('disconnect', () => {
        console.log('Client disconnected!');
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
              console.log('Found overlay:', overlay.folderPath, overlay.info);
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
    this.port = port;
    this.overlay = overlay;
    this.stop(() => {
      this.server.listen(port, (err) => {
        if (callback) callback(err);
      });
    });
  }

  stop(callback) {
    this.server.close((err) => {
      if (callback) callback(err);
    });
  }

}

module.exports = OverlayManager;