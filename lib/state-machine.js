var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

module.exports = StateMachine

inherits(StateMachine, EventEmitter)
function StateMachine (transitions, onError, accessorName) {
	EventEmitter.call(this)

	accessorName || (accessorName = 'state')
	var currentState

	var matchState = function (state, pattern) {
		if (Array.isArray(pattern)) {
			return pattern.some(matchState.bind(this, state))
		}
		return pattern == '*' || state == pattern
	}

	var transition = function (to) {

		var matching = transitions.filter(function (t) {
			return matchState(to, t.to) && matchState(currentState, t.from)
		})

		if (to != 'errored' && !matching.length) {
			var msg = "Illegal transition from:'" + currentState + "' to:'" + to + "'"
			onError.call(this, new Error(msg))
			return false
		}

		for (var m in matching) installMethods(matching[m].methods)
		this.emit(currentState = to)
		return true
	}.bind(this)

	
	var installMethods = function (methods) {
		if (!methods) return
		for (var name in methods) this[name] = methods[name]
	}.bind(this)

	this[accessorName] = function (to) {
		if (!to) return currentState;

		if (to === currentState) return true;

		var extra = Array.prototype.slice.call(arguments, 1)

		return transition(to)
	}.bind(this)

	currentState = transitions[0].to
	installMethods(transitions[0].methods)
}
