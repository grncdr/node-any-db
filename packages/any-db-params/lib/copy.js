module.exports = function(values) {
  var copy = {}
  for (var k in values) copy[k] = values[k]
  return copy
}
