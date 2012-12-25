var sqlite3 = null

try {
	sqlite3 = require('sqlite3')
} catch (__e) {
	exports.create = exports.createQuery = function () {
		throw new Exception("sqlite3 driver failed to load, please `npm install sqlite3`")
	}
}

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var helpers = require('../helpers')
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

SQLite3.createConnection = function (url, callback) {
	var filename = url.hostname + (url.pathname || '')
	  , mode = 0

	if (!filename || filename == '/:memory') filename = ':memory:'

	for (var flag in Object.keys(url.query)) {
		if (sqlite3[flag] != null) mode = mode & sqlite3[flag]
	}

	if (!mode) mode = (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)

	var db = new sqlite3.cached.Database(filename, mode)
	  , adapter = new SQLite3(db)

	if (callback) {
		db.on('open', function () { callback(null, adapter) })
	}
	return adapter
}

SQLite3.createQuery = function (stmt, params, callback) {
	if (stmt instanceof Query) return stmt
	return new Query(stmt, params, callback)
}

SQLite3.prototype.query = function (stmt, params, callback) {
	var q = stmt instanceof Query
			? stmt
			: SQLite3.createQuery(stmt, params, callback)
		, errored = false
		;

	
	this._db.each(
		q.stmt,
		q.params,
		function onRow (err, row) {
			if (errored) return
			if (err) return errored = true
			q.handleRow(row)
		},
		function onComplete (err, count) {
			if (err) return q.handleError(err)
			var result = {rows: q._rows, rowCount: count}
			if (q._callback) q._callback(null, result)
			q.emit('end', result)
		}
	)

	return q
}

SQLite3.prototype.begin = Transaction.createBeginMethod(SQLite3.createQuery)

SQLite3.prototype.end = function (callback) {
	if (callback) this.on('end', callback)
	this._db.close()
}

inherits(Query, EventEmitter)
function Query (stmt, params, callback) {
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
