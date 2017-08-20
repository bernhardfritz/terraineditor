const { app, BrowserWindow } = require('electron');

require('electron-reload')(__dirname);

let win;

app.on('ready', () => {
  win = new BrowserWindow({
    titleBarStyle: 'hidden-inset',
    show: false,
    backgroundColor: '#000000'
  });
  win.loadURL(`file://${__dirname}/index.html`);
  win.on('closed', () => {
    window = null;
  });
  win.once('ready-to-show', () => {
    win.show();
  });
});
