import React from 'react'
import {
  Shield,
  Users,
  Pill,
  Landmark,
  AlertTriangle,
  Crosshair,
  Clock,
  ExternalLink,
  CheckCircle2,
  ArrowUpRight,
  Flame,
  Briefcase,
  PackageCheck
} from 'lucide-react'
import { FactionOverviewData, CompliancePolicy } from '../types/torn'
import {
  formatMoney,
  formatDuration,
  evaluateMemberCompliance
} from '../utils/formatters'

interface OverviewModuleProps {
  data: FactionOverviewData
  policy: CompliancePolicy
  nowSec: number
  onNavigate: (tab: string) => void
  onClaimTarget: (targetId: number) => void
}

export const OverviewModule: React.FC<OverviewModuleProps> = ({
  data,
  policy,
  nowSec,
  onNavigate,
  onClaimTarget
}) => {
  // Roster breakdown
  const onlineCount = data.members.filter((m) => m.lastAction.status === 'Online').length
  const idleCount = data.members.filter((m) => m.lastAction.status === 'Idle').length
  const offlineCount = data.members.filter((m) => m.lastAction.status === 'Offline').length

  const okayCount = data.members.filter((m) => m.status.state === 'Okay').length
  const hospCount = data.members.filter((m) => m.status.state === 'Hospital').length
  const travelCount = data.members.filter(
    (m) => m.status.state === 'Traveling' || m.status.state === 'Abroad'
  ).length

  // Compliance metrics
  const evaluations = data.members.map((m) => ({
    member: m,
    eval: evaluateMemberCompliance(m, policy, nowSec)
  }))
  const compliantCount = evaluations.filter((e) => e.eval.status === 'Compliant').length
  const nonCompliantList = evaluations.filter((e) => e.eval.status === 'Non-Compliant')
  const avgXanaxPerDay =
    data.members.length > 0
      ? (
          data.members.reduce((acc, m) => acc + m.xanax7d / 7, 0) / data.members.length
        ).toFixed(2)
      : '0.00'

  // Vault Liability calculation
  const memberVaultLiability = data.members.reduce((sum, m) => sum + m.vaultBalance, 0)
  const netFreeVaultCash = data.vaultTotalCash - memberVaultLiability

  // Priority Leadership Alerts
  const alerts: {
    id: string
    severity: 'critical' | 'warning' | 'info'
    category: string
    title: string
    detail: string
    actionTab: string
    actionLabel: string
  }[] = []

  // 1. Check Ready OCs that have blocked participants
  data.organizedCrimes.forEach((oc) => {
    if (oc.timeLeftSeconds <= 0 && !oc.initiated) {
      const blockedMembers = oc.participants
        .map((p) => data.members.find((m) => m.id === p.memberId))
        .filter((m) => m && m.status.state !== 'Okay')
      if (blockedMembers.length > 0) {
        alerts.push({
          id: `oc-block-${oc.id}`,
          severity: 'critical',
          category: 'OC 2.0 Blocked',
          title: `${oc.crimeName} is READY, but ${blockedMembers.length} operative(s) unavailable`,
          detail: blockedMembers
            .map((m) => `${m!.name} (${m!.status.description})`)
            .join(', '),
          actionTab: 'oc',
          actionLabel: 'Inspect OC Team'
        })
      } else {
        alerts.push({
          id: `oc-ready-${oc.id}`,
          severity: 'info',
          category: 'OC 2.0 Ready',
          title: `${oc.crimeName} is 100% READY to initiate`,
          detail: `All ${oc.participants.length} operatives are Okay in Torn (${oc.teamSuccessChance}% CPR).`,
          actionTab: 'oc',
          actionLabel: 'Initiate OC'
        })
      }
    }
  })

  // 2. Check Offline members sitting Okay in Torn during Ranked War ("Bleeders")
  const exposedBleeders = data.members.filter(
    (m) => m.lastAction.status === 'Offline' && m.status.state === 'Okay'
  )
  if (exposedBleeders.length > 0) {
    alerts.push({
      id: 'war-bleeders',
      severity: 'critical',
      category: 'War Score Bleed',
      title: `${exposedBleeders.length} Offline member(s) sitting OKAY in Torn during Ranked War`,
      detail: `${exposedBleeders.map((m) => `${m.name} [${m.id}]`).join(', ')} — Exposed to enemy farming. Ping or bounty-hosp immediately.`,
      actionTab: 'war',
      actionLabel: 'View Friendly Roster'
    })
  }

  // 3. Check Overdue Armory Loans
  const overdueLoans = data.armoryLoans.filter((l) => !l.returned && l.dueAt < nowSec)
  if (overdueLoans.length > 0) {
    alerts.push({
      id: 'armory-overdue',
      severity: 'warning',
      category: 'Armory Recall',
      title: `${overdueLoans.length} High-Value Ranked War weapon loan(s) overdue`,
      detail: overdueLoans
        .map(
          (l) =>
            `${l.borrowerName} holds ${l.itemName} (${l.bonusPerk}, ${formatMoney(l.estimatedValue, true)})`
        )
        .join(' • '),
      actionTab: 'armory',
      actionLabel: 'Recall Gear'
    })
  }

  // 4. Low Armory Consumable Stock
  const lowStock = data.consumables.filter((c) => c.quantity < c.minThreshold)
  if (lowStock.length > 0) {
    alerts.push({
      id: 'low-consumables',
      severity: 'warning',
      category: 'Quartermaster',
      title: `${lowStock.length} Armory consumable(s) below war threshold`,
      detail: lowStock
        .map((c) => `${c.name}: ${c.quantity.toLocaleString()} left (Min ${c.minThreshold})`)
        .join(' • '),
      actionTab: 'armory',
      actionLabel: 'Restock Armory'
    })
  }

  // 5. Unassigned Chain Watch Slot
  const unassignedWatch = data.chainWatchSchedule.filter((s) => s.status === 'Unassigned')
  if (unassignedWatch.length > 0) {
    alerts.push({
      id: 'unassigned-cw',
      severity: 'warning',
      category: 'Chain Watch',
      title: `Unassigned Chain Watch shift at ${unassignedWatch[0].slotLabel}`,
      detail: `Assign a primary watcher before the current shift ends to protect the ${data.chain.current.toLocaleString()} chain.`,
      actionTab: 'oc',
      actionLabel: 'Assign Watcher'
    })
  }

  // Attackable or popping soon enemy targets
  const priorityTargets = [...data.enemyTargets]
    .filter((t) => {
      const rem = Math.max(0, t.status.until - nowSec)
      return t.status.state === 'Okay' || (t.status.state === 'Hospital' && rem <= 300)
    })
    .sort((a, b) => {
      const remA = a.status.state === 'Okay' ? 0 : Math.max(0, a.status.until - nowSec)
      const remB = b.status.state === 'Okay' ? 0 : Math.max(0, b.status.until - nowSec)
      return remA - remB
    })
    .slice(0, 5)

  // Top friendly war hitters
  const topWarriors = [...data.members]
    .sort((a, b) => b.respectEarned - a.respectEarned)
    .slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* KPI 1: Faction Standing */}
        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              Faction Standing
            </span>
            <div className="p-1.5 rounded bg-[#2F81F7]/15 text-[#2F81F7]">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display text-[#E6EDF3]">
                {data.rankName}
              </span>
              <span className="text-xs font-mono-num px-1.5 py-0.5 rounded bg-[#181E25] text-[#58A6FF] border border-[#222A34]">
                [{data.tag}] #{data.factionId}
              </span>
            </div>
            <div className="text-xs text-[#8B949E] mt-1 font-mono-num">
              {data.respect.toLocaleString()} Respect • {data.territoryCount} Territories
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#222A34] flex items-center justify-between text-xs">
            <span className="text-[#8B949E]">Best Chain</span>
            <span className="font-mono-num font-semibold text-[#E6EDF3]">
              {data.bestChain.toLocaleString()} hits
            </span>
          </div>
        </div>

        {/* KPI 2: Roster Readiness */}
        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              Roster Readiness
            </span>
            <div className="p-1.5 rounded bg-[#3FB950]/15 text-[#3FB950]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-num text-[#E6EDF3]">
                {onlineCount + idleCount}
              </span>
              <span className="text-xs text-[#8B949E]">
                / {data.members.length} Active Now ({onlineCount} Online, {idleCount} Idle)
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs font-mono-num">
              <span className="text-[#3FB950]">{okayCount} Okay</span>
              <span className="text-[#F85149]">{hospCount} Hosp</span>
              <span className="text-[#388BFD]">{travelCount} Abroad</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#222A34] flex items-center justify-between text-xs">
            <span className="text-[#8B949E]">Offline Roster</span>
            <span className="font-mono-num text-[#8B949E]">{offlineCount} members</span>
          </div>
        </div>

        {/* KPI 3: Xanax & Compliance */}
        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              Drug & Energy Audit
            </span>
            <div className="p-1.5 rounded bg-[#D29922]/15 text-[#D29922]">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-num text-[#E6EDF3]">
                {avgXanaxPerDay}
              </span>
              <span className="text-xs text-[#8B949E]">
                Xanax / day avg (Target: {policy.minXanaxPerDay}/d)
              </span>
            </div>
            <div className="text-xs mt-1 flex items-center gap-2">
              <span className="text-[#3FB950] font-medium">
                {compliantCount} Compliant
              </span>
              <span className="text-[#8B949E]">•</span>
              <span
                className={
                  nonCompliantList.length > 0
                    ? 'text-[#F85149] font-semibold'
                    : 'text-[#8B949E]'
                }
              >
                {nonCompliantList.length} Non-Compliant
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('compliance')}
            className="pt-2.5 border-t border-[#222A34] flex items-center justify-between text-xs text-[#2F81F7] hover:underline cursor-pointer"
          >
            <span>Open Compliance Auditor</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI 4: Faction Vault & Free Liquidity */}
        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              Vault Liquidity
            </span>
            <div className="p-1.5 rounded bg-[#A371F7]/15 text-[#A371F7]">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-num text-[#3FB950]">
                {formatMoney(netFreeVaultCash, true)}
              </span>
              <span className="text-xs text-[#8B949E]">True Free Cash</span>
            </div>
            <div className="text-xs text-[#8B949E] mt-1 font-mono-num">
              Total: {formatMoney(data.vaultTotalCash, true)} (Liability:{' '}
              {formatMoney(memberVaultLiability, true)})
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#222A34] flex items-center justify-between text-xs">
            <span className="text-[#8B949E]">Point Reserves</span>
            <span className="font-mono-num font-semibold text-[#E6EDF3]">
              {data.vaultPoints.toLocaleString()} pts
            </span>
          </div>
        </div>
      </div>

      {/* Priority Leadership Action Feed */}
      <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#222A34] bg-[#181E25] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D29922]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
              Leadership Action Queue & Tactical Alerts ({alerts.length})
            </h2>
          </div>
          <span className="text-xs text-[#8B949E]">
            Real-time anomaly detection across War, OC 2.0, Armory & Roster
          </span>
        </div>

        <div className="divide-y divide-[#222A34]">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#181E25]/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                    alert.severity === 'critical'
                      ? 'bg-[#F85149]/15 text-[#F85149] border-[#F85149]/40'
                      : alert.severity === 'warning'
                      ? 'bg-[#D29922]/15 text-[#D29922] border-[#D29922]/40'
                      : 'bg-[#3FB950]/15 text-[#3FB950] border-[#3FB950]/40'
                  }`}
                >
                  {alert.category}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[#E6EDF3]">{alert.title}</div>
                  <div className="text-xs text-[#8B949E] mt-0.5">{alert.detail}</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate(alert.actionTab)}
                className="self-start sm:self-center shrink-0 px-3 py-1.5 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#58A6FF] border border-[#222A34] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{alert.actionLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom 2-Column Grid: Priority Enemy Targets + Top Friendly War Hitters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Priority Enemy Targets (Okay or Popping < 5m) */}
        <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#222A34] bg-[#181E25] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#F85149]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
                Hot Enemy Targets ({data.rankedWar.enemyFactionName})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('war')}
              className="text-xs text-[#2F81F7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Target Board</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#222A34] flex-1">
            {priorityTargets.map((t) => {
              const remSec = Math.max(0, t.status.until - nowSec)
              const isOkay = t.status.state === 'Okay' || (t.status.state === 'Hospital' && remSec === 0)

              return (
                <div
                  key={t.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[#181E25]/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          t.lastAction.status === 'Online'
                            ? 'bg-[#3FB950]'
                            : t.lastAction.status === 'Idle'
                            ? 'bg-[#D29922]'
                            : 'bg-[#6E7681]'
                        }`}
                      />
                      <span className="text-sm font-semibold text-[#E6EDF3] truncate">
                        {t.name}
                      </span>
                      <span className="text-xs font-mono-num text-[#8B949E]">[{t.id}]</span>
                      <span className="text-[11px] font-mono-num px-1.5 py-0.5 rounded bg-[#181E25] text-[#E6EDF3] border border-[#222A34]">
                        Lv.{t.level} • {t.bspEstimate}
                      </span>
                    </div>
                    <div className="text-xs text-[#8B949E] mt-0.5 flex items-center gap-2">
                      <span className="text-[#58A6FF] font-mono-num">FF {t.fairFight.toFixed(2)}x</span>
                      <span>•</span>
                      <span>{t.buildArchetype}</span>
                      {t.claimedBy && (
                        <>
                          <span>•</span>
                          <span className="text-[#D29922]">Dibs: {t.claimedBy}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOkay ? (
                      <span className="px-2 py-0.5 rounded text-xs font-mono-num font-semibold bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/40">
                        OKAY NOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-mono-num font-semibold bg-[#F85149]/15 text-[#F85149] border border-[#F85149]/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(remSec)}
                      </span>
                    )}

                    <button
                      onClick={() => onClaimTarget(t.id)}
                      className="px-2 py-1 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] cursor-pointer"
                    >
                      {t.claimedBy === 'You (Leader)' ? 'Unclaim' : 'Claim'}
                    </button>

                    <a
                      href={`https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-[#F85149] hover:bg-[#da3633] text-white flex items-center gap-1 transition-colors"
                    >
                      <span>Attack</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Top Ranked War Contributors */}
        <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#222A34] bg-[#181E25] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#3FB950]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
                Top War Hitters & Respect Leaders
              </h3>
            </div>
            <button
              onClick={() => onNavigate('payouts')}
              className="text-xs text-[#2F81F7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Payout Calculator</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#222A34] flex-1">
            {topWarriors.map((m, idx) => (
              <div
                key={m.id}
                className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[#181E25]/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#181E25] border border-[#222A34] text-xs font-mono-num font-bold flex items-center justify-center text-[#58A6FF]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#E6EDF3] truncate">
                        {m.name}
                      </span>
                      <span className="text-xs text-[#8B949E]">{m.position}</span>
                    </div>
                    <div className="text-xs text-[#8B949E] font-mono-num">
                      {m.warHits} War Hits • {m.outsideChainHits} Chain • {m.assists} Assists •{' '}
                      {m.chainWatchMinutes}m Watch
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono-num text-[#3FB950]">
                    +{m.respectEarned.toFixed(1)} Resp
                  </div>
                  <div className="text-[11px] font-mono-num text-[#8B949E]">
                    {m.xanax7d} Xan / 7d
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
