import type { AppData, DailyReportRep, DailyReportStaff, DepartmentGoal } from '../types'
import { daysInMonth, formatCurrency, monthKeyOf } from './dateUtils'
import {
  companyProfit,
  dailyRequiredAmount,
  eventSalesCumulative,
  hiaceIncentiveCumulativeForRep,
  hiaceIncentiveForReport,
  hourlyWageFor,
  hqIncentiveCumulative,
  hqSalesCumulative,
  laborCostCumulative,
  monthlyCumulativeSales,
  monthlyExpenseCumulative,
  monthlyProfit,
  overallTotalSales,
  personalIncentiveForRep,
  personalTotalSales,
  remainingBusinessDays,
  staffIncentiveCumulative,
  staffProductivity,
  staffSalesCumulativeByStaff,
  monthlySalesForStaff,
  workedMinutesForStaff,
} from './calculations'

function resolveDepartmentGoal(data: AppData, department: DailyReportRep['department'], month: string): DepartmentGoal {
  return (
    data.departmentGoals.find((g) => g.department === department && g.month === month) ?? {
      department,
      month,
      monthlySalesGoal: 0,
      businessDays: daysInMonth(month),
    }
  )
}

export function generateRepReportText(report: DailyReportRep, data: AppData): string {
  const month = monthKeyOf(report.date)
  const goal = resolveDepartmentGoal(data, report.department, month)
  const cumulativeSales = monthlyCumulativeSales(data.repReports, report.department, month)
  const remainingDays = remainingBusinessDays(goal, report.date)
  const required = dailyRequiredAmount(goal, cumulativeSales, remainingDays)
  const staffCumulative = staffSalesCumulativeByStaff(data.staffReports, month)
  const staffNamesById = new Map(data.staff.map((s) => [s.id, s.name]))
  const hqCumulative = hqSalesCumulative(data.repReports, report.department, month)
  const eventCumulative = eventSalesCumulative(data.repReports, report.department, month)
  const expenseCumulative = monthlyExpenseCumulative(data.repReports, report.department, month)
  const laborCumulative = laborCostCumulative(data.staffReports, data.staff, data.rates, report.department, month)
  const hiaceIncentiveCumulative = hiaceIncentiveCumulativeForRep(
    data.repReports,
    report.reporterName,
    report.department,
    month,
    data.rates,
  )
  const hqIncentiveCumulativeAmount = hqIncentiveCumulative(data.repReports, report.department, month, data.rates)
  const profit = monthlyProfit(data.repReports, data.staffReports, data.staff, data.rates, report.department, month)
  const personalIncentive = personalIncentiveForRep(data.repReports, report.reporterName, report.department, month, data.rates)
  const companyProfitAmount = companyProfit(
    data.repReports,
    data.staffReports,
    data.staff,
    data.rates,
    report.department,
    month,
    report.reporterName,
  )

  const staffLines = [...staffCumulative.entries()]
    .map(([staffId, total]) => `      - ${staffNamesById.get(staffId) ?? staffId}：${formatCurrency(total)}`)
    .join('\n')

  const expenseLines = report.expenses.length
    ? report.expenses
        .map((e, i) => `  ${i + 1}. 費目：${e.category} / 金額：${formatCurrency(e.amount)} / 内容：${e.detail || '-'}`)
        .join('\n')
    : '  （本日の経費入力なし）'

  return `【報告用】BAR業務日報（代表）
●　${report.date}　${report.department}　${report.reporterName}

1. 個人日報
  1. 個人当日総売上★：${formatCurrency(personalTotalSales(report))}
  2. 通常売上：${formatCurrency(report.normalSales)}
  3. ハイエース売上：${formatCurrency(report.hiaceSales)}
  4. ハイエース売上インセン★：${formatCurrency(hiaceIncentiveForReport(report, data.rates))}
  5. 既存来客数：${report.personalExistingCustomers}
  6. 新規来客数：${report.personalNewCustomers}
  7. クロスセル件数：${report.crossSellCount}

2. BAR全体日報
  1. 全体当日総売上★：${formatCurrency(overallTotalSales(report))}
  2. 現金売上：${formatCurrency(report.cashSales)}
  3. クレカ売上：${formatCurrency(report.cardSales)}
  4. 電子マネー売上：${formatCurrency(report.emoneySales)}
  5. QR決済売上：${formatCurrency(report.qrSales)}
  6. 当日スタッフ売上（内訳）：${formatCurrency(report.staffSalesBreakdown)}
  7. 当日イベント売上（内訳）：${formatCurrency(report.eventSalesBreakdown)}
  8. 当日本部売上（内訳）：${formatCurrency(report.hqSalesBreakdown)}
  9. 既存来客数：${report.overallExistingCustomers}
  10. 新規来客数：${report.overallNewCustomers}

3. BAR当月進捗状況★
  1. 当月目標★：${formatCurrency(goal.monthlySalesGoal)}
  2. 当月累計売上★：${formatCurrency(cumulativeSales)}
  3. 残営業日数★：${remainingDays}日
  4. 1日必達★：${formatCurrency(required)}
  5. スタッフ売上累計★（スタッフそれぞれ）：
${staffLines || '      （実績なし）'}
  6. 本部売上累計★：${formatCurrency(hqCumulative)}
  7. イベント売上累計★：${formatCurrency(eventCumulative)}

4. 総評・当日予定
  1. 総評コメント：${report.comment || '-'}
  2. 当日予定（出勤・予約・タスク）：${report.todayPlan || '-'}
  3. 伝票アップロード：${report.invoiceFileName || '（なし）'}

5. 経費
${expenseLines}
  当月経費累計★：${formatCurrency(expenseCumulative)}
  人件費累計★：${formatCurrency(laborCumulative)}
  ハイエース売上インセン累計★：${formatCurrency(hiaceIncentiveCumulative)}
  本部売上インセン累計★：${formatCurrency(hqIncentiveCumulativeAmount)}

6. 利益・インセン（暫定）★
  1. 当月利益★：${formatCurrency(profit)}
  2. 個人インセン★：${formatCurrency(personalIncentive)}
  3. 会社利益★：${formatCurrency(companyProfitAmount)}

◆上記を日報とし、日報グループへ転送`
}

