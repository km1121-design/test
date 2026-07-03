import type { AppData, DailyReportRep, DailyReportStaff, Department } from '../types'
import { DEFAULT_RATES, INITIAL_DEPARTMENT_GOALS, INITIAL_STAFF } from './masterData'
import { genId } from '../lib/id'

const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const COMMENTS = ['順調に稼働できました。', '天候の影響でやや客足少なめでした。', '団体予約が入り忙しい1日でした。']
const PLANS = ['予約2件、通常営業', '出勤3名、イベント準備あり', '予約なし、通常営業']
const GOOD_POINTS = ['常連様への声かけができた', 'クロスセルの提案がうまくいった', 'チームで声を掛け合えた']
const IMPROVEMENT_POINTS = ['在庫確認が遅れた', '新規のお客様への案内が不足していた', '開店準備に時間がかかった']
const EXPENSE_CATEGORIES = ['消耗品費', '光熱費', '雑費']

function buildRepReport(date: string, department: Department, reporterName: string): DailyReportRep {
  const normalSales = randomInt(80_000, 150_000)
  const hiaceSales = randomInt(10_000, 40_000)
  const overallTotal = randomInt(300_000, 500_000)
  const cashSales = Math.round(overallTotal * 0.35)
  const cardSales = Math.round(overallTotal * 0.35)
  const emoneySales = Math.round(overallTotal * 0.15)
  const qrSales = overallTotal - cashSales - cardSales - emoneySales
  const staffSalesBreakdown = Math.round(overallTotal * 0.6)
  const eventSalesBreakdown = Math.round(overallTotal * 0.15)
  const hqSalesBreakdown = overallTotal - staffSalesBreakdown - eventSalesBreakdown

  return {
    id: genId(),
    date,
    department,
    reporterName,
    submittedAt: new Date(`${date}T23:30:00`).getTime(),
    normalSales,
    hiaceSales,
    personalExistingCustomers: randomInt(5, 15),
    personalNewCustomers: randomInt(1, 6),
    crossSellCount: randomInt(0, 5),
    cashSales,
    cardSales,
    emoneySales,
    qrSales,
    staffSalesBreakdown,
    eventSalesBreakdown,
    hqSalesBreakdown,
    overallExistingCustomers: randomInt(15, 40),
    overallNewCustomers: randomInt(3, 12),
    comment: COMMENTS[randomInt(0, COMMENTS.length - 1)],
    todayPlan: PLANS[randomInt(0, PLANS.length - 1)],
    expenses:
      randomInt(0, 2) === 0
        ? []
        : [
            {
              id: genId(),
              category: EXPENSE_CATEGORIES[randomInt(0, EXPENSE_CATEGORIES.length - 1)],
              amount: randomInt(2_000, 15_000),
              detail: 'サンプルデータ',
            },
          ],
  }
}

function buildStaffReport(date: string, staffId: string, reporterName: string, department: Department): DailyReportStaff {
  const startHour = randomInt(17, 19)
  const endHour = startHour + randomInt(5, 8)
  return {
    id: genId(),
    date,
    staffId,
    reporterName,
    department,
    shiftStart: `${pad(startHour)}:00`,
    shiftEnd: `${pad(endHour % 24)}:00`,
    breakMinutes: 60,
    todaySales: randomInt(30_000, 90_000),
    salesDetail: 'サンプルデータ',
    existingCustomers: randomInt(3, 10),
    newCustomers: randomInt(0, 4),
    crossSellCount: randomInt(0, 3),
    goodPoints: GOOD_POINTS[randomInt(0, GOOD_POINTS.length - 1)],
    improvementPoints: IMPROVEMENT_POINTS[randomInt(0, IMPROVEMENT_POINTS.length - 1)],
    submittedAt: new Date(`${date}T23:45:00`).getTime(),
  }
}

/** 初回起動時のデモ用データ（当月1日〜本日分）を生成する */
export function buildSeedAppData(): AppData {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const today = now.getDate()

  const repReports: DailyReportRep[] = []
  const staffReports: DailyReportStaff[] = []

  const reps = INITIAL_STAFF.filter((s) => s.role === '代表')
  const staffByDept = (dept: Department) => INITIAL_STAFF.filter((s) => s.role === 'スタッフ' && s.department === dept)

  for (let day = 1; day <= today; day++) {
    const date = isoDate(year, month, day)
    for (const rep of reps) {
      repReports.push(buildRepReport(date, rep.department, rep.name))
      for (const staff of staffByDept(rep.department)) {
        if (randomInt(0, 9) < 3) continue // シフト無しの日をランダムに再現
        staffReports.push(buildStaffReport(date, staff.id, staff.name, staff.department))
      }
    }
  }

  return {
    staff: INITIAL_STAFF,
    departmentGoals: INITIAL_DEPARTMENT_GOALS,
    rates: DEFAULT_RATES,
    repReports,
    staffReports,
  }
}
