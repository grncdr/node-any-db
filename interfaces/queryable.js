var EventEmitter = require('events').EventEmitter

exports.testProperties = function (queryable, adapter, assert, name) {
  name = name || 'queryable'
  assert.ok(queryable instanceof EventEmitter, name + ' is an EventEmitter')
  assert.equal(typeof queryable.query, 'function', name + '.query is a function')
  assert.equal(typeof queryable.adapter, 'object', name + '.adapter is an object')
  assert.equal(queryable.adapter, adapter, name + '.adapter == adapter')
}

exports.testEvents = function (queryable, assert, name) {
  name = name || 'queryable'

  var emittedData = false
    , emittedFields = false
    , emittedEnd = false

  var query = queryable.adapter.createQuery('SELECT 1 AS val', function (err, result) {
    if (err) throw err
    assert.ok(emittedFields, 'callback after query.emit("fields", fields)')
    assert.ok(emittedData,   'callback after query.emit("data", row)')
    assert.ok(!emittedEnd,   'callback before query.emit("end")')
  })

  queryable.on('query', function (q) {
    assert.equal(q, query, name + '.emit("query", query)')
  })

  query.on('fields', function (fields) {
    emittedFields = true
    assert.equal(fields[0].name, 'val', '"fields" event is correct')
  })

  query.on('data', function (row) {
    emittedData = true
    assert.ok(emittedFields, 'query.emit("data") after query.emit("fields")')
    assert.equal(row.val, 1)
  })

  query.on('end', function (arg) {
    emittedEnd = true
    assert.ok(emittedFields, 'query.emit("end") after query.emit("fields")')
    assert.ok(emittedData, 'query.emit("end") after query.emit("data")')
    assert.ok(!arg, 'No extra arguments to "end" event')
  })

  assert.equal(queryable.query(query), query, name + '.query(query) returns same query')
}

exports.testEvents.plan = 11
