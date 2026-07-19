import { randomUUID } from 'node:crypto'
import { getDb } from './db.js'
import type {
  DailyReportRep,
  DailyReportStaff,
  Department,
  DepartmentGoal,
  ExpenseLine,
  RateMaster,
  StaffMember,
  StaffRole,
} from '../types.js'

// --- rates ---------------------------------------------------------------

export function getRates(): RateMaster {
  const row = getDb().prepare('SELECT * FROM rates WHERE id = 1').get() as
    | {
        tax_rate: number
        hiace_incentive_rate: number
        hq_incentive_rate: number
        staff_incentive_rate: number
        hourly_wage_dept1: number
        hourly_wage_dept2: number
      }
    | undefined
  if (!row) {
    throw new Error('パラメータマスターが未設定です。`npm run seed` を実行してください。')
  }
  return {
    taxRate: row.tax_rate,
    hiaceIncentiveRate: row.hiace_incentive_rate,
    hqIncentiveRate: row.hq_incentive_rate,
    staffIncentiveRate: row.staff_incentive_rate,
    hourlyWageDept1: row.hourly_wage_dept1,
    hourlyWageDept2: row.hourly_wage_dept2,
  }
}

export function upsertRates(rates: RateMaster): void {
  getDb()
    .prepare(
      `INSERT INTO rates (id, tax_rate, hiace_incentive_rate, hq_incentive_rate, staff_incentive_rate, hourly_wage_dept1, hourly_wage_dept2)
       VALUES (1, @taxRate, @hiaceIncentiveRate, @hqIncentiveRate, @staffIncentiveRate, @hourlyWageDept1, @hourlyWageDept2)
       ON CONFLICT (id) DO UPDATE SET
         tax_rate = excluded.tax_rate,
         hiace_incentive_rate = excluded.hiace_incentive_rate,
         hq_incentive_rate = excluded.hq_incentive_rate,
         staff_incentive_rate = excluded.staff_incentive_rate,
         hourly_wage_dept1 = excluded.hourly_wage_dept1,
         hourly_wage_dept2 = excluded.hourly_wage_dept2`,
    )
    .run(rates)
}

// --- staff -----------------------------------------------------------------

interface StaffRow {
  id: string
  name: string
  role: StaffRole
  department: Department
  hourly_wage_override: number | null
  monthly_goal: number
}

function mapStaffRow(row: StaffRow): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    hourlyWageOverride: row.hourly_wage_override ?? undefined,
    monthlyGoal: row.monthly_goal,
  }
}

export function getAllStaff(): StaffMember[] {
  const rows = getDb().prepare('SELECT * FROM staff ORDER BY role, department, name').all() as StaffRow[]
  return rows.map(mapStaffRow)
}

export function findStaffByName(name: string, role?: StaffRole): StaffMember | undefined {
  const row = role
    ? (getDb().prepare('SELECT * FROM staff WHERE name = ? AND role = ?').get(name, role) as StaffRow | undefined)
    : (getDb().prepare('SELECT * FROM staff WHERE name = ?').get(name) as StaffRow | undefined)
  return row ? mapStaffRow(row) : undefined
}

export function findStaffById(id: string): StaffMember | undefined {
  const row = getDb().prepare('SELECT * FROM staff WHERE id = ?').get(id) as StaffRow | undefined
  return row ? mapStaffRow(row) : undefined
}

export function upsertStaff(staff: StaffMember): void {
  getDb()
    .prepare(
      `INSERT INTO staff (id, name, role, department, hourly_wage_override, monthly_goal)
       VALUES (@id, @name, @role, @department, @hourlyWageOverride, @monthlyGoal)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name,
         role = excluded.role,
         department = excluded.department,
         hourly_wage_override = excluded.hourly_wage_override,
         monthly_goal = excluded.monthly_goal`,
    )
    .run({ ...staff, hourlyWageOverride: staff.hourlyWageOverride ?? null })
}

// --- department goals --------------------------------------------------------

interface DepartmentGoalRow {
  department: Department
  month: string
  monthly_sales_goal: number
  business_days: number
}

function mapGoalRow(row: DepartmentGoalRow): DepartmentGoal {
  return { department: row.department, month: row.month, monthlySalesGoal: row.monthly_sales_goal, businessDays: row.business_days }
}

export function getDepartmentGoal(department: Department, month: string): DepartmentGoal | undefined {
  const row = getDb().prepare('SELECT * FROM department_goals WHERE department = ? AND month = ?').get(department, month) as
    | DepartmentGoalRow
    | undefined
  return row ? mapGoalRow(row) : undefined
}

export function getAllDepartmentGoals(): DepartmentGoal[] {
  const rows = getDb().prepare('SELECT * FROM department_goals ORDER BY month, department').all() as DepartmentGoalRow[]
  return rows.map(mapGoalRow)
}

