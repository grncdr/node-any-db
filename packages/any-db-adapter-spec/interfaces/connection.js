var Queryable = require('./queryable')

exports.testProperties = function(connection, adapter, assert) {
  Queryable.testProperties(connection, adapter, assert, 'connection')
  assert.equal(typeof connection.end, 'function')
}

exports.testEvents = function(connection, assert) {
  connection.on('open', function() {
    assert.ok(1, 'connection.emit("open")')
    Queryable.testEvents(connection, assert, 'connection')
  })
}

exports.testEvents.plan = 1 + Queryable.testEvents.plan
