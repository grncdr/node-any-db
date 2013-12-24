var mysql = require('mysql')
var Connection = require('mysql/lib/Connection')
var ConnectionConfig = require('mysql/lib/ConnectionConfig')

var extend = require('extend')
var inherits = require('inherits')


exports.name = 'mysql'

exports.createQuery = function (text, params, callback) {
  if (text._query) return text
  if (typeof params == 'function') {
    callback = params
    params = []
  }
  callback = wrapQueryCallback(callback)
  var _query = mysql.createQuery(text, params, callback)
  var query = extend(_query.stream(), {
    _query: _query,
    text: text,
    values: params || [],
    callback: callback
  })
  query.once('end', function () { delete query._query })
  return query
}

exports.createConnection = function createConnection(opts, callback) {
  var conn = new MySQLConnection(opts)

  if (callback) {
    conn.connect(function (err) {
      if (err) callback(err)
      else callback(null, conn)
    })
  } else {
    conn.connect()
  }

  return conn
}

inherits(MySQLConnection, Connection)
function MySQLConnection (opts) {
  Connection.call(this, {config: new ConnectionConfig(opts)})
}

MySQLConnection.prototype.adapter = 'mysql'

MySQLConnection.prototype.query = function (text, params, callback) {
  var query = exports.createQuery(text, params, callback)
  Connection.prototype.query.call(this, query._query)
  return query
}

MySQLConnection.prototype.createQuery = function (text, params, callback) {
  return exports.createQuery(text, params, callback)
}

function wrapQueryCallback(callback) {
  if (!callback) return
  return function (err, rows) {
    if (err) callback.call(this, err)
    else {
      callback.call(this, null, {
        rows: rows,
        rowCount: rows.length,
        lastInsertId: rows.insertId
      })
    }
  }
}
