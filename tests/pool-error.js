var test = require('tap').test
var anyDB = require('any-db')

test('Connection errors in a pool are forwarded to query callbacks', function (t) {
  t.plan(2);

  // This user/database should *not* exist
  var pool = anyDB.createPool('mysql://bad_user@localhost/bad_db', {min: 0})

  pool.query('This is not valid SQL', function(err) {
    t.assert(err, "Error should be passed to callback when there are no params")
  });
  pool.query('This is not valid SQL', [], function(err) {
    t.assert(err, "Error should be passed to callback when there are params")
  });
  t.on('end', pool.close.bind(pool))
});
