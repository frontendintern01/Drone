import { useState } from 'react'
import type { DroneSummary } from '../dashboard/types'
import {
  X,
  MapPin,
  Mountain,
  Gauge,
  Compass,
  ArrowUpDown,
  Radio,
  Clock,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Check,
  Copy,
  Plane,
  Crosshair,
} from 'lucide-react'
import { getZoneState, type OperationArea } from './operationArea'

interface DroneMapTooltipProps {
  drone: DroneSummary
  area: OperationArea
  onClose: () => void
  onFocus?: () => void
  placement?: 'top' | 'bottom'
}

function getCompassHeading(deg: number | null | undefined): string {
  if (deg == null) return '—'
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round((((deg % 360) + 360) % 360) / 45) % 8
  return `${directions[index]} (${deg.toFixed(0)}°)`
}

export function DroneMapTooltip({
  drone,
  area,
  onClose,
  onFocus,
  placement = 'top',
}: DroneMapTooltipProps) {
  const [copied, setCopied] = useState(false)
  const point = drone.telemetry
  const zone = drone.position ? getZoneState(drone.position, area) : 'outside'

  const copyCoordinates = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!point) return
    const text = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      role="dialog"
      aria-label={`Drone Telemetry Details for ${drone.name}`}
      className="pointer-events-auto relative w-[310px] rounded-xl border border-cyan-500/50 bg-slate-950/95 p-3.5 text-slate-100 shadow-2xl shadow-cyan-950/60 backdrop-blur-md select-text"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Tactical Caret / Pointer pointing directly to the drone center */}
      {placement === 'top' ? (
        <>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-cyan-500/60" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-x-7 border-t-7 border-x-transparent border-t-slate-950" />
        </>
      ) : (
        <>
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-x-8 border-b-8 border-x-transparent border-b-cyan-500/60" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-x-7 border-b-7 border-x-transparent border-b-slate-950" />
        </>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
            </span>
            <Plane className="size-3.5 shrink-0 text-cyan-400" />
            <h4 className="truncate text-xs font-bold tracking-tight text-white">
              {drone.name}
            </h4>
            <span className="shrink-0 rounded bg-cyan-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 border border-cyan-800/60">
              {drone.model || drone.journey?.device_info.make_model || 'UAV'}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
            <span className="capitalize text-emerald-400 font-medium">
              {point?.flight_status?.replaceAll('_', ' ') ?? drone.status ?? 'In Flight'}
            </span>
            <span>·</span>
            <span className="truncate">{drone.journey?.drone_classification || 'Commercial Multirotor'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onFocus && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onFocus()
              }}
              title="Center on drone"
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
            >
              <Crosshair className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            title="Close details"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Zone Alert Status Badge */}
      <div className="mt-2.5">
        {zone === 'no-fly' ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/60 px-2 py-1 text-[10px] font-bold text-rose-200">
            <ShieldAlert className="size-3.5 shrink-0 text-rose-400 animate-pulse" />
            <span>CRITICAL: No-Fly Zone Breach (NFZ)</span>
          </div>
        ) : zone === 'alert' ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/60 px-2 py-1 text-[10px] font-bold text-amber-200">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
            <span>WARNING: Alert Area Entry</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            <ShieldCheck className="size-3.5 shrink-0 text-emerald-400" />
            <span>Monitored Airspace · Friendly / Tracked</span>
          </div>
        )}
      </div>

      {/* GPS Coordinates Box */}
      <div className="mt-2 rounded-lg border border-slate-800/90 bg-slate-900/60 p-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-semibold text-cyan-400">
            <MapPin className="size-3" /> Live GPS Coordinates
          </span>
          <button
            type="button"
            onClick={copyCoordinates}
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
            title="Copy Latitude, Longitude"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-2 font-mono text-xs text-white">
          <div className="rounded bg-slate-950/80 px-2 py-1 border border-slate-800">
            <span className="text-[9px] uppercase text-slate-500 block">Latitude</span>
            <span className="font-semibold text-cyan-200">
              {point ? point.latitude.toFixed(6) : '—'}°
            </span>
          </div>
          <div className="rounded bg-slate-950/80 px-2 py-1 border border-slate-800">
            <span className="text-[9px] uppercase text-slate-500 block">Longitude</span>
            <span className="font-semibold text-cyan-200">
              {point ? point.longitude.toFixed(6) : '—'}°
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        {/* Altitude (MSL) */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Mountain className="size-3 text-cyan-400" />
            <span>Altitude (MSL)</span>
          </div>
          <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-white">
            {point?.altitude_m != null ? `${point.altitude_m.toFixed(2)} m` : '—'}
          </div>
        </div>

        {/* Height Above Ground (AGL) */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <ArrowUpDown className="size-3 text-cyan-400" />
            <span>Ground Height (AGL)</span>
          </div>
          <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-white">
            {point?.height_above_ground_m != null
              ? `${point.height_above_ground_m.toFixed(2)} m`
              : '—'}
          </div>
        </div>

        {/* Horizontal Speed */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Gauge className="size-3 text-cyan-400" />
            <span>Speed (H)</span>
          </div>
          <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-white">
            {point?.horizontal_speed_mps != null
              ? `${point.horizontal_speed_mps.toFixed(1)} m/s`
              : '—'}
            {point?.horizontal_speed_mps != null && (
              <span className="ml-1 text-[10px] font-normal text-slate-400">
                ({(point.horizontal_speed_mps * 3.6).toFixed(0)} km/h)
              </span>
            )}
          </div>
        </div>

        {/* Vertical Speed / Rate */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <ArrowUpDown className="size-3 text-cyan-400" />
            <span>Vertical Speed</span>
          </div>
          <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-white">
            {point?.vertical_speed_mps != null
              ? `${point.vertical_speed_mps > 0 ? '+' : ''}${point.vertical_speed_mps.toFixed(2)} m/s`
              : '—'}
          </div>
        </div>

        {/* Heading */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Compass className="size-3 text-cyan-400" />
            <span>Heading</span>
          </div>
          <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-white">
            {getCompassHeading(point?.heading_deg)}
          </div>
        </div>

        {/* Distance from RF Sensor */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Radio className="size-3 text-cyan-400" />
            <span>RF RX Dist</span>
          </div>
          <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-white">
            {point?.distance_from_rf_rx_m != null
              ? `${point.distance_from_rf_rx_m.toFixed(1)} m`
              : '—'}
          </div>
        </div>
      </div>

      {/* Footer Details: Serial & Timestamp */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
        <div className="truncate font-mono">
          <span className="text-slate-500">S/N: </span>
          <span className="text-slate-300">
            {drone.journey?.device_info.serial_number ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-slate-400 shrink-0">
          <Clock className="size-3 text-slate-500" />
          <span>
            {point?.timestamp
              ? new Date(point.timestamp).toLocaleTimeString()
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
