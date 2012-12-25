var pg = null

try {
	pg = require('pg')
	pg = pg.native
} catch (__e) {
	if (!pg) {
		exports.create = exports.createQuery = function () {
			throw new Exception("pg driver failed to load, please `npm install pg`")
		}
		return
	}
}

var Transaction = require('../transaction')
var helpers = require('../helpers')

exports.createConnection = function (url, callback) {
	var opts = helpers.prepareUrl(url)
	  , conn = new pg.Client(opts)

	if (callback) {
		conn.connect(function (err) {
			if (err) callback(err)
			else callback(null, conn)
		})
	} else {
		conn.connect()
	}
	conn.begin = Transaction.createBeginMethod(exports.createQuery)
	//conn.query = wrapQueryMethod(conn.query)
	return conn
}

// Create a Query object that conforms to the Any-DB interface
exports.createQuery = function (stmt, params, callback) {
	return new pg.Query(stmt, params, callback)
}
