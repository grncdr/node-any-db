var test = require('tape')

var interfaces = require('../../interfaces')

var config  = require('../../config')
var adapter = config.adapter


test("Adapter properties", function (t) {
  interfaces.Adapter.testProperties(adapter, t)
  t.end()
})

test('Connection properties', function (t) {
  t.test('sync connection creation', function (t) {
    var conn = adapter.createConnection(config.url)
    interfaces.Connection.testProperties(conn, adapter, t)
    conn.end()
    t.end()
  })

  t.test('async connection creation', function (t) {
    adapter.createConnection(config.url, function (err, conn) {
      interfaces.Connection.testProperties(conn, adapter, t)
      conn.end()
      t.end()
    })
  })
})

test('Query properties', function (t) {
  var sql = 'SELECT 1 AS ok WHERE 1 = $1'
  var query = adapter.createQuery(sql, [1], queryCallback)

  interfaces.Query.testProperties(query, t)

  t.equal(query.text, sql, 'query.text is equal to passed in SQL')
  t.looseEquals(query.values[0], 1)
  t.equal(query.callback, queryCallback, 'query.callback is equal to passed callback')
  t.end()

  function queryCallback (err, res) {
    /** an empty callback we're just using for an identity check */
  }
})

test('ResultSet properties', function (t) {
  var conn = adapter.createConnection(config.url)

  conn.query('SELECT 10 AS "shouldBeTen"', function (err, result) {
    if (err) throw err;
    interfaces.ResultSet.testProperties(result, t)
    t.equal(result.fields[0].name, "shouldBeTen", "field has a name property")
    t.equal(result.rowCount, 1, 'rowCount == 1')
    t.equal(result.rows[0].shouldBeTen, 10, 'shouldBeTen == 10')
    conn.end()
    t.end()
  })
})
