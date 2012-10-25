var queryMethod = require("./adapters/helpers").queryMethod
var EventProxy = require('./event-proxy')
var QueryAdapter = require('./query-adapter')

module.exports = Transaction;

require('util').inherits(Transaction, EventProxy)

function Transaction () {
	var transitions = {
		'pending':      { 'opening': true },
		'opening':      { 'dequeueing': true },
		'dequeueing':   { 'open': true },
		'open':         { 'open': true, 'rolling back': true, 'committing': true },
		'committing':   { 'committed': true },
		'rolling back': { 'rolled back': true },
		'errored':      { 'rolled back': true },
		'rolled back':  { 'opening': true }
	}

	var currentState = 'pending'
	this._state = function (to, callback) {
		if (!to) return currentState;

		var valid = transitions[currentState]

		if (to === 'errored' || valid && valid[to]) {
			var self = this;
			if (self.log) self.log("Transition from:'" + currentState + "' to:'" + to + "'")
			currentState = to;
			self.emit('state:' + currentState)
			return true
		} else {
			var msg = "Illegal transition from:'" + currentState + "' to:'" + to + "'"
			this.handleError(new Error(msg), callback)
			return false
		}
	}
	this._queue = [];
	this.query = queueQuery;
	this.log = false
}

Transaction.prototype.handleError = function (err, callback) {
	var self = this;
	process.nextTick(function () {
		this._state('errored');
		console.error(err)
		if (callback) callback(err)
		else this.emit('error', err)
	})
}

Transaction.prototype.begin = function (conn, callback) {
	if (!this._state('opening', callback)) return this;
	var self = this;
	if (this.log) this.log('starting transaction')
	conn.query('begin', function (err) {
		if (err) return self.handleError(err, callback);
		self._connection = conn;
		self.proxyEvent(conn, 'error')
		self._runQueue(callback)
	})
	return this;
}

Transaction.prototype._runQueue = function (callback) {
	if (!this._state('dequeueing')) return
	var i = 0;
	var handleError = this.handleError.bind(this);
	var next = (function () {
		var conn = this._connection;
		var args = this._queue[i++];
		if (args) {
			if (this.log) this.log(args[0])
			var qa = conn.query.apply(conn, args)
			qa.listeners('end').unshift(next)
			// If no callback was given, the Transaction handles any errors
			if (!args[2]) qa.on('error', handleError)
		} else {
			// The queue is empty, queries can now go directly to the connection.
			this._queue = null;
			this.query = doQuery
			if (this._state('open', callback) && callback) callback()
		}
	}).bind(this);
	next()
}

var queueQuery = queryMethod(function (stmt, params, callback) {
	var qa = new QueryAdapter()
	this._queue.push([stmt, params, callback, qa])
	return qa
})

var doQuery = queryMethod(function (stmt, params, callback) {
	if (!this._state('open', callback)) return this
	var conn = this._connection;
	return conn.query(stmt, params, callback)
})

Transaction.prototype.commit = sqlTransition('committing', 'committed', 'commit');
Transaction.prototype.rollback = sqlTransition('rolling back', 'rolled back', 'rollback');

function sqlTransition (stateNow, stateAfter, stmt) {
	return function (callback) {
		var self = this;
		if (!this._state(stateNow, callback)) return this
		return this._connection.query(stmt, callback).on('end', function () {
			self._state(stateAfter)
		})
	}
}
