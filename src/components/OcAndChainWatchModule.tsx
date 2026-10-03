import React, { useState } from 'react'
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Plus,
  Play,
  ExternalLink,
  ShieldCheck,
  UserPlus
} from 'lucide-react'
import {
  OrganizedCrimeTeam,
  FactionMember,
  ChainWatchShift
} from '../types/torn'
import { formatMoney, formatDuration } from '../utils/formatters'

interface OcAndChainWatchModuleProps {
  organizedCrimes: OrganizedCrimeTeam[]
  members: FactionMember[]
  chainWatchSchedule: ChainWatchShift[]
  nowSec: number
  onInitiateOc: (ocId: string) => void
  onClearOcBlocker: (memberId: number) => void
  onCreateNewOc: (crimeName: string, tier: number, participantIds: number[]) => void
  onAssignChainWatcher: (shiftId: string, memberId: number) => void
}

export const OcAndChainWatchModule: React.FC<OcAndChainWatchModuleProps> = ({
  organizedCrimes,
  members,
  chainWatchSchedule,
  nowSec,
  onInitiateOc,
  onClearOcBlocker,
  onCreateNewOc,
  onAssignChainWatcher
}) => {
  const [showNewOcForm, setShowNewOcForm] = useState(false)
  const [newCrimeName, setNewCrimeName] = useState('Cyber-Heist: Cayman Clearing')
  const [newCrimeTier, setNewCrimeTier] = useState(8)
  const [selectedOperatives, setSelectedOperatives] = useState<number[]>([
    members[0]?.id || 1492018,
    members[1]?.id || 1840291,
    members[2]?.id || 2049182,
    members[5]?.id || 2610492
  ])

  const handleToggleOperative = (id: number) => {
    if (selectedOperatives.includes(id)) {
      setSelectedOperatives(selectedOperatives.filter((x) => x !== id))
    } else if (selectedOperatives.length < 5) {
      setSelectedOperatives([...selectedOperatives, id])
    }
  }

  const handleCreateOcSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedOperatives.length < 2) return
    onCreateNewOc(newCrimeName, newCrimeTier, selectedOperatives)
    setShowNewOcForm(false)
  }

  return (
    <div className="space-y-5">
      {/* Section 1: Organized Crimes 2.0 / 1.0 Readiness Board */}
      <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#222A34] bg-[#181E25] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#A371F7]/15 text-[#A371F7] border border-[#A371F7]/30">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
                Organized Crimes (OC 2.0) Readiness & Blocker Telemetry
              </h2>
              <p className="text-xs text-[#8B949E]">
                Cross-checks OC operative status in real time to flag Traveling or Hospitalized blockers before initiation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewOcForm(!showNewOcForm)}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-[#2F81F7] hover:bg-[#388BFD] text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan New OC 2.0 Team</span>
            </button>

            <a
              href="https://www.torn.com/factions.php?step=your#/tab=crimes"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#12161B] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] flex items-center gap-1"
            >
              <span>Torn OC Tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Optional Plan New OC 2.0 Builder */}
        {showNewOcForm && (
          <form
            onSubmit={handleCreateOcSubmit}
            className="p-4 bg-[#181E25]/90 border-b border-[#2F81F7]/40 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
                  OC 2.0 Scenario Name
                </label>
                <select
                  value={newCrimeName}
                  onChange={(e) => setNewCrimeName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
                >
                  <option value="Cyber-Heist: Cayman Clearing">
                    Cyber-Heist: Cayman Clearing (Tier 8)
                  </option>
                  <option value="Vault Heist: Diamond Reserve">
                    Vault Heist: Diamond Reserve (Tier 8)
                  </option>
                  <option value="Armored Convoy Ambush">Armored Convoy Ambush (Tier 7)</option>
                  <option value="Political Assassination">Political Assassination (OC 1.0)</option>
                  <option value="Black Market Data Extraction">
                    Black Market Data Extraction (Tier 6)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
                  Difficulty Tier (1 - 8)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={newCrimeTier}
                  onChange={(e) => setNewCrimeTier(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-[#3FB950] hover:bg-[#2ea043] text-white cursor-pointer"
                >
                  Deploy OC Team ({selectedOperatives.length} Operatives)
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewOcForm(false)}
                  className="px-3 py-1.5 rounded text-xs bg-[#12161B] text-[#8B949E] border border-[#222A34] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1.5">
                Select 2 to 5 Operatives (Sorted by Crime Pass Rate %)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const isSel = selectedOperatives.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleOperative(m.id)}
                      className={`px-2.5 py-1 rounded text-xs font-mono-num border transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-[#2F81F7]/20 border-[#2F81F7] text-[#E6EDF3]'
                          : 'bg-[#0B0E11] border-[#222A34] text-[#8B949E] hover:text-[#E6EDF3]'
                      }`}
                    >
                      {m.name} ({m.crimePassRate}% CPR • {m.naturalNerveBar} NNB)
                    </button>
                  )
                })}
              </div>
            </div>
          </form>
        )}

        {/* OC Cards List */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {organizedCrimes.map((oc) => {
            const isTimeReady = oc.timeLeftSeconds <= 0

            // Enrich participants with live roster status
            const enrichedParticipants = oc.participants.map((p) => {
              const liveMember = members.find((m) => m.id === p.memberId)
              const remHosp = liveMember ? Math.max(0, liveMember.status.until - nowSec) : 0
              const effectiveState =
                liveMember?.status.state === 'Hospital' && remHosp === 0
                  ? 'Okay'
                  : liveMember?.status.state || 'Okay'
              return {
                ...p,
                liveMember,
                effectiveState,
                remHosp
              }
            })

            const blockedOperatives = enrichedParticipants.filter(
              (p) => p.effectiveState !== 'Okay'
            )
            const canInitiateNow = isTimeReady && blockedOperatives.length === 0 && !oc.initiated

            return (
              <div
                key={oc.id}
                className={`rounded-lg border p-4 flex flex-col justify-between transition-all ${
                  oc.initiated
                    ? 'bg-[#0B0E11]/60 border-[#222A34] opacity-75'
                    : canInitiateNow
                    ? 'bg-[#3FB950]/[0.05] border-[#3FB950]/50'
                    : isTimeReady && blockedOperatives.length > 0
                    ? 'bg-[#F85149]/[0.05] border-[#F85149]/60'
                    : 'bg-[#0B0E11] border-[#222A34]'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold bg-[#181E25] text-[#A371F7] border border-[#222A34]">
                          {oc.version} • Tier {oc.difficultyTier}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-semibold bg-[#181E25] text-[#3FB950] border border-[#222A34]">
                          {oc.teamSuccessChance}% CPR
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#E6EDF3] mt-1.5">{oc.crimeName}</h3>
                    </div>

                    {/* Readiness Pill */}
                    {oc.initiated ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40">
                        COMPLETED
                      </span>
                    ) : canInitiateNow ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        READY
                      </span>
                    ) : isTimeReady ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F85149]/20 text-[#F85149] border border-[#F85149]/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        BLOCKED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono-num font-semibold bg-[#181E25] text-[#D29922] border border-[#222A34] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(oc.timeLeftSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Expected Rewards */}
                  <div className="p-2.5 rounded bg-[#12161B] border border-[#222A34] flex items-center justify-between text-xs mb-3">
                    <span className="text-[#8B949E]">Est. Payout & Respect</span>
                    <span className="font-mono-num font-semibold text-[#3FB950]">
                      {formatMoney(oc.expectedRewardMin, true)}–{formatMoney(oc.expectedRewardMax, true)} • +{oc.expectedRespect} R
                    </span>
                  </div>

                  {/* Operatives Breakdown */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">
                      Assigned Operatives ({enrichedParticipants.length})
                    </div>
                    {enrichedParticipants.map((p) => {
                      const isBlocked = p.effectiveState !== 'Okay'
                      return (
                        <div
                          key={p.memberId}
                          className={`px-2.5 py-1.5 rounded border text-xs flex items-center justify-between ${
                            isBlocked
                              ? 'bg-[#F85149]/10 border-[#F85149]/40'
                              : 'bg-[#12161B] border-[#222A34]'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-[#E6EDF3] flex items-center gap-1.5">
                              <span>{p.memberName}</span>
                              <span className="text-[10px] font-mono-num text-[#8B949E]">
                                ({p.role} • {p.cpr}% CPR)
                              </span>
                            </div>
                            {p.itemRequired && (
                              <div className="text-[10px] text-[#8B949E]">
                                Gear: {p.itemRequired} ✓
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            {isBlocked ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono-num font-bold text-[#F85149]">
                                  {p.effectiveState === 'Hospital'
                                    ? `Hosp ${formatDuration(p.remHosp)}`
                                    : p.liveMember?.status.description || p.effectiveState}
                                </span>
                                <button
                                  onClick={() => onClearOcBlocker(p.memberId)}
                                  title="Simulate Med-Out / Return to Torn so OC can launch"
                                  className="px-1.5 py-0.5 rounded bg-[#181E25] hover:bg-[#222A34] text-[10px] text-[#58A6FF] border border-[#222A34] cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-mono-num text-[#3FB950] font-semibold">
                                Okay ✓
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer Action */}
                <div>
                  {oc.initiated ? (
                    <div className="w-full py-2 rounded text-center text-xs font-semibold bg-[#181E25] text-[#3FB950] border border-[#222A34]">
                      Initiated — Spoils Credited to Faction Vault
                    </div>
                  ) : canInitiateNow ? (
                    <button
                      onClick={() => onInitiateOc(oc.id)}
                      className="w-full py-2 rounded text-xs font-bold bg-[#3FB950] hover:bg-[#2ea043] text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Initiate OC Now (+{formatMoney(oc.expectedRewardMax, true)})</span>
                    </button>
                  ) : isTimeReady ? (
                    <div className="w-full py-2 px-3 rounded text-center text-xs font-semibold bg-[#F85149]/15 text-[#F85149] border border-[#F85149]/40">
                      Blocked: Clear {blockedOperatives.length} unavailable operative(s) above
                    </div>
                  ) : (
                    <div className="w-full py-2 rounded text-center text-xs font-mono-num bg-[#181E25] text-[#8B949E] border border-[#222A34]">
                      Planning in progress ({formatDuration(oc.timeLeftSeconds)} remaining)
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 2: Chain Watch Shift Planner (TCT Schedule) */}
      <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#222A34] bg-[#181E25] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
                Chain Watch Shift Roster (Torn City Time / UTC)
              </h3>
              <p className="text-xs text-[#8B949E]">
                Ensure uninterrupted watcher coverage so the active chain never drops
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-num text-[#3FB950]">
            Bonus: $150,000 / watch minute credited in War Payouts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222A34] bg-[#181E25]/60 text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                <th className="py-2.5 px-4">TCT Shift Window</th>
                <th className="py-2.5 px-3">Shift Status</th>
                <th className="py-2.5 px-3">Primary Watcher</th>
                <th className="py-2.5 px-3">Backup Watcher</th>
                <th className="py-2.5 px-3">Chain Saves Logged</th>
                <th className="py-2.5 px-4 text-right">Reassign Watcher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222A34] text-xs">
              {chainWatchSchedule.map((shift) => (
                <tr
                  key={shift.id}
                  className={
                    shift.status === 'Active'
                      ? 'bg-[#3FB950]/[0.06]'
                      : shift.status === 'Unassigned'
                      ? 'bg-[#F85149]/[0.06]'
                      : 'hover:bg-[#181E25]/60'
                  }
                >
                  <td className="py-2.5 px-4 font-mono-num font-bold text-[#E6EDF3]">
                    {shift.slotLabel}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        shift.status === 'Active'
                          ? 'bg-[#3FB950]/20 text-[#3FB950] border-[#3FB950]/40'
                          : shift.status === 'Unassigned'
                          ? 'bg-[#F85149]/20 text-[#F85149] border-[#F85149]/40'
                          : shift.status === 'Completed'
                          ? 'bg-[#181E25] text-[#8B949E] border-[#222A34]'
                          : 'bg-[#2F81F7]/15 text-[#58A6FF] border-[#2F81F7]/40'
                      }`}
                    >
                      {shift.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">
                    {shift.status === 'Unassigned' ? (
                      <span className="text-[#F85149] font-bold">⚠️ UNASSIGNED</span>
                    ) : (
                      <span className="text-[#E6EDF3]">{shift.primaryWatcherName}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[#8B949E]">{shift.backupWatcherName}</td>
                  <td className="py-2.5 px-3 font-mono-num text-[#E6EDF3]">
                    {shift.savesLogged} saves
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-[#8B949E]" />
                      <select
                        value={shift.primaryWatcherId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignChainWatcher(shift.id, Number(e.target.value))
                          }
                        }}
                        className="px-2 py-1 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3] cursor-pointer"
                      >
                        <option value="">Assign Member...</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.lastAction.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
