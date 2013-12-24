var begin = require('../')

require('../test')("Transaction::query errors with callbacks", function (conn, t) {
  t.plan(5)

  var tx = begin(conn)

  tx.query('SELECT 1', function (err, res) {
    t.ok(!err, 'valid query -> no error')
    t.ok(res, "valid query -> results")
  })

  tx.query('Not a valid sql statement', function (err, res) {
    t.ok(err, 'invalid query -> error')
    t.ok(!res, "invalid query -> no results")
  })

  tx.on('rollback:complete', function () {
    t.ok(1, 'ROLLBACK issued')
  })
})
