'use strict'

var copy = require('./copy')

module.exports = function(prefix, valuePrefix) {
  var values = {}

  function param(name, value) {
    var argc = arguments.length
    var name_ = valuePrefix + name

    if (argc > 1) {
      values[name_] = value
    } else if (!(name_ in values)) {
      throw new Error('Undefined parameter ' + name)
    }

    return prefix + name
  }

  param.values = copy.bind(null, values)

  return param
}
