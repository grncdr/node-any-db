#!/bin/sh

travis: dev_deps test

.PHONY: test local_deps any-db-mysql any-db-postgres any-db-sqlite3 any-db-pool

test:
	cd test && npm test

dev_deps: local_deps npm_deps
	cd test && npm install

npm_deps: any-db any-db-mysql any-db-postgres any-db-sqlite3 any-db-pool

any-db*:
	cd $@ && npm install

local_deps:
	node link_local_deps.js
