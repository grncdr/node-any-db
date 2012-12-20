exports.prepareUrl = function (parsed) {
	return {
		host:     parsed.hostname,
		port:     parsed.port,
		database: parsed.pathname ? parsed.pathname.substring(1) : null,
		user:     parsed.user,
		password: parsed.password,
	}
}

// Decorator for .query methods that normalizes optional arguments
exports.queryMethod = function (method) {
	return function (stmt, params, callback) {
		if (typeof params === 'function') {
			callback = params
			params = undefined
		}
		return method.call(this, stmt, params, callback)
	}
}

// patch in buffer method on a query object
exports.patchBuffer = function (q, bufferRow) {
	q._buffer = true
	q.buffer = buffer
	q.on('row', function (row, res) { if (this._buffer) bufferRow(row) })
}

// Patched on to native postgres Query objects
function buffer (arg) {
	if (arg == null) return this._buffer
	if (arg === false) this._buffer = false
	else this._buffer = true
	return this
}
