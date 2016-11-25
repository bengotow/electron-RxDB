import RxDatabase from '../../src/rx-database';
import Thread from './thread';
import Message from './message';
import TestModel from './test-model';
import Category from './category';

const Database = new RxDatabase({
  primary: true,
  databasePath: 'sqlite-test.db',
  databaseVersion: "1",
  logQueries: false,
  logQueryPlans: false,
});

Database._openDatabase = () =>

Database.models.register(Thread)
Database.models.register(Message)
Database.models.register(Category)
Database.models.register(TestModel)

module.exports = {
  Database,
  Thread,
  Message,
  Category,
  TestModel,
}
