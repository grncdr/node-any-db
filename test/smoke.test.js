var testHelpers = require('./helpers')

testHelpers.allDrivers('Select 1', function (conn, t) {
	t.plan(2)
	conn.query('SELECT 1 AS ok', function (err, res) {
		t.assert(!err, "No error")
		t.deepEqual(res.rows, [{ok: 1}])
	})
})

testHelpers.allPools('Select 1 against pool', function (pool, t) {
	t.plan(2)
	pool.query('SELECT 1 AS ok', function (err, res) {
		t.assert(!err, 'No error')
		t.deepEqual(res.rows, [{ok: 1}])
	})
})
