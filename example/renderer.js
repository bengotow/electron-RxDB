import {RxDatabase} from 'electron-rxdb';
import {remote} from 'electron';
import path from 'path';
import React from 'react';
import ReactDOM from 'react-dom';

import Note from './src/models/note';
import Container from './src/components/container';
import FolderImporter from './src/importers/folder';

const Database = new RxDatabase({
  primary: true,
  databasePath: path.join(remote.getGlobal('dataDirectory'), 'sqlite.db'),
  databaseVersion: "1",
  logQueries: false,
  logQueryPlans: false,
});

Database.on('will-rebuild-database', ({error}) => {
  remote.dialog.showErrorBox("A critical database error has occurred.", error.stack);
});

Database.models.register(Note);

// If there are no notes, add a few samples from the "initial notes" folder.
// Makes this demo a lot less boring...
Database.count(Note).limit(1).then((count) => {
  if (count === 0) {
    (new FolderImporter()).run(path.join(__dirname, 'initial-notes'));
  }
})

window.Database = Database;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('container');
  ReactDOM.render(React.createElement(Container), container);
});
