# Any-DB - a less-opinionated database abstraction layer.

This is the main entry point for Any-DB. Users of the library will
`require('any-db')` to make use of the [API](API.md) it exposes.

## Installation

Do not install this library directly. Instead, install one or more of the
database adapters, which will pull in `any-db` as a peerDependency. For example:

     npm install --save any-db-mysql
     npm install --save-dev any-db-sqlite3

## API

```
module.exports := {
  createConnection: (Url, Continuation<Connection>?) => Connection
  createPool: (Url, PoolConfig) => ConnectionPool
}

Url := String | { adapter: String }

PoolConfig := {
  min: Number,
  max: Number,
  onConnect: (Connection, ((Error) => void) => void
  reset: (Connection, ((Error) => void) => void
}
```

Both exported functions require an `Url` as their first parameter. This can
either be a string of the form `adapter://user:password@host/database` (which
will be parsed by [parse-db-url][]) or an object. When an object is used, it
**must** have an `adapter` property, and any other properties required by the
specified adapters [createConnection][] method.

See also: README notes for your chosen adapter
([MySQL](https://github.com/grncdr/node-any-db-mysql),
 [Postgres](https://github.com/grncdr/node-any-db-postgres), and
 [SQLite3](https://github.com/grncdr/node-any-db-sqlite3))

### exports.createConnection

```ocaml
(Url, Continuation<Connection>?) => Connection
```

*Note*: The connection will be opened even if no `Continuation<Connection>` is
provided, in that scenario you may wish to attach a listener to the connections
`'error'` event.

## exports.createPool

```ocaml
(Url, PoolConfig) => ConnectionPool
```

## License

MIT

[createConnection]: https://github.com/grncdr/node-any-db-adapter-spec#adapter-createconnection
[ConnectionPool]: https://github.com/grncdr/node-any-db-pool#api
