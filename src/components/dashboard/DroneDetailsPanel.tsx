import { useState } from 'react'
import type { DroneSummary } from './types'
import { ArrowUpDown, Compass, Gauge, MapPin, Mountain, Radio, Navigation, Clock } from 'lucide-react'

const number = (value: number | null | undefined, unit = '', digits = 2) =>
  value == null ? '—' : `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`

function TelemetryCards({ drone }: { drone: DroneSummary }) {
  const point = drone.telemetry
  if (!point) return <p className="mt-4 text-xs text-slate-500">Awaiting telemetry.</p>
  const first = drone.journey?.journey_details[0]
  const elapsed = first ? Math.max(0, Math.floor((Date.parse(point.timestamp) - Date.parse(first.timestamp)) / 1000)) : 0
  const duration = `${String(Math.floor(elapsed / 3600)).padStart(2, '0')}:${String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const metrics = [
    { label: 'Altitude', value: number(point.altitude_m, 'm', 3), icon: Mountain },
    { label: 'Ground height', value: number(point.height_above_ground_m, 'm', 3), icon: ArrowUpDown },
    { label: 'Horizontal speed', value: number(point.horizontal_speed_mps, 'm/s'), icon: Gauge },
    { label: 'Vertical speed', value: number(point.vertical_speed_mps, 'm/s'), icon: ArrowUpDown },
    { label: 'Heading', value: number(point.heading_deg, '°', 1), icon: Compass },
    { label: 'Climb / descent', value: number(point.altitude_change_m, 'm', 3), icon: Navigation },
    { label: 'RF distance', value: number(point.distance_from_rf_rx_m, 'm'), icon: Radio },
    { label: 'Flight elapsed', value: duration, icon: Clock },
  ]
  return <div className="mt-3 space-y-3">
    <div className="rounded-xl border border-cyan-900/70 bg-cyan-950/20 p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400"><MapPin className="size-3.5" />GPS location</div>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-[10px] text-slate-500">Latitude</dt><dd className="mt-1 font-mono text-white">{point.latitude}</dd></div><div><dt className="text-[10px] text-slate-500">Longitude</dt><dd className="mt-1 font-mono text-white">{point.longitude}</dd></div></dl>
      <p className="mt-2 text-[10px] text-emerald-400">Home set at first received GPS fix</p>
    </div>
    <dl className="grid grid-cols-2 gap-2">
      {metrics.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><dt className="flex items-center gap-1.5 text-[10px] text-slate-400"><Icon className="size-3 text-cyan-500" />{label}</dt><dd className="mt-2 font-mono text-sm font-semibold tabular-nums text-slate-100">{value}</dd></div>)}
    </dl>
    <dl className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs">
      <div><dt className="text-[10px] text-slate-500">Flight status</dt><dd className="mt-1 capitalize text-cyan-300">{point.flight_status?.replaceAll('_', ' ') ?? '—'}</dd></div>
      <div><dt className="text-[10px] text-slate-500">Classification</dt><dd className="mt-1">{drone.journey?.drone_classification ?? '—'}</dd></div>
      <div><dt className="text-[10px] text-slate-500">Flight timestamp · UTC</dt><dd className="mt-1 break-all font-mono text-[10px]">{point.timestamp}</dd></div>
      <div><dt className="text-[10px] text-slate-500">Serial number</dt><dd className="mt-1 break-all font-mono text-[10px]">{drone.journey?.device_info.serial_number ?? '—'}</dd></div>
    </dl>
  </div>
}

type DetailTab = 'tactical' | 'remote-id'

interface DroneDetailsPanelProps {
  drone: DroneSummary | undefined
}

export function DroneDetailsPanel({ drone }: DroneDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('tactical')

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-slate-800">
      <div
        aria-label="Drone detail views"
        className="grid shrink-0 grid-cols-2 border-b border-slate-800 text-xs font-semibold"
        role="tablist"
      >
        <button
          id="tactical-details-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'tactical'}
          aria-controls="drone-details-content"
          onClick={() => setActiveTab('tactical')}
          className={
            activeTab === 'tactical'
              ? 'border-b-2 border-cyan-400 bg-slate-900/50 py-3 text-cyan-400'
              : 'border-b-2 border-transparent py-3 text-slate-400 transition-colors hover:text-slate-200'
          }
        >
          Tactical Gauges
        </button>
        <button
          id="remote-id-details-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'remote-id'}
          aria-controls="drone-details-content"
          onClick={() => setActiveTab('remote-id')}
          className={
            activeTab === 'remote-id'
              ? 'border-b-2 border-cyan-400 bg-slate-900/50 py-3 text-cyan-400'
              : 'border-b-2 border-transparent py-3 text-slate-400 transition-colors hover:text-slate-200'
          }
        >
          RemoteID Payload
        </button>
      </div>

      <div
        id="drone-details-content"
        role="tabpanel"
        aria-labelledby={
          activeTab === 'tactical'
            ? 'tactical-details-tab'
            : 'remote-id-details-tab'
        }
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        {drone ? (
          <>
            <div className="flex flex-wrap items-baseline gap-2 border-b border-slate-800/80 pb-3">
              <h2 className="text-base font-bold tracking-wide text-white">
                {drone.name}
              </h2>
              {drone.model && (
                <span className="font-mono text-xs text-cyan-400">
                  ({drone.model})
                </span>
              )}
            </div>
            {activeTab === 'tactical' ? <TelemetryCards drone={drone} /> : <div className="mt-4 space-y-3"><p className="text-xs text-slate-500">Journey API payload</p><pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-[10px] leading-relaxed text-slate-300">{JSON.stringify({ journey_id: drone.journey?.journey_id, flight_name: drone.journey?.flight_name, flight_date: drone.journey?.flight_date, drone_classification: drone.journey?.drone_classification, device_info: drone.journey?.device_info, latest_point: drone.telemetry }, null, 2)}</pre></div>}
          </>
        ) : (
          <div className="grid h-full min-h-28 place-items-center text-center text-xs text-slate-500">
            Select an aircraft to view details
          </div>
        )}
      </div>
    </section>
  )
}
