import React, { Component } from 'react'
import './NotificationsTab.css';

const { ipcRenderer } = window.electron;
const { NOTIFICATION_HISTORY } = window.ipcEvents;

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

    updateFilteredList() {
        const { list } = this.state;
        const filters = this.props.settings.notificationFilters;
        if (filters) {
            this.setState({
                filteredList: list.filter((e) => {
                    return true; // TODO: Add filter conditions
                })
            });
        } else {
            this.setState({
                filteredList: list.map((e) => e)
            });
        }
        this.setState()
    }

    componentDidMount() {
        ipcRenderer.once(NOTIFICATION_HISTORY, (event, data) => {
            const { list } = this.state;
            this.setState({
                list: list.push(data)
            });
        });

        ipcRenderer.send(NOTIFICATION_HISTORY);
    }

    render() {
        return (
            <div className="m-4">
                Hello from notifications tab!
            </div>
        )
    }
}

export default NotificationsTab;