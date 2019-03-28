import React, { Component } from 'react';
import './SettingsTab.css';
import ChannelSettings from './ChannelSettings';
import FilterSettings from './FilterSettings';

export class Settings extends Component {
  render() {
    return (
      <div className="m-4">
        <h4>Basic settings</h4>
        <ChannelSettings {...this.props} />
        <div className="m-4" />
        <h4>Notification filters</h4>
        <FilterSettings {...this.props} />
      </div>
    )
  }
}

export default Settings;
