var inherits = require('inherits')
var FSM = require('yafsm')
var once = require('once')

module.exports = begin
begin.Transaction = Transaction

function begin (queryable, options, beginStatement, callback) {
  if (typeof options != 'object') {
    callback = beginStatement;
    beginStatement = options;
    options = {};
  }

  if (undefined === options.autoRollback) {
    options.autoRollback = true;
  }

  if (typeof beginStatement == 'function') {
    callback = beginStatement
    beginStatement = undefined
  }

  if (queryable instanceof Transaction) {
    return beginWithParent(queryable, options, callback)
  }

  var adapter = queryable.adapter;

  var tx = new Transaction({
    adapter:      adapter,
    begin:        beginStatement,
    callback:     callback,
    autoRollback: options.autoRollback
  })

  if (typeof adapter.createQuery != 'function' ||
      typeof queryable.query != 'function') {
    var error = new TypeError(queryable + ' is not a queryable!')
    if (callback) {
      callback(error)
    } else {
      throw error
    }
  }

  if (typeof queryable.acquire == 'function') {
    // it's a pool
    var pool = queryable
    pool.acquire(function (err, conn) {
      if (err) return process.nextTick(function () {
        tx.emit('error', err)
      })
      var release = pool.release.bind(pool, conn)
      tx.on('query', pool.emit.bind(pool, 'query'))
      tx.once('rollback:complete', release)
        .once('commit:complete', release)
        .setConnection(conn)
    })
  }
  else {
    // it's a connection
    tx.setConnection(queryable)
  }

  return tx
}

inherits(Transaction, FSM)
function Transaction(opts) {
  opts = opts || {}
  this.adapter = opts.adapter
  this._connection = null
  this._statements = {
    begin:    opts.begin    || 'BEGIN',
    commit:   opts.commit   || 'COMMIT',
    rollback: opts.rollback || 'ROLLBACK'
  }
  this._queue = []
  this._nestingLevel = opts.nestingLevel || 0
  this._autoRollback = opts.autoRollback;

  this._emitQuery = function (query) { this.emit('query', query) }.bind(this)
  this.handleError = this.handleError.bind(this)

  FSM.call(this, 'disconnected', {
    'disconnected': [ 'connected' ],
    'connected':    [ 'open', 'closed' ],
    'open':         [ 'connected', 'closed' ]
  })

  if (opts.callback) {
    var callback = opts.callback
    this
      .once('error', callback)
      .once('begin:complete', function () {
        this.removeListener('error', callback)
        callback(null, this)
      })
  }
}

Transaction.prototype.handleError = function (err, skipEmit) {
  var self = this
  var rollback = this.rollback.implementations['open']
  if (this.state() !== 'closed' && this._connection && this._autoRollback) {
    rollback.call(this, function (rollbackErr) {
      if (rollbackErr) {
        rollbackErr.previous = err;
        self.emit('error', rollbackErr)
      }
      else if (!skipEmit) {
        self.emit('error', err)
      }
    }, err)
  }
  else if (!skipEmit) self.emit('error', err)
}

Transaction.prototype.query = FSM.method('query', {
  'connected|disconnected': function (text, params, callback) {
    var query = this.adapter.createQuery(text, params, callback)
    this._queue.push(query)
    return query
  },
  'open': function (text, params, callback) {
    var self = this
    var query = this.adapter.createQuery(text, params, callback)
    query.once('error', function (err) {
      self.handleError(err, query.listeners('error').length)
    })
    return this._connection.query(query)
  }
})

;['commit', 'rollback'].forEach(function (methodName) {
  Transaction.prototype[methodName] = FSM.method(methodName, {
    'open': closeVia(methodName),
    'connected|disconnected': function (callback) {
      var fn = this[methodName].implementations['open']
      this._queue.push([fn, [callback]])
      return this
    }
  })
})

Transaction.prototype.setConnection = FSM.method('setConnection', {
  'disconnected': function (connection) {
    var self = this
    var err = self.state('connected')
    if (err) {
      process.nextTick(function () {
        self.emit('error', err)
      })
      return
    }

    self._connection = connection
    self._addConnectionListeners()

    self.emit('begin:start')
    var beginQuery = connection.query(self._statements.begin, function (err) {
      if (err) return self.handleError(err)
      self.emit('begin:complete') // removes error listener
      self._runQueue()
    })

    self.emit('query', beginQuery)
    return self
  }
})

