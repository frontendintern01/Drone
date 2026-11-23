import { useState } from 'react'
import { DroneDetailsPanel } from './DroneDetailsPanel'
import { SkyStatusSection } from './SkyStatusSection'
import type { DroneSummary } from './types'

type DroneTab = 'detected' | 'tracking'

interface RightDashboardPanelProps {
  detectedDrones: readonly DroneSummary[]
  trackingDrones: readonly DroneSummary[]
  selectedDroneId: string | null
  onSelectDrone: (droneId: string) => void
  feedStatus: { error: string | null; updatedAt: Date | null }
}

export function RightDashboardPanel({
  detectedDrones,
  trackingDrones,
  selectedDroneId,
  onSelectDrone,
  feedStatus,
}: RightDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<DroneTab>('detected')
  const visibleDrones =
    activeTab === 'detected' ? detectedDrones : trackingDrones
  const selectedDrone = [...detectedDrones, ...trackingDrones].find(
    (drone) => drone.id === selectedDroneId,
  )

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-l border-slate-800 bg-slate-950/95 shadow-2xl md:w-[360px]">
      <div className="shrink-0 border-b border-slate-800 px-4 py-2.5 text-[10px] text-slate-400" role="status">
        {/* <div className="flex justify-between gap-2"><span className="font-bold text-cyan-300">API JOURNEY FEED</span><span>{feedStatus.error ? 'Unavailable' : feedStatus.updatedAt ? `Synced ${feedStatus.updatedAt.toLocaleTimeString()}` : 'Connecting…'}</span></div> */}
        {feedStatus.error && <p className="mt-1 text-rose-300">{feedStatus.error} Retrying… {feedStatus.updatedAt && 'Showing last received data.'}</p>}
      </div>
      <div
        aria-label="Drone status filters"
        className="grid shrink-0 grid-cols-2 border-b border-slate-800 bg-slate-900/40"
        role="tablist"
      >
        <button
          id="detected-drones-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'detected'}
          aria-controls="drone-status-content"
          onClick={() => setActiveTab('detected')}
          className={
            activeTab === 'detected'
              ? 'border-b-2 border-cyan-400 py-3 text-xs font-bold uppercase tracking-wider text-cyan-400'
              : 'border-b-2 border-transparent py-3 text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200'
          }
        >
          Detected
          {detectedDrones.length > 0 && (
            <span className="ml-2 font-mono text-sm text-white">
              {detectedDrones.length}
            </span>
          )}
        </button>
        <button
          id="tracking-drones-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'tracking'}
          aria-controls="drone-status-content"
          onClick={() => setActiveTab('tracking')}
          className={
            activeTab === 'tracking'
              ? 'border-b-2 border-cyan-400 py-3 text-xs font-bold uppercase tracking-wider text-cyan-400'
              : 'border-b-2 border-transparent py-3 text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200'
          }
        >
          Tracking
          {trackingDrones.length > 0 && (
            <span className="ml-2 font-mono text-sm text-white">
              {trackingDrones.length}
            </span>
          )}
        </button>
      </div>

      <div
        id="drone-status-content"
        role="tabpanel"
        aria-labelledby={
          activeTab === 'detected'
            ? 'detected-drones-tab'
            : 'tracking-drones-tab'
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-36 flex-[0_0_22%] flex-col border-b border-slate-800">
          <SkyStatusSection
            drones={visibleDrones}
            onSelectDrone={onSelectDrone}
            selectedDroneId={selectedDroneId}
          />
        </div>
        <div className="min-h-0 flex-1">
          <DroneDetailsPanel drone={selectedDrone} />
        </div>
      </div>
    </aside>
  )
}
