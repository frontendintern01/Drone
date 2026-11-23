import { parseJourney, type DroneJourney } from './droneJourney.ts'

export class DroneJourneyApiError extends Error {
  status: number | null
  retryAfterMs: number | null

  constructor(message: string, status: number | null = null, retryAfterMs: number | null = null) {
    super(message)
    this.name = 'DroneJourneyApiError'
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

interface JourneyClientOptions {
  baseUrl: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/** Transport only: no React or environment dependency, and any journey ID can be requested. */
export function createDroneJourneyClient({ baseUrl, timeoutMs = 15000, fetchImpl = fetch }: JourneyClientOptions) {
  const origin = baseUrl.trim().replace(/\/+$/, '')

  return async function getJourney(journeyId: string, signal: AbortSignal): Promise<DroneJourney> {
    if (!journeyId.trim()) throw new DroneJourneyApiError('A journey ID is required.')
    const url = `${origin}/api/v1/drone-journey/${encodeURIComponent(journeyId)}`
    const timeout = AbortSignal.timeout(timeoutMs)
    let response: Response
    try {
      response = await fetchImpl(url, {
        signal: AbortSignal.any([signal, timeout]),
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
    } catch (error) {
      if (signal.aborted) throw error
      if (timeout.aborted) throw new DroneJourneyApiError('Drone backend request timed out. Check server availability.')
      throw new DroneJourneyApiError('Unable to reach the drone API. Check backend availability and network access.')
    }

    if (!response.ok) {
      const retryHeader = response.headers.get('Retry-After')
      const retryAfterMs = retryHeader == null ? null : /^\d+(\.\d+)?$/.test(retryHeader)
        ? Number(retryHeader) * 1000 : Math.max(0, Date.parse(retryHeader) - Date.now())
      throw new DroneJourneyApiError(
        `Journey request failed (HTTP ${response.status}).${response.status === 404 ? ' Check the configured journey ID.' : ''}`,
        response.status,
        retryAfterMs != null && Number.isFinite(retryAfterMs) ? retryAfterMs : null,
      )
    }

    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      if (signal.aborted) throw error
      throw new DroneJourneyApiError(timeout.aborted ? 'Drone backend response timed out.' : 'Drone API returned invalid JSON.')
    }
    return parseJourney(body, journeyId)
  }
}
