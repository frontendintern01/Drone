import type { Coordinate } from '../map/operationArea'
import type { DroneJourney, JourneyPoint } from '@/lib/droneJourney'

export interface DroneSummary {
  id: string
  name: string
  model?: string | null
  status?: string | null
  /** Map coordinates from the API, in [longitude, latitude] order. */
  position?: [longitude: number, latitude: number] | null
  homePosition?: Coordinate
  path?: Coordinate[]
  telemetry?: JourneyPoint
  journey?: DroneJourney
}
