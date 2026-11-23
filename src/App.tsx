import { useRef, useState } from 'react'
import TopBar, { type TimeWindowSeconds } from '@/components/TopBar'
import { RightDashboardPanel } from '@/components/dashboard/RightDashboardPanel'
import type { DroneSummary } from '@/components/dashboard/types'
import { DeckGoogleMap } from '@/components/map/DeckGoogleMap'
import { createJourneyOperationArea, getZoneAlerts, operationArea } from '@/components/map/operationArea'
import { useDroneJourney } from '@/hooks/useDroneJourney'
import { useJourneyPlayback } from '@/hooks/useJourneyPlayback'
import { droneJourneyConfig } from '@/config/droneJourney'

function App() {
  const { journey: feedJourney, error, updatedAt } = useDroneJourney()
  const journey = useJourneyPlayback(feedJourney, droneJourneyConfig.replaySpeed)
  const points = journey?.journey_details ?? []
  const latest = points.at(-1)
  const homeLng = points[0]?.longitude
  const homeLat = points[0]?.latitude
  const journeyArea = homeLng != null && homeLat != null
    ? createJourneyOperationArea([homeLng, homeLat]) : operationArea
  const detectedDrones: DroneSummary[] = journey && latest ? [{
    id: journey.journey_id, name: journey.flight_name, model: journey.device_info.make_model,
    status: latest.flight_status?.replaceAll('_', ' '),
    position: [latest.longitude, latest.latitude],
    homePosition: [points[0].longitude, points[0].latitude],
    path: points.map(point => [point.longitude, point.latitude]),
    telemetry: latest, journey,
  }] : []
  const trackingDrones = detectedDrones
  const [timeWindowSec, setTimeWindowSec] = useState<TimeWindowSeconds>(600)
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false)
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null)
  const focusOperationRef = useRef<(() => void) | null>(null)
  const mapDrones = [...new Map([...detectedDrones, ...trackingDrones].map(drone => [drone.id, drone])).values()].map(drone => {
    const filteredPoints = points.filter(
      point => timeWindowSec === 0 || Date.parse(point.timestamp) >= Date.parse(latest!.timestamp) - timeWindowSec * 1000
    )
    const pathCoords: [number, number][] = filteredPoints.map(point => [point.longitude, point.latitude] as [number, number])

    return {
      ...drone,
      path: pathCoords,
    }
  })
  const zoneAlerts = getZoneAlerts(mapDrones, journeyArea)

  return (
    <div className="dark flex h-svh flex-col overflow-hidden bg-slate-950 text-slate-200">
      <TopBar
        alertCount={zoneAlerts.length}
        isLayersPanelOpen={isLayersPanelOpen}
        onTimeWindowSecChange={setTimeWindowSec}
        onFocusArea={() => focusOperationRef.current?.()}
        onToggleLayersPanel={() => setIsLayersPanelOpen((isOpen) => !isOpen)}
        timeWindowSec={timeWindowSec}
        feedLabel={error ? 'API RETRYING' : updatedAt ? 'API CONNECTED' : 'CONNECTING'}
      />
      <main className="flex min-h-0 flex-1" aria-label="Dashboard">
        <DeckGoogleMap
          drones={mapDrones}
          area={journeyArea}
          alerts={zoneAlerts}
          focusOperationRef={focusOperationRef}
          selectedDroneId={selectedDroneId ?? detectedDrones[0]?.id ?? null}
          onSelectDrone={setSelectedDroneId}
        />
        <RightDashboardPanel
          detectedDrones={detectedDrones}
          trackingDrones={trackingDrones}
          selectedDroneId={selectedDroneId ?? detectedDrones[0]?.id ?? null}
          onSelectDrone={setSelectedDroneId}
          feedStatus={{ error, updatedAt }}
        />
      </main>
    </div>
  )
}

export default App
