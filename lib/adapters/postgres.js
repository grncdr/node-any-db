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
	  , pgResult

	return QueryAdapter.wrap(qa, query, {
		error: function (err) { callback ? callback(err) : this.emit('error', err) },
		row: function (row, result) {
			pgResult = result
			if (this._buffer) result.addRow(row)
			this.emit('row', row)
		},
		end: function () {
			var result = pgResult ? pgResult.rows : []
			if (pgResult) ['command', 'oid'].forEach(function (prop) {
				Object.defineProperty(result, prop, {
					enumerable: false,
					writable: false,
					value: pgResult[prop]
				})
			})
			if (callback) callback(null, result)
			this.emit('end', result)
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
