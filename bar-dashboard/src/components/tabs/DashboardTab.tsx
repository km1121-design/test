import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { DepartmentToggle } from '../common/DepartmentToggle'
import { MonthSelect } from '../common/MonthSelect'
import { StatCard } from '../common/StatCard'
import { formatCurrency, formatPercent, currentMonthKey } from '../../lib/dateUtils'
import type { Department } from '../../types'
import {
  dailyRequiredAmount,
  departmentMonthlyIncentives,
  laborCostCumulative,
  monthlyCumulativeSales,
  monthlyCustomerCount,
  monthlyExpenseCumulative,
  monthlyProfit,
  monthlyUnitPrice,
  remainingBusinessDays,
} from '../../lib/calculations'
import { todayISO } from '../../lib/dateUtils'

export function DashboardTab() {
  const { data } = useAppData()
  const [department, setDepartment] = useState<Department>('1部')
  const [month, setMonth] = useState(currentMonthKey())

  const goal = data.departmentGoals.find((g) => g.department === department && g.month === month) ?? {
    department,
    month,
    monthlySalesGoal: 0,
    businessDays: 0,
  }

  const cumulativeSales = monthlyCumulativeSales(data.repReports, department, month)
  const gap = goal.monthlySalesGoal - cumulativeSales
  const achievementRate = goal.monthlySalesGoal > 0 ? cumulativeSales / goal.monthlySalesGoal : 0
  const asOfDate = month === currentMonthKey() ? todayISO() : `${month}-31`
  const remainingDays = remainingBusinessDays(goal, asOfDate)
  const required = dailyRequiredAmount(goal, cumulativeSales, remainingDays)
  const averageDailyGoal = goal.businessDays > 0 ? goal.monthlySalesGoal / goal.businessDays : 0
  const requiredRate = averageDailyGoal > 0 ? required / averageDailyGoal : 0

  const expense = monthlyExpenseCumulative(data.repReports, department, month)
  const laborCost = laborCostCumulative(data.staffReports, data.staff, data.rates, department, month)
  const { staffIncentiveTotal } = departmentMonthlyIncentives(data.repReports, data.staffReports, data.staff, data.rates, department, month)
  const customerCount = monthlyCustomerCount(data.repReports, department, month)
  const unitPrice = monthlyUnitPrice(cumulativeSales, customerCount)
  const hourlyWage = department === '1部' ? data.rates.hourlyWageDept1 : data.rates.hourlyWageDept2

  const profit = monthlyProfit(data.repReports, data.staffReports, data.staff, data.rates, department, month)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DepartmentToggle value={department} onChange={setDepartment} />
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="当月目標" value={formatCurrency(goal.monthlySalesGoal)} />
        <StatCard label="当月累計売上" value={formatCurrency(cumulativeSales)} />
        <StatCard label="目標とのGAP" value={formatCurrency(gap)} tone={gap > 0 ? 'bad' : 'good'} />
        <StatCard label="達成率" value={formatPercent(achievementRate)} tone={achievementRate >= 1 ? 'good' : 'neutral'} />
        <StatCard label="残営業日数" value={`${remainingDays}日`} />
        <StatCard label="1日必達（必要売上）" value={formatCurrency(required)} />
        <StatCard label="必要達成率" value={formatPercent(requiredRate)} sub="計画上の日割り目標に対する必要ペース" tone={requiredRate > 1 ? 'bad' : 'good'} />
        <StatCard label="経費（当月累計）" value={formatCurrency(expense)} />
        <StatCard label="固定費（人件費・当月累計）" value={formatCurrency(laborCost)} />
        <StatCard label="スタッフ時給" value={formatCurrency(hourlyWage)} sub={`${department}既定`} />
        <StatCard label="スタッフインセン（当月累計）" value={formatCurrency(staffIncentiveTotal)} />
        <StatCard label="来客数（当月累計）" value={`${customerCount}人`} />
        <StatCard label="客単価" value={formatCurrency(unitPrice)} />
        <StatCard label="利益（暫定）" value={formatCurrency(profit)} tone={profit >= 0 ? 'good' : 'bad'} />
      </div>
    </div>
  )
}
