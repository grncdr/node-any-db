import { IDriver, IFieldMetadata, IResultFlowControl, IQueryCallbacks } from '.'
import { ReadableOptions, Readable } from "stream";

export interface IRowStream<Row = {}> extends Readable {
  driver: IDriver
  on(event: 'fields', handler: (fields: IFieldMetadata[]) => void): this
  on(event: 'data', handler: (row: Row) => any): this
  on(event: 'close', handler: () => void): this
  on(event: 'end', handler: () => void): this
  on(event: 'error', handler: (error: Error) => void): this
  on(event: string, listener: (...args: any[]) => void): this
}

export function initRowStream<R>(opts: ReadableOptions): { subscriber: IQueryCallbacks<R>, stream: IRowStream<R> } {
  let flowControl: IResultFlowControl

  const stream = new Readable({
    ...opts,
    objectMode: true,
    read(n?: number) {
      if (flowControl) {
        flowControl.resume()
      }
    }
  })

  const subscriber: IQueryCallbacks<R> = {
    batchSize: opts.highWaterMark,
    onStart(controls) {
      flowControl = controls
    },
    onError(error: Error) {
      stream.emit('error', error)
    },
    onFields(fields: IFieldMetadata[]) {
      stream.emit('fields', fields)
    },
    onRow(row: R) {
      if (!stream.push(row)) {
        flowControl.pause()
      }
    },
    onClose() {
      stream.emit('close')
    },
    onMetadata(meta: any) {
      stream.emit('metadata', meta)
    },
    onEnd() {
      stream.push(null)
    }
  }

  return { subscriber, stream: stream as IRowStream<R> }
}
