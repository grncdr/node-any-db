# any-db-transaction

## Synopsis

```javascript
var anyDB = require('any-db')
var begin = require('any-db-transaction')

var connection = anyDB.createConnection(...)
var pool = anyDB.createPool(...)

// Callback-style
begin(connection, function (err, transaction) {
	if (err) return console.error(err)
	// Do work using transaction
  transaction.query(...)
  transaction.commit()
})

// Synchronous-style*
var transaction = begin(connection)
transaction.on('error', console.error)
transaction.query(...)
transaction.commit()

// Or use a connection pool
var transaction = begin(pool)
```

## API

```ocaml
module.exports := begin(Queryable, statement: String?, Continuation<Transaction>?) => Transaction

Transaction := FSM & Queryable & {
  commit:   (Continuation?) => void
  rollback: (Continuation?) => void
}
```

### begin

```ocaml
module.exports := begin(Queryable, statement: String?, Continuation<Transaction>?) => Transaction
```

Transaction objects are are simple wrappers around a [Connection][] that also
implement the [Queryable][] API, but guarantee that all queries take place
within a single database transaction or not at all. Note that `begin` also
understands how to acquire (and release) a connection from a [ConnectionPool][]
as well, so you can simply pass a pool to it: `var tx = begin(pool)`

Any queries that error during a transaction will cause an automatic rollback.
If a query has no callback, the transaction will also handle (and re-emit)
`'error'` events for the [Query][] instance. This enables handling errors for
an entire transaction in a single place.

Transactions may also be nested by passing a `Transaction` to `begin` and these
nested transactions can safely error and rollback without rolling back their
parent transaction:

```javascript
var parent = begin(connection)
var child = begin(parent)
child.query("some invalid sql")
child.on('error', function () {
  parent.query("select 1") // parent still works
})
```

This feature relies on the `SAVEPOINT` support in your database. (In particular
MySQL will doesn't have good support in very old versions). The use of
savepoints also means there is no option to replace the statement used to begin
the child transaction.

While the child transaction is in progress the parent transaction will queue any
queries it receives until the child transaction either commits or rolls back, at
which point it will process the queue. Be careful: it's quite possible to write
code that deadlocks by waiting for a query in the parent transaction before
committing the child transaction. For example:

```javascript
// Do not do this! it will deadlock!

var parent = begin(connection) // starts the transaction
var child  = begin(parent)     // creates a savepoint

parent.query('SELECT 1', function (err) {
  child.commit();
});
```

### Transaction states

Transactions are [FSM][] instances with 4 states: `disconnected`,
`connected`, `open`, and `closed`:

    [disconnected]
          ↓
     [connected]
       ↓  ↓  ↑
       ↓ [open]
       ↓   ↓
      [closed]

Every transaction starts out in the `disconnected` state, in which it will queue
all tasks (queries, child transactions, commits and rollbacks) in the order they
are received.

Once the transaction acquires a connection\* it will transition to the
`connected` state and begin processing it's internal task queue. While in this
state any new tasks will still be added to the end of the queue. There are two
possible transitions from the `connected` state:

 * `connected → open` - When all queued tasks have finished.
 * `connected → closed` - When a rollback or commit is encountered in the queue.
   This includes automatic rollbacks caused by query errors.

`closed` is a terminal state in which all further database operations result in
errors. (The errors will either be sent to any callback provided or emitted as
`error` events on the next tick).

In the `open` state, all database operations will be performed immediately. If
a child transaction is started like `var child = begin(parentTxn)`, the parent
transaction will move back into the `connected` state (queueing any queries it
receives) until the child completes, at which point it will resume processing
it's own internal queue.

Transactions created from a [Connection][] transition to `connected` before
[begin][] returns.

### Transaction.adapter

Contains the adapter name used for the transaction, e.g. `'sqlite3'`, etc.

### Transaction.query

```ocaml
(text: String, params: Array?, Continuation<Result>?) => Query
```

Maintains the same contract as [Queryable.query][] but adds further guarantees
that queries will be performed within the transaction or not at all. If the
transaction has been committed or rolled back this method will fail by passing
an error to the continuation (if provided) or emitting an `'error'` event.

### Transaction.commit

```ocaml
(Continuation<void>) => void
```

Issue a `COMMIT` (or `RELEASE ...` in the case of nested transactions) statement
to the database. If a continuation is provided it will be called (possibly with
an error) after the `COMMIT` statement completes. The transaction object itself
will be unusable after calling `commit()`.

### Transaction.rollback

```ocaml
(Continuation<void>) => void
```

The same as [Transaction.commit](#transactioncommit) but issues a `ROLLBACK`.
Again, the transaction will be unusable after calling this method.

### Transaction events

 * `'query', query` - emitted immediately after `.query` is called on a
   connection via `tx.query`. The argument is a [query](#query) object.
 * `'commit:start'`      - Emitted when `.commit()` is called.
 * `'commit:complete'`   - Emitted after the transaction has committed.
 * `'rollback:start'`    - Emitted when `.rollback()` is called.
 * `'rollback:complete'` - Emitted after the transaction has rolled back.
 * `'close'`             - Emitted after `rollback` or `commit` completes.
 * `'error', err`        - Emitted under three conditions:
   1. There was an error acquiring a connection.
   2. Any query performed in this transaction emits an error that would otherwise
      go unhandled.
   3. Any of `query`, `begin`, `commit`, or `rollback` are called after the
      connection has already been committed or rolled back.

   Note that the `'error'` event **may be emitted multiple times!** depending on
   the callback you are registering, you way want to wrap it using [once][].

## Examples

### Unit-of-work middleware

A common pattern in web applications is start a transaction for each request and
commit it before sending a response. Here is a simplified [connect][] middleware
that encapsulates this pattern:

```javascript
module.exports = function unitOfWorkMiddleware (pool, errorHandler) {
  return function (req, res, next) {
    req.tx = pool.begin()
    // intercept writeHead to ensure we have completed our transaction before
    // responding to the user
    var writeHead = res.writeHead
    res.writeHead = function () {
       if (req.tx.state() != 'closed') {
         req.tx.commit(function (err) {
           if (err) {
             errorHandler(req, res, err)
           } else {
             writeHead.apply(res, arguments)
           }
         })
       } else {
         writeHead.apply(res, arguments)
       }
    }
    next()
  }
}
```

### Rolling back

Here's an example where we stream all of our user ids, check them against an
external abuse-monitoring service, and flag or delete users as necessary, if
for any reason we only get part way through, the entire transaction is rolled
back and nobody is flagged or deleted:

  var pool = require('any-db').createPool(...)

	var tx = begin(pool)
	tx.on('error', finished)

	/*
	Why query with the pool and not the transaction?
	Because it allows the transaction queries to begin executing immediately,
	rather than queueing them all up behind the initial SELECT.
	*/
	pool.query('SELECT id FROM users').on('row', function (user) {
		if (tx.state().match('rollback')) return
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
}).on('error', function (err) {
	tx.handleError(err)
}).on('end', function () {
	tx.commit(finished)
})

function finished (err) {
	if (err) console.error(err)
	else console.log('All done!')
}
```

# License

2-clause BSD

[begin]: #begin
[Connection]: https://github.com/grncdr/any-db-adapter-spec#connection
[Queryable]: https://github.com/grncdr/any-db-adapter-spec#queryable
[Queryable.query]: https://github.com/grncdr/any-db-adapter-spec#queryablequery
[Query]: https://github.com/grncdr/any-db-adapter-spec#query
[ConnectionPool]: https://github.com/grncdr/any-db-pool#connectionpool
