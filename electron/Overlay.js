const fs = require('fs');
const jsonfile = require('jsonfile');
const path = require('path');
const async = require('async');

class Overlay {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.info = {};
    this.settings = {};
  }

  getName() {
    return this.info.name;
  }

  getVersion() {
    return this.info.version;
  }

  /**
   * Sets the event listener for once valid checks are done. Only one listener can be present at a time
   * @param {function: error} callback Error is undefined if no error was found and it's a valid overlay
   */
  isValid(validCallback) {
    if (this.valid) return validCallback();
    if (this.validError) return validCallback(this.validError);
    const validChecks = [
      (callback) => {
        fs.exists(this.folderPath, (exists) => {
          callback(exists ? undefined : 'Folder does not exist');
        });
      },
      (callback) => {
        fs.lstat(this.folderPath, (err, stats) => {
          if (err) {
            console.log('Error checking folder lstat:', err)
            return callback('Error getting overlay folder stats');
          }
          callback(stats.isDirectory() ? undefined : 'Folder is not a directory');
        });
      },
      (callback) => {
        fs.exists(path.join(this.folderPath, 'info.json'), (exists) => {
          callback(exists ? undefined : 'Missing info.json file');
        });
      },
      (callback) => {
        fs.readFile(path.join(this.folderPath, 'info.json'), (err, data) => {
          if (err) {
            console.log('Error reading info.json:', err);
            return callback('Error reading info.json');
          }
          try {
            this.info = JSON.parse(data);
            callback();
          } catch(parseErr) {
            console.log('Error parsing info.json:', parseErr);
            callback('Error parsing info.json');
          }

        });
      },
      (callback) => {
        if (!this.info.name) {
          this.info.name = path.basename(this.folderPath);
        }
        const versionReg = /\d+((\.\d+)+)?/;
        if (this.info.version && versionReg.test(this.info.version)) {
          callback();
        } else {
          callback('info.json has invalid version value');
        }
      },
      (callback) => {
        fs.exists(path.join(this.folderPath, 'index.html'), (exists) => {
          callback(exists ? undefined : 'Missing index.html file');
        });
      },
      (callback) => {
        this.loadSettings(callback);
      }
    ];
    async.series(validChecks, (err) => {
      this.valid = err === undefined;
      this.validError = err;
      validCallback(err);
    });
  }

  // Loads settings or creates a default settings.json file
  loadSettings(callback) {
    if (this.info.settings) {
      for (const key in this.info.settings) {
        if (this.info.settings[key].defaultValue !== undefined) {
          this.settings[key] = this.info.settings[key].defaultValue;
        }
      }
      if (fs.exists(this.getSettingsPath(), (exists) => {
        if (exists) {
          jsonfile.readFile(this.getSettingsPath(), (err, obj) => {
            if (err) {
              console.log('Error reading overlay settings:', err);
              return callback();
            }
            for (const key in obj) {
              if (this.settings[key] !== undefined) {
                this.settings[key] = obj[key];
              }
            }
            callback();
          });
        } else {
          this.saveSettings(callback);
        }
      }));
    } else {
      this.saveSettings(callback);
    }
  }

  getSettingsPath() {
    return path.join(this.folderPath, 'settings.json');
  }

  saveSettings(callback) {
    jsonfile.writeFile(this.getSettingsPath(), this.settings, callback);
  }
  
  getFolderPath() {
    return this.folderPath;
  }
  
}

module.exports = Overlay;