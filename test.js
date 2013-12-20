var tape = require('tape')

var test = module.exports = tape.bind(null)

test.withAdapter = function (description, callback) {
  tape(description, function (t) {
    var config = require('./config')
    callback(config, t)
  })
}

test.withConnection = maybeOpts(function (description, opts, callback) {
  tape(description, function (t) {
    var config = require('./config')
    config.adapter.createConnection(config.url, function (err, conn) {
      if (err) throw err
      if (opts.autoEnd !== false) t.on('end', conn.end.bind(conn))
      callback(conn, t)
    })
  })
})

test.withTransaction = maybeOpts(function (description, opts, callback) {
  tape(description, function (t) {
    var config = require('./config')
    config.adapter.createConnection(config.url, function (err, conn) {
      if (err) throw err
      var tx = conn.begin()
      t.on('end', function () {
        if (tx.state() != 'closed') {
          tx.rollback(conn.end.bind(conn))
        } else {
          conn.end()
        }
      })
      callback(tx, t)
    })
  })
})

test.withPool = maybeOpts(function (description, opts, callback) {
  tape(description, function (t) {
    var config = require('./config')
    var pool = new ConnectionPool(config.adapter, config.url, {
      max: 2,
      min: 0,
      idleTimeoutMillis: 1000
    })
    if (!opts.keepOpen) t.on('end', pool.close.bind(pool))
    callback(pool, t)
  })
})

function maybeOpts(f) {
  return function (description, opts, callback) {
    if (!callback) {
      callback = opts
      opts = {}
    }
    f(description, opts, callback)
  }
}
