
require('./helpers').allErrorPools("Pool query error handling", function (pool, t) {
  t.plan(2);
  pool.query('', function(err) {
    t.assert(err, "Error should be defined")
  });
  pool.query('', [], function(err) {
    t.assert(err, "Error should be defined")
  });
});


