require('./helpers').allDrivers("Nested transactions", function (conn, t) {
  conn.query("DROP TABLE transaction_test", function (err) {})
  conn.query("CREATE TABLE transaction_test (a int)")

  var parent = conn.begin()
  parent.query('INSERT INTO transaction_test (a) VALUES (1)')

  var child = parent.begin();
  child.query('INSERT INTO transaction_test (a) VALUES (2)')

  t.plan(2)

  // The point of this test is that the following query against the parent
  // transaction doesn't run until after the child transaction rolls back
  parent.query('SELECT * FROM transaction_test', function (err, res) {
    if (err) throw err;
    t.deepEqual(res.rows, [{a: 1}])
  });

  child.query('SELECT * FROM transaction_test', function (err, res) {
    if (err) throw err;
    t.deepEqual(res.rows, [{a: 1}, {a: 2}])
  });

  child.rollback()
})
