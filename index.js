var url = require('url')
var ConnectionPool = require('any-db-pool')
var Transaction = require('./lib/transaction')
var helpers = require('./lib/helpers')

exports.adapters = require('./lib/adapters');

exports.createConnection = function connect (dbUrl, callback) {
	var parsed = typeof dbUrl === 'string'? parseDbUrl(dbUrl) : dbUrl
	return getAdapter(parsed.adapter || parsed.protocol).createConnection(parsed, callback)
}

exports.createPool = function getPool (dbUrl, opts) {
	opts = opts || {}
	if (opts.create || opts.destroy) {
		throw new Error("Cannot override the create/destroy pool options. Try onCreate/reset instead.")
	}
	var parsed = typeof dbUrl === 'string'? parseDbUrl(dbUrl) : dbUrl;
	var adapter = getAdapter(parsed.adapter || parsed.protocol);
	var pool = new ConnectionPool(adapter, parsed, opts || {})
	pool.begin = Transaction.createPoolBeginMethod(adapter.createQuery)
	return pool
}

function parseDbUrl (dbUrl) {
	var parsed = url.parse(dbUrl, true);
	if (parsed.auth) {
		var auth = parsed.auth.split(':')
		parsed.user = auth[0];
		parsed.password = auth[1];
	}
	return parsed;
}

function getAdapter (protocol) {
	var name = protocol.replace(':', '').split('+').shift()
	if (!exports.adapters[name]) {
		throw new Error("Unknown database driver: " + name)
	}
	return exports.adapters[name]
}
