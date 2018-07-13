var test = require('tape')
var ConnectionPool = require('../')
var mockAdapter = require('any-db-fake')

test('adapter.reset hook', function (t) {
  t.plan(1)

  var pool = ConnectionPool(mockAdapter({
    reset: function (conn, done) {
      t.pass("adapter.reset was called")
      done()
    }
  }))

  pool.query('select 1')
  pool.close()
})

test('adapter.reset hook errors', function (t) {
  t.plan(2)

  var pool = ConnectionPool(mockAdapter({
    reset: function (conn, done) {
      t.pass("adapter.reset was called")
      done(new Error("ruh-roh!"))
    }
  }))

  var destroy = pool.destroy

  pool.destroy = function (connection) {
    t.pass('connection was destroyed')
    destroy.call(this, connection)
  }

  pool.query('select 1')
})
