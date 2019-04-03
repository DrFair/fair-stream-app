// Handles notification list
// Create the object at componentDidMount() with an IPCWrapper as constructor parameter
// Adds notifications to component state

const {
  NOTIFICATION_NEW,
  NOTIFICATION_HISTORY,
  NOTIFICATION_DELETE,
  NOTIFICATON_HIDE,
  NOTIFICATON_UNHIDE
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
      }
    });
    this.updateFromHistory();

    this.ipcWrapper.on(NOTIFICATION_NEW, (event, data) => {
      console.log("Got notification", data);
      let list = this.component.state.notifications.list.map((e) => e); // Need to make a copy of list
      list.unshift(data);
      if (list.length > this.maxLength) list.splice(this.maxLength, list.length - this.maxLength);
      this.component.setState({
        list: list
      });
    });
  }

  updateFromHistory() {
    this.ipcWrapper.once(NOTIFICATION_HISTORY, (event, data) => {
      console.log('GOT', data);
      this.component.setState({
        notifications: {
          list: data,
          loading: false
        }
      });
    });

    this.ipcWrapper.send(NOTIFICATION_HISTORY, this.maxLength);
    this.component.setState({
      notifications: {
        loading: true,
        list: this.component.state.notifications.list
      }
    });
  }

  deleteNotification(id) {
    const index = this.getNotificationIndex(id);
    if (index !== -1) {
      const list = this.component.state.notifications.list.map(e => e);
      list.splice(index, 1);
      this.component.setState({
        notifications: {
          list: list,
          loading: this.component.state.notifications.loading
        }
      });
    }
    this.ipcWrapper.send(NOTIFICATION_DELETE, id);
  }

  hideNotification(id) {
    const index = this.getNotificationIndex(id);
    if (index !== -1) {
      const list = this.component.state.notifications.list.map(e => e);
      const { settings } = this.component.props || this.component.state;
      const filters = settings ? settings.notificationFilters : undefined;
      if (filters.showHidden) {
        list[index].hidden = true;
      } else {
        list.splice(index, 1);
      }
      this.component.setState({
        notifications: {
          list: list,
          loading: this.component.state.notifications.loading
        }
      });
    }
    this.ipcWrapper.send(NOTIFICATON_HIDE, id);
  }

  unhideNotification(id) {
    const index = this.getNotificationIndex(id);
    if (index !== -1) {
      const list = this.component.state.notifications.list.map(e => e);
      list[index].hidden = undefined;
      this.component.setState({
        notifications: {
          list: list,
          loading: this.component.state.notifications.loading
        }
      });
    }
    this.ipcWrapper.send(NOTIFICATON_UNHIDE, id);
  }

  getNotificationIndex(id) {
    const { list } = this.component.state.notifications;
    for (let i = 0; i < list.length; i++) {
      if (list[i]._id === id) return i;
    }
    return -1;
  }

}

export default NotificationsHandler;