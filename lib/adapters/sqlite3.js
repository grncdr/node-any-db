var EventProxy = require('../event-proxy')
var QueryAdapter = require('../query-adapter')
var ResultSet = require('../result-set')
var helpers = require('./helpers')

module.exports = SQLite3

require('util').inherits(SQLite3, EventProxy)

var sqlite3 = null

try { sqlite3 = require('sqlite3') } catch (__e) { /* gulp */ }

function SQLite3 (db) {
	if (!sqlite3) {
		throw new Exception("sqlite3 driver failed to load, please `npm install sqlite3`")
	}
	EventProxy.call(this)
	this._db = db;
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
	var adapter = new SQLite3(db)

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
	var args = [stmt, params]
		, res = [];

	if (!qa) qa = new QueryAdapter()
	qa._query = true;

	function handleError (err) {
		if (callback) callback(err)
		else qa.emit('error', err)
	}

	args.push(
		function handleRow (err, row) {
			if (err) return handleError(err)
			if (qa._buffer) res.push(row)
			console.log(row)
			qa.emit('row', row)
		},
		function onComplete (err, count) {
			qa.emit('end', {rowCount: count})
			if (err) return handleError(err)
			if (callback) {
				Object.defineProperty(res, 'rowCount', {value: count, enumerable: false})
				callback(null, res)
			}
		})
	
	this._db.each.apply(this._db, args)
	return qa
})


SQLite3.prototype.end = function (callback) {
	if (callback) this._db.on('close', callback)
	this._db.close()
}
