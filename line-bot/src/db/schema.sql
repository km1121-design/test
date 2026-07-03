CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('代表', 'スタッフ')),
  department TEXT NOT NULL CHECK (department IN ('1部', '2部')),
  hourly_wage_override REAL,
  monthly_goal REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS department_goals (
  department TEXT NOT NULL CHECK (department IN ('1部', '2部')),
  month TEXT NOT NULL,
  monthly_sales_goal REAL NOT NULL DEFAULT 0,
  business_days INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (department, month)
);

CREATE TABLE IF NOT EXISTS rates (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  tax_rate REAL NOT NULL,
  hiace_incentive_rate REAL NOT NULL,
  hq_incentive_rate REAL NOT NULL,
  staff_incentive_rate REAL NOT NULL,
  hourly_wage_dept1 REAL NOT NULL,
  hourly_wage_dept2 REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS rep_reports (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('1部', '2部')),
  reporter_name TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  source_chat_id TEXT,

  normal_sales REAL NOT NULL DEFAULT 0,
  hiace_sales REAL NOT NULL DEFAULT 0,
  personal_existing_customers INTEGER NOT NULL DEFAULT 0,
  personal_new_customers INTEGER NOT NULL DEFAULT 0,
  cross_sell_count INTEGER NOT NULL DEFAULT 0,

  cash_sales REAL NOT NULL DEFAULT 0,
  card_sales REAL NOT NULL DEFAULT 0,
  emoney_sales REAL NOT NULL DEFAULT 0,
  qr_sales REAL NOT NULL DEFAULT 0,
  staff_sales_breakdown REAL NOT NULL DEFAULT 0,
  event_sales_breakdown REAL NOT NULL DEFAULT 0,
  hq_sales_breakdown REAL NOT NULL DEFAULT 0,
  overall_existing_customers INTEGER NOT NULL DEFAULT 0,
  overall_new_customers INTEGER NOT NULL DEFAULT 0,

  comment TEXT NOT NULL DEFAULT '',
  today_plan TEXT NOT NULL DEFAULT '',
  invoice_file_name TEXT,

  UNIQUE (date, department, reporter_name)
);

CREATE TABLE IF NOT EXISTS rep_report_expenses (
  id TEXT PRIMARY KEY,
  rep_report_id TEXT NOT NULL REFERENCES rep_reports (id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT '',
  receipt_file_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_rep_report_expenses_report_id ON rep_report_expenses (rep_report_id);

CREATE TABLE IF NOT EXISTS staff_reports (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  staff_id TEXT NOT NULL REFERENCES staff (id),
  reporter_name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('1部', '2部')),
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  today_sales REAL NOT NULL DEFAULT 0,
  sales_detail TEXT NOT NULL DEFAULT '',
  existing_customers INTEGER NOT NULL DEFAULT 0,
  new_customers INTEGER NOT NULL DEFAULT 0,
  cross_sell_count INTEGER NOT NULL DEFAULT 0,
  good_points TEXT NOT NULL DEFAULT '',
  improvement_points TEXT NOT NULL DEFAULT '',
  submitted_at INTEGER NOT NULL,
  source_chat_id TEXT,

  UNIQUE (date, staff_id)
);
