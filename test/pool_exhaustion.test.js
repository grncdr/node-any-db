
require('./helpers').allPools("Pool exhaustion/queueing", function (pool, t) {
  t.plan(6)
  var ok = function (val) {
    return function (err, res) {
      t.ok(!err, "No error for query " + val)
      t.equal(res.rows[0].val, val, "Got result for query " + val)
    }
  }
  pool.query('SELECT 1 AS val', ok(1))
  pool.query('SELECT 2 AS val', ok(2))
  pool.query('SELECT 3 AS val', ok(3))
})
