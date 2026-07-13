import type { Hono } from 'hono'
import type { Env } from '../app.ts'
import type { Department } from '../types.ts'
import { aggregateMonthlyRep, aggregateMonthlyStaff } from '../lib/calculations.ts'
import {
  findStaffById,
  getAllStaff,
  getDepartmentGoal,
  getRates,
  getRepReportsByMonth,
  getStaffReportsByMonth,
  getStaffReportsByStaffMonth,
} from '../db/repository.ts'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function registerAggregateRoutes(app: Hono<Env>) {
  // 部門×月の経営ダッシュボード集計（代表のみ）
  app.get('/api/aggregate/dashboard', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)
    const db = c.get('db')
    const department = (c.req.query('department') as Department) || user.department
    const month = c.req.query('month') || todayISO().slice(0, 7)

    const rates = await getRates(db)
    const staff = await getAllStaff(db)
    const goal = (await getDepartmentGoal(db, department, month)) ?? { department, month, monthlySalesGoal: 0, businessDays: 26 }
    const repReports = await getRepReportsByMonth(db, department, month)
    const staffReports = await getStaffReportsByMonth(db, department, month)
    const asOfDate = month === todayISO().slice(0, 7) ? todayISO() : `${month}-28`

    const agg = aggregateMonthlyRep({ department, month, asOfDate, goal, rates, staff, repReports, staffReports })

    // スタッフ名を付与
    const staffById = new Map(staff.map((s) => [s.id, s.name]))
    const staffCumulative = agg.staffCumulative.map((s) => ({ ...s, name: staffById.get(s.staffId) ?? s.staffId }))

    return c.json({ department, month, ...agg, staffCumulative, rates })
  })

  // スタッフ個人集計。本人 or 代表が閲覧可。公開範囲は決定Fに従う。
  app.get('/api/aggregate/staff', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'ログインが必要です。' }, 401)
    const db = c.get('db')
    const staffId = c.req.query('staffId') || user.id
    const month = c.req.query('month') || todayISO().slice(0, 7)

    // 権限: スタッフは自分のみ
    if (user.role !== '代表' && staffId !== user.id) return c.json({ error: '権限がありません。' }, 403)

    const target = await findStaffById(db, staffId)
    if (!target) return c.json({ error: 'スタッフが見つかりません。' }, 404)
    const rates = await getRates(db)
    const reports = await getStaffReportsByStaffMonth(db, staffId, month)
    const agg = aggregateMonthlyStaff(target, reports, rates)

    // 決定F: 本人には売上・インセンまで。時給×時間・生産性は代表のみ。
    const isRep = user.role === '代表'
    return c.json({
      staffId,
      name: target.name,
      department: target.department,
      month,
      monthlyGoal: agg.monthlyGoal,
      monthlySales: agg.monthlySales,
      incentive: agg.incentive,
      // 代表のみ
      hourlyWage: isRep ? agg.hourlyWage : undefined,
      workedMinutes: isRep ? agg.workedMinutes : undefined,
      productivity: isRep ? agg.productivity : undefined,
      dailyReports: reports.map((r) => ({
        date: r.date,
        shiftStart: r.shiftStart,
        shiftEnd: r.shiftEnd,
        breakMinutes: r.breakMinutes,
        todaySales: r.todaySales,
        namedCustomers: r.namedCustomers,
      })),
    })
  })

  // 部門×月の日次進捗（代表のみ）
  app.get('/api/aggregate/daily', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)
    const db = c.get('db')
    const department = (c.req.query('department') as Department) || user.department
    const month = c.req.query('month') || todayISO().slice(0, 7)
    const rates = await getRates(db)
    const staff = await getAllStaff(db)
    const repReports = await getRepReportsByMonth(db, department, month)
    const staffReports = await getStaffReportsByMonth(db, department, month)
    const staffById = new Map(staff.map((s) => [s.id, s]))

    const { computeWorkedMinutes, hourlyWageFor, taxExclude, paymentFeeForReport } = await import('../lib/calculations.ts')

    let cumulative = 0
    const rows = repReports
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => {
        const expense = r.expenses.reduce((s, e) => s + e.amount, 0)
        const labor = staffReports
          .filter((sr) => sr.date === r.date)
          .reduce((s, sr) => {
            const m = staffById.get(sr.staffId)
            if (!m) return s
            return s + (computeWorkedMinutes(sr.shiftStart, sr.shiftEnd, sr.breakMinutes) / 60) * hourlyWageFor(m, rates)
          }, 0)
        const fee = paymentFeeForReport(r, rates)
        cumulative += r.overallSales
        const customers = r.newCustomers + r.existingCustomers
        return {
          date: r.date,
          overallSales: r.overallSales,
          personalSales: r.personalSales,
          paymentFee: fee,
          netRevenue: r.overallSales - fee,
          expense,
          laborCost: labor,
          dailyProfit: taxExclude(r.overallSales, rates.taxRate) - expense - labor - fee,
          cumulative,
          customers,
          groups: r.groupsCount,
          unitPrice: customers > 0 ? r.overallSales / customers : 0,
        }
      })
    return c.json({ department, month, rows })
  })
}
