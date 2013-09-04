var ConnectionPool = require('any-db-pool')
var parseDbUrl     = require('./lib/parse-url')

exports.__defineGetter__('adapters', function () {
  throw new Error(
    "Change your any-db dependency to any-db-{mysql,postgres,sqlite3} " +
    "and require the adapter directly if you need to access it"
  )
})

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
	return pool
}


function getAdapter (protocol) {
	var name = protocol.replace(':', '').split('+').shift()
  return require('any-db-' + name);
}
