import { randomUUID } from 'node:crypto'
import type { DailyReportRep, DailyReportStaff, Department, ExpenseLine } from '../types.js'
import { findStaffByName } from '../db/repository.js'
import { todayISO } from '../lib/dateUtils.js'

export type ParseResult<T> = { ok: true; report: T } | { ok: false; error: string }

export type ReportKind = '代表日報' | 'スタッフ日報' | 'テンプレ代表' | 'テンプレスタッフ' | 'ヘルプ'

function parseLabelValueLines(body: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const rawLine of body.split('\n').slice(1)) {
    const line = rawLine.trim()
    if (!line) continue
    const halfWidthIdx = line.indexOf(':')
    const fullWidthIdx = line.indexOf('：')
    const sepIdx = halfWidthIdx === -1 ? fullWidthIdx : fullWidthIdx === -1 ? halfWidthIdx : Math.min(halfWidthIdx, fullWidthIdx)
    if (sepIdx === -1) continue
    const label = line.slice(0, sepIdx).trim()
    const value = line.slice(sepIdx + 1).trim()
    map.set(label, value)
  }
  return map
}

function toNumber(value: string | undefined): number {
  if (!value) return 0
  const n = Number(value.replace(/[,，¥\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function resolveDepartment(fields: Map<string, string>, fallback: Department): Department {
  const override = fields.get('部門')?.trim()
  return override === '1部' || override === '2部' ? override : fallback
}

export function detectReportKind(text: string): ReportKind | null {
  const firstLine = text.trim().split('\n')[0]?.trim() ?? ''
  if (/^代表日報/.test(firstLine)) return '代表日報'
  if (/^スタッフ日報/.test(firstLine)) return 'スタッフ日報'
  if (/^テンプレ.*代表/.test(firstLine)) return 'テンプレ代表'
  if (/^テンプレ.*スタッフ/.test(firstLine)) return 'テンプレスタッフ'
  if (/^(ヘルプ|help)$/i.test(firstLine)) return 'ヘルプ'
  return null
}

export function parseRepReport(text: string, sourceChatId?: string): ParseResult<DailyReportRep> {
  const fields = parseLabelValueLines(text)
  const reporterName = fields.get('報告者')?.trim()
  if (!reporterName) return { ok: false, error: '「報告者」が入力されていません。' }

  const staff = findStaffByName(reporterName, '代表')
  if (!staff) return { ok: false, error: `代表マスターに「${reporterName}」が見つかりません。氏名を確認してください。` }

  const date = fields.get('日付')?.trim() || todayISO()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: '「日付」はYYYY-MM-DD形式で入力してください（例: 2026-07-03）。' }
  }

  const expenses: ExpenseLine[] = []
  for (const [label, value] of fields) {
    if (!/^経費\d+$/.test(label)) continue
    const [category = '', amount = '', detail = ''] = value.split('/').map((s) => s.trim())
    if (!category && !amount && !detail) continue
    expenses.push({ id: randomUUID(), category, amount: toNumber(amount), detail })
  }

  const report: DailyReportRep = {
    id: randomUUID(),
    date,
    department: resolveDepartment(fields, staff.department),
    reporterName: staff.name,
    submittedAt: Date.now(),
    sourceChatId,
    normalSales: toNumber(fields.get('通常売上')),
    hiaceSales: toNumber(fields.get('ハイエース売上')),
    personalExistingCustomers: toNumber(fields.get('個人既存来客数')),
    personalNewCustomers: toNumber(fields.get('個人新規来客数')),
    crossSellCount: toNumber(fields.get('クロスセル件数')),
    cashSales: toNumber(fields.get('現金売上')),
    cardSales: toNumber(fields.get('クレカ売上')),
    emoneySales: toNumber(fields.get('電子マネー売上')),
    qrSales: toNumber(fields.get('QR決済売上')),
    staffSalesBreakdown: toNumber(fields.get('スタッフ売上')),
    eventSalesBreakdown: toNumber(fields.get('イベント売上')),
    hqSalesBreakdown: toNumber(fields.get('本部売上')),
    overallExistingCustomers: toNumber(fields.get('全体既存来客数')),
    overallNewCustomers: toNumber(fields.get('全体新規来客数')),
    comment: fields.get('総評')?.trim() ?? '',
    todayPlan: fields.get('当日予定')?.trim() ?? '',
    invoiceFileName: fields.get('伝票')?.trim() || undefined,
    expenses,
  }

  return { ok: true, report }
}

export function parseStaffReport(text: string, sourceChatId?: string): ParseResult<DailyReportStaff> {
  const fields = parseLabelValueLines(text)
  const name = fields.get('氏名')?.trim()
  if (!name) return { ok: false, error: '「氏名」が入力されていません。' }

  const staff = findStaffByName(name, 'スタッフ')
  if (!staff) return { ok: false, error: `スタッフマスターに「${name}」が見つかりません。氏名を確認してください。` }

  const date = fields.get('日付')?.trim() || todayISO()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: '「日付」はYYYY-MM-DD形式で入力してください（例: 2026-07-03）。' }
  }

  const shiftStart = fields.get('勤務開始')?.trim() ?? ''
  const shiftEnd = fields.get('勤務終了')?.trim() ?? ''
  if (!/^\d{1,2}:\d{2}$/.test(shiftStart)) return { ok: false, error: '「勤務開始」はHH:mm形式で入力してください（例: 18:00）。' }
  if (!/^\d{1,2}:\d{2}$/.test(shiftEnd)) return { ok: false, error: '「勤務終了」はHH:mm形式で入力してください（例: 24:00）。' }

  const report: DailyReportStaff = {
    id: randomUUID(),
    date,
    staffId: staff.id,
    reporterName: staff.name,
    department: resolveDepartment(fields, staff.department),
    shiftStart,
    shiftEnd,
    breakMinutes: toNumber(fields.get('休憩時間')),
    todaySales: toNumber(fields.get('当日売上')),
    salesDetail: fields.get('売上詳細')?.trim() ?? '',
    existingCustomers: toNumber(fields.get('既存来客数')),
    newCustomers: toNumber(fields.get('新規来客数')),
    crossSellCount: toNumber(fields.get('クロスセル件数')),
    goodPoints: fields.get('良い点')?.trim() ?? '',
    improvementPoints: fields.get('改善点')?.trim() ?? '',
    submittedAt: Date.now(),
    sourceChatId,
  }

  return { ok: true, report }
}