export function generateStaffReportText(report: DailyReportStaff, data: AppData): string {
  const month = monthKeyOf(report.date)
  const staff = data.staff.find((s) => s.id === report.staffId)
  const wage = staff ? hourlyWageFor(staff, data.rates) : 0
  const monthlySales = monthlySalesForStaff(data.staffReports, report.staffId, month)
  const monthlyWorkedMinutes = workedMinutesForStaff(data.staffReports, report.staffId, month)
  const incentive = staffIncentiveCumulative(data.staffReports, report.staffId, month, data.rates)
  const productivity = staff ? staffProductivity(data.staffReports, staff, data.rates, month) : 0

  const hours = Math.floor(monthlyWorkedMinutes / 60)
  const minutes = monthlyWorkedMinutes % 60

  return `【報告用】BAR業務日報（スタッフ）
●　${report.date}　${report.department}　${report.reporterName}

1. 勤怠管理
  1. 日付：${report.date}
  2. 報告者名：${report.reporterName}
  3. 勤務：${report.department}
  4. 勤務時間：${report.shiftStart}〜${report.shiftEnd}
  5. 休憩時間：${report.breakMinutes}分
  6. 当日売上：${formatCurrency(report.todaySales)}
  7. 売上詳細：${report.salesDetail || '-'}
  8. 既存来客数：${report.existingCustomers}
  9. 新規来客数：${report.newCustomers}
  10. クロスセル件数：${report.crossSellCount}

2. 振り返り
  1. 良い点：${report.goodPoints || '-'}
  2. 改善点：${report.improvementPoints || '-'}

3. 当月進捗★
  1. 当月目標★：${formatCurrency(staff?.monthlyGoal ?? 0)}
  2. 当月売上★：${formatCurrency(monthlySales)}
  3. 時給★：${formatCurrency(wage)}
  4. スタッフ売上インセン★：${formatCurrency(incentive)}
  5. 生産性（個人利益）★：${formatCurrency(productivity)}
    （当月累計実働時間：${hours}時間${minutes}分）

◆上記を日報とし、日報グループへ転送`
}
