var begin = require('../')

require('../test')("Nesting on 'open' transaction", function (conn, t) {
  begin(conn, function (err, tx1) {
    if (err) throw err;
    begin(tx1, function (err, tx2) {
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
