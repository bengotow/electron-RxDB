/* eslint global-require:0*/
if (process.type === 'renderer') {
  module.exports = {
    Attributes: require('./lib/attributes'),
    Model: require('./lib/model').default,
    DatabaseObjectRegistry: require('./lib/database-object-registry').default,
    DatabaseStore: require('./lib/database-store').default,
  };
} else if (process.type === 'browser') {
  module.exports = {
    Coordinator: require('./lib/browser/coordinator').default,
  };
}
