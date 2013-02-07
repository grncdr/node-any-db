# any-db - a less-opinionated database abstraction layer.

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db)

## Synopsis

(There's a more detailed [API](#api) section below)

    var anyDB = require('any-db')
    var dbURL = 'driver://user:pass@hostname/database'
    
Establish a connection

    var conn = anyDB.createConnection(dbURL)  // Takes an optional callback
    
Make queries

    var sql = 'SELECT * FROM my_table'
    conn.query(sql).on('row', function (row) {})  // evented
    conn.query(sql, function (error, result) {})  // or callback
    
Use bound parameters

    sql += ' WHERE my_column = ?'
    conn.query(sql, [42]).on('row', ...)           // again, evented
    conn.query(sql, [42], function (err, res) {})  // or callback

Close a connection

    conn.end()
    
Start a transaction

    var tx = conn.begin()             // Can also take a callback
    tx.on('error', function (err) {}) // Emitted for unhandled query errors
    tx.query(...)                     // same interface as connections, plus...
    tx.commit()                       // takes an optional callback for errors
    tx.rollback()                     // this too
    
Create a connection pool that maintains 2-20 connections

    var pool = anyDB.createPool(dbURL, {min: 2, max: 20})
    
    pool.query(...)       // perform a single query, same API as connection
    var tx = pool.begin() // start a transaction, again, same API as connection
    pool.close()          // close the pool (call when your app should exit)

## Description

The purpose of this library is to provide a consistent API for the commonly used
functionality of SQL database drivers, while avoiding altering driver behaviour
as much as possible.

The long-term goal of this project is to serve as the testing ground for finding
a suitable common interface, then (hopefully) convincing driver implementors to
support it natively. In short, any-db hopes to prove it's usefulness well enough
that most of it can be obviated by the drivers themselves.

### Things it does

 * Supports MySQL, Postgres, and SQLite3 as equally as possible. (More driver
	 support is very much welcomed!)
 * Parses connection parameters from URLs: `driver://user:pass@host/database`
 * Streams results or gets them all at once, using an interface almost identical
	 to the existing interfaces of the MySQL and Postgres drivers.
 * Simple connection pooling including the ability to execute queries against
	 the pool directly for auto-release behaviour. E.g. this will never leak
	 connections: `pool.query("SELECT 1", function (err, results) { ... })`
 * Exposes a uniform transaction API.

### Things it will do soon

 * Have more and more tests.

### Things it might do (feedback needed!)

 * [Wrap errors](https://github.com/grncdr/node-any-db/issues/13).
 * Provide a common result set API.

### Things it will never do

 * Add it's own query helper methods like `.first` or `.fetchAll`
 * Include any sort SQL string building. You might want to try my other library
	 [gesundheit](https://github.com/BetSmartMedia/gesundheit), or one of the many
	 [alternatives](https://encrypted.google.com/search?q=sql&q=site:npmjs.org&hl=en)
	 for that. _(send me pull requests to list your libs here)_

## Install

    npm install --save any-db
    npm install --save {pg,mysql,sqlite3}


## Contributing

For ideas that would change an existing API or behaviour please open an issue to
propose the change before spending time on implementing it. I know it's hard (I
code-first-ask-questions-later *way* too frequently :smile:) but I'd really hate
for anybody to put their time into something that won't be merged.

I'm not terribly picky about code-formatting, but please try and keep lines
under 80 characters long if you can help it.

## API

### exports.createConnection

`require('any-db').createConnection(dbURL, [callback])`

Create a connection object from a `dbURL` of the form
_driver://user:pass@hostname/databasename_ where _driver_ is one of "mysql",
"postgres", or "sqlite3". If a callback is given, it will be called with either
an error or the established connection: `callback(error, conn)`. Additional
connection settings can be included as query parameters in the URL. The returned
will conform to the [Connection API](#connection) detailed below.

See also: Driver-specific notes for [Postgres](#postgres).

### exports.createPool

`require('any-db').createPool(dbUrl, [poolOpts])`

Create a new [ConnectionPool](#connectionpool) and return it immediately. See
the [createConnection](#exportscreateconnection) docs for an explanation of the
`dbURL` parameter. `poolOpts` may be an object with any of the following keys:

 * `min: 2`
   
	 The minimum number of connections to keep open in the pool.

 * `max: 10`
 
   The maximum number of connections to allow in the pool.

 * `onConnect: function (conn, done) { done(null, conn) }`

   Called immediately after a connection is first established. Use this to do
	 one-time setup of new connections. You must call `done(error, connection)`
	 for the connection to actually make it into the pool.

 * `reset: function (conn, done) { done(null) }`,

   Called each time the connection is returned to the pool. Use this to restore
	 your connection to it's original state (e.g. rollback transactions, set the
	 user or encoding).

See [ConnectionPool](#connectionpool) below for the API of the returned object.

### Connection

Connection objects returned by [createConnection](#exportscreateconnection) or
[ConnectionPool.acquire](#connectionpoolacquire) are guaranteed to have the
methods and events listed here, but the connection objects of various drivers
may have additional methods or emit additional events. If you need to access a
feature of your database is not described here (such as Postgres' server-side
prepared statements), consult the documentation for the database driver.

#### Connection Events

 * `'error', err` - Emitted when there is a connection-level error.
 * `'close'` - Emitted when the connection has been closed.

#### Connection.query

Execute a SQL statement, using bound parameters if they are given, and return a
[Query](#query) object for the in-progress query. If `callback` is given it will
be called with any errors or an object representing the query results
(`callback(error, results)`). The returned Query object and the result object
passed to the callback may have extra driver-specific properties and events.

*Callback-style*
```javascript
conn.query('SELECT * FROM my_table', function (err, res) {
  if (err) return console.error(err)
  res.rows.forEach(console.log)
  console.log('All done!')
})
```

*EventEmitter-style*
```javascript
conn.query('SELECT * FROM my_table')
  .on('error', console.error)
  .on('row', console.log)
  .on('end', function () { console.log('All done!') })
```

#### Connection.begin

`var tx = conn.begin([callback])`

Start a new transaction and return a [Transaction](#transaction) object to
manage it. If `callback` is given it will be called with any errors encountered
starting the transaction and the transaction object itself: `callback(error,
transaction)`. See also: the [Transaction](#transaction) API.

*Callback-style*
```javascript
conn.begin(function (err, transaction) {
	if (err) return console.error(err)
	// Do work using transaction
})
```

```javascript
var transaction = conn.begin()
transaction.on('error', console.error)
// Do work using transaction, queries are queued until transaction successfully
// starts.
```

#### Connection.end

`conn.end([callback])`

Close the database connection. If `callback` is given it will be called after
the connection has closed.


### Query

Query objects are returned by the `.query(...)` methods of
[connections](#connection), [pools](#connectionpool), and
[transctions](#transaction). Like connections, query objects are created by the
drivers themselves and may have more methods and events than are described here.

#### Query Events

 * `'error', err` - Emitted if the query results in an error.
 * `'row', row` - Emitted for each row in the queries result set.
 * `'end', [res]` - Emitted when the query completes.

### ConnectionPool

ConnectionPool instances are created with [createPool](#exportscreatepool).

[any-db-pool](http://npm.im/any-db-pool)

#### ConnectionPool.query

`var query = pool.query(stmt, [params], [callback])`

Acts exactly like [Connection.query](#connectionquery) by automatically
acquiring a connection and releasing it when the query completes.

#### ConnectionPool.begin

`var tx = pool.begin([callback])`

Acts exactly like [Connection.begin](#connectionbegin), but the underlying
connection is returned to the pool when the transaction commits or rolls back.

#### ConnectionPool.acquire

`pool.acquire(function (err, conn) { ... })`

Remove a connection from the pool. If you use this method you **must** return
the connection back to the pool using [ConnectionPool.release](#connectionpoolrelease).

#### ConnectionPool.release

`pool.release(conn)`

Return a connection to the pool. This should only be called with connections
you've manually [acquired](#connectionpoolacquire), and you **must not**
continue to use the connection after releasing it.

#### ConnectionPool.close

Stop giving out new connections, and close all existing database connections as
they are returned to the pool.

#### ConnectionPool events

 * `'close'` - emitted when the connection pool has closed all of it
	 connections after a call to `close()`.

### Transaction

Transaction objects wrap a [Connection](#connection) so that all queries take
place within a single database transaction. Queries that error will cause the
database transaction to automatically rollback. If a query has no callback, the
transaction will handle (and re-emit) `'error'` events for that query. This enables
handling errors for the entire transaction in a single place.

#### Transaction.query

`var q = tx.query(stmt, [params], [callback])`

Acts exactly like [Connection.query](#connectionquery) except queries are
guaranteed to be performed within the transaction. If the transaction has been
committed or rolled back further calls to `query` will fail.

#### Transaction.commit

`tx.commit([callback])`

Issue a `COMMIT` statement to the database. If a callback is given it will be
called with any errors after the `COMMIT` statement completes. The transaction
object itself will be unusable after calling `commit()`.

#### Transaction.rollback

`tx.rollback([callback])`

The same as [Transaction.commit](#transactioncommit) but issues a `ROLLBACK`.
Again, the transaction will be unusable after calling this method.

#### Transaction events

 * `'committed'` - Emitted after the transaction has successfully committed.
 * `'rolled back'` - Emitted after the transaction has rolled back.
 * `'error', err` - Emitted under three conditions:
   1. There was an error acquiring a connection.
   2. Any query performed in this transaction emits an error that would otherwise
      go unhandled.
   3. Any of `query`, `commit`, or `rollback` are called after the connection has
      already been committed or rolled back.

   Note that the `'error'` event **may be emitted multiple times!** depending on
   the callback you are registering, you way want to wrap it using [once][once].
   
[once]: http://npm.im/once

#### Transaction Example

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

## Driver-specific notes

### Postgres

If you have issues using the native backend for the pg driver on your platform,
you can force anyDB to use the pure-JavaScript like so:

```javascript
var anyDB = require('any-db')
anyDB.adapters.postgres.forceJS = true
```

You **must** do the above *before* you create any connections or connection
pools.

### SQLite3

You can include any of the SQLite3 mode flags as query parameters in your database
URL. So if you wanted to open your database in read-only mode for example, just
append `?OPEN_READONLY` to the URL. The available flags are documented in this
[SQLite3 wiki page](https://github.com/developmentseed/node-sqlite3/wiki/API).

## License

MIT
