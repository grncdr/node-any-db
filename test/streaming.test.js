require('./helpers').allTransactions("Streaming results", function (tx, test) {
	tx.query("CREATE TABLE streaming_test (a int)")

	var placeHolder = tx.url.match(/postgres/) ? '($1)' : '(?)';
	var vals = []
	for (var i = 0; i < 10; i++) {
		tx.query('INSERT INTO streaming_test (a) VALUES ' + placeHolder, [i])
		vals.push(i)
	}

	var i = 0;
	tx.query('SELECT a FROM streaming_test')
		.on('row', function (row) { test.equal(row.a, vals.shift()) })
		.on('end', function (result) {
			test.deepEqual(vals, [])
			// test.ok(!result, "No result")
			tx.query('DROP TABLE streaming_test', function (err) {
				if (err) test.emit('error', err)
				else test.end()
			})
		})
})
