# any-db - a less-opinionated database abstraction layer.

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db)

The purpose of this library is to consolidate the behaviours of various database
drivers into a minimal and consistent API.

Things it does:

 * Supports MySQL, Postgres, and SQLite3 as equally as possible.
 * Specify connection parameters with URLs: `driver://user:pass@host/database`
 * Stream results or get them all at once, using an interface almost identical
	 to the existing evented interfaces of the MySQL and Postgres drivers.
 * Simple connection pooling including the ability to execute queries against
	 the pool directly for auto-release behaviour. E.g. this will never leak
	 connections: `pool.query("SELECT 1", function (err, results) { ... })`

Things it will do soon:

 * Optionally replace db-agnostic parameter placeholders with driver specific
	 ones so you can use the exact same code against all drivers.
 * Have lot's and lot's of tests
 * Provide a common result set API.

Things it might do:
 * Expose a transaction API.
 * Wrap errors.

Things it will never do:

 * Add it's own query helper methods like `.first` or `.fetchAll`
 * Include any sort SQL string building. You might want to try my other library
	 [gesundheit](https://github.com/BetSmartMedia/gesundheit), or one of the many
	 [alternatives](https://encrypted.google.com/search?q=sql&q=site:npmjs.org&hl=en)
	 for that.
 * Leave it's dishes in the sink and leave town for the weekend.

## Usage

Creating a connection:

	var anyDB = require('any-db')
		, conn = anyDB.createConnection('postgres://user:pass@localhost/dbname')

Simple queries with callbacks are exactly what you'd expect:

	conn.query("SELECT * FROM my_table LIMIT 10", function (err, rows) {
		for (var i in rows) {
			console.log("Row " + i + ": %j", row)
		}
	})

If no callback is provided, the query object returned will emit the following
events:

	var query = conn.query('SELECT * FROM my_table')
	query.on('fields', function (fields) { /* fields is an array of field names */ })
	query.on('row', function (row) { /* row is plain object */ })
	query.on('end', function () { /* always emitted when results are exhausted */ })
	query.on('error', function () { /* emitted on errors :P */ })

You can also create or get an existing connection pool with `anyDB.getPool`. It
takes the following options:

	var pool = anyDB.getPool('postgres://user:pass@localhost/dbname', {
		min: 5,  // Minimum connections
		max: 10, // Maximum connections
		afterCreate: function (conn, ready) {
			/*
			perform any necessary connection setup before calling ready(err, conn)
			note that the connection is *not* established at this point and you
			will need to call conn.connect(function (err, conn) { ... }) manually.
			*/
		},
		afterRelease: function (conn, ready) {
			/*
			perform any necessary reset of connection state before the connection can
			be re-used. The default callback does conn.query("ROLLBACK", ready)
			*/
		},
		beforeDestroy: function (conn, done) {
			/*
			perform any necessary teardown on a connection before it is .end()'ed.
			This will be removed if nobody comes forward with a use-case.
			*/
		}
	})

A connection pool has the following methods available:

	// Exactly like conn.query above, but the underlying connection will be
	// auto-released back into the pool when the query completes.
	pool.query(...)

Transactions can be managed by holding onto a single connection like so:

	pool.connect(function (err, conn) {
		// you are now responsible for releasing `conn` to the pool.
		conn.query('BEGIN')
		function rollback () {
			conn.query('ROLLBACK', pool.release.bind(pool, conn))
		}
		someOtherAsyncFunction(function (err, res) {
			if (err) {
				rollback()
				// do something about err
				return
			}
			conn.query('INSERT INTO ...', [1, 2, 3], function (err) {
				if (err) {
					rollback()
					// do something about err
					return
				}
				// great success!
				conn.query('COMMIT', pool.release.bind(conn, pool))
			})
		})
	})

## License

MIT
