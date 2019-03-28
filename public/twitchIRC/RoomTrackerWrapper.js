const EventEmitter = require('events');
// This keeps track of what channels/rooms that the Twitch IRC client is in
// Also keeps track of room states. Like slow mode, sub mode, follower mode etc.

// Events:
// name - parameters - description

// join - channel - When a channel is joined
// part - channel - When a channel is left
// state - channel, state - When a channel room state has changed
// change - channel - When any changes has been made to any room (join, left, room state)

class RoomTrackerWrapper extends EventEmitter {
  /**
   * @param {IRCClient} ircClient The Twitch IRC client
   */
  constructor(ircClient) {
    super();
    this.rooms = [];
    this.ircClient = ircClient;
    ircClient.addListener('join', (channel) => {
      const index = this._getRoomObjIndex(channel);
      if (index === -1) {
        const roomObj = {
          channel: channel,
          state: null
        };
        this.rooms.push(roomObj);
        this.emit('join', channel);
        this.emit('change', channel);
      }
    });
    ircClient.addListener('part', (channel) => {
      const index = this._getRoomObjIndex(channel);
      if (index !== -1) {
        this.rooms.splice(index, 1);
        this.emit('part', channel);
        this.emit('change', channel);
      }
    });
    ircClient.addListener('roomstate', (channel, tags) => {
      const roomObj = this._getRoomObj(channel);
      if (roomObj !== null) {
        roomObj.state = tags;
        this.emit('state', channel, tags);
        this.emit('change', channel);
      }
    });
  }

  /**
   * @param {string} channel The Twitch channel name
   * @returns {boolean} If in channel chat room or not
   */
  isInChannel(channel) {
    return this._getRoomObjIndex(channel) !== -1;
  }

  /**
   * Get the room state tags
   * @param {string} channel The Twitch channel name
   * @returns The room state tags, or null if not in channel or not gotten the state yet
   */
  getChannelState(channel) {
    const roomObj = this._getRoomObj(channel);
    return roomObj !== null ? roomObj.state : null;
  }

  /**
   * @returns {array} An array of room objects with channel and state variables
   * Notice: The internal state reference will not be coppied, so changes can be made to that
   */
  getChannels() {
    // Basically copy the rooms array
    return this.rooms.slice();
  }

  /**
   * @param {string} channel The Twitch channel name
   * @returns The internal room object, null if not found
   */
  _getRoomObj(channel) {
    const index = this._getRoomObjIndex(channel);
    return index === -1 ? null : this.rooms[index];
  }

  /**
   * @param {string} channel The Twitch channel name
   * @returns {number} The internal room index, -1 if not found
   */
  _getRoomObjIndex(channel) {
    if (channel.startsWith('#')) channel = channel.substring(1);
    for (let i = 0; i < this.rooms.length; i++) {
      if (this.rooms[i].channel === channel) return i;
    }
    return -1;
  }
}

module.exports = RoomTrackerWrapper;