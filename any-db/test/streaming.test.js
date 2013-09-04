require('./helpers').allTransactions("Streaming results", function (tx, test) {
  test.plan(11)

  tx.query("DROP TABLE IF EXISTS streaming_test", function (err) { /* swallow errors */ })
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
		})
})
