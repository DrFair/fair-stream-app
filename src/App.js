import React, { Component } from 'react';
import './App.css';

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
      <div>
        <p>
          Nothing is here yet!
        </p>
      </div>
    );
  }
}

export default App;
