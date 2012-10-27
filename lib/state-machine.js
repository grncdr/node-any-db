module.exports = StateMachine
function StateMachine (initialState, methods, transitions, onError) {
	var currentState = initialState
		, assignMethods;

	(assignMethods = (function () {
		for (var methodName in methods) {
			this[methodName] = methods[methodName][currentState]
		}
	}).bind(this))()

	this.state = function (to) {
		if (!to) return currentState;

		var extra = Array.prototype.slice.call(arguments, 1)
		  , legal = transitions[currentState]

		if (to === 'errored' || legal && legal.indexOf(to) > -1) {
			this.log && this.log("Transition from:'" + currentState + "' to:'" + to + "'")
			currentState = to;
			assignMethods();
			this.emit(currentState)
			return true
		} else {
			var msg = "Illegal transition from:'" + currentState + "' to:'" + to + "'"
			extra.unshift(new Error(msg))
			onError.apply(this, extra)
			return false
		}
	}
}
