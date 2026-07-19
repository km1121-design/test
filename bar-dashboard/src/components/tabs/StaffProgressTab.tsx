import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { MonthSelect } from '../common/MonthSelect'
import { StatCard } from '../common/StatCard'
import { SelectField } from '../form/FormControls'
import { currentMonthKey, formatCurrency, monthKeyOf } from '../../lib/dateUtils'
import {
  computeWorkedMinutes,
  dedupeLatestStaffReports,
  hourlyWageFor,
  monthlySalesForStaff,
  staffIncentiveCumulative,
  staffProductivity,
  workedMinutesForStaff,
} from '../../lib/calculations'

export function StaffProgressTab() {
  const { data } = useAppData()
  const staffList = data.staff.filter((s) => s.role === 'スタッフ')
  const [staffId, setStaffId] = useState(staffList[0]?.id ?? '')
  const [month, setMonth] = useState(currentMonthKey())
  const staff = staffList.find((s) => s.id === staffId) ?? staffList[0]

  if (!staff) {
    return <p className="text-sm text-[var(--muted)]">マスター管理画面でスタッフを登録してください。</p>
  }

  const reportsThisMonth = dedupeLatestStaffReports(data.staffReports)
    .filter((r) => r.staffId === staff.id && monthKeyOf(r.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date))

  const monthlySales = monthlySalesForStaff(data.staffReports, staff.id, month)
  const wage = hourlyWageFor(staff, data.rates)
  const incentive = staffIncentiveCumulative(data.staffReports, staff.id, month, data.rates)
  const productivity = staffProductivity(data.staffReports, staff, data.rates, month)
  const workedMinutes = workedMinutesForStaff(data.staffReports, staff.id, month)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SelectField
          label="スタッフ"
          value={staffId}
          onChange={setStaffId}
          options={staffList.map((s) => ({ value: s.id, label: `${s.name}（${s.department}）` }))}
        />
        <div className="pt-5">
          <MonthSelect value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="当月目標" value={formatCurrency(staff.monthlyGoal)} />
        <StatCard label="当月売上" value={formatCurrency(monthlySales)} />
        <StatCard label="時給" value={formatCurrency(wage)} />
        <StatCard label="実働時間（当月累計）" value={`${Math.floor(workedMinutes / 60)}時間${workedMinutes % 60}分`} />
        <StatCard label="スタッフ売上インセン" value={formatCurrency(incentive)} />
        <StatCard label="生産性（個人利益）" value={formatCurrency(productivity)} tone={productivity >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)] uppercase">
            <tr>
              <th className="px-4 py-3 text-left">日付</th>
              <th className="px-4 py-3 text-left">勤務時間</th>
              <th className="px-4 py-3 text-right">実働</th>
              <th className="px-4 py-3 text-right">当日売上</th>
              <th className="px-4 py-3 text-right">既存/新規</th>
              <th className="px-4 py-3 text-right">クロスセル</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {reportsThisMonth.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--muted)]">
                  このスタッフ・月の日報データはまだありません。
                </td>
              </tr>
            )}
            {reportsThisMonth.map((r) => {
              const minutes = computeWorkedMinutes(r.shiftStart, r.shiftEnd, r.breakMinutes)
              return (
                <tr key={r.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-2 font-medium text-white">{r.date}</td>
                  <td className="px-4 py-2">
                    {r.shiftStart}〜{r.shiftEnd}（休憩{r.breakMinutes}分）
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {Math.floor(minutes / 60)}時間{minutes % 60}分
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.todaySales)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.existingCustomers} / {r.newCustomers}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.crossSellCount}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
