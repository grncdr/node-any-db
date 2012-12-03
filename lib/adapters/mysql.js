var EventProxy = require('../event-proxy')
var QueryAdapter = require('../query-adapter')
var Transaction = require('../transaction')
var helpers = require('../helpers')

module.exports = MySQL

var mysql = null

try { mysql = require('mysql') } catch (__e) { /* gulp */ }

require('util').inherits(MySQL, EventProxy)

function MySQL (connection) {
	if (!mysql) {
		throw new Exception("mysql driver failed to load, please `npm install mysql`")
	}
	EventProxy.call(this)
	
	this._connection = connection

	this.proxyEvent(connection, 'open')
	this.proxyEvent(connection, 'end')
	this.proxyEvent(connection, 'error')
}

MySQL.create = function create (url, callback) {
	var opts = helpers.prepareUrl(url)
	  , conn = mysql.createConnection(opts)
	  , adapter = new MySQL(conn)

	// Thanks mysql driver!
	conn.config.queryFormat = function (query, values) {
		if (!values) return query;
		return query.replace(/\$(\w+)/g, function (txt, key) {
			if (values.hasOwnProperty(key)) {
				return this.escape(values[key]);
			}
			return txt;
		}.bind(this));
	};

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

MySQL.prototype.query = helpers.queryMethod(function (stmt, params, callback, qa) {
	var query = this._connection.query(stmt, params)
		, rows = []
		, result = {rows: rows, rowCount: 0}

	return QueryAdapter.wrap(qa, query, {
		// these callbacks are called in the context of a QueryAdapter instance
		error: function (err) { callback ? callback(err) : this.emit('error', err) },
		fields: function (fields) { this.emit('fields', fields) },
		result: function (row) {
			if (this._buffer) rows.push(row)
			result.rowCount++
			this.emit('row', row)
		},
		end: function () {
			if (callback) callback(null, result)
			this.emit('end', result)
		}
	})
})

MySQL.prototype.begin = function (callback) {
	var t = new Transaction()
	t.begin(this, callback)
	return t
}

MySQL.prototype.end = function () {
	this._connection.end()
}
