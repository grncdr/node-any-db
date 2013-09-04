var test = require('tap').test
var urls = require('./helpers').databaseUrls
var createPool = require('../').createPool

test('ConnectionPool onConnect/reset hooks', function (t) {
	var names = Object.keys(urls)
	t.plan(names.length)
	names.forEach(function (name) {
		t.test(name + ' driver', function (t) {
			// Create a pool with 2 connections maximum.
			// each connection should be initialized once and reset once
			t.plan(6)
			var connectCount = 2, resetCount = 4

			var pool = createPool(urls[name], {
				max: 2,
				onConnect: function (conn, ready) {
					t.ok(connectCount-- > 0, name + ' - onConnect called')
					ready(null, conn)
				},
				reset: function (conn, ready) {
					t.ok(resetCount-- > 0, name + ' - reset called')
					ready()
				}
			})
			t.on('end', pool.close.bind(pool))
			for (var i in [1, 2, 3, 4]) pool.query('SELECT 1')
		})
	})
})
