export type MemberStatusState = 'Okay' | 'Hospital' | 'Traveling' | 'Abroad' | 'Jail' | 'Federal'
export type OnlineActionState = 'Online' | 'Idle' | 'Offline'

export interface FactionMember {
  id: number
  name: string
  level: number
  daysInFaction: number
  position: string
  lastAction: {
    status: OnlineActionState
    timestamp: number
    relative: string
  }
  status: {
    state: MemberStatusState
    description: string
    details: string
    until: number // Unix timestamp in seconds when hospital/jail expires
  }
  // Compliance & Activity Telemetry (7-day rolling & war window)
  xanax7d: number
  energyRefills7d: number
  nerveRefills7d: number
  overdoses7d: number
  networthEstimate: number
  battleStatEstimate: string
  battleStatNumeric: number
  naturalNerveBar: number
  crimePassRate: number
  revivable: boolean
  // Ranked War & Chain Contribution
  warHits: number
  outsideChainHits: number
  assists: number
  respectEarned: number
  chainWatchMinutes: number
  factionXanaxUsed: number
  factionMedsUsed: number
  // Banking & Leadership
  vaultBalance: number
  paidOutWar: boolean
  leadershipNote: string
  strikes: number
}

export interface EnemyTarget {
  id: number
  name: string
  level: number
  position: string
  lastAction: {
    status: OnlineActionState
    timestamp: number
    relative: string
  }
  status: {
    state: MemberStatusState
    description: string
    details: string
    until: number // Unix seconds
  }
  fairFight: number
  bspEstimate: string
  bspNumeric: number
  buildArchetype: 'Balanced' | 'Def Whore' | 'Dex Whore' | 'Glass Cannon' | 'Unknown'
  claimedBy: string | null
  claimedAt: number | null
  tag: 'Priority' | 'Farm / FF 3.0' | 'Retal Target' | 'Chain Filler' | 'Avoid / Tank' | 'None'
  notes: string
  timesHospitalized: number
}

export interface ChainState {
  current: number
  max: number
  timeout: number // seconds remaining (0 - 300)
  modifier: number
  cooldown: number
  start: number
  activeWatcher: string
  backupWatcher: string
  nextMilestone: number
}

export interface RankedWarState {
  warId: number
  enemyFactionId: number
  enemyFactionName: string
  enemyFactionRank: string
  enemyMemberCount: number
  ourScore: number
  enemyScore: number
  targetScore: number
  initialTargetScore: number
  startTimestamp: number
  status: 'Active' | 'Upcoming' | 'Completed'
}

export interface OrganizedCrimeParticipant {
  memberId: number
  memberName: string
  role: string
  cpr: number
  itemRequired?: string
  itemReady: boolean
}

export interface OrganizedCrimeTeam {
  id: string
  version: 'OC 2.0' | 'OC 1.0'
  crimeName: string
  difficultyTier: number
  timeLeftSeconds: number // 0 = Ready to initiate!
  initiated: boolean
  expectedRewardMin: number
  expectedRewardMax: number
  expectedRespect: number
  teamSuccessChance: number
  participants: OrganizedCrimeParticipant[]
}

export interface ArmoryLoan {
  id: string
  itemId: number
  itemName: string
  category: 'Primary' | 'Secondary' | 'Melee' | 'Armor' | 'Temporary'
  rarity: 'Yellow (RW)' | 'Orange (RW)' | 'Red (RW)' | 'Standard'
  bonusPerk: string
  estimatedValue: number
  borrowerId: number
  borrowerName: string
  loanedAt: number
  dueAt: number
  purpose: 'Ranked War' | 'Territory War' | 'Chain / Mug' | 'Permanent Role'
  returned: boolean
}

export interface ArmoryConsumableStock {
  id: string
  name: string
  category: 'Drugs' | 'Medical' | 'Boosters' | 'Temporaries' | 'Caches'
  quantity: number
  minThreshold: number
  unitPrice: number
  dailyBurnRate: number
}

export interface ChainWatchShift {
  id: string
  slotLabel: string // e.g., "18:00 - 19:00 TCT"
  primaryWatcherId: number | null
  primaryWatcherName: string
  backupWatcherName: string
  status: 'Active' | 'Completed' | 'Upcoming' | 'Unassigned'
  savesLogged: number
}

export interface WarCacheConfig {
  armorCaches: number
  armorCachePrice: number
  heavyArmsCaches: number
  heavyArmsCachePrice: number
  mediumArmsCaches: number
  mediumArmsCachePrice: number
  smallArmsCaches: number
  smallArmsCachePrice: number
  meleeCaches: number
  meleeCachePrice: number
  extraBonusCash: number
  factionTaxPercent: number
  insideWarHitWeight: number
  outsideChainHitWeight: number
  assistValueCash: number
  chainWatchMinuteCash: number
  deductSuppliesUsed: boolean
  xanaxUnitCost: number
  medUnitCost: number
}

export interface CompliancePolicy {
  minXanaxPerDay: number
  minRefillsPerWeek: number
  maxInactiveHours: number
  requireOcParticipation: boolean
}

export interface FactionOverviewData {
  factionId: number
  factionName: string
  tag: string
  leaderId: number
  coLeaderId: number
  respect: number
  ageDays: number
  capacity: number
  bestChain: number
  rankName: string
  rankDivision: number
  territoryCount: number
  vaultTotalCash: number
  vaultPoints: number
  members: FactionMember[]
  enemyTargets: EnemyTarget[]
  chain: ChainState
  rankedWar: RankedWarState
  organizedCrimes: OrganizedCrimeTeam[]
  armoryLoans: ArmoryLoan[]
  consumables: ArmoryConsumableStock[]
  chainWatchSchedule: ChainWatchShift[]
}
