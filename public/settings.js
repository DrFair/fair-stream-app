class Settings {
    constructor() {
        // Default settings:
        this.default = {
            channel: null,
            notificationFilters: {
                showBits: true,
                minBits: 0,
                showNewsubs: true,
                showResubs: true,
                showGiftsubs: true
            }
        };
        this.current = this.default;
        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
    }

    get() {
        return this.current;
    }

    // Deep overwrites the current settings (like react setState)
    set(newSettings) {
        overwriteObj(this.get(), newSettings);
    }
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

module.exports = new Settings();