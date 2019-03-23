import React, { Component } from 'react';
import './navbar.css';

class NavBar extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
  }

  render() {
    const { route, setRoute } = this.props;
    return (
      <div className="w-100 d-flex justify-content-start navbar">
        <NavbarItem id="notifications" name="Notifications" icon="&#xE7E7;" {...this.props} />
        <NavbarItem id="settings" name="Settings" icon="&#xE713;" {...this.props} />
      </div>
    );
  }
}

const NavbarItem = (props) => {
  const { id, icon, name, route, setRoute } = props;
  return (
    <div className="px-2 text-center navbar-item" onClick={() => setRoute(id)} >
      {icon ? <span className="navbar-icon">{icon}</span> : null} {name}
      {route === id ? <div className="navbar-active" /> : null}
    </div>
  )
}

export default NavBar;
