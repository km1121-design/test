import { useEffect, useState } from 'react'
import type { SessionUser, StaffAggregate } from '../lib/types.ts'
import { api, currentMonthKey, formatCurrency } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { MonthSelect } from '../components/Pickers.tsx'
import { SelectField } from '../components/FormControls.tsx'

export function StaffProgressPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isRep = user!.role === '代表'
  const [staffList, setStaffList] = useState<SessionUser[]>([])
  const [staffId, setStaffId] = useState(isRep ? '' : user!.id)
  const [month, setMonth] = useState(currentMonthKey())
  const [data, setData] = useState<StaffAggregate | null>(null)

  useEffect(() => {
    if (!isRep) return
    api.get<SessionUser[]>('/api/auth/users').then((users) => {
      const staff = users.filter((u) => u.role === 'スタッフ')
      setStaffList(staff)
      setStaffId((cur) => cur || staff[0]?.id || '')
    })
  }, [isRep])

  useEffect(() => {
    if (!staffId) return
    api
      .get<StaffAggregate>(`/api/aggregate/staff?staffId=${staffId}&month=${month}`)
      .then(setData)
      .catch((e: Error) => showToast(e.message, 'warning'))
  }, [staffId, month, showToast])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        {isRep && staffList.length > 0 && (
          <SelectField label="スタッフ" value={staffId} onChange={setStaffId} options={staffList.map((s) => ({ value: s.id, label: `${s.name}（${s.department}）` }))} />
        )}
        <div className="pt-0.5">
          <MonthSelect value={month} onChange={setMonth} />
        </div>
      </div>

      {!data ? (
        <p className="text-sm text-[var(--muted)]">読み込み中…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="当月目標" value={formatCurrency(data.monthlyGoal)} />
            <StatCard label="当月売上" value={formatCurrency(data.monthlySales)} />
            <StatCard label="スタッフインセン" value={formatCurrency(data.incentive)} />
            {data.hourlyWage != null && <StatCard label="時給（代表のみ）" value={formatCurrency(data.hourlyWage)} />}
            {data.workedMinutes != null && (
              <StatCard label="実働時間（代表のみ）" value={`${Math.floor(data.workedMinutes / 60)}時間${data.workedMinutes % 60}分`} />
            )}
            {data.productivity != null && (
              <StatCard label="生産性（代表のみ）" value={formatCurrency(data.productivity)} tone={data.productivity >= 0 ? 'good' : 'bad'} />
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)] uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">日付</th>
                  <th className="px-3 py-2 text-left">勤務</th>
                  <th className="px-3 py-2 text-right">当日売上</th>
                  <th className="px-3 py-2 text-left">指名客</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.dailyReports.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--muted)]">この月の日報はまだありません。</td></tr>
                )}
                {data.dailyReports.map((r) => (
                  <tr key={r.date} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2 font-medium text-white">{r.date}</td>
                    <td className="px-3 py-2">{r.shiftStart}〜{r.shiftEnd}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.todaySales)}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {r.namedCustomers.map((c) => `${c.customerName} ${formatCurrency(c.amount)}`).join('、') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
