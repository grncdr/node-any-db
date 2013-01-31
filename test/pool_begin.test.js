require('./helpers').allPools("ConnectionPool.begin", function (pool, t) {
	t.plan(1)
	pool.begin(function (err, tx) {
		t.notEqual(pool, tx._connection)
		tx.commit()
	})
})
