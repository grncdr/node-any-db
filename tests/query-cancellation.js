var test = require('tape')
var ConnectionPool = require('../')
var mockAdapter = require('any-db-fake')

test('ConnectionPool.prototype.cancel', function (t) {
  var pool = ConnectionPool(mockAdapter(), "")
  var query = pool.query("SELECT 1 FROM some_table", callback)

  // cancel the query synchronously
  pool.cancel(query)

  function callback(err, result) {
    t.ok(err, "Expected CancelledQueryError, but no error received")
    t.equal(''+err, "CancelledQueryError: Query was cancelled before connection was acquired")
    t.end()
  }
})
