module.exports = ConnectionPool

inherits = require('util').inherits
EventEmitter = require('events').EventEmitter
Pool = require('generic-pool').Pool
//

inherits(ConnectionPool, EventEmitter)
function ConnectionPool (ctor, connParams, options) {
	var sl3 = ctor === require('./adapters/sqlite3')
	options.create = options.afterCreate
		? function (ready) { options.afterCreate(new ctor(connParams), ready) }
		: function (ready) { new ctor(connParams).connect(ready) }

	options.destroy = options.beforeDestroy
		? function (conn) { options.beforeDestroy(conn, conn.end.bind(conn)) }
		: function (conn) { conn.end() }

	// Annoying workaround for sqlite going crashy if you rollback without being
	// in a transaction.
	if (options.afterRelease) {
		this._afterRelease = options.afterRelease
	} else if (ctor !== require('./adapters/sqlite3')) {
		this._afterRelease = function (conn, ready) { conn.query('ROLLBACK', ready) }
	} else {
		this._afterRelease = function (conn, ready) { ready() }
	}
	options.name = connParams

	this._pool = new Pool(options)
}

ConnectionPool.prototype.query = function (statement, params, callback) {
	var self	 = this
		, query = new QueryProxy(statement, params, callback)

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
	var self = this
	this._afterRelease(connection, function (err) {
		if (err) return self._pool.destroy(connection)
		self._pool.release(connection)
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
