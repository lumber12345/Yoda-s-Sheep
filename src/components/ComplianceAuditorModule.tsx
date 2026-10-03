import React, { useState } from 'react'
import {
  ClipboardCheck,
  Search,
  Sliders,
  Download,
  Copy,
  Check,
  AlertOctagon,
  ExternalLink,
  FileEdit,
  X,
  ShieldAlert
} from 'lucide-react'
import { FactionMember, CompliancePolicy } from '../types/torn'
import {
  evaluateMemberCompliance,
  formatMoney
} from '../utils/formatters'

interface ComplianceAuditorModuleProps {
  members: FactionMember[]
  policy: CompliancePolicy
  nowSec: number
  onUpdatePolicy: (newPolicy: CompliancePolicy) => void
  onUpdateMember: (memberId: number, updates: Partial<FactionMember>) => void
}

export const ComplianceAuditorModule: React.FC<ComplianceAuditorModuleProps> = ({
  members,
  policy,
  nowSec,
  onUpdatePolicy,
  onUpdateMember
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [complianceFilter, setComplianceFilter] = useState<
    'all' | 'Non-Compliant' | 'Warning' | 'Compliant'
  >('all')
  const [sortBy, setSortBy] = useState<
    'score_asc' | 'score_desc' | 'xanax_asc' | 'xanax_desc' | 'inactive_desc' | 'bsp_desc'
  >('score_asc')
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [copiedMemberDm, setCopiedMemberDm] = useState(false)

  const evaluatedMembers = members.map((m) => ({
    member: m,
    eval: evaluateMemberCompliance(m, policy, nowSec)
  }))

  const counts = {
    all: evaluatedMembers.length,
    compliant: evaluatedMembers.filter((x) => x.eval.status === 'Compliant').length,
    warning: evaluatedMembers.filter((x) => x.eval.status === 'Warning').length,
    nonCompliant: evaluatedMembers.filter((x) => x.eval.status === 'Non-Compliant').length
  }

  const filtered = evaluatedMembers
    .filter(({ member, eval: ev }) => {
      if (
        searchQuery &&
        !member.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !String(member.id).includes(searchQuery) &&
        !member.position.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      if (complianceFilter !== 'all' && ev.status !== complianceFilter) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score_asc') return a.eval.score - b.eval.score
      if (sortBy === 'score_desc') return b.eval.score - a.eval.score
      if (sortBy === 'xanax_asc') return a.member.xanax7d - b.member.xanax7d
      if (sortBy === 'xanax_desc') return b.member.xanax7d - a.member.xanax7d
      if (sortBy === 'inactive_desc') return b.eval.inactiveHours - a.eval.inactiveHours
      return b.member.battleStatNumeric - a.member.battleStatNumeric
    })

  const selectedRecord = evaluatedMembers.find((x) => x.member.id === selectedMemberId) || null

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Name',
      'Position',
      'Level',
      'LastActionStatus',
      'LastActionRelative',
      'Status',
      'Xanax7d',
      'XanaxPerDay',
      'EnergyRefills7d',
      'Overdoses7d',
      'WarHits',
      'RespectEarned',
      'BSP_Estimate',
      'ComplianceScore',
      'ComplianceStatus',
      'Strikes',
      'LeadershipNote'
    ]
    const rows = evaluatedMembers.map(({ member: m, eval: ev }) => [
      m.id,
      `"${m.name}"`,
      `"${m.position}"`,
      m.level,
      m.lastAction.status,
      `"${m.lastAction.relative}"`,
      m.status.state,
      m.xanax7d,
      ev.xanaxPerDay,
      m.energyRefills7d,
      m.overdoses7d,
      m.warHits,
      m.respectEarned,
      `"${m.battleStatEstimate}"`,
      ev.score,
      ev.status,
      m.strikes,
      `"${(m.leadershipNote || '').replace(/"/g, '""')}"`
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `torn_faction_compliance_audit_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyAuditReport = () => {
    const slackers = evaluatedMembers.filter((x) => x.eval.status !== 'Compliant')
    const lines = [
      `📋 **FACTION COMPLIANCE AUDIT REPORT**`,
      `Policy: Min **${policy.minXanaxPerDay} Xanax/day** (${Math.round(policy.minXanaxPerDay * 7)}/7d) | Min **${policy.minRefillsPerWeek} Refills/wk** | Max **${policy.maxInactiveHours}h Inactive**`,
      `Summary: 🟢 ${counts.compliant} Compliant | 🟡 ${counts.warning} Warning | 🔴 ${counts.nonCompliant} Non-Compliant`,
      '',
      ...slackers.map(
        ({ member: m, eval: ev }) =>
          `• **${m.name} [${m.id}]** (${ev.status.toUpperCase()} - Score ${ev.score}%): ${m.xanax7d} Xan/7d (${ev.xanaxPerDay}/d), ${m.energyRefills7d} Refills, Last Action: ${m.lastAction.relative} ${
            ev.reasons.length ? `[Issues: ${ev.reasons.join(', ')}]` : ''
          }`
      )
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2500)
  }

  const handleCopyMemberWarningMail = (m: FactionMember, ev: any) => {
    const text = `Hey ${m.name},\n\nThis is a routine leadership check-in regarding faction compliance requirements:\n- Your 7-Day Xanax intake: ${m.xanax7d} (${ev.xanaxPerDay}/day vs Faction minimum ${policy.minXanaxPerDay}/day)\n- Your 7-Day Energy Refills: ${m.energyRefills7d} (Minimum ${policy.minRefillsPerWeek}/week)\n- Last Action: ${m.lastAction.relative}\n${
      ev.reasons.length ? `\nFlagged items: ${ev.reasons.join(', ')}` : ''
    }\n\nPlease let leadership know if you have IRL circumstances or need Xanax/refill assistance from the Faction Armory.\n\n— Faction Leadership`
    navigator.clipboard.writeText(text)
    setCopiedMemberDm(true)
    setTimeout(() => setCopiedMemberDm(false), 2500)
  }

  return (
    <div className="space-y-4">
      {/* Top Interactive Policy Configuration Panel */}
      <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-[#222A34]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#2F81F7]/15 text-[#2F81F7] border border-[#2F81F7]/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E6EDF3]">
                Member Compliance, Xanax & Refill Auditor
              </h2>
              <p className="text-xs text-[#8B949E]">
                Adjust faction policy thresholds below to dynamically re-score all {members.length} roster members
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyAuditReport}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#3FB950]" />
                  <span>Report Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#58A6FF]" />
                  <span>Copy Slacker Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-[#2F81F7] hover:bg-[#388BFD] text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        {/* Policy Threshold Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5">
          <div className="p-3 rounded bg-[#0B0E11] border border-[#222A34]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#8B949E] uppercase">Min Xanax / Day</span>
              <span className="font-mono-num font-bold text-[#58A6FF]">
                {policy.minXanaxPerDay.toFixed(1)} / day ({Math.round(policy.minXanaxPerDay * 7)} / wk)
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.25"
              value={policy.minXanaxPerDay}
              onChange={(e) =>
                onUpdatePolicy({ ...policy, minXanaxPerDay: parseFloat(e.target.value) })
              }
              className="w-full accent-[#2F81F7] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono-num text-[#6E7681] mt-1">
              <span>0.5/d (Casual)</span>
              <span>2.0/d (Standard)</span>
              <span>3.0/d (Hardcore War)</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0B0E11] border border-[#222A34]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#8B949E] uppercase">Min Energy Refills / 7d</span>
              <span className="font-mono-num font-bold text-[#3FB950]">
                {policy.minRefillsPerWeek} / 7 days
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="7"
              step="1"
              value={policy.minRefillsPerWeek}
              onChange={(e) =>
                onUpdatePolicy({ ...policy, minRefillsPerWeek: parseInt(e.target.value, 10) })
              }
              className="w-full accent-[#3FB950] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono-num text-[#6E7681] mt-1">
              <span>0 Refills</span>
              <span>4 Refills</span>
              <span>7 Refills (Daily)</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0B0E11] border border-[#222A34]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#8B949E] uppercase">Max Inactivity Window</span>
              <span className="font-mono-num font-bold text-[#D29922]">
                {policy.maxInactiveHours} hours
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="72"
              step="6"
              value={policy.maxInactiveHours}
              onChange={(e) =>
                onUpdatePolicy({ ...policy, maxInactiveHours: parseInt(e.target.value, 10) })
              }
              className="w-full accent-[#D29922] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono-num text-[#6E7681] mt-1">
              <span>6h (War Push)</span>
              <span>24h (Daily)</span>
              <span>72h (Relaxed)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member name, ID, role..."
              className="pl-8 pr-3 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3] w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#0B0E11] p-1 rounded border border-[#222A34]">
            {[
              { id: 'all', label: `All (${counts.all})` },
              {
                id: 'Non-Compliant',
                label: `Non-Compliant (${counts.nonCompliant})`,
                color: 'text-[#F85149]'
              },
              { id: 'Warning', label: `Warning (${counts.warning})`, color: 'text-[#D29922]' },
              {
                id: 'Compliant',
                label: `Compliant (${counts.compliant})`,
                color: 'text-[#3FB950]'
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setComplianceFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  complianceFilter === tab.id
                    ? 'bg-[#181E25] text-[#E6EDF3] border border-[#2F81F7]/50'
                    : `${tab.color || 'text-[#8B949E]'} hover:text-[#E6EDF3]`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
        >
          <option value="score_asc">Sort: Lowest Compliance First (Slackers)</option>
          <option value="score_desc">Sort: Highest Compliance First</option>
          <option value="xanax_asc">Sort: Lowest Xanax (7d)</option>
          <option value="xanax_desc">Sort: Highest Xanax (7d)</option>
          <option value="inactive_desc">Sort: Longest Inactive</option>
          <option value="bsp_desc">Sort: Highest Battle Stats</option>
        </select>
      </div>

      {/* Member Audit Table */}
      <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222A34] bg-[#181E25] text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                <th className="py-2.5 px-3.5">Member & Role</th>
                <th className="py-2.5 px-3">Last Action</th>
                <th className="py-2.5 px-3">7d Xanax (Avg/d)</th>
                <th className="py-2.5 px-3">7d E-Refills</th>
                <th className="py-2.5 px-3">Est. BSP & NNB</th>
                <th className="py-2.5 px-3">War Hits</th>
                <th className="py-2.5 px-3">Compliance Score</th>
                <th className="py-2.5 px-3">Audit Flags & Notes</th>
                <th className="py-2.5 px-3.5 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222A34] text-xs">
              {filtered.map(({ member: m, eval: ev }) => (
                <tr
                  key={m.id}
                  className={`transition-colors ${
                    ev.status === 'Non-Compliant'
                      ? 'bg-[#F85149]/[0.05] hover:bg-[#F85149]/[0.1]'
                      : 'hover:bg-[#181E25]/60'
                  }`}
                >
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          m.lastAction.status === 'Online'
                            ? 'bg-[#3FB950]'
                            : m.lastAction.status === 'Idle'
                            ? 'bg-[#D29922]'
                            : 'bg-[#6E7681]'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#E6EDF3]">{m.name}</span>
                          <span className="font-mono-num text-[11px] text-[#8B949E]">[{m.id}]</span>
                          {m.strikes > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-[#F85149]/20 text-[#F85149] border border-[#F85149]/40 text-[10px] font-bold">
                              {m.strikes} Strike{m.strikes > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8B949E]">
                          Lv.{m.level} • {m.position} • {m.daysInFaction}d in fac
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="font-medium text-[#E6EDF3]">{m.lastAction.relative}</div>
                    <div className="text-[11px] text-[#8B949E]">{m.status.description}</div>
                  </td>

                  {/* 7d Xanax */}
                  <td className="py-2.5 px-3 font-mono-num">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-bold ${
                          ev.xanaxPerDay >= policy.minXanaxPerDay
                            ? 'text-[#3FB950]'
                            : ev.xanaxPerDay >= policy.minXanaxPerDay * 0.7
                            ? 'text-[#D29922]'
                            : 'text-[#F85149]'
                        }`}
                      >
                        {m.xanax7d} Xan
                      </span>
                      <span className="text-[11px] text-[#8B949E]">({ev.xanaxPerDay}/d)</span>
                    </div>
                    {m.overdoses7d > 0 && (
                      <div className="text-[10px] text-[#D29922]">
                        {m.overdoses7d} OD this week
                      </div>
                    )}
                  </td>

                  {/* Energy Refills */}
                  <td className="py-2.5 px-3 font-mono-num">
                    <span
                      className={`font-semibold ${
                        m.energyRefills7d >= policy.minRefillsPerWeek
                          ? 'text-[#3FB950]'
                          : 'text-[#D29922]'
                      }`}
                    >
                      {m.energyRefills7d} / 7
                    </span>
                    <div className="text-[10px] text-[#8B949E]">
                      Nerve: {m.nerveRefills7d}/7
                    </div>
                  </td>

                  {/* BSP & NNB */}
                  <td className="py-2.5 px-3 font-mono-num">
                    <div className="font-semibold text-[#E6EDF3]">~{m.battleStatEstimate}</div>
                    <div className="text-[10px] text-[#8B949E]">
                      {m.naturalNerveBar} NNB • {m.crimePassRate}% CPR
                    </div>
                  </td>

                  {/* War Hits */}
                  <td className="py-2.5 px-3 font-mono-num">
                    <div className="font-semibold text-[#E6EDF3]">{m.warHits} war</div>
                    <div className="text-[10px] text-[#8B949E]">
                      +{m.outsideChainHits} chain
                    </div>
                  </td>

                  {/* Compliance Badge */}
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono-num text-xs font-bold border ${
                        ev.status === 'Compliant'
                          ? 'bg-[#3FB950]/15 text-[#3FB950] border-[#3FB950]/40'
                          : ev.status === 'Warning'
                          ? 'bg-[#D29922]/15 text-[#D29922] border-[#D29922]/40'
                          : 'bg-[#F85149]/15 text-[#F85149] border-[#F85149]/40'
                      }`}
                    >
                      {ev.score}% • {ev.status}
                    </span>
                  </td>

                  {/* Reasons / Notes */}
                  <td className="py-2.5 px-3 max-w-[240px]">
                    {ev.reasons.length > 0 ? (
                      <div className="text-[11px] text-[#F85149] font-medium truncate">
                        {ev.reasons.join(' • ')}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#3FB950]">Meets all policy targets</div>
                    )}
                    {m.leadershipNote && (
                      <div className="text-[11px] text-[#8B949E] truncate mt-0.5">
                        Note: {m.leadershipNote}
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3.5 text-right">
                    <button
                      onClick={() => setSelectedMemberId(m.id)}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#58A6FF] border border-[#222A34] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Dossier</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Leadership Dossier Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-lg bg-[#12161B] border border-[#222A34] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#222A34] bg-[#181E25] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#E6EDF3]">
                    {selectedRecord.member.name} [{selectedRecord.member.id}]
                  </h3>
                  <span className="px-2 py-0.5 rounded text-xs font-mono-num bg-[#0B0E11] text-[#58A6FF] border border-[#222A34]">
                    Lv.{selectedRecord.member.level} • {selectedRecord.member.position}
                  </span>
                </div>
                <p className="text-xs text-[#8B949E] mt-0.5">
                  Compliance Score: {selectedRecord.eval.score}% ({selectedRecord.eval.status}) • Est. Networth: {formatMoney(selectedRecord.member.networthEstimate, true)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMemberId(null)}
                className="p-1.5 rounded text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#222A34] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Quick Telemetry Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded bg-[#0B0E11] border border-[#222A34]">
                  <div className="text-[11px] text-[#8B949E] uppercase">7-Day Xanax</div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={selectedRecord.member.xanax7d}
                      onChange={(e) =>
                        onUpdateMember(selectedRecord.member.id, {
                          xanax7d: Number(e.target.value)
                        })
                      }
                      className="w-16 px-2 py-1 rounded bg-[#12161B] border border-[#222A34] text-sm font-mono-num font-bold text-[#E6EDF3]"
                    />
                    <span className="text-xs font-mono-num text-[#8B949E]">
                      ({selectedRecord.eval.xanaxPerDay}/d)
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0B0E11] border border-[#222A34]">
                  <div className="text-[11px] text-[#8B949E] uppercase">7-Day E-Refills</div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={selectedRecord.member.energyRefills7d}
                      onChange={(e) =>
                        onUpdateMember(selectedRecord.member.id, {
                          energyRefills7d: Number(e.target.value)
                        })
                      }
                      className="w-16 px-2 py-1 rounded bg-[#12161B] border border-[#222A34] text-sm font-mono-num font-bold text-[#E6EDF3]"
                    />
                    <span className="text-xs font-mono-num text-[#8B949E]">/ 7 days</span>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0B0E11] border border-[#222A34]">
                  <div className="text-[11px] text-[#8B949E] uppercase">Disciplinary Strikes</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {[0, 1, 2, 3].map((st) => (
                      <button
                        key={st}
                        onClick={() =>
                          onUpdateMember(selectedRecord.member.id, { strikes: st })
                        }
                        className={`px-2.5 py-1 rounded text-xs font-mono-num font-bold border cursor-pointer ${
                          selectedRecord.member.strikes === st
                            ? st === 0
                              ? 'bg-[#3FB950]/20 border-[#3FB950] text-[#3FB950]'
                              : 'bg-[#F85149]/20 border-[#F85149] text-[#F85149]'
                            : 'bg-[#12161B] border-[#222A34] text-[#8B949E]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leadership Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
                  Leadership Dossier Note
                </label>
                <textarea
                  rows={3}
                  value={selectedRecord.member.leadershipNote}
                  onChange={(e) =>
                    onUpdateMember(selectedRecord.member.id, {
                      leadershipNote: e.target.value
                    })
                  }
                  placeholder="Record war excuses, loaned RW weapons, or compliance warnings..."
                  className="w-full px-3 py-2 rounded bg-[#0B0E11] border border-[#222A34] focus:border-[#2F81F7] focus:outline-none text-xs text-[#E6EDF3]"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#222A34]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCopyMemberWarningMail(selectedRecord.member, selectedRecord.eval)
                    }
                    className="px-3 py-1.5 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedMemberDm ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#3FB950]" />
                        <span>Torn Mail Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#D29922]" />
                        <span>Copy Compliance Notice</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://www.torn.com/messages.php#/p=compose&XID=${selectedRecord.member.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#58A6FF] border border-[#222A34] inline-flex items-center gap-1"
                  >
                    <span>Message in Torn</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <button
                  onClick={() => setSelectedMemberId(null)}
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-[#2F81F7] hover:bg-[#388BFD] text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
