import { randomUUID } from 'node:crypto'
import type { Db } from './driver.ts'
import type {
  DailyReportRep,
  DailyReportStaff,
  DeliverySettings,
  Department,
  DepartmentGoal,
  OutboxEntry,
  RateMaster,
  StaffMember,
} from '../types.ts'

// --- rates -----------------------------------------------------------------

export async function getRates(db: Db): Promise<RateMaster> {
  const row = await db.get<Record<string, number>>('SELECT * FROM rates WHERE id = 1')
  if (!row) throw new Error('パラメータ未設定です。seedを実行してください。')
  return {
    taxRate: row.tax_rate,
    hiaceIncentiveRate: row.hiace_incentive_rate,
    hqIncentiveRate: row.hq_incentive_rate,
    staffIncentiveRate: row.staff_incentive_rate,
    hourlyWageDept1: row.hourly_wage_dept1,
    hourlyWageDept2: row.hourly_wage_dept2,
    cardFeeRate: row.card_fee_rate,
    emoneyFeeRate: row.emoney_fee_rate,
    qrFeeRate: row.qr_fee_rate,
  }
}

export async function upsertRates(db: Db, r: RateMaster): Promise<void> {
  await db.run(
    `INSERT INTO rates (id, tax_rate, hiace_incentive_rate, hq_incentive_rate, staff_incentive_rate,
       hourly_wage_dept1, hourly_wage_dept2, card_fee_rate, emoney_fee_rate, qr_fee_rate)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       tax_rate = excluded.tax_rate, hiace_incentive_rate = excluded.hiace_incentive_rate,
       hq_incentive_rate = excluded.hq_incentive_rate, staff_incentive_rate = excluded.staff_incentive_rate,
       hourly_wage_dept1 = excluded.hourly_wage_dept1, hourly_wage_dept2 = excluded.hourly_wage_dept2,
       card_fee_rate = excluded.card_fee_rate, emoney_fee_rate = excluded.emoney_fee_rate,
       qr_fee_rate = excluded.qr_fee_rate`,
    [
      r.taxRate,
      r.hiaceIncentiveRate,
      r.hqIncentiveRate,
      r.staffIncentiveRate,
      r.hourlyWageDept1,
      r.hourlyWageDept2,
      r.cardFeeRate,
      r.emoneyFeeRate,
      r.qrFeeRate,
    ],
  )
}

// --- staff -----------------------------------------------------------------

interface StaffRow {
  id: string
  name: string
  role: StaffMember['role']
  department: Department
  hourly_wage_override: number | null
  monthly_goal: number
  line_user_id: string | null
  active: number
}

function mapStaff(row: StaffRow): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    hourlyWageOverride: row.hourly_wage_override ?? undefined,
    monthlyGoal: row.monthly_goal,
    lineUserId: row.line_user_id ?? undefined,
    active: row.active === 1,
  }
}

export async function getAllStaff(db: Db, includeInactive = false): Promise<StaffMember[]> {
  const sql = includeInactive
    ? 'SELECT * FROM staff ORDER BY role, department, name'
    : 'SELECT * FROM staff WHERE active = 1 ORDER BY role, department, name'
  return (await db.all<StaffRow>(sql)).map(mapStaff)
}

export async function findStaffById(db: Db, id: string): Promise<StaffMember | undefined> {
  const row = await db.get<StaffRow>('SELECT * FROM staff WHERE id = ?', [id])
  return row ? mapStaff(row) : undefined
}

export async function upsertStaff(db: Db, s: StaffMember): Promise<void> {
  await db.run(
    `INSERT INTO staff (id, name, role, department, hourly_wage_override, monthly_goal, line_user_id, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       name = excluded.name, role = excluded.role, department = excluded.department,
       hourly_wage_override = excluded.hourly_wage_override, monthly_goal = excluded.monthly_goal,
       line_user_id = excluded.line_user_id, active = excluded.active`,
    [s.id, s.name, s.role, s.department, s.hourlyWageOverride ?? null, s.monthlyGoal, s.lineUserId ?? null, s.active ? 1 : 0],
  )
}

// --- department goals ------------------------------------------------------

interface GoalRow {
  department: Department
  month: string
  monthly_sales_goal: number
  business_days: number
}

export async function getDepartmentGoal(db: Db, department: Department, month: string): Promise<DepartmentGoal | undefined> {
  const row = await db.get<GoalRow>('SELECT * FROM department_goals WHERE department = ? AND month = ?', [department, month])
  return row ? { department: row.department, month: row.month, monthlySalesGoal: row.monthly_sales_goal, businessDays: row.business_days } : undefined
}

