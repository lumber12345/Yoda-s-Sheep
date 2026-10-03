import React, { useState } from 'react'
import {
  Crosshair,
  Search,
  Filter,
  Clock,
  ExternalLink,
  ShieldAlert,
  Swords,
  UserCheck,
  Copy,
  Check,
  Plus,
  Plane,
  HeartPulse
} from 'lucide-react'
import { EnemyTarget, FactionMember, RankedWarState } from '../types/torn'
import { formatDuration } from '../utils/formatters'

interface WarCommandModuleProps {
  rankedWar: RankedWarState
  enemyTargets: EnemyTarget[]
  friendlyMembers: FactionMember[]
  nowSec: number
  onClaimTarget: (targetId: number) => void
  onUpdateTargetTag: (targetId: number, tag: EnemyTarget['tag']) => void
  onUpdateTargetNote: (targetId: number, note: string) => void
  onSimulateHitEnemy: (targetId: number) => void
  onAddCustomTarget: (name: string, id: number, level: number, bsp: string, ff: number) => void
}

export const WarCommandModule: React.FC<WarCommandModuleProps> = ({
  rankedWar,
  enemyTargets,
  friendlyMembers,
  nowSec,
  onClaimTarget,
  onUpdateTargetTag,
  onUpdateTargetNote,
  onSimulateHitEnemy,
  onAddCustomTarget
}) => {
  const [boardView, setBoardView] = useState<'enemy' | 'friendly'>('enemy')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'okay' | 'popping' | 'hospital' | 'abroad'>('all')
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'Online' | 'Idle' | 'Offline'>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'timer' | 'ff' | 'bsp' | 'level'>('timer')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [copiedCallout, setCopiedCallout] = useState(false)
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [newTargetName, setNewTargetName] = useState('')
  const [newTargetId, setNewTargetId] = useState('')
  const [newTargetLevel, setNewTargetLevel] = useState('85')
  const [newTargetBsp, setNewTargetBsp] = useState('1.8B')
  const [newTargetFf, setNewTargetFf] = useState('2.75')

  // Compute effective enemy states considering live hospital timer expiration
  const enrichedTargets = enemyTargets.map((t) => {
    const remSec = Math.max(0, t.status.until - nowSec)
    const effectiveState =
      t.status.state === 'Hospital' && remSec === 0 ? 'Okay' : t.status.state
    return {
      ...t,
      remSec,
      effectiveState
    }
  })

  const filteredTargets = enrichedTargets
    .filter((t) => {
      if (
        searchQuery &&
        !t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !String(t.id).includes(searchQuery) &&
        !t.notes.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      if (statusFilter === 'okay' && t.effectiveState !== 'Okay') return false
      if (
        statusFilter === 'popping' &&
        !(t.effectiveState === 'Okay' || (t.effectiveState === 'Hospital' && t.remSec <= 300))
      ) {
        return false
      }
      if (statusFilter === 'hospital' && t.effectiveState !== 'Hospital') return false
      if (
        statusFilter === 'abroad' &&
        t.effectiveState !== 'Traveling' &&
        t.effectiveState !== 'Abroad'
      ) {
        return false
      }
      if (onlineFilter !== 'all' && t.lastAction.status !== onlineFilter) return false
      if (tagFilter !== 'all' && t.tag !== tagFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'timer') {
        const scoreA =
          a.effectiveState === 'Okay'
            ? -1
            : a.effectiveState === 'Hospital'
            ? a.remSec
            : 999999
        const scoreB =
          b.effectiveState === 'Okay'
            ? -1
            : b.effectiveState === 'Hospital'
            ? b.remSec
            : 999999
        return scoreA - scoreB
      }
      if (sortBy === 'ff') return b.fairFight - a.fairFight
      if (sortBy === 'bsp') return b.bspNumeric - a.bspNumeric
      return b.level - a.level
    })

  const okayTargetsCount = enrichedTargets.filter((t) => t.effectiveState === 'Okay').length
  const poppingSoonCount = enrichedTargets.filter(
    (t) => t.effectiveState === 'Hospital' && t.remSec > 0 && t.remSec <= 300
  ).length
  const hospTargetsCount = enrichedTargets.filter((t) => t.effectiveState === 'Hospital').length
  const abroadTargetsCount = enrichedTargets.filter(
    (t) => t.effectiveState === 'Traveling' || t.effectiveState === 'Abroad'
  ).length

  const handleCopyWarCallout = () => {
    const openList = enrichedTargets.filter(
      (t) => t.effectiveState === 'Okay' || (t.effectiveState === 'Hospital' && t.remSec <= 180)
    )
    const lines = [
      `⚔️ **RANKED WAR TARGET CALLOUT — vs ${rankedWar.enemyFactionName} [${rankedWar.enemyFactionId}]**`,
      `Score: **${rankedWar.ourScore.toLocaleString()}** vs **${rankedWar.enemyScore.toLocaleString()}** (Target: ${rankedWar.targetScore.toLocaleString()})`,
      '',
      ...openList.map((t) => {
        const stateStr =
          t.effectiveState === 'Okay' ? '🟢 OKAY NOW' : `🕒 POPPING IN ${formatDuration(t.remSec)}`
        return `• **${t.name} [${t.id}]** (Lv.${t.level} | ~${t.bspEstimate} | FF ${t.fairFight.toFixed(2)}x) — ${stateStr} — <https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}>`
      })
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedCallout(true)
    setTimeout(() => setCopiedCallout(false), 2500)
  }

  const handleAddTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTargetName.trim() || !newTargetId.trim()) return
    onAddCustomTarget(
      newTargetName.trim(),
      Number(newTargetId),
      Number(newTargetLevel) || 80,
      newTargetBsp || '1.0B',
      Number(newTargetFf) || 2.5
    )
    setNewTargetName('')
    setNewTargetId('')
    setShowAddTarget(false)
  }

  return (
    <div className="space-y-4">
      {/* Top War Status Summary Banner */}
      <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#F85149]/15 text-[#F85149] border border-[#F85149]/30">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#E6EDF3]">
                Ranked War #{rankedWar.warId}: vs {rankedWar.enemyFactionName} [{rankedWar.enemyFactionId}]
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F85149]/15 text-[#F85149] border border-[#F85149]/40">
                {rankedWar.status.toUpperCase()}
              </span>
              <span className="text-xs text-[#8B949E] font-mono-num">
                Rank: {rankedWar.enemyFactionRank}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-xs font-mono-num">
              <span className="text-[#3FB950] font-semibold">
                {okayTargetsCount} Attackable (Okay)
              </span>
              <span className="text-[#D29922] font-semibold">
                {poppingSoonCount} Popping &lt; 5m
              </span>
              <span className="text-[#F85149]">{hospTargetsCount} In Hospital</span>
              <span className="text-[#388BFD]">{abroadTargetsCount} Traveling / Abroad</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Board Switcher */}
          <div className="inline-flex rounded bg-[#0B0E11] p-1 border border-[#222A34]">
            <button
              onClick={() => setBoardView('enemy')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                boardView === 'enemy'
                  ? 'bg-[#F85149] text-white'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              Enemy Targets ({enemyTargets.length})
            </button>
            <button
              onClick={() => setBoardView('friendly')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                boardView === 'friendly'
                  ? 'bg-[#2F81F7] text-white'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              Friendly Roster & Bleeders ({friendlyMembers.length})
            </button>
          </div>

          <button
            onClick={() => setShowAddTarget(!showAddTarget)}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#2F81F7]" />
            <span>Add Spy / Target</span>
          </button>

          <button
            onClick={handleCopyWarCallout}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-[#2F81F7]/15 hover:bg-[#2F81F7]/25 text-[#58A6FF] border border-[#2F81F7]/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedCallout ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>Callout Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Discord War Callout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Custom Target / Spy Drawer */}
      {showAddTarget && (
        <form
          onSubmit={handleAddTargetSubmit}
          className="p-4 rounded-lg bg-[#181E25] border border-[#2F81F7]/50 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
        >
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
              Target Name
            </label>
            <input
              type="text"
              required
              value={newTargetName}
              onChange={(e) => setNewTargetName(e.target.value)}
              placeholder="e.g. NightStalker"
              className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
              Torn ID (XID)
            </label>
            <input
              type="number"
              required
              value={newTargetId}
              onChange={(e) => setNewTargetId(e.target.value)}
              placeholder="e.g. 2491022"
              className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
              Level
            </label>
            <input
              type="number"
              value={newTargetLevel}
              onChange={(e) => setNewTargetLevel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
              Spy / BSP Estimate
            </label>
            <input
              type="text"
              value={newTargetBsp}
              onChange={(e) => setNewTargetBsp(e.target.value)}
              placeholder="e.g. 2.4B"
              className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
              Fair Fight (1.0 - 3.0)
            </label>
            <input
              type="number"
              step="0.05"
              min="1"
              max="3"
              value={newTargetFf}
              onChange={(e) => setNewTargetFf(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-[#2F81F7] hover:bg-[#388BFD] text-white cursor-pointer"
            >
              Add to Board
            </button>
            <button
              type="button"
              onClick={() => setShowAddTarget(false)}
              className="py-1.5 px-2.5 rounded text-xs bg-[#12161B] text-[#8B949E] border border-[#222A34] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {boardView === 'enemy' ? (
        <>
          {/* Filter & Search Toolbar */}
          <div className="p-3 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search target name, ID, spy notes..."
                  className="pl-8 pr-3 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] focus:border-[#2F81F7] focus:outline-none text-xs text-[#E6EDF3] w-56"
                />
              </div>

              {/* Status Quick Filters */}
              <div className="flex items-center gap-1 bg-[#0B0E11] p-1 rounded border border-[#222A34]">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'okay', label: `Okay (${okayTargetsCount})` },
                  { id: 'popping', label: `Popping <5m (${okayTargetsCount + poppingSoonCount})` },
                  { id: 'hospital', label: `Hospital (${hospTargetsCount})` },
                  { id: 'abroad', label: `Abroad (${abroadTargetsCount})` }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id as any)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-[#181E25] text-[#E6EDF3] border border-[#2F81F7]/50'
                        : 'text-[#8B949E] hover:text-[#E6EDF3]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#8B949E]" />
                <select
                  value={onlineFilter}
                  onChange={(e) => setOnlineFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
                >
                  <option value="all">Any Activity</option>
                  <option value="Online">Online Only</option>
                  <option value="Idle">Idle Only</option>
                  <option value="Offline">Offline Only</option>
                </select>
              </div>

              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
              >
                <option value="all">All Tactical Tags</option>
                <option value="Priority">Priority</option>
                <option value="Retal Target">Retal Target</option>
                <option value="Farm / FF 3.0">Farm / FF 3.0</option>
                <option value="Chain Filler">Chain Filler</option>
                <option value="Avoid / Tank">Avoid / Tank</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
              >
                <option value="timer">Sort: Attackable / Hospital Pop</option>
                <option value="ff">Sort: Highest Fair Fight</option>
                <option value="bsp">Sort: Battle Stats (BSP)</option>
                <option value="level">Sort: Level</option>
              </select>
            </div>
          </div>

          {/* Enemy Target Command Table */}
          <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222A34] bg-[#181E25] text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                    <th className="py-2.5 px-3.5">Enemy Target</th>
                    <th className="py-2.5 px-3">Lv</th>
                    <th className="py-2.5 px-3">Status & Pop Timer</th>
                    <th className="py-2.5 px-3">Spy BSP & Build</th>
                    <th className="py-2.5 px-3">FF Mult</th>
                    <th className="py-2.5 px-3">Tactical Tag</th>
                    <th className="py-2.5 px-3">Caller Notes & Dibs</th>
                    <th className="py-2.5 px-3.5 text-right">Combat Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222A34] text-xs">
                  {filteredTargets.map((t) => {
                    const isOkay = t.effectiveState === 'Okay'
                    const isPoppingVerySoon = t.effectiveState === 'Hospital' && t.remSec <= 120

                    return (
                      <tr
                        key={t.id}
                        className={`transition-colors ${
                          isOkay
                            ? 'bg-[#3FB950]/[0.04] hover:bg-[#3FB950]/[0.08]'
                            : isPoppingVerySoon
                            ? 'bg-[#D29922]/[0.04] hover:bg-[#D29922]/[0.08]'
                            : 'hover:bg-[#181E25]/60'
                        }`}
                      >
                        {/* Name & Online Dot */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              title={`Last Action: ${t.lastAction.status} (${t.lastAction.relative})`}
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                t.lastAction.status === 'Online'
                                  ? 'bg-[#3FB950] shadow-[0_0_6px_#3FB950]'
                                  : t.lastAction.status === 'Idle'
                                  ? 'bg-[#D29922]'
                                  : 'bg-[#6E7681]'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`https://www.torn.com/profiles.php?XID=${t.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-[#E6EDF3] hover:text-[#58A6FF] hover:underline"
                                >
                                  {t.name}
                                </a>
                                <span className="font-mono-num text-[11px] text-[#8B949E]">
                                  [{t.id}]
                                </span>
                              </div>
                              <div className="text-[11px] text-[#8B949E]">
                                {t.position} • {t.lastAction.relative}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Level */}
                        <td className="py-2.5 px-3 font-mono-num font-semibold text-[#E6EDF3]">
                          {t.level}
                        </td>

                        {/* Status & Countdown */}
                        <td className="py-2.5 px-3">
                          {isOkay ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-num font-bold bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-ping" />
                              OKAY (IN TORN)
                            </span>
                          ) : t.effectiveState === 'Hospital' ? (
                            <div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono-num font-bold border ${
                                  t.remSec <= 120
                                    ? 'bg-[#D29922]/20 text-[#D29922] border-[#D29922]/50'
                                    : 'bg-[#F85149]/15 text-[#F85149] border-[#F85149]/40'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                HOSP {formatDuration(t.remSec)}
                              </span>
                              <div className="text-[10px] text-[#8B949E] mt-0.5 truncate max-w-[160px]">
                                {t.status.details}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono-num font-medium bg-[#388BFD]/15 text-[#388BFD] border border-[#388BFD]/40">
                              <Plane className="w-3 h-3" />
                              {t.status.description}
                            </span>
                          )}
                        </td>

                        {/* Spy BSP & Build */}
                        <td className="py-2.5 px-3">
                          <div className="font-mono-num font-bold text-[#E6EDF3]">
                            ~{t.bspEstimate}
                          </div>
                          <div className="text-[11px] text-[#8B949E]">{t.buildArchetype}</div>
                        </td>

                        {/* Fair Fight Multiplier */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono-num font-semibold border ${
                              t.fairFight >= 2.75
                                ? 'bg-[#3FB950]/15 text-[#3FB950] border-[#3FB950]/40'
                                : t.fairFight >= 2.2
                                ? 'bg-[#2F81F7]/15 text-[#58A6FF] border-[#2F81F7]/40'
                                : 'bg-[#181E25] text-[#8B949E] border-[#222A34]'
                            }`}
                          >
                            {t.fairFight.toFixed(2)}x
                          </span>
                        </td>

                        {/* Tactical Tag Selector */}
                        <td className="py-2.5 px-3">
                          <select
                            value={t.tag}
                            onChange={(e) =>
                              onUpdateTargetTag(t.id, e.target.value as EnemyTarget['tag'])
                            }
                            className={`px-2 py-1 rounded text-[11px] font-semibold border bg-[#0B0E11] cursor-pointer ${
                              t.tag === 'Priority' || t.tag === 'Retal Target'
                                ? 'text-[#F85149] border-[#F85149]/40'
                                : t.tag === 'Farm / FF 3.0'
                                ? 'text-[#3FB950] border-[#3FB950]/40'
                                : t.tag === 'Avoid / Tank'
                                ? 'text-[#D29922] border-[#D29922]/40'
                                : 'text-[#8B949E] border-[#222A34]'
                            }`}
                          >
                            <option value="Priority">Priority</option>
                            <option value="Retal Target">Retal Target</option>
                            <option value="Farm / FF 3.0">Farm / FF 3.0</option>
                            <option value="Chain Filler">Chain Filler</option>
                            <option value="Avoid / Tank">Avoid / Tank</option>
                            <option value="None">Untagged</option>
                          </select>
                        </td>

                        {/* Caller Notes & Claimed By */}
                        <td className="py-2.5 px-3 max-w-[240px]">
                          {t.claimedBy && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#D29922]/15 text-[#D29922] border border-[#D29922]/30 text-[10px] font-semibold mb-1">
                              <UserCheck className="w-3 h-3" />
                              <span>Dibs: {t.claimedBy}</span>
                            </div>
                          )}

                          {editingNoteId === t.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                className="px-2 py-1 rounded bg-[#0B0E11] border border-[#2F81F7] text-xs text-[#E6EDF3] w-full"
                              />
                              <button
                                onClick={() => {
                                  onUpdateTargetNote(t.id, noteDraft)
                                  setEditingNoteId(null)
                                }}
                                className="px-2 py-1 rounded bg-[#2F81F7] text-white text-[11px] cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingNoteId(t.id)
                                setNoteDraft(t.notes)
                              }}
                              title="Click to edit spy/caller notes"
                              className="text-xs text-[#8B949E] hover:text-[#E6EDF3] cursor-pointer truncate"
                            >
                              {t.notes || '+ Add spy note...'}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onClaimTarget(t.id)}
                              className={`px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                t.claimedBy === 'You (Leader)'
                                  ? 'bg-[#D29922]/20 border-[#D29922] text-[#D29922]'
                                  : 'bg-[#181E25] hover:bg-[#222A34] border-[#222A34] text-[#E6EDF3]'
                              }`}
                            >
                              {t.claimedBy === 'You (Leader)' ? 'Unclaim' : 'Dibs'}
                            </button>

                            <button
                              onClick={() => onSimulateHitEnemy(t.id)}
                              title="Simulate Hospitalizing this Target (+War Score & +Chain Hit)"
                              className="px-2 py-1 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#3FB950] border border-[#3FB950]/40 transition-colors cursor-pointer"
                            >
                              +Hosp Hit
                            </button>

                            <a
                              href={`https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-[#F85149] hover:bg-[#da3633] text-white inline-flex items-center gap-1 transition-colors"
                            >
                              <Crosshair className="w-3 h-3" />
                              <span>Attack</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Friendly Roster & War Bleeder Watch */
        <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222A34] bg-[#181E25] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D29922]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
                Friendly Roster Exposure & Turtle Status
              </h3>
            </div>
            <span className="text-xs text-[#8B949E]">
              Members marked <strong className="text-[#F85149]">EXPOSED BLEEDER</strong> are Offline + Okay in Torn and can be farmed by the enemy!
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222A34] bg-[#181E25]/60 text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                  <th className="py-2.5 px-3.5">Member</th>
                  <th className="py-2.5 px-3">Activity</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3">Turtle / Exposure Assessment</th>
                  <th className="py-2.5 px-3">Revive Setting</th>
                  <th className="py-2.5 px-3">War Hits</th>
                  <th className="py-2.5 px-3.5 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222A34] text-xs">
                {friendlyMembers.map((m) => {
                  const remSec = Math.max(0, m.status.until - nowSec)
                  const isOkay =
                    m.status.state === 'Okay' || (m.status.state === 'Hospital' && remSec === 0)
                  const isExposedBleeder = m.lastAction.status === 'Offline' && isOkay

                  return (
                    <tr
                      key={m.id}
                      className={
                        isExposedBleeder
                          ? 'bg-[#F85149]/10 hover:bg-[#F85149]/15'
                          : 'hover:bg-[#181E25]/60'
                      }
                    >
                      <td className="py-2.5 px-3.5 font-semibold text-[#E6EDF3]">
                        {m.name}{' '}
                        <span className="font-mono-num text-[#8B949E] font-normal">[{m.id}]</span>
                        <div className="text-[11px] text-[#8B949E] font-normal">
                          Lv.{m.level} • {m.position}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            m.lastAction.status === 'Online'
                              ? 'text-[#3FB950]'
                              : m.lastAction.status === 'Idle'
                              ? 'text-[#D29922]'
                              : 'text-[#8B949E]'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              m.lastAction.status === 'Online'
                                ? 'bg-[#3FB950]'
                                : m.lastAction.status === 'Idle'
                                ? 'bg-[#D29922]'
                                : 'bg-[#6E7681]'
                            }`}
                          />
                          {m.lastAction.status} ({m.lastAction.relative})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono-num">
                        {isOkay ? (
                          <span className="text-[#3FB950] font-semibold">Okay (In Torn)</span>
                        ) : m.status.state === 'Hospital' ? (
                          <span className="text-[#F85149] flex items-center gap-1">
                            <HeartPulse className="w-3.5 h-3.5" />
                            Hosp ({formatDuration(remSec)})
                          </span>
                        ) : (
                          <span className="text-[#388BFD]">{m.status.description}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isExposedBleeder ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F85149]/20 text-[#F85149] border border-[#F85149]/50">
                            EXPOSED BLEEDER — BOUNTY / HOSP NOW
                          </span>
                        ) : isOkay ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30">
                            Active & Ready to Hit
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#181E25] text-[#8B949E] border border-[#222A34]">
                            Safely Turtled ({m.status.state})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.revivable ? (
                          <span className="text-[#F85149] font-semibold">
                            REVIVES ON (Unsafe!)
                          </span>
                        ) : (
                          <span className="text-[#3FB950]">Revives Disabled</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num font-semibold text-[#E6EDF3]">
                        {m.warHits} hits (+{m.respectEarned.toFixed(1)} R)
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <a
                          href={`https://www.torn.com/profiles.php?XID=${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#58A6FF] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Torn Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
