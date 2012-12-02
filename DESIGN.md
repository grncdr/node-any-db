# Purpose

Any-DB is intended to serve as suitable abstraction layer over any SQL
database driver. It does this by _adapting_ individual driver implementations to
a single uniform interface. Given that different drivers have differing
abilities, any-db necessarily supports a lowest-common-denominator API. That
said, this API should still full-featured enough to get useful work done, or build
more powerful abstractions on top of in the future.

The long-term goal of this project is to serve as a testing ground for finding a
suitable bare-minimum interface, then (hopefully) convincing driver implementors
to support it natively. In short, any-db hopes to prove it's usefulness well
enough that the adapter portions can be obviated by the drivers themselves.


# Exported API

 * `exports.createConnection(dbUrl, callback)` create a new `ConnectionAdapter`
   and return it immediately. If given, `callback(err, adapter)` will be called
   after the connection is established (or an error occurs).

 * `exports.createPool(dbUrl, poolOpts)` create a new `ConnectionPool`
   and return it immediately. (See `ConnectionPool` below for a description of
   `poolOpts`).


# Components

The components of AnyDB can be divided into two categories: those that are
driver-specific, and those that aren't.

**Driver-Specific**

Each driver requires a connection adapter to create and wrap database
connections in an object that provides a minimal interface (defined below).

**Non-Driver-Specific**

The other components of Any-DB either don't talk to the database, or only use
the adapter interfaces:

 * Query adapters wrap query parameters and are used by connection adapters to
   emit events when the query is executed.
 * Connection pools manage a set of connection adapters and provide query
   execution without having to manually acquire and release connections.
 * Transaction objects act like a connection, but guarantee that all queries
   are performed within a single database transaction.
 * Result sets are objects containing an array of rows (plain java script
   objects) and a row count.

All of these objects (except result sets) are event emitters.


## Connection Adapters

**Responsibility:** Create and wrap driver-specific connection objects in an
object that implements (at minimum) the following interface.

### Interface

**Constructor Methods**

 * `Adapter.create(parsedURL, callback)` - This factory method must create _and
   connect_ a new connection using the underlying driver. After a connection has
   been established `callback` must be called (in standard node style) with any
   errors **or** an adapter instance wrapping the connection.

**Instance Methods**

 * `query(statement, [params], [callback])` - Execute statement (with `params`
   if they are given) and return a `QueryAdapter` for the in-progress query. If
   `callback` is given it will be called with any errors or the query ResultSet.
 * `reset(callback)` _optional_ - Set the connection back to a pristine state
   for the next user e.g. by rolling back any open transactions. (Also see
   poolOpts.reset for in the `ConnectionPool` section).
 * `close()` - Close the underlying connection and put this adapter in an
   unusable state. Calls to `query` made after `close()` has been called should
   construct a new Error instance and asynchronously either emit an error event
   or call `callback(error)` if a callback is given.

**Events**

 * `'error', err` - Emitted when `query` is called on a closed adapter, or there
   is an error in the underlying connection. In the latter case `err.orig`
   _must_ be the driver-specific error emitted by the underlying connection.
 * `'close'` - Emitted when the underlying driver connection has been closed.


## Query Adapters

**Responsibility:** Act as a container for delayed execution of a query, and
provide an interface for application code to interact with the query during
execution.


### Interface

**Instance Methods**

 * `buffer([boolean])` - Get or set the boolean value that determines whether
   rows returned by this query should be buffered in the result set for the
	 'end' event. If an argument is given, returns the QueryAdapter for method
	 chaining. If no argument is given, returns the current 'buffer' value.
 * `cancel()` _PLANNED_ - Cancel the underlying query if the driver supports it.
   A `'cancel'` event will be emitted, and no events other than `'error'` may be
   emitted after a call to `cancel()`, even if the driver does not actually
   support cancelling queries.

