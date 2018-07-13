var test = require('tape')
var mockAdapter = require('any-db-fake')
var ConnectionPool = require('../')

test('Connection error forwarding', function (t) {
  // A stub adapter errors on connect
  var pool = ConnectionPool(mockAdapter({
    createConnection: function (_, callback) {
      process.nextTick(function () { callback(new Error("Blammo")) })
    }
  }))

  t.plan(2)
  t.on('end', pool.close.bind(pool))

  t.test('Connection errors in pool.query', function (t) {
    t.plan(6);

    pool.query('This is not valid SQL', function(err) {
      t.assert(err, "Error should be passed to callback when there are no params")
      t.equal('Blammo', err.message, "Got expected error")
    });

    pool.query('This is not valid SQL', [], function(err) {
      t.assert(err, "Error should be passed to callback when there are params")
      t.equal('Blammo', err.message, "Got expected error")
    });

    pool.query('Still invalid SQL').on('error', function (err) {
      t.assert(err, "Error should be emitted when there is no callback")
      t.equal('Blammo', err.message, "Got expected error")
    })

  });

  t.test('Connection errors in pool.acquire', function (t) {
    t.plan(2)
    pool.acquire(function (err, conn) {
      t.assert(err, "Error is forwarded to callback")
      t.equal('Blammo', err.message, "Got expected error")
    })
  })
})
