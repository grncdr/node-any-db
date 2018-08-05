import { sql, ITransport, IQueryCallbacks } from '..'
import * as assert from 'assert'

export async function test(transport: ITransport): Promise<void> {
  assert.equal(typeof transport.on, 'function', '.on is a function')
  assert.equal(typeof transport.submit, 'function', '.submit is a function')
  assert.equal(typeof transport.driver, 'object', '.driver is an object')

  const tester = new TransportTester(transport)

  await tester.testCallbacks('SELECT 1 AS val', [], {
    onFields(fields) {
      assert.ok(Array.isArray(fields))
      assert.equal('val', fields[0].name)
    },
    onRow(row) {
      assert.deepEqual(row, { val: 1 })
    },
  })

  await tester.testCallbacks('SELECT 1 AS val', [], {
    onFields(fields) {
      assert.ok(Array.isArray(fields))
      assert.equal('val', fields[0].name)
    },
    onRow(row) {
      assert.deepEqual(row, { val: 1 })
    },
  })
  let noResultQuery =
    transport.driver.name === 'mysql'
      ? 'SELECT 1 AS val FROM INFORMATION_SCHEMA.TABLES WHERE 0 = 1'
      : 'SELECT 1 AS val WHERE 0 = 1'

  await tester.testCallbacks(noResultQuery, [], {
    never: ['onRow'],
    onFields(fields) {
      assert.ok(Array.isArray(fields))
      assert.equal('val', fields[0].name)
    },
    onEnd() { }
  })

  await tester.testCallbacks('not a valid SQL query', [], {
    never: ['onFields', 'onRow'],
    // including these callback asserts only to assert we received the events
    onError(error) { },
    onEnd() { },
  })

  let rs = await sql`SELECT 2 AS foo`.bind(transport).resultSet()
  assert.ok(rs)
  assert.equal(typeof rs, 'object')
  assert.deepEqual(rs.rows, [{ foo: 2 }])
}

type CallbackName = keyof IQueryCallbacks

export class TransportTester {
  transport: ITransport

  constructor(transport: ITransport) {
    this.transport = transport
  }

  testCallbacks(text: string, params: any[], callbacks: Partial<IQueryCallbacks> & { never?: CallbackName[] }): Promise<void> {
    return new Promise((resolve, reject) => {
      const wasCalled: { [K in CallbackName]?: true } = {}
      const callTestCallback = (name: CallbackName, ...args: any[]) => {
        if (callbacks.never && callbacks.never.includes(name)) {
          return reject(new Error(`${name} called unexpectedly`))
        }
        if (name != 'onRow' && wasCalled[name]) {
          return reject(new Error(`${name} called multiple times`))
        }
        const callback = callbacks[name]
        if (callback) {
          try {
            (callback as any)(...args)
            wasCalled[name] = true
          } catch (err) {
            reject(err)
          }
        }
      }
      let errored = false
      let ended = false
      this.transport.submit(text, params, {
        onStart(fc) {
          callTestCallback('onStart', fc)
        },
        onFields(fields) {
          callTestCallback('onFields', fields)
        },
        onRow(row) {
          callTestCallback('onRow', row)
        },
        onMetadata(meta) {
          callTestCallback('onMetadata', meta)
        },
        onClose() {
          closed = true
          callTestCallback('onClose')
        },
        onEnd() {
          ended = true
          callTestCallback('onEnd')
          const uncalled = Object.keys(callbacks).filter((x) => x != 'never' && !wasCalled[x as CallbackName])
          if (uncalled.length > 0) {
            return reject(new Error(`${JSON.stringify(text)} => Query callbacks were never called: ${uncalled.join(', ')}`))
          } else if (!errored) {
            console.log(`ok - ${text}`)
            resolve()
          }
        },
        onError(error) {
          callTestCallback('onError', error)
          if (!callbacks.onError) {
            errored = true
            reject(error)
          }
        }
      })
    }).then(
      () => { },
      error => {
        error.name = `not ok - ${text} => ${error.name}`
        return Promise.reject(error)
      }
    )
  }
}