import React, { Component } from 'react';
import './SettingsTab.css';

export class Settings extends Component {
  constructor(props) {
    super(props)
    this.channelInput = React.createRef()
  }
  
  render() {
    const self = this;
    const { settings, setSettings, status } = this.props;
    return (
      <div className="m-4">
        <h4>Basic settings</h4>
        <div className="form-group">
          <label>Channel name</label>
          <input className="form-control form-control-sm" type="text" style={{ maxWidth: 400 }} defaultValue={settings ? settings.channel : ''} ref={this.channelInput} />
          <p className="settings-note">
            Your channel name is used to track notifications like subs, bits etc.
          </p>
          { status !== null && status.trackingChannel !== null ? (
            <p className="settings-note good">Currently tracking {status.trackingChannel}</p>
          ) : (
            <p className="settings-note bad">Not currently tracking any channel</p>
          ) }
        </div>
        <button 
          className="btn settings-apply"
          onClick={() => {
            let { value } = self.channelInput.current;
            if (value === '') value = null;
            if (settings.channel !== value) {
              setSettings({
                channel: value
              });
            }
          }}
        >
          Apply
        </button>
      </div>
    )
  }
}

export default Settings;
