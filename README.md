# any-db-pool - database agnostic connection pool

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db-pool)

## Synopsis

```javascript
var ConnectionPool = require('any-db-pool')
var mysql = require('mysql')

var adapter = {
  createConnection: function (opts, callback) {
    var conn = mysql.createConnection(opts, callback)
    conn.connect(function (err) {
      if (err) callback(err)
      else callback(null, conn)
    })
    return conn
  },
  createQuery: mysql.createQuery
}

var pool = new ConnectionPool(adapter, {user: 'scott', password: 'tiger'}, {
  min: 5,
  max: 15,
  reset: function (conn, done) { conn.query('ROLLBACK', done) }
})

// Proxies to mysql's connection.query
var q = pool.query('SELECT 1', function (err, res) { })
```

## Description

This module contains a database connection pool that can be used with any
driver, though it is designed to integrate well with [any-db][any-db], a
minimal database abstraction layer. If you are writing a library that needs to
support multiple database backends (e.g. SQLite3 or Postgres or MySQL) then it's
highly encouraged that you use [any-db][any-db] and **not** this
module.

If, on the other hand, you just need a connection pool for your application this
should work for you with very little fuss.

[any-db]: http://npm.im/any-db

## Why wouldn't I just use `generic-pool`?

[generic-pool][gpool] is awesome, but it's *very* generic.  This is a Good Thing
for a library with "generic" in the name, but not so good for the very common
but slightly more specialized case of pooling stateful database connection. This
library uses `generic-pool` and simply augments it with some added niceties:

* Hooks for initializing and/or resetting connection state when connections are
	added to the pool.
* A `query` method that allows queries to be performed without the user needing
	a reference to a connection object (and potentially leaking that reference).

[gpool]: http://npm.im/generic-pool

## Installation

`npm install any-db-pool`

## API

### module.exports

    var ConnectionPool = require('any-db-pool')
    var pool = new ConnectionPool(adapter, connectionParams, options)

The module exports a single constructor function, conventionally named
`ConnectionPool`. This constructor expects 3 arguments:

* `adapter` - An object with `createConnection` and `createQuery` methods. See
	[adapter interface](#adapterinterface) below for details.
* `connectionParams` - An argument for `adapter.createConnection` to create connections.
* `options` - an object with any of the following keys (defaults shown):

 * `min: 2` The minimum number of connections to keep open in the pool.

 * `max: 10` The maximum number of connections to allow in the pool.

 * `onConnect: function (conn, done) { done(null, conn) }`

	 Called immediately after a connection is first established. Use this to do
	 one-time setup of new connections. You must call `done(error, connection)`
	 for the connection to actually make it into the pool.

 * `reset: function (conn, done) { done(null) }`,

	 Called each time the connection is returned to the pool. Use this to restore
	 your connection to it's original state (e.g. rollback transactions, set the
	 user or encoding).

### Adapter Interface

Adapter objects must support the following method signatures:

`adapter.createConnection(connectionParams, callback)` - Create a new database
connection using `connectionParams`. Callback **must** be called with either an
error (`callback(error)`) or the connection itself (`callback(null, conn)`). The
connection is expected to adhere to the [any-db Connection
interface](https://github.com/grncdr/node-any-db#connection).

`adapter.createQuery(statement, params, callback)` - Create and return a new
query object that can be later executed with [connection.query][conn_query].
(note that this requires the connection objects query method to support being
called with a pre-constructed query object).

[conn_query]: https://github.com/grncdr/node-any-db#connectionquery

### ConnectionPool

ConnectionPool instances are created with [createPool](#exportscreatepool). They
have also been moved into their own module
[any-db-pool](http://npm.im/any-db-pool)

#### ConnectionPool.query

`var query = pool.query(stmt, [params], [callback])`

Perform a SQL query using the first available connection, and automatically
release the connection after the query has completed.

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

## License

MIT
