import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createJourneyOperationArea, containsPoint, getZoneAlerts, getZoneState, type Coordinate } from '../src/components/map/operationArea.ts'

const home: Coordinate = [-78.696251, 35.7274898]
const area = createJourneyOperationArea(home)
const center = (points: Coordinate[]): Coordinate => [
  points.reduce((sum, p) => sum + p[0], 0) / points.length,
  points.reduce((sum, p) => sum + p[1], 0) / points.length,
]

test('relocates nested zones near home with a gap and a shorter yellow zone', () => {
  assert.equal(getZoneState(home, area), 'outside')
  const eastGap = (Math.min(...area.alert.map(p => p[0])) - home[0]) * 111320 * Math.cos(home[1] * Math.PI / 180)
  assert.ok(eastGap > 1000 && eastGap < 1500)
  assert.ok(area.noFly.every(point => containsPoint(point, area.alert)))
  const height = (Math.max(...area.alert.map(p => p[1])) - Math.min(...area.alert.map(p => p[1]))) * 111320
  assert.ok(height > 2500 && height < 3000)
})

test('yellow entry, red entry and exit report the current zone with model name', () => {
  const drone = { id: 'flight', name: 'Flight2', model: 'DJI_Inspire_2_2G' }
  const yellow = area.alert[0]
  const red = center(area.noFly)
  assert.equal(getZoneState(yellow, area), 'alert')
  assert.equal(getZoneState(red, area), 'no-fly')
  assert.match(getZoneAlerts([{ ...drone, position: yellow }], area)[0].message, /DJI_Inspire_2_2G.*yellow alert area/)
  assert.match(getZoneAlerts([{ ...drone, position: red }], area)[0].message, /DJI_Inspire_2_2G.*no-fly zone/)
  assert.equal(getZoneAlerts([{ ...drone, position: home }], area).length, 0)
})
