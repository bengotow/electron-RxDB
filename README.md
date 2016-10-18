# RxDB

![](https://travis-ci.org/bengotow/electron-RxDB.svg?branch=master) <a href="https://travis-ci.org/bengotow/electron-RxDB">

RxDB is a high-performance, observable object store built on top of SQLite.
RxDB draws inspiration from CoreData and Relay and is intended for
database-driven Electron applications. It was originally built for
the [Nylas N1](https://github.com/nylas/N1) mail client.

## An *Observable* Object Store

- RxDB queries are [Rx.JS Observables](https://github.com/Reactive-Extensions/RxJS).
Simply create queries and declaratively
bind them to your application's views. Queries internally subscribe to the
database, watch for changes, and vend new versions of their result sets as
necessary. They've been heavily optimized for performance, and often update
without making SQL queries.

- RxDB databases are event emitters. Want to keep things in sync with your data?
Add listeners to refresh application state as objects are saved and removed.

Example: Nylas N1 uses a Flux architecture. Many of the Flux Stores in the
application vend state derived from an RxDB database containing the user's
mail data. When an object is written to the database, it emits and event,
and stores (like the UnreadCountStore) can evaluate whether to update
downstream application state.


## Basic Usage

### Defining a Model:

```js
export default class Note extends Model {
  static attributes = Object.assign(Model.attributes, {
    name: Attributes.String({
      modelKey: 'name',
      jsonKey: 'name',
      queryable: true,
    }),
    content: Attributes.String({
      modelKey: 'content',
      jsonKey: 'content',
    }),
    createdAt: Attributes.DateTime({
      modelKey: 'createdAt',
      jsonKey: 'createdAt',
      queryable: true,
    }),
  });
}
```

### Saving a Model:

```js
const note = new Note({
  name: 'Untitled',
  content: 'Write your note here!',
  createdAt: new Date(),
});
database.inTransaction((t) => {
  return t.persistModel(note);
});
```

### Querying for Models:

```js
database
  .findAll(Note)
  .where({name: 'Untitled'})
  .order(Note.attributes.createdAt.descending())
  .then((notes) => {
  // got some notes!
})
```

### Observing a query:

```js
componentDidMount() {
  const query = database
    .findAll(Note)
    .where({name: 'Untitled'})
    .order(Note.attributes.createdAt.descending())

  this._unsubscribe = query.observe().subscribe((items) => {
    this.setState({items});
  });
}
```

## Features

- Models:
  + Definition via ES2016 classes extending `RxDB.Model`
  + Out of the box support for JSON serialization
  + Easy attribute definition and validation
  + Automatic schema generation based on `queryable` fields
  + Support for splitting object data across tables, keeping SQLite row size small

- Queries:
  + Results via a Promise API. (`query.then((results) => ...)``)
  + Live results via an Rx.JS Observable API. (`query.observable().subscribe((results) => ...)`)
  + Clean query syntax inspired by ActiveRecord and NSPredicate
  + Support for basic relationships and retrieving of joined objects
  + Full-text search powered by SQLite's FTS5

- Database:
  + ChangeRecord objects emitted for every modification of data
  + Changes bridged across window processes for multi-window apps
  + Support for opening multiple databases simultaneously

- High test coverage!

## FAQ
### How does this fit in to Flux / Redux / etc?

RxDB is not intended to be a replacement for [Redux](https://github.com/reactjs/redux)
or other application state frameworks, and works great alongside them!

Redux is ideal for storing small bits of state, like the user's current selection.
In a typical RxDB application, this application state determines the views that
are displayed and the queries that are declaratively bound to those views. Individual
components build queries and display the resulting data.

### Wait, I can't make `UPDATE` queries?

RxDB exposes an ActiveRecord-style query syntax, but only for fetching models.
RxDB's powerful observable queries, modification hooks, and other features
depend on application code being able to see every change to every object.

Queries like `UPDATE Note SET read = 1 WHERE ...` allow you to make
changes with unknown effects, and are explicitly not allowed.
(Every live query of a Note would need to be re-run following that change!)
Instead of expanding support for arbitrary queries, RxDB focuses on making
reading and saving objects *blazing fast*, so doing a query, modifying a few
hundred matches, and saving them back is perfectly fine.

## Contributing

#### Running the Notes Example

```bash
npm install
cd ./example
npm install
npm start
```

#### Running the Tests

RxDB's tests are written in [Jasmine 2](jasmine.github.io/2.5/introduction.html)
and run in a tiny Electron application for consistency with the target environment.
To run the tests, use `npm test`:

```bash
npm install
npm test
```

You can skip certain tests (temporarily) with `xit` and `xdescribe`,
or focus on only certain tests with `fit` and `fdescribe`.

#### Running the Linter

```
npm install
npm run lint
```
