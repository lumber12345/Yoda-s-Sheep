import { FactionMember, CompliancePolicy } from '../types/torn'

export function formatMoney(amount: number, compact = false): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (compact) {
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
    return `${sign}$${abs.toLocaleString()}`
  }
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function formatChainTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const rem = s % 60
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}

export interface MemberComplianceEvaluation {
  score: number // 0 - 100
  status: 'Compliant' | 'Warning' | 'Non-Compliant'
  xanaxPerDay: number
  inactiveHours: number
  reasons: string[]
}

export function evaluateMemberCompliance(
  member: FactionMember,
  policy: CompliancePolicy,
  nowSec: number
): MemberComplianceEvaluation {
  const xanaxPerDay = Number((member.xanax7d / 7).toFixed(2))
  const inactiveHours = Math.max(0, (nowSec - member.lastAction.timestamp) / 3600)
  const reasons: string[] = []

  // Xanax score (up to 50 pts)
  const xanRatio = policy.minXanaxPerDay > 0 ? Math.min(1.15, xanaxPerDay / policy.minXanaxPerDay) : 1
  const xanScore = Math.min(50, Math.round(xanRatio * 45))
  if (xanaxPerDay < policy.minXanaxPerDay) {
    reasons.push(`Xanax ${xanaxPerDay}/d (Req: ${policy.minXanaxPerDay}/d)`)
  }

  // Energy Refills score (up to 25 pts)
  const refillRatio =
    policy.minRefillsPerWeek > 0
      ? Math.min(1.1, member.energyRefills7d / policy.minRefillsPerWeek)
      : 1
  const refillScore = Math.min(25, Math.round(refillRatio * 23))
  if (member.energyRefills7d < policy.minRefillsPerWeek) {
    reasons.push(`Refills ${member.energyRefills7d}/7d (Req: ${policy.minRefillsPerWeek})`)
  }

  // Activity score (up to 25 pts)
  let actScore = 25
  if (inactiveHours > policy.maxInactiveHours) {
    const overHours = inactiveHours - policy.maxInactiveHours
    actScore = Math.max(0, Math.round(25 - overHours * 1.5))
    reasons.push(`Inactive ${Math.round(inactiveHours)}h (Max: ${policy.maxInactiveHours}h)`)
  }

  if (member.revivable) {
    reasons.push('Revives left ON during war')
  }

  const totalScore = Math.min(100, Math.max(0, xanScore + refillScore + actScore - (member.revivable ? 8 : 0)))

  let status: 'Compliant' | 'Warning' | 'Non-Compliant' = 'Compliant'
  if (totalScore < 65 || inactiveHours > policy.maxInactiveHours * 1.25 || xanaxPerDay < policy.minXanaxPerDay * 0.65) {
    status = 'Non-Compliant'
  } else if (totalScore < 85 || reasons.length > 0) {
    status = 'Warning'
  }

  return {
    score: totalScore,
    status,
    xanaxPerDay,
    inactiveHours,
    reasons
  }
}
