
var test = require('tape')
var ConnectionPool = require('../')
var mockAdapter = require('any-db-fake')

test('ConnectionPool onConnect/reset hooks', function (t) {
  // Create a pool with 2 connections maximum.
  // each connection will be initialized once and reset twice
  t.plan(2)
  var pool = new ConnectionPool(mockAdapter(), "", {
    onConnect: function (conn, ready) {
      ready(new Error('expected message'))
    }
  })

  pool.acquire(function (err, connection) {
    t.equal(err.message, "expected message")
    t.ok(!connection, "No connection")
    pool.close()
  })

})
