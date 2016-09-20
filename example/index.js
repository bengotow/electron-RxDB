const {app, ipcMain, BrowserWindow} = require('electron');

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// adds database support
ipcMain.on('relay', (event, msg) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (event.sender !== win.webContents) {
      win.webContents.send('relay', msg);
    }
  });
});


// prevent window being garbage collected
let mainWindow;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
  });

  win.loadURL(`file://${__dirname}/index.html`);
  win.on('closed', () => {
    // dereference the window
    // for multiple windows store them in an array
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