export function upsertDepartmentGoal(goal: DepartmentGoal): void {
  getDb()
    .prepare(
      `INSERT INTO department_goals (department, month, monthly_sales_goal, business_days)
       VALUES (@department, @month, @monthlySalesGoal, @businessDays)
       ON CONFLICT (department, month) DO UPDATE SET
         monthly_sales_goal = excluded.monthly_sales_goal,
         business_days = excluded.business_days`,
    )
    .run(goal)
}

// --- rep reports -------------------------------------------------------------

interface RepReportRow {
  id: string
  date: string
  department: Department
  reporter_name: string
  submitted_at: number
  source_chat_id: string | null
  normal_sales: number
  hiace_sales: number
  personal_existing_customers: number
  personal_new_customers: number
  cross_sell_count: number
  cash_sales: number
  card_sales: number
  emoney_sales: number
  qr_sales: number
  staff_sales_breakdown: number
  event_sales_breakdown: number
  hq_sales_breakdown: number
  overall_existing_customers: number
  overall_new_customers: number
  comment: string
  today_plan: string
  invoice_file_name: string | null
}

interface ExpenseRow {
  id: string
  rep_report_id: string
  category: string
  amount: number
  detail: string
  receipt_file_name: string | null
}

function mapExpenseRow(row: ExpenseRow): ExpenseLine {
  return { id: row.id, category: row.category, amount: row.amount, detail: row.detail, receiptFileName: row.receipt_file_name ?? undefined }
}

function mapRepReportRow(row: RepReportRow, expenses: ExpenseLine[]): DailyReportRep {
  return {
    id: row.id,
    date: row.date,
    department: row.department,
    reporterName: row.reporter_name,
    submittedAt: row.submitted_at,
    sourceChatId: row.source_chat_id ?? undefined,
    normalSales: row.normal_sales,
    hiaceSales: row.hiace_sales,
    personalExistingCustomers: row.personal_existing_customers,
    personalNewCustomers: row.personal_new_customers,
    crossSellCount: row.cross_sell_count,
    cashSales: row.cash_sales,
    cardSales: row.card_sales,
    emoneySales: row.emoney_sales,
    qrSales: row.qr_sales,
    staffSalesBreakdown: row.staff_sales_breakdown,
    eventSalesBreakdown: row.event_sales_breakdown,
    hqSalesBreakdown: row.hq_sales_breakdown,
    overallExistingCustomers: row.overall_existing_customers,
    overallNewCustomers: row.overall_new_customers,
    comment: row.comment,
    todayPlan: row.today_plan,
    invoiceFileName: row.invoice_file_name ?? undefined,
    expenses,
  }
}

function loadExpensesFor(repReportId: string): ExpenseLine[] {
  const rows = getDb().prepare('SELECT * FROM rep_report_expenses WHERE rep_report_id = ?').all(repReportId) as ExpenseRow[]
  return rows.map(mapExpenseRow)
}

export function getRepReportsByMonth(department: Department, month: string): DailyReportRep[] {
  const rows = getDb()
    .prepare("SELECT * FROM rep_reports WHERE department = ? AND date LIKE ? || '%' ORDER BY date")
    .all(department, month) as RepReportRow[]
  return rows.map((row) => mapRepReportRow(row, loadExpensesFor(row.id)))
}

export function getRepReportsByReporterAndMonth(reporterName: string, department: Department, month: string): DailyReportRep[] {
  return getRepReportsByMonth(department, month).filter((r) => r.reporterName === reporterName)
}

