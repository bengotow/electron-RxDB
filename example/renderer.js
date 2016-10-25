import {RxDatabase} from 'electron-rxdb';
import Container from './src/components/container';
import ReactDOM from 'react-dom';
import React from 'react';

window.Database = new RxDatabase({
  primary: true,
  databasePath: 'sqlite.db',
  databaseVersion: "1",
  logQueries: false,
  logQueryPlans: false,
});

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('container');
  ReactDOM.render(<Container />, container);
});
