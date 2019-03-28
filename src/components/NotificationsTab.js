import React, { Component } from 'react'
import './NotificationsTab.css';
import IPCWrapper from '../ipcWrapper';

const { NOTIFICATION_NEW, NOTIFICATION_HISTORY } = window.ipcEvents;

class NotificationsTab extends Component {
    constructor(props) {
      super(props)
      this.state = {
          list: []
      };
    }

    addNotifications(...notifications) {
        const filters = this.props.settings.notificationFilters;
        const filtered = notifications.filter((e) => {
            if (filters) {
                return true; // TODO: Add filter conditions
            } else {
                return true;
            }
        })
        const { list } = this.state;
        // Add them to the beginning of the list
        if (filtered.length > 0) {
            list.unshift(filtered);
            this.setState({
                list: list
            });
        }
    }

    componentDidMount() {
        this.ipcWrapper = new IPCWrapper();
        this.ipcWrapper.once(NOTIFICATION_HISTORY, (event, data) => {
            console.log('GOT', data);
            const { list } = this.state;
            this.setState({
                list: list.concat(data)
            });
        });

        this.ipcWrapper.send(NOTIFICATION_HISTORY);

        this.ipcWrapper.on(NOTIFICATION_NEW, (event, data) => {
          console.log("Got notification", data);
          let list = this.state.list.map((e) => e); // Need to make a copy of list
          list.unshift(data);
          this.setState({
              list: list
          });
        });
    }

    componentWillUnmount() {
        this.ipcWrapper.dispose();
    }

    render() {
        const { list } = this.state;
        return (
            <div className="m-4">
                {list.map((e) => (
                    <p key={e.id}>#{e.channel} {e.systemMsg ? e.systemMsg : e.msg}</p>
                ))}
            </div>
        )
    }
}

export default NotificationsTab;