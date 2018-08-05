const url = process.env.ANY_DB_TEST_URL || 'pg://localhost/any_db_test'

require('any-db-common').testDriver(require('.').default, url).catch(
  err => {
    console.error(err.stack)
    process.exit(1)
  }
)