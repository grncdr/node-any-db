# any-db-pool - database agnostic connection pool

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db-pool)

## Synopsis

```javascript
var anyDB = require('any-db')

var pool = anyDB.createPool('postgres://user:pass@localhost/dbname', {
  min: 5, max: 15,
  reset: function (conn, done) {
    conn.query('ROLLBACK', done)
  }
})

// Proxies to mysql's connection.query
var q = pool.query('SELECT 1', function (err, res) { })
```

*Note:* As shown above, [ConnectionPool](#api) instances are usually created
with [anyDB.createPool][createPool]. The [any-db][] package will be installed
alongside any adapters (e.g. [any-db-postgres][]), so most users should depend
on their adapter and **not** on `any-db` or `any-db-pool`.

## Description

This package contains a database connection pool that can be used with any
driver, but it requires an [any-db compliant adapter][Adapter]. If you are
writing a library that needs to support multiple database backends (e.g.
SQLite3 or Postgres or MySQL) then it's strongly recommended that you add
[any-db][] toyour `peerDependencies` and rely on [createPool][] instead of
depending on this package directly.

## API

```ocaml
module.exports := (Adapter, adapterConfig: Object, PoolConfig) => ConnectionPool

ConnectionPool := EventEmitter & {
  adapter: String,
  query:   (String, Array?, Continuation<ResultSet>?) => Query,
  acquire: (Continuation<Connection>) => void,
  release: (Connection) => void,
  close:   (Continuation<void>?) => void,
}

PoolConfig := {
  min: Number?,
  max: Number?,
  idleTimeout: Number?,
  reapInterval: Number?,
  refreshIdle: Boolean?,
  onConnect: (Connection, ready: Continuation<Connection>) => void
  reset: (Connection, done: Continuation<void>) => void
  shouldDestroyConnection: (error: Error) => Boolean
}
```

### PoolConfig

A `PoolConfig` is generally a plain object with any of the following properties (they are all optional):

 - `min` (default `0`) The minimum number of connections to keep open in the pool.
 - `max` (default `10`) The maximum number of connections to keep open in the pool. When this limit is reached further requests for connections will queue waiting for an existing connection to be released back into the pool.
 - `refreshIdle` (default `true`) When this is true, the pool will reap connections that have been idle for more than `idleTimeout` milliseconds.
 - `idleTimeout` (default `30000`) The maximum amount of time a connection can sit idle in the pool before being reaped.
 - `reapInterval` (default `1000`) How frequently the pool should check for connections that are old enough to be reaped.
 - `onConnect` Called immediately after a connection is first established. Use this to do one-time setup of new connections. The supplied `Connection` will not be added to the pool until you pass it to the `done` continuation.
 - `reset` Called each time a connection is returned to the pool. Use this to restore a connection to it's original state (e.g. rollback transactions, set the database session vars). If `reset` fails to call the `done` continuation the connection will be lost in limbo.
 - `shouldDestroyConnection` (default `function (err) { return true }`) - Called
   when an error is encountered by `pool.query` or emitted by an idle
   connection. If `shouldDestroyConnection(error)` is truthy the connection will
   be destroyed, otherwise it will be reset.

### ConnectionPool.query

```ocaml
(String, Array?, Continuation<ResultSet>?) => Query
```

Implements [Queryable.query][] by automatically acquiring a connection and
releasing it when the query completes.

### ConnectionPool.acquire

```ocaml
(Continuation<Connection>) => void
```

Remove a connection from the pool. If you use this method you **must** return
the connection back to the pool using [ConnectionPool.release](#connectionpoolrelease)

### ConnectionPool.release

```ocaml
(Connection) => void
```

Return a connection to the pool. This should only be called with connections
you've manually [acquired](#connectionpoolacquire). You **must not** continue
to use the connection after releasing it.

### ConnectionPool.close

```ocaml
(Continuation<void>?) => void
```

Stop giving out new connections, and close all existing database connections as
they are returned to the pool.

### ConnectionPool.adapter

The string name of the adapter used for this connection pool, e.g. `'sqlite3'`.

### ConnectionPool events

#### Acquire event

An `'acquire'` event is emitted by a ConnectionPool whenever the pool's
[`acquire()`](#connectionpoolacquire) method is invoked.

No arguments are passed to event listeners.

#### Release event

A `'release'` event is emitted by a ConnectionPool whenever the pool's
[`release()`](#connectionpoolrelease) method is invoked.

No arguments are passed to event listeners.

#### Query event

A `'query'` event is emitted by a ConnectionPool immediately after the pool's
[`query()`](#connectionpoolquery) method is invoked.

One argument is passed to event listeners:
* `query` - a [Query][] object.

#### Close event

A `'close'` event is emitted by a ConnectionPool when the pool has closed all
of it's connections. Invoking a pool's [`close()`](#connectionpoolclose) method would cause a `close`
event to be emitted.

No arguments are passed to event listeners.

## Why wouldn't I just use `generic-pool`?

[generic-pool][gpool] is awesome, but it's *very* generic.  This is a Good
Thing for a library with "generic" in the name, but not so good for the very
common but slightly more specialized case of pooling stateful SQL database
connections.  This library uses `generic-pool` and simply augments it with some
added niceties:

* Hooks for initializing and/or resetting connection state when connections are added or returned to the pool.
* A `query` method that allows queries to be performed without the user needing a reference to a connection object (and potentially leaking that reference).

## Stop telling me not to use this directly

Ok, if you really want to use this package without using the [any-db][]
frontend you should provide a compliant [Adapter][] implementation:

```javascript
var ConnectionPool = require('any-db-pool')
var adapter = require('my-custom-adapter')
var connectionParams = { user: 'scott', password: 'tiger' }
var poolParams = {
  min: 5, max: 15,
  reset: function (conn, done) {
    conn.query('ROLLBACK', done)
  }
}
var pool = new ConnectionPool(adapter, connectionParams, poolParams)
```

However, it would be awesome if you just published your adapter as a
package named `any-db-$name` so that everybody could use it :+1:

## License

MIT

[gpool]: http://npm.im/generic-pool
[any-db]: https://github.com/grncdr/node-any-db
[any-db-postgres]: https://github.com/grncdr/node-any-db-postgres
[Adapter]: https://github.com/grncdr/node-any-db-adapter-spec#adapter
[createPool]: https://github.com/grncdr/node-any-db#exportscreatepool
[Queryable.query]: https://github.com/grncdr/node-any-db-adapter-spec#queryablequery
[Query]: https://github.com/grncdr/node-any-db-adapter-spec#query
