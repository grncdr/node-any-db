/**
 * Transaction object
 *
 * connection state - connected, open, closed, errored
 * transaction state - begin, dequeue, open, commit, rollback
 */

var inherits = require('util').inherits
var StateMachine = require('./state-machine')

module.exports = Transaction

inherits(Transaction, StateMachine)
function Transaction (createQuery) {
	this.handleError = _handleError.bind(this)

	StateMachine.call(this, [
		{ to: 'created',
			methods: {
				query: queueQuery,
				rollback: queueRollback,
				commit: queueCommit }},
		{ from: 'created', to: 'opening',
			methods: { begin: reject('begin') }},
		{ from: 'opening', to: 'open',
			methods: {
				query: doQuery,
				rollback: doRollback,
				commit: doCommit }},
		{ from: '*',
			to: ['committed', 'rolled back', 'errored'],
			methods: {
				query: rejectQuery,
				commit: rejectCommit,
				rollback: doRollback }},
	], this.handleError)

	this._queue = []
	this._createQuery = createQuery
}

// create a .begin method that can be patched on to connection objects
Transaction.createBeginMethod = function (createQuery) {
	return function (callback) {
		var t = new Transaction(createQuery)
		t.begin(this, callback)
		return t
	}
}

Transaction.prototype.begin = function (conn, callback) {
	if (this.state('opening', callback)) {
		conn.query('begin', function (err) {
			if (err) return this.handleError(err, callback)
			this._connection = conn
			conn.on('error', this.handleError)
			var removeErrorListener = conn.removeListener.bind(conn, 'error', this.handleError)
			this.once('rolled back', removeErrorListener)
			this.once('committed', removeErrorListener)
			runQueue.call(this, callback)
		}.bind(this))
	}
	return this
}

function runQueue (callback) {
	var next = function () {
		var state = this.state()
			, handleError = this.handleError
			, query

		if (state == 'errored' || state == 'rolled back') return

		if (query = this._queue.shift()) {
			interceptErrors(query, handleError)
			this._connection.query(query)
			query.listeners('end').unshift(next)
		} else {
			// The queue is empty, queries can now go directly to the connection.
			this._queue = null
			if (this.state('open', callback)) if (callback) callback(null, this)
		}
	}.bind(this)
	next()
}

/**
 * Before performing a query we need to make sure any errors it causes will
 * trigger a rollback. The drivers themselves won't emit 'error'
 * events if the user gave a callback, so we need to wrap the callback attached
 * to the query if it's there.
 */
function interceptErrors(query, handleError) {
	// TODO - ask @brianc about changing pg.Query to use '_callback'

	var cbName = query._callback ? '_callback' : 'callback'
	var queryCb = query[cbName]
	if (queryCb) {
		// replace the callback
		query[cbName] = function (err, res) {
			if (err) return handleError(err, queryCb)
			else queryCb.call(this, err, res)
		}
	} else {
		// handle 'error' events
		query.on('error', handleError)
	}
}

var queueQuery = function (stmt, params, callback) {
	var query = this._createQuery(stmt, params, callback)
	this._queue.push(query)
	return query
}

var doQuery = function (stmt, params, callback) {
	var query = this._connection.query(stmt, params, callback)
	interceptErrors(query, this.handleError)
	return query
}

var rejectQuery = function (stmt, params, callback) {
	var q = this._createQuery(stmt, params, callback)
	if (typeof params == 'function') callback = params
	return reject('query', q).call(this, callback)
}

var reject = function (action, emitter) {
	return function (callback) {
		var msg = "Cannot '" + action + "' in '" + this.state() + "' state"
			, err = new Error(msg)
			;

		if (!emitter) emitter = this

		process.nextTick(function () {
			if (callback) callback(err)
			else emitter.emit('error', err)
		})

		return emitter
	}
}

var queueCommit  = whenOpen('commit')
var doCommit     = sqlTransition('committed', 'commit')
var rejectCommit = reject('commit')

var queueRollback  = whenOpen('rollback')
var doRollback     = sqlTransition('rolled back', 'rollback')
var rejectRollback = reject('rollback')

// Calling 'commit' or 'rollback' on a newly created transaction must wait until
// the query queue has been cleared before doing anything.
function whenOpen (method) {
	return function (callback) {
		this.once('open', function () { this[method](callback) })
	}
}

function sqlTransition (newState, stmt) {
	return function (callback) {
		if (this.state(newState, callback)) {
			this._connection.query(stmt, callback)
		}
		return this
	}
}

function _handleError (err, callback) {
	var propagate = callback || this.emit.bind(this, 'error')
	var rolledBack = this.state() == 'rolled back'
	this.state('errored')
	if (rolledBack) process.nextTick(propagate.bind(this, err))
	else this.rollback(function (rollbackErr) {
		if (rollbackErr) {
			debugger
			err = new Error('Failed to rollback transaction: ' + rollbackErr
			                + '\nError causing rollback: ' + err)
		}
		propagate(err)
	})
}
