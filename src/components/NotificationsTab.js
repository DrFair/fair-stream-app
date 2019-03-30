import React, { Component } from 'react'
import './NotificationsTab.css';
import IPCWrapper from '../ipcWrapper';
import { Button, OverlayTrigger, Popover, InputGroup, FormControl } from 'react-bootstrap';
import FilterSettings from './FilterSettings';
import Notification from './Notification';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faFilter, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const { NOTIFICATION_NEW, NOTIFICATION_HISTORY } = window.ipcEvents;

class NotificationsTab extends Component {
  constructor(props) {
    super(props)
    this.state = {
      list: [],
      loading: false
    };
    this.filterSettingsOverlay = React.createRef();

    this.updateFromHistory = this.updateFromHistory.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.settings !== prevProps.settings) {
      this.updateFromHistory();
    }
  }

  updateFromHistory() {
    this.ipcWrapper.once(NOTIFICATION_HISTORY, (event, data) => {
      console.log('GOT', data);
      this.setState({
        list: data,
        loading: false
      });
    });

    this.ipcWrapper.send(NOTIFICATION_HISTORY);
    this.setState({
      loading: true
    });
  }

  componentDidMount() {
    this.ipcWrapper = new IPCWrapper();
    this.updateFromHistory();

    this.ipcWrapper.on(NOTIFICATION_NEW, (event, data) => {
      console.log("Got notification", data);
      let list = this.state.list.map((e) => e); // Need to make a copy of list
      list.unshift(data);
      this.setState({
        list: list
      });
    });
  }

  componentWillUnmount() {
    this.ipcWrapper.dispose();
  }

  render() {
    const { list, loading } = this.state;
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
            <Button variant="info" size="sm"><FontAwesomeIcon icon={faEyeSlash} /> Hide all</Button>
          </div>
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
            <Notification item={e} />
          </div>
        ))}
      </div>
    )
  }
}

export default NotificationsTab;