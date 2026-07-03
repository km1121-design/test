// ドライバーマスター (DRIVER_MASTER)
export type DriverRole =
  | 'オーナー'
  | 'マネージャー'
  | 'ディレクター'
  | '一等級'
  | '二等級'
  | '三等級'
  | '四等級'
  | '研修生';

export type EmploymentType = '役員' | 'フルコミ' | '経費会社持ち' | 'アルバイト';

export type Segment = 'ヤマト' | '企業配' | '全体';

export interface Driver {
  id: string;
  name: string;
  role: DriverRole;
  /** ドライバー受取単価（円/個）。会社受取単価との差額が粗利 */
  unitPrice: number;
  area: string;
  type: EmploymentType;
  /** 月額固定給（管理者用）。ドライバー職の場合は0 */
  baseSalary: number;
  /** 半月(16日間)時点での売上実績 */
  actualSales: number;
  /** フルコミドライバー等への支払額実績 */
  actualOutsource: number;
  /** 駐車場・ガソリン等、ドライバーごとの実費経費 */
  actualExpense: number;
  segment: Segment;
  /** 宅配委託会社名など */
  subSegment?: string;
}

// 固定諸経費マスタ (VEHICLE_EXPENSE_DETAIL)
export type ExpenseCategory = '固定車両費' | '固定経費' | '変動・突発' | '広告経費' | '控除項目';

export interface VehicleExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
}

// 企業配案件マスタ (PROJECT_MASTER)
export type ExpenseBearer = 'ドライバー負担' | '経費会社持ち';

export interface Project {
  id: string;
  name: string;
  basePrice: number;
  feeRate: number; // 0-1
  detail: string;
  expenseBearer: ExpenseBearer;
}

// 現場課題・バグトラッカー (FIELDBUGS_LOG)
export type BugStatus = '未対応' | '保留' | '修正済み';
export type BugSeverity = '高' | '中' | '低';

export interface FieldBug {
  id: string;
  reportedDate: string;
  reporter: string;
  category: string;
  description: string;
  status: BugStatus;
  severity: BugSeverity;
  channel: 'LINE Bot' | 'Webフォーム';
}

// What-If シミュレーター入力
export interface SimulatorInputs {
  /** ヤマト稼働人数 D */
  yamatoDriverCount: number;
  /** 1人1日あたり配完数 B */
  packagesPerDriverPerDay: number;
  /** 企業配平均手数料率 (0-1) */
  enterpriseFeeRate: number;
  /** 管理者人件費削減率 (0-1) */
  adminCostReductionRate: number;
  /** 車両関連固定費削減額（円） */
  fixedCostReduction: number;
}

export interface SimulatorResult extends SimulatorInputs {
  yamatoSales: number;
  yamatoOutsource: number;
  yamatoMargin: number;
  enterpriseProfit: number;
  adminCost: number;
  fixedCost: number;
  netProfit: number;
  goal: number;
  gapToGoal: number;
  progressPct: number;
  driversNeededForGoal: number;
  additionalDriversNeeded: number;
}
