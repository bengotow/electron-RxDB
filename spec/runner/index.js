import {app, BrowserWindow} from 'electron';
import Coordinator from '../../lib/browser/coordinator';

global.databaseCoordinator = new Coordinator();

function createMainWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
  });

  win.loadURL(`file://${__dirname}/index.html`);
  win.once('ready-to-show', () => {
    win.show();
  })
}

app.on('ready', () => {
  createMainWindow();
});
