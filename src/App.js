import React, { Component } from 'react';
import './App.css';
import Titlebar from './components/Titlebar';
import NavBar from './components/Navbar';
import Settings from './components/SettingsTab';
import NotificationsTab from './components/NotificationsTab';
import IPCWrapper from './ipcWrapper';

const { SETTINGS_GET, SETTINGS_SET, STATUS_GET } = window.ipcEvents;

class App extends Component {
  constructor(props) {
    super(props);
    this.routes = {
      'notifications': NotificationsTab,
      'settings': Settings
    };
    this.state = {
      route: 'settings',
      settings: null,
      status: null
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
    this.ipcWrapper.send(SETTINGS_SET, settings);
  }

  componentDidMount() {
    this.ipcWrapper = new IPCWrapper();
    this.ipcWrapper.on(SETTINGS_GET, (event, data) => {
      this.setState({
        settings: data
      });
    });

    this.ipcWrapper.on(STATUS_GET, (event, data) => {
      console.log('Got status update', data);
      this.setState({
        status: data
      });
    });

    this.ipcWrapper.send(SETTINGS_GET);
    this.ipcWrapper.send(STATUS_GET);
  }

  componentWillUnmount() {
    this.ipcWrapper.dispose();
  }

  render() {
    const { route, settings, status } = this.state;
    const RouteComp = this.routes[route] || null;
    const childProps = {
      route: route,
      setRoute: this.setRoute,
      setSettings: this.setSettings,
      settings: settings,
      status: status
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

export default App;
