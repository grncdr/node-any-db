var test = require('tape')
var ConnectionPool = require('../')
var mockAdapter = require('any-db-fake')

test('A sqlite3://:memory: pool can only have one connection', function (t) {
  t.plan(2)

  var warn = console.warn
  console.warn = t.pass.bind(t, "printed a warning")

  var connParams = {
    adapter: 'sqlite3',
    database: ':memory:',
  }

  ConnectionPool(mockAdapter(), connParams, {min: 3}).close()
  ConnectionPool(mockAdapter(), connParams, {max: 3}).close()

  console.warn = warn
})
