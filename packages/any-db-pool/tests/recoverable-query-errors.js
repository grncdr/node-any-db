var test = require('tape')
var ConnectionPool = require('../')
var mockAdapter = require('any-db-fake')

test('options.shouldDestroyConnection', function (t) {
  t.plan(1)

  var pool = new ConnectionPool(mockAdapter({
    connection: {
      query: function (query) {
        query.callback(new Error("the expected error"))
      }
    },
  }), {}, {
    shouldDestroyConnection: function (err) {
      return false
    }
  })

  pool.query('select 1', function (err, result) {
    t.equal(err.message, "the expected error")
  })

  pool.close()
})
