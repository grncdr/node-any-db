# Contributing to Any-DB development

Want to help improve Any-DB? You're in the right place.

## Setting up

To get started, clone this git repo and run `make dev_deps`. This will symlink
all of the sub-packages into place in your local directory and then install any
remaining dependencies from npm. This is important because it means that you can
be sure that tests will be run against the code in source-control, and not
packages installed from the npm registry.

## Running tests

After you've run `make dev_deps` you can run `make test` to run the tests. The
tests require that *both* a MySQL and Postgres server are available and
accessible at the Any-DB URLs defined by the environment variable
`any_db_mysql_test_url` and `any_db_postgres_test_url`. If these env variables
are undefined or empty, the default values of
`mysql://root@localhost/any_db_test` and
`postgres://postgres@localhost/any_db_test` will be used.

If you wish to disable testing of a particular backend for a test run, you can
define the environment variable `any_db_test_drivers` to a comma separated list
of driver names.

## Creating a pull-request

For changes to an existing API please open an issue to discuss the proposed
change before implementing it. Code-first-ask-questions-later *is* fun, but I'd
really hate for anybody to put their time into something that won't be merged.

## Code style

I'm not terribly picky about code-formatting, but please try to avoid mixing
tabs and spaces, and keep lines under 80 characters long if you can help it.

If a patch you're working on is getting hairy, don't be afraid to refactor
existing code.
