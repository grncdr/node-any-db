require('./helpers').allPools("Pool query events", function (pool, t) {
  t.plan(5)

  var expected = [
    'SELECT 1',
    'begin',
    'SELECT 1 AS txval',
    'rollback'
  ]

  pool.on('query', function onQuery(query) {
    var stmt = query.sql || query.text || query.stmt;
    t.equal(stmt, expected.shift())
    if (!expected.length) pool.removeListener('query', onQuery);
  })

  pool.query('SELECT 1', [])

  pool.begin(function (err, tx) {
    t.ok(!err, 'no error on pool.begin')
    tx.query('SELECT 1 AS txval')
    tx.rollback()
  })
})

