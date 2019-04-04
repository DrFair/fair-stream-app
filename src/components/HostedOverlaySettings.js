import React, { Component } from 'react'
import { Form, Button } from 'react-bootstrap';

const { ipcRenderer } = window.electron;
const { OVERLAY_SETTINGS } = window.ipcEvents;

class HostedOverlaySettings extends Component {
  constructor(props) {
    super(props)
    this.state = {
    };
  }

  getSettingControl(setting, key) {
    const type = setting.type || 'text';
    switch(type) {
      case 'select': {
        const options = setting.options || [ setting.defaultValue ];
        return (
          <Form.Control as="select" size="sm" style={{ maxWidth: 400 }} defaultValue={setting.value} onChange={(e) => {
            const newState = {};
            newState[key] = e.target.value;
            this.setState(newState);
          }}>
            {options.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Form.Control>
        );
      }
      default: {
        return <Form.Control as="input" type={type} size="sm" defaultValue={setting.value} style={{ maxWidth: 400 }} onChange={(e) => {
          const newState = {};
          newState[key] = e.target.value;
          this.setState(newState);
        }}/>
      }
    }
  }
  
  render() {
    const { hostedOverlay } = this.props.status;
    const { settings } = hostedOverlay;
    return (
      <>
        {/* {JSON.stringify(hostedOverlay, 2)} */}
        <Form.Group>
          {Object.keys(settings).map((key) => {
            const setting = settings[key];
            return (
              <div key={key} className="mt-2">
                <Form.Label>{setting.name || key}</Form.Label>
                {this.getSettingControl(setting, key)}
                {setting.note ? (
                  <p className="settings-note">{setting.note}</p>
                ) : null}
              </div>
            )
          })}
        </Form.Group>
        <Button
          variant="primary"
          onClick={() => {
            console.log(this.state);
            ipcRenderer.send(OVERLAY_SETTINGS, this.state);
          }}
        >
          Apply
        </Button>
      </>
    )
  }
}

export default HostedOverlaySettings;
