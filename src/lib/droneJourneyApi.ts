import { parseJourney, type DroneJourney } from './droneJourney'

export const journeyConfig = {
  mode: import.meta.env.VITE_DRONE_DATA_MODE === 'api' ? 'api' : 'mock',
  journeyId: import.meta.env.VITE_DRONE_JOURNEY_ID || 'AERPAW-FLIGHT2-20250609',
  baseUrl: (import.meta.env.VITE_DRONE_API_BASE_URL || '').replace(/\/$/, ''),
  pollMs: Math.max(1000, Number(import.meta.env.VITE_DRONE_POLL_INTERVAL_MS) || 3000),
}

export async function fetchJourney(signal: AbortSignal): Promise<DroneJourney> {
  const url = journeyConfig.mode === 'api'
    ? `${journeyConfig.baseUrl}/api/v1/drone-journey/${encodeURIComponent(journeyConfig.journeyId)}`
    : `${import.meta.env.BASE_URL}mocks/drone-journey.json`
  const response = await fetch(url, { signal, cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Journey request failed (HTTP ${response.status}).`)
  return parseJourney(await response.json(), journeyConfig.journeyId)
}
