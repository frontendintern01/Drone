import { DroneJourneyApiError } from './droneJourneyApi.ts'
import type { DroneJourney } from './droneJourney.ts'

interface JourneyFeedOptions {
  signal: AbortSignal
  request: (signal: AbortSignal) => Promise<DroneJourney>
  onJourney: (journey: DroneJourney) => void
  onError: (error: Error) => void
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
}

/** One GET at a time; successful responses have no fixed polling delay. */
export async function runDroneJourneyFeed({ signal, request, onJourney, onError, wait = waitForRetry }: JourneyFeedOptions) {
  let failures = 0
  while (!signal.aborted) {
    try {
      const next = await request(signal)
      if (signal.aborted) return
      onJourney(next)
      failures = 0
    } catch (cause) {
      if (signal.aborted) return
      const error = cause instanceof Error ? cause : new Error('Unable to load the drone journey.')
      onError(error)
      const backoffMs = Math.min(10000, 500 * 2 ** Math.min(failures++, 5))
      const serverDelay = cause instanceof DroneJourneyApiError ? cause.retryAfterMs ?? 0 : 0
      await wait(Math.max(backoffMs, serverDelay), signal)
    }
  }
}

function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(); return }
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve() }
    const timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
  })
}
