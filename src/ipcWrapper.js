// A wrapper that helps with IPC event registering and unregistering for a React component
// Create the object at componentDidMount()
// run dispose() at componentWillUnmount()

const { ipcRenderer } = window.electron;

class IPCWrapper {
  constructor() {
    this.callbacks = [];
    this.disposed = false;

    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.dispose = this.dispose.bind(this);
    this.send = this.send.bind(this);
  }

  on(eventName, callback) {
    if (this.disposed) throw new Error('IPC wrapper is disposed');
    ipcRenderer.on(eventName, callback);
    this.callbacks.push({
      eventName: eventName,
      callback: callback
    });
  }

  once(eventName, onceCallback) {
    if (this.disposed) throw new Error('IPC wrapper is disposed');
    const obj = {
      eventName: eventName,
      callback: (event, ...args) => {
        onceCallback(event, ...args);
        // Remove this object
        this.callbacks = this.callbacks.filter((e) => {
          return e !== obj;
        });
      }
    };
    this.callbacks.push(obj);
    ipcRenderer.once(eventName, obj.callback);
  }

  send(eventName, ...args) {
    ipcRenderer.send(eventName, args);
  }

  dispose() {
    this.callbacks.forEach((e) => {
      ipcRenderer.removeListener(e.eventName, e.callback);
    });
    this.callbacks = [];
    this.disposed = true;
  }
}

export default IPCWrapper;