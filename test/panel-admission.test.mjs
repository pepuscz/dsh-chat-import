import test from 'node:test'
import assert from 'node:assert/strict'
import { admittedPanelHost } from '../lib/panel-admission.mjs'
for (const [name, admission, method, expected] of [
  ['missing host service', undefined, 'POST', 503],
  ['unauthenticated', { rejection: 401 }, 'POST', 401],
  ['cross-origin', { rejection: 403 }, 'POST', 403],
  ['GET mutation', { peer: {} }, 'GET', 405],
  ['authenticated POST', { peer: {} }, 'POST', 200],
]) test(name, () => {
  let registered, status, calls = 0
  const host = admittedPanelHost({ get: () => admission && ({ admit: () => admission }) }, { register: r => { registered = r; return () => {} } })
  host.register({ path: '/api-import/file', handler: (_req, res) => { calls++; res.writeHead(200) } })
  registered.handler({ method }, { writeHead: code => { status = code }, end() {} })
  assert.equal(status, expected)
  assert.equal(calls, expected === 200 ? 1 : 0)
})
