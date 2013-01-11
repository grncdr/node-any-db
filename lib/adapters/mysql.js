try {
	var mysql = require('mysql')
} catch (__e) {
	exports.create = exports.createQuery = function () {
		throw new Exception("mysql driver failed to load, please `npm install mysql`")
	}
	return
}

var helpers = require('../helpers')
var Transaction = require('../transaction')

exports.createQuery = mysql.createQuery

var begin = Transaction.createBeginMethod(exports.createQuery)

exports.createConnection = function createConnection (url, callback) {
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

	conn.query = wrapQueryMethod(conn.query)
	return conn
}

function wrapQueryMethod (realQuery) {
	return function query () {
		var q = realQuery.apply(this, arguments)
		q.on('result', q.emit.bind(q, 'row'))
		q._callback = wrapQueryCallback(q._callback)
		return q
	}
}

function wrapQueryCallback (callback) {
	if (!callback) return
	return function (err, res) {
		if (err) callback(err)
		else {
			callback(null, {
				rows: res,
				rowCount: res.length
			})
		}
	}
}
