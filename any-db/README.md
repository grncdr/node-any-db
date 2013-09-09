# Any-DB - a less-opinionated database abstraction layer.

This is the main entry point for Any-DB. Users of the library will
`require('any-db')` to make use of the [API](API.md) it exposes.

## Installation

Do not install this library directly. Instead, install one or more of the
database adapters, which will pull in `any-db` as a peerDependency. For example:

     npm install --save any-db-mysql
     npm install --save-dev any-db-sqlite3

## License

MIT
