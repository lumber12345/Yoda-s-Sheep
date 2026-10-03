import React, { useState } from 'react'
import {
  Shield,
  PackageCheck,
  Landmark,
  AlertTriangle,
  Plus,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react'
import {
  ArmoryLoan,
  ArmoryConsumableStock,
  FactionMember
} from '../types/torn'
import { formatMoney } from '../utils/formatters'

interface ArmoryAndVaultModuleProps {
  loans: ArmoryLoan[]
  consumables: ArmoryConsumableStock[]
  members: FactionMember[]
  vaultTotalCash: number
  vaultPoints: number
  nowSec: number
  onReturnLoan: (loanId: string) => void
  onCreateLoan: (
    itemName: string,
    rarity: ArmoryLoan['rarity'],
    bonusPerk: string,
    estimatedValue: number,
    borrowerId: number
  ) => void
  onRestockConsumable: (stockId: string, delta: number) => void
  onAdjustMemberVault: (memberId: number, delta: number) => void
}

export const ArmoryAndVaultModule: React.FC<ArmoryAndVaultModuleProps> = ({
  loans,
  consumables,
  members,
  vaultTotalCash,
  vaultPoints,
  nowSec,
  onReturnLoan,
  onCreateLoan,
  onRestockConsumable,
  onAdjustMemberVault
}) => {
  const [showNewLoanForm, setShowNewLoanForm] = useState(false)
  const [newItemName, setNewItemName] = useState('Enfield SA-80')
  const [newRarity, setNewRarity] = useState<ArmoryLoan['rarity']>('Orange (RW)')
  const [newPerk, setNewPerk] = useState('Revitalize +14% Energy')
  const [newValue, setNewValue] = useState('2400000000')
  const [newBorrowerId, setNewBorrowerId] = useState<number>(members[0]?.id || 1492018)
  const [vaultCustomDelta, setVaultCustomDelta] = useState<Record<number, string>>({})

  const activeLoans = loans.filter((l) => !l.returned)
  const totalLoanedGearValue = activeLoans.reduce((sum, l) => sum + l.estimatedValue, 0)

  const totalConsumablesValue = consumables.reduce(
    (sum, c) => sum + c.quantity * c.unitPrice,
    0
  )

  const memberVaultLiability = members.reduce((sum, m) => sum + m.vaultBalance, 0)
  const netFreeFactionCash = vaultTotalCash - memberVaultLiability

  const handleCreateLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateLoan(
      newItemName,
      newRarity,
      newPerk,
      Number(newValue) || 500_000_000,
      newBorrowerId
    )
    setShowNewLoanForm(false)
  }

  return (
    <div className="space-y-5">
      {/* Top 3 Asset & Liquidity KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              Loaned RW Weapons & Armor
            </span>
            <Shield className="w-4 h-4 text-[#D29922]" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-[#E6EDF3] mt-1.5">
            {formatMoney(totalLoanedGearValue, true)}
          </div>
          <div className="text-xs text-[#8B949E] mt-1">
            {activeLoans.length} active high-tier Ranked War item loans
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              Consumable Armory Stockpile
            </span>
            <PackageCheck className="w-4 h-4 text-[#3FB950]" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-[#3FB950] mt-1.5">
            {formatMoney(totalConsumablesValue, true)}
          </div>
          <div className="text-xs text-[#8B949E] mt-1">
            Xanax, Blood Bags, Temporaries & Energy Cans
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#12161B] border border-[#222A34]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              Faction Vault Free Cash
            </span>
            <Landmark className="w-4 h-4 text-[#A371F7]" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-[#58A6FF] mt-1.5">
            {formatMoney(netFreeFactionCash, true)}
          </div>
          <div className="text-xs font-mono-num text-[#8B949E] mt-1">
            Vault: {formatMoney(vaultTotalCash, true)} − Member Debt: {formatMoney(memberVaultLiability, true)}
          </div>
        </div>
      </div>

      {/* Section 1: Ranked War Armory Loans & Recall Tracker */}
      <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#222A34] bg-[#181E25] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
              Ranked War Weapons & Armor Loan Registry
            </h2>
            <p className="text-xs text-[#8B949E]">
              Tracks who holds faction RW gear and alerts Quartermasters if a borrower goes inactive
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewLoanForm(!showNewLoanForm)}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-[#2F81F7] hover:bg-[#388BFD] text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log New Armory Loan</span>
            </button>

            <a
              href="https://www.torn.com/factions.php?step=your#/tab=armoury"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#12161B] hover:bg-[#222A34] text-[#E6EDF3] border border-[#222A34] flex items-center gap-1"
            >
              <span>Torn Armory</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {showNewLoanForm && (
          <form
            onSubmit={handleCreateLoanSubmit}
            className="p-4 bg-[#181E25] border-b border-[#2F81F7]/40 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
                Weapon / Armor Name
              </label>
              <input
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
                RW Rarity Tier
              </label>
              <select
                value={newRarity}
                onChange={(e) => setNewRarity(e.target.value as ArmoryLoan['rarity'])}
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
              >
                <option value="Yellow (RW)">Yellow (RW)</option>
                <option value="Orange (RW)">Orange (RW)</option>
                <option value="Red (RW)">Red (RW)</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
                Bonus Perk
              </label>
              <input
                type="text"
                value={newPerk}
                onChange={(e) => setNewPerk(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
                Market Value ($)
              </label>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#8B949E] mb-1">
                Borrower
              </label>
              <select
                value={newBorrowerId}
                onChange={(e) => setNewBorrowerId(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0E11] border border-[#222A34] text-xs text-[#E6EDF3]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} [{m.id}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-[#3FB950] text-white cursor-pointer"
              >
                Issue Loan
              </button>
              <button
                type="button"
                onClick={() => setShowNewLoanForm(false)}
                className="py-1.5 px-2.5 rounded text-xs bg-[#12161B] text-[#8B949E] border border-[#222A34] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222A34] bg-[#181E25]/60 text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                <th className="py-2.5 px-4">Item & RW Bonus Perk</th>
                <th className="py-2.5 px-3">Est. Value</th>
                <th className="py-2.5 px-3">Borrower & Activity</th>
                <th className="py-2.5 px-3">Loan Status</th>
                <th className="py-2.5 px-4 text-right">Quartermaster Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222A34] text-xs">
              {loans.map((loan) => {
                const borrower = members.find((m) => m.id === loan.borrowerId)
                const isOverdue = !loan.returned && loan.dueAt < nowSec
                const isInactiveBorrower =
                  borrower && nowSec - borrower.lastAction.timestamp > 86400

                return (
                  <tr
                    key={loan.id}
                    className={
                      loan.returned
                        ? 'opacity-50 bg-[#0B0E11]'
                        : isOverdue || isInactiveBorrower
                        ? 'bg-[#F85149]/[0.06]'
                        : 'hover:bg-[#181E25]/60'
                    }
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            loan.rarity.includes('Red')
                              ? 'bg-[#F85149]/20 text-[#F85149] border-[#F85149]/40'
                              : loan.rarity.includes('Orange')
                              ? 'bg-[#D29922]/20 text-[#D29922] border-[#D29922]/40'
                              : 'bg-[#E3B341]/15 text-[#E3B341] border-[#E3B341]/40'
                          }`}
                        >
                          {loan.rarity}
                        </span>
                        <span className="font-bold text-[#E6EDF3]">{loan.itemName}</span>
                      </div>
                      <div className="text-[11px] text-[#58A6FF] font-mono-num mt-0.5">
                        Perk: {loan.bonusPerk}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono-num font-bold text-[#E6EDF3]">
                      {formatMoney(loan.estimatedValue, true)}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#E6EDF3]">
                        {loan.borrowerName}{' '}
                        <span className="font-mono-num text-[#8B949E] font-normal">
                          [{loan.borrowerId}]
                        </span>
                      </div>
                      {borrower && (
                        <div className="text-[11px] text-[#8B949E]">
                          Last Action: {borrower.lastAction.relative} ({borrower.lastAction.status})
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {loan.returned ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/40">
                          Returned to Armory ✓
                        </span>
                      ) : isOverdue || isInactiveBorrower ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F85149]/20 text-[#F85149] border border-[#F85149]/40 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          OVERDUE / INACTIVE HOLDER — RECALL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#2F81F7]/15 text-[#58A6FF] border border-[#2F81F7]/40">
                          Active Loan ({loan.purpose})
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      {!loan.returned && (
                        <button
                          onClick={() => onReturnLoan(loan.id)}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-[#181E25] hover:bg-[#222A34] text-[#3FB950] border border-[#3FB950]/40 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Mark Returned</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 2-Column Grid: Consumables Runway + Member Vault Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Consumable Stockpiles */}
        <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222A34] bg-[#181E25] flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
              Armory Consumables & War Runway
            </h3>
            <span className="text-xs text-[#8B949E]">Click +Restock after bazaar runs</span>
          </div>

          <div className="divide-y divide-[#222A34]">
            {consumables.map((c) => {
              const isLow = c.quantity < c.minThreshold
              const runwayDays =
                c.dailyBurnRate > 0 ? (c.quantity / c.dailyBurnRate).toFixed(1) : '99+'

              return (
                <div
                  key={c.id}
                  className={`px-4 py-2.5 flex items-center justify-between gap-2 ${
                    isLow ? 'bg-[#F85149]/[0.06]' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#E6EDF3]">{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181E25] text-[#8B949E] border border-[#222A34]">
                        {c.category}
                      </span>
                      {isLow && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F85149]/20 text-[#F85149] border border-[#F85149]/40 font-bold">
                          LOW STOCK
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#8B949E] font-mono-num mt-0.5">
                      Min Req: {c.minThreshold.toLocaleString()} • Burn: ~{c.dailyBurnRate}/d •{' '}
                      <span className={Number(runwayDays) < 2.5 ? 'text-[#F85149]' : 'text-[#3FB950]'}>
                        {runwayDays}d War Runway
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right font-mono-num">
                      <div
                        className={`text-sm font-bold ${
                          isLow ? 'text-[#F85149]' : 'text-[#E6EDF3]'
                        }`}
                      >
                        {c.quantity.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#8B949E]">
                        {formatMoney(c.quantity * c.unitPrice, true)}
                      </div>
                    </div>

                    <button
                      onClick={() => onRestockConsumable(c.id, 250)}
                      className="px-2 py-1 rounded text-xs font-semibold bg-[#181E25] hover:bg-[#222A34] text-[#3FB950] border border-[#222A34] cursor-pointer"
                    >
                      +250
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Member Faction Vault Ledger */}
        <div className="rounded-lg bg-[#12161B] border border-[#222A34] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222A34] bg-[#181E25] flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E6EDF3]">
              Member Faction Vault Balances (Ghost Banking)
            </h3>
            <span className="text-xs font-mono-num text-[#58A6FF]">
              Total Owed: {formatMoney(memberVaultLiability, true)}
            </span>
          </div>

          <div className="divide-y divide-[#222A34] max-h-[460px] overflow-y-auto">
            {members.map((m) => {
              const deltaInput = vaultCustomDelta[m.id] || '25000000'
              return (
                <div
                  key={m.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[#181E25]/60"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#E6EDF3]">
                      {m.name}{' '}
                      <span className="text-xs font-mono-num text-[#8B949E] font-normal">
                        [{m.id}]
                      </span>
                    </div>
                    <div className="text-xs font-mono-num text-[#3FB950] font-bold">
                      {formatMoney(m.vaultBalance)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="5000000"
                      value={deltaInput}
                      onChange={(e) =>
                        setVaultCustomDelta({
                          ...vaultCustomDelta,
                          [m.id]: e.target.value
                        })
                      }
                      className="w-24 px-2 py-1 rounded bg-[#0B0E11] border border-[#222A34] text-xs font-mono-num text-[#E6EDF3]"
                    />
                    <button
                      onClick={() => onAdjustMemberVault(m.id, Number(deltaInput) || 0)}
                      className="px-2 py-1 rounded text-xs font-semibold bg-[#3FB950]/15 hover:bg-[#3FB950]/25 text-[#3FB950] border border-[#3FB950]/40 cursor-pointer"
                    >
                      +Dep
                    </button>
                    <button
                      onClick={() => onAdjustMemberVault(m.id, -(Number(deltaInput) || 0))}
                      className="px-2 py-1 rounded text-xs font-semibold bg-[#F85149]/15 hover:bg-[#F85149]/25 text-[#F85149] border border-[#F85149]/40 cursor-pointer"
                    >
                      −Pay
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
