createConnection = require('../').createConnection

databaseUrls = {
  mysql: "mysql://root@localhost/any_db_test",
  sqlite3: "sqlite3://:memory:",
  postgres: "postgres://postgres@localhost/any_db_test"
}

exports.allDrivers = function (description, driverNames, callback) {
  /*
  Run ``callback(db, tap_test)`` where ``db`` is an engine pointed at an empty
  database, and ``tap_test`` is a node-tap test object
  
  :param driverNames: (Optional) list of engine names to test against.
  */
  if (!callback) {
    callback = driverNames
    driverNames = Object.keys(databaseUrls)
  }

  var dbname = 'db_any_test'
    , i = 0;
  (function nextEngine () {
    var driverName = driverNames[i++]
    if (!driverName) return 
		console.log(description + " - " + driverName)
		createConnection(databaseUrls[driverName], function (err, conn) {
			if (err) throw err
			var t = setTimeout(function () {
				console.log("TIMEOUT: " + description + ' - ' + driverName)
			}, 2000)
			callback(conn, function (err) {
				if (err) throw err
				clearTimeout(t)
				console.log('ok')
				conn.end(function () { process.nextTick(nextEngine) })
			})
		})
  })()
}

