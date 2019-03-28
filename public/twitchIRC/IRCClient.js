const net = require('net');
const EventEmitter = require('events');

// This is a simple IRC Client that handles Twitch chat connections

const TwitchURL = 'irc.chat.twitch.tv';
const TwitchPort = 6667;

// The messages required for a successfull connection
// See https://dev.twitch.tv/docs/irc/guide/#connecting-to-twitch-irc
const requiredSuccessConnect = [
  'Welcome, GLHF!',
  'You are in a maze of twisty passages',
  '>'
];

// Events:
// name - [parameters] - description

// error - error - When an error has happened
// parseerror - line, error - When a parse error happens
// ready - When successfully connected and authorized
// raw - raw, parsed - A raw IRC event
// rawSend - message - When a raw message is sent out
// join - channel - When you have joined a channel
// part - channel - When you have left a channel
// otherjoin - channel, login - When a user joined a channel
// otherpart - channel, login - When a user left a channel
// msg - channel, login, message, tags - When a message was submitted to a channel
// roomstate - channel, tags - When a channel changes its roomstate (like submode, slowmode)
// usernotice - channel, login, message, tags - When a usernotice has happened (like a sub, resub, giftsub)
// notice - channel, message, tags - When a channel notice happens (example: slow mode off)
// clearchat - channel - Happens when a chat is cleared by a moderator
// userban - channel, login, tags - User was permanently or temporarily banned (tags has ban-duration if not permanent)
// clearmsg - channel, tags - Happens when a single message was removed
// globaluserstate - tags - Happens on successful login, tags contain information about user
// userstate - channel, tags - Happens when you join a channel, tags contain information about user
// host - channel, target[, viewers] - Happens when a channel hosts a target channel. Viewers is a number is started hosting, undefined if already hosting. If taget is '-', it means it stopped hosting

/**
 * Notes:
 * Normal subs (usernotice): 
 *   tags['msg-id'] = 'sub' or 'resub'
 *   tags['msg-param-sub-plan'] = 'Prime', '1000', '2000', '3000'
 *   tags['msg-param-cumulative-months'] = String number of months subscribed
 * Gift subs (usernotice):
 *   tags['msg-id'] = 'subgift' or 'anonsubgift'
 *   tags['msg-param-sub-plan'] = 'Prime', '1000', '2000', '3000'
 *   tags['msg-param-sender-count'] = String count of gifters total gifts
 *   tags['msg-param-recipient-user-name'] = login of recipient
 *   tags['msg-param-recipient-display-name'] = display name of recipient
 *   tags['msg-param-cumulative-months'] = String number of months recipient subscribed
 * Mass gift subs (usernotice):
 *   Will first send a:
 *   tags['msg-id'] = 'submysterygift'
 *   tags['msg-param-sub-plan'] = 'Prime', '1000', '2000', '3000'
 *   tags['msg-param-mass-gift-count'] = String number of subs that's being gifted
 *   tags['msg-param-sender-count'] = String count of gifters total gifts (was 0 when admiralbahroo gave 100 subs to himself?)
 *   Then all the subs will be sent as gift subs (see above)
 * Bits (msg):
 *   tags['bits'] = https://dev.twitch.tv/docs/irc/tags#privmsg-twitch-tags
 */

// TODO: Handle Twitch RECONNECT command
// https://dev.twitch.tv/docs/irc/commands/#reconnect-twitch-commands

