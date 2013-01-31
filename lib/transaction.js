var inherits = require('util').inherits
var StateMachine = require('./state-machine')

module.exports = Transaction

inherits(Transaction, StateMachine)
function Transaction (createQuery) {
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
		'rollback': {
			'errored': doRollback,
			'open': doRollback,
			// Allow rollback to be called repeatedly
			'rolled back': function (cb) { if (cb) cb() }
		},
		'commit': {
			'open': doCommit
		}
	}, {
		'pending':    [ 'opening' ],
		'opening':    [ 'dequeueing' ],
		'dequeueing': [ 'open', 'rolled back', 'committed' ],
		'open':       [ 'open', 'rolled back', 'committed' ],
		'errored':    [ 'rolled back' ],
	}, this.handleError)

	this._queue = []
	this._createQuery = createQuery
	this.log = false
}

// create a .begin method that can be patched on to connection objects
Transaction.createBeginMethod = function (createQuery) {
	return function (callback) {
		var t = new Transaction(createQuery)
		t.begin(this, callback)
		return t
	}
}

Transaction.createPoolBeginMethod = function (pool, createQuery) {
	return function (callback) {
		var t = new Transaction(createQuery)
		pool.acquire(function (err, conn) {
			if (err) return callback ? callback(err) : t.emit('error', err)
			t.begin(conn, callback)
			var release = pool.release.bind(pool, conn)
			t.once('rolled back', release)
			t.once('committed', release)
		})
		return t
	}
}

function _handleError (err, callback) {
	var propagate = callback || this.emit.bind(this, 'error')
	var rolledBack = this.state() == 'rolled back'
	this.state('errored')
	if (!rolledBack) this.rollback(function (rollbackErr) {
		if (rollbackErr) {
			err = new Error('Failed to rollback transaction: ' + rollbackErr
			                + '\nError causing rollback: ' + err)
		}
		propagate(err)
	})
	else process.nextTick(propagate.bind(this, err))
}

Transaction.prototype.begin = function (conn, callback) {
	if (!this.state('opening', callback)) return this
	var self = this
	if (this.log) this.log('starting transaction')
	conn.query('begin', function (err) {
		if (err) return self.handleError(err, callback)
		self._connection = conn
		conn.on('error', self.handleError)
		var removeErrorListener = conn.removeListener.bind(conn, 'error', self.handleError)
		self.once('rolled back', removeErrorListener)
		self.once('committed', removeErrorListener)
		self._runQueue(callback)
	})
	return this
}

Transaction.prototype._runQueue = function (callback) {
	if (!this.state('dequeueing', callback)) return
	var next = function () {
		var state = this.state()
		if (state == 'errored' || state == 'rolled back') return
		var conn = this._connection
		var query = this._queue.shift()
		var handleError = this.handleError
		if (query) {
			this.log && this.log(query)
			// TODO - ask @brianc about changing pg.Query to use '_callback'
			var cbName = query._callback ? '_callback' : 'callback'
			var queryCb = query[cbName]
			if (queryCb) {
				query[cbName] = function (err, res) {
					if (err) return handleError(err, queryCb)
					else if (queryCb) queryCb(err, res)
				}
			} else {
				query.once('error', function (err) {
					query.listeners('error').length || handleError(err)
				})
			}
			conn.query(query)
			query.listeners('end').unshift(next)
		} else {
			// The queue is empty, queries can now go directly to the connection.
			this._queue = null
			if (this.state('open', callback) && callback) callback(null, this)
		}
	}.bind(this)
	next()
}

var queueQuery = function (stmt, params, callback) {
	var q = this._createQuery(stmt, params, callback)
	this._queue.push(q)
	return q
}

var doQuery = function (stmt, params, callback) {
	if (typeof params == 'function') {
		callback = params
		params = undefined
	}
	var q = this._connection.query(stmt, params, callback)
	if (!callback) q.on('error', this.handleError)
	return q
}

var rejectQuery = function (stmt, params, callback) {
	var q = this._createQuery(stmt, params, callback)
	  , msg = "Cannot perform query in '" + this.state() + "' state. Query: " + stmt
	  , err = new Error(msg)
		;
	process.nextTick(function () {
		if (callback) callback(err)
		else q.emit('error', err)
	})
	return q
}

// Calling 'commit' or 'rollback' on a newly created transaction must wait until
// the query queue has been cleared before doing anything.
;['commit', 'rollback'].forEach(function (method) {
	Transaction.prototype[method] = function (callback) {
		this.once('open', function () {
			this[method](callback)
		})
	}
})

function sqlTransition (newState, stmt) {
	return function (callback) {
		if (this.state(newState, callback)) {
			this._connection.query(stmt, callback)
		}
		return this
	}
}

var doCommit = sqlTransition('committed', 'commit')
var doRollback = sqlTransition('rolled back', 'rollback')
