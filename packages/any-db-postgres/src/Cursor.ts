import * as pg from 'pg'
import { IResultSubscriber } from 'any-db-common'
import Result from 'pg/lib/result'


export default class Cursor<R = any> {
  readonly text: string
  readonly values: any[]

  private connection: pg.Connection | null
  private subscriber: IResultSubscriber<R>
  private state: 'initialized' | 'idle' | 'busy' | 'error' | 'done'
  private pgResult: Result
  private paused: boolean
  private rowBuffer: R[]
  private usePreparedStatement: boolean

  constructor(text: string, values: any[], subscriber: IResultSubscriber<R>) {
    this.connection = null
    this.subscriber = subscriber
    this.text = text
    this.values = values
    this.usePreparedStatement = values.length > 0
    this.state = 'initialized'
    this.pgResult = new Result()
    this.paused = false
    this.rowBuffer = []
  }

  submit(connection: pg.Connection) {
    this.connection = connection

    if (this.usePreparedStatement) {
      connection.parse({ text: this.text }, true)
      connection.bind({ values: this.values.map(pg.prepareValue) }, true)
      connection.describe({ type: 'P', name: '' }, true)
      connection.execute({ portal: '' }, true)
      connection.flush()
    } else {
      connection.query(this.text)
    }
  }

  private requestMoreRows() {
    this.state = 'busy'
    if (this.connection) {
      const batchSize = this.subscriber.batchSize
      this.connection.execute({ portal: '', rows: batchSize ? batchSize.toString() : void (0) }, true)
      this.connection.flush()
    }
  }


  handleRowDescription(msg: { fields: pg.FieldDef[] }) {
    this.subscriber.onStart({
      pause: () => {
        this.paused = true
      },
      resume: () => {
        this.paused = false
        let row
        while (row = this.rowBuffer.shift()) {
          this.subscriber.onRow(row)
          if (this.paused) return
        }
        if (this.connection) {
          this.requestMoreRows()
        }
      }
    })
    this.pgResult.addFields(msg.fields) // prepare the internal _result to parse data rows
    this.subscriber.onFields(msg.fields)
  }

  handleDataRow(msg: { fields: any }) {
    const row = this.pgResult.parseRow(msg.fields)
    if (this.paused) {
      this.rowBuffer.push(row)
    } else {
      this.subscriber.onRow(row)
    }
  }

  handleCommandComplete(msg: any) {
    this.pgResult.addCommandComplete(msg)
    if (this.connection && this.usePreparedStatement) {
      this.connection.sync()
    }
    this.subscriber.onClose()
  }

  handlePortalSuspended() {
    this.requestMoreRows()
  }

  handleReadyForQuery() {
    this.state = 'done'
    this.subscriber.onClose()
    this.subscriber.onEnd()
  }

  handleEmptyQuery() {
    if (this.connection) this.connection.sync()
  }

  handleError(error: Error) {
    this.state = 'error'
    this.subscriber.onError(error)
    // call sync to keep this connection from hanging
    if (this.connection) this.connection.sync()
  }
}
