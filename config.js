var path = require('path')

var camelize = require('camelize')
var cc = require('config-chain')
var argv = require('optimist').argv

var config = cc(camelize(argv),
                camelize(cc.env('any_db_test_')),
                { adapterPath: process.cwd() })

var adapterPath = path.resolve(config.get('adapterPath'))
config.set('adapterPath', adapterPath)
config.set('adapter', require(adapterPath))

if (!config.get('url')) {
  switch (true) {
    case /mysql/.test(adapterPath):
      config.set('url', "mysql://root@localhost/any_db_test")
    break
    case /postgres/.test(adapterPath):
      config.set('url', "postgres://postgres@localhost/any_db_test")
    break
    case /sqlite3/.test(adapterPath):
      config.set('url', "sqlite3:///tmp/any-db-test.db")
    break
  }
}

module.exports = config.store
