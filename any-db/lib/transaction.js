var inherits = require('util').inherits
var StateMachine = require('./state-machine')

module.exports = Transaction

inherits(Transaction, StateMachine)
function Transaction(opts) {
  opts = opts || {};
  if (typeof opts.createQuery != 'function') {
    throw new Error('opts.createQuery is not a function!');
  }
  this._createQuery = opts.createQuery
  this._statements = {
    begin:    opts.begin || 'BEGIN',
    commit:   opts.commit || 'COMMIT',
    rollback: opts.rollback || 'ROLLBACK'
  }
  this._queue = []
  this._nestingLevel = opts.nestingLevel || 0

  this.handleError = forwardOrEmitError.bind(this)

  StateMachine.call(this, 'pending', {
    'query': {
      null:           rejectQuery,
      'pending':        queueQuery,
      'opening':        queueQuery,
      'dequeueing':     queueQuery,
      'blocked':        queueQuery,
      'open':           doQuery,
      'rollback:start': rejectQuery,
      'commit:start':   rejectQuery,
      'errored':        rejectQuery
    },
    'rollback': {
      'open':       doRollback,
      'pending':    queueRollback,
      'opening':    queueRollback,
      'dequeueing': queueRollback,
      'blocked':    queueRollback,
      'errored':    doRollback,
      // Allow rollback to be called repeatedly
      'rollback:start':    function (cb) { if (cb) cb() },
      'rollback:complete': function (cb) { if (cb) cb() }
    },
    'commit': {
      'open':       doCommit,
      'pending':    queueCommit,
      'opening':    queueCommit,
      'dequeueing': queueCommit,
      'blocked':    queueCommit
    }
  },
  // The valid state transitions.
  // A transition to 'errored' is *always* allowed.
  {
    'pending':        [ 'opening' ],
    'opening':        [ 'dequeueing' ],
    'dequeueing':     [ 'open', 'blocked', 'rollback:start', 'commit:start' ],
    'open':           [ 'open', 'blocked', 'rollback:start', 'commit:start' ],
    'blocked':        [ 'dequeueing' ],
    'errored':        [ 'rollback:start' ],
    'rollback:start': [ 'rollback:complete' ],
    'commit:start':   [ 'commit:complete' ]
  }, this.handleError)
}

// create a .begin method that can be patched on to connection objects
Transaction.createBeginMethod = function (createQuery, asyncConnection) {
  return function (beginStatement, callback) {
    if (beginStatement && typeof beginStatement == 'function') {
      callback = beginStatement;
      beginStatement = undefined;
    }
    var tx = new Transaction({
      createQuery: createQuery,
      begin: beginStatement
    })
    if (callback) {
      tx.once('error', callback)
        .once('open', function () {
          tx.removeListener('error', callback);
          callback(null, tx);
        })
    }
    if (asyncConnection) return tx;
    return tx._setConnection(this)
  }
}

Transaction.prototype.begin = function (callback) {
  var nestingLevel = this._nestingLevel + 1;
  var savepointName = 'sp_' + nestingLevel;

  var childTx = new Transaction({
    createQuery: this._createQuery,
    nestingLevel: nestingLevel,
    begin:    'SAVEPOINT ' + savepointName,
    commit:   'RELEASE ' + savepointName,
    rollback: 'ROLLBACK TO ' + savepointName
  });

  childTx
    .on('query', this.emit.bind(this, 'query'))
    .once('opening', this.state.bind(this, 'blocked'))
    .once('commit:complete',   this._runQueue.bind(this))
    .once('rollback:complete', this._runQueue.bind(this))

  if (callback) {
    childTx
      .once('error', callback)
      .once('open', function () {
        childTx.removeListener('error', callback)
        callback(null, childTx)
      })
  }

  switch (this.state()) {
  case 'open':
    childTx._setConnection(this._connection)
    break
  case 'pending': case 'opening': case 'dequeueing': case 'blocked':
    this._queue.push(childTx)
    break
  default:
    var msg = "Cannot begin child transaction in state '" + this.state() + "'"
    this.handleError(new Error(msg), callback)
  }
  return childTx
}

