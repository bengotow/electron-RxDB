/* eslint global-require: 0 */
import Sqlite3 from 'better-sqlite3';
import PromiseQueue from 'promise-queue';
import {remote, ipcRenderer} from 'electron';
import LRU from 'lru-cache';
import {EventEmitter} from 'events';

import Query from './query';
import {logSQLString} from './console-utils';
import DatabaseChangeRecord from './database-change-record';
import DatabaseChangeRecordDebouncer from './database-change-record-debouncer';
import QuerySubscriptionPool from './query-subscription-pool';
import DatabaseTransaction from './database-transaction';
import DatabaseSetupQueryBuilder from './database-setup-query-builder';
import JSONBlob from './json-blob';

const coordinator = remote.getGlobal('databaseCoordinator');

const DatabasePhase = {
  Setup: 'setup',
  Ready: 'ready',
  Close: 'close',
}

class IncorrectVersionError extends Error {
  constructor({actual, expected}) {
    super(`Incorrect database schema version: ${actual} not ${expected}`);
  }
}
/**
N1 is built on top of a custom database layer modeled after
ActiveRecord. For many parts of the application, the database is the source
of truth. Data is retrieved from the API, written to the database, and changes
to the database trigger Stores and components to refresh their contents.

The DatabaseStore is available in every application window and allows you to
make queries against the local cache. Every change to the local cache is
broadcast as a change event, and listening to the DatabaseStore keeps the
rest of the application in sync.

## Listening for Changes

To listen for changes to the local cache, subscribe to the DatabaseStore and
inspect the changes that are sent to your listener method.

```js
this.unsubscribe = db.listen(this._onDataChanged, this)

...

_onDataChanged(change) {
    if (change.objectClass !== Message) {
        return;
    }
    if (!change.objects.map((m) => m.id).includes(this._myMessageID)) {
        return;
    }
    // Refresh Data
}

```

The local cache changes very frequently, and your stores and components should
carefully choose when to refresh their data. The \`change\` object passed to your
event handler allows you to decide whether to refresh your data and exposes
the following keys:

 - `objectClass`: The {Model} class that has been changed. If multiple types of models
    were saved to the database, you will receive multiple change events.

 - `objects`: An {Array} of {Model} instances that were either created, updated or
    deleted from the local cache. If your component or store presents a single object
    or a small collection of objects, you should look to see if any of the objects
    are in your displayed set before refreshing.

Section: Database
*/

export default class DatabaseStore extends EventEmitter {

  static ChangeRecord = DatabaseChangeRecord;
  static IncorrectVersionError = IncorrectVersionError;

  constructor({primary, databasePath, databaseVersion, logQueries, logQueryPlans} = {}) {
    super();

    this.setMaxListeners(100);

    if (!databasePath) {
      throw new Error("DatabaseStore: You must provide a SQLite file path.");
    }
    if (!databaseVersion || (typeof databaseVersion !== 'string')) {
      throw new Error("DatabaseStore: You must provide a database schema version number.");
    }

    this._options = {primary, databasePath, databaseVersion, logQueries, logQueryPlans};

    this._queryBuilder = new DatabaseSetupQueryBuilder();
    this._transactionQueue = new PromiseQueue(1, Infinity);
    this._subscriptionPool = new QuerySubscriptionPool(this);
    this._preparedStatementCache = LRU({max: 500});
    this._inflightTransactions = 0;
    this._open = false;
    this._waiting = [];
    this._mutationHooks = [];
    this._debouncer = new DatabaseChangeRecordDebouncer({
      onTrigger: (record) => this.trigger(record),
      maxTriggerDelay: 10,
    })

    // Listen to events from the application telling us when the database is ready,
    // should be closed so it can be deleted, etc.
    ipcRenderer.on('database-phase-change', this._onPhaseChange);
    setTimeout(() => this._onPhaseChange(), 0);

    // Listen for trigger events originating in other windows
    ipcRenderer.on('database-trigger', this._onIPCTrigger);
  }

  disconnect() {
    ipcRenderer.removeListener('database-phase-change', this._onPhaseChange);
    ipcRenderer.removeListener('database-trigger', this._onIPCTrigger);
  }

  _onIPCTrigger = ({json, path}) => {
    if (path === this._options.databasePath) {
      this.emit('trigger', new DatabaseChangeRecord(json));
    }
  }

