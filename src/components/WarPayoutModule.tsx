import React, { useState } from 'react'
import {
  Calculator,
  Coins,
  Copy,
  Check,
  Download,
  ExternalLink,
  CheckCircle2,
  Package,
  SlidersHorizontal
} from 'lucide-react'
import { FactionMember, WarCacheConfig } from '../types/torn'
import { formatMoney } from '../utils/formatters'

interface WarPayoutModuleProps {
  members: FactionMember[]
  cacheConfig: WarCacheConfig
  onUpdateCacheConfig: (newConfig: WarCacheConfig) => void
  onUpdateMember: (memberId: number, updates: Partial<FactionMember>) => void
  onCreditAllUnpaidToVault: (payoutMap: Record<number, number>) => void
}

export const WarPayoutModule: React.FC<WarPayoutModuleProps> = ({
  members,
  cacheConfig,
  onUpdateCacheConfig,
  onUpdateMember,
  onCreditAllUnpaidToVault
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [copiedDiscord, setCopiedDiscord] = useState(false)

  // 1. Gross Cache & Bonus Pool
  const grossCacheRevenue =
    cacheConfig.armorCaches * cacheConfig.armorCachePrice +
    cacheConfig.heavyArmsCaches * cacheConfig.heavyArmsCachePrice +
    cacheConfig.mediumArmsCaches * cacheConfig.mediumArmsCachePrice +
    cacheConfig.smallArmsCaches * cacheConfig.smallArmsCachePrice +
    cacheConfig.meleeCaches * cacheConfig.meleeCachePrice +
    cacheConfig.extraBonusCash

  // 2. Faction Cut (Tax)
  const factionCutCash = Math.round(grossCacheRevenue * (cacheConfig.factionTaxPercent / 100))
  const distributablePool = Math.max(0, grossCacheRevenue - factionCutCash)

  // 3. Fixed Assist & Chain Watch Pool
  const totalFixedBonuses = members.reduce(
    (sum, m) =>
      sum +
      m.assists * cacheConfig.assistValueCash +
      m.chainWatchMinutes * cacheConfig.chainWatchMinuteCash,
    0
  )

  const hitPoolCash = Math.max(0, distributablePool - totalFixedBonuses)

  // 4. Weighted Hit Points per member
  const memberRows = members.map((m) => {
    const weightedPoints =
      m.warHits * cacheConfig.insideWarHitWeight +
      m.outsideChainHits * cacheConfig.outsideChainHitWeight
    return {
      member: m,
      weightedPoints
    }
  })

  const totalWeightedPoints = Math.max(
    1,
    memberRows.reduce((sum, r) => sum + r.weightedPoints, 0)
  )

  const valuePerWeightedPoint = hitPoolCash / totalWeightedPoints

  const calculatedPayouts = memberRows
    .map(({ member: m, weightedPoints }) => {
      const sharePct = (weightedPoints / totalWeightedPoints) * 100
      const hitShareCash = Math.round(weightedPoints * valuePerWeightedPoint)
      const assistAndWatchCash =
        m.assists * cacheConfig.assistValueCash +
        m.chainWatchMinutes * cacheConfig.chainWatchMinuteCash
      const grossMemberPayout = hitShareCash + assistAndWatchCash
      const suppliesCost = cacheConfig.deductSuppliesUsed
        ? m.factionXanaxUsed * cacheConfig.xanaxUnitCost +
          m.factionMedsUsed * cacheConfig.medUnitCost
        : 0
      const netPayout = Math.max(0, grossMemberPayout - suppliesCost)

      return {
        member: m,
        weightedPoints,
        sharePct,
        hitShareCash,
        assistAndWatchCash,
        grossMemberPayout,
        suppliesCost,
        netPayout
      }
    })
    .sort((a, b) => b.netPayout - a.netPayout)

  const totalSuppliesReimbursed = calculatedPayouts.reduce((s, r) => s + r.suppliesCost, 0)

  const handleCopyAmount = (memberId: number, amount: number) => {
    navigator.clipboard.writeText(String(Math.round(amount)))
    setCopiedId(memberId)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleCopyDiscordSheet = () => {
    const lines = [
      `💰 **RANKED WAR PAYOUT SHEET — CACHE LIQUIDATION**`,
      `Gross Cache Revenue: **${formatMoney(grossCacheRevenue)}** | Faction Cut (${cacheConfig.factionTaxPercent}%): **${formatMoney(factionCutCash)}**`,
      `Member Payout Pool: **${formatMoney(distributablePool)}** (${formatMoney(Math.round(valuePerWeightedPoint))}/weighted hit)`,
      '',
      ...calculatedPayouts.map(
        (r, i) =>
          `${i + 1}. **${r.member.name} [${r.member.id}]**: **${formatMoney(r.netPayout)}** (${r.member.warHits} War, ${r.member.outsideChainHits} Chain, ${r.member.assists} Ast, ${r.member.chainWatchMinutes}m Watch) ${
            r.member.paidOutWar ? '✅ PAID' : '⏳ PENDING'
          }`
      )
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedDiscord(true)
    setTimeout(() => setCopiedDiscord(false), 2500)
  }

  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'MemberID',
      'MemberName',
      'WarHits',
      'OutsideChainHits',
      'Assists',
      'WatchMinutes',
      'WeightedPoints',
      'GrossPayout',
      'SuppliesDeducted',
      'NetPayout',
      'PaidStatus'
    ]
    const rows = calculatedPayouts.map((r, idx) => [
      idx + 1,
      r.member.id,
      `"${r.member.name}"`,
      r.member.warHits,
      r.member.outsideChainHits,
      r.member.assists,
      r.member.chainWatchMinutes,
      r.weightedPoints.toFixed(2),
      r.grossMemberPayout,
      r.suppliesCost,
      r.netPayout,
      r.member.paidOutWar ? 'PAID' : 'UNPAID'
    ])
    const csv =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csv))
    link.setAttribute('download', `torn_war_payouts_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBatchCreditAll = () => {
    const map: Record<number, number> = {}
    calculatedPayouts.forEach((r) => {
      if (!r.member.paidOutWar) {
        map[r.member.id] = r.netPayout
      }
    })
    onCreditAllUnpaidToVault(map)
  }

  return (
    <div className="space-y-4">
      {/* Top 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
            Gross War Cache Spoils
          </div>
          <div className="text-2xl font-bold font-mono-num text-[#E6EDF3] mt-1">
            {formatMoney(grossCacheRevenue, true)}
          </div>
          <div className="text-xs font-mono-num text-[#8B949E] mt-1">
            {formatMoney(grossCacheRevenue)} total
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
            Faction Vault Cut ({cacheConfig.factionTaxPercent}%)
          </div>
          <div className="text-2xl font-bold font-mono-num text-[#58A6FF] mt-1">
            {formatMoney(factionCutCash + totalSuppliesReimbursed, true)}
          </div>
          <div className="text-xs font-mono-num text-[#8B949E] mt-1">
            Tax: {formatMoney(factionCutCash, true)} + Supplies: {formatMoney(totalSuppliesReimbursed, true)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
            Member Distributable Pool
          </div>
          <div className="text-2xl font-bold font-mono-num text-[#3FB950] mt-1">
            {formatMoney(distributablePool, true)}
          </div>
          <div className="text-xs font-mono-num text-[#8B949E] mt-1">
            {totalWeightedPoints.toFixed(1)} total weighted points
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
            Payout Per War Hit (1.0x)
          </div>
          <div className="text-2xl font-bold font-mono-num text-[#D29922] mt-1">
            {formatMoney(Math.round(valuePerWeightedPoint))}
          </div>
          <div className="text-xs font-mono-num text-[#8B949E] mt-1">
            Outside Chain Hit ({cacheConfig.outsideChainHitWeight}x):{' '}
            {formatMoney(Math.round(valuePerWeightedPoint * cacheConfig.outsideChainHitWeight))}
          </div>
        </div>
      </div>

      {/* Cache Inventory & Weighting Configurator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Cache Quantities & Market Prices */}
        <div className="lg:col-span-2 p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222A34]">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#D29922]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
                Ranked War Cache Spoils & Market Valuation
              </h3>
            </div>
            <span className="text-xs text-[#8B949E]">Edit quantities & trader buy-prices</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {
                label: 'Heavy Arms Cache',
                qtyKey: 'heavyArmsCaches',
                priceKey: 'heavyArmsCachePrice'
              },
              {
                label: 'Medium Arms Cache',
                qtyKey: 'mediumArmsCaches',
                priceKey: 'mediumArmsCachePrice'
              },
              {
                label: 'Melee Cache',
                qtyKey: 'meleeCaches',
                priceKey: 'meleeCachePrice'
              },
              {
                label: 'Armor Cache',
                qtyKey: 'armorCaches',
                priceKey: 'armorCachePrice'
              },
              {
                label: 'Small Arms Cache',
                qtyKey: 'smallArmsCaches',
                priceKey: 'smallArmsCachePrice'
              }
            ].map((item) => {
              const qty = (cacheConfig as any)[item.qtyKey] as number
              const price = (cacheConfig as any)[item.priceKey] as number
              return (
                <div
                  key={item.qtyKey}
                  className="p-2.5 rounded bg-[#0B0E11] border border-[#222A34] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#E6EDF3]">{item.label}</span>
                    <span className="text-[11px] font-mono-num text-[#3FB950]">
                      {formatMoney(qty * price, true)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#8B949E] uppercase">Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) =>
                          onUpdateCacheConfig({
                            ...cacheConfig,
                            [item.qtyKey]: Math.max(0, Number(e.target.value))
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-[#12161B] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#8B949E] uppercase">
                        Unit Price ($)
                      </label>
                      <input
                        type="number"
                        step="1000000"
                        value={price}
                        onChange={(e) =>
                          onUpdateCacheConfig({
                            ...cacheConfig,
                            [item.priceKey]: Math.max(0, Number(e.target.value))
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-[#12161B] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Extra Bonus Cash */}
            <div className="p-2.5 rounded bg-[#0B0E11] border border-[#222A34] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E6EDF3]">Extra War Bonus ($)</span>
                <span className="text-[11px] font-mono-num text-[#58A6FF]">
                  {formatMoney(cacheConfig.extraBonusCash, true)}
                </span>
              </div>
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase mb-1">
                  Additional Cash Added to Pool
                </label>
                <input
                  type="number"
                  step="10000000"
                  value={cacheConfig.extraBonusCash}
                  onChange={(e) =>
                    onUpdateCacheConfig({
                      ...cacheConfig,
                      extraBonusCash: Math.max(0, Number(e.target.value))
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-[#12161B] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Weighting & Tax Formula */}
        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34] flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[#222A34]">
            <SlidersHorizontal className="w-4 h-4 text-[#2F81F7]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
              Tax & Hit Weighting Rules
            </h3>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#8B949E]">Faction Vault Cut (%)</span>
              <span className="font-mono-num font-bold text-[#58A6FF]">
                {cacheConfig.factionTaxPercent}% ({formatMoney(factionCutCash, true)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={cacheConfig.factionTaxPercent}
              onChange={(e) =>
                onUpdateCacheConfig({
                  ...cacheConfig,
                  factionTaxPercent: Number(e.target.value)
                })
              }
              className="w-full accent-[#2F81F7] cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] text-[#8B949E] uppercase mb-1">
                Outside Hit Weight
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={cacheConfig.outsideChainHitWeight}
                onChange={(e) =>
                  onUpdateCacheConfig({
                    ...cacheConfig,
                    outsideChainHitWeight: Number(e.target.value)
                  })
                }
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#8B949E] uppercase mb-1">
                Assist Bonus ($)
              </label>
              <input
                type="number"
                step="50000"
                value={cacheConfig.assistValueCash}
                onChange={(e) =>
                  onUpdateCacheConfig({
                    ...cacheConfig,
                    assistValueCash: Number(e.target.value)
                  })
                }
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
              />
            </div>
          </div>

          <label className="flex items-center justify-between p-2.5 rounded bg-[#0B0E11] border border-[#222A34] cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#E6EDF3]">
                Deduct Faction Xanax & Meds
              </div>
              <div className="text-[10px] text-[#8B949E]">
                $842K/Xanax & $48K/Med used from Armory
              </div>
            </div>
            <input
              type="checkbox"
              checked={cacheConfig.deductSuppliesUsed}
              onChange={(e) =>
                onUpdateCacheConfig({
                  ...cacheConfig,
                  deductSuppliesUsed: e.target.checked
                })
              }
              className="w-4 h-4 accent-[#2F81F7] cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Per-Member Payout Breakdown Table */}
      <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#222A34] bg-[#181E25] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#3FB950]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
              Member War Payout Ledger & Vault Distribution
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchCreditAll}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-[#3FB950] hover:bg-[#2ea043] text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Credit All Unpaid to Vault Ledger</span>
            </button>

            <button
              onClick={handleCopyDiscordSheet}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#12161B] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] flex items-center gap-1.5 cursor-pointer"
            >
              {copiedDiscord ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#3FB950]" />
                  <span>Copied Discord Sheet!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#58A6FF]" />
                  <span>Copy Discord Summary</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#12161B] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222A34] bg-[#181E25]/60 text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                <th className="py-2.5 px-3.5">#</th>
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">War Hits (1.0x)</th>
                <th className="py-2.5 px-3">Chain Hits ({cacheConfig.outsideChainHitWeight}x)</th>
                <th className="py-2.5 px-3">Assists & Watch</th>
                <th className="py-2.5 px-3">Share %</th>
                <th className="py-2.5 px-3">Supplies Used</th>
                <th className="py-2.5 px-3">Net Payout ($)</th>
                <th className="py-2.5 px-3.5 text-right">Banker Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222A34] text-xs">
              {calculatedPayouts.map((row, idx) => {
                const { member: m } = row
                return (
                  <tr key={m.id} className="hover:bg-[#181E25]/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono-num text-[#8B949E]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#E6EDF3]">{m.name}</div>
                      <div className="text-[11px] font-mono-num text-[#8B949E]">
                        [{m.id}] • Vault: {formatMoney(m.vaultBalance, true)}
                      </div>
                    </td>

                    {/* Editable War Hits */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={m.warHits}
                        onChange={(e) =>
                          onUpdateMember(m.id, {
                            warHits: Math.max(0, Number(e.target.value))
                          })
                        }
                        className="w-16 px-2 py-1 rounded bg-[#0B0E11] border border-[#222A34] font-mono-num font-bold text-[#E6EDF3]"
                      />
                    </td>

                    {/* Editable Outside Chain Hits */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={m.outsideChainHits}
                        onChange={(e) =>
                          onUpdateMember(m.id, {
                            outsideChainHits: Math.max(0, Number(e.target.value))
                          })
                        }
                        className="w-16 px-2 py-1 rounded bg-[#0B0E11] border border-[#222A34] font-mono-num text-[#E6EDF3]"
                      />
                    </td>

                    {/* Assists & Watch */}
                    <td className="py-2.5 px-3 font-mono-num">
                      <div className="text-[#E6EDF3]">
                        {m.assists} ast • {m.chainWatchMinutes}m
                      </div>
                      <div className="text-[10px] text-[#3FB950]">
                        +{formatMoney(row.assistAndWatchCash, true)}
                      </div>
                    </td>

                    {/* Share % */}
                    <td className="py-2.5 px-3 font-mono-num">
                      <div className="font-semibold text-[#58A6FF]">
                        {row.sharePct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-[#8B949E]">
                        {row.weightedPoints.toFixed(1)} pts
                      </div>
                    </td>

                    {/* Supplies Deducted */}
                    <td className="py-2.5 px-3 font-mono-num">
                      {cacheConfig.deductSuppliesUsed ? (
                        <div>
                          <span className="text-[#F85149]">
                            -{formatMoney(row.suppliesCost, true)}
                          </span>
                          <div className="text-[10px] text-[#8B949E]">
                            {m.factionXanaxUsed} Xan, {m.factionMedsUsed} Med
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#6E7681]">Waived ($0)</span>
                      )}
                    </td>

                    {/* Net Payout */}
                    <td className="py-2.5 px-3 font-mono-num">
                      <div className="text-sm font-bold text-[#3FB950]">
                        {formatMoney(row.netPayout)}
                      </div>
                      <div className="text-[10px] text-[#8B949E]">
                        Gross: {formatMoney(row.grossMemberPayout, true)}
                      </div>
                    </td>

                    {/* Banker Actions */}
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyAmount(m.id, row.netPayout)}
                          title="Copy exact integer amount for Torn Vault give-to-user input"
                          className="px-2 py-1 rounded text-xs bg-[#181E25] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3 h-3 text-[#3FB950]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy $</span>
                        </button>

                        {m.paidOutWar ? (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/40 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              onUpdateMember(m.id, {
                                vaultBalance: m.vaultBalance + row.netPayout,
                                paidOutWar: true
                              })
                            }
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-[#2F81F7] hover:bg-[#388BFD] text-white cursor-pointer"
                          >
                            Credit Vault
                          </button>
                        )}

                        <a
                          href="https://www.torn.com/factions.php?step=your#/tab=controls&option=give-to-user"
                          target="_blank"
                          rel="noreferrer"
                          title="Open Torn Faction Vault Controls"
                          className="p-1.5 rounded bg-[#181E25] hover:bg-[#222A34] text-[#8B949E] hover:text-[#E6EDF3] border border-[#222A34]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
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
    </div>
  )
}
