import test from 'node:test'
import assert from 'node:assert/strict'
import { operationArea, containsPoint, getZoneState, getZoneAlerts } from '../src/components/map/operationArea.ts'

test('outside → warning → breach → warning → clear follows aircraft position', () => {
  const route = [[70.9, 26.7], [71.6, 26.7], [72.5, 26.7], [71.6, 26.7], [70.9, 26.7]]
  assert.deepEqual(route.map(getZoneState), ['outside', 'alert', 'no-fly', 'alert', 'outside'])
  assert.deepEqual(route.map(position => getZoneAlerts([{ id: 'd1', name: 'Drone 1', position }]).length), [0, 1, 1, 1, 0])
})

test('zone boundaries count as entry and red wins over yellow', () => {
  assert.equal(getZoneState(operationArea.noFly[0]), 'no-fly')
  assert.equal(getZoneState(operationArea.alert[0]), 'alert')
})

test('expanded zones reach the northern and southern edges of the reference sector', () => {
  for (const polygon of [operationArea.alert, operationArea.noFly]) {
    const latitudes = polygon.map(point => point[1])
    assert.ok(Math.max(...latitudes) >= 27.25)
    assert.ok(Math.min(...latitudes) <= 26.16)
  }
  assert.equal(containsPoint([73.024, 26.239], operationArea.alert), true)
})

test('all assets and the entire inner polygon are inside their intended zones', () => {
  for (const point of operationArea.noFly) assert.equal(containsPoint(point, operationArea.alert), true)
  for (const asset of operationArea.assets) assert.equal(getZoneState(asset.position), 'no-fly')
  assert.equal(operationArea.assets.filter(asset => asset.kind === 'pad').length, 2)
})

test('missing and invalid telemetry never creates an alert', () => {
  const records = [undefined, null, [NaN, 26.82], [72.4, Infinity], [220, 26.82], [72.4, 100]]
  assert.deepEqual(getZoneAlerts(records.map((position, i) => ({ id: String(i), name: 'Invalid', position }))), [])
})

test('alerts are deduplicated and breaches are displayed first', () => {
  const warning = { id: 'd1', name: 'Drone 1', position: [72.05, 26.7] }
  const breach = { id: 'd2', name: 'Drone 2', position: [72.5, 26.7] }
  const alerts = getZoneAlerts([warning, breach, warning])
  assert.deepEqual(alerts.map(alert => alert.id), ['d2', 'd1'])
  assert.match(alerts[0].message, /Entered the no-fly/)
  assert.match(alerts[1].message, /Approaching the no-fly/)
})
