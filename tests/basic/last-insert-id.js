require('../test').withConnection("Last insert id", function (conn, t) {
  if (conn.adapter == 'postgres') {
    t.skip("Last insert ID not supported by postgres")
    return t.end()
  }
  t.plan(2)

  debugger
  conn.query("DROP TABLE last_insert_id_test", function (err) {})
  if (conn.adapter == 'sqlite3') 
    conn.query("CREATE TABLE last_insert_id_test (id integer primary key autoincrement, a int)")
  else if (conn.adapter == 'mysql')
    conn.query("CREATE TABLE last_insert_id_test (id integer primary key auto_increment, a int)")

  conn.query('INSERT INTO last_insert_id_test (a) VALUES (123)', function (err, res) {
    if (err) throw err
      t.equal(res.lastInsertId, 1)

    conn.query('INSERT INTO last_insert_id_test (a) VALUES (456)', function (err, res) {
      if (err) throw err
        t.equal(res.lastInsertId, 2)
    })
  })
}
                                 )