  _onPhaseChange = () => {
    const phase = coordinator.phase();

    if (phase === DatabasePhase.Setup && this._options.primary) {
      this._openDatabase(() => {
        this._checkDatabaseVersion({allowUnset: true}, () => {
          this._runDatabaseSetup(() => {
            coordinator.setPhase(DatabasePhase.Ready);
            setTimeout(() => this._runDatabaseAnalyze(), 60 * 1000);
          });
        });
      });
    } else if (phase === DatabasePhase.Ready) {
      this._openDatabase(() => {
        this._checkDatabaseVersion({}, () => {
          this._open = true;
          for (const w of this._waiting) {
            w();
          }
          this._waiting = [];
        });
      });
    } else if (phase === DatabasePhase.Close) {
      this._open = false;
      if (this._db) {
        this._db.close();
        this._db = null;
      }
    }
  }

  // When 3rd party components register new models, we need to refresh the
  // database schema to prepare those tables. This method may be called
  // extremely frequently as new models are added when packages load.
  refreshDatabaseSchema() {
    if (!this._options.primary) {
      return;
    }
    const phase = coordinator.phase();
    if (phase !== DatabasePhase.Setup) {
      coordinator.setPhase(DatabasePhase.Setup);
    }
  }

  _openDatabase(ready) {
    if (this._db) {
      ready();
      return;
    }

    this._db = new Sqlite3(this._options.databasePath, {});

    this._db.on('close', (err) => {
      this._handleSetupError(err);
    })

    this._db.on('open', () => {
      // Note: These are properties of the connection, so they must be set regardless
      // of whether the database setup queries are run.

      // https://www.sqlite.org/wal.html
      // WAL provides more concurrency as readers do not block writers and a writer
      // does not block readers. Reading and writing can proceed concurrently.
      this._db.pragma(`journal_mode = WAL`);

      // https://www.sqlite.org/intern-v-extern-blob.html
      // A database page size of 8192 or 16384 gives the best performance for large BLOB I/O.
      this._db.pragma(`main.page_size = 8192`);
      this._db.pragma(`main.cache_size = 20000`);
      this._db.pragma(`main.synchronous = NORMAL`);

      ready();
    });
  }

  _checkDatabaseVersion({allowUnset} = {}, ready) {
    const result = this._db.pragma('user_version', true);
    const isUnsetVersion = (result === '0');
    const isWrongVersion = (result !== this._options.databaseVersion);
    if (isWrongVersion && !(isUnsetVersion && allowUnset)) {
      return this._handleSetupError(new IncorrectVersionError({
        actual: result,
        expected: this._options.databaseVersion,
      }));
    }
    return ready();
  }

  _runDatabaseSetup(ready) {
    try {
      for (const query of this._queryBuilder.setupQueries()) {
        if (this._options.logQueries) {
          console.log(`DatabaseStore: ${query}`);
        }
        this._db.prepare(query).run();
      }
    } catch (err) {
      return this._handleSetupError(err);
    }

    this._db.pragma(`user_version=${this._options.databaseVersion}`);

    this.emit('did-setup-database', {sqlite: this._db});

    return ready();
  }

  _runDatabaseAnalyze() {
    const queries = this._queryBuilder.analyzeQueries();
    const step = () => {
      const query = queries.shift();
      if (query) {
        if (this._options.logQueries) {
          console.log(`DatabaseStore: ${query}`);
        }
        this._db.prepare(query).run();
        setTimeout(step, 100);
      } else {
        console.log(`Completed ANALYZE of database`);
      }
    }
    step();
  }

  _handleSetupError(error = (new Error(`Manually called _handleSetupError`))) {
    this.emit('will-rebuild-database', {sqlite: this._db, error: error});
    coordinator.rebuildDatabase();
  }

