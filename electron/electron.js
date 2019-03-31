const electron = require('electron');
const { app } = electron;

const AppMain = require('./AppMain');

let main = new AppMain(app);

app.on('ready', () => {
  main.init();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (main.mainWindow === null) {
    main.createWindow();
  }
});
