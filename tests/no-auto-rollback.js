var begin = require('../')

require('../test')("No auto-rollback", function (conn, t) {
  conn.query("DROP TABLE IF EXISTS transaction_test")
  conn.query("CREATE TABLE transaction_test (a int)")

  t.plan(3);

  // Disable auto rollback
  var tx = begin(conn, {autoRollback: false})

  tx.query('Not a valid sql statement', function(err) {
    t.notEqual(null, err);

    tx.query('INSERT INTO transaction_test (a) VALUES (1)', function(err) {
      if (conn.adapter.name === 'postgres') {
        t.equal(err.code, '25P02', 'further queries ignored')
      } else {
        t.ok(!err, 'further queries succeed')
      }
      tx.commit(function (err) {
        t.ok(!err, 'commit succeeds')
      });
    });
  });
});
