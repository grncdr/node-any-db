var EventProxy = require('../event-proxy')
var QueryAdapter = require('../query-adapter')
var helpers = require('./helpers')

module.exports = Postgres

var pg = null

try { pg = require('pg'); pg = pg.native } catch (__e) { /* gulp */ }

require('util').inherits(Postgres, EventProxy);

function Postgres (connection) {
	if (!pg) {
		throw new Exception("pg driver failed to load, please `npm install pg`")
	}
	EventProxy.call(this)
	this._connection = connection;
}

Postgres.create = function (url, callback) {
	var opts = helpers.prepareUrl(url);
	var conn = new pg.Client(opts)
	var adapter = new Postgres(conn)

	if (callback) {
		conn.connect(function (err) {
			if (err) callback(err);
			else callback(null, adapter);
		})
	} else {
		conn.connect();
	}
	return adapter;
}

Postgres.prototype.query = helpers.queryMethod(function (stmt, params, callback, qa) {
	var q = this._connection.query(stmt, params)
	return QueryAdapter.wrap(qa, q, callback, {row: 'row', result: '_end'})
})

Postgres.prototype.end = function () {
	this._connection.end()
}
