import React, { Component } from 'react'
import './NotificationsTab.css';
import { Button, OverlayTrigger, Popover, InputGroup, FormControl } from 'react-bootstrap';
import FilterSettings from './FilterSettings';
import Notification from './Notification';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faFilter, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const { ipcRenderer } = window.electron;
const { NOTIFICATION_HIDE } = window.ipcEvents;

class NotificationsTab extends Component {
  constructor(props) {
    super(props)
    this.filterSettingsOverlay = React.createRef();
  }

  render() {
    const { notifications, notificationsHandler } = this.props;
    if (!notifications) return null;
    const { list, loading } = notifications;
    return (
      <div className="mx-4 mt-1 mb-4">
        <div className="d-flex flex-row mb-2" style={{ whiteSpace: 'nowrap' }}>
          <InputGroup className="p-2 mr-auto" size="sm">
            <InputGroup.Prepend>
              <InputGroup.Text><FontAwesomeIcon icon={faSearch} /></InputGroup.Text>
            </InputGroup.Prepend>
            <FormControl
              placeholder="username, message, bits..."
              style={{ maxWidth: 300 }}
            />
            <InputGroup.Append>
              <Button variant="primary">Search</Button>
            </InputGroup.Append>
          </InputGroup>
          <div className="p-2">
            <OverlayTrigger trigger="click" placement="left" ref={this.filterSettingsOverlay} overlay={
              <Popover id="filter-settings-popover">
                <FilterSettings {...this.props} smallApply={true} onApply={() => {
                  this.filterSettingsOverlay.current.hide();
                }} />
              </Popover>
            }>
              <Button variant="light" size="sm"><FontAwesomeIcon icon={faFilter} /> Filters</Button>
            </OverlayTrigger>
          </div>
          <div className="p-2">
            <Button variant="info" size="sm" onClick={() => {
              ipcRenderer.send(NOTIFICATION_HIDE, 'all');
              notificationsHandler.updateFromHistory();
            }}><FontAwesomeIcon icon={faEyeSlash} /> Hide all</Button>
          </div>
          {/* <div className="p-2">
            <Button variant="info" size="sm" onClick={() => {
              ipcRenderer.send(NOTIFICATION_UNHIDE, 'all');
              notificationsHandler.updateFromHistory();
            }}><FontAwesomeIcon icon={faEye} /> Unhide all</Button>
          </div> */}
        </div>
        {loading ? (
          <>
            <div>Loading...</div>
          </>
        ) : null}
        {list.length <= 0 && !loading ? (
          <>
            <div>No notifications to show :(</div>
          </>
        ) : list.map((e) => (
          <div key={e._id}>
            <Notification
              item={e}
              remove={() => notificationsHandler.deleteNotification(e._id)}
              hide={() => notificationsHandler.hideNotification(e._id)}
              unhide={() => notificationsHandler.unhideNotification(e._id)}
            />
          </div>
        ))}
      </div>
    )
  }
}

export default NotificationsTab;