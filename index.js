'use strict'
var mysql = require('mysql')
var Connection = require('mysql/lib/Connection')
var ConnectionConfig = require('mysql/lib/ConnectionConfig')

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

  var query  = mysql.createQuery(text, values)
  var stream = query.stream({highWaterMark: highWaterMark})

  var _read = stream._read
  stream._read = function () {
    // _read should be a no-op before a connection is available
    query._connection && _read.call(this)
  }
  stream.query  = query
  stream.text   = text
  stream.values = values

  if (stream.callback = callback) {
    var result = {rowCount: 0, rows: [], lastInsertId: null, fields: null}
    var errored = false
    stream
      .on('error', function (err) {
        errored = true
        this.callback(err)
      })
      .on('fields', function (fields) {
        result.fields = fields
      })
      .on('data', function (row) {
        if (row.constructor.name == 'OkPacket') {
          result.fieldCount = row.fieldCount
          result.rowCount = result.affectedRows = row.affectedRows
          result.changedRows = row.changedRows
          result.lastInsertId = row.insertId
        } else {
          result.rowCount = result.rows.push(row)
        }
      })
      .on('end', function () {
        if (!errored) this.callback(null, result)
      })
  }

  stream.once('end', function () { delete this.query })
  return stream
}

adapter.createConnection = function createConnection(opts, callback) {
  var conn = new MySQLConnection(opts)

  conn.connect(function (err) {
    if (err) return callback ? callback(err) : conn.emit('error', err)
    conn.emit('open')
    if (callback) callback(null, conn)
  })

  return conn
}

inherits(MySQLConnection, Connection)
function MySQLConnection (opts) {
  Connection.call(this, {config: new ConnectionConfig(opts)})
}

MySQLConnection.prototype.adapter = adapter

MySQLConnection.prototype.query = function (text, params, callback) {
  var stream = adapter.createQuery(text, params, callback)
  this.emit('query', stream)
  Connection.prototype.query.call(this, stream.query)
  return stream
}
