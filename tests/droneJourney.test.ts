import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeJourney, parseJourney } from '../src/lib/droneJourney.ts'

const sample = JSON.parse(readFileSync(new URL('../public/mocks/drone-journey.json', import.meta.url), 'utf8'))
const id = sample.journey_id

test('preserves exact GPS, zero measurements, and unavailable heading', () => {
  const point = parseJourney(sample, id).journey_details[0]
  assert.equal(point.latitude, 35.7274898)
  assert.equal(point.longitude, -78.696251)
  assert.equal(point.horizontal_speed_mps, 0)
  assert.equal(point.heading_deg, null)
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
