const app = require('electron').remote.app;
const Jasmine = require('jasmine');
const jasmineInstance = new Jasmine();

jasmineInstance.loadConfigFile('spec/support/jasmine.json');
jasmineInstance.onComplete(() => {
  app.quit();
});

// jasmine.configureDefaultReporter({
//     timer: new jasmine.Timer(),
//     print: (...args) => {
//       process.stdout.write(util.format.apply(this, args));
//     },
//     showColors: true,
//     jasmineCorePath: jasmineCorePath
// });

global.jasmine = jasmineInstance.jasmine;
global.jasmine.waitFor = (fn) => (
  new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      if (Date.now() - start > 1000) {
        return reject(new Error(`jasmine.waitFor timed out. ${fn}`));
      }
      return (fn() ? resolve() : process.nextTick(tick))
    }
    tick();
  })
)

jasmineInstance.execute();
