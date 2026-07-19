import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { MonthSelect } from '../common/MonthSelect'
import { StatCard } from '../common/StatCard'
import { SelectField } from '../form/FormControls'
import { currentMonthKey, formatCurrency, monthKeyOf } from '../../lib/dateUtils'
import {
  companyProfit,
  dedupeLatestRepReports,
  hiaceIncentiveCumulativeForRep,
  hiaceIncentiveForReport,
  hqIncentiveCumulative,
  monthlyCumulativeSales,
  monthlyProfit,
  overallTotalSales,
  personalIncentiveForRep,
  personalTotalSales,
} from '../../lib/calculations'

export function RepProgressTab() {
  const { data } = useAppData()
  const reps = data.staff.filter((s) => s.role === '代表')
  const [repId, setRepId] = useState(reps[0]?.id ?? '')
  const [month, setMonth] = useState(currentMonthKey())
  const rep = reps.find((r) => r.id === repId) ?? reps[0]

  if (!rep) {
    return <p className="text-sm text-[var(--muted)]">マスター管理画面で代表を登録してください。</p>
  }

  const department = rep.department
  const repReportsThisMonth = dedupeLatestRepReports(data.repReports)
    .filter((r) => r.department === department && r.reporterName === rep.name && monthKeyOf(r.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date))

  const personalSalesCumulative = repReportsThisMonth.reduce((sum, r) => sum + personalTotalSales(r), 0)
  const departmentSalesCumulative = monthlyCumulativeSales(data.repReports, department, month)
  const hiaceIncentive = hiaceIncentiveCumulativeForRep(data.repReports, rep.name, department, month, data.rates)
  const hqIncentive = hqIncentiveCumulative(data.repReports, department, month, data.rates)
  const personalIncentive = personalIncentiveForRep(data.repReports, rep.name, department, month, data.rates)
  const profit = monthlyProfit(data.repReports, data.staffReports, data.staff, data.rates, department, month)
  const companyProfitAmount = companyProfit(data.repReports, data.staffReports, data.staff, data.rates, department, month, rep.name)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SelectField label="代表" value={repId} onChange={setRepId} options={reps.map((r) => ({ value: r.id, label: `${r.name}（${r.department}）` }))} />
        <div className="pt-5">
          <MonthSelect value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="個人当日総売上 月間累計" value={formatCurrency(personalSalesCumulative)} />
        <StatCard label="部門 当月累計売上" value={formatCurrency(departmentSalesCumulative)} />
        <StatCard label="ハイエース売上インセン累計" value={formatCurrency(hiaceIncentive)} />
        <StatCard label="本部売上インセン累計" value={formatCurrency(hqIncentive)} />
        <StatCard label="個人インセン（暫定）" value={formatCurrency(personalIncentive)} />
        <StatCard label="当月利益（部門・暫定）" value={formatCurrency(profit)} tone={profit >= 0 ? 'good' : 'bad'} />
        <StatCard label="会社利益（暫定）" value={formatCurrency(companyProfitAmount)} tone={companyProfitAmount >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)] uppercase">
            <tr>
              <th className="px-4 py-3 text-left">日付</th>
              <th className="px-4 py-3 text-right">個人当日総売上</th>
              <th className="px-4 py-3 text-right">ハイエース売上インセン</th>
              <th className="px-4 py-3 text-right">全体当日総売上</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {repReportsThisMonth.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--muted)]">
                  この代表・月の日報データはまだありません。
                </td>
              </tr>
            )}
            {repReportsThisMonth.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2 font-medium text-white">{r.date}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(personalTotalSales(r))}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(hiaceIncentiveForReport(r, data.rates))}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(overallTotalSales(r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
