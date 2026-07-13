import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Department, DepartmentGoal, RateMaster, StaffMember, StaffRole } from '../lib/types.ts'
import { api, formatMonthLabel } from '../lib/api.ts'
import { useToast } from '../components/ToastProvider.tsx'
import { NumberField, SelectField, TextField } from '../components/FormControls.tsx'

function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s${Date.now()}`
}

interface MasterData {
  staff: StaffMember[]
  goals: DepartmentGoal[]
  rates: RateMaster
}

export function MasterPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<MasterData | null>(null)

  useEffect(() => {
    api.get<MasterData>('/api/master/all').then(setData).catch((e: Error) => showToast(e.message, 'warning'))
  }, [showToast])

  if (!data) return <p className="text-sm text-[var(--muted)]">読み込み中…</p>

  const saveRates = async () => {
    try {
      await api.put('/api/master/rates', data.rates)
      showToast('パラメータを保存しました', 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }
  const saveGoals = async () => {
    try {
      await api.put('/api/master/goals', data.goals)
      showToast('部門目標を保存しました', 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  const setRate = (patch: Partial<RateMaster>) => setData((d) => (d ? { ...d, rates: { ...d.rates, ...patch } } : d))
  const setGoal = (i: number, patch: Partial<DepartmentGoal>) =>
    setData((d) => (d ? { ...d, goals: d.goals.map((g, idx) => (idx === i ? { ...g, ...patch } : g)) } : d))
  const setStaff = (id: string, patch: Partial<StaffMember>) =>
    setData((d) => (d ? { ...d, staff: d.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : d))
  const addStaff = () =>
    setData((d) =>
      d ? { ...d, staff: [...d.staff, { id: genId(), name: '新規スタッフ', role: 'スタッフ', department: '1部', monthlyGoal: 0, active: true }] } : d,
    )
  const removeStaff = (id: string) =>
    setData((d) => (d ? { ...d, staff: d.staff.map((s) => (s.id === id ? { ...s, active: false } : s)) } : d))
  const saveStaff = async () => {
    try {
      await api.put('/api/master/staff', data.staff)
      showToast('スタッフを保存しました', 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <h2 className="text-sm font-bold text-white">パラメータ（レート・手数料）</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="消費税率" value={data.rates.taxRate * 100} onChange={(v) => setRate({ taxRate: v / 100 })} suffix="%" />
          <NumberField label="ハイエースインセン率" value={data.rates.hiaceIncentiveRate * 100} onChange={(v) => setRate({ hiaceIncentiveRate: v / 100 })} suffix="%" />
          <NumberField label="本部インセン率" value={data.rates.hqIncentiveRate * 100} onChange={(v) => setRate({ hqIncentiveRate: v / 100 })} suffix="%" />
          <NumberField label="スタッフインセン率" value={data.rates.staffIncentiveRate * 100} onChange={(v) => setRate({ staffIncentiveRate: v / 100 })} suffix="%" />
          <NumberField label="1部 時給" value={data.rates.hourlyWageDept1} onChange={(v) => setRate({ hourlyWageDept1: v })} suffix="円" />
          <NumberField label="2部 時給" value={data.rates.hourlyWageDept2} onChange={(v) => setRate({ hourlyWageDept2: v })} suffix="円" />
          <NumberField label="クレカ手数料率" value={data.rates.cardFeeRate * 100} onChange={(v) => setRate({ cardFeeRate: v / 100 })} suffix="%" />
          <NumberField label="電子マネー手数料率" value={data.rates.emoneyFeeRate * 100} onChange={(v) => setRate({ emoneyFeeRate: v / 100 })} suffix="%" />
          <NumberField label="QR手数料率" value={data.rates.qrFeeRate * 100} onChange={(v) => setRate({ qrFeeRate: v / 100 })} suffix="%" />
        </div>
        <button type="button" onClick={saveRates} className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">保存</button>
      </section>

      <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <h2 className="text-sm font-bold text-white">部門月間目標</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-xs text-[var(--muted)] uppercase">
              <tr>
                <th className="px-2 py-2 text-left">月</th>
                <th className="px-2 py-2 text-left">部門</th>
                <th className="px-2 py-2 text-left">目標売上</th>
                <th className="px-2 py-2 text-left">営業日数</th>
              </tr>
            </thead>
            <tbody>
              {data.goals.map((g, i) => (
                <tr key={`${g.department}-${g.month}`} className="border-t border-white/5">
                  <td className="px-2 py-2 text-white">{formatMonthLabel(g.month)}</td>
                  <td className="px-2 py-2">{g.department}</td>
                  <td className="px-2 py-2">
                    <input type="number" className="w-32 rounded-md border border-white/10 bg-[var(--surface-3)] px-2 py-1 text-sm text-white outline-none focus:border-amber-500/60" value={g.monthlySalesGoal} onChange={(e) => setGoal(i, { monthlySalesGoal: e.target.valueAsNumber || 0 })} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" className="w-24 rounded-md border border-white/10 bg-[var(--surface-3)] px-2 py-1 text-sm text-white outline-none focus:border-amber-500/60" value={g.businessDays} onChange={(e) => setGoal(i, { businessDays: e.target.valueAsNumber || 0 })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={saveGoals} className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">保存</button>
      </section>

      <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <h2 className="text-sm font-bold text-white">スタッフ管理・LINE紐付け</h2>
        <div className="mt-3 flex flex-col gap-2">
          {data.staff.filter((s) => s.active).map((s) => (
            <div key={s.id} className="grid grid-cols-1 gap-2 rounded-md border border-white/10 p-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1.4fr_auto]">
              <TextField label="氏名" value={s.name} onChange={(v) => setStaff(s.id, { name: v })} />
              <SelectField label="役割" value={s.role} onChange={(v) => setStaff(s.id, { role: v as StaffRole })} options={[{ value: '代表', label: '代表' }, { value: 'スタッフ', label: 'スタッフ' }]} />
              <SelectField label="部門" value={s.department} onChange={(v) => setStaff(s.id, { department: v as Department })} options={[{ value: '1部', label: '1部' }, { value: '2部', label: '2部' }]} />
              <NumberField label="個人目標" value={s.monthlyGoal} onChange={(v) => setStaff(s.id, { monthlyGoal: v })} suffix="円" />
              <TextField label="LINE userId（紐付け）" value={s.lineUserId ?? ''} onChange={(v) => setStaff(s.id, { lineUserId: v || undefined })} placeholder="Uxxxx（未紐付け可）" />
              <div className="flex items-end">
                <button type="button" onClick={() => removeStaff(s.id)} className="rounded-md border border-white/10 p-2 text-[var(--text-secondary)] hover:bg-white/5" aria-label="無効化">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addStaff} className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-white/20 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" />
            スタッフを追加
          </button>
        </div>
        <button type="button" onClick={saveStaff} className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">保存</button>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          ※ LINE userId は個別リマインド（③）の宛先です。未紐付けの場合はリマインドが不達（モードmockでは記録のみ）。
          本番は招待リンクからのLINEログインで自動紐付けする想定（Phase 3+）。削除は無効化（論理削除）です。
        </p>
      </section>
    </div>
  )
}
