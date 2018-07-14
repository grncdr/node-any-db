require('../test')('Query errors', function(conn, t) {
  t.plan(2)

  conn.query('invalid sql statement', function(err) {
    t.ok(err, 'received error in callback')
  })

  conn.query('invalid sql statement').on('error', function(err) {
    t.ok(err, 'received error in error event')
  })
})
