import React, { Component } from 'react';
import './App.css';
import Titlebar from './components/Titlebar.js';
import NavBar from './components/Navbar.js';

const { ipcRenderer } = window.electron;

class App extends Component {
  constructor(props) {
    super(props);
    this.routes = {
      'notifications': NotificationsRoute,
      'settings': SettingsRoute
    };
    this.state = {
      route: 'notifications'
    };
    this.setRoute = this.setRoute.bind(this);
  }

  setRoute(route) {
    this.setState({
      route: route
    });
  }

  componentDidMount() {
  }

  render() {
    const { route } = this.state;
    const RouteComp = this.routes[route] || null;
    return (
      <div className="d-flex flex-column h-100">
        <Titlebar />
        <NavBar route={route} setRoute={this.setRoute} />
        <div className="app h-100">
          <RouteComp route={route} setRoute={this.setRoute} />
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

const SettingsRoute = () => {
  return (
    <div>
      This is settings
    </div>
  )
};

export default App;