Transaction.prototype._setConnection = function (connection) {
  if (!this.state('opening')) return this

  this._connection = connection
  this._connection.on('error', this.handleError)
  this.once('rollback:complete', unsubErrors.bind(this))
  this.once('commit:complete', unsubErrors.bind(this))

  var queryObject = connection.query(this._statements.begin, function (err) {
    if (err) return this.handleError(err)
    this._runQueue()
  }.bind(this))

  this.emit('query', queryObject)
  return this
}

function unsubErrors() {
  this._connection.removeListener('error', this.handleError);
  delete this._connection
}

Transaction.prototype._runQueue = function () {
  if (!this.state('dequeueing')) return
  var self = this
  next();

  function next () {
    var state = self.state()
    if (state == 'errored' || state.match('rollback')) return
    var conn = self._connection
      , handleError = self.handleError
      , task = self._queue.shift()

    if (!task) {
      // The queue is empty, queries can now go directly to the connection.
      self.state('open');
      return
    }

    if (task instanceof Transaction) {
      var childTx = task
      if (!childTx.listeners('error').length) {
        childTx.on('error', handleError)
      }
      childTx._setConnection(conn)
    } else {
      var query   = task
      var cbName  = query._callback ? '_callback' : 'callback'
      var queryCb = query[cbName]
      if (queryCb) {
        query[cbName] = function (err, res) {
          if (err) return handleError(err, queryCb)
          else if (queryCb) queryCb(null, res)
        }
      } else {
        query.once('error', function (err) {
          if (!query.listeners('error').length) handleError(err)
        })
      }
      self.emit('query', query)
      conn.query(query)

      // Node 0.10 changed the behaviour of EventEmitter.listeners, so we need
      // to do a little poking at internals here.
      query.on('end', next)
      if (query.listeners('end').length > 1) {
        var listeners = query._events.end
        listeners.unshift(listeners.pop())
      }
    }
  }
}

var queueQuery = function (stmt, params, callback) {
  var query = this._createQuery(stmt, params, callback)
  this._queue.push(query)
  return query
}

var doQuery = function (stmt, params, callback) {
  if (typeof params == 'function') {
    callback = params
    params = undefined
  }
  var queryObject = this._connection.query(stmt, params, callback)
  this.emit('query', queryObject)
  if (!callback) queryObject.on('error', this.handleError)
  return queryObject
}

var rejectQuery = function (stmt, params, callback) {
  var q = this._createQuery(stmt, params, callback)
    , msg = "Cannot query in '" + this.state() + "' state. Query: " + stmt
    , err = new Error(msg)
    ;
  process.nextTick(function () {
    if (callback) callback(err)
    else q.emit('error', err)
  })
  return q
}

// Calling 'commit' or 'rollback' on a newly created transaction must wait
// until the query queue has been cleared before doing anything.
;
var queueCommit = function (callback) {
  this.once('open', function () { this.commit(callback) })
}

var queueRollback = function (callback) {
  this.once('open', function () { this.rollback(callback) })
}

var doCommit = sqlTransition('commit')
var doRollback = sqlTransition('rollback')

function sqlTransition(action) {
  return function (callback) {
    var query = this._statements[action];
    if (this.state(action + ':start', callback)) {
      var queryObject = this._connection.query(query, function (err) {
        if (err) return this.handleError(err, callback)
        if (this.state(action + ':complete', callback)) {
          if (callback) callback()
        }
      }.bind(this))
      this.emit('query', queryObject)
    }
    return this
  }
}

function forwardOrEmitError(err, callback) {
  var propagate = callback || this.emit.bind(this, 'error')
  var rolledBack = this.state().match('rollback')
  this.state('errored')
  if (!rolledBack) {
    console.log("rolling back because", err);
    this.rollback(function (rollbackErr) {
      if (rollbackErr) {
        err = new RollbackFailedError(rollbackErr, err);
      }
      propagate(err)
    })
  }
  else process.nextTick(propagate.bind(this, err))
}

inherits(RollbackFailedError, Error);
function RollbackFailedError(rollbackErr, previous) {
  Error.captureStackTrace(this, RollbackFailedError);
  this.name = 'Rollback failed';
  this.message = rollbackErr + "\nError causing rollback: " + previous;
}
