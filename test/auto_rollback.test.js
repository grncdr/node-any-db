
require('./helpers').allTransactions("Auto-rollback", function (tx, t) {
	t.plan(2)

	/**
	 * For some reason tap plans aren't working correctly in my test helpers, so I
	 * manage the counting manually for this test.
	 */
	var expected = 2

	tx.removeAllListeners('error')
	tx.query('Not a valid sql statement')
	tx.on('error', function (err) {
		t.ok(expected--, 'emitted error')
	})
	tx.on('rolled back', function () {
		t.ok(expected--, 'emitted rollback')
	})
})

