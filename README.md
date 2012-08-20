# any-db - a less-opinionated database abstraction layer.

[![Build Status](https://secure.travis-ci.org/grncdr/node-any-db.png?branch=master)](http://travis-ci.org/grncdr/node-any-db)

The general idea behind this library is to consolidate the behaviours of various
database drivers into a consistent API.

Things it does:

 * Supports MySQL, Postgres, and SQLite3 as equally as possible.
 * Specify connection parameters with URLs, e.g. `postgres://user:pass@host/database`
 * Stream results or get them all at once, using an interface almost identical
	 to the existing evented interfaces of the MySQL and Postgres drivers.
 * Simple connection pooling including the ability to execute queries against
	 the pool directly. (e.g. `pool.query("SELECT 1", function (err, results) { ... })`)

Things it will do soon:

 * Optionally replace db-agnostic parameter placeholders with driver specific ones.
 * Expose a transaction API
 * Have lot's and lot's of tests
 * Wrap errors

Things it will never do:

 * Add it's own query helper methods like `.first` or `.fetchAll`
 * Include any sort SQL string building, you might want to try
	 [gesundheit](https://github.com/BetSmartMedia/gesundheit) for that.
 * Leave it's dishes in the sink and leave town for the weekend.

## License

MIT