export async function getAllDepartmentGoals(db: Db): Promise<DepartmentGoal[]> {
  const rows = await db.all<GoalRow>('SELECT * FROM department_goals ORDER BY month DESC, department')
  return rows.map((row) => ({ department: row.department, month: row.month, monthlySalesGoal: row.monthly_sales_goal, businessDays: row.business_days }))
}

export async function upsertDepartmentGoal(db: Db, g: DepartmentGoal): Promise<void> {
  await db.run(
    `INSERT INTO department_goals (department, month, monthly_sales_goal, business_days)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (department, month) DO UPDATE SET
       monthly_sales_goal = excluded.monthly_sales_goal, business_days = excluded.business_days`,
    [g.department, g.month, g.monthlySalesGoal, g.businessDays],
  )
}

// --- rep reports -----------------------------------------------------------

interface RepRow {
  id: string
  date: string
  department: Department
  reporter_name: string
  submitted_at: number
  overall_sales: number
  personal_sales: number
  hiace_sales: number
  hq_sales: number
  event_sales: number
  cash_sales: number
  card_sales: number
  emoney_sales: number
  qr_sales: number
  groups_count: number
  new_customers: number
  existing_customers: number
  comment: string
  plan_attendance: string
  plan_reservation: string
  plan_task: string
}

async function hydrateRep(db: Db, row: RepRow): Promise<DailyReportRep> {
  const breakdown = await db.all<{ staff_id: string; sales: number; customer_count: number }>(
    'SELECT staff_id, sales, customer_count FROM rep_report_staff_breakdown WHERE rep_report_id = ?',
    [row.id],
  )
  const expenses = await db.all<{ id: string; category: string; amount: number; detail: string; receipt_file_name: string | null; receipt_url: string | null }>(
    'SELECT id, category, amount, detail, receipt_file_name, receipt_url FROM rep_report_expenses WHERE rep_report_id = ?',
    [row.id],
  )
  return {
    id: row.id,
    date: row.date,
    department: row.department,
    reporterName: row.reporter_name,
    submittedAt: row.submitted_at,
    overallSales: row.overall_sales,
    personalSales: row.personal_sales,
    hiaceSales: row.hiace_sales,
    hqSales: row.hq_sales,
    eventSales: row.event_sales,
    cashSales: row.cash_sales,
    cardSales: row.card_sales,
    emoneySales: row.emoney_sales,
    qrSales: row.qr_sales,
    groupsCount: row.groups_count,
    newCustomers: row.new_customers,
    existingCustomers: row.existing_customers,
    comment: row.comment,
    planAttendance: row.plan_attendance,
    planReservation: row.plan_reservation,
    planTask: row.plan_task,
    staffBreakdown: breakdown.map((b) => ({ staffId: b.staff_id, sales: b.sales, customerCount: b.customer_count })),
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      amount: e.amount,
      detail: e.detail,
      receiptFileName: e.receipt_file_name ?? undefined,
      receiptUrl: e.receipt_url ?? undefined,
    })),
  }
}

export async function getRepReportsByMonth(db: Db, department: Department, month: string): Promise<DailyReportRep[]> {
  const rows = await db.all<RepRow>("SELECT * FROM rep_reports WHERE department = ? AND substr(date,1,7) = ? ORDER BY date", [department, month])
  return Promise.all(rows.map((r) => hydrateRep(db, r)))
}

export async function getRepReport(db: Db, department: Department, date: string, reporterName: string): Promise<DailyReportRep | undefined> {
  const row = await db.get<RepRow>('SELECT * FROM rep_reports WHERE department = ? AND date = ? AND reporter_name = ?', [department, date, reporterName])
  return row ? hydrateRep(db, row) : undefined
}

