require('./helpers').allDrivers('Select 1', function (conn, t) {
	t.plan(2)
	conn.query('SELECT 1 AS ok', function (err, res) {
		t.assert(!err, "No error")
		t.deepEqual(res, [{ok: 1}], "Got expected result")
	})
})
