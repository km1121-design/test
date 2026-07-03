import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../ToastProvider'
import { genId } from '../../lib/id'
import { formatMonthLabel, listRecentMonthKeys } from '../../lib/dateUtils'
import type { DepartmentGoal, RateMaster, StaffMember } from '../../types'
import { NumberField, SelectField, TextField } from '../form/FormControls'

const DEPARTMENTS = ['1部', '2部'] as const
const ROLES = ['代表', 'スタッフ'] as const

function StaffMasterSection() {
  const { data, updateStaff } = useAppData()
  const { showToast } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>(data.staff)

  useEffect(() => setStaff(data.staff), [data.staff])

  const update = (id: string, patch: Partial<StaffMember>) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  return (
    <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
      <h2 className="text-sm font-bold text-white">スタッフマスター</h2>
      <div className="mt-3 flex flex-col gap-3">
        {staff.map((s) => (
          <div key={s.id} className="grid grid-cols-1 gap-2 rounded-md border border-white/10 p-3 sm:grid-cols-6">
            <TextField label="氏名" value={s.name} onChange={(v) => update(s.id, { name: v })} />
            <SelectField label="役割" value={s.role} onChange={(v) => update(s.id, { role: v })} options={ROLES.map((r) => ({ value: r, label: r }))} />
            <SelectField
              label="部門"
              value={s.department}
              onChange={(v) => update(s.id, { department: v })}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            />
            <NumberField
              label="時給（上書き・任意）"
              value={s.hourlyWageOverride ?? 0}
              onChange={(v) => update(s.id, { hourlyWageOverride: v || undefined })}
              suffix="円"
            />
            <NumberField label="個人月間目標" value={s.monthlyGoal} onChange={(v) => update(s.id, { monthlyGoal: v })} suffix="円" />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setStaff((prev) => prev.filter((x) => x.id !== s.id))}
                className="rounded-md border border-white/10 p-2 text-[var(--text-secondary)] hover:bg-white/5"
                aria-label="スタッフを削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setStaff((prev) => [
              ...prev,
              { id: genId(), name: '新規スタッフ', role: 'スタッフ', department: '1部', monthlyGoal: 0 },
            ])
          }
          className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-white/20 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5"
        >
          <Plus className="h-3.5 w-3.5" />
          スタッフを追加
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          updateStaff(staff)
          showToast('スタッフマスターを保存しました', 'success')
        }}
        className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400"
      >
        保存
      </button>
    </section>
  )
}

function DepartmentGoalSection() {
  const { data, updateDepartmentGoals } = useAppData()
  const { showToast } = useToast()
  const months = listRecentMonthKeys(6).reverse()

  const [goals, setGoals] = useState<DepartmentGoal[]>(data.departmentGoals)
  useEffect(() => setGoals(data.departmentGoals), [data.departmentGoals])

  const goalFor = (dept: (typeof DEPARTMENTS)[number], month: string): DepartmentGoal =>
    goals.find((g) => g.department === dept && g.month === month) ?? { department: dept, month, monthlySalesGoal: 0, businessDays: 0 }

  const update = (dept: (typeof DEPARTMENTS)[number], month: string, patch: Partial<DepartmentGoal>) => {
    setGoals((prev) => {
      const exists = prev.some((g) => g.department === dept && g.month === month)
      if (!exists) return [...prev, { ...goalFor(dept, month), ...patch }]
      return prev.map((g) => (g.department === dept && g.month === month ? { ...g, ...patch } : g))
    })
  }

  return (
    <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
      <h2 className="text-sm font-bold text-white">部門月間目標マスター</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-xs text-[var(--muted)] uppercase">
            <tr>
              <th className="px-2 py-2 text-left">月</th>
              <th className="px-2 py-2 text-left">部門</th>
              <th className="px-2 py-2 text-left">当月目標売上</th>
              <th className="px-2 py-2 text-left">営業日数</th>
            </tr>
          </thead>
          <tbody>
            {months.flatMap((month) =>
              DEPARTMENTS.map((dept) => {
                const g = goalFor(dept, month)
                return (
                  <tr key={`${dept}-${month}`} className="border-t border-white/5">
                    <td className="px-2 py-2 text-white">{formatMonthLabel(month)}</td>
                    <td className="px-2 py-2">{dept}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-32 rounded-md border border-white/10 bg-[var(--surface-3)] px-2 py-1 text-sm text-white outline-none focus:border-amber-500/60"
                        value={g.monthlySalesGoal}
                        onChange={(e) => update(dept, month, { monthlySalesGoal: e.target.valueAsNumber || 0 })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-24 rounded-md border border-white/10 bg-[var(--surface-3)] px-2 py-1 text-sm text-white outline-none focus:border-amber-500/60"
                        value={g.businessDays}
                        onChange={(e) => update(dept, month, { businessDays: e.target.valueAsNumber || 0 })}
                      />
                    </td>
                  </tr>
                )
              }),
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => {
          updateDepartmentGoals(goals)
          showToast('部門月間目標を保存しました', 'success')
        }}
        className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400"
      >
        保存
      </button>
    </section>
  )
}

function RateMasterSection() {
  const { data, updateRates } = useAppData()
  const { showToast } = useToast()
  const [rates, setRates] = useState<RateMaster>(data.rates)
  useEffect(() => setRates(data.rates), [data.rates])

  return (
    <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
      <h2 className="text-sm font-bold text-white">パラメータマスター（条件）</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="消費税率" value={rates.taxRate * 100} onChange={(v) => setRates((p) => ({ ...p, taxRate: v / 100 }))} suffix="%" />
        <NumberField
          label="ハイエース売上インセン率"
          value={rates.hiaceIncentiveRate * 100}
          onChange={(v) => setRates((p) => ({ ...p, hiaceIncentiveRate: v / 100 }))}
          suffix="%"
        />
        <NumberField
          label="本部売上インセン率"
          value={rates.hqIncentiveRate * 100}
          onChange={(v) => setRates((p) => ({ ...p, hqIncentiveRate: v / 100 }))}
          suffix="%"
        />
        <NumberField
          label="スタッフ売上インセン率"
          value={rates.staffIncentiveRate * 100}
          onChange={(v) => setRates((p) => ({ ...p, staffIncentiveRate: v / 100 }))}
          suffix="%"
        />
        <NumberField label="1部 時給" value={rates.hourlyWageDept1} onChange={(v) => setRates((p) => ({ ...p, hourlyWageDept1: v }))} suffix="円" />
        <NumberField label="2部 時給" value={rates.hourlyWageDept2} onChange={(v) => setRates((p) => ({ ...p, hourlyWageDept2: v }))} suffix="円" />
      </div>
      <button
        type="button"
        onClick={() => {
          updateRates(rates)
          showToast('パラメータを保存しました', 'success')
        }}
        className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400"
      >
        保存
      </button>
    </section>
  )
}

export function MasterTab() {
  return (
    <div className="flex flex-col gap-5">
      <StaffMasterSection />
      <DepartmentGoalSection />
      <RateMasterSection />
    </div>
  )
}