  // Returns a Promise that resolves when the query has been completed and
  // rejects when the query has failed.
  //
  // If a query is made before the database has been opened, the query will be
  // held in a queue and run / resolved when the database is ready.
  _query(query, values = []) {
    return new Promise((resolve, reject) => {
      if (!this._open) {
        this._waiting.push(() => this._query(query, values).then(resolve, reject));
        return;
      }

      // Undefined, True, and False are not valid SQLite datatypes:
      // https://www.sqlite.org/datatype3.html
      values.forEach((val, idx) => {
        if (val === false) {
          values[idx] = 0;
        } else if (val === true) {
          values[idx] = 1;
        } else if (val === undefined) {
          values[idx] = null;
        }
      });

      if (query.startsWith(`SELECT `) && this._options.logQueryPlans) {
        const plan = this._db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(values);
        const planString = `${plan.map(row => row.detail).join('\n')} for ${query}`;
        if (planString.includes('ThreadCounts')) {
          return;
        }
        if (planString.includes('ThreadSearch')) {
          return;
        }
        if (planString.includes('SCAN') && !planString.includes('COVERING INDEX')) {
          logSQLString(planString);
        }
      }

      if (query.startsWith(`BEGIN`)) {
        if (this._inflightTransactions !== 0) {
          throw new Error("Assertion Failure: BEGIN called when an existing transaction is in-flight. Use inTransaction() to aquire transactions.")
        }
        this._inflightTransactions += 1;
      }

      const fn = query.startsWith('SELECT') ? 'all' : 'run';
      let tries = 0;
      let results = null;

      // Because other processes may be writing to the database and modifying the
      // schema (running ANALYZE, etc.), we may `prepare` a statement and then be
      // unable to execute it. Handle this case silently unless it's persistent.
      while (!results) {
        try {
          let stmt = this._preparedStatementCache.get(query);
          if (!stmt) {
            stmt = this._db.prepare(query);
            this._preparedStatementCache.set(query, stmt)
          }
          results = stmt[fn](values);
        } catch (err) {
          if (tries < 3 && err.toString().includes('database schema has changed')) {
            this._preparedStatementCache.del(query);
            tries += 1;
          } else {
            // note: this function may throw a promise, which causes our Promise to reject
            throw new Error(`DatabaseStore: Query ${query}, ${JSON.stringify(values)} failed ${err.toString()}`);
          }
        }
      }

      if (query === 'COMMIT') {
        this._inflightTransactions -= 1;
        if (this._inflightTransactions < 0) {
          this._inflightTransactions = 0;
          throw new Error("Assertion Failure: COMMIT was called too many times and the transaction count went negative.")
        }
      }

      resolve(results);
    });
  }

  // PUBLIC METHODS #############################

  // ActiveRecord-style Querying

  /**
  Creates a new Model Query for retrieving a single model specified by
  the class and id.

  @param {Model} class - The class of the {Model} you're trying to retrieve.
  @param {String} id - The id of the {Model} you're trying to retrieve

  Example:
  ```coffee
  db.find(Thread, 'id-123').then (thread) ->
    // thread is a Thread object, or null if no match was found.
  ```

  @returns {Query}
  */
  find(klass, id) {
    if (!klass) {
      throw new Error(`DatabaseStore::find - You must provide a class`);
    }
    if (typeof id !== 'string') {
      throw new Error(`DatabaseStore::find - You must provide a string id. You may have intended to use findBy.`);
    }
    return new Query(klass, this).where({id}).one();
  }

  /**
  Creates a new Model Query for retrieving a single model matching the
  predicates provided.

  @param {Model} class - The class of the {Model} you're trying to retrieve.
  @param {Array} predicates - An {Array} of {matcher} objects. The set of predicates the
    returned model must match.

  @returns {Query}
  */
  findBy(klass, predicates = []) {
    if (!klass) {
      throw new Error(`DatabaseStore::findBy - You must provide a class`);
    }
    return new Query(klass, this).where(predicates).one();
  }

  /**
  Creates a new Model Query for retrieving all models matching the
  predicates provided.

  @param {Model} class - The class of the {Model} you're trying to retrieve.
  @param {Array} predicates - An {Array} of {matcher} objects. The set of predicates the
     returned model must match.

  @returns {Query}
  */
  findAll(klass, predicates = []) {
    if (!klass) {
      throw new Error(`DatabaseStore::findAll - You must provide a class`);
    }
    return new Query(klass, this).where(predicates);
  }

  /**
  Public: Creates a new Model Query that returns the {Number} of models matching
  the predicates provided.

  @param {Model} class - The class of the {Model} you're trying to retrieve.
  @param {Array} predicates - An {Array} of {matcher} objects. The set of predicates the
     returned model must match.

  @returns {Query}
  */
  count(klass, predicates = []) {
    if (!klass) {
      throw new Error(`DatabaseStore::count - You must provide a class`);
    }
    return new Query(klass, this).where(predicates).count();
  }

