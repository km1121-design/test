CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('代表', 'スタッフ')),
  department TEXT NOT NULL CHECK (department IN ('1部', '2部')),
  hourly_wage_override REAL,
  monthly_goal REAL NOT NULL DEFAULT 0,
  line_user_id TEXT,
  active INTEGER NOT NULL DEFAULT 1
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
  hourly_wage_dept2 REAL NOT NULL,
  card_fee_rate REAL NOT NULL DEFAULT 0.0324,
  emoney_fee_rate REAL NOT NULL DEFAULT 0.0324,
  qr_fee_rate REAL NOT NULL DEFAULT 0.0198
);

CREATE TABLE IF NOT EXISTS rep_reports (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('1部', '2部')),
  reporter_name TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,

  overall_sales REAL NOT NULL DEFAULT 0,
  personal_sales REAL NOT NULL DEFAULT 0,
  hiace_sales REAL NOT NULL DEFAULT 0,
  hq_sales REAL NOT NULL DEFAULT 0,
  event_sales REAL NOT NULL DEFAULT 0,

  cash_sales REAL NOT NULL DEFAULT 0,
  card_sales REAL NOT NULL DEFAULT 0,
  emoney_sales REAL NOT NULL DEFAULT 0,
  qr_sales REAL NOT NULL DEFAULT 0,

  groups_count INTEGER NOT NULL DEFAULT 0,
  new_customers INTEGER NOT NULL DEFAULT 0,
  existing_customers INTEGER NOT NULL DEFAULT 0,

  comment TEXT NOT NULL DEFAULT '',
  plan_attendance TEXT NOT NULL DEFAULT '',
  plan_reservation TEXT NOT NULL DEFAULT '',
  plan_task TEXT NOT NULL DEFAULT '',

  UNIQUE (date, department, reporter_name)
);

CREATE TABLE IF NOT EXISTS rep_report_staff_breakdown (
  id TEXT PRIMARY KEY,
  rep_report_id TEXT NOT NULL REFERENCES rep_reports (id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  sales REAL NOT NULL DEFAULT 0,
  customer_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rep_breakdown_report ON rep_report_staff_breakdown (rep_report_id);

CREATE TABLE IF NOT EXISTS rep_report_expenses (
  id TEXT PRIMARY KEY,
  rep_report_id TEXT NOT NULL REFERENCES rep_reports (id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT '',
  receipt_file_name TEXT,
  receipt_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_rep_expenses_report ON rep_report_expenses (rep_report_id);

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
  cross_sell_count INTEGER NOT NULL DEFAULT 0,
  good_points TEXT NOT NULL DEFAULT '',
  improvement_points TEXT NOT NULL DEFAULT '',
  submitted_at INTEGER NOT NULL,
  UNIQUE (date, staff_id)
);

CREATE TABLE IF NOT EXISTS staff_report_customers (
  id TEXT PRIMARY KEY,
  staff_report_id TEXT NOT NULL REFERENCES staff_reports (id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_staff_customers_report ON staff_report_customers (staff_report_id);

-- Phase 2: LINE配信設定（単一行）
CREATE TABLE IF NOT EXISTS delivery_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  report_group_id TEXT NOT NULL DEFAULT '',
  staff_report_group_id TEXT NOT NULL DEFAULT '',
  forward_rep_enabled INTEGER NOT NULL DEFAULT 1,
  daily_summary_enabled INTEGER NOT NULL DEFAULT 1,
  staff_digest_enabled INTEGER NOT NULL DEFAULT 1,
  summary_time TEXT NOT NULL DEFAULT '22:00',
  -- Phase 3
  reminder_enabled INTEGER NOT NULL DEFAULT 1,
  reminder_time TEXT NOT NULL DEFAULT '19:00',
  alert_enabled INTEGER NOT NULL DEFAULT 1,
  pace_drop_threshold REAL NOT NULL DEFAULT 0.2
);

-- Phase 2: LINE送信記録（監査・モック検証用）
CREATE TABLE IF NOT EXISTS line_outbox (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'mock'
);
CREATE INDEX IF NOT EXISTS idx_line_outbox_created ON line_outbox (created_at DESC);
