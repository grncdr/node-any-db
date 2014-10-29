'use strict';
var EventEmitter = require('events').EventEmitter
var sqlite3      = require('sqlite3')
var inherits     = require('inherits')
var Readable     = require('stream').Readable

var adapter = exports

adapter.name = 'sqlite3'

adapter.verbose = sqlite3.verbose;

adapter.createQuery = function (text, values, callback) {
  if (text instanceof SQLite3Query) return text
  return new SQLite3Query(text, values, callback)
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
  return new SQLite3Connection(db, callback)
}

inherits(SQLite3Connection, EventEmitter)
function SQLite3Connection(db, callback) {
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

SQLite3Connection.prototype.adapter = adapter

SQLite3Connection.prototype.query = function (text, values, callback) {
  var query = adapter.createQuery(text, values, callback)
  
  this.emit('query', query)

  if (query.text.match(/^\s*(insert|update|replace)\s+/i)) {
    runQuery(this._db, query);
  } else {
    eachQuery(this._db, query);
  }

  return query
}

function runQuery (db, query) {
  db.run(query.text, query.values, function (err) {
    query.complete(err,
                   (this ? this.changes : 0),
                   (this ? this.lastID : -1))
  })
}

function eachQuery (db, query) {
  db.each(query.text, query.values, onRow, function (err, count) {
    query.complete(err, count);
  })

  function onRow (err, row) {
    query.onRow(err, row)
  }
}

SQLite3Connection.prototype.end = function (callback) {
  if (callback) this.on('end', callback)
  this._db.close()
}

inherits(SQLite3Query, Readable)
function SQLite3Query(text, values, callback) {
  Readable.call(this, {objectMode: true})
  this.text = text
  this._fields = null
  this._result = { rows: [] }
  this._errored = false
  if (typeof values == 'function') {
    callback = values
    values = []
  }
  this.values = values || []
  if (this.callback = callback) {
    this.on('error', function(error) {
		this.callback(error);
	})
	this.on('data', function (row) {
      this._result.rows.push(row)
    })
  }
}

SQLite3Query.prototype._read = function () {}

SQLite3Query.prototype.onRow = function (err, row) {
  if (this._errored) return
  this._gotData = true
  if (err) {
    this._errored = true
    this.emit('close')
    this.emit('error', err)
    return;
  }
  if (!this._result.fields) {
    this._result.fields = Object.keys(row).map(function (name) {
      return { name: name }
    })
    this.emit('fields', this._result.fields)
  }
  this.push(row)
}

SQLite3Query.prototype.complete = function (err, count, lastId, affectedRows) {
  this.push(null)
  if (this._errored) return // we've emitted an error from the row callback
  if (!err && !this._gotData) this.emit('fields', [])
  this.emit('close')
  if (err) return this.emit('error', err)
  this._result.rowCount = count
  this._result.lastInsertId = lastId
  if (affectedRows) {
    this._result.affectedRows = affectedRows
    this._result.changedRows = affectedRows
  }

  if (this.callback) {
    this.callback(null, this._result)
  }
}
