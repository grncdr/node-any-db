
var test = require('tape')
var ConnectionPool = require('../')
var mockAdapter = require('any-db-fake')

test('adapter.reset hook', function (t) {
  t.plan(1)

  var pool = new ConnectionPool(mockAdapter({}))

  pool.acquire(function (err, conn) {
    pool.release(conn)

    setTimeout(function () {
      conn.emit('error', new Error('expected message'))
    }, 10)
  })

  pool.on('error', function (err) {
    t.equal(err.message, 'expected message')
    pool.close()
  })
})
