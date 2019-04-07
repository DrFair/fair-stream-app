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
    this.searchInput = React.createRef();
  }

  render() {
    const { notifications, searchResults, notificationsHandler } = this.props;
    if (!notifications || !searchResults) return null;
    const notiList = notifications.list;
    const notiLoading = notifications.loading;
    const searchList = searchResults.list;
    const searchLoading = searchResults.loading;
    const searchQuery = searchResults.query;
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
              ref={this.searchInput}
            />
            <InputGroup.Append>
              <Button variant="primary" onClick={() =>{
                let { value } = this.searchInput.current;
                value = value.trim();
                if (value === '') {
                  notificationsHandler.clearSearch();
                } else {
                  notificationsHandler.search(value)
                }
              }}>Search</Button>
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
        {searchLoading ? (
          <>
            <div>Searching...</div>
          </>
        ) : null}
        {searchQuery !== null ? (
          <>
            <h5>Search results for {searchQuery}</h5>
            {searchList.length > 0 ? searchList.map((e) => (
              <div key={e._id}>
                <Notification
                  item={e}
                  remove={() => notificationsHandler.deleteNotification(e._id)}
                  hide={() => notificationsHandler.hideNotification(e._id)}
                  unhide={() => notificationsHandler.unhideNotification(e._id)}
                />
              </div>
            )) : (
              <>
                <div>Could not find any results for {searchQuery}</div>
              </>
            )}
          </>
        ) : null}
        {notiLoading ? (
          <>
            <div>Loading...</div>
          </>
        ) : null}
        {notiList.length <= 0 && !notiLoading ? (
          <>
            <div>No notifications to show :(</div>
          </>
        ) : (
          <>
            {notiList.length > 0 ? <h5>Notifications</h5> : null}
            {notiList.map((e) => (
              <div key={e._id}>
                <Notification
                  item={e}
                  remove={() => notificationsHandler.deleteNotification(e._id)}
                  hide={() => notificationsHandler.hideNotification(e._id)}
                  unhide={() => notificationsHandler.unhideNotification(e._id)}
                />
              </div>
            ))}
          </>
        )}
      </div>
    )
  }
}

export default NotificationsTab;