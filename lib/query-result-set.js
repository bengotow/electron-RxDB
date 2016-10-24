import QueryRange from './query-range';

/**
Instances of QueryResultSet hold a set of models retrieved from the database
for a given query and offset.

Complete vs Incomplete:

QueryResultSet keeps an array of item ids and a lookup table of models.
The lookup table may be incomplete if the QuerySubscription isn't finished
preparing results. You can use `isComplete` to determine whether the set
has every model.

Offset vs Index:

To avoid confusion, "index" (used within the implementation) refers to an item's
position in an array, and "offset" refers to it's position in the query
result set. For example, an item might be at index 20 in the _ids array, but
at offset 120 in the result.
*/
export default class QueryResultSet {

  static setByApplyingModels(set, models) {
    if (models instanceof Array) {
      throw new Error("setByApplyingModels: A hash of models is required.");
    }
    const out = set.clone();
    out._modelsHash = models;
    out._idToIndexHash = null;
    return out;
  }

  constructor(other = {}) {
    this._offset = (other._offset !== undefined) ? other._offset : null;
    this._query = (other._query !== undefined) ? other._query : null;
    this._idToIndexHash = (other._idToIndexHash !== undefined) ? other._idToIndexHash : null;
    // Clone, since the others may be frozen
    this._modelsHash = Object.assign({}, other._modelsHash || {})
    this._ids = [].concat(other._ids || []);
  }

  clone() {
    return new this.constructor({
      _ids: [].concat(this._ids),
      _modelsHash: Object.assign({}, this._modelsHash),
      _idToIndexHash: Object.assign({}, this._idToIndexHash),
      _query: this._query,
      _offset: this._offset,
    });
  }

  /**
  @returns {Boolean} - True if every model in the result set is available, false
    if part of the set is still being loaded. (Usually following range changes.)
  */
  isComplete() {
    return this._ids.every((id) => this._modelsHash[id]);
  }

  /**
  @returns {QueryRange} - The represented range.
  */
  range() {
    return new QueryRange({offset: this._offset, limit: this._ids.length});
  }

  /**
  @returns {Query} - The represented query.
  */
  query() {
    return this._query;
  }

  /**
  @returns {QueryRange} - The number of items in the represented range. Note
  that a range (`LIMIT 10 OFFSET 0`) may return fewer than the maximum number
  of items if none match the query.
  */
  count() {
    return this._ids.length;
  }

  /**
  @returns {Boolean} - True if the result set is empty, false otherwise.
  */
  empty() {
    return this.count() === 0;
  }

  /**
  @returns {Array} - the model IDs in the represented result.
  */
  ids() {
    return this._ids;
  }

  /**
  @param {Number} offset - The desired offset.
  @returns {Array} - the model ID available at the requested offset, or undefined.
  */
  idAtOffset(offset) {
    return this._ids[offset - this._offset];
  }

  /**
  @returns {Array} - An array of model objects. If the result is not yet complete,
  this array may contain `undefined` values.
  */
  models() {
    return this._ids.map((id) => this._modelsHash[id]);
  }

  /**
  @protected
  */
  modelCacheCount() {
    return Object.keys(this._modelsHash).length;
  }

  /**
  @param {Number} offset - The desired offset.
  @returns {Model} - the model at the requested offset.
  */
  modelAtOffset(offset) {
    if (!Number.isInteger(offset)) {
      throw new Error("QueryResultSet.modelAtOffset() takes a numeric index. Maybe you meant modelWithId()?");
    }
    return this._modelsHash[this._ids[offset - this._offset]];
  }

  /**
  @param {String} id - The desired ID.
  @returns {Model} - the model with the requested ID, or undefined.
  */
  modelWithId(id) {
    return this._modelsHash[id];
  }

  _buildIdToIndexHash() {
    this._idToIndexHash = {}
    this._ids.forEach((id, idx) => {
      this._idToIndexHash[id] = idx;
      const model = this._modelsHash[id];
      if (model) {
        this._idToIndexHash[model.id] = idx;
      }
    });
  }

  /**
  @param {String} id - The desired ID.
  @returns {Number} - the offset of `ID`, relative to all of the query results.
  */
  offsetOfId(id) {
    if (this._idToIndexHash === null) {
      this._buildIdToIndexHash();
    }

    if (this._idToIndexHash[id] === undefined) {
      return -1;
    }
    return this._idToIndexHash[id] + this._offset
  }
}
