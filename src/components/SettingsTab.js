import React, { Component } from 'react';
import './SettingsTab.css';
import ChannelSettings from './ChannelSettings';
import FilterSettings from './FilterSettings';
import { Button } from 'react-bootstrap';

const { ipcRenderer } = window.electron;
const { NOTIFICATION_DUMMY } = window.ipcEvents;

export class Settings extends Component {
  sendDummyNotification(eventName) {
    ipcRenderer.send(NOTIFICATION_DUMMY, eventName);
  }

  render() {
    return (
      <div className="m-4">
        <h4>Basic settings</h4>
        <ChannelSettings {...this.props} />
        <div className="m-4" />
        <h4>Notification filters</h4>
        <FilterSettings {...this.props} />
        <h5 className="mt-2">Send dummy notifications</h5>
        <Button variant="secondary" size="sm" className="m-1" onClick={() => this.sendDummyNotification()}>Any</Button>
        <Button variant="secondary" size="sm" className="m-1" onClick={() => this.sendDummyNotification('sub')}>Sub</Button>
        <Button variant="secondary" size="sm" className="m-1" onClick={() => this.sendDummyNotification('resub')}>Resub</Button>
        <Button variant="secondary" size="sm" className="m-1" onClick={() => this.sendDummyNotification('giftsub')}>Giftsub</Button>
        <Button variant="secondary" size="sm" className="m-1" onClick={() => this.sendDummyNotification('massgiftsub')}>Massgiftsub</Button>
        <Button variant="secondary" size="sm" className="m-1" onClick={() => this.sendDummyNotification('bits')}>Bits</Button>
      </div>
    )
  }
}

export default Settings;
