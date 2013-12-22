var test = require('tape')
var ConnectionPool = require('../')

test('Illegal pool options', function (t) {
  t.plan(2)

  var warn = console.warn
  console.warn = t.pass.bind(t, "printed warning")
  
  ConnectionPool({}, {}, {create: function () {}})
  ConnectionPool({}, {}, {destroy: function () {}})

  console.warn = warn
})
