var queryMethod = require("./helpers").queryMethod
var EventProxy = require('./event-proxy')
var StateMachine = require('./state-machine')
var QueryAdapter = require('./query-adapter')

module.exports = Transaction

require('util').inherits(Transaction, EventProxy)

function Transaction () {
	this.handleError = _handleError.bind(this)

	StateMachine.call(this, 'pending', {
		'query': {
			'pending':     queueQuery,
			'opening':     queueQuery,
			'dequeueing':  queueQuery,
			'open':        doQuery,
			'rolled back': rejectQuery,
			'committed':   rejectQuery,
			'errored':     rejectQuery,
		},
		// Allow rollback to be called repeatedly
		'rollback': {
			'rolled back': function () {}
		}
	}, {
		'pending':      [ 'opening' ],
		'opening':      [ 'dequeueing' ],
		'dequeueing':   [ 'open', 'rolled back', 'committed' ],
		'open':         [ 'open', 'rolled back', 'committed' ],
	}, this.handleError)

	this._queue = []
	this.query = queueQuery
	this.log = false
}

function _handleError (err, callback) {
	var propagate = callback || this.emit.bind(this, 'error')
	if (this.state() != 'rolled back') this.rollback(function (rollbackErr) {
		if (rollbackErr) {
			err = new Error('Failed to rollback transaction: ' + rollbackErr
			                + '\nError causing rollback: ' + err)
		}
		propagate(err)
	})
	else process.nextTick(propagate)
}

Transaction.prototype.begin = function (conn, callback) {
	if (!this.state('opening', callback)) return this
	var self = this
	if (this.log) this.log('starting transaction')
	conn.query('begin', function (err) {
		if (err) return self.handleError(err, callback)
		self._connection = conn
		self.proxyEvent(conn, 'error')
		self._runQueue(callback)
	})
	return this
}

Transaction.prototype._runQueue = function (callback) {
	if (!this.state('dequeueing', callback)) return
	var i = 0
	  , self = this
		, next
	;(next = (function () {
		var conn = this._connection
		var args = this._queue[i++]
		if (args) {
			this.log && this.log(args[0])
			var qa = conn.query.apply(conn, args)
			qa.listeners('end').unshift(next)
			// If no callback was given, the Transaction handles any errors
			if (!args[2]) qa.on('error', self.handleError)
		} else {
			// The queue is empty, queries can now go directly to the connection.
			this._queue = null
			if (this.state('open', callback) && callback) callback(null, this)
		}
	}).bind(this))()
}

var queueQuery = queryMethod(function (stmt, params, callback) {
	var qa = new QueryAdapter()
	this._queue.push([stmt, params, callback, qa])
	return qa
})

var doQuery = queryMethod(function (stmt, params, callback) {
	var qa = this._connection.query(stmt, params, callback)
	if (!callback) qa.on('error', this.handleError)
	return qa
})

var rejectQuery = queryMethod(function (stmt, params, callback) {
	var self = this
	  , qa = new QueryAdapter
	  , msg = "Cannot perform query in '" + this.state() + "' state. Query: " + stmt
	  , err = new Error(msg)
	process.nextTick(function () {
		if (callback) callback(err)
		else qa.emit('error', err)
	})
	return qa
})

Transaction.prototype.commit = sqlTransition('committed', 'commit')
Transaction.prototype.rollback = sqlTransition('rolled back', 'rollback')

function sqlTransition (newState, stmt) {
	return function (callback) {
		var self = this
		if (this.state(newState, callback)) {
			this._connection.query(stmt, callback)
		}
		return this
	}
}
