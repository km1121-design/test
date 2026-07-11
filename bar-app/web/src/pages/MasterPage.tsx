import { useEffect, useState } from 'react'
import type { DepartmentGoal, RateMaster, StaffMember } from '../lib/types.ts'
import { api, formatMonthLabel } from '../lib/api.ts'
import { useToast } from '../components/ToastProvider.tsx'
import { NumberField } from '../components/FormControls.tsx'

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
        <h2 className="text-sm font-bold text-white">スタッフ一覧</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-xs text-[var(--muted)] uppercase">
              <tr>
                <th className="px-2 py-2 text-left">氏名</th>
                <th className="px-2 py-2 text-left">役割</th>
                <th className="px-2 py-2 text-left">部門</th>
                <th className="px-2 py-2 text-right">個人目標</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="px-2 py-2 text-white">{s.name}</td>
                  <td className="px-2 py-2">{s.role}</td>
                  <td className="px-2 py-2">{s.department}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{s.monthlyGoal.toLocaleString('ja-JP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">※ スタッフの追加・編集フォームとLINE紐付け管理はこの画面に順次追加します。</p>
      </section>
    </div>
  )
}
