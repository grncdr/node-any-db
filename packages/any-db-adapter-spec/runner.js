var path = require('path')

var arrayify = require('arrayify')
var requireAll = require('require-all')

var map = require('./map')

module.exports = function runTests() {
  var config = require('./config')
  requireAll({
    dirname: __dirname + '/tests',
    filter: config.filter ? RegExp(config.filter) : undefined,
  })
}
