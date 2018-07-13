var test = require('tape')
var ConnectionPool = require('any-db/node_modules/any-db-pool')
var mockAdapter = require('any-db-fake')
var begin = require('../')

test('pool connection connection errors are forwarded', function (t) {
  var expectedError = new Error("ruh-roh!")
  var pool = new ConnectionPool(mockAdapter({
    createConnection: function (url, callback) {
      callback(expectedError)
    }
  }))
  t.plan(2)

  begin(pool, function (error) {
    t.equal(error, expectedError)
  })
  begin(pool).on('error', function (error) {
    t.equal(error, expectedError)
  })
})
