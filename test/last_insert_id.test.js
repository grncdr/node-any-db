require('./helpers').allDrivers("Last insert id", 
	{drivers: ['sqlite3','mysql']},
	function (conn, t) {
		t.plan(2)

		conn.query("DROP TABLE last_insert_id_test", function (err) {})
		if (t.conf.name == 'sqlite3') 
			conn.query("CREATE TABLE last_insert_id_test (id integer primary key autoincrement, a int)")
		else if (t.conf.name == 'mysql')
			conn.query("CREATE TABLE last_insert_id_test (id integer primary key auto_increment, a int)")

		conn.query('INSERT INTO last_insert_id_test (a) VALUES (123)', function (err, res) {
			if (err) throw err
			t.equal(res.lastInsertId, 1)

			conn.query('INSERT INTO last_insert_id_test (a) VALUES (456)', function (err, res) {
				if (err) throw err
				t.equal(res.lastInsertId, 2)
			})
		})
	}
)

