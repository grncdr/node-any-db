var EventProxy = require('../event-proxy')
var QueryAdapter = require('../query-adapter')
var Transaction = require('../transaction')
var helpers = require('../helpers')

module.exports = Postgres

var pg = null

try { pg = require('pg'); pg = pg.native } catch (__e) { /* gulp */ }

require('util').inherits(Postgres, EventProxy)

function Postgres (connection) {
	if (!pg) {
		throw new Exception("pg driver failed to load, please `npm install pg`")
	}
	EventProxy.call(this)
	this._connection = connection
	this.proxyEvent(connection, 'open')
	this.proxyEvent(connection, 'end')
	this.proxyEvent(connection, 'error')
}

Postgres.create = function (url, callback) {
	var opts = helpers.prepareUrl(url)
	  , conn = new pg.Client(opts)
	  , adapter = new Postgres(conn)

	if (callback) {
		conn.connect(function (err) {
			if (err) callback(err)
			else callback(null, adapter)
		})
	} else {
		conn.connect()
	}
	return adapter
}

Postgres.prototype.query = helpers.queryMethod(function (stmt, params, callback, qa) {
	var query = this._connection.query(stmt, params)
		, receivedRow = false
	  , pgResult

	return QueryAdapter.wrap(qa, query, {
		// these callbacks are called in the context of a QueryAdapter instance
		error: function (err) { callback ? callback(err) : this.emit('error', err) },
		row: function (row, result) {
			if (!receivedRow && this.listeners('fields')) {
				this.emit('fields', Object.keys(row))
			}
			receivedRow = true
			pgResult = result
			result.rowCount++
			if (this._buffer) result.addRow(row)
			this.emit('row', row)
		},
		end: function () {
			if (!receivedRow) pgResult = {rows: [], rowCount: 0}
			if (callback) callback(null, pgResult)
			this.emit('end', pgResult)
		}
	})
})

Postgres.prototype.begin = function (callback) {
	var t = new Transaction()
	t.begin(this, callback)
	return t
}

Postgres.prototype.end = function () {
	this._connection.end()
}
