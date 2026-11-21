import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronDown,
  Focus,
  Layers,
  Shield,
  UserRound,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type TimeWindowSeconds = 0 | 60 | 600

interface TopBarProps {
  onToggleLayersPanel: () => void
  onFocusArea?: () => void
  isLayersPanelOpen: boolean
  timeWindowSec: TimeWindowSeconds
  onTimeWindowSecChange: (seconds: TimeWindowSeconds) => void
  mitigationActive?: boolean
  alertCount?: number
  feedLabel?: string
}

export default function TopBar({
  onToggleLayersPanel,
  onFocusArea,
  isLayersPanelOpen,
  timeWindowSec,
  onTimeWindowSecChange,
  mitigationActive = false,
  alertCount,
  feedLabel = 'CONNECTING',
}: TopBarProps) {
  const [time, setTime] = useState('--:--:--')

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date()),
      )
    }

    updateTime()
    const timer = window.setInterval(updateTime, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const handleTimeWindowChange = (value: string) => {
    const seconds = Number(value)
    if (seconds === 0 || seconds === 60 || seconds === 600) {
      onTimeWindowSecChange(seconds)
    }
  }

  return (
    <header className="z-30 flex h-14 w-full select-none items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-3 text-slate-200 backdrop-blur-md sm:px-5">
      <div className="flex min-w-0 items-center gap-3 xl:gap-5">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Shield aria-hidden="true" className="size-5" />
          </div>
          <div>
            <div className="whitespace-nowrap text-xs font-black tracking-widest text-white">
              SENTRYCS C-UAS
            </div>
            <div className="whitespace-nowrap font-mono text-[9px] tracking-wide text-slate-500">
              DEFENSE PLATFORM V1.4.154
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 xl:flex">
          <span className="text-[10px] font-bold uppercase text-slate-500">
            Protocol:
          </span>
          <span className="whitespace-nowrap font-semibold text-cyan-400">
            Journey Home Location
          </span>
          <ChevronDown aria-hidden="true" className="size-3.5 text-slate-500" />
        </div>

        <div className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300 lg:flex">
          <span className="text-[10px] font-bold uppercase text-slate-500">
            History:
          </span>
          <Select
            value={String(timeWindowSec)}
            onValueChange={handleTimeWindowChange}
          >
            <SelectTrigger
              aria-label="History time window"
              size="sm"
              className="h-6 border-0 bg-transparent px-1 text-xs font-semibold text-cyan-400 shadow-none hover:bg-transparent focus-visible:ring-0 cursor-pointer"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              sideOffset={6}
              align="start"
              className="border-slate-800 bg-slate-950 text-slate-200 shadow-2xl"
            >
              <SelectItem value="60">
                Last 1 min
              </SelectItem>
              <SelectItem value="600">
                Last 10 min
              </SelectItem>
              <SelectItem value="0">
                All history
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="tracking-wide">{feedLabel}</span>
        </div>

        {mitigationActive && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400">
            <Zap aria-hidden="true" className="size-3.5" />
            <span>MITIGATION ACTIVE</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <time
          className="hidden font-mono text-sm font-bold tabular-nums text-slate-300 sm:block"
          aria-label="Current local time"
        >
          {time}
        </time>

        <Button
          onClick={onFocusArea}
          size="sm"
          variant="outline"
          title="Fit Operation Area"
          className="h-8 gap-1.5 border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-cyan-400 hover:bg-slate-800 hover:text-cyan-300"
        >
          <Focus aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Area</span>
        </Button>

        <Button
          aria-pressed={isLayersPanelOpen}
          onClick={onToggleLayersPanel}
          size="sm"
          variant="outline"
          title="Toggle Layers"
          className={cn(
            'h-8 gap-1.5 border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white',
            isLayersPanelOpen &&
              'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
          )}
        >
          <Layers aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Layers</span>
        </Button>

        <Button
          aria-label={
            alertCount === undefined ? 'Alerts' : `${alertCount} alerts`
          }
          className="relative size-8 text-slate-400 hover:bg-slate-800 hover:text-white"
          size="icon"
          variant="ghost"
        >
          <Bell aria-hidden="true" className="size-4" />
          {alertCount !== undefined && alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Button>

        <div className="flex items-center gap-2 border-l border-slate-800 pl-2">
          <div className="flex size-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300">
            <UserRound aria-hidden="true" className="size-3.5" />
          </div>
          <div className="hidden text-left lg:block">
            <div className="whitespace-nowrap text-xs font-bold text-slate-200">
             User
            </div>
            <div className="whitespace-nowrap text-[9px] uppercase text-slate-500">
              Chief Operator
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
