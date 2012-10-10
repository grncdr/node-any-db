module.exports = MySQL

var Adapter = require('../adapter')

var mysql = null

try { var mysql = require('mysql') } catch (__e) { /* gulp */ }

var inherits = require('util').inherits

inherits(MySQL, Adapter)

function MySQL (params) {
	if (!mysql) {
		throw new Exception("mysql driver failed to load, please `npm install mysql`")
	}
	Adapter.call(this, params)
	this.queryEventHandlers.result = 'row'
	this.queryEventHandlers.fields = 'fields'
}

MySQL.prototype._createConnection = function (callback) {
	var conn = mysql.createConnection(this.connectString)
	if (callback) conn.connect(callback)
	return conn
}
