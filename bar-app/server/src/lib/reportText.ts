import type { DailyReportRep, DailyReportStaff, Department, DepartmentGoal, RateMaster, StaffMember } from '../types.ts'
import {
  aggregateMonthlyRep,
  aggregateMonthlyStaff,
  freeShareForReport,
  hiaceIncentiveForReport,
  netRevenueForReport,
  paymentFeeForReport,
} from './calculations.ts'

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`
}

function jpDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  const wd = ['日', '月', '火', '水', '木', '金', '土'][new Date(`${dateStr}T00:00:00`).getDay()]
  return `${m}/${d}(${wd})`
}

export interface RepTextContext {
  report: DailyReportRep
  goal: DepartmentGoal
  rates: RateMaster
  staff: StaffMember[]
  monthRepReports: DailyReportRep[]
  monthStaffReports: DailyReportStaff[]
  asOfDate: string
}

/** 8.1 代表日報（日報グループへ即時転送） */
export function buildRepReportText(ctx: RepTextContext): string {
  const { report, goal, rates, staff } = ctx
  const nameById = new Map(staff.map((s) => [s.id, s.name]))
  const agg = aggregateMonthlyRep({
    department: report.department,
    month: report.date.slice(0, 7),
    asOfDate: ctx.asOfDate,
    goal,
    rates,
    staff,
    repReports: ctx.monthRepReports,
    staffReports: ctx.monthStaffReports,
  })

  const lines: string[] = []
  lines.push(`#代表日報（${report.department}）`)
  lines.push('')
  lines.push(`日付　${jpDate(report.date)}`)
  lines.push(`月目標　${yen(goal.monthlySalesGoal)} ★`)
  lines.push(`当日売り上げ　${yen(report.overallSales)}（BAR全体）`)
  lines.push(`※内、代表 ${yen(report.personalSales)}`)
  for (const b of report.staffBreakdown) {
    lines.push(`※内、${nameById.get(b.staffId) ?? b.staffId} ${yen(b.sales)}`)
  }
  lines.push(`※フリー・その他 ${yen(freeShareForReport(report))} ★`)
  lines.push('')
  lines.push('内訳')
  lines.push(`└現金 ${yen(report.cashSales)}`)
  lines.push(`└クレカ ${yen(report.cardSales)}`)
  lines.push(`└電子マネー ${yen(report.emoneySales)}`)
  lines.push(`└QR ${yen(report.qrSales)}`)
  lines.push(`（決済手数料 ${yen(paymentFeeForReport(report, rates))} ★ / 手数料控除後 ${yen(netRevenueForReport(report, rates))} ★）`)
  if (report.hiaceSales || report.hqSales || report.eventSales) {
    lines.push('')
    if (report.hiaceSales) lines.push(`ハイエース売上 ${yen(report.hiaceSales)}（インセン ${yen(hiaceIncentiveForReport(report, rates))} ★）`)
    if (report.hqSales) lines.push(`本部売上 ${yen(report.hqSales)}`)
    if (report.eventSales) lines.push(`イベント売上 ${yen(report.eventSales)}`)
  }
  lines.push('')
  lines.push(`来客数　${report.groupsCount}組 ${report.newCustomers + report.existingCustomers}名`)
  lines.push('内訳')
  lines.push(`└新規 ${report.newCustomers}名`)
  lines.push(`└既存 ${report.existingCustomers}名`)
  for (const b of report.staffBreakdown) {
    lines.push(`└${nameById.get(b.staffId) ?? b.staffId} ${b.customerCount}名`)
  }
  lines.push('')
  lines.push(`当月累計売上 ${yen(agg.overallCumulative)} ★`)
  lines.push(`代表個人累計 ${yen(agg.personalCumulative)} ★`)
  lines.push(`残営業日 ${agg.remainingBusinessDays}日 ★`)
  lines.push(`1日必達 ${yen(agg.dailyRequired)} ★`)
  for (const s of agg.staffCumulative) {
    lines.push(`${nameById.get(s.staffId) ?? s.staffId}累計 ${yen(s.sales)} ★`)
  }
  lines.push(`新規累計 ${agg.newCustomersCumulative}名 ★`)
  lines.push('')
  lines.push('『総評』')
  lines.push(report.comment || '-')
  lines.push('')
  lines.push('『当日予定』')
  lines.push(`・出勤　${report.planAttendance || '-'}`)
  lines.push(`・予約　${report.planReservation || '-'}`)
  lines.push(`・予定/タスク　${report.planTask || '-'}`)
  return lines.join('\n')
}

export interface DailySummaryContext {
  date: string
  departments: {
    department: Department
    goal: DepartmentGoal
    agg: ReturnType<typeof aggregateMonthlyRep>
    todayOverall: number
    todayProfit: number
    submittedReporters: string[]
    missingReporters: string[]
  }[]
}

/** 8 / 5章 日次サマリー（日報グループへ・毎日定時） */
export function buildDailySummaryText(ctx: DailySummaryContext): string {
  const lines: string[] = []
  lines.push(`【日次サマリー】${jpDate(ctx.date)}`)
  for (const d of ctx.departments) {
    lines.push('')
    lines.push(`■ ${d.department}`)
    lines.push(`前営業日売上 ${yen(d.todayOverall)} / 利益(暫定) ${yen(d.todayProfit)}`)
    lines.push(`当月累計 ${yen(d.agg.overallCumulative)} / 目標 ${yen(d.goal.monthlySalesGoal)}（達成率 ${(d.agg.achievementRate * 100).toFixed(1)}%）`)
    lines.push(`残営業日 ${d.agg.remainingBusinessDays}日 / 1日必達 ${yen(d.agg.dailyRequired)}`)
    if (d.missingReporters.length) lines.push(`未提出: ${d.missingReporters.join('、')}`)
    else lines.push('未提出: なし')
  }
  return lines.join('\n')
}

export interface StaffDigestContext {
  date: string
  rates: RateMaster
  entries: {
    staff: StaffMember
    report: DailyReportStaff
    monthReports: DailyReportStaff[]
  }[]
}

/** ⑤ スタッフ日報まとめ（スタッフ日報グループへ・1日1通） */
export function buildStaffDigestText(ctx: StaffDigestContext): string {
  const lines: string[] = []
  lines.push(`【スタッフ日報まとめ】${jpDate(ctx.date)}`)
  if (!ctx.entries.length) {
    lines.push('')
    lines.push('本日の提出はありません。')
    return lines.join('\n')
  }
  for (const e of ctx.entries) {
    const agg = aggregateMonthlyStaff(e.staff, e.monthReports, ctx.rates)
    lines.push('')
    lines.push(`● ${e.staff.name}（${e.staff.department}）`)
    lines.push(`勤務 ${e.report.shiftStart}〜${e.report.shiftEnd}（休憩${e.report.breakMinutes}分）`)
    lines.push(`当日売上 ${yen(e.report.todaySales)} / 当月 ${yen(agg.monthlySales)}（目標 ${yen(agg.monthlyGoal)}）`)
    if (e.report.namedCustomers.length) {
      lines.push(`指名: ${e.report.namedCustomers.map((c) => `${c.customerName} ${yen(c.amount)}`).join('、')}`)
    }
    if (e.report.goodPoints) lines.push(`良い点: ${e.report.goodPoints.replace(/\n/g, ' ')}`)
    if (e.report.improvementPoints) lines.push(`改善点: ${e.report.improvementPoints.replace(/\n/g, ' ')}`)
  }
  return lines.join('\n')
}
