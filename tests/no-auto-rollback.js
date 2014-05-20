var begin = require('../')

require('../test')("No auto-rollback", function (conn, t) {
  conn.query("DROP TABLE IF EXISTS transaction_test")
  conn.query("CREATE TABLE transaction_test (a int)")

  t.plan(2);

  // Disable auto rollback
  var tx = begin(conn, {autoRollback: false})

  tx.query('Not a valid sql statement', function(err, res) {
    t.notEqual(null, err);

    tx.query('INSERT INTO transaction_test (a) VALUES (1)', function(err, res) {
      t.equal(null, err);

      tx.commit();
    });
  });
})



