var url = require('url')
var ConnectionPool = require('./lib/connection-pool')

exports.adapters = {
	mysql:    require('./lib/adapters/mysql'),
	postgres: require('./lib/adapters/postgres'),
	sqlite3:  require('./lib/adapters/sqlite3'),
}

exports.createConnection = function connect (dbUrl, callback) {
	var ctor = getAdapterConstructor(dbUrl)
		, adapter = new ctor(dbUrl);
	
	if (callback) adapter.connect(callback)
	return adapter
}

exports.createPool = function getPool (dbUrl, opts) {
	if (opts.create || opts.destroy) {
		throw new Error("Cannot override the create/destroy pool options. Try afterCreate/afterRelease/beforeDestroy instead.")
	}
	var ctor = getAdapterConstructor(dbUrl)
			return new ConnectionPool(ctor, dbUrl, opts || {})
}

function getAdapterConstructor (dbUrl) {
	var parsed = url.parse(dbUrl)
		, name = parsed.protocol.replace(':', '')
	if (!exports.adapters[name]) {
		throw new Error("Unknown database driver: " + name)
	}
	return exports.adapters[name]
}
