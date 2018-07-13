
exports.testProperties = function (adapter, assert) {
  assert.equal(typeof adapter.name, 'string', 'adapter.name is a string')
  assert.equal(typeof adapter.createConnection, 'function', 'adapter.createConnection is a function')
  assert.equal(typeof adapter.createQuery, 'function', 'adapter.createQuery is a function')
}
