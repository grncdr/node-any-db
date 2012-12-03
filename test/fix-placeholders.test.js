var fixPlaceholders = require('../lib/helpers').fixPlaceholders
var test = require('tap').test

test('Placeholder replacement', function (t) {
	t.plan(5)
	function placeholderTest (args, result) {
		t.deepEqual(fixPlaceholders.apply(null, args), result)
	}
	placeholderTest(['$1', [10]],                          ['?', [10]])
	placeholderTest(["'$1'", [10]],                        ["'$1'", []])
	placeholderTest(["'like ''$money'''", [10]],           ["'like ''$money'''", []])
	placeholderTest(["$what = $ok", {what: 1, ok: 2}],     ['? = ?', [1, 2]])
	placeholderTest(["$1 $5 $10", [1,2,3,4,5,6,7,8,9,10]], ['? ? ?', [1, 5, 10]])
})
