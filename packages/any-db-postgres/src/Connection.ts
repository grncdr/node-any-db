import { EventEmitter } from 'events'
import { IConnection, IQueryCallbacks } from 'any-db-common'

import * as pg from 'pg'

import PostgresDriver from "./Driver"
import Cursor from './Cursor'

export default class PostgresConnection extends EventEmitter implements IConnection {
  driver: typeof PostgresDriver
  private _client: pg.Client

  constructor(opts: any) {
    super()
    this.driver = PostgresDriver
    this._client = new pg.Client(opts)
  }

  connect(): Promise<this> {
    return this._client.connect().then(() => this)
  }

  submit<R>(text: string, params: any[], subscriber: IQueryCallbacks<R>) {
    const cursor = new Cursor(text, params, subscriber)
    this._client.query(cursor)
    this.emit('submitted', text, params)
  }

  close(): Promise<void> {
    return this._client.end()
  }
}
