exports.testProperties = function(result, assert) {
  assert.ok(Array.isArray(result.rows), 'result.rows is an Array')
  assert.ok(Array.isArray(result.fields), 'result.fields is an Array')
  assert.equal(typeof result.rowCount, 'number', 'result.rowCount is a number')
}
