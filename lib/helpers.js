var QueryAdapter = require('./query-adapter')

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
		return method.call(this, stmt, params, callback, qa)
	}
}

var singleQuote = /'[^']/

exports.fixPlaceholders = function (stmt, params, placeholder) {
	if (!placeholder) placeholder = '?'
	var _params = []
	var inQuotes = false
	stmt = stmt.split("'").map(function (chunk) {
			if (inQuotes) {
				if (chunk) inQuotes = !inQuotes  // empty chunk means we had a double '
				return chunk
			} else {
				inQuotes = !inQuotes
				return chunk.replace(/\$(\w+)/g, function (_, name) {
					if (Array.isArray(params)) name = parseInt(name) - 1
					if (!params.hasOwnProperty(name)) {
						throw new Error("Parameter " + name + " not present in params")
					}
					_params.push(params[name])
					return placeholder
				})
			}
	}).join("'")

	return [stmt, _params]
}
