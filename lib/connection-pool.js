var inherits     = require('util').inherits
var parse        = require('url').parse
var EventEmitter = require('events').EventEmitter
var _Pool        = require('generic-pool').Pool

var chain        = require('./chain')
var adapters     = require('./adapters')
var QueryAdapter = require('./query-adapter')

module.exports = Pool

inherits(Pool, EventEmitter)

function Pool (factory, connParams, options) {
	options.create = options.afterConnect
		? function (ready) {
				factory(connParams, function (err, conn) {
					if (err) ready(err);
					else afterConnect(conn, ready)
				})
			}
		: function (ready) { factory(connParams, ready) }

	function destroy (conn) {
		conn.end()
		conn._events = {}
	}

	options.destroy = options.beforeDestroy
		? function (conn) { options.beforeDestroy(conn, conn.end.bind(conn)) }
		: function (conn) { conn.end() }

	var steps = [function (conn, next) { conn._events = {}; next() }]
	if (factory.reset) steps.unshift(factory.reset);
	if (options.reset) steps.unshift(options.reset)
	this._reset = chain(steps);
	this._pool = new _Pool(options)
}

Pool.pools = {}

Pool.create = function create (url, opts) {
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

Pool.prototype.query = function (statement, params, callback) {
	var self = this
		, qa = new QueryAdapter()

	this.acquire(function (err, conn) {
		if (err) return qa.handleError(err)
		conn.query(statement, params, callback, qa);
		qa.on('end', self.release.bind(self, conn))
	})

	return qa
}

Pool.prototype.acquire = function (callback) {
	this._pool.acquire(callback);
}

Pool.prototype.release = function (connection) {
	var self = this
	if (this._reset) {
		this._reset(connection, function (err) {
			if (err) return self._pool.destroy(connection)
			self._pool.release(connection)
		})
	} else {
		this._pool.release(connection);
	}
}

Pool.prototype.destroy = function (connection) {
	this._pool.destroy(connection)
}

Pool.prototype.begin = function (callback) {
	var t = new Transaction();
	this.acquire(function (err, conn) {
		if (err) t.handleError(err, callback);
		else t.begin(conn, callback);
	})
	return t;
}

Pool.prototype.close = function () {
	var self = this
	this._pool.drain(function () {
		self._pool.destroyAllNow()
		self.emit('close')
	})
}
