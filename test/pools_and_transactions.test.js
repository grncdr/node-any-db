var DROP   = "DROP TABLE people"
var CREATE = "CREATE TABLE people (name varchar(255), location varchar(255))"
var INSERT = "INSERT INTO people (name, location) VALUES ('stephen', 'here')"
var SELECT = "SELECT * FROM people"

require('./helpers').allPools("Pools + transactions", function (pool, t) {
	t.plan(4)
	pool.acquire(function (err, conn) {
		if (err) throw err
		t.on('end', pool.release.bind(pool, conn))
		conn.query(DROP, function () {})
		conn.query(CREATE, function () {
			pool.begin(function (err, tx) {
				if (err) throw err
				t.on('end', tx.rollback.bind(tx))
				t.type(tx._connection, conn.constructor)
				t.notEqual(conn, tx._connection, "connection isn't existing connection")
				tx.query(INSERT, function (err) {
					if (err) throw err
					tx.query(SELECT, function (err, res) {
						if (err) throw err
						t.deepEqual(res.rows, [{name: 'stephen', location: 'here'}], "rows in transaction")
					})
					conn.query(SELECT, function (err, res) {
						if (err) throw err
						pool.release(conn)
						t.deepEqual(res.rows, [], "no rows out of transaction")
					})
				})
			})
		})
	})
})
