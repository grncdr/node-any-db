import * as pg from 'pg'
import Cursor from './Cursor'
import { IDriver, IConnection, IResultSubscriber, UnboundQuery } from 'any-db-common'
import { EventEmitter } from 'events';

const PostgresDriver: IDriver = {
  name: 'postgres',

  createConnection(url: string) {
    return new PostgresConnection(url).connect()
  },

  createPlaceholderFactory() {
    let count = 0
    return () => `$${++count}`
  }
}

export default PostgresDriver
export { sql } from 'any-db-common'

class PostgresConnection extends EventEmitter implements IConnection {
  driver: typeof PostgresDriver
  private _client: pg.Client

  constructor(opts: any) {
    super()
    this.driver = PostgresDriver
    this._client = new pg.Client(opts)
  }

  connect(): Promise<this> {
    return new Promise((resolve, reject) => {
      this._client.connect(error => {
        if (error) {
          reject(error)
        } else {
          resolve(this)
        }
      })
    })
  }

  submit<R>(text: string, params: any[], subscriber: IResultSubscriber<R>) {
    const cursor = new Cursor(text, params, subscriber)
    this._client.query(cursor)
    this.emit('submitted', text, params)
  }

  close(): Promise<void> {
    return this._client.end()
  }
}

