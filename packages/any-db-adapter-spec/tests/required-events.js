var test = require('tape')

var interfaces = require('../interfaces')

var config  = require('../config')
var adapter = config.adapter

test('Connection & Query events', function (t) {
  t.plan(interfaces.Connection.testEvents.plan)
  var connection = adapter.createConnection(config.url)
  interfaces.Connection.testEvents(connection, t)
  t.on('end', connection.end.bind(connection))
})
