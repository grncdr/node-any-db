var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

module.exports = StateMachine
module.exports.IllegalTransitionError = IllegalTransitionError;
module.exports.UndefinedMethodError = UndefinedMethodError;

inherits(StateMachine, EventEmitter)
function StateMachine (initialState, methods, transitions, onError) {
	EventEmitter.call(this)

	var currentState = initialState;

	var self = this;

	this.state = function (to) {
		if (!to) return currentState;

		if (to === currentState) return true;

		var extra = Array.prototype.slice.call(arguments, 1)
			, legal = transitions[currentState]

		if (to === 'errored' || legal && legal.indexOf(to) > -1) {
			if (this.log) {
				this.log("Transition from:'" + currentState + "' to:'" + to + "'");
			}
			removeMethods();
			currentState = to;
			assignMethods();
			this.emit(currentState)
			return true
		} else {
			extra.unshift(new IllegalTransitionError(currentState, to))
			onError.apply(this, extra)
			return false
		}
	}

	function assignMethods () {
		for (var methodName in methods) {
			if (currentState in methods[methodName]) {
				self[methodName] = methods[methodName][currentState]
			}
		}
	}

	function removeMethods () {
		for (var methodName in methods) {
			if (currentState in methods[methodName]) {
				self[methodName] = methods[methodName][null] || nullImpl(methodName);
			}
		}
	}

	function nullImpl (methodName) {
		return function () {
			var lastArg = [].slice.call(arguments).pop();
			var error = new UndefinedMethodError(methodName, currentState)
			if (typeof lastArg == 'function') {
				lastArg(error);
			} else {
				this.emit('error', error);
			}
		}
	}
}

inherits(UndefinedMethodError, Error);
function UndefinedMethodError(method, state) {
	Error.captureStackTrace(this, UndefinedMethodError);
	this.name = 'Undefined Method';
	this.message = "method '" + method + "' unavailable in state '" + state + "'";
}

inherits(IllegalTransitionError, Error);
function IllegalTransitionError(from, to) {
	Error.captureStackTrace(this, IllegalTransitionError);
	this.name = 'Illegal Transition';
	this.message = "Transition from '" + from + "' to '" + to + "' not allowed";
}
