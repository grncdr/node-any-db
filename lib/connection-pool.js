var inherits     = require('util').inherits
var parse        = require('url').parse
var EventEmitter = require('events').EventEmitter
var Pool         = require('generic-pool').Pool

var chain        = require('./chain')
var adapters     = require('./adapters')
var queryMethod  = require('./helpers').queryMethod
var Transaction  = require('./transaction')

module.exports = ConnectionPool

inherits(ConnectionPool, EventEmitter)

function ConnectionPool (adapter, connParams, options) {
	EventEmitter.call(this)

	var poolOpts = {
		min: options.min,
		max: options.max,
		create: options.onConnect
			? function (ready) {
				adapter.create(connParams, function (err, conn) {
					if (err) ready(err);
					else options.onConnect(conn, ready)
				})
			}
			: function (ready) { adapter.create(connParams, ready) }
		,

		destroy: function (conn) {
			conn.end()
			conn._events = {}
		}
	}

	var resetSteps = [function (conn, next) { conn._events = {}; next() }]
	if (adapter.reset) resetSteps.unshift(adapter.create.reset);
	if (options.reset) resetSteps.unshift(options.reset)
	this._adapter = adapter
	this._reset = chain(resetSteps);
	this._pool = new Pool(poolOpts)
}

ConnectionPool.prototype.query = function (statement, params, callback) {
	var self = this
		, query = this._adapter.createQuery(statement, params, callback)

	this.acquire(function (err, conn) {
		if (err) return callback ? callback(err) : query.emit('error', err)
		conn.query(query);
		var release = self.release.bind(self, conn) 
		query.on('end', release).on('error', release)
	})

	return query
}

ConnectionPool.prototype.acquire = function (callback) {
	this._pool.acquire(callback);
}

ConnectionPool.prototype.release = function (connection) {
	var pool = self._pool
	this._reset(connection, function (err) {
		if (err) return pool.destroy(connection)
		pool.release(connection)
	})
}

ConnectionPool.prototype.destroy = function (connection) {
	this._pool.destroy(connection)
}

ConnectionPool.prototype.begin = function (callback) {
	var tx = new Transaction
	  , release = this.release.bind(this)

	this.acquire(function (err, conn) {
		if (err) tx.handleError(err, callback);
		else {
			release = release.bind(null, conn)
			tx.begin(conn, callback);
			tx.on('rolled back', release)
			tx.on('committed', release)
		}
	})
	return tx;
}

ConnectionPool.prototype.close = function () {
	var self = this
	this._pool.drain(function () {
		self._pool.destroyAllNow()
		self.emit('close')
	})
}
