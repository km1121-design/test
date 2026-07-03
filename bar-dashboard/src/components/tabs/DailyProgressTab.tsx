import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { DepartmentToggle } from '../common/DepartmentToggle'
import { MonthSelect } from '../common/MonthSelect'
import { buildDailyProgressRows } from '../../lib/calculations'
import { currentMonthKey, formatCurrency, formatPercent } from '../../lib/dateUtils'
import type { Department } from '../../types'

export function DailyProgressTab() {
  const { data } = useAppData()
  const [department, setDepartment] = useState<Department>('1部')
  const [month, setMonth] = useState(currentMonthKey())

  const rows = buildDailyProgressRows(data, department, month)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DepartmentToggle value={department} onChange={setDepartment} />
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)] uppercase">
            <tr>
              <th className="px-4 py-3 text-left">日付</th>
              <th className="px-4 py-3 text-right">当日売上</th>
              <th className="px-4 py-3 text-right">当日経費</th>
              <th className="px-4 py-3 text-right">当日人件費</th>
              <th className="px-4 py-3 text-right">当日利益（税抜概算）</th>
              <th className="px-4 py-3 text-right">累計売上</th>
              <th className="px-4 py-3 text-right">目標とのGAP</th>
              <th className="px-4 py-3 text-right">達成率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--muted)]">
                  この部門・月の日報データはまだありません。
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.date} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2 font-medium text-white">{row.date}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.sales)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.expense)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.laborCost)}</td>
                <td
                  className={`px-4 py-2 text-right tabular-nums ${row.dailyProfit >= 0 ? 'text-[var(--status-good)]' : 'text-[var(--status-critical)]'}`}
                >
                  {formatCurrency(row.dailyProfit)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.cumulativeSales)}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${row.gap > 0 ? 'text-[var(--status-critical)]' : 'text-[var(--status-good)]'}`}>
                  {formatCurrency(row.gap)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatPercent(row.achievementRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
