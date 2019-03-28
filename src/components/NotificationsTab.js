import React, { Component } from 'react'
import './NotificationsTab.css';
import IPCWrapper from '../ipcWrapper';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';
import FilterSettings from './FilterSettings';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFilter } from '@fortawesome/free-solid-svg-icons';

const { NOTIFICATION_NEW, NOTIFICATION_HISTORY } = window.ipcEvents;

class NotificationsTab extends Component {
  constructor(props) {
    super(props)
    this.state = {
      list: []
    };
    this.filterSettingsOverlay = React.createRef();

    this.updateFromHistory = this.updateFromHistory.bind(this);
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

  componentDidUpdate(prevProps) {
    if (this.props.settings !== prevProps.settings) {
      this.updateFromHistory();
    }
  }

  updateFromHistory() {
    this.ipcWrapper.once(NOTIFICATION_HISTORY, (event, data) => {
      console.log('GOT', data);
      this.setState({
        list: data
      });
    });

    this.ipcWrapper.send(NOTIFICATION_HISTORY);
  }

  componentDidMount() {
    this.ipcWrapper = new IPCWrapper();
    this.updateFromHistory();

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
      <div className="mx-4 mt-1 mb-4">
        <div className="d-flex flex-row">
          <div className="p-2 mr-auto">
            <h4>Notifications</h4>
          </div>
          <div className="p-2">
            <OverlayTrigger trigger="click" placement="left" ref={this.filterSettingsOverlay} overlay={
              <Popover id="filter-settings-popover">
                <FilterSettings {...this.props} smallApply={true} onApply={() => {
                  this.filterSettingsOverlay.current.hide();
                }} />
              </Popover>
            }>
              <Button variant="light" size="smg"><FontAwesomeIcon icon={faFilter} /> Filters</Button>
            </OverlayTrigger>
          </div>
        </div>
        {list.map((e) => (
          <p key={e.id}>#{e.channel} {e.systemMsg ? e.systemMsg : e.msg}</p>
        ))}
      </div>
    )
  }
}

export default NotificationsTab;