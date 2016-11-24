const {app, BrowserWindow} = require('electron');
const fs = require('fs');
const path = require('path');

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// adds RxDB coordinator to the main process
require('electron-rxdb')();

// prevent windows from being garbage collected
let documentWindows = [];

function createMainWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
  });

  win.loadURL(`file://${__dirname}/renderer.html`);
  win.once('ready-to-show', () => {
    win.show();
  })
  win.once('closed', () => {
    documentWindows = documentWindows.filter(w => w === win)
  });

  return win;
}

function prepareFilesystem(callback) {
  global.dataDirectory = path.join(app.getPath('appData'), 'Notes');
  console.log(`Using SQLite database at path: ${global.dataDirectory}`)
  fs.mkdir(global.dataDirectory, callback);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
  prepareFilesystem(() => {
    documentWindows.push(createMainWindow());
  });
});
