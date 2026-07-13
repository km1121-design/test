import type { DailyReportRep, DailyReportStaff, Department, DepartmentGoal, RateMaster, StaffMember } from '../types.ts'

/**
 * 計算エンジン。要件定義書 docs/bar-app-requirements.md の 4.3〜4.7 節に対応。
 * リポジトリ層で最新の日報のみ取得済みである前提（同一キーの重複排除は不要）。
 * 純粋関数として実装し、フロント側の期待値検証にも流用できるようにする。
 */

function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(8, 10))
}

/** 4.7(旧) 勤怠時間: 日またぎ（終了 <= 開始）は24時間補正。負値は0に丸める */
export function computeWorkedMinutes(shiftStart: string, shiftEnd: string, breakMinutes: number): number {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const start = toMinutes(shiftStart)
  let end = toMinutes(shiftEnd)
  if (end <= start) end += 24 * 60
  return Math.max(0, end - start - breakMinutes)
}

export function taxExclude(amountIncludingTax: number, taxRate: number): number {
  return amountIncludingTax / (1 + taxRate)
}

export function hourlyWageFor(staff: StaffMember, rates: RateMaster): number {
  if (staff.hourlyWageOverride != null) return staff.hourlyWageOverride
  return staff.department === '1部' ? rates.hourlyWageDept1 : rates.hourlyWageDept2
}

// --- 決済手数料（決定P・4.7節） ---------------------------------------------

/** 当日決済手数料（税込決済額に対して課される） */
export function paymentFeeForReport(r: DailyReportRep, rates: RateMaster): number {
  return r.cardSales * rates.cardFeeRate + r.emoneySales * rates.emoneyFeeRate + r.qrSales * rates.qrFeeRate
}

/** 手数料控除後の実収入 */
export function netRevenueForReport(r: DailyReportRep, rates: RateMaster): number {
  return r.overallSales - paymentFeeForReport(r, rates)
}

/** 決済内訳の合計（整合チェック用） */
export function paymentTotal(r: DailyReportRep): number {
  return r.cashSales + r.cardSales + r.emoneySales + r.qrSales
}

export function hasPaymentMismatch(r: DailyReportRep): boolean {
  return Math.abs(paymentTotal(r) - r.overallSales) > 0.5
}

/** スタッフ別内訳＋代表個人の合計と全体売上の差額（フリー・その他分） */
export function freeShareForReport(r: DailyReportRep): number {
  const breakdown = r.staffBreakdown.reduce((s, b) => s + b.sales, 0)
  return r.overallSales - r.personalSales - breakdown
}

// --- インセンティブ ---------------------------------------------------------

export function hiaceIncentiveForReport(r: DailyReportRep, rates: RateMaster): number {
  return taxExclude(r.hiaceSales, rates.taxRate) * rates.hiaceIncentiveRate
}

// --- 月次集計 ---------------------------------------------------------------

export interface MonthlyRepAggregate {
  goal: number
  businessDays: number
  overallCumulative: number
  personalCumulative: number
  remainingBusinessDays: number
  dailyRequired: number
  achievementRate: number
  gap: number
  paymentFeeCumulative: number
  netRevenueCumulative: number
  expenseCumulative: number
  laborCostCumulative: number
  hiaceIncentiveCumulative: number
  hqIncentiveCumulative: number
  staffIncentiveCumulative: number
  monthlyProfit: number
  personalIncentive: number
  companyProfit: number
  newCustomersCumulative: number
  groupsCumulative: number
  customersCumulative: number
  unitPricePerGroup: number
  unitPricePerCustomer: number
  staffCumulative: { staffId: string; sales: number; customerCount: number }[]
  /** 着地予測: 現ペース（経過営業日あたり売上）× 営業日数 */
  forecastLanding: number
  /** 着地予測の対目標達成率 */
  forecastAchievementRate: number
}

export interface AggregateInput {
  department: Department
  month: string
  asOfDate: string
  goal: DepartmentGoal
  rates: RateMaster
  staff: StaffMember[]
  repReports: DailyReportRep[]
  staffReports: DailyReportStaff[]
}

