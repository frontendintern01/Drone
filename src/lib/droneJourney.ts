export interface JourneyPoint {
  timestamp: string
  latitude: number
  longitude: number
  flight_status: string | null
  horizontal_speed_mps: number | null
  vertical_speed_mps: number | null
  heading_deg: number | null
  altitude_m: number | null
  height_above_ground_m: number | null
  altitude_change_m: number | null
  distance_from_rf_rx_m: number | null
}

export interface DroneJourney {
  journey_id: string
  flight_name: string
  flight_date: string
  drone_classification: string
  device_info: { make_model: string; serial_number: string }
  journey_details: JourneyPoint[]
}

const measurements = ['horizontal_speed_mps', 'vertical_speed_mps', 'heading_deg', 'altitude_m',
  'height_above_ground_m', 'altitude_change_m', 'distance_from_rf_rx_m'] as const

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid journey response.')
  return value as Record<string, unknown>
}

export function parseJourney(value: unknown, expectedId: string): DroneJourney {
  const data = record(value)
  if (data.journey_id !== expectedId || !Array.isArray(data.journey_details)) {
    throw new Error('Journey response does not match the requested journey.')
  }
  const device = record(data.device_info)
  for (const key of ['flight_name', 'flight_date']) {
    if (typeof data[key] !== 'string') throw new Error(`Missing ${key} in journey response.`)
  }
  // The backend sends drone_classification inside device_info; older payloads had it at the top level.
  const drone_classification = device.drone_classification ?? data.drone_classification
  if (typeof drone_classification !== 'string') throw new Error('Missing drone_classification in journey response.')
  if (typeof device.make_model !== 'string' || typeof device.serial_number !== 'string') {
    throw new Error('Invalid device information.')
  }
  const journey_details = data.journey_details.map(value => {
    const point = record(value)
    if (typeof point.timestamp !== 'string' || !Number.isFinite(Date.parse(point.timestamp)) ||
      typeof point.latitude !== 'number' || !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 ||
      typeof point.longitude !== 'number' || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180) {
      throw new Error('Invalid GPS coordinate or timestamp in journey response.')
    }
    if (point.flight_status != null && typeof point.flight_status !== 'string') throw new Error('Invalid flight status.')
    const normalized: Record<string, unknown> = { ...point, flight_status: point.flight_status ?? null }
    for (const key of measurements) {
      if (point[key] != null && (typeof point[key] !== 'number' || !Number.isFinite(point[key]))) {
        throw new Error(`Invalid ${key} in journey response.`)
      }
      normalized[key] = point[key] ?? null
    }
    return normalized as unknown as JourneyPoint
  })
  return { ...data, drone_classification, device_info: device, journey_details } as unknown as DroneJourney
}

/** Accept full history or incremental batches, correcting duplicate timestamps in place. */
export function mergeJourney(previous: DroneJourney | null, next: DroneJourney): DroneJourney {
  const history = previous?.journey_id === next.journey_id ? previous.journey_details : []
  const points = new Map([...history, ...next.journey_details].map(point => [timestampOrder(point.timestamp), point]))
  return { ...next, journey_details: [...points.entries()]
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, point]) => point) }
}

/** Preserve the API's submillisecond precision and deduplicate equivalent UTC offsets. */
function timestampOrder(timestamp: string): bigint {
  const fraction = timestamp.match(/\.(\d+)(?:Z|[+-]\d{2}:?\d{2})$/i)?.[1] ?? ''
  const submillisecond = fraction.slice(3, 9).padEnd(6, '0')
  return BigInt(Date.parse(timestamp)) * 1000000n + BigInt(submillisecond)
}


/** A journey whose newest sample is older than this is a recorded flight and gets replayed. */
export const LIVE_FRESHNESS_MS = 2 * 60 * 1000

export function isRecordedJourney(points: readonly JourneyPoint[], nowMs: number): boolean {
  const last = points.at(-1)
  return last != null && nowMs - Date.parse(last.timestamp) > LIVE_FRESHNESS_MS
}

/** Number of samples reached `elapsedMs` after the first sample (always at least one). */
export function replayedSampleCount(points: readonly JourneyPoint[], elapsedMs: number): number {
  if (!points.length) return 0
  const cutoff = Date.parse(points[0].timestamp) + elapsedMs
  let low = 1, high = points.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (Date.parse(points[mid].timestamp) <= cutoff) low = mid + 1
    else high = mid
  }
  return low
}
