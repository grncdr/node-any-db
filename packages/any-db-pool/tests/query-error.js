var test = require('tape')
var mockAdapter = require('any-db-fake')
var ConnectionPool = require('../')
var EventEmitter = require('events').EventEmitter

test('Unhandled query errors are emitted by pool', function (t) {
  var pool = ConnectionPool(mockAdapter({
    connection: {
      query: function (q) {
        process.nextTick(function () { q.emit('error', new Error('dang')) })
        return q
      }
    }
  }))

  t.plan(2)
  pool.query("whatever")
  pool.on('error', function (err) {
    t.pass("pool emitted 'error' event")
    t.equal(err.message, 'dang', "got expected error")
  })
  pool.close()
})
