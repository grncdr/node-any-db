var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

module.exports = StateMachine
module.exports.IllegalTransitionError = IllegalTransitionError;
module.exports.UndefinedMethodError = UndefinedMethodError;
module.exports.nullImplementation = nullImplementation;

inherits(StateMachine, EventEmitter)
function StateMachine (initialState, prototypes, transitions) {
  EventEmitter.call(this)

  var currentState = null;

  this.state = function (to) {
    if (!to) return currentState;

    if (to === currentState) return true;

    if (typeof prototypes[to] !== 'function') {

    }

    var extra = Array.prototype.slice.call(arguments, 1)
      , legal = currentState ? transitions[currentState] : [initialState]

    if (legal && legal.indexOf(to) > -1) {
      if (this.log) {
        this.log("Transition from:'" + currentState + "' to:'" + to + "'");
      }
      currentState = to;
      if (!prototypes[to]) {
        throw new Error('unknown state:' + to);
      }
      this.__proto__ = prototypes[to].prototype
      this.emit(currentState)
      return true
    } else {
      extra.unshift(new IllegalTransitionError(currentState, to))
      this.handleError.apply(this, extra)
      return false
    }
  }

  this.state(initialState);
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

function nullImplementation (methodName) {
  return function () {
    var lastArg = [].slice.call(arguments).pop();
    var error = new StateMachine.UndefinedMethodError(methodName, this.state())
    if (typeof lastArg == 'function') {
      debugger
      lastArg(error);
    } else {
      this.emit('error', error);
    }
  }
}
