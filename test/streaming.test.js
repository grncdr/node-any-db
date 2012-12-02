require('./helpers').allTransactions("Streaming results", function (tx, t) {
	tx.query("CREATE TABLE streaming_test (a int)")

	var vals = []
	for (var i = 0; i < 10; i++) {
		tx.query('INSERT INTO streaming_test (a) VALUES ($1)', [i])
		vals.push(i)
	}

	tx.query('SELECT a FROM streaming_test')
		.buffer(false)
		.on('row', function (row) { t.equal(row.a, vals.shift()) })
		.on('end', function (result) {
			t.deepEqual(vals, [])
			t.deepEqual(result.rows, [])
			t.equal(result.rowCount, 10)
			tx.query('DROP TABLE streaming_test', function (err) {
				if (err) t.emit('error', err)
				else t.end()
			})
		})
})
