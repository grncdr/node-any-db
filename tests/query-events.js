var test = require('tape')
var mockAdapter = require('any-db-fake')

var ConnectionPool = require('../')

test("Pool query events", function (t) {
  var expected = 'SELECT 1';

  t.plan(1)

  var pool = new ConnectionPool(mockAdapter(), "")

  pool.on('query', function onQuery(query) {
    t.equal(query.text, expected, "emitted query")
  })

  pool.query(expected)

  pool.close()
})
