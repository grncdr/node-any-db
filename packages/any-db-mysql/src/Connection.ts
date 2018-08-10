import { EventEmitter } from 'events'

import { IConnection, IQueryCallbacks } from 'any-db-common'
import * as mysql from 'mysql'

import Driver from './Driver'

export default class Connection extends EventEmitter implements IConnection {
  driver = Driver
  private _connection: mysql.Connection

  constructor(url: string) {
    super()
    this._connection = mysql.createConnection(url)
  }

  submit<R>(text: string, params: any[], callbacks: IQueryCallbacks<R>) {
    const query = this._connection.query(text, params)
    this.emit('submit', text, params)
    query.on('fields', callbacks.onFields)
    query.on('result', callbacks.onRow)
    query.on('error', callbacks.onError)
    query.on('packet', packet => {
      if (packet.constructor.name == 'OkPacket') {
        callbacks.onMetadata(packet)
      }
      callbacks.onClose()
    })
    query.on('end', callbacks.onEnd)
  }

  connect(): Promise<this> {
    const conn = this
    return new Promise((resolve, reject) => {
      this._connection.connect((err: Error) => {
        if (err) {
          reject(err)
        } else {
          resolve(conn)
        }
      })
    })
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) =>
      this._connection.end(err => (err ? reject(err) : resolve())),
    )
  }
}
