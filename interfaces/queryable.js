var EventEmitter = require('events').EventEmitter

exports.testProperties = function (queryable, adapter, test, name) {
  name = name || 'queryable'
  test.ok(queryable instanceof EventEmitter, name + ' is an EventEmitter')
  test.equal(typeof queryable.query, 'function', name + '.query is a function')
  test.equal(typeof queryable.adapter, 'object', name + '.adapter is an object')
  test.equal(queryable.adapter, adapter, name + '.adapter == adapter')
}

exports.testEvents = function (queryable, test, name) {
  name = name || 'queryable'

  test.test(name + '.query events with callbacks', function (test) {
    testEventsWithResults(queryable, test, name)
  })

  test.test(name + '.query events with no result and no callback', function (test) {
    testEventsNoResultsNoCallback(queryable, test, name)
  })

  test.test(name + '.query events with errors', function (test) {
    testEventsQueryError(queryable, test, name)
  })
}

function testEventsWithResults (queryable, test, name) {
  test.plan(19)
  var emittedFields = false
    , emittedData = false
    , emittedClose = false
    , emittedEnd = false
    , callbackCalled = false

  var query = queryable.adapter.createQuery('SELECT 1 AS val', function (err, result) {
    test.ok(!callbackCalled, 'callback was not already called')
    if (err) throw err
    callbackCalled = true
    test.ok(emittedFields, 'callback after query.emit("fields", fields)')
    test.ok(emittedData,   'callback after query.emit("data", row)')
    test.ok(emittedClose,  'callback after query.emit("close")')
    test.ok(!emittedEnd,   'callback before query.emit("end")')
  })

  queryable.once('query', function (q) {
    test.equal(q, query, name + '.emit("query", query)')
  })

  query.on('fields', function (fields) {
    emittedFields = true
    test.ok(Array.isArray(fields), '"fields" event value is an array')
  })

  query.on('data', function (row) {
    emittedData = true
    test.ok(emittedFields, 'query.emit("data") after query.emit("fields")')
    test.equal(row.val, 1)
  })

  query.on('close', function (arg) {
    test.ok(!emittedClose, 'query.emit("close") emitted once')
    emittedClose = true
    test.ok(emittedFields, 'query.emit("close") after query.emit("fields")')
    test.ok(emittedData, 'query.emit("close") after query.emit("data")')
    test.ok(!arg, 'No extra arguments to "end" event')
  })

  query.on('end', function (arg) {
    test.ok(!emittedEnd, 'query.emit("end") emitted once')
    emittedEnd = true
    test.ok(emittedClose, 'query.emit("end") after query.emit("close")')
    test.ok(emittedFields, 'query.emit("end") after query.emit("fields")')
    test.ok(emittedData, 'query.emit("end") after query.emit("data")')
    test.ok(!arg, 'No extra arguments to "end" event')
  })

  test.equal(queryable.query(query), query, name + '.query(query) returns same query')
}

function testEventsNoResultsNoCallback (queryable, test, name) {
  test.plan(2)
  var sql = 'SELECT 1 AS val WHERE 0 = 1'

  if (queryable.adapter.name == 'mysql') {
    sql = 'SELECT 1 AS val FROM INFORMATION_SCHEMA.TABLES WHERE 0 = 1';
  }

  var emittedFields = false
  var query = queryable.query(sql)

  query.on('fields', function (fields) {
    emittedFields = true
    test.ok(Array.isArray(fields), '"fields" event value is an array')
  })

  query.on('close', function () {
    test.ok(emittedFields, 'query.emit("close") after query.emit("fields")')
  })

  query.on('end', function () {
    test.fail('query emitted "end" with no reader!')
  })
}

function testEventsQueryError (queryable, test, name) {
  test.plan(6)

  var emittedClose = false
    , emittedError = false
    , emittedEnd = false

  var query = queryable.query('not a valid SQL statement', function (err, result) {
    test.ok(emittedClose, 'callback called after query.emit("close")')
    test.ok(!emittedError, 'callback is first listener to query.emit("error")')
    test.ok(!emittedEnd, 'callback before query.emit("end")')
  })

  query.on('error', function (err) {
    emittedError = true
    test.ok(err, 'query.emit("error", err)')
  })

  query.on('close', function () {
    emittedClose = true
    test.pass('query.emit("close")')
  })

  query.on('end', function () {
    emittedEnd = true
    test.pass('query.emit("end")')
  })
}

exports.testEvents.plan = 3
