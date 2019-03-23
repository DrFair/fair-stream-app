import React, { Component } from 'react';
import './Navbar.css';

class NavBar extends Component {
  render() {
    return (
      <div className="w-100 d-flex justify-content-start navbar">
        <NavBarItem id="notifications" name="Notifications" icon="&#xE7E7;" {...this.props} />
        <NavBarItem id="settings" name="Settings" icon="&#xE713;" {...this.props} />
      </div>
    );
  }
}

const NavBarItem = (props) => {
  const { id, icon, name, route, setRoute } = props;
  return (
    <div className="px-2 text-center navbar-item" onClick={() => setRoute(id)} >
      {icon ? <span className="navbar-icon">{icon}</span> : null} {name}
      {route === id ? <div className="navbar-active" /> : null}
    </div>
  )
}

export default NavBar;
