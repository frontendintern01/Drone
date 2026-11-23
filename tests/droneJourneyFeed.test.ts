import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runDroneJourneyFeed } from '../src/lib/droneJourneyFeed.ts'
import { DroneJourneyApiError } from '../src/lib/droneJourneyApi.ts'
import { mergeJourney, type DroneJourney } from '../src/lib/droneJourney.ts'

const payload: DroneJourney = JSON.parse(readFileSync(new URL('./fixtures/drone-journey.json', import.meta.url), 'utf8'))

test('back-to-back requests never overlap or wait three seconds; backend points stay exact', async () => {
  const controller = new AbortController()
  let active = 0
  let calls = 0
  let journey: DroneJourney | null = null
  const points = ['2025-06-09T15:25:00.000Z', '2025-06-09T15:25:00.050Z', '2025-06-09T15:25:00.080Z']
    .map((timestamp, index) => ({ ...payload.journey_details[0], timestamp, longitude: -78.69 + index * 0.00001 }))
  await runDroneJourneyFeed({
    signal: controller.signal,
    request: async () => {
      assert.equal(active++, 0)
      await Promise.resolve()
      active--
      return { ...payload, journey_details: [points[calls++]] }
    },
    onJourney: next => { journey = mergeJourney(journey, next); if (calls === 3) controller.abort() },
    onError: error => assert.fail(error.message),
    wait: async () => assert.fail('Successful responses must not have an artificial delay'),
  })
  assert.deepEqual(journey!.journey_details, points)
})

test('failures back off, honor server throttling, and reset after recovery', async () => {
  const controller = new AbortController()
  let calls = 0
  const errors: string[] = []
  const waits: number[] = []
  await runDroneJourneyFeed({
    signal: controller.signal,
    request: async () => {
      calls++
      if (calls === 1) throw new DroneJourneyApiError('Throttled', 429, 2000)
      if (calls === 2 || calls === 4) throw new Error('Disconnected')
      return payload
    },
    onJourney: () => { if (calls === 5) controller.abort() },
    onError: error => errors.push(error.message),
    wait: async ms => { waits.push(ms) },
  })
  assert.deepEqual(waits, [2000, 1000, 500])
  assert.deepEqual(errors, ['Throttled', 'Disconnected', 'Disconnected'])
})

test('cancelled or late requests cannot update the dashboard', async () => {
  const controller = new AbortController()
  await runDroneJourneyFeed({
    signal: controller.signal,
    request: async () => { controller.abort(); return payload },
    onJourney: () => assert.fail('Late data should be ignored'),
    onError: () => assert.fail('Unmount should not update error state'),
  })
})
