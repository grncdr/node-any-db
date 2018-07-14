var path = require('path')

var camelize = require('camelize')
var cc = require('config-chain')
var argv = require('optimist').argv
var parseDbUrl = require('parse-db-url')

var config = cc(camelize(argv), camelize(cc.env('any_db_test_')), { adapterPath: process.cwd() })

var adapterPath = path.resolve(config.get('adapterPath'))
config.set('adapterPath', adapterPath)
config.set('adapter', require(adapterPath))

var url = config.get('url')
if (!url) {
  config.set('url', {})
} else if (typeof url == 'string') {
  config.set('url', parseDbUrl(config.get('url')))
}

module.exports = config.store
