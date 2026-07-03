import type { DailyReportRep, DailyReportStaff, Department, DepartmentGoal, RateMaster, StaffMember } from '../types.js'
import { dayOfMonth, monthKeyOf } from './dateUtils.js'

/**
 * bar-dashboard/src/lib/calculations.ts と同一の計算ロジック。
 * 要件定義書 docs/bar-dashboard-requirements.md の4節（報告用フォーマットと計算式）に対応する。
 * リポジトリ層で 3.7 節の upsert ルールを適用済みのため、ここでは重複排除は行わない。
 */

function byMonthDept<T extends { date: string; department: Department }>(reports: T[], department: Department, month: string): T[] {
  return reports.filter((r) => r.department === department && monthKeyOf(r.date) === month)
}

/** 4.7 勤怠時間: 日またぎ（終了 <= 開始）は24時間補正。負値は0に丸める */
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

// 4.1 代表：個人日報 ---------------------------------------------------------

export function personalTotalSales(r: DailyReportRep): number {
  return r.normalSales + r.hiaceSales
}

export function hiaceIncentiveForReport(r: DailyReportRep, rates: RateMaster): number {
  return taxExclude(r.hiaceSales, rates.taxRate) * rates.hiaceIncentiveRate
}

// 4.2 代表：BAR全体日報 -------------------------------------------------------

export function overallTotalSales(r: DailyReportRep): number {
  return r.cashSales + r.cardSales + r.emoneySales + r.qrSales
}

export function breakdownTotal(r: DailyReportRep): number {
  return r.staffSalesBreakdown + r.eventSalesBreakdown + r.hqSalesBreakdown
}

/** 内訳（スタッフ+イベント+本部）と全体当日総売上が一致しない場合に true */
export function hasBreakdownMismatch(r: DailyReportRep): boolean {
  return Math.abs(overallTotalSales(r) - breakdownTotal(r)) > 0.5
}

// 4.3 代表：BAR当月進捗状況 ----------------------------------------------------

export function monthlyCumulativeSales(repReports: DailyReportRep[], department: Department, month: string): number {
  return byMonthDept(repReports, department, month).reduce((sum, r) => sum + overallTotalSales(r), 0)
}

/**
 * 残営業日数: 「報告日」までの経過日数を、月の営業日数を上限として経過営業日数と
 * みなし、営業日数から差し引く（休業日の正確な配置情報を持たないための近似）。
 */
export function remainingBusinessDays(goal: DepartmentGoal, asOfDate: string): number {
  const elapsed = Math.min(goal.businessDays, dayOfMonth(asOfDate))
  return Math.max(0, goal.businessDays - elapsed)
}

export function dailyRequiredAmount(goal: DepartmentGoal, cumulativeSales: number, remainingDays: number): number {
  if (remainingDays <= 0) return 0
  return Math.max(0, (goal.monthlySalesGoal - cumulativeSales) / remainingDays)
}

export function staffSalesCumulativeByStaff(staffReports: DailyReportStaff[], month: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of staffReports) {
    if (monthKeyOf(r.date) !== month) continue
    map.set(r.staffId, (map.get(r.staffId) ?? 0) + r.todaySales)
  }
  return map
}

export function hqSalesCumulative(repReports: DailyReportRep[], department: Department, month: string): number {
  return byMonthDept(repReports, department, month).reduce((sum, r) => sum + r.hqSalesBreakdown, 0)
}

export function eventSalesCumulative(repReports: DailyReportRep[], department: Department, month: string): number {
  return byMonthDept(repReports, department, month).reduce((sum, r) => sum + r.eventSalesBreakdown, 0)
}

export function monthlyCustomerCount(repReports: DailyReportRep[], department: Department, month: string): number {
  return byMonthDept(repReports, department, month).reduce((sum, r) => sum + r.overallExistingCustomers + r.overallNewCustomers, 0)
}

export function monthlyUnitPrice(cumulativeSales: number, customerCount: number): number {
  return customerCount > 0 ? cumulativeSales / customerCount : 0
}

// 4.4 代表：経費 --------------------------------------------------------------

export function monthlyExpenseCumulative(repReports: DailyReportRep[], department: Department, month: string): number {
  return byMonthDept(repReports, department, month).reduce((sum, r) => sum + r.expenses.reduce((s, e) => s + e.amount, 0), 0)
}

export function laborCostCumulative(
  staffReports: DailyReportStaff[],
  staffMembers: StaffMember[],
  rates: RateMaster,
  department: Department,
  month: string,
): number {
  const staffById = new Map(staffMembers.map((s) => [s.id, s]))
  return byMonthDept(staffReports, department, month).reduce((sum, r) => {
    const staff = staffById.get(r.staffId)
    if (!staff) return sum
    const minutes = computeWorkedMinutes(r.shiftStart, r.shiftEnd, r.breakMinutes)
    return sum + (minutes / 60) * hourlyWageFor(staff, rates)
  }, 0)
}

