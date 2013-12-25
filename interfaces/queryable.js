var EventEmitter = require('events').EventEmitter

exports.testProperties = function (queryable, adapter, assert, name) {
  name = name || 'queryable'
  assert.ok(queryable instanceof EventEmitter, name + ' is an EventEmitter')
  assert.equal(typeof queryable.query, 'function', name + '.query is a function')
  assert.equal(typeof queryable.adapter, 'object', name + '.adapter is an object')
  assert.equal(queryable.adapter, adapter, name + '.adapter == adapter')
}
