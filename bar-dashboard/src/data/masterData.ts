import type { DepartmentGoal, RateMaster, StaffMember } from '../types'
import { currentMonthKey, listRecentMonthKeys } from '../lib/dateUtils'

export const DEFAULT_RATES: RateMaster = {
  taxRate: 0.1,
  hiaceIncentiveRate: 0.05,
  hqIncentiveRate: 0.1,
  staffIncentiveRate: 0.1,
  hourlyWageDept1: 1300,
  hourlyWageDept2: 1600,
}

export const INITIAL_STAFF: StaffMember[] = [
  { id: 'rep-takehara', name: '竹原', role: '代表', department: '1部', monthlyGoal: 3_000_000 },
  { id: 'rep-yoshida', name: '吉田', role: '代表', department: '2部', monthlyGoal: 3_000_000 },
  { id: 'staff-sato', name: '佐藤', role: 'スタッフ', department: '1部', monthlyGoal: 1_200_000 },
  { id: 'staff-suzuki', name: '鈴木', role: 'スタッフ', department: '1部', monthlyGoal: 1_000_000 },
  { id: 'staff-takahashi', name: '高橋', role: 'スタッフ', department: '1部', monthlyGoal: 900_000 },
  { id: 'staff-tanaka', name: '田中', role: 'スタッフ', department: '2部', monthlyGoal: 1_200_000 },
  { id: 'staff-ito', name: '伊藤', role: 'スタッフ', department: '2部', monthlyGoal: 1_000_000 },
  { id: 'staff-watanabe', name: '渡辺', role: 'スタッフ', department: '2部', monthlyGoal: 900_000 },
]

function buildInitialDepartmentGoals(): DepartmentGoal[] {
  const goals: DepartmentGoal[] = []
  for (const month of listRecentMonthKeys(3)) {
    goals.push({ department: '1部', month, monthlySalesGoal: 8_000_000, businessDays: 26 })
    goals.push({ department: '2部', month, monthlySalesGoal: 8_000_000, businessDays: 26 })
  }
  return goals
}

export const INITIAL_DEPARTMENT_GOALS: DepartmentGoal[] = buildInitialDepartmentGoals()

export const CURRENT_MONTH_KEY = currentMonthKey()
