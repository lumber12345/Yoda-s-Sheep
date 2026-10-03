import React, { useState } from 'react'
import { KeyRound, ShieldCheck, AlertTriangle, X, Play, RefreshCw, ExternalLink } from 'lucide-react'

interface ApiConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  isLiveMode: boolean
  savedApiKey: string
  savedFactionId: string
  savedEnemyFactionId: string
  pollIntervalSec: number
  lastError: string | null
  isSyncing: boolean
  accessTier: string
  onConnectLive: (apiKey: string, factionId: string, enemyFactionId: string, pollSec: number) => void
  onSwitchToDemo: () => void
}

export const ApiConnectionModal: React.FC<ApiConnectionModalProps> = ({
  isOpen,
  onClose,
  isLiveMode,
  savedApiKey,
  savedFactionId,
  savedEnemyFactionId,
  pollIntervalSec,
  lastError,
  isSyncing,
  accessTier,
  onConnectLive,
  onSwitchToDemo
}) => {
  const [apiKey, setApiKey] = useState(savedApiKey)
  const [factionId, setFactionId] = useState(savedFactionId)
  const [enemyFactionId, setEnemyFactionId] = useState(savedEnemyFactionId)
  const [pollSec, setPollSec] = useState(pollIntervalSec)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConnectLive(apiKey, factionId, enemyFactionId, pollSec)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg bg-[#12161B] border border-[#222A34] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A34] bg-[#181E25]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#2F81F7]/15 text-[#2F81F7] border border-[#2F81F7]/30">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E6EDF3]">
                Torn API Telemetry & Data Source
              </h2>
              <p className="text-xs text-[#8B949E]">
                Connect a live Torn API key or run the interactive Diamond Faction simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#222A34] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {lastError && (
            <div className="p-3 rounded bg-[#F85149]/15 border border-[#F85149]/40 flex items-start gap-2.5 text-xs text-[#F85149]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Torn API Connection Error</div>
                <div className="mt-0.5 text-[#E6EDF3]/90">{lastError}</div>
              </div>
            </div>
          )}

          {/* Mode Status Banner */}
          <div className="p-3 rounded bg-[#0B0E11] border border-[#222A34] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck
                className={`w-4 h-4 ${isLiveMode ? 'text-[#3FB950]' : 'text-[#D29922]'}`}
              />
              <div>
                <span className="text-[#8B949E]">Current Mode: </span>
                <span className="font-semibold text-[#E6EDF3]">
                  {isLiveMode ? `Live Torn API (${accessTier})` : "Demo Mode (Yoda's Sheep [84920])"}
                </span>
              </div>
            </div>
            {isLiveMode && (
              <button
                type="button"
                onClick={onSwitchToDemo}
                className="px-2.5 py-1 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#D29922] border border-[#222A34] transition-colors cursor-pointer"
              >
                Switch to Demo
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                Torn API Key (16 Characters) *
              </label>
              <a
                href="https://www.torn.com/preferences.php#tab=api"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#2F81F7] hover:underline flex items-center gap-1"
              >
                <span>Get API Key on Torn.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your 16-char Torn API Key..."
              className="w-full px-3 py-2 rounded bg-[#0B0E11] border border-[#222A34] focus:border-[#2F81F7] focus:outline-none text-sm font-mono-num text-[#E6EDF3]"
            />
            <p className="mt-1 text-[11px] text-[#8B949E]">
              Works with any <strong>Public</strong>, <strong>Minimal</strong>, or <strong>Full</strong> key. If you have Faction API permissions, Vault & OC data will also sync automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
                Your Faction ID (Optional)
              </label>
              <input
                type="text"
                value={factionId}
                onChange={(e) => setFactionId(e.target.value)}
                placeholder="Blank = Your own faction"
                className="w-full px-3 py-2 rounded bg-[#0B0E11] border border-[#222A34] focus:border-[#2F81F7] focus:outline-none text-sm font-mono-num text-[#E6EDF3]"
              />
              <p className="mt-1 text-[11px] text-[#8B949E]">
                Leave blank for your faction, or enter any Torn Faction ID (e.g. 19, 8989).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
                Enemy Faction ID (Optional)
              </label>
              <input
                type="text"
                value={enemyFactionId}
                onChange={(e) => setEnemyFactionId(e.target.value)}
                placeholder="Auto-detected from Ranked War"
                className="w-full px-3 py-2 rounded bg-[#0B0E11] border border-[#222A34] focus:border-[#2F81F7] focus:outline-none text-sm font-mono-num text-[#E6EDF3]"
              />
              <p className="mt-1 text-[11px] text-[#8B949E]">
                Override to track any enemy faction on the War Target Board.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
              Auto-Refresh Polling Rate (Respects Torn 100 req/min limit)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Manual Only', val: 0 },
                { label: 'Every 15s', val: 15 },
                { label: 'Every 30s', val: 30 },
                { label: 'Every 60s', val: 60 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setPollSec(opt.val)}
                  className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    pollSec === opt.val
                      ? 'bg-[#2F81F7]/20 border-[#2F81F7] text-[#E6EDF3]'
                      : 'bg-[#0B0E11] border-[#222A34] text-[#8B949E] hover:text-[#E6EDF3]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#222A34]">
            <button
              type="button"
              onClick={onSwitchToDemo}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#3FB950]" />
              <span>Use Interactive Demo Faction</span>
            </button>

            <button
              type="submit"
              disabled={isSyncing || !apiKey.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-[#2F81F7] hover:bg-[#388BFD] text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Connecting...' : 'Sync Live Torn API'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
