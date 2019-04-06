import React, { Component } from 'react'

class ChannelSettings extends Component {
  constructor(props) {
    super(props)
    
    this.state = {
      settings: {}
    };
  
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(name, value) {
    let newSettings = {};
    newSettings[name] = value;
    newSettings = Object.assign(this.state.settings, newSettings);

    const { settings } = this.props;
    const filters = settings ? settings.notificationFilters : undefined;
    if (filters && filters[name] === newSettings[name]) {
      delete newSettings[name];
    }
    this.setState({
      settings: newSettings
    });
  }
  
  render() {
    const { settings, setSettings, status } = this.props;
    return (
      <>
        <div className="form-group">
          <label>Channel name</label>
          <input className="form-control form-control-sm" type="text" style={{ maxWidth: 400 }} defaultValue={settings ? settings.channel : ''} onChange={(e) => {
            let value = e.target.value.trim();
            if (value === '') value = null;
            this.handleChange('channel', value);
          }} />
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
          className="btn btn-primary"
          onClick={() => {
            setSettings(this.state.settings);
            this.setState({
              settings: {}
            });
          }}
          disabled={Object.keys(this.state.settings).length === 0}
        >
          Apply
        </button>
      </>
    )
  }
}

export default ChannelSettings;