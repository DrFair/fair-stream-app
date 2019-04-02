const fs = require('fs');
const path = require('path');
const async = require('async');

class Overlay {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.info = {};
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
      }
    ];
    async.series(validChecks, (err) => {
      this.valid = err === undefined;
      this.validError = err;
      validCallback(err);
    });
  }
  
  getFolderPath() {
    return this.folderPath;
  }
  
}

module.exports = Overlay;