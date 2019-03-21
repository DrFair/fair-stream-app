import React, { Component } from 'react';
import './App.css';
import Titlebar from './components/titlebar.js'

const { ipcRenderer } = window.electron;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      result: null
    };
  }
  componentDidMount() {
  }

  render() {
    return (
      <div className="d-flex flex-column h-100">
        <Titlebar />
        <div className="app h-100">
          <p>
            Nothing is here yet!
          </p>
        </div>
      </div>
    );
  }
}

export default App;
