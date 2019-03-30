import React, { Component } from 'react'
import TimestampAgo from './TimestampAgo';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEyeSlash, faTrash, faShare, faHistory } from '@fortawesome/free-solid-svg-icons';

class Notification extends Component {
  render() {
    const e = this.props.item;
    return (
      <div className="notification">
        <div className="notification-channel">
          #{e.channel}
        </div>
        <div className="notification-controls">
          <div className="notification-controls-text">
            <TimestampAgo time={e.timestamp}/> <FontAwesomeIcon icon={faHistory} />
          </div>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id={'tooltip-resend-' + e.id}>Resend</Tooltip>}>
            <Button variant="primary" size="sm"><FontAwesomeIcon icon={faShare} /></Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id={'tooltip-hide-' + e.id}>Hide</Tooltip>}>
            <Button variant="info" size="sm"><FontAwesomeIcon icon={faEyeSlash} /></Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id={'tooltip-delete-' + e.id}>Delete</Tooltip>}>
            <Button variant="danger" size="sm"><FontAwesomeIcon icon={faTrash} /></Button>
          </OverlayTrigger>
        </div>
        <div className="notification-title">
          <Title e={e} />
        </div>
        <NotificationContent e={e} />
      </div>
    )
  }
}

const Title = ({ e }) => {
  let name = e.displayName;
  if (name.toLowerCase() !== e.login) {
    name += ' (' + e.login + ')';
  }
  switch (e.event) {
    case 'sub': {
      const tierText = e.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + e.tier.charAt(0);
      return (
        <>
          <strong>{name}</strong> subbed with <strong>{tierText}</strong>
        </>
      )
    }
    case 'resub': {
      const tierText = e.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + e.tier.charAt(0);
      return (
        <>
          <strong>{name}</strong> resub for <strong>{e.months} months</strong> with <strong>{tierText}</strong>
        </>
      )
    }
    case 'giftsub': {
      const tierText = e.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + e.tier.charAt(0);
      let recepeintName = e.recepient.displayName;
      if (recepeintName.toLowerCase() !== e.recepient.login) {
        recepeintName += ' (' + e.recepient.login + ')';
      }
      return (
        <>
          <strong>{name}</strong> gifted a <strong>{tierText}</strong> sub to <strong>{recepeintName}</strong>. They have gifted <strong>{e.senderCount} subs</strong>
        </>
      )
    }
    case 'massgiftsub': {
      const tierText = e.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + e.tier.charAt(0);
      return (
        <>
          <strong>{name}</strong> gifted <strong>{e.massCount} {tierText} subs</strong>. They have gifted <strong>{e.senderCount}</strong> subs
        </>
      )
    }
    case 'bits': {
      return (
        <>
          <strong>{name}</strong> cheered <strong>{e.bits} bits</strong>
        </>
      )
    }
    default: {
      return <strong>{e.systemMsg || e.msg}</strong>;
    }
  }
};

class NotificationContent extends Component {
  constructor(props) {
    super(props)
  
    this.state = {
       expanded: false,
       canExpand: false
    };
    this.content = React.createRef();
  }

  componentDidMount() {
    const { current } = this.content;
    if (current && current.offsetWidth < current.scrollWidth) {
      this.setState({
        canExpand: true
      });
    }
  }

  getText() {
    const { e } = this.props;
    if (e.event === 'massgiftsub') {
      const recText = e.recepients.map((r) => {
        let name = r.displayName;
        if (name.toLowerCase() !== r.login) {
          name += ' (' + r.login + ')';
        }
        return name;
      }).join(', ');
      return 'Recepients: ' + recText;
    }
    return e.msg ? e.msg : null
  }
  
  render() {
    const text = this.getText();
    if (text === null) return null;
    const { expanded, canExpand } = this.state;
    return (
      <div className={'notification-content' + (expanded ? '' : ' collapsed') + (canExpand ? ' expandable' : '')} ref={this.content} onClick={() => {
        if (canExpand) {
          this.setState({
            expanded: !expanded
          });
        }
      }}>
        {text}
      </div>
    )
  }
}

export default Notification;