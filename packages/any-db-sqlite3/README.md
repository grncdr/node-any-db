# any-db-sqlite3

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db-sqlite3.png?branch=master)](http://travis-ci.org/grncdr/node-any-db-sqlite3?branch=master)

This is the sqlite3 adapter for Any-DB. It relies on the [sqlite3][sqlite3]
database driver to create [Connection][] and [Query][] objects that conform to
the [Any-DB API][].

## API extensions

You can include any of the SQLite3 mode flags as query parameters in your database
URL. So if you wanted to open your database in read-only mode for example, just
append `?OPEN_READONLY` to the URL. The available flags are documented in this
[SQLite3 wiki page](https://github.com/developmentseed/node-sqlite3/wiki/API).

## Install

    npm install any-db-sqlite3

## License

MIT

[sqlite3]: http://github.com/owner/node-sqlite3
[Connection]: https://github.com/grncdr/node-any-db-adapter-spec#connection
[Query]: https://github.com/grncdr/node-any-db-adapter-spec#query
[Any-DB API]: https://github.com/grncdr/node-any-db-adapter-spec
