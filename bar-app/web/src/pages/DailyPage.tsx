import { useEffect, useState } from 'react'
import type { DailyRow, Department } from '../lib/types.ts'
import { api, currentMonthKey, formatCurrency } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'
import { DepartmentToggle, MonthSelect } from '../components/Pickers.tsx'

export function DailyPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [department, setDepartment] = useState<Department>(user!.department)
  const [month, setMonth] = useState(currentMonthKey())
  const [rows, setRows] = useState<DailyRow[]>([])

  useEffect(() => {
    api
      .get<{ rows: DailyRow[] }>(`/api/aggregate/daily?department=${encodeURIComponent(department)}&month=${month}`)
      .then((d) => setRows(d.rows))
      .catch((e: Error) => showToast(e.message, 'warning'))
  }, [department, month, showToast])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DepartmentToggle value={department} onChange={setDepartment} />
        <MonthSelect value={month} onChange={setMonth} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)] uppercase">
            <tr>
              <th className="px-3 py-2 text-left">日付</th>
              <th className="px-3 py-2 text-right">全体売上</th>
              <th className="px-3 py-2 text-right">代表個人</th>
              <th className="px-3 py-2 text-right">決済手数料</th>
              <th className="px-3 py-2 text-right">実収入</th>
              <th className="px-3 py-2 text-right">経費</th>
              <th className="px-3 py-2 text-right">人件費</th>
              <th className="px-3 py-2 text-right">当日利益</th>
              <th className="px-3 py-2 text-right">累計売上</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-[var(--muted)]">この部門・月の日報はまだありません。</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.date} className="hover:bg-white/[0.03]">
                <td className="px-3 py-2 font-medium text-white">{r.date}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.overallSales)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.personalSales)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--status-serious)]">{formatCurrency(r.paymentFee)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.netRevenue)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.expense)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.laborCost)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.dailyProfit >= 0 ? 'text-[var(--status-good)]' : 'text-[var(--status-critical)]'}`}>{formatCurrency(r.dailyProfit)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
