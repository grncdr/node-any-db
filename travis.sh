#!/bin/sh

cd test
npm install ../any-db-pool
npm install ../any-db

for adapter in mysql postgres sqlite3; do
  npm install ../any-db-$adapter
done

npm install
npm test
