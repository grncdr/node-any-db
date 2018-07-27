import { ResultSet, IResultSubscriber, IFieldMetadata } from '.'

/**
 * Creates a result subscriber that aggregates rows into a [[ResultSet]] and 
 * resolves the returned promise when [[IResultSubscriber.onEnd]] is called. This
 * is what underlies the implementation of [[Query.bind]].
 */
export function makeCallbackSubscriber<R>(callback: (err: Error | null, rs?: ResultSet<R>) => void): IResultSubscriber<R> {
  const resultSet = new ResultSet()

  const subscriber: IResultSubscriber<R> = {
    onStart({ resume }) {
      resume()
    },
    onError(error: Error) {
      callback(error)
    },
    onFields(fields: IFieldMetadata[]) {
      resultSet.fields = fields
    },
    onRow(row) {
      resultSet.rows.push(row)
    },
    onClose() { },
    onMetadata(meta: any) {
      resultSet.meta = meta
    },
    onEnd() {
      callback(null, resultSet)
    }
  }

  return subscriber
}
