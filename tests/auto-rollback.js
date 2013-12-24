var begin = require('../')

require('../test')("Auto-rollback", function (conn, t) {
  t.plan(5)

  var tx = begin(conn)
  tx.query('Not a valid sql statement')
  tx.on('error', function (err) {
    t.ok(err, 'emitted error')
  })
  tx.on('rollback:start', function () {
    t.equals('closed', tx.state());
    t.ok(1, 'emitted rollback:start')
  })
  tx.on('rollback:complete', function () {
    t.ok(1, 'emitted rollback:complete')
    if (tx._connection) {
      console.log(tx._connection)
    }
    t.ok(!tx._connection, 'connection is removed on rollback:complete')
  })
})
