import type { DroneSummary } from '@/components/dashboard/types'

export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DroneTarget extends DroneSummary {
  threatLevel?: ThreatLevel
}
