module.exports = chain;

function chain (steps) {
	return function (it, callback) {
		var i = 0;
		(function next (err) {
			if (err) return callback(err);
			var step = steps[i++];
			return step ? step(it, next) : callback(null, it);
		})();
	};
}

// Self-test
if (require.main === module) {
	var assert = require('assert');
	chain([
		function (thing, next) { thing.prop = 1; next(); },
		function (thing, next) { thing.prop2 = 2; next(); }
	])({}, function (err, thing) {
		assert.equal(thing.prop, 1);
		assert.equal(thing.prop2, 2);
	});
	
	chain([
		function (thing, next) { thing.prop = 1; next('error'); },
		function (thing, next) { thing.prop2 = 2; next(); }
	])({}, function (err, thing) {
		assert.equal(err, 'error');
		assert(!thing);
	});
	
	chain([])('passthru', function (err, thing) {
		assert.equal(thing, 'passthru');
	});
}
