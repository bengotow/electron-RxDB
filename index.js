/* eslint global-require:0 */

if (process.type === 'renderer') {
  module.exports = {
    RxDatabase: require('./lib/rx-database').default,
    Model: require('./lib/model').default,
    ModelRegistry: require('./lib/model-registry').default,

    // Just making the public API more consistent with Attributes in case there
    // are other types of search indexes in the future.
    Attributes: require('./lib/attributes'),
    SearchIndexes: require('./lib/search-indexes'),
  };
} else if (process.type === 'browser') {
  module.exports = () => {
    const Coordinator = require('./lib/browser/coordinator').default;

    global._rxdb = {
      coordinator: new Coordinator(),
    };
  };
}
