module.exports = Postgres

try { pg = require('pg') } catch (__e) { /* gulp */ }
inherits = require('util').inherits

Adapter = require('../adapter')

url = require('url')
inherits(Postgres, Adapter)

function Postgres (connectString) {
	if (!pg) throw new Exception("pg driver failed to load, please `npm install pg`")
	Adapter.call(this, connectString)
	this._config = parseConnectString(connectString)
}

Postgres.prototype._createConnection = function (callback) {
	var conn = new pg.Client(this._config)
	if (callback) conn.connect(callback)
	return conn
}

Postgres.prototype.prepareQueryArgs = function (query) {
	var args = [query._statement, query._params]
		, callback = query._callback
	
	if (callback) args.push(wrapResultCallback(callback))

	var on = query.on
	query.on = function (evt, handler) {
		if (evt === 'end') handler = wrapResultCallback(handler)
		on.call(query, evt, handler)
	}
	return args
}

function wrapResultCallback(callback) {
	return function wrappedResultCallback (err, res) {
		if (err) return callback(err)
		var rows = res.rows;
		['command', 'rowCount', 'oid'].forEach(function (prop) {
			Object.defineProperty(rows, prop, {
				value: res[prop],
				enumerable: false,
				writable: false,
			})
		})
		callback(null, rows)
	}
}

function parseConnectString(str) {
	var parsed = url.parse(str)
	if (!parsed.hostname) {
		return {host: parsed.pathname}
	}
	var auth = (parsed.auth || '').split(':')
	return {
		host:     parsed.hostname,
		port:     parsed.port,
		database: parsed.pathname ? parsed.pathname.substring(1) : null,
		user:     auth[0],
		password: auth[1],
	}
}
