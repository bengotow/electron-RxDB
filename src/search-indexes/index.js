import SearchIndexFTS5 from './search-index-fts5'

module.exports = {
  FTS5: (...args) => new SearchIndexFTS5(...args),

  SearchIndexFTS5: SearchIndexFTS5,
};
