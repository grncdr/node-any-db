// TODO - either find the equivalent on npm, or publish the 1000'th "map over an
// object" package
module.exports = function map (it, fn, ctx) {
  if (typeof it != 'object') {
    throw new Error("map called with a non-object")
  }
  if (arguments.length < 3) ctx = this;
  var result = []
  for (var k in it) {
    result.push(fn.call(ctx, it[k], k, it))
  }
  return result
}
