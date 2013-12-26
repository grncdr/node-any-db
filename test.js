var fs = require('fs')
var tape = require('tape')
var anyDB = require('any-db')

var URLS = [
  'mysql://root@localhost/any_db_test',
  'postgres://postgres@localhost/any_db_test',
  'sqlite3:///tmp/any_db_test.db',
]

module.exports = function test (description, opts, callback) {
  if (!callback) {
    callback = opts
    opts = {}
  }
  var urls = URLS.filter(function (url) {
    return true // TODO select database via env or command line?
  })
  tape(description, function (t) {
    t.plan(urls.length)
    var pool = opts.pool
    urls.forEach(function (url) {
      var backend = url.split(':').shift()
      if (backend == 'sqlite3') fs.unlink('/tmp/any_db_test.db', function () {})

      var queryable, cleanup;
      if (pool) {
        queryable = anyDB.createPool(url, pool)
        cleanup = queryable.close.bind(queryable)
      } else {
        queryable = anyDB.createConnection(url)
        cleanup = queryable.end.bind(queryable)
      }

      t.test(backend + ' - ' + description, function (t) {
        callback(queryable, t)
        t.on('end', cleanup)
      })
    })
  })
}
