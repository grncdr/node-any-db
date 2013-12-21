require('../test').withConnection("Nested transactions", function (conn, t) {
  conn.begin(function (err, tx1) {
    if (err) throw err;
    tx1.begin(function (err, tx2) {
      if (err) throw err
      t.ok(!err, "no error when starting nested transaction from open state");
      tx2.commit(function (err) {
        if (err) throw err
        tx1.commit(function (err) {
          if (err) throw err
          t.end();
        })
      })
    })
  })
});
