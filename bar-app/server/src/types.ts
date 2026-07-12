export type Department = '1部' | '2部'
export type StaffRole = '代表' | 'スタッフ'

export interface StaffMember {
  id: string
  name: string
  role: StaffRole
  department: Department
  /** 未設定なら部門既定の時給を使用 */
  hourlyWageOverride?: number
  monthlyGoal: number
  /** LINEログイン連携用のuserId（本番）。開発中は未使用でよい */
  lineUserId?: string
  active: boolean
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
  /** 決済手数料率（決定P） */
  cardFeeRate: number
  emoneyFeeRate: number
  qrFeeRate: number
}

export interface ExpenseLine {
  id: string
  category: string
  amount: number
  detail: string
  receiptFileName?: string
  /** アップロード済み領収書のURL（共有ドライブ or ローカル保存先） */
  receiptUrl?: string
}

export interface DeliverySettings {
  reportGroupId: string
  staffReportGroupId: string
  forwardRepEnabled: boolean
  dailySummaryEnabled: boolean
  staffDigestEnabled: boolean
  /** "HH:mm" */
  summaryTime: string
}

export interface OutboxEntry {
  id: string
  createdAt: number
  target: string
  kind: string
  body: string
  status: string
}

/** 代表日報のスタッフ別内訳（売上・来客） */
export interface RepStaffBreakdownLine {
  staffId: string
  sales: number
  customerCount: number
}

export interface DailyReportRep {
  id: string
  /** YYYY-MM-DD */
  date: string
  department: Department
  reporterName: string
  submittedAt: number

  /** BAR全体の当日売上（税込・決定Q） */
  overallSales: number
  /** 代表個人売上（BAR全体の内数・決定Q） */
  personalSales: number

  /** 任意項目（決定L） */
  hiaceSales: number
  hqSales: number
  eventSales: number

  /** 決済内訳（税込） */
  cashSales: number
  cardSales: number
  emoneySales: number
  qrSales: number

  /** 来客 */
  groupsCount: number
  newCustomers: number
  existingCustomers: number

  comment: string
  planAttendance: string
  planReservation: string
  planTask: string

  staffBreakdown: RepStaffBreakdownLine[]
  expenses: ExpenseLine[]
}

/** スタッフ日報の指名客ごとの明細（決定N） */
export interface NamedCustomerLine {
  customerName: string
  amount: number
}

export interface DailyReportStaff {
  id: string
  date: string
  staffId: string
  reporterName: string
  department: Department
  shiftStart: string
  shiftEnd: string
  breakMinutes: number
  todaySales: number
  namedCustomers: NamedCustomerLine[]
  crossSellCount: number
  goodPoints: string
  improvementPoints: string
  submittedAt: number
}

export interface SessionUser {
  id: string
  name: string
  role: StaffRole
  department: Department
}