  /**
  Public: Modelify converts the provided array of IDs or models (or a mix of
  IDs and models) into an array of models of the \`klass\` provided by querying for the missing items.

  Modelify is efficient and uses a single database query. It resolves Immediately
  if no query is necessary.

  @param {Model} class - The model class desired
  @param {Array} arr - An {Array} with a mix of string model IDs and/or models.

  @returns {Promise} - A promise that resolves with the models.
  */
  modelify(klass, arr) {
    if (!(arr instanceof Array) || (arr.length === 0)) {
      return Promise.resolve([]);
    }

    const ids = []
    for (const item of arr) {
      if (item instanceof klass) {
        ids.push(item.id);
      } else if (typeof item === 'string') {
        ids.push(item);
      } else {
        throw new Error(`modelify: Not sure how to convert ${item} into a ${klass.name}`);
      }
    }
    if ((ids.length === 0) && (ids.length === 0)) {
      return Promise.resolve(arr);
    }

    return this.findAll(klass).where(klass.attributes.id.in(ids)).then((modelsFromIds) => {
      const modelsByString = {};
      for (const model of modelsFromIds) {
        modelsByString[model.id] = model;
      }
      return Promise.resolve(arr.map(item =>
        (item instanceof klass ? item : modelsByString[item]))
      );
    });
  }

  /**
  Executes a {Query} on the local database.

  @param {Query} modelQuery - The query to execute.

  @returns {Promise} - A promise that resolves with the result of the database query.
  */
  run(modelQuery, options = {format: true}) {
    return this._query(modelQuery.sql(), []).then((result) => {
      let transformed = modelQuery.inflateResult(result);
      if (options.format !== false) {
        transformed = modelQuery.formatResult(transformed)
      }
      return Promise.resolve(transformed);
    });
  }

  findJSONBlob(id) {
    return new JSONBlob.Query(JSONBlob, this).where({id}).one();
  }

  // Private: Mutation hooks allow you to observe changes to the database and
  // add additional functionality before and after the REPLACE / INSERT queries.
  //
  // beforeDatabaseChange: Run queries, etc. and return a promise. The DatabaseStore
  // will proceed with changes once your promise has finished. You cannot call
  // persistModel or unpersistModel from this hook.
  //
  // afterDatabaseChange: Run queries, etc. after the REPLACE / INSERT queries
  //
  // Warning: this is very low level. If you just want to watch for changes, You
  // should subscribe to the DatabaseStore's trigger events.
  //
  addMutationHook({beforeDatabaseChange, afterDatabaseChange}) {
    if (!beforeDatabaseChange) {
      throw new Error(`DatabaseStore:addMutationHook - You must provide a beforeDatabaseChange function`);
    }
    if (!afterDatabaseChange) {
      throw new Error(`DatabaseStore:addMutationHook - You must provide a afterDatabaseChange function`);
    }
    this._mutationHooks.push({beforeDatabaseChange, afterDatabaseChange});
  }

  removeMutationHook(hook) {
    this._mutationHooks = this._mutationHooks.filter(h => h !== hook);
  }

  mutationHooks() {
    return this._mutationHooks;
  }


  /**
  Opens a new database transaction for writing changes.
  inTransacion makes the following guarantees:

  - No other calls to \`inTransaction\` will run until the promise has finished.

  - No other process will be able to write to sqlite while the provided function
    is running. `BEGIN IMMEDIATE TRANSACTION` semantics are:
      + No other connection will be able to write any changes.
      + Other connections can read from the database, but they will not see
        pending changes.

  @param {Function} fn - A callback that will be executed inside a database
    transaction

  @returns {Promise} - A promise that resolves when the transaction has
    successfully completed.
  **/
  inTransaction(fn) {
    return this._transactionQueue.add(() =>
      new DatabaseTransaction(this).execute(fn)
    );
  }

  transactionDidCommitChanges(changeRecords) {
    for (const record of changeRecords) {
      this._debouncer.accumulate(record);
    }
  }

  // Search Index Operations

  createSearchIndex(klass) {
    const sql = this._queryBuilder.createSearchIndexSql(klass);
    return this._query(sql);
  }

