var DROP = 'DROP TABLE colors';
var CREATE = "CREATE TABLE colors (name varchar (255), PRIMARY KEY (name))";

require('./helpers').allDrivers("sync-style transaction", function (conn, t) {
	t.plan(3)

	conn.query(DROP, function (err) { /* swallow errors */ })
	conn.query(CREATE, function (err) {
		if (err) return t.emit('error', err)
		tx = conn.begin()
		tx.query("INSERT INTO colors (name) VALUES ('blue')")
		tx.commit(function (err) {
			t.ok(!err, 'No error on commit')
			conn.query('SELECT name FROM colors', function (err, res) {
				if (err) return t.emit('error', err)
				t.equal(res.rows.length, 1)
				t.equal(res.rows[0].name, 'blue')
			})
		})
	})
})