/** 3.7 データ修正ルール: 同一キー（日付＋部門＋報告者）は submittedAt が新しい方だけを反映する */
export function upsertRepReport(report: DailyReportRep): { applied: boolean } {
  const db = getDb()
  const existing = db
    .prepare('SELECT id, submitted_at FROM rep_reports WHERE date = ? AND department = ? AND reporter_name = ?')
    .get(report.date, report.department, report.reporterName) as { id: string; submitted_at: number } | undefined

  if (existing && existing.submitted_at > report.submittedAt) {
    return { applied: false }
  }

  const id = existing?.id ?? report.id

  const apply = db.transaction(() => {
    db.prepare(
      `INSERT INTO rep_reports (
         id, date, department, reporter_name, submitted_at, source_chat_id,
         normal_sales, hiace_sales, personal_existing_customers, personal_new_customers, cross_sell_count,
         cash_sales, card_sales, emoney_sales, qr_sales, staff_sales_breakdown, event_sales_breakdown, hq_sales_breakdown,
         overall_existing_customers, overall_new_customers, comment, today_plan, invoice_file_name
       ) VALUES (
         @id, @date, @department, @reporterName, @submittedAt, @sourceChatId,
         @normalSales, @hiaceSales, @personalExistingCustomers, @personalNewCustomers, @crossSellCount,
         @cashSales, @cardSales, @emoneySales, @qrSales, @staffSalesBreakdown, @eventSalesBreakdown, @hqSalesBreakdown,
         @overallExistingCustomers, @overallNewCustomers, @comment, @todayPlan, @invoiceFileName
       )
       ON CONFLICT (id) DO UPDATE SET
         submitted_at = excluded.submitted_at,
         source_chat_id = excluded.source_chat_id,
         normal_sales = excluded.normal_sales,
         hiace_sales = excluded.hiace_sales,
         personal_existing_customers = excluded.personal_existing_customers,
         personal_new_customers = excluded.personal_new_customers,
         cross_sell_count = excluded.cross_sell_count,
         cash_sales = excluded.cash_sales,
         card_sales = excluded.card_sales,
         emoney_sales = excluded.emoney_sales,
         qr_sales = excluded.qr_sales,
         staff_sales_breakdown = excluded.staff_sales_breakdown,
         event_sales_breakdown = excluded.event_sales_breakdown,
         hq_sales_breakdown = excluded.hq_sales_breakdown,
         overall_existing_customers = excluded.overall_existing_customers,
         overall_new_customers = excluded.overall_new_customers,
         comment = excluded.comment,
         today_plan = excluded.today_plan,
         invoice_file_name = excluded.invoice_file_name`,
    ).run({ ...report, id, sourceChatId: report.sourceChatId ?? null, invoiceFileName: report.invoiceFileName ?? null })

    db.prepare('DELETE FROM rep_report_expenses WHERE rep_report_id = ?').run(id)
    const insertExpense = db.prepare(
      `INSERT INTO rep_report_expenses (id, rep_report_id, category, amount, detail, receipt_file_name)
       VALUES (@id, @repReportId, @category, @amount, @detail, @receiptFileName)`,
    )
    for (const expense of report.expenses) {
      insertExpense.run({
        id: expense.id || randomUUID(),
        repReportId: id,
        category: expense.category,
        amount: expense.amount,
        detail: expense.detail,
        receiptFileName: expense.receiptFileName ?? null,
      })
    }
  })
  apply()

  return { applied: true }
}

// --- staff reports -------------------------------------------------------------

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
  sales_detail: string
  existing_customers: number
  new_customers: number
  cross_sell_count: number
  good_points: string
  improvement_points: string
  submitted_at: number
  source_chat_id: string | null
}

function mapStaffReportRow(row: StaffReportRow): DailyReportStaff {
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
    salesDetail: row.sales_detail,
    existingCustomers: row.existing_customers,
    newCustomers: row.new_customers,
    crossSellCount: row.cross_sell_count,
    goodPoints: row.good_points,
    improvementPoints: row.improvement_points,
    submittedAt: row.submitted_at,
    sourceChatId: row.source_chat_id ?? undefined,
  }
}

export function getStaffReportsByMonth(department: Department, month: string): DailyReportStaff[] {
  const rows = getDb()
    .prepare("SELECT * FROM staff_reports WHERE department = ? AND date LIKE ? || '%' ORDER BY date")
    .all(department, month) as StaffReportRow[]
  return rows.map(mapStaffReportRow)
}

export function getStaffReportsByStaffAndMonth(staffId: string, month: string): DailyReportStaff[] {
  const rows = getDb()
    .prepare("SELECT * FROM staff_reports WHERE staff_id = ? AND date LIKE ? || '%' ORDER BY date")
    .all(staffId, month) as StaffReportRow[]
  return rows.map(mapStaffReportRow)
}

/** 3.7 データ修正ルール: 同一キー（日付＋スタッフ）は submittedAt が新しい方だけを反映する */
export function upsertStaffReport(report: DailyReportStaff): { applied: boolean } {
  const db = getDb()
  const existing = db.prepare('SELECT id, submitted_at FROM staff_reports WHERE date = ? AND staff_id = ?').get(report.date, report.staffId) as
    | { id: string; submitted_at: number }
    | undefined

  if (existing && existing.submitted_at > report.submittedAt) {
    return { applied: false }
  }

  const id = existing?.id ?? report.id

  db.prepare(
    `INSERT INTO staff_reports (
       id, date, staff_id, reporter_name, department, shift_start, shift_end, break_minutes,
       today_sales, sales_detail, existing_customers, new_customers, cross_sell_count,
       good_points, improvement_points, submitted_at, source_chat_id
     ) VALUES (
       @id, @date, @staffId, @reporterName, @department, @shiftStart, @shiftEnd, @breakMinutes,
       @todaySales, @salesDetail, @existingCustomers, @newCustomers, @crossSellCount,
       @goodPoints, @improvementPoints, @submittedAt, @sourceChatId
     )
     ON CONFLICT (id) DO UPDATE SET
       submitted_at = excluded.submitted_at,
       source_chat_id = excluded.source_chat_id,
       shift_start = excluded.shift_start,
       shift_end = excluded.shift_end,
       break_minutes = excluded.break_minutes,
       today_sales = excluded.today_sales,
       sales_detail = excluded.sales_detail,
       existing_customers = excluded.existing_customers,
       new_customers = excluded.new_customers,
       cross_sell_count = excluded.cross_sell_count,
       good_points = excluded.good_points,
       improvement_points = excluded.improvement_points`,
  ).run({ ...report, id, sourceChatId: report.sourceChatId ?? null })

  return { applied: true }
}
