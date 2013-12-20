
require('../test').withTransaction("Auto-rollback", function (tx, t) {
  t.plan(5)

  tx.removeAllListeners('error')
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
    t.ok(!tx._connection, 'connection is removed on rollback:complete')
  })
})
