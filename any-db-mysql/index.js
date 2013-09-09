var mysql = require('mysql')

var Transaction = require('any-db').Transaction

var begin = Transaction.createBeginMethod(mysql.createQuery)

exports.createQuery = mysql.createQuery

exports.createConnection = function createConnection(opts, callback) {
	var conn = mysql.createConnection(opts)

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

function wrapQueryMethod(realQuery) {
	return function query() {
		var q = realQuery.apply(this, arguments)
    if (!q.hasOwnProperty('text')) {
      Object.defineProperty(q, 'text', {
        get: function () { return this.sql }
      });
    }
		q.on('result', q.emit.bind(q, 'row'))
		q._callback = wrapQueryCallback(q._callback)
		return q
	}
}

function wrapQueryCallback(callback) {
	if (!callback) return
	return function (err, res) {
		if (err) callback(err)
		else {
			callback(null, {
				rows: res,
				rowCount: res.length,
				lastInsertId: res.insertId
			})
		}
	}
}
