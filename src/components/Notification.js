import React, { Component } from 'react'
import TimestampAgo from './TimestampAgo';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faTrash, faShare, faHistory } from '@fortawesome/free-solid-svg-icons';

class Notification extends Component {
  render() {
    const item = this.props.item;
    const { remove, hide, unhide } = this.props;
    return (
      <div className={'notification' + (item.hidden ? ' hidden' : '')}>
        <div className="notification-channel">
          #{item.channel}
        </div>
        <div className="notification-controls">
          <div className="notification-controls-text">
            <TimestampAgo time={item.timestamp}/> <FontAwesomeIcon icon={faHistory} />
          </div>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id={'tooltip-resend-' + item.id}>Resend</Tooltip>}>
            <Button variant="primary" size="sm"><FontAwesomeIcon icon={faShare} /></Button>
          </OverlayTrigger>
          {item.hidden ? (
            <OverlayTrigger placement="bottom" overlay={<Tooltip id={'tooltip-unhide-' + item.id}>Unhide</Tooltip>}>
              <Button variant="info" size="sm" onClick={unhide}><FontAwesomeIcon icon={faEye} /></Button>
            </OverlayTrigger>
          ) : (
            <OverlayTrigger placement="bottom" overlay={<Tooltip id={'tooltip-hide-' + item.id}>Hide</Tooltip>}>
              <Button variant="info" size="sm" onClick={hide}><FontAwesomeIcon icon={faEyeSlash} /></Button>
            </OverlayTrigger>
          )}
          <OverlayTrigger placement="bottom" overlay={<Tooltip id={'tooltip-delete-' + item.id}>Delete</Tooltip>}>
            <Button variant="danger" size="sm" onClick={remove}><FontAwesomeIcon icon={faTrash} /></Button>
          </OverlayTrigger>
        </div>
        <div className="notification-title">
          <Title item={item} />
        </div>
        <NotificationContent item={item} />
      </div>
    )
  }
}

const Title = ({ item }) => {
  let name = item.displayName;
  if (name.toLowerCase() !== item.login) {
    name += ' (' + item.login + ')';
  }
  switch (item.event) {
    case 'sub': {
      const tierText = item.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + item.tier.charAt(0);
      return (
        <>
          <strong>{name}</strong> subbed with <strong>{tierText}</strong>
        </>
      )
    }
    case 'resub': {
      const tierText = item.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + item.tier.charAt(0);
      return (
        <>
          <strong>{name}</strong> resub for <strong>{item.months} months</strong> with <strong>{tierText}</strong>
        </>
      )
    }
    case 'giftsub': {
      const tierText = item.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + item.tier.charAt(0);
      let recepeintName = item.recepient.displayName;
      if (recepeintName.toLowerCase() !== item.recepient.login) {
        recepeintName += ' (' + item.recepient.login + ')';
      }
      return (
        <>
          <strong>{name}</strong> gifted a <strong>{tierText}</strong> sub to <strong>{recepeintName}</strong>. They have gifted <strong>{item.senderCount} subs</strong>
        </>
      )
    }
    case 'massgiftsub': {
      const tierText = item.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + item.tier.charAt(0);
      return (
        <>
          <strong>{name}</strong> gifted <strong>{item.massCount} {tierText} subs</strong>. They have gifted <strong>{item.senderCount}</strong> subs
        </>
      )
    }
    case 'bits': {
      return (
        <>
          <strong>{name}</strong> cheered <strong>{item.bits} bits</strong>
        </>
      )
    }
    default: {
      return <strong>{item.systemMsg || item.msg}</strong>;
    }
  }
};

class NotificationContent extends Component {
  constructor(props) {
    super(props)
  
    this.state = {
       expanded: true,
       canExpand: false
    };
    this.content = React.createRef();
  }

  componentDidMount() {
    // This is not really working when it's built. Not sure
    // const { current } = this.content;
    // if (current && current.offsetWidth < current.scrollWidth) {
    //   this.setState({
    //     canExpand: true
    //   });
    // }
  }

  getText() {
    const { item } = this.props;
    if (item.event === 'massgiftsub') {
      const recText = item.recepients.map((r) => {
        let name = r.displayName;
        if (name.toLowerCase() !== r.login) {
          name += ' (' + r.login + ')';
        }
        return name;
      }).join(', ');
      return 'Recepients: ' + recText;
    }
    return item.msg ? item.msg : null
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