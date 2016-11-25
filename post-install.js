/* eslint-disable */
/*
Technically, this script shouldn't exist! If you're using electron-rxdb in an
Electron project set up with `electron-rebuild`, native node modules will be
automatically recompiled for Electron's version of V8.

However, if electron-rxdb is your only node module using native code, you might
not have that set up. SQLite3 is also notoriously difficult to build on Windows.
For me, it only works with VS2013.

This post-install script manually detects Electron in a package.json file in
a parent directory, and recompiles sqlite3, so you can get on to the fun stuff.
*/

var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');

function electronVersionFromPackageJSON(jsonPath) {
  var data = fs.readFileSync(jsonPath);
  var json = JSON.parse(data);
  var deps = Object.assign({}, json.dependencies, json.devDependencies);
  var version = deps['electron'] || deps['electron-prebuilt'] || deps['electron-prebuilt-compile'];
  if (version) {
    return version.replace('^', '').replace('x', '0');
  }
  return null;
}

// find out what version of Electron we should build against
var targetElectronVersion = null;
var dir = path.dirname(__dirname);

while (dir !== '/') {
  try {
    targetElectronVersion = electronVersionFromPackageJSON(path.join(dir, 'package.json'));
    if (targetElectronVersion) {
      break;
    }
  } catch (er) {

  } finally {
    dir = path.dirname(dir);
  }
}

if (targetElectronVersion === '*') {
  throw new Error("Electron version is specified as `*` in your package.json file.\nYou should lock it to at least a minor version, like ^1.4.0.")
}

if (!targetElectronVersion) {
  targetElectronVersion = electronVersionFromPackageJSON(path.join(__dirname, 'package.json'));
  console.warn("NOTE: Could not find `electron`, `electron-prebuilt` or `electron-prebuilt-compile`\nin a package.json file in the working path. Building SQLite3 for local\nElectron (v"+targetElectronVersion+") and `npm test`.");
}

// prepare other params

var nodeGypPath = '"' + require('path').resolve(__dirname, 'node_modules', '.bin', 'node-gyp') + '"';
var targetArch = require('os').arch();
var targetPlatform = process.platform;

if (targetPlatform == "win32") {
  var targetArch = "ia32"
}

var pathToSqlite = ['../better-sqlite3', './node_modules/better-sqlite3'].find((p) => fs.existsSync(p));
if (!pathToSqlite) {
  throw new Error("Couldn't find better-sqlite3");
}

var cmd = "cd " + pathToSqlite + " && "+nodeGypPath+" configure rebuild --msvs_version=2013 --target="+targetElectronVersion+" --arch="+targetArch+" --target_platform="+targetPlatform+" --dist-url=https://atom.io/download/electron";
console.log(cmd);
execSync(cmd);
