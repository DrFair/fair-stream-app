onNotification(function(data) {
  console.log(data);
  document.body.innerHTML += `<p>${data.systemMsg ? data.systemMsg : data.msg}</p>`;
});
onSettings(function(data) {
  console.log(data);
});