import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../lib/index.mjs'
test('frontend-only mode registers no local services, routes or tools', () => {
  const ctx = new Proxy({}, { get() { throw new Error('Local host service accessed') } })
  assert.doesNotThrow(() => apply(ctx, { frontendOnly: true }))
})
