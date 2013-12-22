module.exports = makeChain;

function makeChain(steps) {
  return chain;

  function chain(it, callback) {
    var i = 0, currentStep;
    (function next(err) {
      if (err) return callback(err);
      if ((currentStep = steps[i++])) {
        try {
          currentStep(it, next);
        } catch (err) {
          callback(err);
        }
      } else {
        callback(null, it);
      }
    })();
  }
}
