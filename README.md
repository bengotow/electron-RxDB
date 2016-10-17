### RxDB

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


## How does this fit in to Flux / Redux / etc?

RxDB is not intended to be a replacement for [Redux](https://github.com/reactjs/redux)
or other application state frameworks, and works great alongside them!

Redux is ideal for storing small bits of state, like the user's current selection.
In a typical RxDB application, this application state determines the views that
are displayed and the queries that are declaratively bound to those views. Individual
components build queries and display the resulting data.

## Basic Usage

### Defining a Model:

```
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

```
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

```
database
  .findAll(Note)
  .where({name: 'Untitled'})
  .order(Note.attributes.createdAt.descending())
  .then((notes) => {
  // got some notes!
})
```

### Observing a query:

```
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
