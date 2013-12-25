require('../test')("Streaming results", function (conn, test) {
  test.plan(11)

  conn.query("DROP TABLE IF EXISTS streaming_test", function (err) { /* swallow errors */ })
  conn.query("CREATE TABLE streaming_test (a int)")

  var placeHolder = conn.adapter.name == 'postgres' ? '($1)' : '(?)';
  var vals = []
  for (var i = 0; i < 10; i++) {
    conn.query('INSERT INTO streaming_test (a) VALUES ' + placeHolder, [i])
    vals.push(i)
  }

  var i = 0;
  conn.query('SELECT a FROM streaming_test')
    .on('data', function (row) {
      test.equal(row.a, vals.shift())
    })
    .on('end', function () {
      test.deepEqual(vals, [])
    })
})
