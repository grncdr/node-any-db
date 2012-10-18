var QueryAdapter = require('../query-adapter')

exports.prepareUrl = function (parsed) {
	return {
		host:     parsed.hostname,
		port:     parsed.port,
		database: parsed.pathname ? parsed.pathname.substring(1) : null,
		user:     parsed.user,
		password: parsed.password,
	}
}

exports.queryMethod = function (method) {
	return function (stmt, params, callback, qa) {
		if (typeof params === 'function') {
			qa = callback
			callback = params
			params = undefined
		}
		if (callback instanceof QueryAdapter) {
			qa = callback
			callback = undefined
		}
		return method.call(this, stmt, params, callback, qa);
	}
}
