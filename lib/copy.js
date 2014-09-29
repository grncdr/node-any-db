module.exports = function (x) {
  var copy = {};
  for (var k in values) copy[k] = values[k];
  return copy;
};
