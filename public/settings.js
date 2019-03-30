const { ipcMain } = require('electron');
const { SETTINGS_GET, SETTINGS_SET, SETTINGS_COMPARE } = require('./ipcEvents');
const electronSettings = require('electron-settings');

class Settings {
  constructor() {
    // Default settings:
    this.default = {
      channel: null,
      historySize: 1000, // The history size of unfiltered notifications
      notificationFilters: {
        showHidden: false,
        showBits: true,
        minBits: 0,
        showNewsubs: true,
        showResubs: true,
        showGiftsubs: true,
        showMassGiftsubs: true
      }
    };
    this.current = this.default;

    this.wrapped = false;
    this.app = null;

    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
  }

  get() {
    return this.current;
  }

  // Deep overwrites the current settings (like react setState)
  set(settings) {
    const oldChannel = this.get().channel;
    overwriteObj(this.get(), settings);
    if (this.wrapped) {
      electronSettings.set('settings', this.get());
    }
    const newChannel = this.get().channel;
    if (this.wrapped && oldChannel !== newChannel) {
      this.app.updateIRCRooms();
    }
  }

  compare(settings) {
    return compare(this.get(), settings);
  }

  // Returns true if it's a valid notification given the filters
  isFilteredNotification(notification) {
    const { event } = notification;
    const filters = this.get().notificationFilters;
    if (!filters.showHidden && notification.hidden) return false
    switch (event) {
      case 'bits': {
        if (!filters.showBits) return false;
        return notification.bits >= filters.minBits;
      }
      case 'sub': {
        return filters.showNewsubs;
      }
      case 'resub': {
        return filters.showResubs;
      }
      case 'giftsub': {
        return filters.showGiftsubs;
      }
      case 'massgiftsub': {
        return filters.showMassGiftsubs;
      }
    }
    return true;
  }

  // Will return the NEDB notification style filters
  getNEDBNotificationFilters() {
    // For now we just use $where. Quick benchmarks said it takes about the same time as other filters,
    // but I am not sure about it when we get to bigger datastores.
    // The normal filters are included below
    const self = this;
    return { $where: function () { return self.isFilteredNotification(this); } };
    // const filters = this.get().notificationFilters;
    // TODO: Add showHidden filter
    // const or = [];
    // if (filters.showBits) {
    //   or.push({
    //     event: 'bits',
    //     bits: { $gte: filters.minBits }
    //   });
    // }
    // if (filters.showNewsubs) {
    //   or.push({ event: 'sub' });
    // }
    // if (filters.showResubs) {
    //   or.push({ event: 'resub' });
    // }
    // if (filters.showGiftsubs) {
    //   or.push({ event: 'giftsub' });
    // }
    // if (filters.showMassGiftsubs) {
    //   or.push({ event: 'massgiftsub' });
    // }
    // return { $or: or };
  }

  wrapApp(app) {
    if (this.wrapped) throw new Error('Already wrapped');
    this.app = app;
    this.wrapped = true;
    this.set(electronSettings.get('settings', {}));

    ipcMain.on(SETTINGS_COMPARE, (event, args) => {
      event.sender.send(SETTINGS_COMPARE, this.compare(args));
    });

    ipcMain.on(SETTINGS_SET, (event, args) => {
      this.set(args);
      // Send back new settings
      event.sender.send(SETTINGS_GET, this.get());
    });

    ipcMain.on(SETTINGS_GET, (event, args) => {
      event.sender.send(SETTINGS_GET, this.get());
    });
  }
}

// Returns true if the newObj has different values from oldObj (only compares similar keys)
function compare(oldObj, newObj) {
  for (const key in newObj) {
    if (oldObj.hasOwnProperty(key)) {
      if (typeof (oldObj[key]) === 'object' && oldObj[key] !== null) {
        if (compare(oldObj[key], newObj[key])) return true;
      } else {
        if (oldObj[key] !== newObj[key]) return true;
      }
    }
  }
  return false;
}

function overwriteObj(oldObj, newObj) {
  for (const key in newObj) {
    // Only overwrite a setting if it actually exists
    if (oldObj.hasOwnProperty(key)) {
      // If it's an object, deep overwrite it
      if (typeof (oldObj[key]) === 'object' && oldObj[key] !== null) {
        // console.log(`Overwriting setting object ${key}`); // Debug printing
        overwriteObj(oldObj[key], newObj[key]);
      } else {
        // console.log(`Overwriting setting ${key}`); // Debug printing
        oldObj[key] = newObj[key];
      }
    } else {
      // console.log(`Could not find setting ${key}`); // Debug printing
    }
  }
}

module.exports = Settings;