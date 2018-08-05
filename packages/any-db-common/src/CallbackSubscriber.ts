import { ResultSet, IQueryCallbacks, IFieldMetadata } from '.'

/**
 * Creates a result subscriber that aggregates rows into a [[ResultSet]] and 
 * resolves the returned promise when [[IQueryCallbacks.onEnd]] is called. This
 * is what underlies the implementation of [[Query.bind]].
 */
export function makeCallbackSubscriber<R>(callback: (err: Error | null, rs?: ResultSet<R>) => void): IQueryCallbacks<R> {
  const resultSet = new ResultSet()

  let called = false

  const subscriber: IQueryCallbacks<R> = {
    onStart({ resume }) {
      resume()
    },
    onError(error: Error) {
      if (!called) {
        called = true
        callback(error)
      }
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
      if (!called) {
        called = true
        callback(null, resultSet)
      }
    }
  }

  return subscriber
}
