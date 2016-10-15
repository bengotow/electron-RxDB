var execSync = require('child_process').execSync;
var nodeGypPath = '"' + require('path').resolve(__dirname, 'node_modules', '.bin', 'node-gyp') + '"';
var targetElectronVersion = '1.4.3';
var targetArch = require('os').arch();
var targetPlatform = process.platform;

if (targetPlatform == "win32") {
  var targetArch = "ia32"
}

var cmd = "cd node_modules/better-sqlite3 && "+nodeGypPath+" configure rebuild --msvs_version=2013 --target="+targetElectronVersion+" --arch="+targetArch+" --target_platform="+targetPlatform+" --dist-url=https://atom.io/download/atom-shell";
console.log(cmd);
execSync(cmd);
