require('./helpers').allPools('Select 1 against pool', function (pool, t) {
	t.plan(2)
	pool.query('SELECT 1 AS ok', function (err, res) {
		t.assert(!err)
		t.deepEqual([{ok: 1}], res)
		t.end()
	})
})
