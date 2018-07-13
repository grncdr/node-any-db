'use strict'

var pg = require('pg')
var QueryStream = require('pg-query-stream')
var inherits = require('inherits')

var adapter = exports

adapter.name = 'postgres'

adapter.createQuery = function (text, params, callback) {
  if (typeof text === 'string') {
    return new PostgresQuery(text, params, callback)
  }
  return text
}

adapter.createConnection = function (opts, callback) {
  var conn = new PostgresConnection(opts)
  conn.connect(callback)
  conn.once('connect', conn.emit.bind(conn, 'open'))
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
  return pg.Client.prototype.query.call(this, query)
}

inherits(PostgresQuery, QueryStream)
function PostgresQuery (text, params, callback) {
  if (typeof params === 'function') {
    callback = params
    params = []
  }
  if (!params) params = []
  this.constructor.super_.call(this, text, params)
  this.super_ = this.constructor.super_.prototype
  if (callback) {
    this.callback = callback
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
  } else {
    this.callback = null
  }
}

PostgresQuery.prototype.handleCommandComplete = function (message) {
  this._result.addCommandComplete(message)
  this.super_.handleCommandComplete.apply(this, arguments)
}

PostgresQuery.prototype.handleRowDescription = function (message) {
  this.super_.handleRowDescription.call(this, message)
  this.emit('fields', message.fields)
}

PostgresQuery.prototype.handleReadyForQuery = function () {
  this.emit('close')
  this.super_.handleReadyForQuery.call(this)
}

PostgresQuery.prototype.handleError = function (err) {
  this.emit('close')
  this.push(null)
  this.super_.handleError.call(this, err)
}
