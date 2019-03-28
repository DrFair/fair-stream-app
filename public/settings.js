const { SETTINGS_GET, SETTINGS_SET, SETTINGS_COMPARE, NOTIFICATION_HISTORY } = require('./ipcEvents');
const electronSettings = require('electron-settings');

class Settings {
    constructor() {
        // Default settings:
        this.default = {
            channel: null,
            historySize: 1000, // The history size of unfiltered notifications
            notificationFilters: {
                showBits: true,
                minBits: 0,
                showNewsubs: true,
                showResubs: true,
                showGiftsubs: true,
                showMassGiftsubs: true
            }
        };
        this.current = this.default;
        this.notificationsHistory = [];

        this.wrapped = false;
        this.updateIRCRooms = null;

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
        if (this.updateIRCRooms !== null && oldChannel !== newChannel) {
            this.updateIRCRooms();
        }
    }

    compare(settings) {
        return compare(this.get(), settings);
    }

    // Returns true if it's a valid notification given the filters
    isFilteredNotification(notification) {
        const { event } = notification;
        const filters = this.get().notificationFilters;
        switch(notification.event) {
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

    wrapElectron(electron, updateIRCRooms) {
        if (this.wrapped) throw new Error('Already wrapped');
        this.wrapped = true;
        this.updateIRCRooms = updateIRCRooms;
        const { ipcMain } = electron;
        this.set(electronSettings.get('settings', {}));
        const settingsHistory = electronSettings.get('notificationsHistory', []);
        this.notificationsHistory = this.notificationsHistory.concat(settingsHistory);

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

        ipcMain.on(NOTIFICATION_HISTORY, (event, args) => {
            const filteredList = this.notificationsHistory.filter((e) => {
                return this.isFilteredNotification(e);
            });
            args = Number(args);
            let maxLength = isNaN(args) ? 100 : Math.max(1, args);
            if (filteredList.length > maxLength) {
                filteredList.length = maxLength; // Limit list to max length
            }
            event.sender.send(NOTIFICATION_HISTORY, filteredList);
        });
    }

    submitNotification(notification) {
        this.notificationsHistory.unshift(notification);
        const historyOverflow = this.notificationsHistory.length - this.get().historySize;
        if (historyOverflow > 0) {
            this.notificationsHistory.splice(100, historyOverflow);
        }
        if (this.wrapped) {
            electronSettings.set('notificationsHistory', this.notificationsHistory);
        }
    }
}

// Returns true if the newObj has different values from oldObj (only compares similar keys)
function compare(oldObj, newObj) {
    for (const key in newObj) {
        if (oldObj.hasOwnProperty(key)) {
            if (typeof(oldObj[key]) === 'object' && oldObj[key] !== null) {
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
            if (typeof(oldObj[key]) === 'object' && oldObj[key] !== null) {
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