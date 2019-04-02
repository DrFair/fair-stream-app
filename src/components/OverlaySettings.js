import React, { Component } from 'react'
import { Form, Button } from 'react-bootstrap';

const { ipcRenderer } = window.electron;
const { OVERLAY_SET } = window.ipcEvents;

class OverlaySettings extends Component {
  constructor(props) {
    super(props)

    this.overlaySelect = React.createRef();
  }
  

  render() {
    const { status } = this.props;
    return (
      <div>
        <Form.Group>
          <Form.Label>Select overlay</Form.Label>
          <Form.Control as="select" ref={this.overlaySelect} size="sm" style={{ maxWidth: 400 }}>
            <option value={-1}>No overlay</option>
            {status.overlays.map((e) => (
              <option key={e.name + e.version + e.index} value={e.index}>{e.name } v{e.version}</option>
            ))}
          </Form.Control>
          { status !== null && status.hostedOverlay !== null ? (
            <p className="settings-note good">Currently hosting overlay {status.hostedOverlay.name} v{status.hostedOverlay.version}</p>
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
            let { value } = this.overlaySelect.current;
            ipcRenderer.send(OVERLAY_SET, value);
          }}
        >
          Apply
        </Button>
      </div>
    )
  }
}

export default OverlaySettings;