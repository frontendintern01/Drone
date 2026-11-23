import { useEffect, useState } from 'react'
import { droneJourneyConfig, droneJourneyRequestOrigin } from '@/config/droneJourney'
import { mergeJourney, type DroneJourney } from '@/lib/droneJourney'
import { createDroneJourneyClient } from '@/lib/droneJourneyApi'
import { runDroneJourneyFeed } from '@/lib/droneJourneyFeed'

const getJourney = createDroneJourneyClient({
  baseUrl: droneJourneyRequestOrigin,
  timeoutMs: droneJourneyConfig.requestTimeoutMs,
})

interface JourneyFeedState {
  journeyId: string
  journey: DroneJourney | null
  error: string | null
  updatedAt: Date | null
}

export function useDroneJourney(journeyId = droneJourneyConfig.journeyId) {
  const [state, setState] = useState<JourneyFeedState>({ journeyId, journey: null, error: null, updatedAt: null })

  useEffect(() => {
    const controller = new AbortController()
    void runDroneJourneyFeed({
      signal: controller.signal,
      request: signal => getJourney(journeyId, signal),
      onJourney: next => setState(previous => ({
        journeyId,
        journey: mergeJourney(previous.journeyId === journeyId ? previous.journey : null, next),
        updatedAt: new Date(),
        error: null,
      })),
      onError: error => setState(previous => ({
        journeyId,
        journey: previous.journeyId === journeyId ? previous.journey : null,
        updatedAt: previous.journeyId === journeyId ? previous.updatedAt : null,
        error: error.message,
      })),
    })
    return () => controller.abort()
  }, [journeyId])

  // Never render the previous flight while a new journey selection starts loading.
  return state.journeyId === journeyId ? state : { journeyId, journey: null, error: null, updatedAt: null }
}
