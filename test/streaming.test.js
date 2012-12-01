require('./helpers').allTransactions("Streaming results", function (tx, t) {
	tx.query("CREATE TABLE streaming_test (a int)")

	var vals = []
	var placeholder = tx.driver == 'postgres' ? '$1' : '?'
	var insert = 'INSERT INTO streaming_test (a) VALUES (' + placeholder + ')'
	for (var i = 0; i < 10; i++) {
		tx.query(insert, [i])
		vals.push(i)
	}

	tx.query('SELECT a FROM streaming_test')
		.on('row', function (row) { t.equal(row.a, vals.shift()) })
		.on('end', function () {
			t.deepEqual(vals, [])
			tx.query('DROP TABLE streaming_test', t.end.bind(t))
		})
})
