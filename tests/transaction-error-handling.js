require('../test').withTransaction('Transaction error handling', function (tx, t) {
  var StateMachine = tx.constructor.super_;
  tx.removeAllListeners('error')

  // cause a rollback
  tx.query('Not a valid query', function (err) {});

  var methods = ['query', 'rollback', 'commit'];
  t.plan(methods.length);

  tx.on('rollback:complete', function () {
    methods.forEach(function (method) {
      t.test(method + ' fails after transaction is closed', function (t) {
        t.plan(2);
        tx[method](function (err) {
          t.type(err, StateMachine.UndefinedMethodError, 'passed to callback');
        });
        tx.once('error', function (err) {
          t.type(err, StateMachine.UndefinedMethodError, 'emitted as "error" event');
        });
        tx[method]();
      });
    });
  });
});
