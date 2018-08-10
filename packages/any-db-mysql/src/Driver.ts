import { IDriver } from 'any-db-common'
import Connection from './Connection'

export { sql } from 'any-db-common'

const Driver: IDriver = {
  name: 'mysql',

  createPlaceholderFactory(): () => string {
    return () => '?'
  },

  createConnection(url: string): Promise<Connection> {
    return new Connection(url).connect()
  },
}

export default Driver
