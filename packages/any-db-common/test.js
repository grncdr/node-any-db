const assert = require('assert')
const { sql, ResultSet, BoundQuery, UnboundQuery } = require('./')

const q = sql`SELECT foo.* from foo where blah = ${12}`
assert(q instanceof UnboundQuery, 'sql template tag function produces an UnboundQuery')

const fakeDriver = {
  createPlaceholderFactory() {
    return () => '?'
  },
}

const fakeTransport = {
  driver: fakeDriver,
  submitted: [],
  submit(text, params, callbacks) {
    this.submitted.push({ text, params })
    callbacks.onEnd()
  },
}

const bound = q.bind(fakeTransport)
assert(bound instanceof BoundQuery)

bound
  .resultSet()
  .then(rs => {
    assert(rs instanceof ResultSet)
  })
  .catch(error => {
    console.error(error.stack)
    process.exit(1)
  })
