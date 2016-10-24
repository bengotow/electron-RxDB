import {BrowserWindow, ipcMain} from 'electron';
import fs from 'fs';

/**
To use RxDB, you need to attach the coordinator in your Electron browser process.
It handles message dispatch across windows and manages the state of database
files when they need to be created before use. Just import it and instantiate one:

```js
import {Coordinator} from 'electron-rxdb';
global._coordinator = new Coordinator();
```
*/
export default class Coordinator {
  constructor() {
    this._phase = 'setup';

    ipcMain.on('database-trigger', (event, ...args) => {
      const sender = BrowserWindow.fromWebContents(event.sender);
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win !== sender) {
          win.webContents.send('database-trigger', ...args);
        }
      });
    });
  }

  phase() {
    return this._phase;
  }

  setPhase(phase) {
    this._phase = phase;
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('database-phase-change');
    });
  }

  recoverFromFatalDatabaseError(databasePath) {
    setTimeout(() => {
      if (this._databasePhase === 'close') {
        return;
      }
      this.setDatabasePhase('close');
      BrowserWindow.getAllWindows().forEach((win) => {
        win.hide();
      });
      this._deleteDatabase(databasePath, () => {
        this.setDatabasePhase('setup');
        BrowserWindow.getAllWindows().forEach((win) => {
          win.reload();
          win.once('ready-to-show', () => {
            win.show();
          });
        });
      });
    }, 0);
  }

  deleteDatabase(databasePath, callback) {
    this.deleteFileWithRetry(`${databasePath}-wal`);
    this.deleteFileWithRetry(`${databasePath}-shm`);
    this.deleteFileWithRetry(databasePath, callback);
  }

  // On Windows, removing a file can fail if a process still has it open. When
  // we close windows and log out, we need to wait for these processes to completely
  // exit and then delete the file. It's hard to tell when this happens, so we just
  // retry the deletion a few times.
  deleteFileWithRetry(filePath, callback = () => {}, retries = 5) {
    const callbackWithRetry = (err) => {
      if (err && (err.message.indexOf('no such file') === -1)) {
        console.log(`File Error: ${err.message} - retrying in 150msec`);
        setTimeout(() => {
          this.deleteFileWithRetry(filePath, callback, retries - 1);
        }, 150);
      } else {
        callback(null);
      }
    }

    if (!fs.existsSync(filePath)) {
      callback(null);
      return
    }

    if (retries > 0) {
      fs.unlink(filePath, callbackWithRetry);
    } else {
      fs.unlink(filePath, callback);
    }
  }
}
