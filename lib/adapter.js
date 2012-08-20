module.exports = Adapter

url = require('url')
inherits = require('util').inherits

EventProxy = require('./event-proxy')
QueryProxy = require('./query-proxy')

inherits(Adapter, EventProxy)
function Adapter (dbUrl) {
	EventEmitter.call(this)
	this.connectString = dbUrl
  this.methodMapping = {
		query: "query",
		connect: "connect",
		end: "end"
  }
	this.connectionEventHandlers = {
		'drain': 'drain',
		'end': 'end',
		'close': 'close',
		'error': 'error',
	}
  this.queryEventHandlers = {
		'end': 'end',
		'error': 'error',
		// e.g. 'row': handleRow,
	}
}

Adapter.prototype.connect = function (callback) {
	if (this._connection) {
		var err = new Error("connect called twice")
		if (callback) callback(err)
		else this.emit(err)
		return
	}
	var self = this
	_callback = callback ? function (err, res) { callback(err, self) } : null
  this._connection = this._createConnection(_callback)

	if (!callback) this.proxyEvent(this._connection, 'error');

	['drain', 'end', 'close'].forEach(function (evt) {
		this.proxyEvent(this._connection, evt, this.connectionEventHandlers[evt])
	}, this)

  return this
}

Adapter.prototype._createConnection = function () {
  throw new Error("_createConnection not implemented!")
}

Adapter.prototype.query = function (statement, params, callback) {
	var query = new QueryProxy(statement, params, callback)
  this._execute(query)
  return query
}

Adapter.prototype.createQueryProxy = function (statement, params, callback) {
	return new QueryProxy(statement, params, callback)
}

Adapter.prototype._execute = function (query) {
  var args = this.prepareQueryArgs(query)
    , meth = this._connection[this.methodMapping.query]
    , driverQuery = meth.apply(this._connection, args)

	if (!query._callback) {
		for (var evt in eventHandlers) {
			this.proxyEvent(driverQuery, evt, eventHandlers[evt])
		}
	}
  query._query = driverQuery
}

Adapter.prototype.end = function (callback) {
	this._connection.end(callback)
}

Adapter.prototype.prepareQueryArgs = function (query) {
	return [query._statement, query._params, query._callback]
}
