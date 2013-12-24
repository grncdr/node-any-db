var tape = require('tape')

var test = module.exports = tape.bind(null)

test.withAdapter = function (description, callback) {
  test(description, function (t) {
    var config = require('../config')
    callback(config, t)
  })
}

test.withConnection = maybeOpts(function (description, opts, callback) {
  tape(description, function (t) {
    var config = require('../config')
    config.adapter.createConnection(config.url, function (err, conn) {
      if (err) throw err
      if (opts.autoEnd !== false) t.on('end', conn.end.bind(conn))
      callback(conn, t)
    })
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
