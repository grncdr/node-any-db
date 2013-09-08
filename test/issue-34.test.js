require('./helpers').allDrivers(
  'sqlite3 duplicate key errors',
  {drivers: ['sqlite3']},
  function (conn, t) {
    var createTable = 'create table if not exists users (' +
        'id integer primary key autoincrement, ' +
        'email varchar(100) unique not null)';
    var insertUser = 'insert into users (email) values ("user@example.com")';

    t.plan(3)
    conn.query(createTable, noError('create table works'))
    conn.query(insertUser, noError('first insert works'))
    conn.query(insertUser, function (err) {
      t.ok(err, 'duplicate key sends error to callback')
    })

    function noError(message) {
      return function (err) {
        t.ok(!err, message)
      }
    }
  });