**Events**

 * `'row', row` - Emitted for each row of the result set. `row` must be a plain
   javascript object whose keys are the column names of the result. This event
   must be emitted regardless of whether buffering is enabled.

 * `'end', result` - Emitted when all rows have been retrieved from the
   driver. `result` must be a `ResultSet` object (detailed below).

 * `'cancel'` - Emitted when `cancel()` is called, indicates that there will be
   no more `'row'` or `'end'` events emitted by this `QueryAdapter` object.

 * `'error', err` - Only emitted when no callback is given. Can be emitted for
   both query errors (such as SQL syntax errors) and, in the case of executing
   a query against a connection pool, errors acquiring a connection.


## ResultSet

**Responsibility:** Present results from a driver-specific query with a
consistent interface. `ResultSet` is a plain object with the following
properties:

  * `rowCount` - The driver reported number of rows returned/inserted/updated.
  * `rows` - An array of rows (plain objects) returned by the query. May be
		empty even when rows were returned if `query.buffer(false)` was called.


## ConnectionPool

**Responsibility:** Transparently manage multiple connections using the same
connection URL. Provides "anonymous" query execution for queries that do not
need to share a session with other queries.

### Interface

**Singleton Methods**

 * `ConnectionPool.create(url[, poolOpts])` - Create and return a new pool
   instance using `url` and `poolOpts`. `url` should be a string useable by
   parameters for `ConnectionAdapter.create`. The specific `ConnectionAdapter`
   to use will be determined by the url protocol.

   `poolOpts` can be an object with any of the following keys (defaults shown).

        {
          name: "Unique Name",
          min: 2,
          max: 10,
          afterConnect: function (conn, done) {
            // Called immediately after a connection is first established.
            // Use this to do one time setup of new connections.
            done(null, conn);
          },
          reset: function (conn, done) {
            // Called each time the connection is returned to the pool.
            // Make sure to either call the driver adapters reset method or
            // perform the same actions in your own handler if you over-ride
            // this.
            conn.reset(done)
          },
          beforeDestroy: function (conn, destroy) {
            // Called immediately before a connection is closed. The destroy
						// callback takes no arguments and will call `conn.end()`
          }
        }
   
**Singleton Attributes**

 * `ConnectionPool.pools[url|name]` - An object mapping urls or names to existing pools.

**Instance Methods**

 * `query(statement[, params][, callback])` - The same as
   `ConnectionAdapter.query`, but the query is executed against the first
   available connection from the pool.
 * `begin([callback])` - Return a new `Transaction` object. If `callback` is given
   it will be called after a connection has been established or with an error
   if one arises.
 * `acquire(callback)` - If you **really** need a connection to hang on to outside
   of any transaction, this will give it to you, but you are responsible for
   returning the connection manually!
 * `release(conn)` - Give back a previously `acquire`d connection.
 * `destroy(conn)` - Give back a connection, telling the pool that it should no
	 longer be used.

**Events**

 * `'created', conn` - Emitted when a new connection has been created.

## Transaction

**Responsibility:** Wrap a `ConnectionAdapter` and so that all queries take place
within a single database transaction. Unhandled query errors will be emitted by
the transaction object itself and cause an automatic rollback.

### Interface

**Methods**

 * `query(statement[, params][, callback])` - The same as `ConnectionAdapter.query`
   except queries are guaranteed to be performed within the transaction. If the
   transaction has been committed or rolled back calls to `query` will fail.
 * `commit([callback])` - Issue a `COMMIT` statement to the database. If
   `callback` is given it will be called with any errors (or `null`) after the
   `COMMIT` statement executes. The transaction object will be unusable after
   calling `commit()`.
 * `rollback([callback])` - The same as `commit()` but rolling back the
   transaction. Again, the transaction will be unusable after calling this
   method.

**Events**
 * `'committed'` - Emitted after the transaction has successfully committed.
 * `'rolled back'` - Emitted after the transaction has rolled back.
 * `'error', err` - Emitted under three conditions:
   1. There was an error acquiring a connection.
   2. Any query performed in this transaction emits an error that would otherwise
      go unhandled.
   3. Any of `query`, `commit`, or `rollback` are called after the connection has
      already been committed or rolled back.
