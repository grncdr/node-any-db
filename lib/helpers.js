exports.prepareUrl = function (parsed) {
	return {
		host:     parsed.hostname,
		port:     parsed.port,
		database: parsed.pathname ? parsed.pathname.substring(1) : null,
		user:     parsed.user,
		password: parsed.password,
	}
}
