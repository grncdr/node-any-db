# any-db-postgres

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db-postgres.png)](http://travis-ci.org/grncdr/node-any-db-postgres)

This is the postgres adapter for Any-DB. It relies on the [pg.js][] database
driver to create [Connection][] and [Query][] objects that conform to the
[Any-DB API][]. The API is practically identical to that of `require('pg')`
but allows your app code to be portable between databases.

## API extensions

The connections and queries this package creates inherit from [pg.Client][]
and [QueryStream][], so any methods described there are also available to you.

Keep in mind that these methods will *not* necessarily work with other backends.

## Install

    npm install any-db-postgres

## License

MIT

[pg]: http://github.com/brianc/node-postgres
[pg.Client]: https://github.com/brianc/node-postgres/wiki/Client
[QueryStream]: https://github.com/node-pg-query-stream
[Connection]: https://github.com/grncdr/node-any-db-adapter-spec#connection
[Query]: https://github.com/grncdr/node-any-db-adapter-spec#query
[Any-DB API]: https://github.com/grncdr/node-any-db-adapter-spec
