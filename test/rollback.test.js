
require('./helpers').allDrivers("Rollback transaction", {autoEnd: false}, function (conn, t) {
	t.plan(2)

	conn.query("CREATE TABLE transaction_test (a int)", function (err) {
		if (err) {
			conn.end()
			throw err
		}

		t.on('end', function dropTable () {
			conn.query('DROP TABLE transaction_test', function (err) {
				conn.end()
				if (err) t.emit('error', err)
			})
		})

		var tx = conn.begin()
		tx.on('error', function (err) { t.emit(err) })
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
})
