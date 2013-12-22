var mysql = require('mysql')
var Transaction = require('any-db-transaction')

exports.name = 'mysql'

exports.createQuery = mysql.createQuery

exports.createConnection = function createConnection(opts, callback) {
  var conn = mysql.createConnection(opts)

  conn.adapter = 'mysql'
  conn.begin = beginTransaction

  if (callback) {
    conn.connect(function (err) {
      if (err) callback(err)
      else callback(null, conn)
    })
  } else {
    conn.connect()
  }

  conn.query = wrapQueryMethod(conn.query)
  return conn
}

function wrapQueryMethod(realQuery) {
  return function query() {
    var q = realQuery.apply(this, arguments)
    if (!q.hasOwnProperty('text')) {
      Object.defineProperty(q, 'text', {
        get: function () { return this.sql }
      });
    }
    q.on('result', q.emit.bind(q, 'row'))
    q._callback = wrapQueryCallback(q._callback)
    return q
  }
}

function wrapQueryCallback(callback) {
  if (!callback) return
  return function (err, rows) {
    if (err) callback(err)
    else {
      callback(null, {
        rows: rows,
        rowCount: rows.length,
        lastInsertId: rows.insertId
      })
    }
  }
}

function beginTransaction (beginStatement, callback) {
  return Transaction
    .begin(exports.createQuery, beginStatement, callback)
    .setConnection(this)
}
