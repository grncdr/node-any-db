var test = require('tap').test

var parseUrl = require('any-db/lib/parse-url')

test('parseUrl', function (t) {
  t.plan(2)
  t.test('parsing strings', function (t) {
    t.plan(1)
    t.deepEqual(parseUrl('mysql://user:pass@somehost:123/somedb'), {
      adapter: 'mysql',
      user: 'user',
      password: 'pass',
      host: 'somehost',
      port: 123,
      database: 'somedb'
    }, 'simple url')
  })

  t.test('parsing objects', function (t) {
    t.plan(2)
    var config = {adapter: 'blah'}
    t.deepEqual(parseUrl(config), config, 'passes through config object')
    t.throws(function () { parseUrl({}) }, "throws without 'adapter'")
  })
})
