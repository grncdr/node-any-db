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
 * Uses one style of parameter placeholders (Postgres-style $n or $named) with
   all drivers.

Things it will do soon:

 * Have more and more tests.
 * Provide a common result set API.

Things it might do:
 * Wrap errors.

Things it will never do:

 * Add it's own query helper methods like `.first` or `.fetchAll`
 * Include any sort SQL string building. You might want to try my other library
	 [gesundheit](https://github.com/BetSmartMedia/gesundheit), or one of the many
	 [alternatives](https://encrypted.google.com/search?q=sql&q=site:npmjs.org&hl=en)
	 for that.

## Usage

Creating a connection:

	var anyDB = require('any-db')
	  , conn = anyDB.createConnection('postgres://user:pass@localhost/dbname')

Simple queries with callbacks are exactly what you'd expect:

	conn.query("SELECT * FROM my_table LIMIT 10", function (err, result) {
	  for (var i in result.rows) {
	    console.log("Row " + i + ": %j", rows[i])
	  }
	})

If no callback is provided, the query object returned will emit the following
events:

	var query = conn.query('SELECT * FROM my_table')
	query.on('fields', function (fields) { /* fields is an array of field names */ })
	query.on('row', function (row) { /* row is plain object */ })
	query.on('end', function () { /* always emitted when results are exhausted */ })
	query.on('error', function () { /* emitted on errors :P */ })

To use bound parameters simply pass an array as the second argument to query:

	conn.query('SELECT * FROM users WHERE gh_username = $1', ['grncdr'])

You can also use named parameters by passing an object instead:

	conn.query('SELECT * FROM users WHERE gh_username = $username', {username: 'grncdr'})

Any-db doesn't do any parameter escaping on it's own, so you can use any
advanced parameter escaping features of the underlying driver exactly as though
any-db wasn't there.

### Connection pools

You can create a connection pool with `anyDB.createPool`:

	var pool = anyDB.createPool('postgres://user:pass@localhost/dbname', {
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

A connection pool has a `query` method that acts exactly like the one on
connections, but the underlying connection is returned to the pool when the
query completes.

### Transactions

Both connections and pools have a `begin` method that starts a new transaction
and returns a `Transaction` object. Transaction objects behave much like
connections, but instead of an `end` method, they have `commit` and `rollback`
methods. Additionally, an unhandled error emitted by a transaction query will
cause an automatic rollback of the transaction before being re-emitted by the
transaction itself.

Here's an example where we stream all of our user ids, check them against an
external abuse-monitoring service, and flag or delete users as necessary, if
for any reason we only get part way through, the entire transaction is rolled
back and nobody is flagged or deleted:

	var tx = pool.begin()

	tx.on('error', finished)

	/*
	Why query with the pool and not the transaction?
	Because it allows the transaction queries to begin executing immediately,
	rather than queueing them all up behind the initial SELECT.
	*/
	pool.query('SELECT id FROM users').on('row', function (user) {
		if (tx.state() == 'rolled back') return
		abuseService.checkUser(user.id, function (err, result) {
			if (err) return tx.handleError(err)
			// Errors from these queries will propagate up to the transaction object
			if (result.flag) {
				tx.query('UPDATE users SET abuse_flag = 1 WHERE id = $1', [user.id])
			} else if (result.destroy) {
				tx.query('DELETE FROM users WHERE id = $1', [user.id])
			}
		})
	}).on('error', function (err) {
		tx.handleError(err)
	}).on('end', function () {
		tx.commit(finished)
	})

	function finished (err) {
		if (err) console.error(err)
		else console.log('All done!')
	}

## License

MIT