/** 3.7 上書きルール: 同一キーは submittedAt が新しい方だけを反映 */
export async function upsertRepReport(db: Db, report: DailyReportRep): Promise<{ applied: boolean }> {
  const existing = await db.get<{ id: string; submitted_at: number }>(
    'SELECT id, submitted_at FROM rep_reports WHERE date = ? AND department = ? AND reporter_name = ?',
    [report.date, report.department, report.reporterName],
  )
  if (existing && existing.submitted_at > report.submittedAt) return { applied: false }
  const id = existing?.id ?? report.id

  await db.run(
    `INSERT INTO rep_reports (id, date, department, reporter_name, submitted_at,
       overall_sales, personal_sales, hiace_sales, hq_sales, event_sales,
       cash_sales, card_sales, emoney_sales, qr_sales,
       groups_count, new_customers, existing_customers,
       comment, plan_attendance, plan_reservation, plan_task)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       submitted_at = excluded.submitted_at, overall_sales = excluded.overall_sales,
       personal_sales = excluded.personal_sales, hiace_sales = excluded.hiace_sales,
       hq_sales = excluded.hq_sales, event_sales = excluded.event_sales,
       cash_sales = excluded.cash_sales, card_sales = excluded.card_sales,
       emoney_sales = excluded.emoney_sales, qr_sales = excluded.qr_sales,
       groups_count = excluded.groups_count, new_customers = excluded.new_customers,
       existing_customers = excluded.existing_customers, comment = excluded.comment,
       plan_attendance = excluded.plan_attendance, plan_reservation = excluded.plan_reservation,
       plan_task = excluded.plan_task`,
    [
      id, report.date, report.department, report.reporterName, report.submittedAt,
      report.overallSales, report.personalSales, report.hiaceSales, report.hqSales, report.eventSales,
      report.cashSales, report.cardSales, report.emoneySales, report.qrSales,
      report.groupsCount, report.newCustomers, report.existingCustomers,
      report.comment, report.planAttendance, report.planReservation, report.planTask,
    ],
  )

  await db.run('DELETE FROM rep_report_staff_breakdown WHERE rep_report_id = ?', [id])
  for (const b of report.staffBreakdown) {
    await db.run('INSERT INTO rep_report_staff_breakdown (id, rep_report_id, staff_id, sales, customer_count) VALUES (?, ?, ?, ?, ?)', [
      randomUUID(), id, b.staffId, b.sales, b.customerCount,
    ])
  }
  await db.run('DELETE FROM rep_report_expenses WHERE rep_report_id = ?', [id])
  for (const e of report.expenses) {
    await db.run(
      'INSERT INTO rep_report_expenses (id, rep_report_id, category, amount, detail, receipt_file_name, receipt_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [e.id || randomUUID(), id, e.category, e.amount, e.detail, e.receiptFileName ?? null, e.receiptUrl ?? null],
    )
  }
  return { applied: true }
}

// --- staff reports ---------------------------------------------------------

interface StaffReportRow {
  id: string
  date: string
  staff_id: string
  reporter_name: string
  department: Department
  shift_start: string
  shift_end: string
  break_minutes: number
  today_sales: number
  cross_sell_count: number
  good_points: string
  improvement_points: string
  submitted_at: number
}

async function hydrateStaffReport(db: Db, row: StaffReportRow): Promise<DailyReportStaff> {
  const customers = await db.all<{ customer_name: string; amount: number }>(
    'SELECT customer_name, amount FROM staff_report_customers WHERE staff_report_id = ?',
    [row.id],
  )
  return {
    id: row.id,
    date: row.date,
    staffId: row.staff_id,
    reporterName: row.reporter_name,
    department: row.department,
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
    breakMinutes: row.break_minutes,
    todaySales: row.today_sales,
    crossSellCount: row.cross_sell_count,
    goodPoints: row.good_points,
    improvementPoints: row.improvement_points,
    submittedAt: row.submitted_at,
    namedCustomers: customers.map((c) => ({ customerName: c.customer_name, amount: c.amount })),
  }
}

export async function getStaffReportsByMonth(db: Db, department: Department, month: string): Promise<DailyReportStaff[]> {
  const rows = await db.all<StaffReportRow>("SELECT * FROM staff_reports WHERE department = ? AND substr(date,1,7) = ? ORDER BY date", [department, month])
  return Promise.all(rows.map((r) => hydrateStaffReport(db, r)))
}

export async function getStaffReportsByStaffMonth(db: Db, staffId: string, month: string): Promise<DailyReportStaff[]> {
  const rows = await db.all<StaffReportRow>("SELECT * FROM staff_reports WHERE staff_id = ? AND substr(date,1,7) = ? ORDER BY date", [staffId, month])
  return Promise.all(rows.map((r) => hydrateStaffReport(db, r)))
}

export async function upsertStaffReport(db: Db, report: DailyReportStaff): Promise<{ applied: boolean }> {
  const existing = await db.get<{ id: string; submitted_at: number }>(
    'SELECT id, submitted_at FROM staff_reports WHERE date = ? AND staff_id = ?',
    [report.date, report.staffId],
  )
  if (existing && existing.submitted_at > report.submittedAt) return { applied: false }
  const id = existing?.id ?? report.id

  await db.run(
    `INSERT INTO staff_reports (id, date, staff_id, reporter_name, department, shift_start, shift_end,
       break_minutes, today_sales, cross_sell_count, good_points, improvement_points, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       submitted_at = excluded.submitted_at, shift_start = excluded.shift_start, shift_end = excluded.shift_end,
       break_minutes = excluded.break_minutes, today_sales = excluded.today_sales,
       cross_sell_count = excluded.cross_sell_count, good_points = excluded.good_points,
       improvement_points = excluded.improvement_points`,
    [
      id, report.date, report.staffId, report.reporterName, report.department, report.shiftStart, report.shiftEnd,
      report.breakMinutes, report.todaySales, report.crossSellCount, report.goodPoints, report.improvementPoints, report.submittedAt,
    ],
  )
  await db.run('DELETE FROM staff_report_customers WHERE staff_report_id = ?', [id])
  for (const c of report.namedCustomers) {
    await db.run('INSERT INTO staff_report_customers (id, staff_report_id, customer_name, amount) VALUES (?, ?, ?, ?)', [
      randomUUID(), id, c.customerName, c.amount,
    ])
  }
  return { applied: true }
}

