import { useEffect, useState } from 'react'
import type { DashboardAggregate, Department } from '../lib/types.ts'
import { api, currentMonthKey, formatCurrency, formatPercent } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { DepartmentToggle, MonthSelect } from '../components/Pickers.tsx'

export function DashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [department, setDepartment] = useState<Department>(user!.department)
  const [month, setMonth] = useState(currentMonthKey())
  const [data, setData] = useState<DashboardAggregate | null>(null)

  useEffect(() => {
    api
      .get<DashboardAggregate>(`/api/aggregate/dashboard?department=${encodeURIComponent(department)}&month=${month}`)
      .then(setData)
      .catch((e: Error) => showToast(e.message, 'warning'))
  }, [department, month, showToast])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DepartmentToggle value={department} onChange={setDepartment} />
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      {!data ? (
        <p className="text-sm text-[var(--muted)]">読み込み中…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="当月目標" value={formatCurrency(data.goal)} />
            <StatCard label="当月累計売上（全体）" value={formatCurrency(data.overallCumulative)} />
            <StatCard label="代表個人累計" value={formatCurrency(data.personalCumulative)} />
            <StatCard label="目標とのGAP" value={formatCurrency(data.gap)} tone={data.gap > 0 ? 'bad' : 'good'} />
            <StatCard label="達成率" value={formatPercent(data.achievementRate)} tone={data.achievementRate >= 1 ? 'good' : 'neutral'} />
            <StatCard label="残営業日" value={`${data.remainingBusinessDays}日`} />
            <StatCard label="1日必達" value={formatCurrency(data.dailyRequired)} />
            <StatCard label="決済手数料（累計）" value={formatCurrency(data.paymentFeeCumulative)} tone="bad" />
            <StatCard label="手数料控除後 実収入" value={formatCurrency(data.netRevenueCumulative)} />
            <StatCard label="経費（累計）" value={formatCurrency(data.expenseCumulative)} />
            <StatCard label="人件費（累計）" value={formatCurrency(data.laborCostCumulative)} />
            <StatCard label="スタッフインセン（累計）" value={formatCurrency(data.staffIncentiveCumulative)} />
            <StatCard label="来客数（累計）" value={`${data.customersCumulative}名 / ${data.groupsCumulative}組`} />
            <StatCard label="新規（累計）" value={`${data.newCustomersCumulative}名`} />
            <StatCard label="客単価 / 組単価" value={`${formatCurrency(data.unitPricePerCustomer)} / ${formatCurrency(data.unitPricePerGroup)}`} />
            <StatCard label="当月利益（暫定）" value={formatCurrency(data.monthlyProfit)} tone={data.monthlyProfit >= 0 ? 'good' : 'bad'} />
            <StatCard label="個人インセン" value={formatCurrency(data.personalIncentive)} />
            <StatCard label="会社利益（暫定）" value={formatCurrency(data.companyProfit)} tone={data.companyProfit >= 0 ? 'good' : 'bad'} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-white">スタッフ別 当月売上累計</h3>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">スタッフ</th>
                    <th className="px-4 py-2 text-right">売上累計</th>
                    <th className="px-4 py-2 text-right">来客累計</th>
                    <th className="px-4 py-2 text-right">インセン（10%・税抜）</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.staffCumulative.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-[var(--muted)]">実績なし</td></tr>
                  )}
                  {data.staffCumulative.map((s) => (
                    <tr key={s.staffId} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-2 text-white">{s.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(s.sales)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s.customerCount}名</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatCurrency((s.sales / (1 + data.rates.taxRate)) * data.rates.staffIncentiveRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
