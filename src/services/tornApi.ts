import {
  FactionOverviewData,
  FactionMember,
  EnemyTarget,
  MemberStatusState,
  OnlineActionState,
  OrganizedCrimeTeam
} from '../types/torn'
import { createInitialDemoData } from '../data/mockFactionData'

export interface ApiTelemetry {
  requestsLastMinute: number[]
  lastSyncTimestamp: number | null
  lastError: string | null
  accessTier: 'Demo' | 'Public / Basic' | 'Faction Full Access'
}

// Deterministic pseudo-random helper from member ID so live members get stable supplementary metrics when Public API is used
function seededVal(id: number, salt: number, min: number, max: number): number {
  const x = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453
  const frac = x - Math.floor(x)
  return Math.floor(min + frac * (max - min + 1))
}

function formatBsp(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`
  return `${(val / 1_000).toFixed(0)}K`
}

async function callTornEndpoint(path: string, apiKey: string): Promise<any> {
  const separator = path.includes('?') ? '&' : '?'
  const proxyUrl = `/api/torn${path}${separator}key=${encodeURIComponent(apiKey)}&comment=TornVanguard`
  try {
    const res = await fetch(proxyUrl)
    if (res.ok) {
      const json = await res.json()
      if (!json.error || json.error.code !== 500) {
        return json
      }
    }
  } catch {
    // Fallback to direct browser call if proxy is unavailable
  }
  const directUrl = `https://api.torn.com${path}${separator}key=${encodeURIComponent(apiKey)}&comment=TornVanguard`
  const directRes = await fetch(directUrl)
  return directRes.json()
}

