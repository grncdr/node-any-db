anyDB = require('../')
test = require('tap').test

databaseUrls = {
  mysql: "mysql://root@localhost/any_db_test",
  sqlite3: "sqlite3://:memory:",
  postgres: "postgres://postgres@localhost/any_db_test"
}

exports.allDrivers = function (description, callback) {
  /*
  Run ``callback(pool, tap_test)`` where ``pool`` is a connection to the test
  database, and ``tap_test`` is a node-tap test object
  */
	_testEachDriver(description, function (connString, t) { 
		anyDB.createConnection(connString, function (err, conn) {
			if (err) throw err
			t.on('end', conn.end.bind(conn))
			callback(conn, t)
		})
	})
}

exports.allPools = function (description, callback) {
  /*
  Run ``callback(pool, tap_test)`` where ``pool`` is a connection pool
	that will connect to the test database and ``tap_test`` is a node-tap test
	object.
  */
  var dbname = 'db_any_test'
    , i = 0;
	_testEachDriver(description, function (connString, t) {
		var pool = anyDB.getPool(connString, {max: 2})
		callback(pool, t)
	})
}

function _testEachDriver (description, callback) {
	test(description, function (outer_t) {
		Object.keys(databaseUrls).forEach(function (driverName) {
			outer_t.test(driverName, function (t) {
				callback(databaseUrls[driverName], t)
			})
		})
	})
}
