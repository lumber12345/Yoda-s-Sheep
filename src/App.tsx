import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  LayoutDashboard,
  Crosshair,
  ClipboardCheck,
  Calculator,
  Briefcase,
  Shield,
  RotateCcw,
  KeyRound,
  ExternalLink,
  Terminal,
  ChevronRight
} from 'lucide-react'
import {
  FactionOverviewData,
  WarCacheConfig,
  CompliancePolicy,
  FactionMember,
  EnemyTarget,
  ArmoryLoan
} from './types/torn'
import {
  createInitialDemoData,
  DEFAULT_WAR_CACHE_CONFIG,
  DEFAULT_COMPLIANCE_POLICY
} from './data/mockFactionData'
import { fetchLiveTornFactionData } from './services/tornApi'
import { evaluateMemberCompliance } from './utils/formatters'
import { TopTelemetryBar } from './components/TopTelemetryBar'
import { ApiConnectionModal } from './components/ApiConnectionModal'
import { OverviewModule } from './components/OverviewModule'
import { WarCommandModule } from './components/WarCommandModule'
import { ComplianceAuditorModule } from './components/ComplianceAuditorModule'
import { WarPayoutModule } from './components/WarPayoutModule'
import { OcAndChainWatchModule } from './components/OcAndChainWatchModule'
import { ArmoryAndVaultModule } from './components/ArmoryAndVaultModule'

