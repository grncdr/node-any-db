var sqlite3 = null

try { sqlite3 = require('sqlite3') } catch (__e) { }

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var Transaction = require('../transaction')

module.exports = SQLite3

inherits(SQLite3, EventEmitter)
function SQLite3(db) {
	EventEmitter.call(this)
	this._db = db
	var self = this
	this._db.on('open',  function ()    { self.emit('open', self) })
	this._db.on('close', function ()    { self.emit('end') })
	this._db.on('error', function (err) { self.emit('error', err) })
}

SQLite3.createConnection = function (opts, callback) {
  requireDriver();

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
    , adapter = new SQLite3(db)

	if (callback) {
		db.on('open', function () { callback(null, adapter) })
	}

	db.serialize()

	return adapter
}

SQLite3.createQuery = function (text, values, callback) {
  requireDriver();
	if (text instanceof Query) return text
	return new Query(text, values, callback)
}

SQLite3.prototype.query = function (text, values, callback) {
	var query = text
		, rowError = false
		;

  if (!(query instanceof Query)) {
    query = SQLite3.createQuery(text, values, callback);
  }
	
  if (query.text.match(/^\s*insert\s+/i)) {
    this._db.run(
      query.text,
      query.values,
      function onComplete(err) {
        if (err) return query.handleError(err)
        var result = { rows: [], rowCount: 0, lastInsertId: this.lastID }
        if (query._callback) query._callback(null, result)
        query.emit('end', result)
      }
    )
  }
  else {
    this._db.each(
      query.text,
      query.values,
      function onRow(err, row) {
        if (rowError) return
        rowError = err
        query.handleRow(row)
      },
      function onComplete(err, count) {
        if (err || rowError) return query.handleError(err || rowError)
        var result = {rows: query._rows, rowCount: count, lastInsertId: this.lastID}
        if (query._callback) query._callback(null, result)
        query.emit('end', result)
      }
    )
  }

	return query
}

SQLite3.prototype.begin = Transaction.createBeginMethod(SQLite3.createQuery)

SQLite3.prototype.end = function (callback) {
	if (callback) this.on('end', callback)
	this._db.close()
}

function requireDriver() {
  if (sqlite3) return;
  throw new Error("sqlite3 driver failed to load, please `npm install sqlite3`")
}

inherits(Query, EventEmitter)
function Query(text, values, callback) {
	EventEmitter.call(this)
	this._rows = []
	this._buffer = true
	this.text = text
	if (typeof values == 'function') {
		this._callback = values
		this.values = []
	} else {
		this.values = values
		this._callback = callback
	}
}

Query.prototype.handleRow = function (row) {
	if (this._callback) this._rows.push(row)
	this.emit('row', row)
}

Query.prototype.handleError = function (err) {
	if (this._callback) this._callback(err)
	else this.emit('error', err)
}
