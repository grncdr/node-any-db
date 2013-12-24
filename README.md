# Any-DB API

This repo specifies the API that must be implemented by an Any-DB adapter. The
API is described in this README using [jsig][] and prose, and the
[test suite][] can be used by adapter implementations to ensure they conform.

Because this documentation is primarily intended for end-users of Any-DB, it
begins by describing the objects an adapter must create. The final section
describes the exact API for creating these objects that an adapter must
implement.

## Interfaces

 - [Queryable](#queryable) which must be implemented by connections
 - [Connection](#connection)
 - [Query](#query)

## External Objects

These come from external packages and addons that build on the core adapter API:

 - [ConnectionPool][]
 - [Transaction][]

## Queryable

```ocaml
Queryable := EventEmitter & {
  adapter: String,
  query: (text: String, params: Array?, Continuation<Results>?) => Query,
  query: (Query) => Query
  createQuery: (text: String, params: Array?, Continuation<Results>?) => Query
}
```

[Connections][Connection] [ConnectionPools][ConnectionPool] and
[Transactions][Transaction] all implement the `Queryable` interface.

`Queryable` instances are guaranteed to have the methods and events listed
here, but drivers (and their adapters) may add additional methods or emit
additional events. If you need to access a feature of your database that is not
described here (such as Postgres' server-side prepared statements), consult the
documentation for the database driver.

### Queryable.adapter

`conn.adapter`

Contains the adapter name used for this connection, e.g. `'sqlite3'`, etc.

### Queryable.query

```ocaml
(text: String, params: Array?, Continuation<ResultSet>?) => Query
(Query) => Query
```

Execute a SQL statement using bound parameters (if they are provided) and
return a [Query](#query) object for the in-progress query. If a
`Continuation<Results>` is provided it will be passed a [ResultSet](#resultset)
object after the query has completed.

The second form is not needed for normal use, but must be implemented by
adapters to work correctly with [ConnectionPool][] and [Transaction][]. See
[Adapter.createQuery](#adapter-createquery) for more details.

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

## Connection

```ocaml
Connection := Queryable & {
  end: (Continuation<void>?) => void
}
```

Connection objects are obtained using [createConnection][] from [Any-DB][] or
[ConnectionPool.acquire][], both of which delegate to the
[createConnection](#adaptercreateconnection) implementation of the specified
adapter.

### Connection.end

`conn.end([callback])`

Close the database connection. If `callback` is given it will be called after
the connection has closed.

### Connection Events

 * `'error', err` - Emitted when there is a connection-level error.
 * `'close'` - Emitted when the connection has been closed.

## Query

```ocaml
Query := EventEmitter & {
  text: String,
  values: Array
}
```

Query objects are returned by the `query` methods of [connections][Connection.query],
[pools][ConnectionPool.query], and [transactions][Transaction.query]. Like
connections, query objects are created by an adapter and may have more methods
and events than are described here.

### Query.text

The SQL query as a string. If you are using MySQL this will contain
interpolated values *after* the query has been enqueued by a connection.

### Query.values

The array of parameter values.

### Query Events

 * `'error', err` - Emitted if the query results in an error.
 * `'row', row` - Emitted for each row in the queries result set.
 * `'end', [res]` - Emitted when the query completes.

## Adapter

```ocaml
Adapter: {
  createConnection:   (Object, Continuation<Connection>?) => Connection,
  createQuery:        (String, Array?, Continuation<Results>?) => Query,
}
```

This section is mostly intended for adapter authors, other users should rarely
need to interact with this API directly.

### Adapter.createConnection

`(config: Object, Continuation<Connection>?) => Connection`

Create a new connection object. In common usage, `config` will be created by
[parse-db-url][] and passed to the adapter by [any-db][].

If a continuation is given, it **must** be called, either with an error or the
established connection.

See also: the [Connection API](#connection)

### Adapter.createQuery

```ocaml
(text: String, params: Array?, Continuation<ResultSet>?) => Query
```

Create a [Query](#query) that may be executed later on by a [Connection][].
While this function is rarely needed by user code, it makes it possible for
[ConnectionPool.query][] and [Transaction.query][] to return a [Query][] object
synchronously in the same style as a [Connection.query][]. 

# License

2-clause BSD

[jsig]: https://github.com/jden/jsig
[once]: http://npm.im/once

[test suite]: tests
[any-db]: https://github.com/grncdr/node-any-db
[createConnection]: https://github.com/grncdr/node-any-db#exportscreateconnection
[parse-db-url]: https://github.com/grncdr/parse-db-url#api
[Connection]: #connection
[Connection.query]: #connectionquery
[Query]: #query
[ConnectionPool.query]: https://github.com/grncdr/node-any-db-pool#connectionpoolquery
[ConnectionPool.acquire]: https://github.com/grncdr/node-any-db-pool#connectionpoolacquire
[ConnectionPool]: https://github.com/grncdr/node-any-db-pool#api
[Transaction]: https://github.com/grncdr/node-any-db-transaction
[any-db-transaction]: https://github.com/grncdr/node-any-db-transaction
[Transaction.query]: https://github.com/grncdr/node-any-db-transaction#transactionquery
