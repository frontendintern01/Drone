import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeJourney, parseJourney } from '../src/lib/droneJourney.ts'

const sample = JSON.parse(readFileSync(new URL('./fixtures/drone-journey.json', import.meta.url), 'utf8'))
const id = sample.journey_id

test('preserves exact GPS, zero measurements, and unavailable heading', () => {
  const point = parseJourney(sample, id).journey_details[0]
  assert.equal(point.latitude, 35.7274898)
  assert.equal(point.longitude, -78.696251)
  assert.equal(point.horizontal_speed_mps, 0)
  assert.equal(point.heading_deg, null)
})

test('accepts drone_classification nested in device_info (current backend shape)', () => {
  const { drone_classification, ...rest } = sample
  const nested = { ...rest, device_info: { ...sample.device_info, drone_classification } }
  assert.equal(parseJourney(nested, id).drone_classification, drone_classification)
})

test('merges unordered full and incremental history without duplicate points', () => {
  const first = parseJourney(sample, id)
  const later = { ...first.journey_details[0], timestamp: '2025-06-09T15:25:00Z', latitude: 35.728 }
  const initial = mergeJourney(null, { ...first, journey_details: [later, ...first.journey_details] })
  const merged = mergeJourney(initial, { ...first, journey_details: [{ ...later, altitude_m: 2 }] })
  assert.equal(merged.journey_details.length, 2)
  assert.equal(merged.journey_details[0].latitude, sample.journey_details[0].latitude)
  assert.equal(merged.journey_details.at(-1)?.altitude_m, 2)
  assert.deepEqual(mergeJourney(merged, { ...first, journey_details: [] }).journey_details, merged.journey_details)
})

test('rejects malformed payloads, mismatched journeys, invalid coordinates and metrics', () => {
  assert.throws(() => parseJourney(sample, 'another-journey'))
  for (const change of [{ latitude: 91 }, { longitude: -181 }, { timestamp: 'invalid' }, { altitude_m: '2' }, { latitude: null }]) {
    assert.throws(() => parseJourney({ ...sample, journey_details: [{ ...sample.journey_details[0], ...change }] }, id))
  }
})

test('new journey clears the previous trail', () => {
  const first = parseJourney(sample, id)
  assert.equal(mergeJourney(first, { ...first, journey_id: 'new', journey_details: [] }).journey_details.length, 0)
})

test('orders microsecond timestamps and deduplicates equivalent timezone offsets', () => {
  const journey = parseJourney(sample, id)
  const earlier = { ...journey.journey_details[0], timestamp: '2025-06-09T15:25:00.000050Z' }
  const later = { ...earlier, timestamp: '2025-06-09T15:25:00.000080Z', latitude: 35.728 }
  const equivalent = { ...later, timestamp: '2025-06-09T17:25:00.000080+02:00', altitude_m: 9 }
  const merged = mergeJourney(null, { ...journey, journey_details: [later, earlier, equivalent] })
  assert.deepEqual(merged.journey_details, [earlier, equivalent])
})

test('replay advances through recorded samples by timestamp', async () => {
  const { replayedSampleCount, isRecordedJourney } = await import('../src/lib/droneJourney.ts')
  const at = (iso: string) => ({ timestamp: iso, latitude: 0, longitude: 0 }) as never
  const points = [at('2025-06-09T15:00:00Z'), at('2025-06-09T15:00:01Z'), at('2025-06-09T15:00:03Z')]
  assert.equal(replayedSampleCount(points, 0), 1)
  assert.equal(replayedSampleCount(points, 1000), 2)
  assert.equal(replayedSampleCount(points, 2999), 2)
  assert.equal(replayedSampleCount(points, 60000), 3)
  assert.equal(isRecordedJourney(points, Date.parse('2026-01-01T00:00:00Z')), true)
  assert.equal(isRecordedJourney(points, Date.parse('2025-06-09T15:00:10Z')), false)
})