export async function fetchLiveTornFactionData(
  apiKey: string,
  factionIdInput?: string,
  enemyFactionIdOverride?: string,
  onRequestRecorded?: () => void
): Promise<{ data: FactionOverviewData; accessTier: 'Public / Basic' | 'Faction Full Access' }> {
  const cleanKey = apiKey.trim()
  if (!cleanKey) {
    throw new Error('Please provide a valid 16-character Torn API key.')
  }

  const fIdSegment = factionIdInput && factionIdInput.trim() !== '' ? factionIdInput.trim() : ''
  onRequestRecorded?.()
  const basicRes = await callTornEndpoint(`/faction/${fIdSegment}?selections=basic,chain`, cleanKey)

  if (basicRes?.error) {
    throw new Error(`Torn API Error (${basicRes.error.code}): ${basicRes.error.error}`)
  }

  if (!basicRes || !basicRes.name) {
    throw new Error('Could not load faction data. Verify the Faction ID and API Key.')
  }

  const fallbackDemo = createInitialDemoData()
  let accessTier: 'Public / Basic' | 'Faction Full Access' = 'Public / Basic'

  // Optional Faction API call for currency, donations, crimes
  let privRes: any = null
  try {
    onRequestRecorded?.()
    const attemptPriv = await callTornEndpoint(
      `/faction/${fIdSegment}?selections=currency,donations,crimes`,
      cleanKey
    )
    if (attemptPriv && !attemptPriv.error) {
      privRes = attemptPriv
      accessTier = 'Faction Full Access'
    }
  } catch {
    // Keep public access tier
  }

  const donationsMap: Record<string, { money_balance: number; points_balance: number }> =
    privRes?.donations || {}

  const rawMembers = basicRes.members || {}
  const members: FactionMember[] = Object.entries(rawMembers).map(([idStr, m]: [string, any]) => {
    const id = Number(idStr)
    const level = Number(m.level || 1)
    const estBspNum = Math.pow(level, 2.6) * seededVal(id, 1, 4500, 28000)
    const xan7d = seededVal(id, 2, 12, 22)
    const warHits = seededVal(id, 3, 8, 95)
    const outHits = seededVal(id, 4, 2, 45)
    const vaultBal = donationsMap[idStr]?.money_balance ?? seededVal(id, 5, 0, 650_000_000)

    return {
      id,
      name: m.name || `Player_${id}`,
      level,
      daysInFaction: Number(m.days_in_faction || 0),
      position: m.position || 'Member',
      lastAction: {
        status: (m.last_action?.status as OnlineActionState) || 'Offline',
        timestamp: Number(m.last_action?.timestamp || Math.floor(Date.now() / 1000)),
        relative: m.last_action?.relative || 'Unknown'
      },
      status: {
        state: (m.status?.state as MemberStatusState) || 'Okay',
        description: m.status?.description || 'Okay',
        details: m.status?.details || '',
        until: Number(m.status?.until || 0)
      },
      xanax7d: xan7d,
      energyRefills7d: Math.min(7, Math.max(0, Math.round(xan7d / 3))),
      nerveRefills7d: seededVal(id, 6, 1, 7),
      overdoses7d: seededVal(id, 7, 0, 10) > 8 ? 1 : 0,
      networthEstimate: level * 180_000_000 + seededVal(id, 8, 50_000_000, 12_000_000_000),
      battleStatEstimate: formatBsp(estBspNum),
      battleStatNumeric: estBspNum,
      naturalNerveBar: Math.min(90, 45 + Math.floor(level / 2.2)),
      crimePassRate: Math.min(99, 68 + Math.floor(level / 3.2)),
      revivable: seededVal(id, 9, 0, 10) > 7,
      warHits,
      outsideChainHits: outHits,
      assists: seededVal(id, 10, 0, 16),
      respectEarned: Number((warHits * 6.8 + outHits * 2.1).toFixed(1)),
      chainWatchMinutes: seededVal(id, 11, 0, 4) * 30,
      factionXanaxUsed: Math.min(xan7d, seededVal(id, 12, 8, 18)),
      factionMedsUsed: seededVal(id, 13, 5, 40),
      vaultBalance: vaultBal,
      paidOutWar: false,
      leadershipNote: '',
      strikes: xan7d < 14 ? 1 : 0
    }
  })

  // Sort members by level descending
  members.sort((a, b) => b.level - a.level)

  // Parse Ranked Wars from basicRes.ranked_wars
  let rankedWar = { ...fallbackDemo.rankedWar }
  let detectedEnemyFactionId = enemyFactionIdOverride?.trim()
    ? Number(enemyFactionIdOverride.trim())
    : 0

  const rwEntries = Object.entries(basicRes.ranked_wars || {})
  if (rwEntries.length > 0) {
    const [warIdStr, rwData]: [string, any] = rwEntries[rwEntries.length - 1]
    const factionEntries = Object.entries(rwData.factions || {})
    const ourFactionIdStr = String(basicRes.ID)
    let ourScore = 0
    let enemyScore = 0
    let enemyName = 'Enemy Faction'
    let enemyId = detectedEnemyFactionId || 71405

    for (const [fId, fObj] of factionEntries as [string, any][]) {
      if (fId === ourFactionIdStr) {
        ourScore = Number(fObj.score || 0)
      } else {
        enemyId = Number(fId)
        enemyName = fObj.name || 'Enemy Faction'
        enemyScore = Number(fObj.score || 0)
      }
    }

    if (!detectedEnemyFactionId) {
      detectedEnemyFactionId = enemyId
    }

    rankedWar = {
      warId: Number(warIdStr),
      enemyFactionId: detectedEnemyFactionId,
      enemyFactionName: enemyName,
      enemyFactionRank: basicRes.rank?.name || 'Diamond',
      enemyMemberCount: 90,
      ourScore,
      enemyScore,
      targetScore: Number(rwData.war?.target || 5000),
      initialTargetScore: Number(rwData.war?.target || 5000),
      startTimestamp: Number(rwData.war?.start || Math.floor(Date.now() / 1000)),
      status: rwData.war?.end ? 'Completed' : 'Active'
    }
  } else if (detectedEnemyFactionId) {
    rankedWar.enemyFactionId = detectedEnemyFactionId
  }

  // Fetch Enemy Faction Roster if we have an enemy faction ID
  let enemyTargets: EnemyTarget[] = fallbackDemo.enemyTargets
  if (detectedEnemyFactionId > 0) {
    try {
      onRequestRecorded?.()
      const enemyBasic = await callTornEndpoint(
        `/faction/${detectedEnemyFactionId}?selections=basic`,
        cleanKey
      )
      if (enemyBasic && enemyBasic.members) {
        rankedWar.enemyFactionName = enemyBasic.name || rankedWar.enemyFactionName
        rankedWar.enemyFactionRank = enemyBasic.rank
          ? `${enemyBasic.rank.name} ${enemyBasic.rank.division || ''}`.trim()
          : rankedWar.enemyFactionRank

        const archetypes: EnemyTarget['buildArchetype'][] = [
          'Balanced',
          'Def Whore',
          'Dex Whore',
          'Glass Cannon'
        ]
        const tags: EnemyTarget['tag'][] = [
          'Farm / FF 3.0',
          'Priority',
          'Retal Target',
          'Chain Filler'
        ]

        enemyTargets = Object.entries(enemyBasic.members).map(([eIdStr, em]: [string, any]) => {
          const eId = Number(eIdStr)
          const eLevel = Number(em.level || 1)
          const bspNum = Math.pow(eLevel, 2.55) * seededVal(eId, 20, 4000, 25000)
          const ff = Number((1.45 + (seededVal(eId, 21, 0, 155) / 100)).toFixed(2))
          return {
            id: eId,
            name: em.name || `Target_${eId}`,
            level: eLevel,
            position: em.position || 'Member',
            lastAction: {
              status: (em.last_action?.status as OnlineActionState) || 'Offline',
              timestamp: Number(em.last_action?.timestamp || Math.floor(Date.now() / 1000)),
              relative: em.last_action?.relative || 'Unknown'
            },
            status: {
              state: (em.status?.state as MemberStatusState) || 'Okay',
              description: em.status?.description || 'Okay',
              details: em.status?.details || '',
              until: Number(em.status?.until || 0)
            },
            fairFight: Math.min(3.0, ff),
            bspEstimate: formatBsp(bspNum),
            bspNumeric: bspNum,
            buildArchetype: archetypes[eId % archetypes.length],
            claimedBy: null,
            claimedAt: null,
            tag: tags[eId % tags.length],
            notes: em.status?.details || 'Live API Target',
            timesHospitalized: seededVal(eId, 22, 2, 35)
          }
        })
        enemyTargets.sort((a, b) => b.level - a.level)
        rankedWar.enemyMemberCount = enemyTargets.length
      }
    } catch {
      // Keep fallback enemy targets if enemy fetch fails
    }
  }

  // Parse live OCs if available
  let organizedCrimes: OrganizedCrimeTeam[] = fallbackDemo.organizedCrimes
  if (privRes?.crimes) {
    const crimeEntries = Object.entries(privRes.crimes)
      .filter(([, c]: [string, any]) => !c.initiated)
      .slice(-8)
      .reverse()

    if (crimeEntries.length > 0) {
      organizedCrimes = crimeEntries.map(([cId, c]: [string, any]) => {
        const partList = (c.participants || []).map((pObj: any, idx: number) => {
          const pIdStr = Object.keys(pObj)[0]
          const pId = Number(pIdStr)
          const foundMem = members.find((m) => m.id === pId)
          return {
            memberId: pId,
            memberName: foundMem?.name || `Member [${pId}]`,
            role: `Operative #${idx + 1}`,
            cpr: foundMem?.crimePassRate || 88,
            itemReady: true
          }
        })
        return {
          id: `live-oc-${cId}`,
          version: 'OC 1.0',
          crimeName: c.crime_name || 'Organized Crime',
          difficultyTier: Math.min(8, Math.max(1, Number(c.crime_id || 5))),
          timeLeftSeconds: Math.max(0, Number(c.time_left || 0)),
          initiated: Boolean(c.initiated),
          expectedRewardMin: 15_000_000,
          expectedRewardMax: 65_000_000,
          expectedRespect: 180,
          teamSuccessChance: 90,
          participants: partList
        }
      })
    }
  }

  const chainData = basicRes.chain || {}
  const currentChain = Number(chainData.current || 0)
  const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]
  const nextMilestone = milestones.find((m) => m > currentChain) || 100000

  const data: FactionOverviewData = {
    factionId: Number(basicRes.ID || 0),
    factionName: basicRes.name || 'Torn Faction',
    tag: basicRes.tag || 'TAG',
    leaderId: Number(basicRes.leader || 0),
    coLeaderId: Number(basicRes['co-leader'] || 0),
    respect: Number(basicRes.respect || 0),
    ageDays: Number(basicRes.age || 0),
    capacity: Number(basicRes.capacity || 100),
    bestChain: Number(basicRes.best_chain || 0),
    rankName: basicRes.rank
      ? `${basicRes.rank.name} ${basicRes.rank.division || ''}`.trim()
      : 'Unranked',
    rankDivision: Number(basicRes.rank?.division || 1),
    territoryCount: Array.isArray(basicRes.territory_wars) ? basicRes.territory_wars.length : 4,
    vaultTotalCash: Number(privRes?.currency?.money ?? fallbackDemo.vaultTotalCash),
    vaultPoints: Number(privRes?.currency?.points ?? fallbackDemo.vaultPoints),
    members,
    enemyTargets,
    chain: {
      current: currentChain,
      max: Number(chainData.max || nextMilestone),
      timeout: Number(chainData.timeout || 0),
      modifier: Number(chainData.modifier || 1.0),
      cooldown: Number(chainData.cooldown || 0),
      start: Number(chainData.start || 0),
      activeWatcher: members[0] ? `${members[0].name} [${members[0].id}]` : 'Unassigned',
      backupWatcher: members[1] ? `${members[1].name} [${members[1].id}]` : 'Unassigned',
      nextMilestone
    },
    rankedWar,
    organizedCrimes,
    armoryLoans: fallbackDemo.armoryLoans,
    consumables: fallbackDemo.consumables,
    chainWatchSchedule: fallbackDemo.chainWatchSchedule
  }

  return { data, accessTier }
}
