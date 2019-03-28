import React, { Component } from 'react';
import './Titlebar.css';

const BrowserWindow = window.electron.remote.getCurrentWindow();

class Titlebar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      update: 0
    };
    this.update = this.update.bind(this);
  }

  update() {
    this.setState({
      update: this.state.update + 1
    });
  }
  
  componentDidMount() {
    BrowserWindow.on('maximize', this.update);
    BrowserWindow.on('unmaximize', this.update);
  }

  componentWillUnmount() {
    BrowserWindow.removeListener('maximize', this.update);
    BrowserWindow.removeListener('unmaximize', this.update);
  }

  render() {
    const maximized = BrowserWindow.isMaximized();
    return (
      <div className="titlebar w-100 d-flex flex-fill flex-grow-1">
        <div className="px-1 window-dragable">
          <img src="favicon.ico" width="26" height="26" style={{ marginTop: 2, verticalAlign: 'unset' }} alt="App icon" />
        </div>
        <div className="px-1 flex-fill text-center window-dragable">
          Fair Stream App
        </div>
        <div 
          className="px-2 window-minimize window-control"
          onClick={() => {
            if (BrowserWindow) {
              BrowserWindow.minimize();
            }
          }}
        >
          <span>&#xE921;</span>
        </div>
        <div 
          className="px-2 window-maximize window-control"
          onClick={() => {
            if (BrowserWindow) {
              if (BrowserWindow.isMaximized()) {
                BrowserWindow.unmaximize();
              } else {
                BrowserWindow.maximize();
              }
            }
          }}
        >
          {maximized ? <span>&#xE923;</span> : <span>&#xE922;</span>}
        </div>
        <div 
          className="px-2 window-close window-control"
          onClick={() => {
            if (BrowserWindow) {
              BrowserWindow.close();
            }
          }}
        >
          <span>&#xE8BB;</span>
        </div>
        <div className="window-resizer" />
      </div>
    );
  }
}

export default Titlebar;
