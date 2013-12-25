# any-db-mysql

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db-mysql.png)](http://travis-ci.org/grncdr/node-any-db-mysql)

This is the MySQL adapter for Any-DB. It relies on the [mysql][mysql]
database driver to create connection and query objects that conform to the
[Any-DB API](https://github.com/grncdr/node-any-db-adapter-spec). It's almost
identical to `require('mysql')` but lets your app code be somewhat more
database agnostic.

## API extensions

The connections and queries this package creates inherit from the constructor
functions in `require('mysql')`, so any methods that `mysql` supports beyond
those [specified by Any-DB][Connection] are also available to you.

Keep in mind that these methods will *not* necessarily work with other backends.

## Install

    npm install any-db-mysql

## Running tests

Create an empty test database:

    mysql -uroot -e 'CREATE DATABASE IF NOT EXISTS any_db_test'

Then run tests the node way:

    npm install && npm test

## License

MIT

[Connection]: https://github.com/grncdr/node-any-db-adapter-spec#connection
[mysql]: https://github.com/felixge/node-mysql
