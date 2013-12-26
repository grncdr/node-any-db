var pg = require('pg.js')
  , QueryStream = require('pg-query-stream')
  , inherits = require('inherits')

var adapter = exports

adapter.name = 'postgres'

adapter.createQuery = function (text, params, callback) {
  if (text instanceof PostgresQuery)
    return text
  return new PostgresQuery(text, params, callback)
}

adapter.createConnection = function (opts, callback) {
  var conn = new PostgresConnection(opts)
  conn.connect(function (err) {
    if (err) return callback ? callback(err) : conn.emit('error', err)
    conn.emit('open')
    if (callback) callback(null, conn)
  })
  return conn
}

inherits(PostgresConnection, pg.Client)
function PostgresConnection (opts) {
  pg.Client.call(this, opts)
}

PostgresConnection.prototype.adapter = adapter

PostgresConnection.prototype.query = function (text, params, callback) {
  var query = this.adapter.createQuery(text, params, callback)
  this.emit('query', query)
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
    var errored = false
    this
      .on('error', function (err) {
        errored = true
        this.callback(err)
      })
      .on('data', function (row) {
        this._result.rowCount = this._result.rows.push(row)
      })
      .on('end', function () {
        if (!errored) this.callback(null, this._result)
      })
  }
}

PostgresQuery.prototype.handleRowDescription = function (message) {
  QueryStream.prototype.handleRowDescription.call(this, message)
  this.emit('fields', message.fields)
}

PostgresQuery.prototype.handleReadyForQuery = function () {
  this.emit('close')
  QueryStream.prototype.handleReadyForQuery.call(this)
}

PostgresQuery.prototype.handleError = function (err) {
  this.emit('close')
  this.push(null)
  QueryStream.prototype.handleError.call(this, err)
}
