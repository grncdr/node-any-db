var arrayify = require('arrayify')
var map = require('./map')
var requireAll = require('require-all')

module.exports = function runTests () {
  var config = require('./config')
  requireAll({
    dirname: __dirname + '/tests',
    filter: config.filter ? RegExp(config.filter) : undefined
  })
}
