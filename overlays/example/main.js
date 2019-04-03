(function() {

  getSettings(function(settings) {
    console.log(settings);
    overlayReady();
  });

  onNotification(function(data) {
    console.log(data);
    document.body.innerHTML += `<p>${data.systemMsg ? data.systemMsg : data.msg}</p>`;
    setTimeout(function() {
      console.log('Ready next!');
      data.requestNext();
    }, 5000);
  });

})();
