var ConnectionPool = require('any-db-pool')
var parseDbUrl     = require('./lib/parse-url')
var Transaction    = require('./lib/transaction')

Object.defineProperty(exports, 'adapters', {
  get: function () {
    throw new Error(
      "Replace require('any-db').adapters.<blah> with require('any-db-<blah>')"
    )
  }
})

// Re-export Transaction for adapters
exports.Transaction = Transaction

exports.createConnection = function connect (dbUrl, callback) {
  var adapterConfig = parseDbUrl(dbUrl)
  var adapter = getAdapter(adapterConfig.adapter)
  var conn = adapter.createConnection(adapterConfig, callback);
  conn.adapter = adapterConfig.adapter;
  return conn;
}

exports.createPool = function createPool (dbUrl, poolConfig) {
  poolConfig = poolConfig || {}
  if (poolConfig.create || poolConfig.destroy) {
    throw new Error(
      "Use onConnect/reset options instead of create/destroy."
    )
  }
  var adapterConfig = parseDbUrl(dbUrl);
  
  if (adapterConfig.adapter === 'sqlite3' && /:memory:$/i.test(adapterConfig.database)) {
    if (poolConfig.min > 1 || poolConfig.max > 1) {
      console.warn(
        "Pools of more than 1 connection do not work for in-memory SQLite3 databases\n" +
        "The specified minimum (%d) and maximum (%d) connections have been overridden"
      )
    }
    if (poolConfig.min) poolConfig.min = 1;
    poolConfig.max = 1;
  }
  
  var adapter = getAdapter(adapterConfig.adapter);
  var pool = new ConnectionPool(adapter, adapterConfig, poolConfig);
  pool.adapter = adapterConfig.adapter;

  pool.begin = Transaction.createBeginMethod(adapter.createQuery, function (tx) {
    // Proxy query events from the transaction to the pool
    tx.on('query', this.emit.bind(this, 'query'))

    this.acquire(function (err, connection) {
      if (err) return tx.emit('error', err);
      var release = pool.release.bind(pool, connection)
      tx.once('rollback:complete', release)
        .once('commit:complete', release)
        .setConnection(connection)
    })
  });

  return pool
}

function getAdapter (protocol) {
  var name = protocol.replace(':', '').split('+').shift()
  return require('any-db-' + name);
}
