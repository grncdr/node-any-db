module.exports = EventProxy

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

inherits(EventProxy, EventEmitter)

function EventProxy () {
	EventEmitter.call(this)
}

EventProxy.prototype.proxyEvent = function (source, evt, handler) {
	if (!handler) handler = evt
	if (typeof handler === 'function') source.on(evt, handler.bind(this))
	else source.on(evt, this.emit.bind(this, handler))
}
