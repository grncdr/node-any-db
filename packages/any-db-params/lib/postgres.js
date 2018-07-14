'use strict'

module.exports = function() {
  var values = []
  var names = []

  function param(name, value) {
    var position = names.indexOf(name)

    if (arguments.length === 1) {
      if (position < 0) {
        throw new Error('Undefined parameter ' + name)
      }
      return '$' + (position + 1)
    }

    if (position < 0) {
      names.push(name)
      return '$' + values.push(value)
    } else {
      values[position] = value
      return '$' + (position + 1)
    }
  }

  param.values = function() {
    return values.slice()
  }

  return param
}
