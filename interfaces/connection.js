var Queryable = require('./queryable')

exports.testProperties = function (connection, adapter, assert) {
  Queryable.testProperties(connection, adapter, assert, 'connection')
  assert.equal(typeof connection.end, 'function')
}

exports.testEvents = function (assert, connection) {
  connection.on('query', function (_query) {
    assert.equal(_query, query, "Connection emitted query object")
  })
  var query = connection.query('SELECT 1')
}
