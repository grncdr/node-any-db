# any-db - a less-opinionated database abstraction layer.

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db)

The purpose of this library is to consolidate the behaviours of various database
drivers into a minimal and consistent API.

Things it does:

 * Supports MySQL, Postgres, and SQLite3 as equally as possible.
 * Specify connection parameters with URLs: `driver://user:pass@host/database`
 * Stream results or get them all at once, using an interface almost identical
	 to the existing evented interfaces of the MySQL and Postgres drivers.
 * Simple connection pooling including the ability to execute queries against
	 the pool directly for auto-release behaviour. E.g. this will never leak
	 connections: `pool.query("SELECT 1", function (err, results) { ... })`

Things it will do soon:

 * Optionally replace db-agnostic parameter placeholders with driver specific
	 ones so you can use the exact same code against all drivers.
 * Have lot's and lot's of tests
 * Provide a common result set API.

Things it might do:
 * Expose a transaction API.
 * Wrap errors.

Things it will never do:

 * Add it's own query helper methods like `.first` or `.fetchAll`
 * Include any sort SQL string building. You might want to try my other library
	 [gesundheit](https://github.com/BetSmartMedia/gesundheit), or one of the many
	 [alternatives](https://encrypted.google.com/search?q=sql&q=site:npmjs.org&hl=en)
	 for that.
 * Leave it's dishes in the sink and leave town for the weekend.

## License

MIT