class IRCClient extends EventEmitter {
  /**
   * @param {object} options The client options.
   * Possible options are:
   * login = null - The login nick (leave null for anonymous).
   * token = null - The login token. Required if login is not null.
   * autoReconnect = true - Will auto reconnect shortly after connection is closed.
   * requestCAP = true - Should request Twitch capabilities.
   * autoConnect = true - Should try to connect with the construction.
   */
  constructor(options) {
    super();
    // Default options
    this.options = {
      login: null, // The login nick (leave null for anonymouse)
      token: null, // The login token. Required if login is not null
      autoReconnect: true,
      requestCAP: true,
      autoConnect: true
    };
    if (options) {
      for (const key in options) {
        if (this.options.hasOwnProperty(key)) {
          this.options[key] = options[key];
        }
      }
    }
    if (this.options.login === null) {
      let anoLogin = 'justinfan';
      for (let i = 0; i < 5; i++) {
        let num = Math.floor(Math.random() * 10);
        anoLogin += num;
      }
      this.options.login = anoLogin;
    }

    this.ready = false;
    this.sendQueue = []; // Used to store messages that needs to be sent when ready

    this.closeCalled = false;
    this.socket = null;

    this.dataBuffer = '';

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Starts a connection to Twitch IRC servers using the options given in constructor
   * Will reconnect if already connected
   * @param {function} callback Callback for when connection was successfully created (not ready to be used)
   */
  connect(callback = undefined) {
    // If already connecting/connected clear that
    if (this.socket !== null) {
      this.socket.end();
      this.socket.unref();
      this.socket = null;
    }
    this.readyList = [...requiredSuccessConnect]; // A list of required messages for successful login

    this.socket = net.createConnection(TwitchPort, TwitchURL, callback);
    // Handle errors
    this.socket.addListener('error', (err) => this.emit('error', err));
    // Handle data
    this.socket.addListener('data', (data) => {
      if (typeof (data) !== 'string') {
        data = data.toString();
      }
      // We split the data up into lines.
      // It's possible that the data we receive doesn't end with a new line, and we have to store that and wait for an ending
      data = this.dataBuffer + data;
      if (!data.endsWith('\n')) {
        const lastNl = data.lastIndexOf('\n');
        // console.log('Storing last part (' + lastNl + ',' + data.length + '):');
        if (lastNl === -1) {
          this.dataBuffer = data;
          return; // Don't process data
        } else {
          this.dataBuffer = data.substring(lastNl + 1);
          data = data.substring(0, lastNl);
        }
      } else {
        this.dataBuffer = '';
      }
      const lines = data.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (rawLine.length === 0) continue;
        // console.log(rawLine); // Debug printing
        if (rawLine.startsWith('PING')) {
          this.send('PONG :tmi.twitch.tv');
          continue;
        }
        try {
          const pl = parseTwitchMessage(rawLine);
          if (!this.ready) {
            if (pl.msg.includes(this.readyList[0])) {
              this.readyList.splice(0, 1);
              if (this.readyList.length === 0) {
                this.ready = true;
                while (this.sendQueue.length > 0) {
                  this.send(this.sendQueue[0]);
                  this.sendQueue.splice(0, 1);
                }
                this.emit('ready');
              }
            }
            // A notice means there was a problem with connecting or login
            if (pl.cmd === 'NOTICE') {
              this.emit('error', new Error(pl.msg));
              this.close();
            }
          } else {
            this.emit('raw', rawLine, pl);
            switch (pl.cmd) {
              case 'JOIN':
                const joinLogin = pl.url.substring(0, pl.url.indexOf('!'));
                if (joinLogin === this.options.login) {
                  this.emit('join', pl.channel);
                } else {
                  this.emit('otherjoin', pl.channel, joinLogin);
                }
                break;
              case 'PART':
                const partLogin = pl.url.substring(0, pl.url.indexOf('!'));
                if (partLogin === this.options.login) {
                  this.emit('part', pl.channel);
                } else {
                  this.emit('otherpart', pl.channel, partLogin);
                }
                break;
              case 'PRIVMSG':
                this.emit('msg', pl.channel, pl.url.substring(0, pl.url.indexOf('!')), pl.msg, pl.tags);
                break;
              case 'ROOMSTATE':
                this.emit('roomstate', pl.channel, pl.tags);
                break;
              case 'USERNOTICE':
                // console.log(rawLine);
                // console.log(pl);
                this.emit('usernotice', pl.channel, pl.tags.login, pl.msg, pl.tags)
                break;
              case 'NOTICE':
                this.emit('notice', pl.channel, pl.msg, pl.tags);
                break;
              case 'CLEARCHAT':
                if (pl.msg && pl.msg.length > 0) {
                  this.emit('clearchat', pl.channel);
                } else {
                  this.emit('userban', pl.channel, pl.msg, pl.tags);
                }
                break;
              case 'CLEARMSG':
                this.emit('clearmsg', pl.channel, pl.tags);
                break;
              case 'GLOBALUSERSTATE':
                this.emit('globaluserstate', pl.tags);
                break;
              case 'USERSTATE':
                this.emit('userstate', pl.channel, pl.tags);
                break;
              case 'HOSTTARGET':
                const msgSplit = pl.msg.split(' ');
                const target = msgSplit[0];
                let viewers = msgSplit.length > 1 ? Number(msgSplit[1]) : undefined;
                if (isNaN(viewers)) viewers = undefined;
                this.emit('host', pl.channel, target, viewers);
                break;
            }
          }
        } catch (err) {
          this.emit('parseerror', rawLine, err);
        }
      }
    });

    this.socket.once('ready', () => {
      // Login once the connection is ready
      if (this.options.requestCAP) {
        this.socket.write('CAP REQ twitch.tv/membership\r\n');
        this.socket.write('CAP REQ twitch.tv/tags\r\n');
        this.socket.write('CAP REQ twitch.tv/commands\r\n');
      }
      if (this.options.token) {
        if (this.options.token.startsWith('oauth:')) {
          this.socket.write('PASS ' + this.options.token + '\r\n');
        } else {
          this.socket.write('PASS oauth:' + this.options.token + '\r\n');
        }
      }
      this.socket.write('NICK ' + this.options.login + '\r\n');
    });

    this.socket.once('close', () => {
      this.ready = false;
      if (!this.closeCalled && this.options.autoReconnect) {
        // Try and reconnect after 5 seconds
        setTimeout(() => {
          this.connect();
        }, 5000);
      }
    });
  }

