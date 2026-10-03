import React from 'react'
import {
  Flame,
  Swords,
  Radio,
  RefreshCw,
  KeyRound,
  Volume2,
  VolumeX,
  Zap,
  Clock
} from 'lucide-react'
import { ChainState, RankedWarState } from '../types/torn'
import { formatChainTimer } from '../utils/formatters'

interface TopTelemetryBarProps {
  factionName: string
  factionTag: string
  factionId: number
  chain: ChainState
  rankedWar: RankedWarState
  isLiveMode: boolean
  accessTier: string
  requestsPerMin: number
  isSyncing: boolean
  soundAlerts: boolean
  onToggleSound: () => void
  onSimulateChainSave: () => void
  onSyncNow: () => void
  onOpenApiModal: () => void
  tctTimeString: string
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  factionName,
  factionTag,
  factionId,
  chain,
  rankedWar,
  isLiveMode,
  accessTier,
  requestsPerMin,
  isSyncing,
  soundAlerts,
  onToggleSound,
  onSimulateChainSave,
  onSyncNow,
  onOpenApiModal,
  tctTimeString
}) => {
  const isCriticalChain = chain.current > 0 && chain.timeout > 0 && chain.timeout <= 90
  const isWarningChain = chain.current > 0 && chain.timeout > 90 && chain.timeout <= 150

  const lead = rankedWar.ourScore - rankedWar.enemyScore
  const ourProgressPct = Math.min(
    100,
    Math.max(5, Math.round((rankedWar.ourScore / Math.max(1, rankedWar.targetScore)) * 100))
  )

  return (
    <header className="sticky top-0 z-30 bg-[#0B0E11]/95 backdrop-blur-md border-b border-[#222A34] px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active Chain Monitor */}
        <div
          className={`flex items-center gap-3.5 px-3.5 py-1.5 rounded-md border transition-all ${
            isCriticalChain
              ? 'bg-[#F85149]/15 border-[#F85149] chain-critical'
              : isWarningChain
              ? 'bg-[#D29922]/10 border-[#D29922]/60'
              : 'bg-[#12161B] border-[#222A34]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Flame
              className={`w-4 h-4 ${
                isCriticalChain
                  ? 'text-[#F85149] animate-bounce'
                  : isWarningChain
                  ? 'text-[#D29922]'
                  : 'text-[#3FB950]'
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                  Active Chain
                </span>
                <span className="text-[11px] font-mono-num px-1.5 py-0.5 rounded bg-[#181E25] text-[#2F81F7] border border-[#222A34]">
                  {chain.modifier.toFixed(2)}x
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold font-mono-num text-[#E6EDF3]">
                  {chain.current.toLocaleString()}
                </span>
                <span className="text-xs font-mono-num text-[#8B949E]">
                  / {chain.nextMilestone.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-[#222A34]" />

          {/* Chain Countdown Timer */}
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[#8B949E]">Timer</div>
              <div
                className={`text-lg font-bold font-mono-num leading-none ${
                  isCriticalChain
                    ? 'text-[#F85149]'
                    : isWarningChain
                    ? 'text-[#D29922]'
                    : 'text-[#3FB950]'
                }`}
              >
                {formatChainTimer(chain.timeout)}
              </div>
            </div>

            <button
              onClick={onSimulateChainSave}
              title="Log / Simulate Chain Hit (+1 hit, resets timer to 05:00)"
              className="px-2.5 py-1 rounded text-xs font-medium bg-[#2F81F7]/15 hover:bg-[#2F81F7]/25 text-[#58A6FF] border border-[#2F81F7]/40 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>+Hit</span>
            </button>

            <button
              onClick={onToggleSound}
              title={soundAlerts ? 'Chain Audio Alert Enabled (< 90s)' : 'Enable Chain Audio Alert'}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                soundAlerts
                  ? 'bg-[#3FB950]/15 border-[#3FB950]/40 text-[#3FB950]'
                  : 'bg-[#181E25] border-[#222A34] text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {soundAlerts ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="hidden xl:block h-7 w-[1px] bg-[#222A34]" />

          <div className="hidden xl:block text-xs">
            <div className="text-[10px] uppercase tracking-wider text-[#8B949E]">Watcher on Duty</div>
            <div className="font-medium text-[#E6EDF3] truncate max-w-[155px]">
              {chain.activeWatcher}
            </div>
          </div>
        </div>

        {/* Center: Ranked War Live Scoreboard */}
        <div className="flex items-center gap-4 px-3.5 py-1.5 rounded-md bg-[#12161B] border border-[#222A34] flex-1 max-w-xl min-w-[290px]">
          <Swords className="w-4 h-4 text-[#F85149] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-[#3FB950]">
                  [{factionTag}] { rankedWar.ourScore.toLocaleString() }
                </span>
                <span className="text-[#8B949E]">vs</span>
                <span className="font-semibold text-[#F85149] truncate">
                  {rankedWar.enemyFactionName} {rankedWar.enemyScore.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono-num text-[11px]">
                <span className={lead >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}>
                  {lead >= 0 ? `+${lead.toLocaleString()}` : lead.toLocaleString()} Lead
                </span>
                <span className="text-[#8B949E]">•</span>
                <span className="text-[#8B949E]">Target: {rankedWar.targetScore.toLocaleString()}</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#181E25] rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-[#238636] to-[#3FB950] h-full transition-all duration-300"
                style={{ width: `${ourProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: TCT Clock & API Connection Status */}
        <div className="flex items-center gap-2.5">
          {/* TCT Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#12161B] border border-[#222A34] text-xs font-mono-num text-[#8B949E]">
            <Clock className="w-3.5 h-3.5 text-[#2F81F7]" />
            <span className="text-[#E6EDF3] font-medium">{tctTimeString}</span>
            <span className="text-[10px] text-[#6E7681]">TCT</span>
          </div>

          {/* API Status & Rate Limit Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#12161B] border border-[#222A34]">
            <Radio
              className={`w-3.5 h-3.5 ${
                isLiveMode ? 'text-[#3FB950] animate-pulse' : 'text-[#D29922]'
              }`}
            />
            <div className="text-xs">
              <span className="font-semibold text-[#E6EDF3]">
                {isLiveMode ? 'LIVE API' : 'DEMO'}
              </span>
              <span className="hidden sm:inline text-[#8B949E] ml-1.5 font-mono-num text-[11px]">
                ({requestsPerMin}/100 rpm)
              </span>
            </div>
          </div>

          {isLiveMode && (
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              title="Poll Live Torn API Now"
              className="p-1.5 rounded bg-[#12161B] hover:bg-[#181E25] border border-[#222A34] text-[#E6EDF3] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#2F81F7]' : ''}`} />
            </button>
          )}

          <button
            onClick={onOpenApiModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#2F81F7] hover:bg-[#388BFD] text-white transition-colors cursor-pointer shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isLiveMode ? `${factionName} [${factionId}]` : 'Connect Torn API'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
