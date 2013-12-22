# any-db-mysql

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db-mysql.png)](http://travis-ci.org/grncdr/node-any-db-mysql)

This is the MySQL adapter for Any-DB. It relies on the [mysql][mysql]
database driver to create connection and query objects that conform to the
[Any-DB API](https://github.com/grncdr/node-any-db-adapter-spec). It's almost
identical to `require('mysql')` but lets you're app code be somewhat more
database agnostic.

## Install

    npm install any-db-mysql

## License

MIT

[mysql]: http://github.com/felixge/node-mysql
