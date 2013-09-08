var testHelpers = require('./helpers')

testHelpers.allPools('Query property names', {drivers: ['postgres', 'sqlite3']}, function (pool, t) {
	t.plan(2)
  var text = 'SELECT 1 AS ok';
  pool.on('query', function (q) {
    t.equal(text, q.text, 'query has correct .text property');
    t.deepEqual([1], q.values, 'query has correct .values property');
  });
	pool.query(text, [1])
})
