var EventEmitter = require('events').EventEmitter
var sqlite3      = require('sqlite3')
var inherits     = require('inherits')
var Readable     = require('readable-stream')
var concat       = require('concat-stream')

var adapter = exports

adapter.name = 'sqlite3'

adapter.verbose = sqlite3.verbose;

adapter.createQuery = function (text, values, callback) {
  if (text instanceof Query) return text
  return new Query(text, values, callback)
} 

adapter.createConnection = function (opts, callback) {
  var filename;
  
  if (opts.host) {
    filename = opts.host + (opts.database || '')
  } else {
    filename = opts.database
  }

  if (!filename || filename == '/:memory') filename = ':memory:'

  var mode = Object.keys(opts).map(function (k) {
    return (k == k.toUpperCase() && sqlite3[k]) | 0;
  }).reduce(function (mode, flag) {
    return mode | flag;
  }, 0)

  if (!mode) mode = (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)

  var db = new sqlite3.Database(filename, mode)
  db.serialize()
  return new Connection(db, callback)
}

inherits(Connection, EventEmitter)
function Connection(db, callback) {
  EventEmitter.call(this)
  this._db = db
  var self = this
  this._db.on('open',  function () { self.emit('open') })
  this._db.on('close', function ()    { self.emit('end') })
  this._db.on('error', function (err) { self.emit('error', err) })

  if (callback) {
    self.once('error', callback)
    self.once('open', function handleOpenEvent () {
      self.removeListener('error', callback)
      callback(null, self)
    })
  }
}

Connection.prototype.adapter = adapter

Connection.prototype.query = function (text, values, callback) {
  var query = text
    , rowError = false
    ;

  if (!(query instanceof Query)) {
    query = adapter.createQuery(text, values, callback)
  }
  
  this.emit('query', query)

  if (query.text.match(/^\s*insert\s+/i))
    this._db.run(query.text,
                 query.values,
                 onComplete)
  else
    this._db.each(query.text,
                  query.values,
                  query.onRow.bind(query),
                  onComplete)

  return query

  function onComplete(err, count) {
    if (err || rowError) return query.emit('error', err || rowError)
    query.complete(count, this.lastID)
  }
}

Connection.prototype.end = function (callback) {
  if (callback) this.on('end', callback)
  this._db.close()
}

inherits(Query, Readable)
function Query(text, values, callback) {
  Readable.call(this, {objectMode: true})
  this.text = text
  this._result = {}
  this._error = null
  if (typeof values == 'function') {
    callback = values
    values = []
  }
  this.values = values || []
  if (this.callback = callback) {
    var self = this
    this.pipe(concat(function (rows) {
      self._result.rows = rows
      callback(null, self._result)
    }))
    this.on('error', callback)
  }
}

Query.prototype.onRow = function (err, row) {
  if (this._error || (this._error = err)) return
  if (!this._result.fields) {
    this._result.fields = Object.keys(row).map(function (name) {
      return { name: name }
    })
    this.emit('fields', this._result.fields)
  }
  this.emit('data', row)
}

Query.prototype.complete = function (count, lastId) {
  if (this._error) this.emit('error', this._error)
  this._result.rowCount = count
  this._result.lastInsertId = lastId
  this.emit('end')
}

Query.prototype.pause = function () {}
Query.prototype.resume = function () {}
