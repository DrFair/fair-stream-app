import React, { Component } from 'react'

class ChannelSettings extends Component {
  constructor(props) {
    super(props)
    
    this.state = {
      canApply: false
    };
  
    this.channelInput = React.createRef();
    this.updateApply = this.updateApply.bind(this);
  }

  updateApply() {
    const { settings } = this.props;
    const channelValue = this.channelInput.current.value;
    this.setState({
      canApply: canApply()
    });
    
    function canApply() {
      if (!settings) return false;
      if (channelValue !== settings.channel) return true;
      return false;
    }
  }

  componentDidMount() {
    this.updateApply();
  }

  componentDidUpdate(prevProps) {
    if (this.props.settings !== prevProps.settings) {
      this.updateApply();
    }
  }
  
  render() {
    const { settings, setSettings, status } = this.props;
    const { canApply } = this.state;
    return (
      <>
        <div className="form-group">
          <label>Channel name</label>
          <input className="form-control form-control-sm" type="text" style={{ maxWidth: 400 }} defaultValue={settings ? settings.channel : ''} ref={this.channelInput} onChange={this.updateApply} />
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
            let { value } = this.channelInput.current;
            if (value === '') value = null;
            setSettings({
              channel: value
            });
          }}
          disabled={!canApply}
        >
          Apply
        </button>
      </>
    )
  }
}

export default ChannelSettings;