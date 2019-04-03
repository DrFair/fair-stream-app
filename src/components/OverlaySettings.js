import React, { Component } from 'react'
import { Form, Button } from 'react-bootstrap';

const { ipcRenderer } = window.electron;
const { OVERLAY_SET } = window.ipcEvents;

class OverlaySettings extends Component {
  constructor(props) {
    super(props)

    this.hostPort = React.createRef();
    this.overlaySelect = React.createRef();
  }
  
  render() {
    const { status, settings } = this.props;
    const { hostedOverlay } = status;
    return (
      <div>
        <Form.Group>
          <Form.Label>Overlay host port</Form.Label>
          <Form.Control as="input" type="number" size="sm" style={{ maxWidth: 400 }} defaultValue={settings ? settings.hostPort : 3000} ref={this.hostPort} />
          <Form.Label>Select overlay</Form.Label>
          <Form.Control as="select" ref={this.overlaySelect} size="sm" style={{ maxWidth: 400 }}>
            <option value={-1} selected={hostedOverlay === null}>No overlay</option>
            {status.overlays.map((e) => (
              <option key={e.name + e.version + e.index} value={e.index} selected={hostedOverlay !== null && hostedOverlay.index === e.index}>{e.name} v{e.version}</option>
            ))}
          </Form.Control>
          { status !== null && status.hostedOverlay !== null ? (
            <>
              <p className="settings-note good">Currently hosting {status.hostedOverlay.name} v{status.hostedOverlay.version} on port {status.hostedOverlay.port}</p>
              <p className="settings-note good">To use it, create a browser source on OBS with URL: localhost:{status.hostedOverlay.port}</p>
            </>
          ) : (
            <p className="settings-note bad">Not currently hosting any overlay</p>
          ) }
          { status !== null && status.overlayError !== null ? (
            <p className="settings-note bad">{status.overlayError}</p>
          ) : null}
        </Form.Group>
        <Button
          variant="primary"
          onClick={() => {
            let index = this.overlaySelect.current.value;
            let hostPort = this.hostPort.current.value;
            ipcRenderer.send(OVERLAY_SET, index, hostPort);
          }}
        >
          Apply
        </Button>
      </div>
    )
  }
}

export default OverlaySettings;