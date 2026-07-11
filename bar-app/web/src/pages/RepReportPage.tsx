import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Copy } from 'lucide-react'
import type { SessionUser } from '../lib/types.ts'
import { api, formatCurrency, todayISO } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'
import { DateField, FieldGroup, NumberField, TextAreaField, TextField } from '../components/FormControls.tsx'

interface BreakdownRow {
  staffId: string
  name: string
  sales: number
  customerCount: number
}
interface ExpenseRow {
  key: string
  category: string
  amount: number
  detail: string
}

let keyCounter = 0
const nextKey = () => `e${keyCounter++}`

export function RepReportPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [date, setDate] = useState(todayISO())
  const [overallSales, setOverallSales] = useState(0)
  const [personalSales, setPersonalSales] = useState(0)
  const [hiaceSales, setHiaceSales] = useState(0)
  const [hqSales, setHqSales] = useState(0)
  const [eventSales, setEventSales] = useState(0)
  const [cashSales, setCashSales] = useState(0)
  const [cardSales, setCardSales] = useState(0)
  const [emoneySales, setEmoneySales] = useState(0)
  const [qrSales, setQrSales] = useState(0)
  const [groupsCount, setGroupsCount] = useState(0)
  const [newCustomers, setNewCustomers] = useState(0)
  const [existingCustomers, setExistingCustomers] = useState(0)
  const [comment, setComment] = useState('')
  const [planAttendance, setPlanAttendance] = useState('')
  const [planReservation, setPlanReservation] = useState('')
  const [planTask, setPlanTask] = useState('')
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [showOptional, setShowOptional] = useState(false)

  useEffect(() => {
    api.get<SessionUser[]>('/api/auth/users').then((users) => {
      const members = users.filter((u) => u.role === 'スタッフ' && u.department === user!.department)
      setBreakdown(members.map((m) => ({ staffId: m.id, name: m.name, sales: 0, customerCount: 0 })))
    })
  }, [user])

  const paymentTotal = cashSales + cardSales + emoneySales + qrSales
  const paymentMismatch = Math.abs(paymentTotal - overallSales) > 0.5
  const breakdownSum = useMemo(() => breakdown.reduce((s, b) => s + b.sales, 0), [breakdown])
  const freeShare = overallSales - personalSales - breakdownSum

  const updateBreakdown = (staffId: string, patch: Partial<BreakdownRow>) =>
    setBreakdown((prev) => prev.map((b) => (b.staffId === staffId ? { ...b, ...patch } : b)))

  const loadPrevious = async () => {
    // 「前日コピー」: 直近の自分の代表日報の予定・経費構成を引き継ぐ簡易版として当日分を読み込む
    const prev = await api.get<Record<string, unknown> | null>(`/api/reports/rep?date=${date}`)
    if (!prev) {
      showToast('この日付の既存日報はありません', 'info')
      return
    }
    const r = prev as {
      overallSales: number; personalSales: number; cashSales: number; cardSales: number; emoneySales: number; qrSales: number
      groupsCount: number; newCustomers: number; existingCustomers: number; comment: string
      planAttendance: string; planReservation: string; planTask: string; hiaceSales: number; hqSales: number; eventSales: number
      staffBreakdown: { staffId: string; sales: number; customerCount: number }[]
      expenses: { category: string; amount: number; detail: string }[]
    }
    setOverallSales(r.overallSales); setPersonalSales(r.personalSales)
    setCashSales(r.cashSales); setCardSales(r.cardSales); setEmoneySales(r.emoneySales); setQrSales(r.qrSales)
    setHiaceSales(r.hiaceSales); setHqSales(r.hqSales); setEventSales(r.eventSales)
    setGroupsCount(r.groupsCount); setNewCustomers(r.newCustomers); setExistingCustomers(r.existingCustomers)
    setComment(r.comment); setPlanAttendance(r.planAttendance); setPlanReservation(r.planReservation); setPlanTask(r.planTask)
    setBreakdown((prevB) => prevB.map((b) => {
      const found = r.staffBreakdown.find((x) => x.staffId === b.staffId)
      return found ? { ...b, sales: found.sales, customerCount: found.customerCount } : b
    }))
    setExpenses(r.expenses.map((e) => ({ key: nextKey(), category: e.category, amount: e.amount, detail: e.detail })))
    showToast('既存の日報を読み込みました', 'success')
  }

  const submit = async () => {
    if (freeShare < -0.5) {
      showToast('スタッフ別内訳＋代表個人売上がBAR全体売上を超えています', 'warning')
      return
    }
    try {
      await api.post('/api/reports/rep', {
        date, overallSales, personalSales, hiaceSales, hqSales, eventSales,
        cashSales, cardSales, emoneySales, qrSales,
        groupsCount, newCustomers, existingCustomers,
        comment, planAttendance, planReservation, planTask,
        staffBreakdown: breakdown.map((b) => ({ staffId: b.staffId, sales: b.sales, customerCount: b.customerCount })),
        expenses: expenses.map((e) => ({ category: e.category, amount: e.amount, detail: e.detail })),
      })
      showToast('代表日報を提出しました。ダッシュボードに反映されました', 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold text-white">代表日報（{user!.department}）</h2>
        <button
          type="button"
          onClick={loadPrevious}
          className="ml-auto flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-white/5"
        >
          <Copy className="h-3.5 w-3.5" />
          既存日報を読込
        </button>
      </div>

      <FieldGroup title="基本・売上（BAR全体）">
        <DateField label="日付" value={date} onChange={setDate} />
        <NumberField label="BAR全体 当日売上" value={overallSales} onChange={setOverallSales} suffix="円" />
        <NumberField label="うち代表個人売上" value={personalSales} onChange={setPersonalSales} suffix="円" />
      </FieldGroup>

      <FieldGroup title="決済内訳（税込）">
        <NumberField label="現金" value={cashSales} onChange={setCashSales} suffix="円" />
        <NumberField label="クレカ" value={cardSales} onChange={setCardSales} suffix="円" />
        <NumberField label="電子マネー" value={emoneySales} onChange={setEmoneySales} suffix="円" />
        <NumberField label="QR" value={qrSales} onChange={setQrSales} suffix="円" />
      </FieldGroup>
      {paymentMismatch && (
        <p className="rounded-md border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          決済内訳の合計（{formatCurrency(paymentTotal)}）がBAR全体売上（{formatCurrency(overallSales)}）と一致していません。
        </p>
      )}

      <FieldGroup title="来客">
        <NumberField label="組数" value={groupsCount} onChange={setGroupsCount} suffix="組" />
        <NumberField label="新規" value={newCustomers} onChange={setNewCustomers} suffix="名" />
        <NumberField label="既存" value={existingCustomers} onChange={setExistingCustomers} suffix="名" />
      </FieldGroup>

      <fieldset className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <legend className="px-1 text-sm font-bold text-white">スタッフ別内訳（売上・来客）</legend>
        <div className="mt-2 flex flex-col gap-2">
          {breakdown.map((b) => (
            <div key={b.staffId} className="grid grid-cols-1 gap-2 rounded-md border border-white/10 p-2 sm:grid-cols-[1fr_1fr_1fr]">
              <div className="flex items-center px-1 text-sm text-white">{b.name}</div>
              <NumberField label="売上" value={b.sales} onChange={(v) => updateBreakdown(b.staffId, { sales: v })} suffix="円" />
              <NumberField label="来客" value={b.customerCount} onChange={(v) => updateBreakdown(b.staffId, { customerCount: v })} suffix="名" />
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between rounded-md bg-black/30 px-3 py-2 text-xs">
            <span className="text-[var(--muted)]">フリー・その他分（自動算出）</span>
            <span className={`tabular-nums font-bold ${freeShare < -0.5 ? 'text-[var(--status-critical)]' : 'text-white'}`}>
              {formatCurrency(freeShare)}
            </span>
          </div>
        </div>
      </fieldset>

      <div>
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="text-xs text-[var(--muted)] underline hover:text-white"
        >
          {showOptional ? '任意項目を隠す' : '任意項目（ハイエース・本部・イベント売上）を表示'}
        </button>
        {showOptional && (
          <FieldGroup title="任意売上（発生時のみ）">
            <NumberField label="ハイエース売上" value={hiaceSales} onChange={setHiaceSales} suffix="円" />
            <NumberField label="本部売上" value={hqSales} onChange={setHqSales} suffix="円" />
            <NumberField label="イベント売上" value={eventSales} onChange={setEventSales} suffix="円" />
          </FieldGroup>
        )}
      </div>

      <FieldGroup title="総評・当日予定">
        <TextAreaField label="総評" value={comment} onChange={setComment} />
        <TextField label="当日予定：出勤" value={planAttendance} onChange={setPlanAttendance} />
        <TextField label="当日予定：予約" value={planReservation} onChange={setPlanReservation} />
        <TextField label="当日予定：予定・タスク" value={planTask} onChange={setPlanTask} />
      </FieldGroup>

      <fieldset className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <legend className="px-1 text-sm font-bold text-white">経費</legend>
        <div className="mt-2 flex flex-col gap-2">
          {expenses.map((e) => (
            <div key={e.key} className="grid grid-cols-1 gap-2 rounded-md border border-white/10 p-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <TextField label="費目" value={e.category} onChange={(v) => setExpenses((p) => p.map((x) => (x.key === e.key ? { ...x, category: v } : x)))} />
              <NumberField label="金額" value={e.amount} onChange={(v) => setExpenses((p) => p.map((x) => (x.key === e.key ? { ...x, amount: v } : x)))} suffix="円" />
              <TextField label="内容" value={e.detail} onChange={(v) => setExpenses((p) => p.map((x) => (x.key === e.key ? { ...x, detail: v } : x)))} />
              <div className="flex items-end">
                <button type="button" onClick={() => setExpenses((p) => p.filter((x) => x.key !== e.key))} className="rounded-md border border-white/10 p-2 text-[var(--text-secondary)] hover:bg-white/5" aria-label="経費を削除">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setExpenses((p) => [...p, { key: nextKey(), category: '', amount: 0, detail: '' }])} className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-white/20 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" />
            経費行を追加
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">※ 領収書写真のアップロード・共有ドライブ保存は Phase 2 で追加します。</p>
      </fieldset>

      <button type="button" onClick={submit} className="w-fit rounded-md bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400">
        代表日報を提出
      </button>
    </div>
  )
}
