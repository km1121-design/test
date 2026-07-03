export type Department = '1部' | '2部'
export type StaffRole = '代表' | 'スタッフ'

export interface StaffMember {
  id: string
  name: string
  role: StaffRole
  department: Department
  /** 未設定なら部門既定の時給（RateMaster）を使用する */
  hourlyWageOverride?: number
  monthlyGoal: number
}

export interface DepartmentGoal {
  department: Department
  /** YYYY-MM */
  month: string
  monthlySalesGoal: number
  businessDays: number
}

export interface RateMaster {
  taxRate: number
  hiaceIncentiveRate: number
  hqIncentiveRate: number
  staffIncentiveRate: number
  hourlyWageDept1: number
  hourlyWageDept2: number
}

export interface ExpenseLine {
  id: string
  category: string
  amount: number
  detail: string
  receiptFileName?: string
}

export interface DailyReportRep {
  id: string
  /** YYYY-MM-DD */
  date: string
  department: Department
  reporterName: string
  submittedAt: number

  normalSales: number
  hiaceSales: number
  personalExistingCustomers: number
  personalNewCustomers: number
  crossSellCount: number

  cashSales: number
  cardSales: number
  emoneySales: number
  qrSales: number
  staffSalesBreakdown: number
  eventSalesBreakdown: number
  hqSalesBreakdown: number
  overallExistingCustomers: number
  overallNewCustomers: number

  comment: string
  todayPlan: string
  invoiceFileName?: string

  expenses: ExpenseLine[]
}

export interface DailyReportStaff {
  id: string
  date: string
  staffId: string
  reporterName: string
  department: Department
  /** "HH:mm" */
  shiftStart: string
  /** "HH:mm" */
  shiftEnd: string
  breakMinutes: number
  todaySales: number
  salesDetail: string
  existingCustomers: number
  newCustomers: number
  crossSellCount: number
  goodPoints: string
  improvementPoints: string
  submittedAt: number
}

export interface AppData {
  staff: StaffMember[]
  departmentGoals: DepartmentGoal[]
  rates: RateMaster
  repReports: DailyReportRep[]
  staffReports: DailyReportStaff[]
}