Transaction.prototype._runQueue = function () {
  var self = this
  return next()

  function next (err, skipEmit) {
    if (err) {
      self.handleError(err, skipEmit)
    }
    if (!self._queue.length) {
      if (self.state() !== 'closed' && (err = self.state('open'))) {
        self.handleError(err)
      }
      return
    }

    var task = self._queue.shift()

    if (Array.isArray(task)) {
      runFunctionCall(self, task, next)
    } else if (task instanceof Transaction) {
      runChildTransaction(self, task)
    } else {
      runQueuedQuery(self, task, next)
    }
  }
}

function runFunctionCall (ctx, fnAndArgs, next) {
  var fn = fnAndArgs[0]
    , args = fnAndArgs[1]
    , last = args[args.length - 1]

  if (typeof last == 'function') {
    args[args.length - 1] = function (err) {
      if (err) return last(err)
      last.apply(this, arguments)
      next()
    }
  } else {
    args.push(next)
  }

  return fn.apply(ctx, args)
}

function runQueuedQuery (self, query, next) {
  if (self.state() == 'closed') {
    self.query(query, function (err) {
      query.emit('error', err)
      next()
    })
    return
  }
  self._connection.query(query)
  var onext = once(next) // ensure we only call `next` once
  query.once('error', function (err) {
    onext(err, this.listeners('error').length)
  })
  query.once('close', function () {
    // let 'error' events have a chance to call `next` first
    process.nextTick(onext)
  })
}

function beginWithParent (parent, options, callback) {
  var child = createChildTransaction(parent, options, callback)
  switch (parent.state()) {
    case 'disconnected':
    case 'connected':
      parent._queue.push(child)
      break
    case 'open':
      runChildTransaction(parent, child)
      break
    case 'closed':
      var error = new Error("Cannot start child transaction on parent in state 'closed'")
      process.nextTick(function () {
        // callback is already attached to error event
        child.emit('error', error)
      })
  }
  return child
}

function createChildTransaction (parent, options, callback) {
  var nestingLevel = parent._nestingLevel + 1
  var savepointName = 'sp_' + nestingLevel

  var child = new Transaction({
    adapter:      parent.adapter,
    nestingLevel: nestingLevel,
    callback:     callback,
    begin:        'SAVEPOINT '         + savepointName,
    commit:       'RELEASE SAVEPOINT ' + savepointName,
    rollback:     'ROLLBACK TO '       + savepointName,
    autoRollback: options.autoRollback,
  })

  child
    .on('query', parent._emitQuery)
    .once('connected', function () {
      parent._removeConnectionListeners()
      parent.state('connected')
    })
    .once('close', function () {
      parent._addConnectionListeners()
      parent._runQueue()
    })

  return child
}

function runChildTransaction (parent, child) {
  // Child transaction
  child.setConnection(parent._connection)
  child.on('error', function (err) {
    if (child.listeners('error').length == 1) {
      // if a child transaction errors, and the parent is the only
      // listener, it should re-emit the error, but *not* roll back
      parent.emit('error', err)
    }
  })
}

Transaction.prototype._addConnectionListeners = function () {
  this._connection.on('error', this.handleError)
  this._connection.on('query', this._emitQuery)
}

Transaction.prototype._removeConnectionListeners = function () {
  this._connection.removeListener('error', this.handleError)
  this._connection.removeListener('query', this._emitQuery)
}

function closeVia (action) {
  return function (callback) {
    var self = this
    if (self.state() == 'closed') {
      return
    }
    var err = self.state('closed')
    if (err) {
      return self.handleError(err, callback)
    }
    self.emit(action + ':start')
    var q = self._connection.query(self._statements[action], function (err) {
      self._removeConnectionListeners()
      self._connection = null
      if (err) {
        self.handleError(new CloseFailedError(err, action), callback)
      } else {
        self.emit(action + ':complete')
        self.emit('close')
        if (callback) callback()
      }
    })
    return self
  }
}

inherits(CloseFailedError, Error)
function CloseFailedError(err, action) {
  Error.captureStackTrace(this, CloseFailedError)
  this.name = action + ' failed'
  this.message = err.message
  this.previous = null;
}
