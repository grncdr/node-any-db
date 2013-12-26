var begin = require('../')

require('../test')("Transaction::query errors with callbacks", function (conn, t) {
  t.plan(4)

  var tx = begin(conn)

  tx.query('Not a valid sql statement', function (err, res) {
    t.ok(err, 'invalid query -> error')
    t.ok(!res, "invalid query -> no results")
  })

  tx.on('rollback:complete', function () {
    t.ok(1, 'ROLLBACK issued')
  })

  tx.query('SELECT 1 AS never_executed', function (err, res) {
    t.ok(err, 'following valid query -> error')
  })

})
