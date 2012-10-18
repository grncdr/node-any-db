var url = require('url')
var ConnectionPool = require('./lib/connection-pool')

exports.adapters = require('./lib/adapters');

exports.createConnection = function connect (dbUrl, callback) {
	var parsed = parseDbUrl(dbUrl)
		, factory = getAdapterFactory(parsed.protocol)
	
	if (!factory) console.log(parsed.protocol)
	return factory(parsed, callback)
}

exports.createPool = function getPool (dbUrl, opts) {
	if (opts.create || opts.destroy) {
		throw new Error("Cannot override the create/destroy pool options. Try afterCreate/afterRelease/beforeDestroy instead.")
	}
	var parsed = parseDbUrl(dbUrl);
	var factory = getAdapterFactory(parsed.protocol);
	return new ConnectionPool(factory, parsed, opts || {})
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

function getAdapterFactory (protocol) {
	var name = protocol.replace(':', '')
	if (!exports.adapters[name]) {
		throw new Error("Unknown database driver: " + name)
	}
	return exports.adapters[name].create
}
