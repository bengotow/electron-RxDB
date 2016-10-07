const {app, BrowserWindow} = require('electron');

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

const {Coordinator} = require('electron-coresqlite');
global.databaseCoordinator = new Coordinator();

// prevent window being garbage collected
let mainWindow;

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
  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on('ready', () => {
  mainWindow = createMainWindow();
});
