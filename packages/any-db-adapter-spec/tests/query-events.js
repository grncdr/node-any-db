require('../test')("Query events", function (conn, t) {
  conn.query("DROP TABLE IF EXISTS streaming_test")
  conn.query("CREATE TABLE streaming_test (a int)")

  // prepare our data
  var expected = []
  for (var i = 0; i < 10; i++) {
    conn.query('INSERT INTO streaming_test (a) VALUES (' + i + ')')
    expected.push({a: i})
  }

  t.test('events with a callback', function (t) {
    var fields, gotEnd;
    t.plan(4)
    conn.query('SELECT a FROM streaming_test', function (err, result) {
      t.deepEqual(result.fields, fields, "got same fields in result")
      t.deepEqual(result.rows, expected, "got expected rows")
    }).on('fields', function (_fields) {
      t.pass('got "fields" event')
      fields = _fields
    }).on('end', function () {
      t.pass('got "end" event')
    })
  })

  t.test('events with no callback (stream)', function (t) {
    var received = []
    var fields;
    t.plan(2)
    conn.query('SELECT a FROM streaming_test')
      .on('fields', function (_fields) {
        fields = _fields
      })
      .on('data', function (row) {
        received.push(row)
      })
      .on('end', function () {
        t.ok(fields, "got fields event")
        t.deepEqual(expected, received)
      })
  })

  t.test('cleanup', function(t){
    conn.query("DROP TABLE streaming_test", function(){
      t.end()
    })
  })
})
