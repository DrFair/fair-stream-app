const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');

// This is a wrapper that parses Twitch notifications
// Events:
// name - parameters - description

// sub - channel, data, tags - When a new sub happens. See below for what data contains
// resub - channel, data, tags - When someone announces a resub. See below for what data contains
// giftsub - channel, data, tags - When someone gifts another person a sub
// massgiftsub - channel, data, tags - When someone mass gift subs to a channel
// bits - channel, data, tags - When someone sends bit message to a channel
// any - event, channel, data, tags - Any of the above events, with event being the event name

// Data keys:
// login -                      String -    The login of the user
// displayName -                String -    The display name of the user
// id -                         String -    The ID of the message from Twitch
// timestamp -                  Number -    The timestamp of when the message was sent from Twitch
// systemMsg -                  String -    Only on sub events. The system message from Twitch
// tier -                       String -    Only on sub events. Either 'Prime', '1000', '2000' or '3000'
// msg -                        String -    Only on resub and bits. The message sent to chat
// bits -                       Number -    Only on bits. The number of bits in the message
// months -                     Number -    Only on resub. The total number of months to display
// recepient -                  Object -    Only on giftsub. See recipient object below
// senderCount -                Number -    Only on gift and mass gift subs. The number of subs user has given to channel
// massCount -                  Number -    Only on massgiftsub. The count of subs that's being given away
// recepients -                 Array -     Only on massgiftsub. The array of recepients (object see below)
// recipientObject:
// login -                      String -    The login of the recepient
// displayName -                String -    The display name of the recepient

// Wait to notify gift subs in case they are a part of mass gift subs
const mysteryGiftTimeout = 5000; // If count is reached, it will call it
const giftTimeout = 1000;

class SmartTimeout {
  constructor(callback, time) {
    this.time = time;
    this.callback = callback;
    this.timeout = null;

    this.start = this.start.bind(this);
    this.refresh = this.refresh.bind(this);
    this.clear = this.clear.bind(this);
  }

  start() {
    this.timeout = setTimeout(this.callback, this.time);
  }

  clear() {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
    }
  }

  refresh(newTime) {
    if (newTime !== undefined) this.time = newTime;
    this.clear();
    this.start();
  }

  call() {
    this.clear();
    this.callback();
  }
}

class NotificationsWrapper extends EventEmitter {
  /**
   * @param {IRCClient} ircClient The Twitch IRC client
   */
  constructor(ircClient) {
    super();
    // We want to collect all the recepients of a mass gift sub under 1 notice
    // Since all mass gift subs are also displayed as a gift sub and there's no way
    // to guarantee that 'submysterygift' event triggers before the giftsub events,
    // we have to wait a short while before displaying the notice, in case a
    // 'submysterygift' event happens

    this.giftSubs = [];
    this.massGifters = [];

    ircClient.addListener('usernotice', (channel, login, message, tags) => {
      const data = {
        login: login,
        displayName: tags['display-name'],
        id: tags.id,
        timestamp: Number(tags['tmi-sent-ts']),
        systemMsg: tags['system-msg'].replace(/\\s/g, ' ')
      };
      switch (tags['msg-id']) {
        case 'sub': {
          data.tier = tags['msg-param-sub-plan'];
          this.emitNotification('sub', channel, data, tags);
          break;
        }
        case 'resub': {
          data.msg = message;
          data.months = Number(tags['msg-param-cumulative-months']);
          data.tier = tags['msg-param-sub-plan'];
          this.emitNotification('resub', channel, data, tags);
          break;
        }
        case 'subgift': {
          data.recepient = {
            login: tags['msg-param-recipient-user-name'],
            displayName: tags['msg-param-recipient-display-name']
          };
          data.msg = message;
          data.months = Number(tags['msg-param-months']);
          data.senderCount = Number(tags['msg-param-sender-count']);
          data.tier = tags['msg-param-sub-plan'];
          const key = data.login + '#' + channel + '!' + data.tier;
          let absorbed = false;
          // First check if there's any mass gifts going on
          for (let i = 0; i < this.massGifters.length; i++) {
            const massGift = this.massGifters[i];
            if (massGift.key === key) {
              if (massGift.data.recepients.length < massGift.data.massCount) {
                massGift.data.recepients.push(data.recepient);
                if (massGift.data.recepients.length >= massGift.data.massCount) {
                  massGift.timeout.call();
                } else {
                  // Refresh timeout
                  massGift.timeout.refresh(giftTimeout);
                }
                absorbed = true;
                break;
              }
            }
          }
          if (!absorbed) {
            const obj = {
              key: key,
              channel: channel,
              data: data,
              timeout: new SmartTimeout(() => {
                this.emitNotification('giftsub', channel, data, tags);
                // Remove from list
                for (let i = 0; i < this.giftSubs.length; i++) {
                  if (this.giftSubs[i] === obj) {
                    this.giftSubs.splice(i, 1);
                    break;
                  }
                }
              }, giftTimeout)
            };
            obj.timeout.start();
            this.giftSubs.push(obj);
          }
          break;
        }
        case 'submysterygift': {
          data.massCount = Number(tags['msg-param-mass-gift-count']);
          data.senderCount = Number(tags['msg-param-sender-count']);
          data.tier = tags['msg-param-sub-plan'];
          data.recepients = [];
          const key = data.login + '#' + channel + '!' + data.tier;
          // Check all sub gifts going on, and add them to this part
          for (let i = 0; i < this.giftSubs.length; i++) {
            const giftSub = this.giftSubs[i];
            if (giftSub.key === key && data.recepient.length < data.massCount) {
              data.recepients.push(giftSub.data.recepient);
              giftSub.timeout.clear();
              this.giftSubs.splice(i, 1);
              i--;
            }
          }
          const obj = {
            key: key,
            channel: channel,
            data: data,
            timeout: new SmartTimeout(() => {
              this.emitNotification('massgiftsub', channel, data, tags);
              for (let i = 0; i < this.massGifters.length; i++) {
                if (this.massGifters[i] === obj) {
                  this.massGifters.splice(i, 1);
                  break;
                }
              }
            }, mysteryGiftTimeout)
          };
          if (data.recepients.length >= data.massCount) {
            obj.timeout.call();
          } else {
            obj.timeout.start();
            this.massGifters.push(obj);
          }
          break;
        }
      }
    });

    ircClient.addListener('msg', (channel, login, message, tags) => {
      if (tags.bits) {
        const data = {
          login: login,
          displayName: tags['display-name'],
          id: tags.id,
          timestamp: Number(tags['tmi-sent-ts']),
          msg: message,
          bits: Number(tags.bits)
        };
        this.emitNotification('bits', channel, data, tags);
      }
    });
  }

