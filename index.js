var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter
var Pool         = require('generic-pool').Pool
var once         = require('once')
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
    console.warn("PoolConfig.destroy ignored, use PoolConfig.onConnect instead")
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
  
  var poolOpts = {
    min: options.min || 0,
    max: options.max || 10,
    create: function (ready) {
      adapter.createConnection(connParams, function (err, conn) {
        if (err) return ready(err);
        else if (options.onConnect) options.onConnect(conn, ready)
        else ready(null, conn)
      })
    },
    destroy: function (conn) {
      conn.end()
      conn._events = {}
    },

    log: options.log
  }

  var resetSteps = [];
  if (adapter.reset) resetSteps.unshift(adapter.reset)
  if (options.reset) resetSteps.unshift(options.reset)
  this.adapter = adapter
  this._reset = chain(resetSteps)
  this._pool = new Pool(poolOpts)
}

ConnectionPool.prototype.query = function (statement, params, callback) {
  var self = this
    , query = this.adapter.createQuery(statement, params, callback)

  this.acquire(function (err, conn) {
    if (err) {
      if (typeof params === 'function') {
        return params(err)
      } else if (callback) {
        return callback(err);
      } else {
        debugger
        return query.emit('error', err);
      }
    }
    conn.query(query);
    self.emit('query', query)
    var release = once(self.release.bind(self, conn))
    query.once('end', release).once('error', function (err) {
      release()
      // If this was the only error listener, re-emit the error from the pool.
      if (!this.listeners('error').length) {
        self.emit('error', err)
      }
    })
  })

  return query
}

ConnectionPool.prototype.acquire = function (callback) {
  this.emit('acquire')
  this._pool.acquire(callback);
}

ConnectionPool.prototype.release = function (connection) {
  this.emit('release')
  var self = this
  this._reset(connection, function (err) {
    if (err) return self.destroy(connection)
    self._pool.release(connection)
  })
}

ConnectionPool.prototype.destroy = function (connection) {
  this._pool.destroy(connection)
}

ConnectionPool.prototype.close = function (callback) {
  var self = this
  this._pool.drain(function () {
    self._pool.destroyAllNow()
    self.emit('close')
    if (callback) callback()
  })
}
