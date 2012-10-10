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
enought that the adapter portions can be obviated by the drivers themselves.

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
   execution without having to manually establish a connection.
 * Transaction objects present a query interface where all queries are performed
   within a single database transaction.
 * Result sets are an array containing rows (plain java script objects) plus
   some extra non-enumerable properties.

All of these objects (except result sets) are event emitters.

## Connection Adapters

**Responsibility:** Create and wrap driver-specific connection objects in an
object that implements (at minimum) the following interface.

### Interface

**Singleton Methods**

 * `Adapter.create(parsedURL, callback)` - A factory method attached to the
   Adapter constructor itself. This must create _and connect_ a new connection
   using the underlying driver. After a connection has been established `callback`
   must be called with any errors or the connection in the standard node.js style
   (`callback(err, connection)`).  

**Instance Methods**

 * `query(statement, [params], [callback])` - Execute statement (with `params`
   if they are given) and return a `QueryAdapter` for the in-progress query. If
   `callback` is given it must be passed to the `QueryAdapter` constructor.
 * `reset(callback)` - Set the connection back to a pristine state, for the next
   user e.g. by rolling back any open transactions. (Also see poolOpts.reset).
 * `close()` - Close the underlying connection and put this adapter in an
   unusable state. Calls to `query` made after `close()` has been called should
   construct a new Error instance and asynchronously either emit an error event
   or call `callback(error)` if a callback is given.

**Events**

 * `'error', err` - Emitted when `query` is called on a closed adapter, or there
   is an error in the underlying connection. In the latter case `err.orig`
   _must_ be the driver-specific error emitted by the underlying connection.
 * `'drain'` - Emitted when the connection runs out of queries to execute.

## Query Adapters

**Responsibility:** Act as a container for delayed execution of a query, and
provide an interface for application code to interact with the query during
execution.

### Interface

**Instance Methods**

 * `new QueryAdapter(statement, params[, callback])` - Saves the parameters
   for later use by a `ConnectionAdapter. `QueryAdapter` instances **must not**
   require a connection instance, as connection pools must be able to return them
   synchronously even without a connection available.
 * `buffer(boolean)` - If `boolean` is `false` result rows must not be buffered
   into a `ResultSet`. `QueryAdapter` instances buffer by default.
 * `cancel()` - Cancel the underlying query if the driver supports it. A
   `'cancel'` event must be emitted, and no events other than `'error'` may be
   emitted after a call to `cancel()`, even if the driver does not actually
   support cancelling queries.
 * `handleError(err)` - Either re-emit `err` or call `callback(err)` if it is
   present.

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
consistent interface. `ResultSet` inherits from `Array` and adds the following
non-enumerable properties:

  * `rowCount` - The driver reported number of rows returned/inserted/updated.


## Pool

**Responsibility:** Transparently manage multiple connections using the same
connection URL. Provides "anonymous" query execution for queries that do not
need to share a session with other queries.

### Interface

**Singleton Methods**

 * `Pool.create(url[, poolOpts])` - Create and return a new pool instance using
   `url` and `poolOpts`. `url` should be a string containing all the necessary
   parameters for `ConnectionAdapter.create`. The specific `ConnectionAdapter`
   to use will be determined by the url protocol.

   `poolOpts` can be an object with any of the following keys (defaults shown).

        {
          min: 2,
          max: 10,
          afterCreate: function (conn, done) {
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
          }
        }
   
   TODO - finish specifying/documenting pool opts.
 * `Pool.get(url|name)` - Get the pool created with `url` or `name`. **This will
   throw** if no such pool has been created.

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

**Events**

 * `'created', conn` - Emitted when a new connection has been created.

## Transaction

**Responsibility:** Wrap a `ConnectionAdapter` and return it to the connection pool when the transaction is either committed or rolled back. Roll back the transaction on any unhandled query errors before re-emitting them.

### Interface

**Methods**

 * `query(statement[, params][, callback])` - The same as `ConnectionAdapter.query`
   except queries are guaranteed to be performed within the transaction. If the
   transaction is committed or rolled back calls to `query` will fail.
 * `commit([callback])` - Issue a `COMMIT` statement to the database. If
   `callback` is given it will be called with any errors (or `null`) after the
   `COMMIT` statement executes. The transaction object will be unusable after
   calling `commit()`.
 * `rollback([callback])` - The same as `commit()` but rolling back the
   transaction. Again, the transaction will be unusable after calling this
   method.

**Events**
 * `'commit'` - Emitted after the transaction has successfully committed.
 * `'rollback'` - Emitted after the transaction has rolled back.
 * `'error', err` - Emitted under three conditions:
   1. There was an error acquiring a connection.
   2. Any query performed in this transaction emits an error that would otherwise
      go unhandled.
   3. Any of `query`, `commit`, or `rollback` are called after the connection has
      already been committed or rolled back.
