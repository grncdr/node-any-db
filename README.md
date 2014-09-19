# Any-DB

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db)

_The less-opinionated Node.js database abstraction layer_

## Synopsis

Establish a connection:

```javascript
// Takes an optional callback
var conn = anyDB.createConnection('driver://user:pass@hostname/database')
```

Make queries:

```javascript
var sql = 'SELECT * FROM questions'

// query() returns a readable stream
conn.query(sql).on('data', function (row) {})

// pass a callback to collect results
conn.query(sql, function (error, result) {})
```

Use bound parameters:

```javascript
sql += ' WHERE answer = ?'
conn.query(sql, [42], function (err, res) {})
```

Manage database transactions with [any-db-transaction][Transaction]:

```javascript
var begin = require('any-db-transaction')

var tx = begin(conn)              // Can also take a callback
tx.on('error', function (err) {}) // Emitted for unhandled query errors
tx.query(...)                     // same interface as connections, plus...
tx.rollback()                     // this too
tx.commit()                       // takes an optional callback for errors
```

Create a [connection pool][ConnectionPool] that maintains 2-20 connections:

```javascript
var pool = anyDB.createPool(dbURL, {min: 2, max: 20})
    
pool.query(...)       // perform a single query, same API as connection
var tx = begin(pool)  // create a transaction with the first available connection
pool.close()          // close the pool (call when your app should exit)
```

## Description

The purpose of this library is to provide a consistent API for the commonly used
functionality of SQL database drivers, while avoiding altering driver behaviour
as much as possible.

## Installation

### For Applications

   npm install --save any-db-{postgres,mysql,sqlite3,mssql}

All of the adapter libraries have `any-db` as a *peerDependency*, which means
that `require('any-db')` will work even though you don't install it directly or
add it to your package.json.

### For Libraries

Add `any-db` to `peerDependencies` in package.json. This allows users of your
library to satisfy the any-db dependency by installing the adapter of their
choice.

## API

```ocaml
module.exports := {
  createConnection: (Url, Continuation<Connection>?) => Connection
  createPool: (Url, PoolConfig) => ConnectionPool
}

Url := String | { adapter: String }

PoolConfig := {
  min: Number,
  max: Number,
  onConnect: (Connection, ((Error) => void) => void
  reset: (Connection, ((Error) => void) => void
}

Continuation := (Maybe<Error>, Any) => void
```

The API of [Connection][] and [Query][] objects is fully described in the
[adapter-spec][], while [Transaction][] and [ConnectionPool][] objects have
their own documentation. Connections, transactions and pools all have a `query`
method that behaves consistently between drivers.

Both exported functions require an `Url` as their first parameter. This can
either be a string of the form `adapter://user:password@host/database` (which
will be parsed by [parse-db-url][]) or an object. When an object is used, it
**must** have an `adapter` property, and any other properties required by the
specified adapters [createConnection][] method.

See also: README for your chosen adapter
([MS SQL](https://github.com/Hypermediaisobar-admin/node-any-db-mssql),
 [MySQL](https://github.com/grncdr/node-any-db-mysql),
 [Postgres](https://github.com/grncdr/node-any-db-postgres), and
 [SQLite3](https://github.com/grncdr/node-any-db-sqlite3))

## License

MIT

[Connection]: https://github.com/grncdr/node-any-db-adapter-spec#connection
[Query]: https://github.com/grncdr/node-any-db-adapter-spec#query
[adapter-spec]: https://github.com/grncdr/node-any-db-adapter-spec
[createConnection]: https://github.com/grncdr/node-any-db-adapter-spec#adapter-createconnection
[ConnectionPool]: https://github.com/grncdr/node-any-db-pool#api
[Transaction]: https://github.com/grncdr/node-any-db-transaction#api
[parse-db-url]: https://github.com/grncdr/parse-db-url
