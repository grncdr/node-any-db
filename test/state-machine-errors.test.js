var test = require('tap').test
var StateMachine = require('any-db/lib/state-machine');

test('state machine returns error on illegal transition', function (t) {
  var sm = new StateMachine('s1', {
    's1': ['s2'],
    's2': ['s3']
  })
  t.plan(1);
  t.type(sm.state('s3'), StateMachine.IllegalTransitionError)
});

test('calling state machine methods unimplemented states', function (t) {
  var sm = new StateMachine('s1', {s1: ['s2']});
  sm.myMethod = StateMachine.method('myMethod', {
    // no implementation for s1
    's2': function () {}
  });

  t.plan(2);

  sm.myMethod('with callback', function (err) {
    t.type(err, StateMachine.UndefinedMethodError, "Sends error to callback if one is present");
  })

  sm.once('error', function (err) {
    t.type(err, StateMachine.UndefinedMethodError, "Emits 'error' event when there is no callback");
  });

  sm.myMethod('without callback');
});
