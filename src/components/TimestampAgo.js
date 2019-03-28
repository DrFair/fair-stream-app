import React, { Component } from 'react'

// Requires time prop
// Basically converts a timestamp into a human readable format and updates it regularly.
// Example:
// 2s ago
// 5m ago
// 4h30m ago
// Mar. 28th

// Props:
// ago=true to add affix 'ago'
// full=true to always display full time like 'Mar. 28th 9:54 AM

// Constants
const S_IN_M = 60;
const M_IN_H = 60;
const S_IN_H = S_IN_M * M_IN_H;
const H_IN_D = 24;
const S_IN_D = S_IN_H * H_IN_D;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_AFFIX = ['st', 'nd', 'rd', 'th'];

class TimestampAgo extends Component {
  constructor(props) {
    super(props)
  
    this.state = {
       text: 'N/A'
    };
    this.updateText = this.updateText.bind(this);
  }

  // Also starts timeout
  updateText() {
    const { time, ago, full } = this.props;
    if (this.timeout) clearTimeout(this.timeout);
    if (typeof(time) !== 'number') {
      this.setState({
        text: 'N/A'
      });
      return;
    }
    const affixText = ago ? ' ago' : '';
    const date = new Date(time);
    const deltaMS = Date.now() - date.getTime();
    const deltaS = Math.floor(deltaMS / 1000);
    let nextTimeout = null;
    let text = 'N/A';
    if (deltaS < 0) {
      text = '0s' + affixText;
      nextTimeout = Math.abs(deltaS); // Run when time turns positive
    } else if (deltaS < S_IN_M) { // Less than 1 min
      text = Math.floor(deltaS) + 's' + affixText;
      nextTimeout = 1; // Update in 1s
    } else if (deltaS < S_IN_H) { // Less than 1 hour
      const mins = Math.floor(deltaS / S_IN_M);
      if (deltaS < 10 * S_IN_M) { // Less than 10 mins
        const secs = deltaS % S_IN_M;
        text = `${mins}m${secs}s` + affixText;
        nextTimeout = 1; // Update in 1s
      } else { // 10 - 60 mins
        text = `${mins}m` + affixText;
        nextTimeout = (S_IN_M - (deltaS % S_IN_M)) + 1; // Update next minute + 1s
      }
    } else if (deltaS < S_IN_D) { // Less than 24 hours
      const hours = Math.floor(deltaS / (S_IN_H));
      if (deltaS < 10 * S_IN_H) { // Less than 10 hours
        const mins = Math.floor(deltaS / S_IN_M) % M_IN_H;
        text = `${hours}h${mins}m` + affixText;
        nextTimeout = (S_IN_M - (deltaS % S_IN_M)) + 1; // Update next minute + 1s
      } else { // 10 - 24 hours
        text = `${hours}h` + affixText;
        nextTimeout = (S_IN_H - (deltaS % S_IN_H)) + 1; // Update next hour + 1s
      }
    } else { // More than 24 hours
      const month = MONTH_NAMES[date.getMonth()];
      const day = date.getDate();
      const dayAffix = day >= DATE_AFFIX.length ? DATE_AFFIX[DATE_AFFIX.length - 1] : DATE_AFFIX[day - 1];
      text = `${month}. ${day}${dayAffix}`;
      if (full) {
        text += ` ${date.getHours()}:${date.getMinutes()}`;
      }
      // Never update again
    }
    this.setState({
      text: text
    });

    if (nextTimeout !== null) {
      // console.log('Started time, will run in ' + nextTimeout + 's');
      // Align the time wth each other
      const ms = nextTimeout * 1000;
      const msAlign = (ms - Date.now()) % 1000;
      this.timeout = setTimeout(this.updateText, ms + msAlign);
    }
  }

  componentDidMount() {
    this.updateText();
  }

  componentWillUnmount() {
    if (this.timeout) clearTimeout(this.timeout);
  }
  

  render() {
    const { text } = this.state;
    return (
      <>
        {text}
      </>
    )
  }
}

export default TimestampAgo;