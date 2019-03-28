import React, { Component } from 'react';
import './SettingsTab.css';
import ChannelSettings from './ChannelSettings';

export class Settings extends Component {
  render() {
    return (
      <div className="m-4">
        <h4>Basic settings</h4>
        <ChannelSettings {...this.props} />
      </div>
    )
  }
}

export default Settings;
