# any-db - a less-opinionated database abstraction layer.

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db)

The purpose of this library is to consolidate the behaviours of various database
drivers into a minimal and consistent API. See the [design
document](https://github.com/grncdr/node-any-db/blob/master/DESIGN.md) for a
thorough overview of the planned API.

Things it does:

 * Supports MySQL, Postgres, and SQLite3 as equally as possible.
 * Specify connection parameters with URLs: `driver://user:pass@host/database`
 * Stream results or get them all at once, using an interface almost identical
	 to the existing evented interfaces of the MySQL and Postgres drivers.
 * Simple connection pooling including the ability to execute queries against
	 the pool directly for auto-release behaviour. E.g. this will never leak
	 connections: `pool.query("SELECT 1", function (err, results) { ... })`
 * Exposes a uniform transaction API.

Things it will do soon:

 * Optionally replace db-agnostic parameter placeholders with driver specific
	 ones so you can use the exact same code against all drivers.
 * Have lot's and lot's of tests
 * Provide a common result set API.

Things it might do:
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
	  onConnect: function (conn, ready) {
	    /*
	    perform any necessary connection setup before calling ready(err, conn)
	    */
	  },
	  reset: function (conn, ready) {
	    /*
	    perform any necessary reset of connection state before the connection can
	    be re-used. The default callback does conn.query("ROLLBACK", ready)
	    */
	  }
	})

A connection pool has the following methods available:

	// Exactly like conn.query above, but the underlying connection will be
	// auto-released back into the pool when the query completes.
	pool.query(...)

Transactions can be started with `begin`, in this example we stream all users
and then apply updates based on the results from an external service:

	var tx = pool.begin()

	tx.on('error', function (err) {
		// Called for any query errors without an associated callback
		tx.rollback()
		finished(err)
	})

	tx.query('SELECT id FROM users').on('row', function (user) {
		if (tx.state() == 'rolled back') return
		externalService.method(user.id, function (err, result) {
			if (err) return tx.handleError(err)

			// Errors from these queries will propagate up to the transaction object
			if (result.flag) {
				tx.query('UPDATE users SET flag = 1 WHERE id = ?', [user.id])
			} else if (result.deleteme) {
				tx.query('DELETE FROM users WHERE id = ?', [user.id])
			}
		})
	}).on('end', function () {
		tx.commit(finished)
	})

	function finished (err) {
		if (err) console.error(err)
		else console.log('All done!')
	}

## License

MIT
