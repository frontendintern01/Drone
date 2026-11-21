export type Coordinate = [longitude: number, latitude: number]
export type ZoneState = 'outside' | 'alert' | 'no-fly'

export const OPERATION_CENTER: Coordinate = [72.54, 26.68]
// Height adjusted (latitudeScale = longitudeScale * 1.2 * 3) while keeping current width.
export function expandAlertPoint([lng, lat]: Coordinate): Coordinate {
  const longitudeScale = Math.sqrt(3)
  const latitudeScale = longitudeScale * 1.2 * 3
  return [
    OPERATION_CENTER[0] + (lng - OPERATION_CENTER[0]) * longitudeScale,
    OPERATION_CENTER[1] + (lat - OPERATION_CENTER[1]) * latitudeScale,
  ]
}

// Double (2x) the height of the No-Fly zone around the operation center.
export function expandNoFlyPoint([lng, lat]: Coordinate): Coordinate {
  return [
    lng,
    OPERATION_CENTER[1] + (lat - OPERATION_CENTER[1]) * 2,
  ]
}

// Spread assets across the taller Tekra–Karnu / Pareu–Jodhpur sample sector.
export function expandOperationPoint([lng, lat]: Coordinate): Coordinate {
  return [OPERATION_CENTER[0] + (lng - 72.395) * 6,
    OPERATION_CENTER[1] + (lat - 26.825) * 8]
}

// Sample operation area in western Rajasthan. Replace with operational GIS data.
export const operationArea = {
  name: 'Western Sector',
  alert: ([[71.90, 27.35], [73.10, 27.30], [73.18, 26.05], [72.00, 26.00]] as Coordinate[]).map(expandAlertPoint),
  noFly: ([[72.05, 27.25], [72.98, 27.20], [73.08, 26.16], [72.15, 26.11]] as Coordinate[]).map(expandNoFlyPoint),
  assets: [
    { id: 'LP-01', name: 'Landing pad 01', kind: 'pad', position: [72.36, 27.20] as Coordinate },
    { id: 'RF-01', name: 'RF sensor 01', kind: 'sensor', position: [72.72, 27.05] as Coordinate },
    { id: 'RF-02', name: 'RF sensor 02', kind: 'sensor', position: [72.54, 26.68] as Coordinate },
    { id: 'RF-03', name: 'RF sensor 03', kind: 'sensor', position: [72.36, 26.31] as Coordinate },
    { id: 'LP-02', name: 'Landing pad 02', kind: 'pad', position: [72.72, 26.16] as Coordinate },
  ],
}

export type OperationArea = typeof operationArea

/** Demo GIS layout anchored to the journey origin, never the moving aircraft. */
export function createJourneyOperationArea(home: Coordinate): OperationArea {
  const metersPerLat = 111320
  const metersPerLng = metersPerLat * Math.cos(home[1] * Math.PI / 180)
  const relocate = ([lng, lat]: Coordinate, heightScale = 1): Coordinate => [
    home[0] + (1800 + (lng - OPERATION_CENTER[0]) * 600) / metersPerLng,
    home[1] + (lat - OPERATION_CENTER[1]) * 600 * heightScale / metersPerLat,
  ]

  // Well-spaced assets across the No-Fly zone to ensure clear, uncluttered visibility
  const noFlyCenterLng = home[0] + 1800 / metersPerLng
  const noFlyCenterLat = home[1]

  const journeyAssets = [
    {
      id: 'LP-01',
      name: 'Landing pad 01',
      kind: 'pad' as const,
      position: [
        noFlyCenterLng - 130 / metersPerLng,
        noFlyCenterLat + 380 / metersPerLat,
      ] as Coordinate,
    },
    {
      id: 'RF-01',
      name: 'RF sensor 01',
      kind: 'sensor' as const,
      position: [
        noFlyCenterLng + 130 / metersPerLng,
        noFlyCenterLat + 220 / metersPerLat,
      ] as Coordinate,
    },
    {
      id: 'RF-02',
      name: 'RF sensor 02',
      kind: 'sensor' as const,
      position: [noFlyCenterLng, noFlyCenterLat] as Coordinate,
    },
    {
      id: 'RF-03',
      name: 'RF sensor 03',
      kind: 'sensor' as const,
      position: [
        noFlyCenterLng - 130 / metersPerLng,
        noFlyCenterLat - 220 / metersPerLat,
      ] as Coordinate,
    },
    {
      id: 'LP-02',
      name: 'Landing pad 02',
      kind: 'pad' as const,
      position: [
        noFlyCenterLng + 130 / metersPerLng,
        noFlyCenterLat - 380 / metersPerLat,
      ] as Coordinate,
    },
  ]

  return {
    name: 'Journey Operation Area',
    alert: operationArea.alert.map(point => relocate(point, 0.55)),
    noFly: operationArea.noFly.map(point => relocate(point)),
    assets: journeyAssets,
  }
}

export function isValidCoordinate(point: readonly number[]): point is Coordinate {
  return point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90
}

// Include the boundary itself: an aircraft on a zone edge has entered that zone.
export function containsPoint(point: Coordinate, polygon: Coordinate[]) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi)
    if (Math.abs(cross) < 1e-10 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj) &&
      y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return true
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function getZoneState(point: Coordinate, area: OperationArea = operationArea): ZoneState {
  if (!isValidCoordinate(point)) return 'outside'
  if (containsPoint(point, area.noFly)) return 'no-fly'
  return containsPoint(point, area.alert) ? 'alert' : 'outside'
}

export function getZoneAlerts(drones: readonly { id: string; name: string; model?: string | null; position?: Coordinate | null }[], area: OperationArea = operationArea) {
  // The same drone may appear in both detection and tracking feeds.
  return [...new Map(drones.map(drone => [drone.id, drone])).values()].flatMap(drone => {
    if (!drone.position || !isValidCoordinate(drone.position)) return []
    const zone = getZoneState(drone.position, area)
    if (zone === 'outside') return []
    const name = drone.model || drone.name
    return [{ id: drone.id, name, zone, message: zone === 'no-fly'
      ? `${name} has entered the no-fly zone.`
      : `${name} has entered the yellow alert area.` }]
  }).sort((a, b) => Number(b.zone === 'no-fly') - Number(a.zone === 'no-fly'))
}
