import { useEffect, useState } from 'react'
import { mergeJourney, type DroneJourney } from '@/lib/droneJourney'
import { fetchJourney, journeyConfig } from '@/lib/droneJourneyApi'

export function useDroneJourney() {
  const [journey, setJourney] = useState<DroneJourney | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController
    async function poll() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const next = await fetchJourney(controller.signal)
        if (!disposed) {
          setJourney(previous => {
            const base = mergeJourney(previous, next)
            if (journeyConfig.mode === 'mock') {
              if (!previous || previous.journey_details.length === 0) {
                const initialPoint = {
                  ...base.journey_details[0],
                  timestamp: new Date().toISOString(),
                }
                return {
                  ...base,
                  journey_details: [initialPoint],
                }
              }
              const details = previous.journey_details
              const last = details[details.length - 1]
              const step = details.length
              const speed = step === 1 ? 5 : step === 2 ? 10 : 14 + Math.sin(step * 0.1) * 3
              const heading = (95 + Math.sin(step * 0.08) * 35 + 360) % 360
              const rad = (heading * Math.PI) / 180
              const dLat = (Math.cos(rad) * speed * (journeyConfig.pollMs / 1000)) / 111320
              const dLng = (Math.sin(rad) * speed * (journeyConfig.pollMs / 1000)) / (111320 * Math.cos(last.latitude * Math.PI / 180))
              const nextPoint = {
                timestamp: new Date().toISOString(),
                latitude: last.latitude + dLat,
                longitude: last.longitude + dLng,
                flight_status: 'in_flight',
                horizontal_speed_mps: Math.round(speed * 10) / 10,
                vertical_speed_mps: Math.round(Math.sin(step * 0.2) * 10) / 10,
                heading_deg: Math.round(heading),
                altitude_m: Math.round((55 + Math.sin(step * 0.1) * 12) * 10) / 10,
                height_above_ground_m: Math.round((55 + Math.sin(step * 0.1) * 12) * 10) / 10,
                altitude_change_m: 0.1,
                distance_from_rf_rx_m: Math.round(150 + step * 10),
              }
              return {
                ...base,
                journey_details: [...details, nextPoint],
              }
            }
            return base
          })
          setUpdatedAt(new Date())
          setError(null)
        }
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : 'Unable to fetch journey data.')
      } finally {
        clearTimeout(timeout)
        if (!disposed) timer = setTimeout(poll, journeyConfig.pollMs)
      }
    }
    void poll()
    return () => { disposed = true; clearTimeout(timer); controller?.abort() }
  }, [])
  return { journey, error, updatedAt, mode: journeyConfig.mode }
}
