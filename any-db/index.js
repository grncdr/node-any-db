var ConnectionPool = require('any-db-pool')
var parseDbUrl     = require('./lib/parse-url')
var Transaction    = require('./lib/transaction')

exports.__defineGetter__('adapters', function () {
  throw new Error(
    "Change your any-db dependency to any-db-{mysql,postgres,sqlite3} " +
    "and require the adapter directly if you need to access it."
  )
})

// Re-export Transaction for adapters
exports.Transaction = Transaction

exports.createConnection = function connect (dbUrl, callback) {
	var adapterConfig = parseDbUrl(dbUrl);
	return getAdapter(adapterConfig.adapter).createConnection(adapterConfig, callback)
}

exports.createPool = function getPool (dbUrl, poolConfig) {
	poolConfig = poolConfig || {}
	if (poolConfig.create || poolConfig.destroy) {
		throw new Error("Cannot override the create/destroy pool options. Try onConnect/reset instead.")
	}
	var adapterConfig = parseDbUrl(dbUrl);
	var adapter = getAdapter(adapterConfig.adapter);
	var pool = new ConnectionPool(adapter, adapterConfig, poolConfig)
  pool.begin = function (stmt, callback) {
    if (stmt && typeof stmt == 'function') {
      callback = stmt
      stmt = undefined
    }
    var t = new Transaction(adapter.createQuery)
    // Proxy query events from the transaction to the pool
    t.on('query', this.emit.bind(this, 'query'))
    this.acquire(function (err, conn) {
      if (err) return callback ? callback(err) : t.emit('error', err)
      t.begin(conn, stmt, callback)
      var release = this.release.bind(this, conn)
      t.once('rollback:complete', release)
      t.once('commit:complete', release)
    }.bind(this))
    return t
  }
	return pool
}

function getAdapter (protocol) {
	var name = protocol.replace(':', '').split('+').shift()
  return require('any-db-' + name);
}