  /**
   * @returns {boolean} If connection is ready or not
   */
  isReady() {
    return this.ready;
  }

  /**
   * Same as once, but will remove the listener if the callback returns true
   * @param {string} eventName The name of the event
   * @param {function} callback Event callback
   * @param {number} timeout Timeout to remove listener
   */
  onceIf(eventName, callback, timeout = undefined) {
    const listener = (...args) => {
      if (callback(...args)) {
        removeListener();
      }
    };
    const removeListener = () => {
      this.removeListener(eventName, listener);
    };
    this.addListener(eventName, listener);
    if (typeof (timeout) == 'number') {
      setTimeout(removeListener, timeout);
    }
  }

  /**
   * Joins a channel, callback is optional and has no parameters
   * @param {string} channel The channel to join (without #)
   * @param {function} callback Channel joined callback. Times out after 5 seconds if still not joined
   */
  join(channel, callback = undefined) {
    if (!channel.startsWith('#')) channel = '#' + channel;
    this.send('JOIN ' + channel);
    if (typeof (callback) === 'function') {
      this.onceIf('join', (chn) => {
        if (chn === channel) {
          callback();
          return true;
        }
        return false;
      }, 5000);
    }
  }

  /**
   * Leaves a channel, callback is optional and has no parameters
   * @param {string} channel The channel to join (without #)
   * @param {function} callback Channel joined callback. Times out after 5 seconds if still not left
   */
  part(channel, callback) {
    if (!channel.startsWith('#')) channel = '#' + channel;
    this.send('PART ' + channel);
    if (typeof (callback) === 'function') {
      this.onceIf('part', (chn) => {
        if (chn === channel) {
          callback();
          return true;
        }
        return false;
      }, 5000);
    }
  }

