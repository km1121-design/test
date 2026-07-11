import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type { Env } from '../app.ts'
import type { DailyReportRep, DailyReportStaff } from '../types.ts'
import {
  getRepReport,
  getRepReportsByMonth,
  getStaffReportsByMonth,
  getStaffReportsByStaffMonth,
  upsertRepReport,
  upsertStaffReport,
} from '../db/repository.ts'

export function registerReportRoutes(app: Hono<Env>) {
  // 代表日報の提出
  app.post('/api/reports/rep', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'ログインが必要です。' }, 401)
    if (user.role !== '代表') return c.json({ error: '代表日報は代表のみ提出できます。' }, 403)

    const body = await c.req.json<Partial<DailyReportRep>>()
    if (!body.date) return c.json({ error: '日付が必要です。' }, 400)

    const report: DailyReportRep = {
      id: randomUUID(),
      date: body.date,
      department: user.department,
      reporterName: user.name,
      submittedAt: Date.now(),
      overallSales: body.overallSales ?? 0,
      personalSales: body.personalSales ?? 0,
      hiaceSales: body.hiaceSales ?? 0,
      hqSales: body.hqSales ?? 0,
      eventSales: body.eventSales ?? 0,
      cashSales: body.cashSales ?? 0,
      cardSales: body.cardSales ?? 0,
      emoneySales: body.emoneySales ?? 0,
      qrSales: body.qrSales ?? 0,
      groupsCount: body.groupsCount ?? 0,
      newCustomers: body.newCustomers ?? 0,
      existingCustomers: body.existingCustomers ?? 0,
      comment: body.comment ?? '',
      planAttendance: body.planAttendance ?? '',
      planReservation: body.planReservation ?? '',
      planTask: body.planTask ?? '',
      staffBreakdown: (body.staffBreakdown ?? []).map((b) => ({ staffId: b.staffId, sales: b.sales ?? 0, customerCount: b.customerCount ?? 0 })),
      expenses: (body.expenses ?? []).map((e) => ({ id: e.id || randomUUID(), category: e.category ?? '', amount: e.amount ?? 0, detail: e.detail ?? '', receiptFileName: e.receiptFileName })),
    }

    const { applied } = await upsertRepReport(c.get('db'), report)
    if (!applied) return c.json({ error: 'より新しい日報が既に登録されています。' }, 409)
    return c.json({ ok: true, id: report.id })
  })

  // スタッフ日報の提出
  app.post('/api/reports/staff', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'ログインが必要です。' }, 401)

    const body = await c.req.json<Partial<DailyReportStaff> & { staffId?: string }>()
    if (!body.date) return c.json({ error: '日付が必要です。' }, 400)

    // 代表は任意のスタッフ分を代理入力可。スタッフは自分の分のみ。
    const staffId = user.role === '代表' ? (body.staffId ?? user.id) : user.id
    const db = c.get('db')
    const { findStaffById } = await import('../db/repository.ts')
    const target = await findStaffById(db, staffId)
    if (!target) return c.json({ error: '対象スタッフが見つかりません。' }, 404)
    if (user.role !== '代表' && staffId !== user.id) return c.json({ error: '自分の日報のみ提出できます。' }, 403)

    const report: DailyReportStaff = {
      id: randomUUID(),
      date: body.date,
      staffId: target.id,
      reporterName: target.name,
      department: target.department,
      shiftStart: body.shiftStart ?? '00:00',
      shiftEnd: body.shiftEnd ?? '00:00',
      breakMinutes: body.breakMinutes ?? 0,
      todaySales: body.todaySales ?? 0,
      crossSellCount: body.crossSellCount ?? 0,
      goodPoints: body.goodPoints ?? '',
      improvementPoints: body.improvementPoints ?? '',
      submittedAt: Date.now(),
      namedCustomers: (body.namedCustomers ?? []).map((n) => ({ customerName: n.customerName ?? '', amount: n.amount ?? 0 })),
    }

    const { applied } = await upsertStaffReport(db, report)
    if (!applied) return c.json({ error: 'より新しい日報が既に登録されています。' }, 409)
    return c.json({ ok: true, id: report.id })
  })

  // 既存の代表日報を取得（前日コピー・編集用）
  app.get('/api/reports/rep', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)
    const date = c.req.query('date')
    if (!date) return c.json({ error: 'date が必要です。' }, 400)
    const report = await getRepReport(c.get('db'), user.department, date, user.name)
    return c.json(report ?? null)
  })

  // 月内の代表日報一覧
  app.get('/api/reports/rep/month', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)
    const month = c.req.query('month') ?? ''
    return c.json(await getRepReportsByMonth(c.get('db'), user.department, month))
  })

  // 月内のスタッフ日報一覧（代表=部門全員、スタッフ=自分）
  app.get('/api/reports/staff/month', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'ログインが必要です。' }, 401)
    const month = c.req.query('month') ?? ''
    if (user.role === '代表') return c.json(await getStaffReportsByMonth(c.get('db'), user.department, month))
    return c.json(await getStaffReportsByStaffMonth(c.get('db'), user.id, month))
  })
}
