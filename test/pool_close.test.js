// https://github.com/grncdr/node-any-db-pool/issues/3

var allPools = require('./helpers').allPools

allPools('pool close callback', {keepOpen: true}, function (pool, t) {
	t.plan(1)

	pool.query('SELECT 1', function (err) { if (err) throw err })
	pool.close(function (err) {
		if (err) throw err
		t.ok(1, 'Pool close callback was called')
	})
})
