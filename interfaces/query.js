var EventEmitter = require('events').EventEmitter

exports.testProperties = function (query, assert) {
  assert.ok(query instanceof EventEmitter, "query is an EventEmitter")
  assert.equal(typeof query.text,   'string',   'query.text is a string')
  assert.equal(typeof query.values, 'object',   'query.values is an object')
  assert.equal(typeof query.pause,  'function', 'query.pause is a function')
  assert.equal(typeof query.resume, 'function', 'query.resume is a function')
  if (query.callback) assert.equal(typeof query.callback, 'function',
                                   'query.callback is a function')
}
