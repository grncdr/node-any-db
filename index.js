var pg = require('pg.js')
  , QueryStream = require('pg-query-stream')
  , inherits = require('inherits')
  , concat = require('concat-stream')

exports.name = 'postgres'

exports.createQuery = function (text, params, callback) {
  if (text instanceof PostgresQuery)
    return text
  return new PostgresQuery(text, params, callback)
}

exports.createConnection = function (opts, callback) {
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

PostgresConnection.prototype.adapter = 'postgres'

PostgresConnection.prototype.query = function (text, params, callback) {
  var query = this.createQuery(text, params, callback)
  return pg.Client.prototype.query.call(this, query);
}

PostgresConnection.prototype.createQuery = function (text, params, callback) {
  return exports.createQuery(text, params, callback)
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
    this.pipe(concat(function (rows) {
      callback(null, { rowCount: rows.length, rows: rows })
    }))
    this.on('error', callback)
  }
}
