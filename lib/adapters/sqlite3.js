var EventProxy = require('../event-proxy')
var QueryAdapter = require('../query-adapter')
var helpers = require('../helpers')
var Transaction = require('../transaction')

module.exports = SQLite3

require('util').inherits(SQLite3, EventProxy)

var sqlite3 = null

try { sqlite3 = require('sqlite3') } catch (__e) { /* gulp */ }

function SQLite3 (db) {
	if (!sqlite3) {
		throw new Exception("sqlite3 driver failed to load, please `npm install sqlite3`")
	}
	EventProxy.call(this)
	this._db = db
	this.proxyEvent(db, 'open')
	this.proxyEvent(db, 'close', 'end')
	this.proxyEvent(db, 'error')
}

SQLite3.create = function (url, callback) {
	var filename = url.hostname + (url.pathname || '')
	  , mode = 0

	if (!filename) filename = ':memory:'

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

/**
 *
 * Because SQLite3 doesn't behave very much like other drivers, we break the
 * encapsulation of the QueryAdapter object in a couple places here.
 */
SQLite3.prototype.query = helpers.queryMethod(function (stmt, params, callback, qa) {
	var args, res = []

	if (!qa) qa = new QueryAdapter
	qa._query = true


	try {
		args = helpers.fixPlaceholders(stmt, params, '?')
	} catch (err) {
		if (callback) callback(err)
		else process.nextTick(qa.emit.bind(qa, 'error', err))
		return
	}

	function handleError (err) {
		if (callback) callback(err)
		else qa.emit('error', err)
	}

	var _errored = false;
	args.push(
		function handleRow (err, row) {
			if (_errored) return
			if (err) return _errored = true
			if (qa._buffer) res.push(row)
			qa.emit('row', row)
		},
		function onComplete (err, count) {
			if (err) return handleError(err)
			if (callback) callback(null, res)
			qa.emit('end', res)
		})
	
	this._db.each.apply(this._db, args)
	return qa
})

SQLite3.prototype.begin = function (callback) {
	var t = new Transaction()
	t.begin(this, callback)
	return t
}

SQLite3.prototype.end = function (callback) {
	if (callback) this.on('end', callback)
	this._db.close()
}
