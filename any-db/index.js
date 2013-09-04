var ConnectionPool = require('any-db-pool')
var Transaction = require('./lib/transaction')
var parseDbUrl = require('./lib/parse-url')

exports.adapters = require('./lib/adapters');

exports.createConnection = function connect (dbUrl, callback) {
	var adapterConfig = parseDbUrl(dbUrl);
	return getAdapter(adapterConfig.adapter).createConnection(adapterConfig, callback)
}

exports.createPool = function getPool (dbUrl, poolConfig) {
	poolConfig = poolConfig || {}
	if (poolConfig.create || poolConfig.destroy) {
		throw new Error("Cannot override the create/destroy pool options. Try onCreate/reset instead.")
	}
	var adapterConfig = parseDbUrl(dbUrl);
	var adapter = getAdapter(adapterConfig.adapter);
	var pool = new ConnectionPool(adapter, adapterConfig, poolConfig)
	pool.begin = Transaction.createPoolBeginMethod(adapter.createQuery)
	return pool
}


function getAdapter (protocol) {
	var name = protocol.replace(':', '').split('+').shift()
	if (!exports.adapters[name]) {
		throw new Error("Unknown database driver: " + name)
	}
	return exports.adapters[name]
}
