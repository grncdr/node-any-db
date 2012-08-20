module.exports = QueryProxy

EventProxy = require('./EventProxy')
inherits = require('util').inherits
inherits(QueryProxy, EventProxy)

function QueryProxy (statement, params, callback) {
	EventProxy.call(this)
	if (!callback && typeof params === 'function') {
		callback = params
		params = []
	}
	this._statement = statement
	this._params = params
	this._callback = callback
}

QueryProxy.prototype.handleError = function (err) {
	if (this._callback) this._callback(err)
	else this.emit('error')
}
