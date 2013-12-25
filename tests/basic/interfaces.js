var test = require('tape')
var EventEmitter = require('events').EventEmitter

test("interface properties", function (t) {
  var config  = require('../../config')
  var adapter = config.adapter


  t.test("Adapter interface", function (t) {
    t.equal(typeof adapter.name, 'string')
    t.equal(typeof adapter.createConnection, 'function')
    t.equal(typeof adapter.createQuery, 'function')

    t.test('sync connection creation', function (t) {
      var conn = adapter.createConnection(config.url)
      testConnectionInterface(t, conn)
      t.end()
    })

    t.test('async connection creation', function (t) {
      adapter.createConnection(config.url, function (err, conn) {
        testConnectionInterface(t, conn)
        t.end()
      })
    })
    t.end()
  })

  t.test('Query interface', function (t) {
    var sql = 'SELECT 1 AS ok WHERE 1 = $1'
    var query = adapter.createQuery(sql, [1], queryCallback)
    t.equal(query.text, sql, 'query.text is equal to passed in SQL')
    t.ok(Array.isArray(query.values), 'query.values is an array')
    t.looseEquals(query.values[0], 1)
    t.equal(query.callback, queryCallback, 'query.callback is equal to passed callback')
    t.ok(query instanceof EventEmitter, "Query is an EventEmitter")
    t.equal(typeof query.pause, 'function', 'query.pause is a function (Readable)')
    t.equal(typeof query.resume, 'function', 'query.resume is a function (Readable)')
    t.end()

    function queryCallback (err, res) {
      /** an empty callback we're just using for an identity check */
    }
  })

  t.test('ResultSet interface', function (t) {
    t.plan(6)
    var conn = adapter.createConnection(config.url)
    conn.query('SELECT 10 AS "shouldBeTen"', function (err, result) {
      if (err) throw err;
      t.ok(Array.isArray(result.rows), "result.rows is an Array")
      t.ok(Array.isArray(result.fields), "result.fields is an Array")
      t.equal(result.fields[0].name, "shouldBeTen", "field has a name property")
      t.equal(result.rowCount, 1, 'rowCount == 1')
      t.equal(result.rows[0].shouldBeTen, 10, 'shouldBeTen == 10')
      conn.end()
    }).on('end', function () {
      t.pass('got "end" event')
    })
  })

  function testConnectionInterface(t, conn) {
    t.ok(conn instanceof EventEmitter, "Connection is an EventEmitter")
    t.equal(conn.adapter, adapter, 'connection.adapter == adapter')
    t.equal(typeof conn.query, 'function', 'connection.query is a function')
    t.equal(typeof conn.end, 'function', 'connection.end is a function')
    conn.end()
  }
})
