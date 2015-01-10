'use strict';

exports = module.exports = createParameterContext;

exports.prefixed = require('./lib/prefixed');

exports.adapters = {};
exports.adapters.postgres = require('./lib/postgres');
exports.adapters.mssql = require('./lib/mssql');
exports.adapters.mysql = require('./lib/mysql');
exports.adapters.sqlite3 = require('./lib/sqlite3');


function createParameterContext (queryable) {
  var anyDbAdapter = queryable.adapter;
  if (!(anyDbAdapter && anyDbAdapter.name)) {
    throw new TypeError('Argument must be a valid Queryable');
  }
  var impl = anyDbAdapter.createParamAccessor || exports.adapters[anyDbAdapter.name];

  if (!impl) {
    throw new Error('The ' + anyDbAdapter.name + ' adapter is not yet supported');
  }

  return impl();
}
