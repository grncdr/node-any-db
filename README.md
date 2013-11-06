# Any-DB Project

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db)

_The less-opinionated Node.js database abstraction layer_

## Synopsis

(There's also detailed [API][API] documentation available)

    var anyDB = require('any-db')
    var dbURL = 'driver://user:pass@hostname/database'
    
Establish a connection:

    var conn = anyDB.createConnection(dbURL)  // Takes an optional callback
    
Make queries:

    var sql = 'SELECT * FROM my_table'
    conn.query(sql).on('row', function (row) {})  // evented
    conn.query(sql, function (error, result) {})  // or callback
    
Use bound parameters:

    sql += ' WHERE my_column = ?'
    conn.query(sql, [42]).on('row', ...)           // again, evented
    conn.query(sql, [42], function (err, res) {})  // or callback

Close a connection:

    conn.end()
    
Start a transaction:

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

### Things it does

 * Supports MySQL, Postgres, and SQLite3 as equally as possible. (More driver
	 support is very much welcomed!)
 * Parses connection parameters from URLs: `driver://user:pass@host/database`
 * Streams results or gets them all at once, using an [api][query] almost
	 identical to the existing interfaces of the MySQL and Postgres drivers.
 * A simple, solid, [connection pool][pool] with the ability to execute queries
	 directly on a pool for auto-release behaviour. E.g. - this will never leak
	 connections: `pool.query("SELECT 1", function (err, results) { ... })`
 * Stateful [transaction objects][tx] for managing database transactions.

### Things it might do (feedback needed!)

 * Provide a common result set API.

### Things it will never do

 * Add it's own query helper methods like `.first` or `.fetchAll`
 * Include any sort of SQL string building. You might want to try my other library
	 [gesundheit](https://github.com/BetSmartMedia/gesundheit), or one of the many
	 [alternatives](https://npmjs.org/search?q=sql) for that.

## Installation

### For Applications

   npm install --save any-db-{postgres,mysql,sqlite3}

All of the adapter libraries have `any-db` as a *peerDependency*, which means
that `require('any-db')` will work even though you don't install it directly or
add it to your package.json.

### For Libraries

Add `any-db` to `peerDependencies` in package.json. This allows users of your
library to satisfy the any-db dependency by installing the adapter of their
choice.

If your library depends on a database connection for tests you should also add
a *devDependency* on the corresponding `any-db-<adapter>` library.

## License

MIT

[API]:   any-db/API.md
[query]: any-db/API.md#query
[pool]:  any-db/API.md#exportscreatepool
[tx]:    any-db/API.md#transaction
