var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter
var GenericPool  = require('generic-pool').Pool
var chain        = require('./lib/chain')

module.exports = ConnectionPool

inherits(ConnectionPool, EventEmitter)

function ConnectionPool(adapter, connParams, options) {
  if (!(this instanceof ConnectionPool)) {
    return new ConnectionPool(adapter, connParams, options)
  }
  EventEmitter.call(this)

  options    = options    || {}
  connParams = connParams || {}
  if (options.create) {
    console.warn("PoolConfig.create ignored, use PoolConfig.onConnect instead")
  }
  if (options.destroy) {
    console.warn("PoolConfig.destroy ignored")
  }

  if (adapter.name == 'sqlite3'
      && /:memory:$/i.test(connParams.database)
      && (options.min > 1 || options.max > 1))
  {
    console.warn(
      "Pools of more than 1 connection do not work for in-memory SQLite3 databases\n" +
      "The specified minimum (%d) and maximum (%d) connections have been overridden",
      options.min, options.max
    )
    if (options.min) options.min = 1
    options.max = 1
  }
  
  var onConnect = options.onConnect || function (c, done) { done(null, c) }

  var poolOpts = {
    min: options.min || 0,
    max: options.max || 10,
    create: function (ready) {
      adapter.createConnection(connParams, function (err, conn) {
        if (err) return ready(err);

        onConnect(conn, function (err, connection) {
          if (err) return ready(err);
          conn.on('error', self._handleIdleError)
          ready(null, connection)
        })
      })
    },

    destroy: function (connection) {
      connection.removeAllListeners()
      connection.on('error', function () {})
      connection.end()
    },

    log: options.log,

    idleTimeoutMillis: options.idleTimeout,
    reapIntervalMillis: options.reapInterval,
  }

  if (options.hasOwnProperty('refreshIdle')) {
    poolOpts.refreshIdle = options.refreshIdle
  }

  this._pool = new GenericPool(poolOpts)
  this._cancelledQueries = []

  var resetSteps = []
  if (adapter.reset) resetSteps.unshift(adapter.reset)
  if (options.reset) resetSteps.unshift(options.reset)
  this.adapter = adapter
  this._reset = chain(resetSteps)

  this._shouldDestroyConnection = function (err) {
    if (err instanceof CancelledQueryError) {
      return false
    }
    return options.shouldDestroyConnection ? options.shouldDestroyConnection(err) : true
  }

  var self = this
  self._handleIdleError = function (err) {
    var connection = this
    self._maybeDestroy(connection, err)
    self.emit('error', err, connection)
  }
}

ConnectionPool.prototype.query = function (statement, params, callback) {
  var self = this
    , query = this.adapter.createQuery(statement, params, callback)
    , connection = null

  if (query.callback) {
    callback = query.callback
    query.callback = function (err, result) {
      self._maybeDestroy(connection, err)
      callback(err, result)
    }
  } else {
    var finished = false
    query.once('end', function () {
      if (!finished) {
        finished = true
        self.release(connection)
      }
    })
    query.once('error', function (err) {
      if (!finished) {
        finished = true
        self._maybeDestroy(connection, err)
      }
      // If this was the only error listener, re-emit the error from the pool.
      if (!this.listeners('error').length) {
        self.emit('error', err, query)
      }
    })
  }

  /**
   * if a connection cannot be acquired, or emits an 'error' event while a
   * query is in progress, the error should be handled by the query object.
   */
  function handleConnectionError (error) {
    self._maybeDestroy(connection, error)
    forwardError(error)
  }

  function forwardError (error) {
    if (query.callback) {
      query.callback(error)
    } else {
      query.emit('error', error)
    }
  }

  this.acquire(function (err, connection_) {
    if (err) {
      return handleConnectionError(err)
    }
    err = self._checkCancellation(query)
    if (err) {
      return forwardError(err)
    }

    // expose the connection to everything else in the outer scope
    connection = connection_

    // attach error event listener to the connection
    connection.on('error', handleConnectionError)
    query.once('end', function () {
      connection.removeListener('error', handleConnectionError)
    })

    connection.query(query);
    self.emit('query', query)
  })

  return query
}

ConnectionPool.prototype.cancel = function (query) {
  this._cancelledQueries.push(query)
}

ConnectionPool.prototype.acquire = function (callback) {
  var self = this
  self._pool.acquire(function (err, connection) {
    if (err) return callback(err);
    connection.removeListener('error', self._handleIdleError)
    self.emit('acquire', connection)
    callback(null, connection)
  });
}

ConnectionPool.prototype.release = function (connection) {
  var self = this
  self.emit('release', connection)
  connection.removeAllListeners()
  self._reset(connection, function (err) {
    if (err) return self.destroy(connection);
    connection.on('error', self._handleIdleError)
    self._pool.release(connection)
  })
}

ConnectionPool.prototype.destroy = function (connection) {
  this._pool.destroy(connection)
}

ConnectionPool.prototype.close = function (callback) {
  var self = this
  this._pool.drain(function () {
    self._pool.destroyAllNow(function () {
      self.emit('close')
      if (callback) callback()
    })
  })
}

ConnectionPool.prototype._maybeDestroy = function (connection, error) {
  if (connection) {
    if (error && this._shouldDestroyConnection(error)) {
      this.destroy(connection)
    } else {
      this.release(connection)
    }
  }
}

ConnectionPool.prototype._checkCancellation = function (query) {
  var cancelIndex = this._cancelledQueries.indexOf(query)
  if (cancelIndex >= 0) {
    this._cancelledQueries.splice(cancelIndex, 1)
    return new CancelledQueryError()
  }
}

inherits(CancelledQueryError, Error)
function CancelledQueryError() {
  Error.call(this)
  this.message = "Query was cancelled before connection was acquired"
  this.name = "CancelledQueryError"
}