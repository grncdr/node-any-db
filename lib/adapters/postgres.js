var pg = null
  , native = null

try {
	pg = require('pg')
	native = pg.native
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

exports.forceJS = false

exports.createConnection = function (url, callback) {
	var opts = helpers.prepareUrl(url)
		, scheme = url.protocol
		, backend = (exports.forceJS || !native) ? pg : native
		, conn = new backend.Client(opts)

	if (callback) {
		conn.connect(function (err) {
			if (err) callback(err)
			else callback(null, conn)
		})
	} else {
		conn.connect()
	}

	conn.begin = Transaction.createBeginMethod(exports.createQuery)
	return conn
}

// Create a Query object that conforms to the Any-DB interface
exports.createQuery = function (stmt, params, callback) {
	var backend = (exports.forceJS || !native) ? pg : native
	return new backend.Query(stmt, params, callback)
}
