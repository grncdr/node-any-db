var pg = require('pg.js')
  , QueryStream = require('pg-query-stream')
  , inherits = require('inherits')
  , concat = require('concat-stream')

var adapter = exports

adapter.name = 'postgres'

adapter.createQuery = function (text, params, callback) {
  if (text instanceof PostgresQuery)
    return text
  return new PostgresQuery(text, params, callback)
}

adapter.createConnection = function (opts, callback) {
  var conn = new PostgresConnection(opts)

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

inherits(PostgresConnection, pg.Client)
function PostgresConnection (opts) {
  pg.Client.call(this, opts)
}

PostgresConnection.prototype.adapter = adapter

PostgresConnection.prototype.query = function (text, params, callback) {
  var query = this.adapter.createQuery(text, params, callback)
  return pg.Client.prototype.query.call(this, query);
}

inherits(PostgresQuery, QueryStream)
function PostgresQuery (text, params, callback) {
  if (typeof params == 'function') {
    callback = params
    params = []
  }
  if (!params) params = [];
  QueryStream.call(this, text, params)
  if (this.callback = callback) {
    var self = this
    this.pipe(concat(function (rows) {
      self._result.rows = rows
      self._result.rowCount = rows.length
      callback(null, self._result)
    }))
    this.on('error', callback)
  }
}

PostgresQuery.prototype.handleRowDescription = function (message) {
  QueryStream.prototype.handleRowDescription.call(this, message)
  this.emit('fields', message.fields)
}
