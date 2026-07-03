import { getAllStaff, upsertDepartmentGoal, upsertRates, upsertStaff } from './repository.js'
import type { Department, StaffMember } from '../types.js'

const DEFAULT_RATES = {
  taxRate: 0.1,
  hiaceIncentiveRate: 0.05,
  hqIncentiveRate: 0.1,
  staffIncentiveRate: 0.1,
  hourlyWageDept1: 1300,
  hourlyWageDept2: 1600,
}

const INITIAL_STAFF: StaffMember[] = [
  { id: 'rep-takehara', name: '竹原', role: '代表', department: '1部', monthlyGoal: 3_000_000 },
  { id: 'rep-yoshida', name: '吉田', role: '代表', department: '2部', monthlyGoal: 3_000_000 },
  { id: 'staff-sato', name: '佐藤', role: 'スタッフ', department: '1部', monthlyGoal: 1_200_000 },
  { id: 'staff-suzuki', name: '鈴木', role: 'スタッフ', department: '1部', monthlyGoal: 1_000_000 },
  { id: 'staff-takahashi', name: '高橋', role: 'スタッフ', department: '1部', monthlyGoal: 900_000 },
  { id: 'staff-tanaka', name: '田中', role: 'スタッフ', department: '2部', monthlyGoal: 1_200_000 },
  { id: 'staff-ito', name: '伊藤', role: 'スタッフ', department: '2部', monthlyGoal: 1_000_000 },
  { id: 'staff-watanabe', name: '渡辺', role: 'スタッフ', department: '2部', monthlyGoal: 900_000 },
]

function recentMonthKeys(count: number): string[] {
  const base = new Date()
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function seed(): void {
  upsertRates(DEFAULT_RATES)

  for (const staff of INITIAL_STAFF) {
    upsertStaff(staff)
  }

  const departments: Department[] = ['1部', '2部']
  for (const month of recentMonthKeys(3)) {
    for (const department of departments) {
      upsertDepartmentGoal({ department, month, monthlySalesGoal: 8_000_000, businessDays: 26 })
    }
  }

  console.log(`スタッフマスター ${getAllStaff().length}件、パラメータ、直近3ヶ月分の部門目標を投入しました。`)
}

seed()
