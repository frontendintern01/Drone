import { Radio } from 'lucide-react'
import { DroneStatusCard } from './DroneStatusCard'
import type { DroneSummary } from './types'

interface SkyStatusSectionProps {
  drones: readonly DroneSummary[]
  selectedDroneId: string | null
  onSelectDrone: (droneId: string) => void
}

export function SkyStatusSection({
  drones,
  selectedDroneId,
  onSelectDrone,
}: SkyStatusSectionProps) {
  return (
    <section
      aria-labelledby="sky-status-heading"
      className="flex h-full min-h-0 flex-col px-3 py-3"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h2
          id="sky-status-heading"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300"
        >
          <Radio aria-hidden="true" className="size-4 text-cyan-400" />
          Sky Status
        </h2>
        {drones.length > 0 && (
          <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-400">
            {drones.length} active
          </span>
        )}
      </div>

      {drones.length === 0 ? (
        <div className="flex min-h-24 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-500">
          Awaiting live aircraft data
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {drones.map((drone) => (
            <li key={drone.id}>
              <DroneStatusCard
                drone={drone}
                isSelected={drone.id === selectedDroneId}
                onSelect={onSelectDrone}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
