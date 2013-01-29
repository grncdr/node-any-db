
require('./helpers').allDrivers("Rollback transaction", {autoEnd: false}, function (conn, t) {
	t.plan(2)

	t.on('end', function dropTable () {
		conn.query('DROP TABLE transaction_test', function (err) {
			conn.end()
			if (err) t.emit('error', err)
		})
	})

	conn.query("DROP TABLE transaction_test", function (err) {})
	conn.query("CREATE TABLE transaction_test (a int)")
	var tx = conn.begin()

	tx.query('INSERT INTO transaction_test (a) VALUES (1)')
	tx.query('SELECT * FROM transaction_test', function (err, res) {
		if (err) throw err
		t.deepEqual(res.rows, [{a: 1}])
		tx.rollback(function (err) {
			if (err) throw err
			conn.query('SELECT * FROM transaction_test', function (err, res) {
				if (err) throw err
				t.deepEqual(res.rows, [])
			})
		})
	})
})
