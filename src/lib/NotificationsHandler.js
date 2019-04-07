// Handles notification list
// Create the object at componentDidMount() with an IPCWrapper as constructor parameter
// Adds notifications to component state

const {
  NOTIFICATION_NEW,
  NOTIFICATION_HISTORY,
  NOTIFICATION_DELETE,
  NOTIFICATION_HIDE,
  NOTIFICATION_UNHIDE,
  NOTIFICATION_SEARCH
} = window.ipcEvents;

class NotificationsHandler {
  constructor(component, ipcWrapper) {
    this.component = component;
    this.ipcWrapper = ipcWrapper;
    this.maxLength = 100;
    this.component.setState({
      notifications: {
        list: [],
        loading: false
      },
      searchResults: {
        list: [],
        loading: false
      }
    });
    this.updateFromHistory();

    this.ipcWrapper.on(NOTIFICATION_NEW, (event, data) => {
      console.log("Got notification", data);
      let list = this.component.state.notifications.list.map((e) => e); // Need to make a copy of list
      list.unshift(data);
      if (list.length > this.maxLength) list.splice(this.maxLength, list.length - this.maxLength);
      this.setNotificationsState({
        list: list
      });
    });
  }

  setNotificationsState(state, callback) {
    this.component.setState({
      notifications: Object.assign(this.component.state.notifications, state)
    }, callback);
  }

  setSearchState(state, callback) {
    this.component.setState({
      searchResults: Object.assign(this.component.state.searchResults, state)
    }, callback);
  }

  updateFromHistory() {
    this.ipcWrapper.once(NOTIFICATION_HISTORY, (event, data) => {
      console.log('GOT', data);
      this.setNotificationsState({
        list: data,
        loading: false
      });
    });

    this.ipcWrapper.send(NOTIFICATION_HISTORY, this.maxLength);
    this.setNotificationsState({
      loading: true
    });
  }

  search(query) {
    this.ipcWrapper.once(NOTIFICATION_SEARCH, (event, data) => {
      console.log('SEARCH', data);
      this.setSearchState({
        list: data,
        loading: false
      });
    });
    this.ipcWrapper.send(NOTIFICATION_SEARCH, query, this.maxLength);
    this.setSearchState({
      loading: true
    });
  }

  clearSearch() {
    this.setSearchState({
      loading: false,
      list: []
    });
  }

  deleteNotification(id) {
    this._modifyList(id, this.component.state.notifications.list.map(e => e), (list, index) => {
      list.splice(index, 1);
      this.setNotificationsState({
        list: list
      });
    });
    this._modifyList(id, this.component.state.searchResults.list.map(e => e), (list, index) => {
      list.splice(index, 1);
      this.setSearchState({
        list: list
      });
    });
    this.ipcWrapper.send(NOTIFICATION_DELETE, id);
  }

  hideNotification(id) {
    this._modifyList(id, this.component.state.notifications.list.map(e => e), (list, index) => {
      const settings = this.component.state.settings || this.component.props.settings;
      const filters = settings ? settings.notificationFilters : undefined;
      list[index].hidden = true;
      if (!filters.showHidden) {
        list.splice(index, 1);
      }
      this.setNotificationsState({
        list: list
      });
    });
    this._modifyList(id, this.component.state.searchResults.list.map(e => e), (list, index) => {
      const settings = this.component.state.settings || this.component.props.settings;
      const filters = settings ? settings.notificationFilters : undefined;
      list[index].hidden = true;
      if (!filters.showHidden) {
        list.splice(index, 1);
      }
      this.setSearchState({
        list: list
      });
    });
    this.ipcWrapper.send(NOTIFICATION_HIDE, id);
  }

  unhideNotification(id) {
    this._modifyList(id, this.component.state.notifications.list.map(e => e), (list, index) => {
      list[index].hidden = undefined;
      this.setNotificationsState({
        list: list
      });
    });
    this._modifyList(id, this.component.state.searchResults.list.map(e => e), (list, index) => {
      list[index].hidden = undefined;
      this.setSearchState({
        list: list
      });
    });
    this.ipcWrapper.send(NOTIFICATION_UNHIDE, id);
  }

  _modifyList(id, list, modifier) {
    const index = this._getIndex(id, list);
    if (index !== -1) {
      modifier(list, index, list[index])
    }
  }

  _getIndex(id, list) {
    for (let i = 0; i < list.length; i++) {
      if (list[i]._id === id) return i;
    }
    return -1;
  }

}

export default NotificationsHandler;