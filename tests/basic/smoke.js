var test = require('../test')

test.withConnection('Select 1', function (conn, t) {
  t.plan(2)
  conn.query('SELECT 1 AS ok', function (err, res) {
    t.assert(!err, "No error")
    t.deepEqual(res.rows, [{ok: 1}])
  })
})
