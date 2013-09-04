
require('./helpers').allTransactions("Auto-rollback", function (tx, t) {
	/**
	 * For some reason tap plans aren't working correctly in my test helpers.
	 */
  t.plan(4)

  tx.log = console.log
	tx.removeAllListeners('error')
	tx.query('Not a valid sql statement')
	tx.on('error', function (err) {
		t.ok(err, 'emitted error')
	})
	tx.on('rollback:start', function () {
		t.ok(1, 'emitted rollback:start')
    tx.on('rollback:complete', function () {
      t.ok(1, 'emitted rollback:complete')
      t.ok(!tx._connection, 'connection is removed on rollback:complete')
    })
	})
})

