var url = require('url')
var ConnectionPool = require('./lib/connection-pool')

exports.adapters = require('./lib/adapters');

exports.createConnection = function connect (dbUrl, callback) {
	var parsed = parseDbUrl(dbUrl)
	return getAdapter(parsed.protocol).create(parsed, callback)
}

exports.createPool = function getPool (dbUrl, opts) {
	opts = opts || {}
	if (opts.create || opts.destroy) {
		throw new Error("Cannot override the create/destroy pool options. Try afterCreate/afterRelease/beforeDestroy instead.")
	}
	var parsed = parseDbUrl(dbUrl);
	var adapter = getAdapter(parsed.protocol);
	return new ConnectionPool(adapter, parsed, opts || {})
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
	var name = protocol.replace(':', '')
	if (!exports.adapters[name]) {
		throw new Error("Unknown database driver: " + name)
	}
	return exports.adapters[name]
}
