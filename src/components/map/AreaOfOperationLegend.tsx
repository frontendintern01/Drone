export function AreaOfOperationLegend() {
  return (
    <div
      aria-label="Area of Operation legend"
      className="pointer-events-auto absolute bottom-4 left-4 z-20 select-none rounded-xl border border-slate-800/80 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-md"
    >
      <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
        Area of Operation
      </div>

      <ul className="space-y-1.5 text-xs">
        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-[2px] border border-amber-500/90 bg-amber-500/25 shadow-xs"
          />
          <span className="text-[11px] font-medium text-slate-300">
            Alert Zone
          </span>
        </li>

        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-[2px] border border-rose-500/90 bg-rose-500/35 shadow-xs"
          />
          <span className="text-[11px] font-medium text-slate-300">
            No-Fly Zone (NFZ)
          </span>
        </li>

        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-emerald-400 bg-emerald-500 text-slate-950 shadow-xs"
          >
            <svg
              className="size-2 text-slate-950"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
              <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
              <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
            </svg>
          </span>
          <span className="text-[11px] font-medium text-slate-300">
            RF Sensors (Masts)
          </span>
        </li>

        <li className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white font-mono text-[9px] font-black leading-none text-slate-950 shadow-xs"
          >
            H
          </span>
          <span className="text-[11px] font-medium text-slate-300">
            Landing Zones (H)
          </span>
        </li>
      </ul>
    </div>
  )
}
