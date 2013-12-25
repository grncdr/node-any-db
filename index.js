var mysql = require('mysql')
var Connection = require('mysql/lib/Connection')
var ConnectionConfig = require('mysql/lib/ConnectionConfig')

var extend = require('extend')
var inherits = require('inherits')

var adapter = exports

adapter.name = 'mysql'

adapter.createQuery = function (text, values, callback) {
  if (text.query) return text // being passed an existing query object

  var highWaterMark = 128;

  if (typeof callback == 'number') {
    // createQuery(text, values, streamOptions) => Query
    highWaterMark = callback
    callback = undefined
  }
  if (!callback) {
    switch (typeof values) {
      case 'number':
        highWaterMark = values
      break
      case 'function':
        callback = values
        values = []
      break
      default:
        values = values || []
    }
  }

  callback = wrapQueryCallback(callback)

  var query  = mysql.createQuery(text, values, callback)
  var stream = query.stream({highWaterMark: highWaterMark})
  extend(stream, {
    query:    query,
    text:     text,
    values:   values,
    callback: callback,
  })

  // error will be sent to callback and emitted
  if (callback) stream.once('error', function () {})

  stream.once('end', function () { delete this.query })

  return stream
}

adapter.createConnection = function createConnection(opts, callback) {
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

MySQLConnection.prototype.adapter = adapter

MySQLConnection.prototype.query = function (text, params, callback) {
  var stream = adapter.createQuery(text, params, callback)
  Connection.prototype.query.call(this, stream.query)
  return stream
}

function wrapQueryCallback(callback) {
  if (!callback) return
  return function (err, rows, fields) {
    if (err) callback.call(this, err)
    else callback.call(this, null, {
      rows: rows,
      fields: fields,
      rowCount: rows.length,
      lastInsertId: rows.insertId,
    })
  }
}
