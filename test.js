var tape = require('tape')

module.exports = function test (description, opts, callback) {
  if (!callback) {
    callback = opts
    opts = {}
  }
  tape(description, function (t) {
    var config = require('./config')
    config.adapter.createConnection(config.url, function (err, conn) {
      if (err) throw err
      if (opts.autoEnd !== false) t.on('end', conn.end.bind(conn))
      callback(conn, t)
    })
  })
}
