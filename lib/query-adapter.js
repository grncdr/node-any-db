var EventProxy = require('./event-proxy')

module.exports = QueryAdapter

require('util').inherits(QueryAdapter, EventProxy)

function QueryAdapter (query, callback, eventMapping) {
	EventProxy.call(this)
	this._buffer = true
}

QueryAdapter.wrap = function (qa, query, eventMapping) {
	if (!qa) qa = new QueryAdapter
	else if (qa._query) {
		var err = new Error("QueryAdapter already has query assigned")
		if (callback) callback(err)
		else qa.emit('error', err)
	}
	qa._query = query
	for (var evt in eventMapping) qa.proxyEvent(query, evt, eventMapping[evt])
	return qa
}

QueryAdapter.prototype.buffer = function (bool) {
	if (bool == null) return this._buffer
	this._buffer = bool
	return this
}

QueryAdapter.prototype.cancel = function () {
	if (this._query.cancel) this._query.cancel()
}
