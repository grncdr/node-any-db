var begin = require('../')

require('../test')("No auto-rollback (nested)", function (conn, t) {
  conn.query("DROP TABLE IF EXISTS transaction_test")
  conn.query("CREATE TABLE transaction_test (a int)")

  t.plan(3);

  // Disable auto rollback
  var tx = begin(conn, {autoRollback: false})
  var sp = begin(tx);

  // Column 'b' does not exist, statement must fail
  sp.query('INSERT INTO transaction_test (b) VALUES(1)', function(err) {
    t.notEqual(null, err);

    tx.query('INSERT INTO transaction_test (a) VALUES (1)', function(err) {
      t.ok(!err, 'further queries succeed')
      tx.commit(function (err) {
        t.ok(!err, 'commit succeeds')
      });
    });
  });
});
