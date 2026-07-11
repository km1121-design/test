import type { Context, Hono } from 'hono'
import type { Env } from '../app.ts'
import type { Department } from '../types.ts'
import { computeWorkedMinutes, paymentFeeForReport } from '../lib/calculations.ts'
import { getAllStaff, getRates, getRepReportsByMonth, getStaffReportsByMonth } from '../db/repository.ts'

/** CSVフィールドのエスケープ */
function cell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(','))
  // UTF-8 BOM付き（Excel/スプレッドシートでそのまま開ける・決定R）
  return '﻿' + lines.join('\r\n') + '\r\n'
}

function csvResponse(c: Context<Env>, name: string, body: string) {
  // ヘッダはByteStringのみ許容のため、日本語を含むファイル名はRFC5987でエンコードする。
  // ASCIIフォールバック名も併記する（非対応ブラウザ向け）。
  const asciiFallback = name.replace(/[^\x20-\x7e]/g, '_')
  const encoded = encodeURIComponent(name)
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`)
  return c.body(body)
}

export function registerCsvRoutes(app: Hono<Env>) {
  // 代表日報CSV（データセット1）
  app.get('/api/csv/rep-reports', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)
    const db = c.get('db')
    const department = (c.req.query('department') as Department) || user.department
    const month = c.req.query('month') || new Date().toISOString().slice(0, 7)
    const rates = await getRates(db)
    const reports = (await getRepReportsByMonth(db, department, month)).sort((a, b) => a.date.localeCompare(b.date))

    const header = ['日付', '部門', '報告者', 'BAR全体売上', '代表個人売上', 'ハイエース売上', '本部売上', 'イベント売上', '現金', 'クレカ', '電子マネー', 'QR', '決済手数料', '組数', '来客数', '新規', '既存', '経費計', '総評']
    const rows = reports.map((r) => [
      r.date, r.department, r.reporterName, r.overallSales, r.personalSales, r.hiaceSales, r.hqSales, r.eventSales,
      r.cashSales, r.cardSales, r.emoneySales, r.qrSales, Math.round(paymentFeeForReport(r, rates)),
      r.groupsCount, r.newCustomers + r.existingCustomers, r.newCustomers, r.existingCustomers,
      r.expenses.reduce((s, e) => s + e.amount, 0), r.comment,
    ])
    return csvResponse(c, `rep-reports_${department}_${month}.csv`, toCsv(header, rows))
  })

  // スタッフ別売上帰属CSV（データセット2）: 代表日報のスタッフ別内訳を日付×スタッフに展開
  app.get('/api/csv/staff-attribution', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)
    const db = c.get('db')
    const department = (c.req.query('department') as Department) || user.department
    const month = c.req.query('month') || new Date().toISOString().slice(0, 7)
    const staff = await getAllStaff(db, true)
    const nameById = new Map(staff.map((s) => [s.id, s.name]))
    const reports = (await getRepReportsByMonth(db, department, month)).sort((a, b) => a.date.localeCompare(b.date))

    const header = ['日付', '部門', 'スタッフ名', '帰属売上', '来客数']
    const rows: (string | number)[][] = []
    for (const r of reports) {
      for (const b of r.staffBreakdown) {
        rows.push([r.date, r.department, nameById.get(b.staffId) ?? b.staffId, b.sales, b.customerCount])
      }
    }
    return csvResponse(c, `staff-attribution_${department}_${month}.csv`, toCsv(header, rows))
  })

  // スタッフ日報CSV（データセット3）
  app.get('/api/csv/staff-reports', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)
    const db = c.get('db')
    const department = (c.req.query('department') as Department) || user.department
    const month = c.req.query('month') || new Date().toISOString().slice(0, 7)
    const reports = (await getStaffReportsByMonth(db, department, month)).sort((a, b) => a.date.localeCompare(b.date))

    const header = ['日付', '部門', 'スタッフ名', '勤務開始', '勤務終了', '休憩分', '実働分', '当日売上', '良い点', '改善点']
    const rows = reports.map((r) => [
      r.date, r.department, r.reporterName, r.shiftStart, r.shiftEnd, r.breakMinutes,
      computeWorkedMinutes(r.shiftStart, r.shiftEnd, r.breakMinutes), r.todaySales, r.goodPoints, r.improvementPoints,
    ])
    return csvResponse(c, `staff-reports_${department}_${month}.csv`, toCsv(header, rows))
  })
}
