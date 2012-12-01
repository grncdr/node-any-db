var inherits     = require('util').inherits
var parse        = require('url').parse
var format       = require('url').format
var EventEmitter = require('events').EventEmitter
var Pool         = require('generic-pool').Pool

var chain        = require('./chain')
var adapters     = require('./adapters')
var queryMethod  = require('./helpers').queryMethod
var QueryAdapter = require('./query-adapter')
var Transaction  = require('./transaction')

module.exports = ConnectionPool

inherits(ConnectionPool, EventEmitter)

function ConnectionPool (adapter, connParams, options) {
	options.name = options.name || format(connParams)
	options.create = options.onConnect
		? function (ready) {
			adapter.create(connParams, function (err, conn) {
				if (err) ready(err);
				else afterConnect(conn, ready)
			})
		}
		: function (ready) { adapter.create(connParams, ready) }

	options.destroy = function (conn) {
		conn.end()
		conn._events = {}
	}

	var resetSteps = [function (conn, next) { conn._events = {}; next() }]
	if (adapter.reset) resetSteps.unshift(adapter.create.reset);
	if (options.reset) resetSteps.unshift(options.reset)
	this._reset = chain(resetSteps);
	this._pool = new Pool(options)
}

ConnectionPool.pools = {}

ConnectionPool.create = function create (url, opts) {
	if (Pool.pools[url]) {
		throw new Error("Pool '" + url + "' already exists");
	}
	if (opts && opts.name && Pool.pools[opts.name]) {
		throw new Error("Pool '" + name + "' already exists");
	}
	var parsed = parse(url, true);
	if (!parsed.protocol) throw new Error("No protocol specified!")
	var factory = adapters[parsed.protocol].create;
	return new Pool(factory, parsed, opts || {})
}

ConnectionPool.prototype.query = queryMethod(function (statement, params, callback) {
	var self = this
	  , qa = new QueryAdapter()

	this.acquire(function (err, conn) {
		if (err) return callback ? callback(err) : qa.emit('error', err)
		conn.query(statement, params, callback, qa);
		qa.on('end', self.release.bind(self, conn))
	})

	return qa
})

ConnectionPool.prototype.acquire = function (callback) {
	this._pool.acquire(callback);
}

ConnectionPool.prototype.release = function (connection) {
	var self = this
	this._reset(connection, function (err) {
		if (err) return self._pool.destroy(connection)
		self._pool.release(connection)
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
	})
}
