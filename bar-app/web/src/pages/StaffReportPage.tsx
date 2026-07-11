import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api, formatCurrency, todayISO } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'
import { DateField, FieldGroup, NumberField, TextAreaField, TextField, TimeField } from '../components/FormControls.tsx'

interface CustomerRow {
  key: string
  customerName: string
  amount: number
}
let keyCounter = 0
const nextKey = () => `c${keyCounter++}`

export function StaffReportPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [date, setDate] = useState(todayISO())
  const [shiftStart, setShiftStart] = useState('18:00')
  const [shiftEnd, setShiftEnd] = useState('24:00')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [todaySales, setTodaySales] = useState(0)
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [goodPoints, setGoodPoints] = useState('')
  const [improvementPoints, setImprovementPoints] = useState('')

  const customerTotal = customers.reduce((s, c) => s + c.amount, 0)
  const mismatch = customers.length > 0 && Math.abs(customerTotal - todaySales) > 0.5

  const submit = async () => {
    try {
      await api.post('/api/reports/staff', {
        date, shiftStart, shiftEnd, breakMinutes, todaySales,
        goodPoints, improvementPoints,
        namedCustomers: customers.map((c) => ({ customerName: c.customerName, amount: c.amount })),
      })
      showToast('スタッフ日報を提出しました', 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-white">スタッフ日報（{user!.name}）</h2>

      <FieldGroup title="勤怠">
        <DateField label="日付" value={date} onChange={setDate} />
        <TimeField label="勤務開始" value={shiftStart} onChange={setShiftStart} />
        <TimeField label="勤務終了" value={shiftEnd} onChange={setShiftEnd} />
        <NumberField label="休憩時間" value={breakMinutes} onChange={setBreakMinutes} suffix="分" />
      </FieldGroup>

      <FieldGroup title="売上">
        <NumberField label="当日売上（合計）" value={todaySales} onChange={setTodaySales} suffix="円" />
      </FieldGroup>

      <fieldset className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <legend className="px-1 text-sm font-bold text-white">指名客ごとの内訳</legend>
        <div className="mt-2 flex flex-col gap-2">
          {customers.map((c) => (
            <div key={c.key} className="grid grid-cols-1 gap-2 rounded-md border border-white/10 p-2 sm:grid-cols-[2fr_1fr_auto]">
              <TextField label="指名客名" value={c.customerName} onChange={(v) => setCustomers((p) => p.map((x) => (x.key === c.key ? { ...x, customerName: v } : x)))} />
              <NumberField label="金額" value={c.amount} onChange={(v) => setCustomers((p) => p.map((x) => (x.key === c.key ? { ...x, amount: v } : x)))} suffix="円" />
              <div className="flex items-end">
                <button type="button" onClick={() => setCustomers((p) => p.filter((x) => x.key !== c.key))} className="rounded-md border border-white/10 p-2 text-[var(--text-secondary)] hover:bg-white/5" aria-label="削除">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setCustomers((p) => [...p, { key: nextKey(), customerName: '', amount: 0 }])} className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-white/20 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" />
            指名客を追加
          </button>
          {mismatch && (
            <p className="rounded-md border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              指名客合計（{formatCurrency(customerTotal)}）が当日売上（{formatCurrency(todaySales)}）と一致していません。
            </p>
          )}
        </div>
      </fieldset>

      <FieldGroup title="振り返り">
        <TextAreaField label="良い点" value={goodPoints} onChange={setGoodPoints} />
        <TextAreaField label="改善点" value={improvementPoints} onChange={setImprovementPoints} />
      </FieldGroup>

      <button type="button" onClick={submit} className="w-fit rounded-md bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400">
        スタッフ日報を提出
      </button>
    </div>
  )
}
