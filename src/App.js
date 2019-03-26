import React, { Component } from 'react';
import './App.css';
import Titlebar from './components/Titlebar.js';
import NavBar from './components/Navbar.js';
import Settings from './components/Settings.js';

const { ipcRenderer } = window.electron;
const { SETTINGS_GET, SETTINGS_SET, STATUS_GET, NOTIFICATION_NEW } = window.ipcEvents;

class App extends Component {
  constructor(props) {
    super(props);
    this.routes = {
      'notifications': NotificationsRoute,
      'settings': Settings
    };
    this.state = {
      route: 'settings',
      settings: null,
      status : null
    };

    this.setRoute = this.setRoute.bind(this);
    this.setSettings = this.setSettings.bind(this);
  }

  setRoute(route) {
    this.setState({
      route: route
    });
  }

  setSettings(settings) {
    ipcRenderer.send(SETTINGS_SET, settings);
  }

  componentDidMount() {
    ipcRenderer.on(SETTINGS_GET, (event, data) => {
      this.setState({
        settings: data
      });
    });
    
    ipcRenderer.on(STATUS_GET, (event, data) => {
      console.log('Got status update', data);
      this.setState({
        status: data
      });
    });

    ipcRenderer.send(SETTINGS_GET);
    ipcRenderer.send(STATUS_GET);

    ipcRenderer.on(NOTIFICATION_NEW, (event, data) => {
      console.log("Got notification", data);
      // TODO: Do something with the notification
    });
  }

  render() {
    const { route, settings, status } = this.state;
    const RouteComp = this.routes[route] || null;
    const childProps = {
      route: route,
      setRoute: this.setRoute,
      setSettings: this.setSettings,
      settings: settings,
      status : status
    };
    return (
      <div className="d-flex flex-column h-100">
        <Titlebar />
        <NavBar {...childProps} />
        <div className="app h-100">
          <RouteComp {...childProps} />
        </div>
      </div>
    );
  }
}

const NotificationsRoute = () => {
  return (
    <div>
      This is notifications
    </div>
  )
};

export default App;
