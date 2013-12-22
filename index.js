var ConnectionPool = require('any-db-pool')
var parseDbUrl     = require('parse-db-url')

Object.defineProperty(exports, 'adapters', {
  get: function () {
    throw new Error(
      "Replace require('any-db').adapters.<blah> with require('any-db-<blah>')"
    )
  }
})

exports.createConnection = function connect (dbUrl, callback) {
  var adapterConfig = parseDbUrl(dbUrl)
  var adapter = getAdapter(adapterConfig.adapter)
  var conn = adapter.createConnection(adapterConfig, callback);
  conn.adapter = adapterConfig.adapter
  return conn
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
    if (poolConfig.min) poolConfig.min = 1
    poolConfig.max = 1
  }
  
  var adapter = getAdapter(adapterConfig.adapter)
  return new ConnectionPool(adapter, adapterConfig, poolConfig)
}

function getAdapter (protocol) {
  var name = protocol.replace(':', '').split('+').shift()
  return require('any-db-' + name)
}
