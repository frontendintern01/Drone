import { cn } from '@/lib/utils'
import type { DroneSummary } from './types'

interface DroneStatusCardProps {
  drone: DroneSummary
  isSelected: boolean
  onSelect: (droneId: string) => void
}

export function DroneStatusCard({
  drone,
  isSelected,
  onSelect,
}: DroneStatusCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(drone.id)}
      className={cn(
        'flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors',
        isSelected
          ? 'border-cyan-500/70 bg-cyan-950/30 text-white'
          : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60',
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'size-2 shrink-0 rounded-full',
            isSelected ? 'bg-cyan-300' : 'bg-cyan-500',
          )}
        />
        <span className="min-w-0">
          <span className="block truncate font-bold">{drone.name}</span>
          {drone.model && (
            <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
              {drone.model}
            </span>
          )}
        </span>
      </span>

      {drone.status && (
        <span className="shrink-0 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300">
          {drone.status}
        </span>
      )}
    </button>
  )
}
