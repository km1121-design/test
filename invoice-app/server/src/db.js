'use strict';

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required (Postgres connection string, e.g. from Neon or Supabase)');
}

// Managed Postgres providers (Neon/Supabase) require TLS with a self-signed-looking
// chain from the client's point of view; disable strict verification unless the
// operator explicitly opts out via PGSSL=disable for a local/trusted Postgres.
const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  registration_no TEXT,
  bank_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  postal_code TEXT,
  address TEXT,
  contact_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  unit_label TEXT NOT NULL DEFAULT '日',
  tax_rate TEXT NOT NULL DEFAULT '10',
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, work_date)
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_no TEXT,
  company_id INTEGER REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  issue_date DATE,
  due_date DATE,
  period_start DATE,
  period_end DATE,
  subject TEXT,
  bank_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(id),
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate TEXT NOT NULL DEFAULT '10',
  sort_order INTEGER NOT NULL DEFAULT 0
);
`;

async function init() {
  await pool.query(SCHEMA_SQL);
}

module.exports = { pool, init };
