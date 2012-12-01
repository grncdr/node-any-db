
require('./helpers').allTransactions("Auto-rollback", function (tx, t) {
	t.plan(2)
	tx.removeAllListeners('error')
	tx.query('Not a valid sql statement')
	tx.on('rolled back', function () {
		t.ok(1, 'emitted rollback')
	})
	tx.on('error', function (err) {
		t.ok(1, 'emitted error')
	})
})

