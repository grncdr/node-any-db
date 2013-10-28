require('./helpers').allDrivers("Nested transactions", function (conn, t) {
  t.plan(2)
  conn.query("DROP TABLE transaction_test", function (err) {})
  conn.query("CREATE TABLE transaction_test (a int)")

  var tx1 = conn.begin()
  tx1.query('INSERT INTO transaction_test (a) VALUES (1)')

  tx1.savepoint(function(tx2){
    tx2.query('INSERT INTO transaction_test (a) VALUES (2)')

    tx2.query('SELECT * FROM transaction_test', function (err, res) {
      if (err) throw err
      t.deepEqual(res.rows, [{a: 1}, {a: 2}])

      tx2.rollback(function(err){
        if (err) throw err
        tx1.commit(function(err){
          if (err) throw err
          conn.query('SELECT * FROM transaction_test', function (err, res) {
            if (err) throw err
            t.deepEqual(res.rows, [{a: 1}])
          })
        })
      })
    })
  })
})
