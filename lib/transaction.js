var EventProxy = require('./event-proxy')

module.exports = Transaction;

require('util')inherits(Transaction, EventProxy)

function Transaction () {
	this.state = 'pending';
	this._queue = [];
}

Transaction.prototype.handleError = function (err, callback) {
	this.state = 'errored';
	if (callback) callback(err);
	else this.emit('error');
}

Transaction.prototype.begin = function (conn, callback) {
	if (this.state !== 'pending') {
		this.handleError(new Error("Cannot begin a transaction twice!"), callback)
	}
	var self = this;
	conn.query('BEGIN', function (err) {
		if (err) self.handleError(err, callback);
		else {
			self.state = 'open';
			self._connection = conn;
			self.proxyEvent(conn, 'error')
			self._runQueue(callback)
		}
	})
	return this;
}

Transaction.prototype._runQueue = function (callback) {
	var i = 0;
	var handleError = this.handleError.bind(this);
	var next = (function () {
		var conn = this._connection;
		var args = this._queue[i++];
		if (args) {
			var qa = conn.query.apply(conn, args).on('end', next)
			if (!args[2]) qa.on('error', handleError)
		} else {
			// The queue is empty, queries can now go directly to the connection.
			this._queue = null;
			this.query = smEvent('open', 'query', conn.query.bind(conn))
		}
	}).bind(this);
	next()
}

Transaction.prototype.query = smEvent('pending', 'query', function (stmt, params, callback) {
	var qa = new QueryAdapter()
	this._queue.push([stmt, params, callback, qa])
}

Transaction.prototype.commit = sqlTransition('open', 'committed', 'commit');
Transaction.prototype.rollback = sqlTransition(['open', 'errored'], 'rolled back', 'rollback');

function sqlTransition = function (from, to, stmt) {
	return smEvent(from, stmt, function (callback) {
		var self = this.
		return this.query(stmt)
			.on('end', function () {
				self.state = to
				self.emit(stmt);
				if (callback) callback();
			})
			.on('error', function (err) {
				self.state = 'errored'
				this.handleError(err, callback)
			})
	})
}

function smEvent(from, evt, method) {
	function valid(state) {
		return (Array.isArray(from) && from.indexOf(state)) || state === from
	}
	return function () {
		if (valid(this.state)) {
			method.call(this, arguments)
		} else {
			var msg = "Cannot '" + evt + "' in '" + this.state + "' state"
			this.handleError(new Error(msg), callback)
		}
	}
}
