import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { createDroneJourneyClient, DroneJourneyApiError } from '../src/lib/droneJourneyApi.ts'

const payload = JSON.parse(readFileSync(new URL('./fixtures/drone-journey.json', import.meta.url), 'utf8'))

test('real HTTP GET uses the configured origin, encoded journey ID, and exact response coordinates', async t => {
  const journeyId = 'flight / 2'
  const requests: { method?: string; url?: string; accept?: string }[] = []
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, accept: req.headers.accept })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ...payload, journey_id: journeyId }))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => { server.closeAllConnections(); server.close() })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const request = createDroneJourneyClient({ baseUrl: `http://127.0.0.1:${address.port}/` })
  const journey = await request(journeyId, new AbortController().signal)
  assert.deepEqual(requests, [{ method: 'GET', url: '/api/v1/drone-journey/flight%20%2F%202', accept: 'application/json' }])
  assert.deepEqual(journey.journey_details, payload.journey_details)
})

test('server errors preserve HTTP status, journey guidance and Retry-After', async () => {
  const request = createDroneJourneyClient({ baseUrl: '', fetchImpl: async () => new Response(null, { status: 429, headers: { 'Retry-After': '2' } }) })
  await assert.rejects(request(payload.journey_id, new AbortController().signal), error =>
    error instanceof DroneJourneyApiError && error.status === 429 && error.retryAfterMs === 2000)
  const missing = createDroneJourneyClient({ baseUrl: '', fetchImpl: async () => new Response(null, { status: 404 }) })
  await assert.rejects(missing(payload.journey_id, new AbortController().signal), /journey ID/)
})

test('rejects invalid JSON and the wrong journey instead of displaying fallback data', async () => {
  const invalid = createDroneJourneyClient({ baseUrl: '', fetchImpl: async () => new Response('not json') })
  await assert.rejects(invalid(payload.journey_id, new AbortController().signal), /invalid JSON/)
  const wrong = createDroneJourneyClient({ baseUrl: '', fetchImpl: async () => Response.json({ ...payload, journey_id: 'other' }) })
  await assert.rejects(wrong(payload.journey_id, new AbortController().signal), /does not match/)
})

test('times out a stalled request and supports cancellation', async () => {
  const stalledFetch: typeof fetch = (_input, options) => new Promise((_resolve, reject) => {
    const signal = options!.signal!
    if (signal.aborted) reject(signal.reason)
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
  const request = createDroneJourneyClient({ baseUrl: '', timeoutMs: 10, fetchImpl: stalledFetch })
  // AbortSignal.timeout timers are unref'd in Node; keep this isolated test alive until it finishes.
  const keepAlive = setInterval(() => {}, 1000)
  try {
    await assert.rejects(request(payload.journey_id, new AbortController().signal), /timed out/)
    const controller = new AbortController()
    const pending = request(payload.journey_id, controller.signal)
    controller.abort()
    await assert.rejects(pending, { name: 'AbortError' })
  } finally { clearInterval(keepAlive) }
})