type ActiveTab = 'overview' | 'war' | 'compliance' | 'payouts' | 'oc' | 'armory'

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [factionData, setFactionData] = useState<FactionOverviewData>(() => createInitialDemoData())
  const [cacheConfig, setCacheConfig] = useState<WarCacheConfig>(() => {
    const saved = localStorage.getItem('torn_vanguard_cache_config')
    return saved ? JSON.parse(saved) : DEFAULT_WAR_CACHE_CONFIG
  })
  const [compliancePolicy, setCompliancePolicy] = useState<CompliancePolicy>(() => {
    const saved = localStorage.getItem('torn_vanguard_compliance_policy')
    return saved ? JSON.parse(saved) : DEFAULT_COMPLIANCE_POLICY
  })

  // API & Telemetry State
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false)
  const [savedApiKey, setSavedApiKey] = useState<string>(
    () => localStorage.getItem('torn_vanguard_api_key') || ''
  )
  const [savedFactionId, setSavedFactionId] = useState<string>(
    () => localStorage.getItem('torn_vanguard_faction_id') || ''
  )
  const [savedEnemyFactionId, setSavedEnemyFactionId] = useState<string>(
    () => localStorage.getItem('torn_vanguard_enemy_id') || ''
  )
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(30)
  const [accessTier, setAccessTier] = useState<string>('Demo Simulation')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [lastApiError, setLastApiError] = useState<string | null>(null)
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false)
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([])
  const [soundAlerts, setSoundAlerts] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000))
  const audioCtxRef = useRef<AudioContext | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 3200)
  }, [])

  // Persist policies
  useEffect(() => {
    localStorage.setItem('torn_vanguard_cache_config', JSON.stringify(cacheConfig))
  }, [cacheConfig])

  useEffect(() => {
    localStorage.setItem('torn_vanguard_compliance_policy', JSON.stringify(compliancePolicy))
  }, [compliancePolicy])

  // Web Audio Beep for Critical Chain (< 90s)
  const playChainWarningBeep = useCallback(() => {
    if (!soundAlerts) return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.18)
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }, [soundAlerts])

  // 1-second real-time ticker for Hospital timers, Chain countdown, and TCT clock
  useEffect(() => {
    const timer = setInterval(() => {
      const currentUnix = Math.floor(Date.now() / 1000)
      setNowSec(currentUnix)

      // Prune request timestamps older than 60s
      setRequestTimestamps((prev) => prev.filter((t) => currentUnix - t < 60))

      setFactionData((prev) => {
        const nextTimeout = prev.chain.timeout > 0 ? prev.chain.timeout - 1 : 295
        if (soundAlerts && nextTimeout > 0 && nextTimeout <= 90 && nextTimeout % 10 === 0) {
          playChainWarningBeep()
        }
        return {
          ...prev,
          chain: {
            ...prev.chain,
            timeout: nextTimeout
          },
          organizedCrimes: prev.organizedCrimes.map((oc) => ({
            ...oc,
            timeLeftSeconds: Math.max(0, oc.timeLeftSeconds - 1)
          }))
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [soundAlerts, playChainWarningBeep])

  // Record an API call in our sliding 60-second window
  const recordApiCall = useCallback(() => {
    const ts = Math.floor(Date.now() / 1000)
    setRequestTimestamps((prev) => [...prev.filter((t) => ts - t < 60), ts])
  }, [])

  // Perform Live Torn API Sync
  const syncLiveTornData = useCallback(
    async (
      keyToUse = savedApiKey,
      facIdToUse = savedFactionId,
      enemyIdToUse = savedEnemyFactionId
    ) => {
      if (!keyToUse.trim()) return
      setIsSyncing(true)
      setLastApiError(null)
      try {
        const result = await fetchLiveTornFactionData(
          keyToUse,
          facIdToUse,
          enemyIdToUse,
          recordApiCall
        )
        setFactionData(result.data)
        setAccessTier(result.accessTier)
        setIsLiveMode(true)
        setIsApiModalOpen(false)
        showToast(
          `Synced live Torn data for ${result.data.factionName} [${result.data.factionId}] (${result.accessTier})`
        )
      } catch (err: any) {
        setLastApiError(err?.message || 'Failed to fetch from Torn API')
      } finally {
        setIsSyncing(false)
      }
    },
    [savedApiKey, savedFactionId, savedEnemyFactionId, recordApiCall, showToast]
  )

  // Auto-polling effect when in Live API mode
  useEffect(() => {
    if (!isLiveMode || pollIntervalSec <= 0 || !savedApiKey) return
    const interval = setInterval(() => {
      syncLiveTornData(savedApiKey, savedFactionId, savedEnemyFactionId)
    }, pollIntervalSec * 1000)
    return () => clearInterval(interval)
  }, [isLiveMode, pollIntervalSec, savedApiKey, savedFactionId, savedEnemyFactionId, syncLiveTornData])

  const handleConnectLive = (
    apiKey: string,
    factionId: string,
    enemyFactionId: string,
    pollSec: number
  ) => {
    localStorage.setItem('torn_vanguard_api_key', apiKey.trim())
    localStorage.setItem('torn_vanguard_faction_id', factionId.trim())
    localStorage.setItem('torn_vanguard_enemy_id', enemyFactionId.trim())
    setSavedApiKey(apiKey.trim())
    setSavedFactionId(factionId.trim())
    setSavedEnemyFactionId(enemyFactionId.trim())
    setPollIntervalSec(pollSec)
    syncLiveTornData(apiKey.trim(), factionId.trim(), enemyFactionId.trim())
  }

  const handleSwitchToDemo = () => {
    setIsLiveMode(false)
    setLastApiError(null)
    setAccessTier('Demo Simulation')
    setFactionData(createInitialDemoData())
    setIsApiModalOpen(false)
    showToast("Switched to interactive Demo Faction: Yoda's Sheep [84920]")
  }

  // Interactive Handlers for Demo & Live Operations
  const handleSimulateChainSave = () => {
    setFactionData((prev) => ({
      ...prev,
      respect: prev.respect + 12,
      chain: {
        ...prev.chain,
        current: prev.chain.current + 1,
        timeout: 300, // Reset to full 05:00
        modifier: Math.min(2.0, Number((prev.chain.modifier + 0.01).toFixed(2)))
      },
      rankedWar: {
        ...prev.rankedWar,
        ourScore: prev.rankedWar.ourScore + 12
      }
    }))
    showToast('Chain Hit Logged! Chain timer reset to 05:00 (+12 War Score)')
  }

  const handleClaimTarget = (targetId: number) => {
    setFactionData((prev) => ({
      ...prev,
      enemyTargets: prev.enemyTargets.map((t) => {
        if (t.id !== targetId) return t
        const nextClaim = t.claimedBy === 'You (Leader)' ? null : 'You (Leader)'
        return {
          ...t,
          claimedBy: nextClaim,
          claimedAt: nextClaim ? nowSec : null
        }
      })
    }))
  }

  const handleUpdateTargetTag = (targetId: number, tag: EnemyTarget['tag']) => {
    setFactionData((prev) => ({
      ...prev,
      enemyTargets: prev.enemyTargets.map((t) => (t.id === targetId ? { ...t, tag } : t))
    }))
  }

  const handleUpdateTargetNote = (targetId: number, notes: string) => {
    setFactionData((prev) => ({
      ...prev,
      enemyTargets: prev.enemyTargets.map((t) => (t.id === targetId ? { ...t, notes } : t))
    }))
    showToast('Saved caller note on enemy target')
  }

  const handleSimulateHitEnemy = (targetId: number) => {
    const hospDurationSec = 420 // 7 mins hospital
    setFactionData((prev) => {
      const target = prev.enemyTargets.find((t) => t.id === targetId)
      const respectGain = target ? Number((target.fairFight * 4.2).toFixed(1)) : 10
      return {
        ...prev,
        respect: prev.respect + Math.round(respectGain),
        chain: {
          ...prev.chain,
          current: prev.chain.current + 1,
          timeout: 300
        },
        rankedWar: {
          ...prev.rankedWar,
          ourScore: prev.rankedWar.ourScore + Math.round(respectGain)
        },
        enemyTargets: prev.enemyTargets.map((t) =>
          t.id === targetId
            ? {
                ...t,
                status: {
                  state: 'Hospital',
                  description: 'In hospital for 7 mins',
                  details: 'Hospitalized by Faction Strike',
                  until: nowSec + hospDurationSec
                },
                timesHospitalized: t.timesHospitalized + 1
              }
            : t
        )
      }
    })
    showToast('Target Hospitalized for 07:00! Chain timer reset to 05:00.')
  }

  const handleAddCustomTarget = (
    name: string,
    id: number,
    level: number,
    bsp: string,
    ff: number
  ) => {
    const newTarget: EnemyTarget = {
      id,
      name,
      level,
      position: 'Member',
      lastAction: { status: 'Online', timestamp: nowSec - 30, relative: 'Just now' },
      status: { state: 'Okay', description: 'Okay', details: '', until: 0 },
      fairFight: ff,
      bspEstimate: bsp,
      bspNumeric: 1_500_000_000,
      buildArchetype: 'Balanced',
      claimedBy: 'You (Leader)',
      claimedAt: nowSec,
      tag: 'Priority',
      notes: 'Added via Spy Lookup',
      timesHospitalized: 0
    }
    setFactionData((prev) => ({
      ...prev,
      enemyTargets: [newTarget, ...prev.enemyTargets]
    }))
    showToast(`Added target ${name} [${id}] to War Command Board`)
  }

  const handleUpdateMember = (memberId: number, updates: Partial<FactionMember>) => {
    setFactionData((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
    }))
  }

  const handleCreditAllUnpaidToVault = (payoutMap: Record<number, number>) => {
    const count = Object.keys(payoutMap).length
    if (count === 0) {
      showToast('All members have already been marked paid for this war!')
      return
    }
    setFactionData((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        const credit = payoutMap[m.id]
        if (credit !== undefined && !m.paidOutWar) {
          return {
            ...m,
            vaultBalance: m.vaultBalance + credit,
            paidOutWar: true
          }
        }
        return m
      })
    }))
    showToast(`Credited war payouts to ${count} member vault balances!`)
  }

  const handleInitiateOc = (ocId: string) => {
    const targetOc = factionData.organizedCrimes.find((o) => o.id === ocId)
    if (!targetOc) return
    const reward = Math.round((targetOc.expectedRewardMin + targetOc.expectedRewardMax) / 2)
    setFactionData((prev) => ({
      ...prev,
      vaultTotalCash: prev.vaultTotalCash + reward,
      respect: prev.respect + targetOc.expectedRespect,
      organizedCrimes: prev.organizedCrimes.map((o) =>
        o.id === ocId ? { ...o, initiated: true } : o
      )
    }))
    showToast(
      `OC "${targetOc.crimeName}" Initiated! +$${(reward / 1_000_000).toFixed(1)}M & +${targetOc.expectedRespect} Respect added to Faction Vault.`
    )
  }

  const handleClearOcBlocker = (memberId: number) => {
    setFactionData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              status: {
                state: 'Okay',
                description: 'Okay',
                details: 'Cleared for OC 2.0',
                until: 0
              }
            }
          : m
      )
    }))
    showToast('Operative status cleared to Okay in Torn — OC is ready to launch!')
  }

  const handleCreateNewOc = (
    crimeName: string,
    tier: number,
    participantIds: number[]
  ) => {
    const roles = ['Mastermind', 'Hacker', 'Demolition', 'Infiltrator', 'Getaway Driver']
    const participants = participantIds.map((id, i) => {
      const m = factionData.members.find((x) => x.id === id)
      return {
        memberId: id,
        memberName: m?.name || `Operative_${id}`,
        role: roles[i % roles.length],
        cpr: m?.crimePassRate || 90,
        itemRequired: 'Tactical Kit',
        itemReady: true
      }
    })
    const avgCpr = Math.round(
      participants.reduce((s, p) => s + p.cpr, 0) / Math.max(1, participants.length)
    )
    setFactionData((prev) => ({
      ...prev,
      organizedCrimes: [
        {
          id: `oc-${Date.now()}`,
          version: 'OC 2.0',
          crimeName,
          difficultyTier: tier,
          timeLeftSeconds: 0,
          initiated: false,
          expectedRewardMin: tier * 9_500_000,
          expectedRewardMax: tier * 16_000_000,
          expectedRespect: tier * 48,
          teamSuccessChance: avgCpr,
          participants
        },
        ...prev.organizedCrimes
      ]
    }))
    showToast(`Deployed new OC 2.0 team: ${crimeName}`)
  }

  const handleAssignChainWatcher = (shiftId: string, memberId: number) => {
    const mem = factionData.members.find((m) => m.id === memberId)
    if (!mem) return
    setFactionData((prev) => ({
      ...prev,
      chainWatchSchedule: prev.chainWatchSchedule.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              primaryWatcherId: mem.id,
              primaryWatcherName: mem.name,
              status: s.status === 'Unassigned' ? 'Upcoming' : s.status
            }
          : s
      )
    }))
    showToast(`Assigned ${mem.name} to Chain Watch shift`)
  }

  const handleReturnLoan = (loanId: string) => {
    setFactionData((prev) => ({
      ...prev,
      armoryLoans: prev.armoryLoans.map((l) =>
        l.id === loanId ? { ...l, returned: true } : l
      )
    }))
    showToast('Armory item marked as returned to Faction Vault')
  }

  const handleCreateLoan = (
    itemName: string,
    rarity: ArmoryLoan['rarity'],
    bonusPerk: string,
    estimatedValue: number,
    borrowerId: number
  ) => {
    const mem = factionData.members.find((m) => m.id === borrowerId)
    const newLoan: ArmoryLoan = {
      id: `loan-${Date.now()}`,
      itemId: 398,
      itemName,
      category: 'Primary',
      rarity,
      bonusPerk,
      estimatedValue,
      borrowerId,
      borrowerName: mem?.name || `Member_${borrowerId}`,
      loanedAt: nowSec,
      dueAt: nowSec + 86400 * 5,
      purpose: 'Ranked War',
      returned: false
    }
    setFactionData((prev) => ({
      ...prev,
      armoryLoans: [newLoan, ...prev.armoryLoans]
    }))
    showToast(`Loaned ${itemName} to ${newLoan.borrowerName}`)
  }

  const handleRestockConsumable = (stockId: string, delta: number) => {
    setFactionData((prev) => ({
      ...prev,
      consumables: prev.consumables.map((c) =>
        c.id === stockId ? { ...c, quantity: c.quantity + delta } : c
      )
    }))
    showToast(`Restocked +${delta} units to Faction Armory`)
  }

  const handleAdjustMemberVault = (memberId: number, delta: number) => {
    setFactionData((prev) => ({
      ...prev,
      vaultTotalCash: prev.vaultTotalCash + delta,
      members: prev.members.map((m) =>
        m.id === memberId
          ? { ...m, vaultBalance: Math.max(0, m.vaultBalance + delta) }
          : m
      )
    }))
    showToast(
      `${delta >= 0 ? 'Deposited' : 'Paid out'} $${Math.abs(delta).toLocaleString()} in Member Vault Ledger`
    )
  }

  // Compute live badge counts for sidebar navigation
  const openEnemyCount = factionData.enemyTargets.filter(
    (t) =>
      t.status.state === 'Okay' ||
      (t.status.state === 'Hospital' && Math.max(0, t.status.until - nowSec) === 0)
  ).length

  const nonCompliantCount = factionData.members.filter(
    (m) => evaluateMemberCompliance(m, compliancePolicy, nowSec).status === 'Non-Compliant'
  ).length

  const readyOcCount = factionData.organizedCrimes.filter(
    (oc) => !oc.initiated && oc.timeLeftSeconds <= 0
  ).length

  const overdueLoanCount = factionData.armoryLoans.filter(
    (l) => !l.returned && l.dueAt < nowSec
  ).length

  // Format Torn City Time (UTC)
  const tctDate = new Date(nowSec * 1000)
  const tctTimeString = tctDate.toISOString().slice(11, 19)

  const navItems: {
    id: ActiveTab
    label: string
    subLabel: string
    icon: React.FC<{ className?: string }>
    badge?: number
    badgeColor?: string
  }[] = [
    {
      id: 'overview',
      label: 'Command SitRep',
      subLabel: 'Overview & Alerts',
      icon: LayoutDashboard
    },
    {
      id: 'war',
      label: 'War Target Board',
      subLabel: 'Enemy & Hosp Timers',
      icon: Crosshair,
      badge: openEnemyCount,
      badgeColor: 'bg-[#F85149]/20 text-[#F85149] border-[#F85149]/40'
    },
    {
      id: 'compliance',
      label: 'Member Auditor',
      subLabel: 'Xanax, Refills & Activity',
      icon: ClipboardCheck,
      badge: nonCompliantCount > 0 ? nonCompliantCount : undefined,
      badgeColor: 'bg-[#D29922]/20 text-[#D29922] border-[#D29922]/40'
    },
    {
      id: 'payouts',
      label: 'War Payouts',
      subLabel: 'Cache & Hit Calculator',
      icon: Calculator
    },
    {
      id: 'oc',
      label: 'OC 2.0 & Chain Watch',
      subLabel: 'Crimes & Shift Roster',
      icon: Briefcase,
      badge: readyOcCount > 0 ? readyOcCount : undefined,
      badgeColor: 'bg-[#3FB950]/20 text-[#3FB950] border-[#3FB950]/40'
    },
    {
      id: 'armory',
      label: 'Armory & Vault',
      subLabel: 'RW Loans & Ghost Bank',
      icon: Shield,
      badge: overdueLoanCount > 0 ? overdueLoanCount : undefined,
      badgeColor: 'bg-[#F85149]/20 text-[#F85149] border-[#F85149]/40'
    }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E11] text-[#E6EDF3]">
      {/* Sticky Top Global War & Chain Telemetry Bar */}
      <TopTelemetryBar
        factionName={factionData.factionName}
        factionTag={factionData.tag}
        factionId={factionData.factionId}
        chain={factionData.chain}
        rankedWar={factionData.rankedWar}
        isLiveMode={isLiveMode}
        accessTier={accessTier}
        requestsPerMin={requestTimestamps.length}
        isSyncing={isSyncing}
        soundAlerts={soundAlerts}
        onToggleSound={() => setSoundAlerts(!soundAlerts)}
        onSimulateChainSave={handleSimulateChainSave}
        onSyncNow={() => syncLiveTornData()}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        tctTimeString={tctTimeString}
      />

      {/* Main Layout: Left Tactical Navigation Rail + Fluid Command Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Navigation Sidebar */}
        <aside className="w-full lg:w-60 shrink-0 bg-[#12161B] border-b lg:border-b-0 lg:border-r border-[#222A34] flex flex-col justify-between">
          <div>
            {/* Brand Identity */}
            <div className="px-4 py-3.5 border-b border-[#222A34] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#2F81F7] flex items-center justify-center text-white font-display font-bold text-xs shadow">
                  YS
                </div>
                <div>
                  <div className="text-xs font-bold tracking-wider uppercase text-[#E6EDF3] flex items-center gap-1.5">
                    <span>Yoda&apos;s Sheep</span>
                    <span className="text-[10px] font-mono-num px-1 py-0.2 rounded bg-[#181E25] text-[#58A6FF] border border-[#222A34]">
                      v2.4
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8B949E] truncate max-w-[145px]">
                    {factionData.factionName} [{factionData.tag}]
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-left transition-all shrink-0 lg:w-full cursor-pointer border ${
                      isActive
                        ? 'bg-[#181E25] text-[#E6EDF3] border-[#2F81F7]/50 shadow-sm'
                        : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181E25]/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#2F81F7]' : 'text-[#8B949E]'
                        }`}
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold leading-tight">{item.label}</div>
                        <div className="hidden lg:block text-[10px] text-[#6E7681] mt-0.5">
                          {item.subLabel}
                        </div>
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold border ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Quick Links & Demo Reset */}
          <div className="hidden lg:block p-3 border-t border-[#222A34] space-y-2">
            <div className="p-2.5 rounded bg-[#0B0E11] border border-[#222A34] text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-[#8B949E]">
                <span className="font-semibold uppercase text-[10px]">Torn Direct Links</span>
                <Terminal className="w-3 h-3 text-[#2F81F7]" />
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <a
                  href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.factionId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#58A6FF] hover:underline flex items-center gap-0.5"
                >
                  <span>Our Faction</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.rankedWar.enemyFactionId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#F85149] hover:underline flex items-center gap-0.5"
                >
                  <span>Enemy Fac</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://www.torn.com/factions.php?step=your#/tab=controls"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#8B949E] hover:text-[#E6EDF3] flex items-center gap-0.5"
                >
                  <span>Controls</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://www.torn.com/item.php"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#8B949E] hover:text-[#E6EDF3] flex items-center gap-0.5"
                >
                  <span>Items</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            <button
              onClick={handleSwitchToDemo}
              className="w-full py-1.5 px-2.5 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#8B949E] hover:text-[#E6EDF3] border border-[#222A34] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 lg:p-5 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewModule
              data={factionData}
              policy={compliancePolicy}
              nowSec={nowSec}
              onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
              onClaimTarget={handleClaimTarget}
            />
          )}

          {activeTab === 'war' && (
            <WarCommandModule
              rankedWar={factionData.rankedWar}
              enemyTargets={factionData.enemyTargets}
              friendlyMembers={factionData.members}
              nowSec={nowSec}
              onClaimTarget={handleClaimTarget}
              onUpdateTargetTag={handleUpdateTargetTag}
              onUpdateTargetNote={handleUpdateTargetNote}
              onSimulateHitEnemy={handleSimulateHitEnemy}
              onAddCustomTarget={handleAddCustomTarget}
            />
          )}

          {activeTab === 'compliance' && (
            <ComplianceAuditorModule
              members={factionData.members}
              policy={compliancePolicy}
              nowSec={nowSec}
              onUpdatePolicy={setCompliancePolicy}
              onUpdateMember={handleUpdateMember}
            />
          )}

          {activeTab === 'payouts' && (
            <WarPayoutModule
              members={factionData.members}
              cacheConfig={cacheConfig}
              onUpdateCacheConfig={setCacheConfig}
              onUpdateMember={handleUpdateMember}
              onCreditAllUnpaidToVault={handleCreditAllUnpaidToVault}
            />
          )}

          {activeTab === 'oc' && (
            <OcAndChainWatchModule
              organizedCrimes={factionData.organizedCrimes}
              members={factionData.members}
              chainWatchSchedule={factionData.chainWatchSchedule}
              nowSec={nowSec}
              onInitiateOc={handleInitiateOc}
              onClearOcBlocker={handleClearOcBlocker}
              onCreateNewOc={handleCreateNewOc}
              onAssignChainWatcher={handleAssignChainWatcher}
            />
          )}

          {activeTab === 'armory' && (
            <ArmoryAndVaultModule
              loans={factionData.armoryLoans}
              consumables={factionData.consumables}
              members={factionData.members}
              vaultTotalCash={factionData.vaultTotalCash}
              vaultPoints={factionData.vaultPoints}
              nowSec={nowSec}
              onReturnLoan={handleReturnLoan}
              onCreateLoan={handleCreateLoan}
              onRestockConsumable={handleRestockConsumable}
              onAdjustMemberVault={handleAdjustMemberVault}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg bg-[#181E25] border border-[#2F81F7] text-xs font-medium text-[#E6EDF3] shadow-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3FB950]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Torn API Connection & Mode Modal */}
      <ApiConnectionModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        isLiveMode={isLiveMode}
        savedApiKey={savedApiKey}
        savedFactionId={savedFactionId}
        savedEnemyFactionId={savedEnemyFactionId}
        pollIntervalSec={pollIntervalSec}
        lastError={lastApiError}
        isSyncing={isSyncing}
        accessTier={accessTier}
        onConnectLive={handleConnectLive}
        onSwitchToDemo={handleSwitchToDemo}
      />
    </div>
  )
}

export default App
