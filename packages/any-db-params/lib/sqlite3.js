'use strict';

var prefixed = require('./prefixed');

module.exports = function () {
  return prefixed('$', '$');
};