export function hiaceIncentiveCumulativeForRep(
  repReports: DailyReportRep[],
  reporterName: string,
  department: Department,
  month: string,
  rates: RateMaster,
): number {
  return byMonthDept(repReports, department, month)
    .filter((r) => r.reporterName === reporterName)
    .reduce((sum, r) => sum + hiaceIncentiveForReport(r, rates), 0)
}

export function hqIncentiveCumulative(repReports: DailyReportRep[], department: Department, month: string, rates: RateMaster): number {
  return taxExclude(hqSalesCumulative(repReports, department, month), rates.taxRate) * rates.hqIncentiveRate
}

// 4.6 スタッフ：当月進捗 -------------------------------------------------------

export function monthlySalesForStaff(staffReports: DailyReportStaff[], staffId: string, month: string): number {
  return staffReports.filter((r) => r.staffId === staffId && monthKeyOf(r.date) === month).reduce((sum, r) => sum + r.todaySales, 0)
}

export function workedMinutesForStaff(staffReports: DailyReportStaff[], staffId: string, month: string): number {
  return staffReports
    .filter((r) => r.staffId === staffId && monthKeyOf(r.date) === month)
    .reduce((sum, r) => sum + computeWorkedMinutes(r.shiftStart, r.shiftEnd, r.breakMinutes), 0)
}

export function staffIncentiveCumulative(staffReports: DailyReportStaff[], staffId: string, month: string, rates: RateMaster): number {
  const sales = monthlySalesForStaff(staffReports, staffId, month)
  return taxExclude(sales, rates.taxRate) * rates.staffIncentiveRate
}

/**
 * 生産性（個人利益）: 元仕様に算出式の明記がないための実装上の定義。
 * 当月売上（税抜） − 当月人件費（実働時間×時給） − スタッフ売上インセン。
 */
export function staffProductivity(staffReports: DailyReportStaff[], staff: StaffMember, rates: RateMaster, month: string): number {
  const salesExTax = taxExclude(monthlySalesForStaff(staffReports, staff.id, month), rates.taxRate)
  const laborCost = (workedMinutesForStaff(staffReports, staff.id, month) / 60) * hourlyWageFor(staff, rates)
  const incentive = staffIncentiveCumulative(staffReports, staff.id, month, rates)
  return salesExTax - laborCost - incentive
}

// 4.5 代表：利益・インセン（暫定） ----------------------------------------------

export interface DepartmentMonthlyIncentives {
  hiaceIncentiveTotal: number
  hqIncentiveTotal: number
  staffIncentiveTotal: number
}

export function departmentMonthlyIncentives(
  repReports: DailyReportRep[],
  staffReports: DailyReportStaff[],
  staffMembers: StaffMember[],
  rates: RateMaster,
  department: Department,
  month: string,
): DepartmentMonthlyIncentives {
  const hiaceIncentiveTotal = byMonthDept(repReports, department, month).reduce((sum, r) => sum + hiaceIncentiveForReport(r, rates), 0)
  const hqIncentiveTotal = hqIncentiveCumulative(repReports, department, month, rates)
  const staffIncentiveTotal = staffMembers
    .filter((s) => s.department === department && s.role === 'スタッフ')
    .reduce((sum, s) => sum + staffIncentiveCumulative(staffReports, s.id, month, rates), 0)
  return { hiaceIncentiveTotal, hqIncentiveTotal, staffIncentiveTotal }
}

export function monthlyProfit(
  repReports: DailyReportRep[],
  staffReports: DailyReportStaff[],
  staffMembers: StaffMember[],
  rates: RateMaster,
  department: Department,
  month: string,
): number {
  const salesExTax = taxExclude(monthlyCumulativeSales(repReports, department, month), rates.taxRate)
  const expense = monthlyExpenseCumulative(repReports, department, month)
  const labor = laborCostCumulative(staffReports, staffMembers, rates, department, month)
  const { hiaceIncentiveTotal, hqIncentiveTotal, staffIncentiveTotal } = departmentMonthlyIncentives(
    repReports,
    staffReports,
    staffMembers,
    rates,
    department,
    month,
  )
  return salesExTax - expense - labor - (hiaceIncentiveTotal + hqIncentiveTotal + staffIncentiveTotal)
}

export function personalIncentiveForRep(
  repReports: DailyReportRep[],
  reporterName: string,
  department: Department,
  month: string,
  rates: RateMaster,
): number {
  return (
    hiaceIncentiveCumulativeForRep(repReports, reporterName, department, month, rates) +
    hqIncentiveCumulative(repReports, department, month, rates)
  )
}

export function companyProfit(
  repReports: DailyReportRep[],
  staffReports: DailyReportStaff[],
  staffMembers: StaffMember[],
  rates: RateMaster,
  department: Department,
  month: string,
  reporterName: string,
): number {
  const profit = monthlyProfit(repReports, staffReports, staffMembers, rates, department, month)
  const personalIncentive = personalIncentiveForRep(repReports, reporterName, department, month, rates)
  return profit - personalIncentive
}
