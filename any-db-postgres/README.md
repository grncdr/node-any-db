# any-db-postgres

This is the postgres adapter for Any-DB. It relies on the [pg][pg]
database driver to create connection and query objects that conform to the
[Any-DB API](any-db/API.md).

## API extensions

If you have issues using the native backend for the pg driver on your platform,
you can force anyDB to use the pure-JavaScript client like so:

```javascript
require('any-db-postgres').forceJS = true
```

You **must** do the above *before* you create any connections or connection
pools.

## Install

    npm install any-db-postgres

## License

MIT

[pg]: http://github.com/brianc/node-postgres
