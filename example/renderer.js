import {DatabaseObjectRegistry, DatabaseStore, Model, Attributes, QuerySubscription} from 'electron-coresqlite';

class Bla extends Model {
  static attributes = {
    name: Attributes.String({
      modelKey: 'name',
      jsonKey: 'name',
      queryable: true,
    }),
  };
}

DatabaseObjectRegistry.register(Bla.constructor.name, () => Bla)

window.dbStore = new DatabaseStore({
  primary: true,
  databasePath: 'sqlite.db',
  databaseVersion: "1",
  logQueries: false,
  logQueryPlans: false,
});

const observable = window.dbStore.findAll(Bla).where({name: 'Foo'}).observe()
observable.subscribe((objects) => {
  console.log(objects);
});

window.dbStore.inTransaction((t) => {
  t.persistModel(new Bla({name: "Foo"}));
});