  /**
   * Emit an 'any' event but also a normal event
   * @param {string} eventName The name of the event
   * @param  {...any} args The args/parameters of the event
   */
  emitNotification(eventName, ...args) {
    this.emit('any', eventName, ...args);
    this.emit(eventName, ...args);
  }


  /**
   * Get a dummy notification object
   * @param {String} eventName The event name (sub, resub, giftsub, massgiftsub, bits, any)
   */
  getDummyNotification(eventName, channel) {
    // First generate basic object
    const nameAffix = getRandomAffix();
    let login = 'dummyfan' + nameAffix;
    let displayName = 'DummyFan' + nameAffix;
    const obj = {
      login: login,
      displayName: displayName,
      id: uuidv4(),
      timestamp: Date.now()
    };
    switch (eventName) {
      case 'sub': {
        obj.tier = randomOneOf('Prime', '1000', '2000', '3000');
        const tierMsg = obj.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + obj.tier.charAt(0);
        obj.systemMsg = `${obj.displayName} subscribed with ${tierMsg}.`;
        return obj;
      }
      case 'resub': {
        obj.tier = randomOneOf('Prime', '1000', '2000', '3000');
        obj.months = 1 + Math.floor(Math.random() * 23);
        const tierMsg = obj.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + obj.tier.charAt(0);
        obj.systemMsg = `${obj.displayName} subscribed with ${tierMsg}. They've subscribed for ${obj.months} months!`;
        if (Math.floor(Math.random() * 3) !== 1) {
          obj.msg = `Dummy message ${getRandomAffix()}`;
        }
        return obj;
      }
      case 'giftsub': {
        obj.tier = randomOneOf('1000', '2000', '3000');
        obj.recepient = getDummyRecepient();
        obj.senderCount = Math.max(0, Math.floor(Math.random() * 500) - 200);
        const systemMsgAffix = obj.senderCount > 1 ? ` They have given ${obj.senderCount} Gift Subs in the channel!` : '';
        obj.systemMsg = `${obj.displayName} gifted a Tier ${obj.tier.charAt(0)} sub to ${obj.recepient.displayName}!` + systemMsgAffix;
        obj.months = Math.floor(Math.random() * 12);
        return obj;
      }
      case 'massgiftsub': {
        obj.tier = randomOneOf('1000', '2000', '3000');
        obj.massCount = randomOneOf(5, 5, 5, 10, 10, 100);
        obj.senderCount = Math.max(0, Math.floor(Math.random() * 500) - 200) + obj.massCount;
        const community = channel ? channel : 'Unknown'
        obj.systemMsg = `${obj.displayName} is gifting ${obj.massCount} Tier ${obj.tier.charAt(0)} to ${community}'s community! They've gifted a total of ${obj.senderCount} in the channel!`;
        obj.recepients = [];
        for (let i = 0; i < obj.massCount; i++) {
          obj.recepients.push(getDummyRecepient());
        }
        return obj;
      }
      case 'bits': {
        obj.bits = randomOneOf(1, 100, 1000, 10000);
        obj.msg = `Dummy message ${getRandomAffix()} cheer${obj.bits}`;
        return obj;
      }
      case 'any': {
        return this.getDummyNotification(randomOneOf('sub', 'resub', 'giftsub', 'massgiftsub', 'bits'));
      }
    }
    // Should never reach this
    throw new Error('Unknown event ' + eventName);
  }

  /**
   * Emit a dummy notification event (tags will not be included)
   * @param {string} eventName The event name (sub, resub, giftsub, massgiftsub, bits, any)
   * @param {string} channel The channel name
   */
  sendDummyNotification(eventName, channel) {
    if (eventName === 'any') eventName = randomOneOf('sub', 'resub', 'giftsub', 'massgiftsub', 'bits');
    const obj = this.getDummyNotification(eventName, channel);
    this.emitNotification(eventName, channel, obj);
  }

}

function randomOneOf(...items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getDummyRecepient() {
  const recipientAffix = getRandomAffix();
  return {
    login: 'dummytarget' + recipientAffix,
    displayName: 'DummyTaget' + recipientAffix
  };
}

function getRandomAffix() {
  let affix = '';
  for (let i = 0; i < 5; i++) {
    let num = Math.floor(Math.random() * 10);
    affix += num;
  }
  return affix;
}

module.exports = NotificationsWrapper;