  /**
   * Sends a chat message in a channel
   * @param {string} channel The channel to talk in (without #)
   * @param {string} msg The message to send
   */
  say(channel, msg) {
    if (!channel.startsWith('#')) channel = '#' + channel;
    this.send('PRIVMSG ' + channel + ' :' + msg);
  }

  /**
   * Sends data to Twitch. Use @function Say() to send chat messages
   * @param {string} data The data to send
   */
  send(data) {
    if (data.length > 500) {
      this.emit('error', new Error('Cannot send more than 500 characters'));
      return;
    }
    if (!this.ready) {
      this.sendQueue.push(data);
    } else {
      this.socket.write(data + '\r\n', () => {
        this.emit('rawSend', data);
      });
    }
  }

  /**
   * Tries to close the connection.
   * @param {function} callback Callback when close happened
   */
  close(callback = undefined) {
    this.closeCalled = true;
    if (this.socket !== null) {
      this.socket.end();
      this.socket.once('close', callback);
    }
  }
}

// This is iterated through to parse each part of a Twitch message
// Each function is called and should return the remaining of the unparsed data
const parserActions = [
  // Look for tags first
  (data, obj) => {
    if (data.charAt(0) === ':') {
      return data.substring(1);
    }
    const endIndex = data.indexOf(' :');
    if (endIndex !== -1) {
      const tagsData = data.substring(0, endIndex);
      if (tagsData.length > 0 && tagsData.charAt(0) === '@') {
        const tagsSplit = tagsData.substring(1).split(';');
        const tags = {};
        for (let i = 0; i < tagsSplit.length; i++) {
          const tagSplit = tagsSplit[i].split('=');
          if (tagSplit.length > 1) {
            tags[tagSplit[0]] = tagSplit[1];
          } else {
            tags[tagSplit[0]] = null;
          }
        }
        obj.tags = tags;
      }
      return data.substring(endIndex + 1);
    } else {
      return data;
    }
  },
  // Look for the url kind of part
  (data, obj) => {
    if (data.charAt(0) === ':') data = data.substring(1);
    const endIndex = data.indexOf(" ");
    if (endIndex !== -1) {
      const urlData = data.substring(0, endIndex);
      if (urlData.length > 0) {
        obj.url = urlData;
      }
      return data.substring(endIndex + 1);
    } else {
      return data;
    }
  },
  // Look for the command
  (data, obj) => {
    const endIndex = data.indexOf(" ");
    const cmdData = endIndex == -1 ? data : data.substring(0, endIndex);
    const out = endIndex == -1 ? null : data.substring(endIndex + 1);
    if (cmdData.length > 0) {
      obj.cmd = cmdData;
    }
    return out;
  },
  // Extra and channel
  (data, obj) => {
    const endIndex = data.indexOf(" :");
    const extraData = endIndex === -1 ? data : data.substring(0, endIndex);
    const out = endIndex === -1 ? null : data.substring(endIndex + 1);
    if (extraData.length > 0) {
      const extraSplit = extraData.split(' ');
      // Look for channel
      for (let i = 0; i < extraSplit.length; i++) {
        if (extraSplit[i].length > 0 && extraSplit[i].charAt(0) === '#') {
          obj.channel = extraSplit[i].substring(1);
        }
      }
      obj.extra = extraData.trim();
    }
    return out;
  },
  // Look for the msg
  (data, obj) => {
    if (data.charAt(0) === ':') data = data.substring(1);
    obj.msg = data.trim();
    return null;
  }
];

/**
 * Tries to parse a Twitch message line
 * @param {string} msg The Twitch raw line
 */
function parseTwitchMessage(msg) {
  const out = {};

  for (let i = 0; i < parserActions.length; i++) {
    const parser = parserActions[i];
    msg = parser(msg, out);
    if (msg === null || msg.length === 0) break;
  }
  if (msg !== null && msg.length > 0) {
    console.log('Could not parse part of message:');
    console.log(msg);
  }
  return out;
}

module.exports = IRCClient;