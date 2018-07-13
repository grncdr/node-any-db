
var test = require('tape')
var makeChain = require('../lib/chain')

test('lib/chain', function (t) {
  makeChain([
    function (thing, next) { thing.prop = 1; next(); },
    function (thing, next) { thing.prop2 = 2; next(); }
  ])({}, function (err, thing) {
    t.equal(thing.prop, 1, "step 1 called");
    t.equal(thing.prop2, 2, "step 2 called");
  });

  makeChain([
    function (thing, next) { thing.prop = 1; next('error'); },
    function (thing, next) { /* never executed */ }
  ])({}, function (err, thing) {
    t.equal(err, 'error');
    t.ok(!thing, "errors short circuit");
  });

  makeChain([])('passthru', function (err, thing) {
    t.equal(thing, 'passthru', "empty chain is a pass-through");
  });

  makeChain([
    function (thing, next) { throw "error"; }
  ])('passthru', function (err, thing) {
    t.equal(err, 'error', "thrown errors are caught and forwarded");
  });

  t.end()
})
