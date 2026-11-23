import { useEffect, useMemo, useState } from 'react'
import { isRecordedJourney, replayedSampleCount, type DroneJourney } from '@/lib/droneJourney'

const TICK_MS = 250

interface ReplayClock { journeyId?: string, startedAt: number | null, now: number | null }

/**
 * Live journeys pass through unchanged. A recorded journey (all samples in the past) is
 * replayed from its first sample at `speed`× real time, so the drone moves along its track.
 */
export function useJourneyPlayback(journey: DroneJourney | null, speed = 1): DroneJourney | null {
  const journeyId = journey?.journey_id
  const [clock, setClock] = useState<ReplayClock>({ journeyId, startedAt: null, now: null })

  // Restart the replay clock whenever a different journey is selected.
  if (clock.journeyId !== journeyId) setClock({ journeyId, startedAt: null, now: null })

  const points = journey?.journey_details
  const recorded = points != null && clock.now != null && isRecordedJourney(points, clock.now)
  const count = !points ? 0 : !recorded ? points.length
    : replayedSampleCount(points, (clock.now! - clock.startedAt!) * speed)
  const finished = clock.now != null && (!points || count >= points.length)

  useEffect(() => {
    if (!journeyId || finished) return
    const tick = () => setClock(previous => {
      const now = Date.now()
      return { ...previous, startedAt: previous.startedAt ?? now, now }
    })
    tick()
    const timer = setInterval(tick, TICK_MS)
    return () => clearInterval(timer)
  }, [journeyId, finished])

  return useMemo(() => {
    if (!journey) return null
    // Until the clock starts, show only the first sample so a recorded flight never flashes its end.
    if (clock.now == null) return { ...journey, journey_details: journey.journey_details.slice(0, 1) }
    return recorded ? { ...journey, journey_details: journey.journey_details.slice(0, count) } : journey
  }, [journey, clock.now, recorded, count])
}