// --- delivery settings (Phase 2) -------------------------------------------

interface DeliveryRow {
  report_group_id: string
  staff_report_group_id: string
  forward_rep_enabled: number
  daily_summary_enabled: number
  staff_digest_enabled: number
  summary_time: string
  reminder_enabled: number
  reminder_time: string
  alert_enabled: number
  pace_drop_threshold: number
}

export async function getDeliverySettings(db: Db): Promise<DeliverySettings> {
  const row = await db.get<DeliveryRow>('SELECT * FROM delivery_settings WHERE id = 1')
  if (!row) {
    return {
      reportGroupId: '',
      staffReportGroupId: '',
      forwardRepEnabled: true,
      dailySummaryEnabled: true,
      staffDigestEnabled: true,
      summaryTime: '22:00',
      reminderEnabled: true,
      reminderTime: '19:00',
      alertEnabled: true,
      paceDropThreshold: 0.2,
    }
  }
  return {
    reportGroupId: row.report_group_id,
    staffReportGroupId: row.staff_report_group_id,
    forwardRepEnabled: row.forward_rep_enabled === 1,
    dailySummaryEnabled: row.daily_summary_enabled === 1,
    staffDigestEnabled: row.staff_digest_enabled === 1,
    summaryTime: row.summary_time,
    reminderEnabled: row.reminder_enabled === 1,
    reminderTime: row.reminder_time,
    alertEnabled: row.alert_enabled === 1,
    paceDropThreshold: row.pace_drop_threshold,
  }
}

export async function upsertDeliverySettings(db: Db, s: DeliverySettings): Promise<void> {
  await db.run(
    `INSERT INTO delivery_settings (id, report_group_id, staff_report_group_id, forward_rep_enabled,
       daily_summary_enabled, staff_digest_enabled, summary_time,
       reminder_enabled, reminder_time, alert_enabled, pace_drop_threshold)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       report_group_id = excluded.report_group_id, staff_report_group_id = excluded.staff_report_group_id,
       forward_rep_enabled = excluded.forward_rep_enabled, daily_summary_enabled = excluded.daily_summary_enabled,
       staff_digest_enabled = excluded.staff_digest_enabled, summary_time = excluded.summary_time,
       reminder_enabled = excluded.reminder_enabled, reminder_time = excluded.reminder_time,
       alert_enabled = excluded.alert_enabled, pace_drop_threshold = excluded.pace_drop_threshold`,
    [
      s.reportGroupId,
      s.staffReportGroupId,
      s.forwardRepEnabled ? 1 : 0,
      s.dailySummaryEnabled ? 1 : 0,
      s.staffDigestEnabled ? 1 : 0,
      s.summaryTime,
      s.reminderEnabled ? 1 : 0,
      s.reminderTime,
      s.alertEnabled ? 1 : 0,
      s.paceDropThreshold,
    ],
  )
}

// --- line outbox (Phase 2) -------------------------------------------------

export async function recordOutbox(db: Db, entry: OutboxEntry): Promise<void> {
  await db.run('INSERT INTO line_outbox (id, created_at, target, kind, body, status) VALUES (?, ?, ?, ?, ?, ?)', [
    entry.id,
    entry.createdAt,
    entry.target,
    entry.kind,
    entry.body,
    entry.status,
  ])
}

export async function getRecentOutbox(db: Db, limit = 20): Promise<OutboxEntry[]> {
  const rows = await db.all<{ id: string; created_at: number; target: string; kind: string; body: string; status: string }>(
    'SELECT * FROM line_outbox ORDER BY created_at DESC LIMIT ?',
    [limit],
  )
  return rows.map((r) => ({ id: r.id, createdAt: r.created_at, target: r.target, kind: r.kind, body: r.body, status: r.status }))
}

/** 当月のグループ向けpush通数（無料枠監視用・決定G）。個人宛は別カウント想定だがPhase2ではグループのみ */
export async function countOutboxThisMonth(db: Db, monthStartMs: number): Promise<number> {
  const row = await db.get<{ c: number }>("SELECT COUNT(*) AS c FROM line_outbox WHERE created_at >= ? AND status IN ('sent','mock')", [monthStartMs])
  return row?.c ?? 0
}
