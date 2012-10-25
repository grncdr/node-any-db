var EventProxy = require('../event-proxy')
var QueryAdapter = require('../query-adapter')
var Transaction = require('../transaction')
var helpers = require('./helpers')

module.exports = MySQL

var mysql = null

try { mysql = require('mysql') } catch (__e) { /* gulp */ }

require('util').inherits(MySQL, EventProxy);

function MySQL (connection) {
	if (!mysql) {
		throw new Exception("mysql driver failed to load, please `npm install mysql`")
	}
	EventProxy.call(this)
	
	this._connection = connection;

	this.proxyEvent(connection, 'error')
	this.proxyEvent(connection, 'end')
}

MySQL.create = function create (url, callback) {
	var opts = helpers.prepareUrl(url);
	var conn = mysql.createConnection(opts);
	var adapter = new MySQL(conn);

	if (callback) {
		conn.connect(function (err) {
			if (err) callback(err);
			else callback(null, adapter);
		});
	} else {
		conn.connect();
	}
	return adapter;
}

MySQL.prototype.query = helpers.queryMethod(function (stmt, params, callback, qa) {
	var q = this._connection.query(stmt, params)
	return QueryAdapter.wrap(qa, q, callback, {result: 'row', fields: 'fields'})
})

MySQL.prototype.begin = function (callback) {
	var t = new Transaction();
	t.begin(this, callback)
	return t;
}

MySQL.prototype.end = function () {
	this._connection.end()
}
