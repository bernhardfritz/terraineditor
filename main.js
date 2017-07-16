const { app, BrowserWindow } = require('electron');

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
