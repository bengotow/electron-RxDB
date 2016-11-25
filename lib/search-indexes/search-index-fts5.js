const {Matcher} = require('../attributes');
const {singleQuoteEscapeSequence, doubleQuoteEscapeSequence} = require('../attributes/matcher');

const INDEXING_PAGE_SIZE = 1000;

class SearchMatcherFTS5 extends Matcher {
  constructor(index, searchQuery) {
    super(null, null, null);

    this.index = index;
    this.searchQuery = (
      searchQuery.trim()
      .replace(/^['"]/, "")
      .replace(/['"]$/, "")
      .replace(/'/g, singleQuoteEscapeSequence)
      .replace(/"/g, doubleQuoteEscapeSequence)
    )
  }

  attribute() {
    return null;
  }

  value() {
    return null
  }

  // The only way to truly check if a model matches this matcher is to run the query
  // again and check if the model is in the results. This is too expensive, so we
  // will always return true so models aren't excluded from the
  // SearchQuerySubscription result set
  evaluate() {
    return true;
  }

  joinSQL(klass) {
    const joinTableRef = this.joinTableRef()
    return `INNER JOIN \`${this.index.tableName()}\` AS \`${joinTableRef}\` ON \`${joinTableRef}\`.\`content_id\` = \`${klass.name}\`.\`id\``;
  }

  whereSQL() {
    return `\`${this.index.tableName()}\` MATCH '"${this.searchQuery}"*'`;
  }
}


export default class SearchIndexFTS5 {
  constructor({version, getDataForModel}) {
    this.config = {version, getDataForModel};
    this.unsubscribers = []
  }

  match(query) {
    return new SearchMatcherFTS5(this, query);
  }

  activate(database) {
    this.unsubscribers.push(
      database.listen(this._onDataChanged)
    );

    database._query(
      `SELECT COUNT(content_id) as count FROM \`${this.tableName()}\` LIMIT 1`
    ).then((result) => {
      if (result[0].count === 0) {
        this._populateIndex(database);
      }
    });
  }

  deactivate() {
    this.unsubscribers.forEach(unsub => unsub())
  }

  tableCreateQuery() {
    return (
      `CREATE VIRTUAL TABLE IF NOT EXISTS \`${this.tableName()}\`
       USING fts5(
        tokenize='porter unicode61',
        content_id UNINDEXED,
        content
      )`
    );
  }

  tableName() {
    return `${this.klass.name}_${this.name}_${this.config.version}`;
  }

  _populateIndex(database, offset = 0) {
    return database.findAll(this.klass)
    .limit(INDEXING_PAGE_SIZE)
    .offset(offset)
    .then((models) => {
      if (models.length === 0) {
        return;
      }

      const next = () => {
        const model = models.pop();
        if (model) {
          this._indexModel(database, model)
          setTimeout(next, 5);
        } else {
          this._populateIndex(database, offset + models.length);
        }
      }
      next();
    });
  }

  _onDataChanged = (change) => {
    if (change.objectClass !== this.klass.name) {
      return;
    }

    change.objects.forEach((model) => {
      if (change.type === 'persist') {
        this._indexModel(change._database, model)
      } else {
        this._unindexModel(change._database, model)
      }
    });
  }

  // Search Index Operations

  /**
  @protected
  */
  _searchIndexSize(database, klass) {
    const sql = `SELECT COUNT(content_id) as count FROM \`${this.tableName()}\``;
    return database._query(sql).then((result) => result[0].count);
  }

  /**
  @protected
  */
  _isModelIndexed(database, model) {
    const table = this.tableName();

    return database._query(
      `SELECT rowid FROM \`${table}\` WHERE \`${table}\`.\`content_id\` = ? LIMIT 1`,
      [model.id],
    ).then((results) =>
      Promise.resolve(results.length > 0)
    )
  }

  /**
  @protected
  */
  _indexModel(database, model) {
    const table = this.tableName();

    return this._isModelIndexed(database, model).then((isIndexed) => {
      if (isIndexed) {
        return database._query(
          `UPDATE \`${table}\` SET content = ? WHERE \`${table}\`.\`content_id\` = ?`,
          [this.config.getDataForModel(model), model.id]
        );
      }
      return database._query(
        `INSERT INTO \`${table}\` (\`content_id\`, \`content\`) VALUES (?, ?)`,
        [model.id, this.config.getDataForModel(model)]
      );
    });
  }

  /**
  @protected
  */
  _unindexModel(database, model) {
    return database._query(
      `DELETE FROM \`${this.tableName()}\` WHERE \`${this.tableName()}\`.\`content_id\` = ?`,
      [model.id]
    );
  }
}
