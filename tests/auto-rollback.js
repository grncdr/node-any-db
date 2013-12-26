var begin = require('../')
var inOrder = require('assert-in-order')

require('../test')("Auto-rollback", function (conn, t) {
  var group = inOrder(t, {
    txIsClosed:        ['pass', 'tx is closed'],
    rollbackStarted:   ['pass', 'emitted rollback:start'],
    rollbackCompleted: ['pass', 'emitted rollback:complete'],
    connectionIsGone:  ['notOk', 'connection is removed'],
    emittedError:      ['ok',   'emitted error'],
  })

  t.plan(group.length)

  var tx = begin(conn)
  tx.query('Not a valid sql statement')
  tx.on('error', group.emittedError)
  tx.on('closed', group.txIsClosed)
  tx.on('rollback:start', group.rollbackStarted)
  tx.on('rollback:complete', function () {
    group.rollbackCompleted()
    group.connectionIsGone(tx._connection)
  })
})
