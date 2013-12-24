var EventEmitter = require('events').EventEmitter
var extend       = require('extend')

module.exports = extend(createMockAdapter, {
  connection: {
    query: function (text, params, callback) {
      var q = this._adapter.createQuery(text, params, callback)
      process.nextTick(function () {
        if (q.callback) q.callback()
        q.emit('end')
      })
      return q
    },
    end: function () {}
  },

  query: {},

  createQuery: function (text, params, callback) {
    if (typeof text == 'object') {
      return text
    }
    if (typeof params == 'function') {
      callback = params
      params = []
    }

    return extend(new EventEmitter, this.query, {
      text: text,
      params: params,
      callback: callback
    })
  },

  createConnection: function (_, cb) {
    var connection = extend(new EventEmitter, this.connection, {
      adapter: 'fake',
      _adapter: this
    })
    process.nextTick(cb.bind(null, null, connection))
    return connection
  }
})

function createMockAdapter (overrides) {
  return extend(true, {}, createMockAdapter, overrides)
}

