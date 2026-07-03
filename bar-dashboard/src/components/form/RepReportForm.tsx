import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../ToastProvider'
import { genId } from '../../lib/id'
import { todayISO } from '../../lib/dateUtils'
import { generateRepReportText } from '../../lib/reportText'
import { hasBreakdownMismatch } from '../../lib/calculations'
import type { DailyReportRep, ExpenseLine } from '../../types'
import { DateField, FieldGroup, NumberField, SelectField, TextAreaField, TextField } from './FormControls'

const emptyExpense = (): ExpenseLine => ({ id: genId(), category: '', amount: 0, detail: '' })

export function RepReportForm({ onGenerated }: { onGenerated: (text: string) => void }) {
  const { data, upsertRepReport } = useAppData()
  const { showToast } = useToast()
  const reps = data.staff.filter((s) => s.role === '代表')

  const [reporterId, setReporterId] = useState(reps[0]?.id ?? '')
  const reporter = reps.find((r) => r.id === reporterId) ?? reps[0]

  const [date, setDate] = useState(todayISO())
  const [normalSales, setNormalSales] = useState(0)
  const [hiaceSales, setHiaceSales] = useState(0)
  const [personalExistingCustomers, setPersonalExistingCustomers] = useState(0)
  const [personalNewCustomers, setPersonalNewCustomers] = useState(0)
  const [crossSellCount, setCrossSellCount] = useState(0)

  const [cashSales, setCashSales] = useState(0)
  const [cardSales, setCardSales] = useState(0)
  const [emoneySales, setEmoneySales] = useState(0)
  const [qrSales, setQrSales] = useState(0)
  const [staffSalesBreakdown, setStaffSalesBreakdown] = useState(0)
  const [eventSalesBreakdown, setEventSalesBreakdown] = useState(0)
  const [hqSalesBreakdown, setHqSalesBreakdown] = useState(0)
  const [overallExistingCustomers, setOverallExistingCustomers] = useState(0)
  const [overallNewCustomers, setOverallNewCustomers] = useState(0)

  const [comment, setComment] = useState('')
  const [todayPlan, setTodayPlan] = useState('')
  const [invoiceFileName, setInvoiceFileName] = useState('')

  const [expenses, setExpenses] = useState<ExpenseLine[]>([])

  if (!reporter) {
    return <p className="text-sm text-[var(--muted)]">マスター管理画面で代表を登録してください。</p>
  }

  const previewMismatch = hasBreakdownMismatch({
    cashSales,
    cardSales,
    emoneySales,
    qrSales,
    staffSalesBreakdown,
    eventSalesBreakdown,
    hqSalesBreakdown,
  } as DailyReportRep)

  const updateExpense = (id: string, patch: Partial<ExpenseLine>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const handleSubmit = () => {
    const report: DailyReportRep = {
      id: genId(),
      date,
      department: reporter.department,
      reporterName: reporter.name,
      submittedAt: Date.now(),
      normalSales,
      hiaceSales,
      personalExistingCustomers,
      personalNewCustomers,
      crossSellCount,
      cashSales,
      cardSales,
      emoneySales,
      qrSales,
      staffSalesBreakdown,
      eventSalesBreakdown,
      hqSalesBreakdown,
      overallExistingCustomers,
      overallNewCustomers,
      comment,
      todayPlan,
      invoiceFileName: invoiceFileName || undefined,
      expenses,
    }

    upsertRepReport(report)

    const key = (r: DailyReportRep) => `${r.date}|${r.department}|${r.reporterName}`
    const tempData = {
      ...data,
      repReports: [...data.repReports.filter((r) => key(r) !== key(report)), report],
    }
    onGenerated(generateRepReportText(report, tempData))
    showToast('日報をLINE Botへ送信しました（模擬）。報告用テキストを生成しました', 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup title="基本情報">
        <SelectField
          label="報告者名"
          value={reporterId}
          onChange={setReporterId}
          options={reps.map((r) => ({ value: r.id, label: `${r.name}（${r.department}）` }))}
        />
        <DateField label="日付" value={date} onChange={setDate} />
        <TextField label="部門" value={reporter.department} onChange={() => {}} />
      </FieldGroup>

      <FieldGroup title="1. 個人日報">
        <NumberField label="通常売上" value={normalSales} onChange={setNormalSales} suffix="円" />
        <NumberField label="ハイエース売上" value={hiaceSales} onChange={setHiaceSales} suffix="円" />
        <NumberField label="既存来客数" value={personalExistingCustomers} onChange={setPersonalExistingCustomers} suffix="人" />
        <NumberField label="新規来客数" value={personalNewCustomers} onChange={setPersonalNewCustomers} suffix="人" />
        <NumberField label="クロスセル件数" value={crossSellCount} onChange={setCrossSellCount} suffix="件" />
      </FieldGroup>

      <FieldGroup title="2. BAR全体日報">
        <NumberField label="現金売上" value={cashSales} onChange={setCashSales} suffix="円" />
        <NumberField label="クレカ売上" value={cardSales} onChange={setCardSales} suffix="円" />
        <NumberField label="電子マネー売上" value={emoneySales} onChange={setEmoneySales} suffix="円" />
        <NumberField label="QR決済売上" value={qrSales} onChange={setQrSales} suffix="円" />
        <NumberField label="当日スタッフ売上（内訳）" value={staffSalesBreakdown} onChange={setStaffSalesBreakdown} suffix="円" />
        <NumberField label="当日イベント売上（内訳）" value={eventSalesBreakdown} onChange={setEventSalesBreakdown} suffix="円" />
        <NumberField label="当日本部売上（内訳）" value={hqSalesBreakdown} onChange={setHqSalesBreakdown} suffix="円" />
        <NumberField label="既存来客数" value={overallExistingCustomers} onChange={setOverallExistingCustomers} suffix="人" />
        <NumberField label="新規来客数" value={overallNewCustomers} onChange={setOverallNewCustomers} suffix="人" />
      </FieldGroup>

      {previewMismatch && (
        <p className="rounded-md border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          注意：内訳（スタッフ+イベント+本部）の合計が、決済方法別合計（現金+クレカ+電子マネー+QR）と一致していません。
        </p>
      )}

      <FieldGroup title="3. 総評・当日予定">
        <TextAreaField label="総評コメント" value={comment} onChange={setComment} />
        <TextAreaField label="当日予定（出勤・予約・タスク）" value={todayPlan} onChange={setTodayPlan} />
        <TextField label="伝票ファイル名（任意）" value={invoiceFileName} onChange={setInvoiceFileName} placeholder="例：invoice_0701.jpg" />
      </FieldGroup>

      <fieldset className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <legend className="px-1 text-sm font-bold text-white">4. 経費</legend>
        <div className="mt-2 flex flex-col gap-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="grid grid-cols-1 gap-2 rounded-md border border-white/10 p-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <TextField label="費目" value={expense.category} onChange={(v) => updateExpense(expense.id, { category: v })} />
              <NumberField label="金額" value={expense.amount} onChange={(v) => updateExpense(expense.id, { amount: v })} suffix="円" />
              <TextField label="内容詳細" value={expense.detail} onChange={(v) => updateExpense(expense.id, { detail: v })} />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setExpenses((prev) => prev.filter((e) => e.id !== expense.id))}
                  className="rounded-md border border-white/10 p-2 text-[var(--text-secondary)] hover:bg-white/5"
                  aria-label="経費行を削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExpenses((prev) => [...prev, emptyExpense()])}
            className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-white/20 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" />
            経費行を追加
          </button>
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-fit rounded-md bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400"
      >
        LINE Botへ送信（報告用テキストを生成）
      </button>
    </div>
  )
}
