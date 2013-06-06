var sqlite3 = null

try { sqlite3 = require('sqlite3') } catch (__e) { }

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var Transaction = require('../transaction')

module.exports = SQLite3

inherits(SQLite3, EventEmitter)
function SQLite3 (db) {
	EventEmitter.call(this)
	this._db = db
	var self = this
	this._db.on('open', function () { self.emit('open', self) })
	this._db.on('close', function () { self.emit('end') })
	this._db.on('error', function (err) { self.emit('error', err) })
}

SQLite3.createConnection = function (opts, callback) {
	if (!sqlite3) {
		throw new Error("sqlite3 driver failed to load, please `npm install sqlite3`")
	}

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

SQLite3.createQuery = function (stmt, params, callback) {
	if (!sqlite3) {
		throw new Error("sqlite3 driver failed to load, please `npm install sqlite3`")
	}
	if (stmt instanceof Query) return stmt
	return new Query(stmt, params, callback)
}

SQLite3.prototype.query = function (stmt, params, callback) {
	var query = stmt
		, rowError = false
		;

  if (!(query instanceof Query)) {
    query = SQLite3.createQuery(stmt, params, callback);
  }
	
  if (query.stmt.match(/^\s*insert\s+/i)) {
    this._db.run(
      query.stmt,
      query.params,
      function onComplete(err, count) {
        if (err) query.handleError(err)
        else {
          var result = { rows: [], rowCount: 0, lastInsertId: this.lastID }
          if (query._callback) query._callback(null, result)
        }
        query.emit('end', result)
      }
    )
  }
  else {
    this._db.each(
      query.stmt,
      query.params,
      function onRow(err, row) {
        if (rowError) return
        rowError = err
        query.handleRow(row)
      },
      function onComplete(err, count) {
        if (err || rowError) query.handleError(err || rowError)
        else {
          var result = {rows: query._rows, rowCount: count, lastInsertId: this.lastID}
          if (query._callback) query._callback(null, result)
        }
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

inherits(Query, EventEmitter)
function Query(stmt, params, callback) {
	EventEmitter.call(this)
	this._rows = []
	this._buffer = true
	this.stmt = stmt
	if (typeof params == 'function') {
		this._callback = params
		this.params = []
	} else {
		this.params = params
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
