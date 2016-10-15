import DatabaseStore from '../../lib/database-store';
import DatabaseObjectRegistry from '../../lib/database-object-registry';
import Thread from './thread';
import Message from './message';
import Category from './category';

const Database = new DatabaseStore({
  primary: true,
  databasePath: 'sqlite-test.db',
  databaseVersion: "1",
  logQueries: false,
  logQueryPlans: false,
});

Database._openDatabase = () =>

DatabaseObjectRegistry.register(Thread.constructor.name, () => Thread)
DatabaseObjectRegistry.register(Message.constructor.name, () => Message)
DatabaseObjectRegistry.register(Category.constructor.name, () => Category)

module.exports = {
  Database,
  Thread,
  Message,
  Category,
}
