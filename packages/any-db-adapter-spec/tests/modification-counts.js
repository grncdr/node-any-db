require('../test')('Modification counts', function(conn, t) {
  t.plan(3)

  conn.query('DROP TABLE modification_count_test', function(err) {})
  conn.query('CREATE TABLE modification_count_test (a int)')

  conn.query('INSERT INTO modification_count_test (a) VALUES (123)', function(err, res) {
    if (err) throw err
    t.equal(res.rowCount, 1, 'INSERT query result has correct rowCount')

    conn.query('UPDATE modification_count_test SET a = 3', function(err, res) {
      if (err) throw err
      t.equal(res.rowCount, 1, 'UPDATE query result has correct rowCount')
      conn.query('DROP TABLE modification_count_test', function(err) {
        t.error(err)
      })
    })
  })
})
