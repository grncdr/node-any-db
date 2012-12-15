try {
	var mysql = require('mysql')
} catch (__e) {
	exports.create = exports.createQuery = function () {
		throw new Exception("mysql driver failed to load, please `npm install mysql`")
	}
	return
}

exports.create = function create (url, callback) {
	var opts = helpers.prepareUrl(url)
	  , conn = mysql.createConnection(opts)

	conn.begin = begin

	if (callback) {
		conn.connect(function (err) {
			if (err) callback(err)
			else callback(null, conn)
		})
	} else {
		conn.connect()
	}

	return conn
}

var Connection   = mysql.createConnection({}).constructor
var _createQuery = Connection.createQuery

Connection.createQuery =
mysql.createQuery =
exports.createQuery = function (stmt, params, cb) {

	var query = _createQuery(stmt, params, cb)
	query.on('result', reEmitRow)
	if ((cb = query._callback) && !cb._any_db_wrapper) {
		query._callback = function (err, res) {
			if (err) cb(err)
			else cb(err, {rows: res, rowCount: res.length})
		}
		query._callback._any_db_wrapper = true
	}
	return query
}

function reEmitRow (row) { return this.emit('row', row) }

var helpers = require('../helpers')
var begin = require('../transaction').createBeginMethod(exports.createQuery)
