export type Department = '1部' | '2部'
export type StaffRole = '代表' | 'スタッフ'

export interface SessionUser {
  id: string
  name: string
  role: StaffRole
  department: Department
}

export interface StaffMember {
  id: string
  name: string
  role: StaffRole
  department: Department
  hourlyWageOverride?: number
  monthlyGoal: number
  lineUserId?: string
  active: boolean
}

export interface DepartmentGoal {
  department: Department
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
  cardFeeRate: number
  emoneyFeeRate: number
  qrFeeRate: number
}

export interface DashboardAggregate {
  department: Department
  month: string
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
  staffCumulative: { staffId: string; name: string; sales: number; customerCount: number }[]
  rates: RateMaster
}

export interface StaffAggregate {
  staffId: string
  name: string
  department: Department
  month: string
  monthlyGoal: number
  monthlySales: number
  incentive: number
  hourlyWage?: number
  workedMinutes?: number
  productivity?: number
  dailyReports: {
    date: string
    shiftStart: string
    shiftEnd: string
    breakMinutes: number
    todaySales: number
    namedCustomers: { customerName: string; amount: number }[]
  }[]
}

export interface DailyRow {
  date: string
  overallSales: number
  personalSales: number
  paymentFee: number
  netRevenue: number
  expense: number
  laborCost: number
  dailyProfit: number
  cumulative: number
}
