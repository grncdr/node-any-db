import * as pg from 'pg'
import { IQueryCallbacks } from 'any-db-common'
import Result from 'pg/lib/result'
import { prepareValue } from 'pg/lib/utils'


export default class Cursor<R = any> {
  readonly text: string
  readonly values: any[]

  private connection: pg.Connection | null
  private callbacks: IQueryCallbacks<R>
  private pgResult: Result
  private paused: boolean
  private rowBuffer: R[]
  private usePreparedStatement: boolean
  private portal?: string
  private ended: boolean

  constructor(text: string, values: any[], subscriber: IQueryCallbacks<R>) {
    this.connection = null
    this.ended = false
    this.callbacks = subscriber
    this.text = text
    this.values = values
    this.usePreparedStatement = values.length > 0
    this.pgResult = new Result()
    this.paused = false
    this.portal = ''
    this.rowBuffer = []
  }

  submit(connection: pg.Connection) {
    this.connection = connection

    connection.parse({ text: this.text }, true)
    connection.bind({ values: this.prepareValues() }, true)
    connection.describe({ type: 'P' }, true)
    connection.flush()
  }

  handleRowDescription(msg: { fields: pg.FieldDef[] }) {
    this.callbacks.onStart({
      pause: () => {
        this.paused = true
      },
      resume: () => {
        this.paused = false
        let row
        while (row = this.rowBuffer.shift()) {
          this.callbacks.onRow(row)
          if (this.paused) return
        }
        if (this.connection) {
          this.requestMoreRows()
        }
      }
    })
    this.pgResult.addFields(msg.fields) // prepares the pgResult to parse data rows
    this.callbacks.onFields(msg.fields)
    this.requestMoreRows()
  }

  handleDataRow(msg: { fields: any }) {
    const row = this.pgResult.parseRow(msg.fields)
    if (this.paused) {
      this.rowBuffer.push(row)
    } else {
      this.callbacks.onRow(row)
    }
  }

  handleCommandComplete(msg: any) {
    this.pgResult.addCommandComplete(msg)
    this.onEnd()
  }

  handlePortalSuspended() {
    this.requestMoreRows()
  }

  handleReadyForQuery() {
    this.onEnd()
  }

  handleEmptyQuery() {
    this.onEnd()
  }

  handleError(error: Error) {
    this.callbacks.onError(error)
    this.onEnd()
  }

  private prepareValues() {
    return this.values.length ? this.values.map(prepareValue) : void (0)
  }

  private requestMoreRows() {
    if (this.connection) {
      const batchSize = this.callbacks.batchSize
      this.connection.execute({ portal: '', rows: batchSize ? batchSize.toString() : void (0) }, true)
      this.connection.flush()
    }
  }

  private onEnd() {
    if (!this.ended) {
      this.ended = true
      if (this.connection) this.connection.sync()
      this.connection = null
      this.callbacks.onEnd()
    }
  }
}
