# Any-DB API

This repo specifies the API that must be implemented by an Any-DB adapter. The
API is described in this README using [jsig][] and prose, and the
[test suite][] can be used by adapter implementations to ensure they conform.

Because this documentation is primarily intended for end-users of Any-DB, it
begins by describing the objects an adapter must create. The final section
describes the exact API for creating these objects that an adapter must
implement.

## Objects

 - [Connection](#connection)
 - [Query](#query)
 - [Transaction][] (optional, external link)

## Connection

```ocaml
Connection := EventEmitter & {
  adapter: String,
  query: (text: String, params: Array?, Continuation<Results>?) => Query,
  begin: (statement: String?, Continuation<Transaction>?) => Transaction,
  end: (Continuation<void>?) => void
}
```

Connection objects are obtained using [createConnection][] from [Any-DB][] or
[ConnectionPool.acquire][], both of which delegate to the
[createConnection](#adaptercreateconnection) implementation of the specified
adapter.

`Connection` instances are guaranteed to have the methods and events listed
here, but drivers (and their adapters) may have additional methods or emit
additional events. If you need to access a feature of your database that is not
described here (such as Postgres' server-side prepared statements), consult the
documentation for the database driver.

### Connection.query

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

### Connection.begin

```ocaml
(statement: String?, Continuation<Transaction>?) => Transaction
```

Start a new database transaction and return a [Transaction][] to manage it.
If a `statement` is given it will be used in place of the default
statement (`BEGIN`). If a `Continuation` is given it will be called after
the database transaction has successfully started (or failed to do so).

*Callback-style*
```javascript
conn.begin(function (err, transaction) {
	if (err) return console.error(err)
	// Do work using transaction
  transaction.query(...)
  transaction.commit()
})
```

*Synchronous-style*
```javascript
var transaction = conn.begin()
transaction.on('error', console.error)
// Do work using transaction, queries are queued until transaction successfully
// starts.
transaction.query(...)
transaction.commit()
```

See also: the [Transaction][] API docs.

### Connection.end

`conn.end([callback])`

Close the database connection. If `callback` is given it will be called after
the connection has closed.

### Connection.adapter

`conn.adapter`

Contains the adapter name used for this connection, e.g. `'sqlite3'`, etc.

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
  createTransaction?: (String?, Continuation<Transaction>?) => Transaction
}
```

### Adapter.createConnection

`(config: Object, Continuation<Connection>?) => Connection`

Create a new connection object. In common usage, `config` will be created by
[parse-db-url][] and passed to your adapter by [any-db][].

may be a URL string of the form
_adapter://user:password@host:port/database_ or an adapter-specific config
object.

If a continuation is given, it will be called with an error or the established
connection. Additional connection settings can be included as query parameters
in the URL. The returned object must conform to the [Connection API](#connection)
detailed below.

See also: README notes for your chosen adapter
([MySQL](https://github.com/grncdr/node-any-db-mysql),
 [Postgres](https://github.com/grncdr/node-any-db-postgres), and
 [SQLite3](https://github.com/grncdr/node-any-db-sqlite3))

### Adapter.createQuery

```ocaml
(text: String, params: Array?, Continuation<ResultSet>?) => Query
```

Create a [Query](#query) that may be executed later on by a [Connection][].
While this function is rarely needed by user code, it makes it possible for
[ConnectionPool.query][] and [Transaction.query][] to return a [Query][] object synchronously in the same style as a [Connection.query][]. 

### Adapter.createTransaction

*Optional*: If the database backend supports transactions, the adapter *should*
implement `createTransaction`. All current/known database adapters support
transactions by utilizing the [any-db-transaction][] package, so if you plan to
write a new adapter you'll probably want to use that too.

[jsig]: https://github.com/jden/jsig

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
[Transaction.query]: https://github.com/grncdr/node-any-db-transaction#transactionquery

[once]: http://npm.im/once
