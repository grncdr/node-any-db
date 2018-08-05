import { IDriver } from 'any-db-common'
import Connection from './Connection'

const PostgresDriver: IDriver = {
  name: 'postgres',

  createConnection(url: string) {
    return new Connection(url).connect()
  },

  createPlaceholderFactory() {
    let count = 0
    return () => `$${++count}`
  }
}

export default PostgresDriver
export { sql } from 'any-db-common'
export { default as Cursor } from './Cursor'
export { default as Connection } from './Connection'

