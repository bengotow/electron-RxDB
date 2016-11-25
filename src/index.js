/* eslint global-require:0 */

if (process.type === 'renderer') {
  module.exports = {
    RxDatabase: require('./rx-database').default,
    Model: require('./model').default,
    ModelRegistry: require('./model-registry').default,

    // Just making the public API more consistent with Attributes in case there
    // are other types of search indexes in the future.
    Attributes: require('./attributes'),
    SearchIndexes: require('./search-indexes'),
  };
} else if (process.type === 'browser') {
  module.exports = () => {
    const Coordinator = require('./browser/coordinator').default;

    global._rxdb = {
      coordinator: new Coordinator(),
    };
  };
}
