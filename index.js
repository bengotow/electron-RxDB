/* eslint global-require:0*/
if (process.type === 'renderer') {
  module.exports = {
    Attributes: require('./lib/attributes'),
    Model: require('./lib/model').default,
    ModelRegistry: require('./lib/model-registry').default,
    RxDatabase: require('./lib/rx-database').default,
  };
} else if (process.type === 'browser') {
  module.exports = () => {
    const Coordinator = require('./lib/browser/coordinator').default;

    global._rxdb = {
      coordinator: new Coordinator(),
    };
  };
}
