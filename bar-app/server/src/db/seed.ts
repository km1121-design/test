import { getDb } from './sqlite.node.ts'
import { getAllStaff, upsertDeliverySettings, upsertDepartmentGoal, upsertRates, upsertStaff } from './repository.ts'
import type { Department, StaffMember } from '../types.ts'

const DEFAULT_RATES = {
  taxRate: 0.1,
  hiaceIncentiveRate: 0.05,
  hqIncentiveRate: 0.1,
  staffIncentiveRate: 0.1,
  hourlyWageDept1: 1300,
  hourlyWageDept2: 1600,
  cardFeeRate: 0.0324,
  emoneyFeeRate: 0.0324,
  qrFeeRate: 0.0198,
}

const INITIAL_STAFF: StaffMember[] = [
  { id: 'rep-takehara', name: '竹原', role: '代表', department: '1部', monthlyGoal: 3_000_000, active: true },
  { id: 'rep-yoshida', name: '吉田', role: '代表', department: '2部', monthlyGoal: 3_000_000, active: true },
  { id: 'staff-ryota', name: 'りょーた', role: 'スタッフ', department: '1部', monthlyGoal: 1_000_000, active: true },
  { id: 'staff-shotaro', name: 'しょうたろう', role: 'スタッフ', department: '1部', monthlyGoal: 1_000_000, active: true },
  { id: 'staff-riku', name: 'りく', role: 'スタッフ', department: '1部', monthlyGoal: 900_000, active: true },
  { id: 'staff-nobu', name: 'のぶ', role: 'スタッフ', department: '2部', monthlyGoal: 900_000, active: true },
  { id: 'staff-miori', name: 'みおり', role: 'スタッフ', department: '2部', monthlyGoal: 900_000, active: true },
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

async function seed() {
  const db = getDb()
  await upsertRates(db, DEFAULT_RATES)
  for (const s of INITIAL_STAFF) await upsertStaff(db, s)
  const departments: Department[] = ['1部', '2部']
  for (const month of recentMonthKeys(3)) {
    for (const department of departments) {
      await upsertDepartmentGoal(db, { department, month, monthlySalesGoal: 3_000_000, businessDays: 26 })
    }
  }
  await upsertDeliverySettings(db, {
    reportGroupId: '',
    staffReportGroupId: '',
    forwardRepEnabled: true,
    dailySummaryEnabled: true,
    staffDigestEnabled: true,
    summaryTime: '22:00',
  })
  const staff = await getAllStaff(db)
  console.log(`seed完了: スタッフ${staff.length}名、パラメータ、配信設定、直近3ヶ月の部門目標を投入しました。`)
}

seed()
