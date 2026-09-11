-- Migration: 20260904000000_new-migration.sql
-- Project: trytwqpigfswkumpbfrp (Rajawali Cycle & Facility Management ERP)

-- 1. Table Projects (Manajemen Proyek & Site)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  location TEXT,
  client_name TEXT,
  target_work_hours NUMERIC DEFAULT 8,
  budget NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Table Employees (Data Karyawan & Personel)
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  nik TEXT,
  name TEXT NOT NULL,
  role TEXT,
  division TEXT,
  project_id TEXT,
  status TEXT,
  phone TEXT,
  join_date TEXT,
  bank_name TEXT,
  bank_account TEXT,
  basic_salary NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Table Tasks (Kanban & Quality Control Task)
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  area TEXT,
  priority TEXT,
  status TEXT,
  assignee_id TEXT,
  assignee_name TEXT,
  due_date TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. Table Inventory Items (Master Logistik & Peralatan)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  min_stock NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. Table Project Stocks (Stok per Lokasi Proyek)
CREATE TABLE IF NOT EXISTS public.project_stocks (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  project_id TEXT,
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. Table Inventory Logs (Riwayat Keluar/Masuk Barang)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT,
  project_id TEXT,
  project_name TEXT,
  type TEXT,
  quantity NUMERIC DEFAULT 0,
  pic TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. Table Debts (Hutang Usaha & Kewajiban Vendor)
CREATE TABLE IF NOT EXISTS public.debts (
  id TEXT PRIMARY KEY,
  code TEXT,
  creditor_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  invoice_number TEXT,
  issue_date TEXT,
  due_date TEXT,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  status TEXT,
  project_id TEXT,
  project_name TEXT,
  account_code TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 8. Table Receivables (Piutang Usaha & Tagihan Client)
CREATE TABLE IF NOT EXISTS public.receivables (
  id TEXT PRIMARY KEY,
  code TEXT,
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  invoice_number TEXT,
  issue_date TEXT,
  due_date TEXT,
  term_of_payment TEXT,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  status TEXT,
  project_id TEXT,
  project_name TEXT,
  account_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 9. Table Finance Transactions (Jurnal Buku Kas, Bank, & Biaya)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id TEXT PRIMARY KEY,
  code TEXT,
  date TEXT,
  type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  primary_account_code TEXT,
  contra_account_code TEXT,
  project_id TEXT,
  project_name TEXT,
  division TEXT,
  payee_or_payer TEXT,
  reference_number TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 10. Table App Sync Store (Dokumen Backup Cloud JSON Terpadu)
CREATE TABLE IF NOT EXISTS public.app_sync_store (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(code);
CREATE INDEX IF NOT EXISTS idx_employees_project ON public.employees(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_debts_project ON public.debts(project_id);
CREATE INDEX IF NOT EXISTS idx_receivables_project ON public.receivables(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_date ON public.finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_finance_project ON public.finance_transactions(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sync_store ENABLE ROW LEVEL SECURITY;

-- Allow Public / Anonymous Full Access Policies (Idempotent)
DROP POLICY IF EXISTS "Allow all public projects" ON public.projects;
CREATE POLICY "Allow all public projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public employees" ON public.employees;
CREATE POLICY "Allow all public employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public tasks" ON public.tasks;
CREATE POLICY "Allow all public tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public inventory_items" ON public.inventory_items;
CREATE POLICY "Allow all public inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public project_stocks" ON public.project_stocks;
CREATE POLICY "Allow all public project_stocks" ON public.project_stocks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow all public inventory_logs" ON public.inventory_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public debts" ON public.debts;
CREATE POLICY "Allow all public debts" ON public.debts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public receivables" ON public.receivables;
CREATE POLICY "Allow all public receivables" ON public.receivables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public finance_transactions" ON public.finance_transactions;
CREATE POLICY "Allow all public finance_transactions" ON public.finance_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public app_sync_store" ON public.app_sync_store;
CREATE POLICY "Allow all public app_sync_store" ON public.app_sync_store FOR ALL USING (true) WITH CHECK (true);
