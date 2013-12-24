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
    t.plan(3)
    var query = adapter.createQuery('SELECT 1 AS ok')
    t.equal(query.text, 'SELECT 1 AS ok')
    t.deepEqual(query.values, [])
    t.ok(query instanceof EventEmitter, "Query must be an EventEmitter")
  })

  function testConnectionInterface(t, conn) {
    t.equal(typeof conn.adapter, 'string')
    t.equal(conn.adapter, adapter.name)
    t.equal(typeof conn.query, 'function')
    t.equal(typeof conn.createQuery, 'function')
    t.equal(typeof conn.end, 'function')
    t.ok(conn instanceof EventEmitter, "Connection must be an EventEmitter")
    conn.end()
  }
})
