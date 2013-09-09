#!/usr/bin/env node

var fs     = require('fs')
var path   = require('path')

var joinPath = function (parts) {
  return parts.join(path.sep)
}

var localPath = function () {
  var parts = [].slice.call(arguments)
  parts.unshift(__dirname);
  return joinPath(parts);
}


symlinkLocalDeps('any-db')
symlinkLocalDeps('test');

[ 'any-db-mysql',
  'any-db-postgres',
  'any-db-sqlite3' ].forEach(symlinkLocalDeps);

function symlinkLocalDeps (packageName, depNames) {
  if (typeof depNames == 'number') depNames = false;
  var jsonPath = localPath(packageName, 'package.json');
  console.log(jsonPath)
  var pkg = JSON.parse(fs.readFileSync(jsonPath))
    , modulePath = localPath(packageName, 'node_modules')
    ;
  mkdirp(modulePath);
  if (!depNames) {
    depNames = Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.peerDependencies || {}))
      .concat(Object.keys(pkg.devDependencies || {}))
  }
  depNames.forEach(function (dep) {
    var localDepPath = localPath(dep)
    var dest = path.join(modulePath, dep);
    if (fs.existsSync(localDepPath) && !fs.existsSync(dest)) {
      console.log("ln -s " + localDepPath + " " + dest);
      fs.symlinkSync(localDepPath, dest)
    }
  })
}

function mkdirp (pathname) {
  console.log('mkdir -p ' + pathname)
  var parts = pathname.split(path.sep)
    , toMake = []
    ;

  while (!fs.existsSync(joinPath(parts))) {
    toMake.unshift(parts.pop())
  }

  while (toMake.length) {
    parts.push(toMake.shift())
    fs.mkdirSync(joinPath(parts))
  }
}
