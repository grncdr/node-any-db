assert = require('assert')
require('./helpers').allDrivers('Select 1', function (conn, done) {
	conn.query('SELECT 1 AS ok', function (err, res) {
		if (err) return done(err)
		try {
			assert.deepEqual([{ok: 1}], res)
			done()
		} catch (err) {
			done(err)
		}
	})
})
