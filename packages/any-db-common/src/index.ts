import { ReadableOptions } from 'stream'
import { initRowStream, IRowStream } from './RowStreamSubscriber'
import { makeCallbackSubscriber } from './CallbackSubscriber'

export { IRowStream } from './RowStreamSubscriber'

export async function testDriver(driver: IDriver, url: string): Promise<void> {
  const spec = await import('./spec/transport')
  const connection = await driver.createConnection(url)
  await spec.test(connection)
  await connection.close()
  console.log(`Success - ${url}`)
}

/**
 * Drivers implement Any-DB interfaces for a specific database.
 */
export interface IDriver {
  /**
   * The string name of the driver, e.g. `'mysql'`, `'postgres'` or `'sqlite3'`.
   */
  name: string
  createConnection(url: string): Promise<IConnection>
  createPlaceholderFactory(): () => string
}

export class Database<C extends IConnection> {
  url: string
  driver: IDriver

  constructor(driver: IDriver, url: string) {
    this.driver = driver
    this.url = url
  }

  createConnection(): Promise<C> {
    return this.driver.createConnection(this.url) as Promise<C>
  }
}

/**
 * ITransport is a common interface implemented by connections, transactions, and connection pools.
 */
export interface ITransport {
  driver: IDriver
  submit<Row>(text: String, params: any[], resultHandler: IQueryCallbacks<Row>): void
  on(event: 'submit', handler: (text: string, params: any[]) => void): void
}

/**
 * Connection objects are obtained using [[IDriver.createConnection]] or
 * [[ConnectionPool.acquire]] (which delegates to [[IDriver.createConnection]]).
 *
 * While all `IConnection` objects implement the [[ITransport]] interface, the
 * implementations in each driver may add additional methods or emit additional
 * events. If you need to access a feature of your database that is not described
 * here (such as Postgres' server-side prepared statements), consult the
 * documentation for your driver.
 */
export interface IConnection extends ITransport {
  close(): Promise<void>
}

/**
 * When queries are submitted to a transport (connection, pool, etc.) the
 * transport also receives a result subscriber. This subscriber is responsible
 * for collecting or streaming rows and notifying callers when results are ready.
 *
 * This interface is mostly an internal detail, but if you want explicit control
 * over streaming of result rows from the underlying transport, you can implement
 * it yourself and pass it to [[ResultHandle.consume]].
 */
export interface IQueryCallbacks<Row = { [col: string]: any }> {
  batchSize?: number
  onStart(handle: IResultFlowControl): void
  onRow(row: Row): void
  onFields(fields: IFieldMetadata[]): void
  onError(error: Error): void
  onMetadata(meta: any): void
  onClose(): void
  onEnd(): void
}

export interface IResultFlowControl {
  pause(): void
  resume(): void
}

/**
 * Tag for function for tagged template literals
 * @param strings
 * @param params
 */
export function sql(strings: TemplateStringsArray, ...params: any[]) {
  return new UnboundQuery(strings, params)
}

/**
 * An `UnboundQuery` has no reference to an underlying [[IDriver]], only text
 * fragments and parameter values.
 *
 * The text fragments are compiled into a single string (with appropriate SQL
 * placeholders) when [[Query.bind]] is called.
 *
 * While unbound queries can be constructed directly. It's recommended to use
 * the [[sql]] template tag function, which allows you to interpolate values
 * directly into your query.
 */
export class UnboundQuery<Row = {}> {
  private strings: string[]
  readonly params: any[]

  constructor(strings: ReadonlyArray<string> | string, params: any[] = []) {
    this.strings = Array.isArray(strings) ? strings : [strings]
    this.params = params
  }

  /**
   * Create a copy of the query with new parameter values.
   *
   * @param params the new parameter values.
   */
  withParams(params: any[]): UnboundQuery {
    return new UnboundQuery(this.strings, params)
  }

  /**
   * Return a SQL string representing this query.
   *
   * @param placeholder a placeholder factory that will be used to replace templated parameters.
   */
  toSQL(placeholder = () => '$?'): string {
    return this.strings
      .slice(1)
      .reduce((out, string) => out + placeholder() + string, this.strings[0])
  }

  bind(transport: ITransport): BoundQuery<Row> {
    const text = this.toSQL(transport.driver.createPlaceholderFactory())
    return new BoundQuery(text, this.params, transport)
  }
}

class BoundQuery<Row> {
  text: string
  params: any[]
  transport: ITransport | null

  constructor(text: string, params: any[], transport: ITransport) {
    this.text = text
    this.params = params
    this.transport = transport
  }

  /**
   * Send the query to the database and collect the results into a [[ResultSet]].
   *
   * @param transport the connection/pool/transaction to which the query will be submitted.
   */
  resultSet(): Promise<ResultSet<Row>> {
    return new Promise((resolve, reject) => {
      this.resultSetCallback((err, rs) => {
        if (err) {
          reject(err)
        } else {
          resolve(rs)
        }
      })
    })
  }

  /**
   * Send the query to the database and collect the results into a [[ResultSet]].
   *
   * @param callback node-style callback that will be passed either an error or a complete ResultSet
   */
  resultSetCallback(callback: (err: Error | null, rs?: ResultSet<Row>) => void) {
    this.consume(makeCallbackSubscriber<Row>(callback))
  }

  /**
   * Send the query to the database and return an object-mode readable stream
   * that will emit a `'data'` event for each row.
   */
  stream(readableOpts: ReadableOptions = {}): IRowStream {
    const { subscriber, stream } = initRowStream<Row>(readableOpts)
    this.consume(subscriber)
    stream.driver = (this.transport as ITransport).driver
    return stream
  }

  /**
   * Send the query to the database with the given [[IQueryCallbacks]]. Unless
   * you require low-level control over the streaming of query results, you
   * probably don't want this.
   *
   * @param transport
   */
  private consume(subscriber: IQueryCallbacks<Row>) {
    if (!this.transport) {
      subscriber.onError(new Error('Query result was already consumed'))
      return
    }
    this.transport.submit(this.text, this.params, subscriber)
    this.transport = null
  }
}

/**
 * Field metadata returned as part of a query result. The only guaranteed
 * property is `name`, but most drivers include additional information.
 */
export interface IFieldMetadata {
  name: string
}

/**
 * ResultSets are obtained by calling [[Query.bind]].
 */
export class ResultSet<Row = any, Meta = {}> {
  meta: { [key: string]: any }
  /** Information about the fields of the result set */
  fields: IFieldMetadata[]
  /** Array of rows */
  rows: Row[]

  constructor() {
    this.meta = {}
    this.rows = []
    this.fields = []
  }
}
