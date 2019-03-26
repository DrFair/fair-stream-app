import React, { Component } from 'react';
import './App.css';
import Titlebar from './components/Titlebar.js';
import NavBar from './components/Navbar.js';
import Settings from './components/Settings.js';

const { ipcRenderer } = window.electron;

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
    ipcRenderer.send('settings-set', settings);
  }

  componentDidMount() {
    ipcRenderer.on('settings', (event, data) => {
      this.setState({
        settings: data
      });
    });
    
    ipcRenderer.on('status', (event, data) => {
      console.log('Got status update', data);
      this.setState({
        status: data
      });
    });

    ipcRenderer.send('settings-get');
    ipcRenderer.send('status-get');

    ipcRenderer.on('notification', (event, data) => {
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
