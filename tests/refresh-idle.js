var test = require('tape')
var ConnectionPool = require('../')
var mockAdapter = require('any-db-fake')

test('options.refreshIdle', function (t) {
  t.plan(2)

  var adapter = mockAdapter({
    connection: {
      end: function () {
        t.pass('Connection.end was called')
      }
    }
  })
  var pool = new ConnectionPool(adapter, {}, {
    min: 1,
    max: 2,
    refreshIdle: true,
    // these are extremely short intervals, it's not recommended to use a
    // reapInterval or idleTimeout of less than a second in practice.
    reapInterval: 5,
    idleTimeout: 10
  })

  setTimeout(function () {
    pool.close()
  }, 15)
})
