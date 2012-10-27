var queryMethod = require("./adapters/helpers").queryMethod
var EventProxy = require('./event-proxy')
var StateMachine = require('./state-machine')
var QueryAdapter = require('./query-adapter')

module.exports = Transaction

require('util').inherits(Transaction, EventProxy)

function Transaction () {
	StateMachine.call(this, 'pending', {
		'query': {
			'pending':      queueQuery,
			'opening':      queueQuery,
			'open':         doQuery,
			'rolling back': rejectQuery,
			'rolled back':  rejectQuery,
			'committing':   rejectQuery,
			'committed':    rejectQuery,
			'errored':      rejectQuery,
		}
	}, {
		'pending':      [ 'opening' ],
		'opening':      [ 'dequeueing' ],
		'dequeueing':   [ 'open' ],
		'open':         [ 'open', 'rolling back', 'committing' ],
		'committing':   [ 'committed' ],
		'rolling back': [ 'rolled back' ],
	}, this.handleError)

	this._queue = []
	this.query = queueQuery
	this.log = false
}

Transaction.prototype.handleError = function (err, callback) {
	var self = this
	process.nextTick(function () {
		self.state('errored')
		console.error(err)
		if (callback) callback(err)
		else self.emit('error', err)
	})
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
	if (!this.state('dequeueing')) return
	var i = 0
	  , handleError = this.handleError.bind(this, callback)
		, next
	;(next = (function () {
		var conn = this._connection
		var args = this._queue[i++]
		if (args) {
			if (this.log) this.log(args[0])
			var qa = conn.query.apply(conn, args)
			qa.listeners('end').unshift(next)
			// If no callback was given, the Transaction handles any errors
			if (!args[2]) qa.on('error', handleError)
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
	return this._connection.query(stmt, params, callback)
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

Transaction.prototype.commit = sqlTransition('committing', 'committed', 'commit')
Transaction.prototype.rollback = sqlTransition('rolling back', 'rolled back', 'rollback')

function sqlTransition (stateNow, stateAfter, stmt) {
	return function (callback) {
		var self = this
		if (!this.state(stateNow, callback)) return this
		return this._connection.query(stmt, callback).on('end', function () {
			self.state(stateAfter)
		})
	}
}