export function aggregateMonthlyRep(input: AggregateInput): MonthlyRepAggregate {
  const { goal, rates, staff, repReports, staffReports, asOfDate } = input

  const overallCumulative = repReports.reduce((s, r) => s + r.overallSales, 0)
  const personalCumulative = repReports.reduce((s, r) => s + r.personalSales, 0)
  const paymentFeeCumulative = repReports.reduce((s, r) => s + paymentFeeForReport(r, rates), 0)
  const netRevenueCumulative = overallCumulative - paymentFeeCumulative

  const elapsed = Math.min(goal.businessDays, dayOfMonth(asOfDate))
  const remainingBusinessDays = Math.max(0, goal.businessDays - elapsed)
  const gap = goal.monthlySalesGoal - overallCumulative
  const dailyRequired = remainingBusinessDays > 0 ? Math.max(0, gap / remainingBusinessDays) : 0
  const achievementRate = goal.monthlySalesGoal > 0 ? overallCumulative / goal.monthlySalesGoal : 0

  const expenseCumulative = repReports.reduce((s, r) => s + r.expenses.reduce((a, e) => a + e.amount, 0), 0)

  const staffById = new Map(staff.map((s) => [s.id, s]))
  const laborCostCumulative = staffReports.reduce((s, sr) => {
    const member = staffById.get(sr.staffId)
    if (!member) return s
    const minutes = computeWorkedMinutes(sr.shiftStart, sr.shiftEnd, sr.breakMinutes)
    return s + (minutes / 60) * hourlyWageFor(member, rates)
  }, 0)

  const hiaceIncentiveCumulative = repReports.reduce((s, r) => s + hiaceIncentiveForReport(r, rates), 0)
  const hqSalesCumulative = repReports.reduce((s, r) => s + r.hqSales, 0)
  const hqIncentiveCumulative = taxExclude(hqSalesCumulative, rates.taxRate) * rates.hqIncentiveRate

  // スタッフ別売上累計（代表日報の内訳を集計・4.1c 代表を正）
  const staffCumMap = new Map<string, { sales: number; customerCount: number }>()
  for (const r of repReports) {
    for (const b of r.staffBreakdown) {
      const cur = staffCumMap.get(b.staffId) ?? { sales: 0, customerCount: 0 }
      cur.sales += b.sales
      cur.customerCount += b.customerCount
      staffCumMap.set(b.staffId, cur)
    }
  }
  const staffIncentiveCumulative = [...staffCumMap.values()].reduce(
    (s, v) => s + taxExclude(v.sales, rates.taxRate) * rates.staffIncentiveRate,
    0,
  )

  const monthlyProfit =
    taxExclude(overallCumulative, rates.taxRate) -
    expenseCumulative -
    laborCostCumulative -
    (hiaceIncentiveCumulative + hqIncentiveCumulative + staffIncentiveCumulative) -
    paymentFeeCumulative
  const personalIncentive = hiaceIncentiveCumulative + hqIncentiveCumulative
  const companyProfit = monthlyProfit - personalIncentive

  const newCustomersCumulative = repReports.reduce((s, r) => s + r.newCustomers, 0)
  const existingCustomersCumulative = repReports.reduce((s, r) => s + r.existingCustomers, 0)
  const groupsCumulative = repReports.reduce((s, r) => s + r.groupsCount, 0)
  const customersCumulative = newCustomersCumulative + existingCustomersCumulative

  // 着地予測: 実際に日報が出た日数（＝稼働実績）を経過営業日とみなし、現ペースを月末まで延長
  const elapsedBusinessDays = Math.max(0, goal.businessDays - remainingBusinessDays)
  const forecastLanding = elapsedBusinessDays > 0 ? (overallCumulative / elapsedBusinessDays) * goal.businessDays : overallCumulative
  const forecastAchievementRate = goal.monthlySalesGoal > 0 ? forecastLanding / goal.monthlySalesGoal : 0

  return {
    goal: goal.monthlySalesGoal,
    businessDays: goal.businessDays,
    overallCumulative,
    personalCumulative,
    remainingBusinessDays,
    dailyRequired,
    achievementRate,
    gap,
    paymentFeeCumulative,
    netRevenueCumulative,
    expenseCumulative,
    laborCostCumulative,
    hiaceIncentiveCumulative,
    hqIncentiveCumulative,
    staffIncentiveCumulative,
    monthlyProfit,
    personalIncentive,
    companyProfit,
    newCustomersCumulative,
    groupsCumulative,
    customersCumulative,
    unitPricePerGroup: groupsCumulative > 0 ? overallCumulative / groupsCumulative : 0,
    unitPricePerCustomer: customersCumulative > 0 ? overallCumulative / customersCumulative : 0,
    staffCumulative: [...staffCumMap.entries()].map(([staffId, v]) => ({ staffId, ...v })),
    forecastLanding,
    forecastAchievementRate,
  }
}

// --- スタッフ個人集計（4.6節・公開範囲は決定F） -------------------------------

export interface MonthlyStaffAggregate {
  monthlyGoal: number
  monthlySales: number
  hourlyWage: number
  incentive: number
  /** 代表のみ閲覧: 実働時間・生産性 */
  workedMinutes: number
  productivity: number
}

export function aggregateMonthlyStaff(
  staffMember: StaffMember,
  staffReports: DailyReportStaff[],
  rates: RateMaster,
): MonthlyStaffAggregate {
  const monthlySales = staffReports.reduce((s, r) => s + r.todaySales, 0)
  const workedMinutes = staffReports.reduce((s, r) => s + computeWorkedMinutes(r.shiftStart, r.shiftEnd, r.breakMinutes), 0)
  const wage = hourlyWageFor(staffMember, rates)
  const incentive = taxExclude(monthlySales, rates.taxRate) * rates.staffIncentiveRate
  const laborCost = (workedMinutes / 60) * wage
  const productivity = taxExclude(monthlySales, rates.taxRate) - laborCost - incentive
  return { monthlyGoal: staffMember.monthlyGoal, monthlySales, hourlyWage: wage, incentive, workedMinutes, productivity }
}
