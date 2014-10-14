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
  var pool = opts.pool
  URLS.forEach(function (url) {
    var backend = url.split(':').shift()

    tape(backend + ' - ' + description, function (t) {
      if (backend == 'sqlite3') {
        try {
          fs.unlinkSync('/tmp/any_db_test.db');
        } catch (err) {
          console.error(err);
          // ignore it
        }
      }

      var queryable, cleanup;
      if (pool) {
        queryable = anyDB.createPool(url, pool)
        cleanup = queryable.close.bind(queryable)
      } else {
        queryable = anyDB.createConnection(url)
        cleanup = queryable.end.bind(queryable)
      }

      callback(queryable, t)
      t.on('end', cleanup)
    })
  })
}
