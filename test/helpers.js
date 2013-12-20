var fs = require('fs')
var anyDB = require('any-db')
var test = require('tap').test
require('any-db-sqlite3').verbose()

var sqliteFilename =  "/tmp/any-db-test.db"

var databaseUrls = exports.databaseUrls = {
  mysql: process.env.any_db_mysql_test_url || "mysql://root@localhost/any_db_test",
  postgres: process.env.any_db_postgres_test_url || "postgres://postgres@localhost/any_db_test",
  sqlite3: process.env.any_db_sqlite3_test_url || "sqlite3://" + sqliteFilename
}

var invalidDatabaseUrls = {
  mysql: "mysql://root@localhost/no_db_with_this_name_should_exist",
  postgres: "postgres://postgres@localhost/no_db_with_this_name_should_exist"
}

if (process.env.any_db_test_drivers) {
  Object.keys(databaseUrls).forEach(function (driver) {
    if (process.env.any_db_test_drivers.indexOf(driver) == -1) {
      delete databaseUrls[driver]
    }
  });
  Object.keys(invalidDatabaseUrls).forEach(function (driver) {
    if (process.env.any_db_test_drivers.indexOf(driver) == -1) {
      delete invalidDatabaseUrls[driver]
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
      t.on('end', function () {
        if (tx.state() != 'closed') {
          tx.rollback(conn.end.bind(conn))
        } else {
          conn.end()
        }
      })
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
      idleTimeoutMillis: 1000
    })
    if (!opts.keepOpen) t.on('end', pool.close.bind(pool))
    callback(pool, t)
  })
})

exports.allErrorPools = testRunner(function (description, opts, callback) {
  _testEachInvalidDriver(description, opts, function (connString, t) {
    var pool = anyDB.createPool(connString, {
      max: 2,
      min: 0,
      idleTimeoutMillis: 1000
    })
    if (!opts.keepOpen) t.on('end', pool.close.bind(pool))
    callback(pool, t)
  })
})

function _testEachDriver(description, opts, callback) {
  var testOpts = {
    timeout: opts.timeout || 3000,
    drivers: opts.drivers || Object.keys(databaseUrls)
  }
  test(description, testOpts, function (t) {
    t.plan(testOpts.drivers.length)
    testOpts.drivers.forEach(function (driver) {
      if (driver == 'sqlite3') {
        try { fs.unlinkSync(sqliteFilename) } catch (e) {}
      }
      t.test(driver, function (t) {
        callback(databaseUrls[driver], t)
      })
    })
  })
}

function _testEachInvalidDriver(description, opts, callback) {
  var testOpts = {
    timeout: opts.timeout || 3000,
    drivers: opts.drivers || Object.keys(invalidDatabaseUrls)
  }
  test(description, testOpts, function (t) {
    t.plan(testOpts.drivers.length)
    testOpts.drivers.forEach(function (driver) {
      if (driver == 'sqlite3') {
        try { fs.unlinkSync(sqliteFilename) } catch (e) {}
      }
      t.test(driver, function (t) {
        callback(invalidDatabaseUrls[driver], t)
      })
    })
  })
}

function testRunner(run) {
  return function (description, opts, callback) {
    if (!callback) {
      callback = opts
      opts = {}
    }
    run(description, opts, callback)
  }
}

exports.debugIf = function (orig, cond) {
  return function () {
    if (cond.apply(this, arguments)) {
      console.log(Array.prototype.slice.apply(arguments))
    }
    return orig.apply(this, arguments)
  }
}
