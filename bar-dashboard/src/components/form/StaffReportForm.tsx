import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../ToastProvider'
import { genId } from '../../lib/id'
import { todayISO } from '../../lib/dateUtils'
import { generateStaffReportText } from '../../lib/reportText'
import type { DailyReportStaff } from '../../types'
import { DateField, FieldGroup, NumberField, SelectField, TextAreaField, TextField, TimeField } from './FormControls'

export function StaffReportForm({ onGenerated }: { onGenerated: (text: string) => void }) {
  const { data, upsertStaffReport } = useAppData()
  const { showToast } = useToast()
  const staffList = data.staff.filter((s) => s.role === 'スタッフ')

  const [staffId, setStaffId] = useState(staffList[0]?.id ?? '')
  const staff = staffList.find((s) => s.id === staffId) ?? staffList[0]

  const [date, setDate] = useState(todayISO())
  const [shiftStart, setShiftStart] = useState('18:00')
  const [shiftEnd, setShiftEnd] = useState('24:00')
  const [breakMinutes, setBreakMinutes] = useState(60)
  const [todaySales, setTodaySales] = useState(0)
  const [salesDetail, setSalesDetail] = useState('')
  const [existingCustomers, setExistingCustomers] = useState(0)
  const [newCustomers, setNewCustomers] = useState(0)
  const [crossSellCount, setCrossSellCount] = useState(0)
  const [goodPoints, setGoodPoints] = useState('')
  const [improvementPoints, setImprovementPoints] = useState('')

  if (!staff) {
    return <p className="text-sm text-[var(--muted)]">マスター管理画面でスタッフを登録してください。</p>
  }

  const handleSubmit = () => {
    const report: DailyReportStaff = {
      id: genId(),
      date,
      staffId: staff.id,
      reporterName: staff.name,
      department: staff.department,
      shiftStart,
      shiftEnd,
      breakMinutes,
      todaySales,
      salesDetail,
      existingCustomers,
      newCustomers,
      crossSellCount,
      goodPoints,
      improvementPoints,
      submittedAt: Date.now(),
    }

    upsertStaffReport(report)

    const key = (r: DailyReportStaff) => `${r.date}|${r.staffId}`
    const tempData = {
      ...data,
      staffReports: [...data.staffReports.filter((r) => key(r) !== key(report)), report],
    }
    onGenerated(generateStaffReportText(report, tempData))
    showToast('日報をLINE Botへ送信しました（模擬）。報告用テキストを生成しました', 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup title="基本情報">
        <SelectField
          label="報告者名"
          value={staffId}
          onChange={setStaffId}
          options={staffList.map((s) => ({ value: s.id, label: `${s.name}（${s.department}）` }))}
        />
        <DateField label="日付" value={date} onChange={setDate} />
        <TextField label="勤務部門" value={staff.department} onChange={() => {}} />
      </FieldGroup>

      <FieldGroup title="1. 勤怠管理">
        <TimeField label="勤務開始時刻" value={shiftStart} onChange={setShiftStart} />
        <TimeField label="勤務終了時刻" value={shiftEnd} onChange={setShiftEnd} />
        <NumberField label="休憩時間" value={breakMinutes} onChange={setBreakMinutes} suffix="分" />
        <NumberField label="当日売上" value={todaySales} onChange={setTodaySales} suffix="円" />
        <TextField label="売上詳細" value={salesDetail} onChange={setSalesDetail} />
        <NumberField label="既存来客数" value={existingCustomers} onChange={setExistingCustomers} suffix="人" />
        <NumberField label="新規来客数" value={newCustomers} onChange={setNewCustomers} suffix="人" />
        <NumberField label="クロスセル件数" value={crossSellCount} onChange={setCrossSellCount} suffix="件" />
      </FieldGroup>

      <FieldGroup title="2. 振り返り">
        <TextAreaField label="良い点" value={goodPoints} onChange={setGoodPoints} />
        <TextAreaField label="改善点" value={improvementPoints} onChange={setImprovementPoints} />
      </FieldGroup>

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
