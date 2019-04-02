$(function() {
  onNotification(function(data) {
    console.log(data);
    $('body').append(data.systemMsg ? data.systemMsg : data.msg);
  });
  onSettings(function(data) {
    console.log(data);
  });
})