var inOrder = require('assert-in-order')
var EventEmitter = require('events').EventEmitter

exports.testProperties = function(queryable, adapter, test, name) {
  name = name || 'queryable'
  test.ok(queryable instanceof EventEmitter, name + ' is an EventEmitter')
  test.equal(typeof queryable.query, 'function', name + '.query is a function')
  test.equal(typeof queryable.adapter, 'object', name + '.adapter is an object')
  test.equal(queryable.adapter, adapter, name + '.adapter == adapter')
}

exports.testEvents = function(queryable, test, name) {
  name = name || 'queryable'

  test.test(name + '.query events with callbacks', function(test) {
    testEventsWithResults(queryable, test, name)
  })

  test.test(name + '.query events with no result and no callback', function(test) {
    testEventsNoResultsNoCallback(queryable, test, name)
  })

  test.test(name + '.query events with errors', function(test) {
    testEventsQueryError(queryable, test, name)
  })
}

function testEventsWithResults(queryable, test, name) {
  var rows = [{ val: 1 }]
  var expectations = inOrder(test, {
    'query.callback': ['equal', callback, 'query.callback === callback'],
    queryEquals: ['equal', 'query is identical'],
    fields: ['pass', 'query.emit("fields")'],
    rowEquals: ['deepEqual', rows[0], 'got correct row in "data" event'],
    noCloseArgs: ['equal', 0, 'No extra arguments to "close" event'],
    rowsEqual: ['deepEqual', rows, 'got correct rows in callback'],
    noEndArgs: ['equal', 0, 'No extra arguments to "end" event'],
  })

  test.plan(Object.keys(expectations).length)

  var query = queryable.adapter.createQuery('SELECT 1 AS val', callback)
  expectations['query.callback'](query.callback)

  queryable.once('query', function(q) {
    expectations.queryEquals(q, query)
  })

  query.on('fields', function() {
    expectations.fields()
  })

  query.on('data', function(row) {
    expectations.rowEquals(row)
  })

  query.on('close', function() {
    expectations.noCloseArgs(arguments.length)
  })

  query.on('end', function() {
    expectations.noEndArgs(arguments.length)
  })

  test.equal(queryable.query(query), query, name + '.query(query) returns same query')

  function callback(err, result) {
    if (err) throw err
    expectations.rowsEqual(result.rows)
  }
}

function testEventsNoResultsNoCallback(queryable, test, name) {
  test.plan(2)
  var sql = 'SELECT 1 AS val WHERE 0 = 1'

  if (queryable.adapter.name == 'mysql') {
    sql = 'SELECT 1 AS val FROM INFORMATION_SCHEMA.TABLES WHERE 0 = 1'
  }

  var emittedFields = false
  var query = queryable.query(sql)

  query.on('fields', function(fields) {
    emittedFields = true
    test.ok(Array.isArray(fields), '"fields" event value is an array')
  })

  query.on('close', function() {
    test.ok(emittedFields, 'query.emit("close") after query.emit("fields")')
  })

  query.on('end', function() {
    test.fail('query emitted "end" with no reader!')
  })
}

function testEventsQueryError(queryable, test, name) {
  test.plan(5)

  var emittedClose = false,
    emittedError = false,
    emittedEnd = false

  var query = queryable.query('not a valid SQL statement', function(err, result) {
    //test.ok(emittedClose, 'callback called after query.emit("close")')
    test.ok(!emittedError, 'callback is first listener to query.emit("error")')
    test.ok(!emittedEnd, 'callback before query.emit("end")')
  })

  query.on('error', function(err) {
    emittedError = true
    test.ok(err, 'query.emit("error", err)')
  })

  query.on('close', function() {
    emittedClose = true
    test.pass('query.emit("close")')
  })

  query.on('end', function() {
    emittedEnd = true
    test.pass('query.emit("end")')
  })
}

exports.testEvents.plan = 3
