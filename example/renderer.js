import {RxDatabase} from 'electron-rxdb';
import {remote} from 'electron';
import path from 'path';
import ReactDOM from 'react-dom';

import Note from './src/models/note';
import Container from './src/components/container';

window.Database = new RxDatabase({
  primary: true,
  databasePath: path.join(remote.getGlobal('dataDirectory'), 'sqlite.db'),
  databaseVersion: "1",
  logQueries: false,
  logQueryPlans: false,
});

window.Database.on('will-rebuild-database', ({error}) => {
  remote.dialog.showErrorBox("A critical database error has occurred.", error.toString());
});
window.Database.models.register(Note);

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('container');
  ReactDOM.render(<Container />, container);
});