  searchIndexSize(klass) {
    const searchTableName = `${klass.name}Search`;
    const sql = `SELECT COUNT(content_id) as count FROM \`${searchTableName}\``;
    return this._query(sql).then((result) => result[0].count);
  }

  isIndexEmptyForAccount(accountId, modelKlass) {
    const modelTable = modelKlass.name
    const searchTable = `${modelTable}Search`
    const sql = (
      `SELECT \`${searchTable}\`.\`content_id\` FROM \`${searchTable}\` INNER JOIN \`${modelTable}\`
      ON \`${modelTable}\`.id = \`${searchTable}\`.\`content_id\` WHERE \`${modelTable}\`.\`account_id\` = ?
      LIMIT 1`
    );
    return this._query(sql, [accountId]).then(result => result.length === 0);
  }

  dropSearchIndex(klass) {
    if (!klass) {
      throw new Error(`DatabaseStore::createSearchIndex - You must provide a class`);
    }
    const searchTableName = `${klass.name}Search`
    const sql = `DROP TABLE IF EXISTS \`${searchTableName}\``
    return this._query(sql);
  }

  isModelIndexed(model, isIndexed) {
    if (isIndexed === true) {
      return Promise.resolve(true);
    }
    const searchTableName = `${model.constructor.name}Search`
    const exists = (
      `SELECT rowid FROM \`${searchTableName}\` WHERE \`${searchTableName}\`.\`content_id\` = ?`
    )
    return this._query(exists, [model.id]).then((results) =>
      Promise.resolve(results.length > 0)
    )
  }

  indexModel(model, indexData, isModelIndexed) {
    const searchTableName = `${model.constructor.name}Search`;
    return this.isModelIndexed(model, isModelIndexed).then((isIndexed) => {
      if (isIndexed) {
        return this.updateModelIndex(model, indexData, isIndexed);
      }

      const indexFields = Object.keys(indexData)
      const keysSql = `content_id, ${indexFields.join(`, `)}`
      const valsSql = `?, ${indexFields.map(() => '?').join(', ')}`
      const values = [model.id].concat(indexFields.map(k => indexData[k]))
      const sql = (
        `INSERT INTO \`${searchTableName}\`(${keysSql}) VALUES (${valsSql})`
      )
      return this._query(sql, values);
    });
  }

  updateModelIndex(model, indexData, isModelIndexed) {
    const searchTableName = `${model.constructor.name}Search`;
    this.isModelIndexed(model, isModelIndexed).then((isIndexed) => {
      if (!isIndexed) {
        return this.indexModel(model, indexData, isIndexed);
      }

      const indexFields = Object.keys(indexData);
      const values = indexFields.map(key => indexData[key]).concat([model.id]);
      const setSql = (
        indexFields
        .map((key) => `\`${key}\` = ?`)
        .join(', ')
      );
      const sql = (
        `UPDATE \`${searchTableName}\` SET ${setSql} WHERE \`${searchTableName}\`.\`content_id\` = ?`
      );
      return this._query(sql, values);
    });
  }

  unindexModel(model) {
    const searchTableName = `${model.constructor.name}Search`;
    const sql = (
      `DELETE FROM \`${searchTableName}\` WHERE \`${searchTableName}\`.\`content_id\` = ?`
    );
    return this._query(sql, [model.id]);
  }

  unindexModelsForAccount(accountId, modelKlass) {
    const modelTable = modelKlass.name;
    const searchTableName = `${modelTable}Search`;
    const sql = (
      `DELETE FROM \`${searchTableName}\` WHERE \`${searchTableName}\`.\`content_id\` IN
      (SELECT \`id\` FROM \`${modelTable}\` WHERE \`${modelTable}\`.\`account_id\` = ?)`
    );
    return this._query(sql, [accountId]);
  }

  // Compatibility with Reflux / Flux Stores

  listen(callback, bindContext = this) {
    if (!callback) {
      throw new Error("DatabaseStore.listen called with undefined callback");
    }
    let aborted = false
    const eventHandler = (...args) => {
      if (aborted) { return }
      callback.apply(bindContext, args);
    }
    this.addListener('trigger', eventHandler);
    return () => {
      aborted = true;
      this.removeListener('trigger', eventHandler);
    }
  }

  trigger(record) {
    ipcRenderer.send('database-trigger', {
      path: this._options.databasePath,
      json: record.toJSON(),
    });
    this.emit('trigger', record);
  }
}
