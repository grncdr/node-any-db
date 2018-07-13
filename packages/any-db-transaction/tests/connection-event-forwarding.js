var begin = require('../')

require('../test')("Forwarding of connection events", function (conn, t) {
  var tx1 = begin(conn)

  t.test("root transaction", function (t) {
    t.ok(conn.listeners('error').indexOf(tx1.handleError) > -1,
         "Transaction forwards 'error' event")

    t.ok(conn.listeners('query').indexOf(tx1._emitQuery) > -1,
         "Transaction forwards 'query' event")

    t.end()
  })

  t.test('With nested transaction in progress', function (t) {
    begin(tx1, function (err, tx2) {
      if (err) throw err;

      t.ok(conn.listeners('error').indexOf(tx2.handleError) > -1,
           "Child transaction forwards 'error' event")

      t.ok(conn.listeners('query').indexOf(tx2._emitQuery) > -1,
           "Child transaction forwards 'query' event")

      t.ok(tx2.listeners('query').indexOf(tx1._emitQuery) > -1,
           "Parent transaction forwards child 'query' event")

      t.ok(conn.listeners('error').indexOf(tx1.handleError) < 0,
           "Parent transaction does *not* forward connection 'error' event")

      t.ok(conn.listeners('query').indexOf(tx1._emitQuery) < 0,
           "Parent transaction does *not* forward connection 'query' event")

      tx2.commit(function (err) {
        if (err) throw err;
        t.end()
      })
    })
  })

  t.test('After nested transaction completes', function (t) {
    t.ok(conn.listeners('error').indexOf(tx1.handleError) > -1,
         "Transaction forwards 'error' event again")

    t.ok(conn.listeners('query').indexOf(tx1._emitQuery) > -1,
         "Transaction forwards 'query' event again")

    tx1.commit(function (err) {
      if (err) throw err;
      t.end()
    })
  })
})
