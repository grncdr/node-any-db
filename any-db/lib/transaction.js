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

  this.handleError = this.handleError.bind(this);

  StateMachine.call(this, 'disconnected', {
    'disconnected': DisconnectedTransaction,
    'connected':     ConnectedTransaction,
    'open':         OpenTransaction,
    'closed':       ClosedTransaction
  },
  // The valid state transitions.
  // A transition to 'errored' is *always* allowed.
  {
    'disconnected': [ 'connected' ],
    'connected':     [ 'open', 'closed' ],
    'open':         [ 'connected', 'closed' ]
  })
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
    return tx.setConnection(this)
  }
}

Transaction.prototype.handleError = function (err, callback) {
  var propagate = callback || this.emit.bind(this, 'error')
  var ended = /^clos/.test(this.state())
  if (!ended && this._connection) {
    OpenTransaction.prototype.rollback.call(this, function (rollbackErr) {
      if (rollbackErr) {
        err = new RollbackFailedError(rollbackErr, err);
      }
      propagate(err)
    })
  }
  else process.nextTick(propagate.bind(this, err))
}

Transaction.prototype._createChildTransaction = function (callback) {
  var nestingLevel = this._nestingLevel + 1;
  var savepointName = 'sp_' + nestingLevel;

  var tx = new Transaction({
    createQuery: this._createQuery,
    nestingLevel: nestingLevel,
    begin:        'SAVEPOINT ' + savepointName,
    commit:       'RELEASE SAVEPOINT ' + savepointName,
    rollback:     'ROLLBACK TO ' + savepointName
  })

  tx.on('query', this.emit.bind(this, 'query'))
    .once('connected', this.state.bind(this, 'connected'))
    .once('close',  ConnectedTransaction.prototype._runQueue.bind(this));

  if (callback) {
    tx.once('error', callback)
      .once('open', function () {
        tx.removeListener('error', callback)
        callback(null, tx)
      })
  }
  return tx
}

inherits(ConnectedTransaction, Transaction)
function ConnectedTransaction () {}

ConnectedTransaction.prototype.query = function (stmt, params, callback) {
  return this._queueTask(this._createQuery(stmt, params, callback))
}

ConnectedTransaction.prototype.begin = function (callback) {
  return this._queueTask(this._createChildTransaction(callback));
}

ConnectedTransaction.prototype.commit = queueMethodCall('commit');
ConnectedTransaction.prototype.rollback = queueMethodCall('rollback');

ConnectedTransaction.prototype._queueTask = function (task) {
  this._queue.push(task);
  return task;
}

function queueMethodCall (method) {
  return function () {
    this._queue.push([method, [].slice.call(arguments)])
  }
}

/**
 * Transactions start in the Disconnected state, this is identical to the
 * Connected state *except* there is an additional setConnection method
 * available.
 */
inherits(DisconnectedTransaction, ConnectedTransaction)
function DisconnectedTransaction () {}

DisconnectedTransaction.prototype.setConnection = function (connection) {
  if (!this.state('connected')) return this

  connection.on('error', this.handleError)
  this._connection = connection

  var queryObject = connection.query(this._statements.begin, function (err) {
    if (err) return this.handleError(err)
    this._runQueue()
  }.bind(this))

  this.emit('query', queryObject)
  return this
}

ConnectedTransaction.prototype._runQueue = function () {
  var self = this
  return next();

  function next (err) {
    if (/^clos/.test(self.state())) {
      debugger;
      return
    }
    if (err) {
      self._queue.splice(0, self._queue.length);
      return self.handleError(err);
    }
    if (!self._queue.length) {
      // The queue is empty, transition to fully open state
      self.state('open');
      return
    }

    var task = self._queue.shift()

    if      (Array.isArray(task))         self._runQueuedMethod(task, next)
    else if (task instanceof Transaction) self._runQueuedTransaction(task, next)
    else                                  self._runQueuedQuery(task, next);
  }
}

ConnectedTransaction.prototype._runQueuedMethod = function (task, next) {
  var method = task.shift()
    , args = task.shift()
    , last = args[args.length - 1]
    ;

  if (typeof last == 'function') {
    args[args.length - 1] = function (err) {
      if (err) return last(err);
      last.apply(this, arguments);
      next();
    }
  } else {
    args.push(next)
  }

  OpenTransaction.prototype[method].apply(this, args);
}

ConnectedTransaction.prototype._runQueuedTransaction = function (childTx) {
  if (!childTx.listeners('error').length) {
    childTx.on('error', this.handleError)
  }
  childTx.setConnection(this._connection)
}

ConnectedTransaction.prototype._runQueuedQuery = function (query, callback) {
  var self = this;
  var cbName  = query._callback ? '_callback' : 'callback'
  var queryCb = query[cbName]
  if (queryCb) {
    query[cbName] = function (err, res) {
      if (err) return self.handleError(err, queryCb)
      else {
        queryCb(null, res);
        callback();
      }
    }
  } else {
    query.once('error', function (err) {
      if (!query.listeners('error').length) self.handleError(err)
    })

    // Node 0.10 changed the behaviour of EventEmitter.listeners, so we need
    // to do a little poking at internals here.
    query.on('end', callback.bind(null, null))
    if (query.listeners('end').length > 1) {
      var listeners = query._events.end
      listeners.unshift(listeners.pop())
    }
  }
  self.emit('query', query)
  self._connection.query(query)
}


/**
 * A transaction transitions to 'open' when it has completed all queued tasks.
 */
inherits(OpenTransaction, Transaction)
function OpenTransaction () {}

OpenTransaction.prototype.begin = function (callback) {
  return this._createChildTransaction(callback).setConnection(this._connection);
}

OpenTransaction.prototype.query = function (stmt, params, callback) {
  if (typeof params == 'function') {
    callback = params
    params = undefined
  }
  var queryObject = this._connection.query(stmt, params, callback)
  this.emit('query', queryObject)
  if (!callback) queryObject.on('error', this.handleError)
  return queryObject
};

OpenTransaction.prototype.commit   = closeVia('commit')
OpenTransaction.prototype.rollback = closeVia('rollback')

function closeVia (action) {
  return function (callback) {
    if (this.state('closed', callback)) {
      this.emit(action + ':start');
      var q = this._createQuery(this._statements[action], function (err) {
        this._close(err, action, callback)
      }.bind(this))
      this.emit('query', q);
      this._connection.query(q);
    }
    return this
  }
}

inherits(ClosedTransaction, Transaction)
function ClosedTransaction () {}

['query', 'begin', 'rollback', 'commit'].forEach(function (name) {
  ClosedTransaction.prototype[name] = StateMachine.nullImplementation(name);
})

ClosedTransaction.prototype._close = function (err, action, callback) {
  this.state('closed')
  this._connection.removeListener('error', this.handleError)
  delete this._connection
  if (err) {
    this.handleError(new CloseFailedError(action, err), callback)
  } else {
    this.emit(action + ':complete');
    this.emit('close');
    if (callback) callback()
  }
}

inherits(CloseFailedError, Error);
function CloseFailedError(err, action, previous) {
  Error.captureStackTrace(this, CloseFailedError);
  this.name = action + ' failed';
  this.message = err + "\nError causing rollback: " + previous;
}
