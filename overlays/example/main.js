(function() {
  var settings = null;
  requestSettings();

  onSettings(function(newSettings) {
    if (settings === null) {
      overlayReady();
    }
    settings = newSettings;
    setNotificationContent('Your notifications will appear here');
    console.log(settings);
  });

  onNotification(function(data) {
    console.log(data);
    var content = '';
    switch(data.event) {
      case 'sub': {
        var tier = data.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + data.tier.charAt(0);
        content = `${data.displayName} subbed with ${tier}!`;
        break;
      }
      case 'resub': {
        var tier = data.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + data.tier.charAt(0);
        content = `${data.displayName} resubbed with ${tier} x${data.months}!`;
        break;
      }
      case 'giftsub': {
        var tier = data.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + data.tier.charAt(0);
        content = `${data.displayName} gifted a ${tier} sub to ${data.recepient.displayName}!`;
        break;
      }
      case 'massgiftsub': {
        var tier = data.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + data.tier.charAt(0);
        content = `${data.displayName} gifted ${data.massCount} ${tier} subs!`;
        break;
      }
      case 'bits': {
        content = `${data.displayName} cheered ${data.bits} bits!`;
        break;
      }
      default: {
        content = `${data.displayName} ${data.event}`;
        break;
      }
    }
    setNotificationContent(content);
    setTimeout(function() {
      // Clear notifications
      setNotificationContent('');
      console.log('Ready next!');
      data.requestNext();
    }, 5000);
  });

  function setNotificationContent(content) {
    var style = `text-align:${settings.textAlign.toLowerCase()}; font-size:${settings.textSize}px; margin-top:${settings.textPosition}px;`;
    document.getElementById('notifications').innerHTML = `<div class="notification" style="${style}">${content}</div>`;
  }

})();
