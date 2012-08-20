inherits = require('util').inherits
EventEmitter = require('events').EventEmitter
Pool = require('generic-pool').Pool

inherits(ConnectionPool, EventEmitter)
function ConnectionPool (ctor, connParams, options) {

	this._disconnected = new ctor(connParams)

	options.create = options.afterCreate
		? function (cb) { options.afterCreate(new ctor(connParams), cb) }
		: function (cb) { new ctor(connParams).connect(cb) }
	options.destroy = options.beforeDestroy
		? function (conn) { options.beforeDestroy(conn, conn.end.bind(conn)) }
		: function (conn) { conn.end() }

	this._afterRelease = options.afterRelease || function (conn, next) {
		conn.query('ROLLBACK', next)
	}

  this._pool = new Pool(options)
}

ConnectionPool.prototype.query = function (statement, params, callback) {
  var self   = this
		, query = this._disconnected.createQueryProxy(statement, params, callback)

  this.connect(function (err, connection) {
    if (err) return query.handleError(err)
		connection._execute(query)
    query.on('end', self.release.bind(self, connection))
  })

  return query
}

ConnectionPool.prototype.connect = function (callback) {
  this._pool.acquire(callback)
}

ConnectionPool.prototype.release = function (connection) {
  connection._live = false
  this._recycle(connection, function (err) {
    if (err) return this.destroy(connection)
    this._pool.release(connection)
  })
}

ConnectionPool.prototype.destroy = function (connection) {
  this._pool.destroy(connection)
}

ConnectionPool.prototype.close = function () {
	var self = this
	this._pool.drain(function () {
		self._pool.destroyAllNow()
		self.emit('close')
	})
}

ConnectionPool.prototype._recycle = function (connection, cb) {
		debugger
  this._recycleStatements.forEach(connection.query.bind(connection))
  connection.on('drain', cb)
  connection.on('error', cb)
}
