var anyDB = require('../')
var test = require('tap').test
require('sqlite3').verbose()

var databaseUrls = exports.databaseUrls = {
	mysql: "mysql://root@localhost/any_db_test",
	postgres: "postgres://postgres@localhost/any_db_test",
	sqlite3: "sqlite3://:memory:",
}

if (process.env.TEST_DRIVERS) {
	Object.keys(databaseUrls).forEach(function (driver) {
		if (process.env.TEST_DRIVERS.indexOf(driver) == -1) {
			delete databaseUrls[driver]
		}
	})
}

/**
 * Run ``callback(conn, tap_test)`` where ``conn`` is a connection to the test
 * database, and ``tap_test`` is a node-tap test object
 */
exports.allDrivers = testRunner(function (description, opts, callback) {
	_testEachDriver(description, opts, function (connString, t) { 
		anyDB.createConnection(connString, function (err, conn) {
			if (err) throw err
			if (opts.autoEnd !== false) t.on('end', conn.end.bind(conn))
			callback(conn, t)
		})
	})
})

/**
 * Run ``callback(tx, tap_test)`` where ``tx`` is an open transaction
 * on the test database, and ``tap_test`` is a node-tap test object
 */
exports.allTransactions = testRunner(function (description, opts, callback) {
	_testEachDriver(description, opts, function (connString, t) { 
		anyDB.createConnection(connString, function (err, conn) {
			if (err) throw err
			var tx = conn.begin()
			tx.url = connString
			t.on('end', tx.rollback.bind(tx, conn.end.bind(conn)))
			tx.on('error', function (err) { t.emit('error', err) })
			callback(tx, t)
		})
	})
})

/**
 * Run ``callback(pool, tap_test)`` where ``pool`` is a connection pool
 * that will connect to the test database and ``tap_test`` is a node-tap test
 * object.
 */
exports.allPools = testRunner(function (description, opts, callback) {
	_testEachDriver(description, opts, function (connString, t) {
		var pool = anyDB.createPool(connString, {
			max: 2,
			min: 0,
			idleTimoutMillis: 1000
		})
		t.on('end', pool.close.bind(pool))
		callback(pool, t)
	})
})

function _testEachDriver (description, opts, callback) {
	var testOpts = {timeout: opts.timeout || 3000}
	test(description, testOpts, function (t) {
		var drivers = Object.keys(databaseUrls)
		t.plan(drivers.length)
		drivers.forEach(function (driver) {
			t.test(driver, function (t) {
				callback(databaseUrls[driver], t)
			})
		})
	})
}

function testRunner (run) {
	return function (description, opts, callback) {
		if (!callback) {
			callback = opts
			opts = {}
		}
		run(description, opts, callback)
	}
}
