var EventProxy = require('./event-proxy')

module.exports = QueryAdapter

require('util').inherits(QueryAdapter, EventProxy)

function QueryAdapter (query, callback, eventMapping) {
	EventProxy.call(this)
	this._buffer = true
	if (query) this.accept(query, callback, eventMapping)
}

QueryAdapter.wrap = function (qa, q, callback, eventMapping) {
	if (!qa) qa = new QueryAdapter(q, callback, eventMapping)
	else qa.accept(q, callback, eventMapping)
	return qa
}

QueryAdapter.prototype.accept = function (query, callback, eventMapping) {
	if (this._query) throw new Error("QueryAdapter already has query assigned")

	this._query = query

	query.on('error', callback || this.emit.bind(this, 'error'))
	for (var evt in eventMapping) this.proxyEvent(query, evt, eventMapping[evt])

	var result = []

	this.on('row', function (r) { this._buffer && result.push(r) })

	query.on('end', (function () {
		if (callback) callback(null, result)
		this.emit('end', result)
	}).bind(this))
}

QueryAdapter.prototype.buffer = function (bool) {
	this._buffer = bool
	return this
}

QueryAdapter.prototype.cancel = function () {
	if (this._query.cancel) this._query.cancel()
}