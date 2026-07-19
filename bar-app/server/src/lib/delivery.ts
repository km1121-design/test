import type { Db } from '../db/driver.ts'
import type { AppConfig } from '../app.ts'
import type { DailyReportRep, Department } from '../types.ts'
import {
  getAllStaff,
  getDeliverySettings,
  getDepartmentGoal,
  getRates,
  getRepReportsByMonth,
  getStaffReportsByMonth,
  getStaffReportsByStaffMonth,
} from '../db/repository.ts'
import { aggregateMonthlyRep, taxExclude, paymentFeeForReport } from './calculations.ts'
import {
  buildRepReportText,
  buildDailySummaryText,
  buildStaffDigestText,
  type DailySummaryContext,
} from './reportText.ts'
import { pushText } from './line.ts'

const DEPARTMENTS: Department[] = ['1部', '2部']

function todayISO(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

/** ① 代表日報の即時転送（提出時に呼ぶ） */
export async function forwardRepReport(db: Db, config: AppConfig, report: DailyReportRep, now: number) {
  const settings = await getDeliverySettings(db)
  if (!settings.forwardRepEnabled) return { skipped: true as const, reason: '日報転送がOFFです' }

  const month = report.date.slice(0, 7)
  const goal = (await getDepartmentGoal(db, report.department, month)) ?? {
    department: report.department,
    month,
    monthlySalesGoal: 0,
    businessDays: 26,
  }
  const rates = await getRates(db)
  const staff = await getAllStaff(db)
  const monthRepReports = await getRepReportsByMonth(db, report.department, month)
  const monthStaffReports = await getStaffReportsByMonth(db, report.department, month)

  const text = buildRepReportText({
    report,
    goal,
    rates,
    staff,
    monthRepReports,
    monthStaffReports,
    asOfDate: report.date,
  })
  const result = await pushText(db, { token: config.lineToken, to: settings.reportGroupId, text, kind: 'rep-forward', now })
  return { skipped: false as const, result, text }
}

export interface DailyDeliveryResult {
  date: string
  summary: { text: string; result: Awaited<ReturnType<typeof pushText>> } | null
  digest: { text: string; result: Awaited<ReturnType<typeof pushText>> } | null
}

/** ② 日次サマリー ＋ ⑤ スタッフ日報まとめ（cron 22:00 または手動） */
export async function runDailyDelivery(db: Db, config: AppConfig, dateArg: string | undefined, now: number): Promise<DailyDeliveryResult> {
  const date = dateArg || todayISO(now)
  const month = date.slice(0, 7)
  const settings = await getDeliverySettings(db)
  const rates = await getRates(db)
  const staff = await getAllStaff(db)

  // 日次サマリー（両部）
  let summary: DailyDeliveryResult['summary'] = null
  if (settings.dailySummaryEnabled) {
    const departments: DailySummaryContext['departments'] = []
    for (const department of DEPARTMENTS) {
      const goal = (await getDepartmentGoal(db, department, month)) ?? { department, month, monthlySalesGoal: 0, businessDays: 26 }
      const repReports = await getRepReportsByMonth(db, department, month)
      const staffReports = await getStaffReportsByMonth(db, department, month)
      const agg = aggregateMonthlyRep({ department, month, asOfDate: date, goal, rates, staff, repReports, staffReports })

      const todays = repReports.filter((r) => r.date === date)
      const todayOverall = todays.reduce((s, r) => s + r.overallSales, 0)
      const todayProfit = todays.reduce((s, r) => {
        const expense = r.expenses.reduce((a, e) => a + e.amount, 0)
        const fee = paymentFeeForReport(r, rates)
        return s + (taxExclude(r.overallSales, rates.taxRate) - expense - fee)
      }, 0)

      const reps = staff.filter((s) => s.role === '代表' && s.department === department)
      const submittedReporters = todays.map((r) => r.reporterName)
      const missingReporters = reps.filter((r) => !submittedReporters.includes(r.name)).map((r) => r.name)
      departments.push({ department, goal, agg, todayOverall, todayProfit, submittedReporters, missingReporters })
    }
    const text = buildDailySummaryText({ date, departments })
    const result = await pushText(db, { token: config.lineToken, to: settings.reportGroupId, text, kind: 'daily-summary', now })
    summary = { text, result }
  }

  // ⑤ スタッフ日報まとめ（両部まとめて専用グループへ）
  let digest: DailyDeliveryResult['digest'] = null
  if (settings.staffDigestEnabled) {
    const entries: { staff: (typeof staff)[number]; report: NonNullable<Awaited<ReturnType<typeof getStaffReportsByMonth>>>[number]; monthReports: Awaited<ReturnType<typeof getStaffReportsByStaffMonth>> }[] = []
    for (const department of DEPARTMENTS) {
      const staffReports = await getStaffReportsByMonth(db, department, month)
      const todays = staffReports.filter((r) => r.date === date)
      for (const r of todays) {
        const member = staff.find((s) => s.id === r.staffId)
        if (!member) continue
        const monthReports = await getStaffReportsByStaffMonth(db, r.staffId, month)
        entries.push({ staff: member, report: r, monthReports })
      }
    }
    const text = buildStaffDigestText({ date, rates, entries })
    const result = await pushText(db, { token: config.lineToken, to: settings.staffReportGroupId, text, kind: 'staff-digest', now })
    digest = { text, result }
  }

  return { date, summary, digest }
}

// ③ 未提出リマインド ---------------------------------------------------------

export interface ReminderResult {
  date: string
  reminded: { staffId: string; name: string; target: string; status: string }[]
}

/** 締め時刻に、対象日の日報が未提出の在籍者へ個別push（本人のLINE） */
export async function runReminders(db: Db, config: AppConfig, dateArg: string | undefined, now: number): Promise<ReminderResult> {
  const date = dateArg || todayISO(now)
  const month = date.slice(0, 7)
  const settings = await getDeliverySettings(db)
  const reminded: ReminderResult['reminded'] = []
  if (!settings.reminderEnabled) return { date, reminded }

  const staff = await getAllStaff(db)

  // 提出済みの判定材料
  const repByDept = new Map<Department, string[]>()
  const staffSubmitted = new Set<string>()
  for (const department of DEPARTMENTS) {
    const reps = (await getRepReportsByMonth(db, department, month)).filter((r) => r.date === date)
    repByDept.set(department, reps.map((r) => r.reporterName))
    const staffReports = (await getStaffReportsByMonth(db, department, month)).filter((r) => r.date === date)
    for (const sr of staffReports) staffSubmitted.add(sr.staffId)
  }

  for (const member of staff) {
    const submitted =
      member.role === '代表'
        ? (repByDept.get(member.department) ?? []).includes(member.name)
        : staffSubmitted.has(member.id)
    if (submitted) continue

    // 未紐付け(lineUserId無し)はモック宛先 line:<id> を使う。
    // 実push時はLINE側で不達となり failed 記録される（＝要紐付けの検知になる）。
    const target = member.lineUserId || `line:${member.id}`
    const text = `【日報リマインド】${member.name}さん\n${date} の日報が未提出です。アプリから提出をお願いします。`
    const result = await pushText(db, { token: config.lineToken, to: target, text, kind: 'reminder', now })
    reminded.push({ staffId: member.id, name: member.name, target, status: result.status })
  }
  return { date, reminded }
}

// ④ 異常アラート -------------------------------------------------------------

export interface AlertResult {
  date: string
  alerts: { department: Department; message: string; target: string; status: string }[]
}

/** 達成ペースが予定比でしきい値以上下振れした部門について、代表へアラート */
export async function runAlerts(db: Db, config: AppConfig, dateArg: string | undefined, now: number): Promise<AlertResult> {
  const date = dateArg || todayISO(now)
  const month = date.slice(0, 7)
  const settings = await getDeliverySettings(db)
  const alerts: AlertResult['alerts'] = []
  if (!settings.alertEnabled) return { date, alerts }

  const rates = await getRates(db)
  const staff = await getAllStaff(db)

  for (const department of DEPARTMENTS) {
    const goal = await getDepartmentGoal(db, department, month)
    if (!goal || goal.monthlySalesGoal <= 0 || goal.businessDays <= 0) continue
    const repReports = await getRepReportsByMonth(db, department, month)
    const staffReports = await getStaffReportsByMonth(db, department, month)
    const agg = aggregateMonthlyRep({ department, month, asOfDate: date, goal, rates, staff, repReports, staffReports })

    const elapsed = goal.businessDays - agg.remainingBusinessDays
    if (elapsed <= 0) continue
    const expected = (goal.monthlySalesGoal * elapsed) / goal.businessDays
    if (expected <= 0) continue
    const shortfallRatio = (expected - agg.overallCumulative) / expected
    if (shortfallRatio >= settings.paceDropThreshold) {
      const msg =
        `【達成ペース警告】${department}\n` +
        `${date}時点の当月累計 ¥${Math.round(agg.overallCumulative).toLocaleString('ja-JP')} は、` +
        `予定ペース ¥${Math.round(expected).toLocaleString('ja-JP')} を ` +
        `${(shortfallRatio * 100).toFixed(0)}% 下回っています（達成率 ${(agg.achievementRate * 100).toFixed(1)}%）。\n` +
        `残${agg.remainingBusinessDays}日・1日必達 ¥${Math.round(agg.dailyRequired).toLocaleString('ja-JP')}。`
      const reps = staff.filter((s) => s.role === '代表' && s.department === department)
      for (const rep of reps) {
        const target = rep.lineUserId || `line:${rep.id}`
        const result = await pushText(db, { token: config.lineToken, to: target, text: msg, kind: 'alert', now })
        alerts.push({ department, message: msg, target, status: result.status })
      }
    }
  }
  return { date, alerts }
}
