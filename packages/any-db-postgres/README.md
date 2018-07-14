# any-db-postgres

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db-postgres.png)](http://travis-ci.org/grncdr/node-any-db-postgres)

[![js-standard-style](https://raw.githubusercontent.com/feross/standard/master/badge.png)](https://github.com/feross/standard)

This is the postgres adapter for Any-DB. It relies on the [pg.js][] database
driver to create [Connection][] and [Query][] objects that conform to the
[Any-DB API][]. The API is practically identical to that of `require('pg')`
but allows your app code to be portable between databases.

## API extensions

The connections and queries this package creates inherit from [pg.Client][]
and [QueryStream][], so any methods described there are also available to you.

Keep in mind that these methods will _not_ necessarily work with other backends.

## Install

    npm install any-db-postgres

## License

MIT

[pg]: http://github.com/brianc/node-postgres
[pg.client]: https://github.com/brianc/node-postgres/wiki/Client
[querystream]: https://github.com/brianc/node-pg-query-stream
[connection]: https://github.com/grncdr/node-any-db-adapter-spec#connection
[query]: https://github.com/grncdr/node-any-db-adapter-spec#query
[any-db api]: https://github.com/grncdr/node-any-db-adapter-spec
