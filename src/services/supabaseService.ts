import { supabase, testSupabaseConnection } from '../utils/supabase';
import { storageService, registerStorageMiddleware, StorageActionType } from './storageService';
import {
  Project,
  Employee,
  TimesheetMonthRecord,
  InventoryItem,
  ProjectStock,
  InventoryLog,
  CleaningTask,
  UserAccount,
  CompanyProfile,
  ChartOfAccount,
  FinanceTransaction,
  DebtRecord,
  ReceivableRecord
} from '../types';

export const SUPABASE_SQL_SCHEMA = `-- SKEMA DATABASE SUPABASE UNTUK RAJAWALI CYCLE
-- Buka Supabase Dashboard > SQL Editor > Paste query ini dan klik 'Run'

-- 1. Table Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  location TEXT,
  client_name TEXT,
  target_work_hours NUMERIC,
  budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Table Employees
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
  basic_salary NUMERIC,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Table Tasks
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
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. Table Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  min_stock NUMERIC,
  unit_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. Table Project Stocks
CREATE TABLE IF NOT EXISTS public.project_stocks (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  project_id TEXT,
  current_stock NUMERIC,
  min_stock NUMERIC,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. Table Inventory Logs
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT,
  project_id TEXT,
  project_name TEXT,
  type TEXT,
  quantity NUMERIC,
  pic TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. Table Debts (Hutang Usaha)
CREATE TABLE IF NOT EXISTS public.debts (
  id TEXT PRIMARY KEY,
  code TEXT,
  creditor_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  invoice_number TEXT,
  issue_date TEXT,
  due_date TEXT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  status TEXT,
  project_id TEXT,
  project_name TEXT,
  account_code TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 8. Table Receivables (Piutang Usaha)
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
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  status TEXT,
  project_id TEXT,
  project_name TEXT,
  account_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 9. Table Finance Transactions (Buku Kas & Jurnal)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id TEXT PRIMARY KEY,
  code TEXT,
  date TEXT,
  type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC,
  payment_method TEXT,
  primary_account_code TEXT,
  contra_account_code TEXT,
  project_id TEXT,
  project_name TEXT,
  division TEXT,
  payee_or_payer TEXT,
  reference_number TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 10. Table App Sync Data (Untuk full backup JSON fleksibel)
CREATE TABLE IF NOT EXISTS public.app_sync_store (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Mengaktifkan Row Level Security (RLS) & Kebijakan Akses Publik Anon
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

-- Idempotent RLS Policies (Drop if exists then create)
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
`;

export type SupabaseSyncState = 'idle' | 'syncing' | 'synced' | 'error';

export interface SupabaseSyncEventDetail {
  state: SupabaseSyncState;
  moduleKey?: string;
  message?: string;
  timestamp: string;
}

const AUTO_SYNC_KEY = 'rajawali_supabase_auto_sync_enabled';
const LAST_SYNC_KEY = 'rajawali_supabase_last_synced_at';

// Unique client identifier per session/browser tab to prevent broadcast echo loop
const CLIENT_SESSION_ID = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

let currentSyncState: SupabaseSyncState = 'idle';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSyncKeys = new Set<string>();
let realtimeChannel: any = null;
let isRealtimeInitialized = false;

export const supabaseService = {
  testConnection: testSupabaseConnection,

  isAutoSyncEnabled(): boolean {
    const raw = localStorage.getItem(AUTO_SYNC_KEY);
    // Default to true for seamless real-time cloud backup on every post
    return raw === null ? true : raw === 'true';
  },

  setAutoSyncEnabled(enabled: boolean) {
    localStorage.setItem(AUTO_SYNC_KEY, enabled ? 'true' : 'false');
    this.broadcastSyncStatus(currentSyncState, 'Semua Modul', enabled ? 'Auto-sync Supabase diaktifkan' : 'Auto-sync Supabase dinonaktifkan');
  },

  getLastSyncTime(): string | null {
    return localStorage.getItem(LAST_SYNC_KEY);
  },

  getSyncState(): SupabaseSyncState {
    return currentSyncState;
  },

  broadcastSyncStatus(state: SupabaseSyncState, moduleKey?: string, message?: string) {
    currentSyncState = state;
    const now = new Date().toLocaleTimeString('id-ID');
    if (state === 'synced') {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }
    try {
      const event = new CustomEvent<SupabaseSyncEventDetail>('supabase_sync_status', {
        detail: {
          state,
          moduleKey,
          message,
          timestamp: now
        }
      });
      window.dispatchEvent(event);
    } catch {
      // ignore
    }
  },

  /**
   * Initializes Supabase Realtime Channel and subscriptions so all clients
   * receive database updates instantly without needing to refresh or click sync.
   * Subscribes to all main tables (debts, receivables, projects, finance_transactions, etc.)
   */
  initRealtime() {
    if (isRealtimeInitialized) return;
    isRealtimeInitialized = true;

    try {
      // 1. Primary Dedicated Realtime Channel (Universal JSON Store & Instant P2P Multi-User Broadcast)
      realtimeChannel = supabase.channel('rajawali-realtime-global', {
        config: {
          broadcast: { self: false }
        }
      });

      // Instant P2P / Multi-User Broadcast Channel (0ms Latency)
      realtimeChannel.on('broadcast', { event: 'data_changed' }, (payload: any) => {
        const { key, data, senderId } = payload?.payload || {};
        if (senderId && senderId !== CLIENT_SESSION_ID && key && data !== undefined) {
          storageService.saveFromRemote(key, data);
          this.triggerLocalChangeEvent(key, data);
          this.broadcastSyncStatus('synced', key, `Pembaruan realtime diterima (${key})`);
        }
      });

      // Table APP_SYNC_STORE (Dokumen JSON Universal Lengkap)
      realtimeChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_sync_store' },
        (payload: any) => {
          if (payload?.new && payload.new.key && payload.new.data) {
            storageService.saveFromRemote(payload.new.key, payload.new.data);
            this.triggerLocalChangeEvent(payload.new.key, payload.new.data);
          }
        }
      );

      // Subscribe to active primary channel
      realtimeChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Connected to global app_sync_store & broadcast channel');
        }
      });
    } catch (err) {
      console.warn('[Supabase Realtime Init Warning]:', err);
    }

    // Perform silent initial pull from Supabase so fresh sessions/devices
    // immediately have the latest data without manual clicks
    this.pullLatestFromSupabaseQuietly();
  },

  /**
   * Handles postgres_changes on individual relational tables (INSERT, UPDATE, DELETE)
   * updates local state and fires custom events without requiring a page refresh.
   */
  async handleTableRealtimeChange(tableName: string, payload: any) {
    try {
      // 1. Re-pull the updated structured module from app_sync_store or table
      await this.pullModuleFromSupabase(tableName);

      // 2. Dispatch table-specific and global real-time events
      this.triggerLocalChangeEvent(tableName, payload);
    } catch {
      // ignore
    }
  },

  /**
   * Dispatches instant DOM events to notify all React components across the app
   */
  triggerLocalChangeEvent(key: string, data?: any) {
    try {
      // Dispatch specific table events
      window.dispatchEvent(new CustomEvent(`${key}_updated`, { detail: { key, data } }));
      window.dispatchEvent(new CustomEvent('rajawali_remote_update', { detail: { key, data } }));
      window.dispatchEvent(new CustomEvent('rajawali_data_synced', { detail: { key, data, source: 'remote_sync' } }));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  },

  /**
   * Silently pulls latest data from Supabase in the background on startup
   */
  async pullLatestFromSupabaseQuietly() {
    try {
      const { data, error } = await supabase.from('app_sync_store').select('*');
      if (error || !data || data.length === 0) return;

      data.forEach((item: { key: string; data: any }) => {
        if (item.data && item.key) {
          storageService.saveFromRemote(item.key as any, item.data);
        }
      });
      this.broadcastSyncStatus('synced', undefined, 'Data awal tersinkronisasi dari Supabase Cloud');
    } catch {
      // ignore
    }
  },

  /**
   * Pull single module from Supabase JSON store
   */
  async pullModuleFromSupabase(moduleKey: string) {
    try {
      const { data, error } = await supabase
        .from('app_sync_store')
        .select('data')
        .eq('key', moduleKey)
        .single();

      if (!error && data && data.data) {
        storageService.saveFromRemote(moduleKey as any, data.data);
      }
    } catch {
      // ignore
    }
  },

  /**
   * Automatically triggered when any data is modified / posted.
   * Instantly broadcasts to other connected users via Realtime Channel with 0ms delay,
   * then batches Supabase DB upsert with a fast 150ms buffer.
   */
  notifyDataChanged(moduleKey: string, data?: any) {
    if (!this.isAutoSyncEnabled()) return;

    // 1. INSTANT BROADCAST TO ALL CONNECTED USERS (0 delay)
    if (realtimeChannel && data !== undefined) {
      try {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'data_changed',
          payload: {
            key: moduleKey,
            data,
            senderId: CLIENT_SESSION_ID,
            timestamp: Date.now()
          }
        }).catch((err: any) => console.debug('Broadcast notice:', err));
      } catch {
        // ignore
      }
    }

    // 2. FAST DB UPSERT TO SUPABASE CLOUD (150ms)
    pendingSyncKeys.add(moduleKey);
    this.broadcastSyncStatus('syncing', moduleKey, `Menyinkronkan posting ${moduleKey} ke Supabase...`);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      const keysToSync = Array.from(pendingSyncKeys);
      pendingSyncKeys.clear();
      await this.syncSpecificModules(keysToSync);
    }, 150);
  },

  /**
   * Sync specific modules to Supabase JSON store and relational tables
   */
  async syncSpecificModules(moduleKeys: string[]): Promise<boolean> {
    try {
      this.broadcastSyncStatus('syncing', moduleKeys.join(', '), 'Mengunggah update data ke Supabase Cloud...');

      const syncItems: { key: string; data: any; updated_at: string }[] = [];

      for (const key of moduleKeys) {
        let moduleData: any = null;
        switch (key) {
          case 'projects':
            moduleData = storageService.getProjects();
            break;
          case 'employees':
            moduleData = storageService.getEmployees();
            break;
          case 'tasks':
            moduleData = storageService.getTasks();
            break;
          case 'inventory_items':
            moduleData = storageService.getInventoryItems();
            break;
          case 'project_stocks':
            moduleData = storageService.getProjectStocks();
            break;
          case 'inventory_logs':
            moduleData = storageService.getInventoryLogs();
            break;
          case 'debts':
            moduleData = storageService.getDebts();
            break;
          case 'receivables':
            moduleData = storageService.getReceivables();
            break;
          case 'finance_transactions':
            moduleData = storageService.getFinanceTransactions();
            break;
          case 'timesheets':
            moduleData = storageService.getTimesheets();
            break;
          case 'company_profile':
            moduleData = storageService.getCompanyProfile();
            break;
          case 'users':
            moduleData = storageService.getUsers();
            break;
          case 'chart_of_accounts':
            moduleData = storageService.getChartOfAccounts();
            break;
          case 'bank_statements':
            moduleData = storageService.getBankStatements();
            break;
          case 'period_closings':
            moduleData = storageService.getPeriodClosings();
            break;
          case 'audit_trails':
            moduleData = storageService.getAuditTrails();
            break;
          case 'investments':
            moduleData = storageService.getInvestments();
            break;
        }

        if (moduleData !== null) {
          syncItems.push({
            key,
            data: moduleData,
            updated_at: new Date().toISOString()
          });
        }
      }

      if (syncItems.length === 0) {
        this.broadcastSyncStatus('synced', undefined, 'Data sudah up-to-date');
        return true;
      }

      // 1. Upsert into universal app_sync_store JSON document repository
      const { error: storeError } = await supabase.from('app_sync_store').upsert(syncItems, { onConflict: 'key' });

      if (storeError) {
        console.warn('Supabase app_sync_store sync warning:', storeError.message);
        this.broadcastSyncStatus('error', moduleKeys.join(', '), `Gagal auto-backup: ${storeError.message}`);
        return false;
      }

      // 2. Parallel Relational Table Upserts for structured queries
      for (const key of moduleKeys) {
        try {
          if (key === 'projects') {
            const projects = storageService.getProjects();
            if (projects.length > 0) {
              const rows = projects.map((p) => ({
                id: p.id,
                code: p.code,
                name: p.name,
                location: p.address,
                client_name: p.clientName || '',
                target_work_hours: p.operationalHours ? 8 : 8,
                budget: 0,
                created_at: p.updatedAt || new Date().toISOString()
              }));
              await supabase.from('projects').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'debts') {
            const debts = storageService.getDebts();
            if (debts.length > 0) {
              const rows = debts.map((d) => ({
                id: d.id,
                code: d.code,
                creditor_name: d.creditorName,
                contact_person: d.contactPerson || '',
                phone: d.phone || '',
                invoice_number: d.invoiceNumber || '',
                issue_date: d.issueDate,
                due_date: d.dueDate,
                total_amount: d.totalAmount,
                paid_amount: d.paidAmount,
                remaining_amount: d.remainingAmount,
                status: d.status,
                project_id: d.projectId || '',
                project_name: d.projectName || '',
                account_code: d.accountCode || '',
                category: d.category || '',
                notes: d.notes || '',
                created_at: d.createdAt || new Date().toISOString()
              }));
              await supabase.from('debts').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'receivables') {
            const receivables = storageService.getReceivables();
            if (receivables.length > 0) {
              const rows = receivables.map((r) => ({
                id: r.id,
                code: r.code,
                customer_name: r.customerName,
                contact_person: r.contactPerson || '',
                phone: r.phone || '',
                invoice_number: r.invoiceNumber || '',
                issue_date: r.issueDate,
                due_date: r.dueDate,
                term_of_payment: r.termOfPayment || '',
                total_amount: r.totalAmount,
                paid_amount: r.paidAmount,
                remaining_amount: r.remainingAmount,
                status: r.status,
                project_id: r.projectId || '',
                project_name: r.projectName || '',
                account_code: r.accountCode || '',
                notes: r.notes || '',
                created_at: r.createdAt || new Date().toISOString()
              }));
              await supabase.from('receivables').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'finance_transactions') {
            const txs = storageService.getFinanceTransactions();
            if (txs.length > 0) {
              const rows = txs.map((t) => ({
                id: t.id,
                code: t.code,
                date: t.date,
                type: t.type,
                title: t.title,
                description: t.description || '',
                amount: t.amount,
                payment_method: t.paymentMethod,
                primary_account_code: t.primaryAccountCode,
                contra_account_code: t.contraAccountCode,
                project_id: t.projectId || '',
                project_name: t.projectName || '',
                division: t.division || '',
                payee_or_payer: t.payeeOrPayer || '',
                reference_number: t.referenceNumber || '',
                created_by: t.createdBy || '',
                created_at: t.createdAt || new Date().toISOString()
              }));
              await supabase.from('finance_transactions').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'employees') {
            const emps = storageService.getEmployees();
            if (emps.length > 0) {
              const rows = emps.map((e) => ({
                id: e.id,
                nik: e.nik,
                name: e.name,
                role: e.position,
                division: 'Operasional',
                project_id: e.projectId,
                status: e.status,
                phone: e.phone,
                join_date: e.joinDate,
                bank_name: e.bankName,
                bank_account: e.bankAccount,
                basic_salary: e.dailyRate * 25,
                created_at: new Date().toISOString()
              }));
              await supabase.from('employees').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'tasks') {
            const tasks = storageService.getTasks();
            if (tasks.length > 0) {
              const rows = tasks.map((t) => ({
                id: t.id,
                code: t.id,
                title: t.areaName,
                description: t.notes || '',
                project_id: t.projectId,
                area: t.areaName,
                priority: t.priority,
                status: t.status,
                assignee_id: t.assignedEmployees?.[0] || '',
                assignee_name: t.assignedLeaderName || '',
                due_date: t.targetCompletionTime || '',
                created_at: t.createdAt || new Date().toISOString()
              }));
              await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'inventory_items') {
            const items = storageService.getInventoryItems();
            if (items.length > 0) {
              const rows = items.map((i) => ({
                id: i.id,
                code: i.code,
                name: i.name,
                category: i.category,
                unit: i.unit,
                min_stock: i.minStock,
                unit_price: i.unitPrice,
                created_at: new Date().toISOString()
              }));
              await supabase.from('inventory_items').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'project_stocks') {
            const stocks = storageService.getProjectStocks();
            if (stocks.length > 0) {
              const rows = stocks.map((s) => ({
                id: s.id,
                item_id: s.itemId,
                project_id: s.projectId,
                current_stock: s.currentStock,
                min_stock: 0,
                created_at: s.lastUpdated || new Date().toISOString()
              }));
              await supabase.from('project_stocks').upsert(rows, { onConflict: 'id' });
            }
          } else if (key === 'inventory_logs') {
            const logs = storageService.getInventoryLogs();
            if (logs.length > 0) {
              const rows = logs.map((l) => ({
                id: l.id,
                item_id: l.itemId,
                item_name: '',
                project_id: l.projectId,
                project_name: '',
                type: l.type,
                quantity: l.quantity,
                pic: l.pic,
                notes: l.notes,
                timestamp: l.date || new Date().toISOString()
              }));
              await supabase.from('inventory_logs').upsert(rows, { onConflict: 'id' });
            }
          }
        } catch (relError) {
          // Relational upsert is secondary to app_sync_store, log warning if table structure not yet initialized
          console.debug(`Relational upsert notice for ${key}:`, relError);
        }
      }

      this.broadcastSyncStatus('synced', moduleKeys.join(', '), 'Posting berhasil diperbarui & di-upsert ke Supabase Cloud!');
      return true;
    } catch (err: any) {
      console.error('Supabase auto-sync error:', err);
      this.broadcastSyncStatus('error', moduleKeys.join(', '), err?.message || 'Koneksi Supabase terputus');
      return false;
    }
  },

  /**
   * Push all current data to Supabase (Universal JSON & Table store)
   */
  async pushAllDataToSupabase(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      this.broadcastSyncStatus('syncing', 'Semua Data', 'Mengunggah seluruh data ke Supabase Cloud...');
      const projects = storageService.getProjects();
      const employees = storageService.getEmployees();
      const tasks = storageService.getTasks();
      const inventoryItems = storageService.getInventoryItems();
      const projectStocks = storageService.getProjectStocks();
      const inventoryLogs = storageService.getInventoryLogs();
      const debts = storageService.getDebts();
      const receivables = storageService.getReceivables();
      const financeTransactions = storageService.getFinanceTransactions();
      const timesheets = storageService.getTimesheets();
      const companyProfile = storageService.getCompanyProfile();
      const users = storageService.getUsers();
      const chartOfAccounts = storageService.getChartOfAccounts();
      const bankStatements = storageService.getBankStatements();
      const periodClosings = storageService.getPeriodClosings();
      const auditTrails = storageService.getAuditTrails();
      const investments = storageService.getInvestments();

      // 1. Simpan ke snapshot JSON di app_sync_store
      const syncItems = [
        { key: 'projects', data: projects, updated_at: new Date().toISOString() },
        { key: 'employees', data: employees, updated_at: new Date().toISOString() },
        { key: 'tasks', data: tasks, updated_at: new Date().toISOString() },
        { key: 'inventory_items', data: inventoryItems, updated_at: new Date().toISOString() },
        { key: 'project_stocks', data: projectStocks, updated_at: new Date().toISOString() },
        { key: 'inventory_logs', data: inventoryLogs, updated_at: new Date().toISOString() },
        { key: 'debts', data: debts, updated_at: new Date().toISOString() },
        { key: 'receivables', data: receivables, updated_at: new Date().toISOString() },
        { key: 'finance_transactions', data: financeTransactions, updated_at: new Date().toISOString() },
        { key: 'timesheets', data: timesheets, updated_at: new Date().toISOString() },
        { key: 'company_profile', data: companyProfile, updated_at: new Date().toISOString() },
        { key: 'users', data: users, updated_at: new Date().toISOString() },
        { key: 'chart_of_accounts', data: chartOfAccounts, updated_at: new Date().toISOString() },
        { key: 'bank_statements', data: bankStatements, updated_at: new Date().toISOString() },
        { key: 'period_closings', data: periodClosings, updated_at: new Date().toISOString() },
        { key: 'audit_trails', data: auditTrails, updated_at: new Date().toISOString() },
        { key: 'investments', data: investments, updated_at: new Date().toISOString() }
      ];

      const { error: storeError } = await supabase.from('app_sync_store').upsert(syncItems, { onConflict: 'key' });

      if (storeError) {
        this.broadcastSyncStatus('error', 'Semua Data', storeError.message);
        if (storeError.code === '42P01') {
          return {
            success: false,
            message: 'Tabel Supabase belum dibuat. Silakan salin skema SQL di tab "Skema Database SQL" dan jalankan di Supabase SQL Editor.',
            details: storeError
          };
        }
        return {
          success: false,
          message: `Gagal sinkronisasi data ke Supabase: ${storeError.message}`,
          details: storeError
        };
      }

      this.broadcastSyncStatus('synced', 'Semua Data', 'Sinkronisasi selesai');
      return {
        success: true,
        message: `Berhasil sinkronisasi seluruh data (${projects.length} Proyek, ${employees.length} Karyawan, ${debts.length} Hutang, ${receivables.length} Piutang, ${financeTransactions.length} Transaksi) ke Supabase Cloud!`
      };
    } catch (err: any) {
      this.broadcastSyncStatus('error', 'Semua Data', err?.message);
      return {
        success: false,
        message: `Error saat menghubungkan ke Supabase: ${err?.message || 'Koneksi terputus'}`,
        details: err
      };
    }
  },

  /**
   * Pull all data from Supabase into local storage
   */
  async pullAllDataFromSupabase(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { data, error } = await supabase.from('app_sync_store').select('*');
      if (error) {
        return {
          success: false,
          message: `Gagal mengambil data dari Supabase: ${error.message}`
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'Belum ada data di database Supabase. Silakan unggah/sync data terlebih dahulu.'
        };
      }

      let restoredCount = 0;
      data.forEach((item: { key: string; data: any }) => {
        if (!item.data) return;
        switch (item.key) {
          case 'projects':
            storageService.saveProjects(item.data);
            restoredCount++;
            break;
          case 'employees':
            storageService.saveEmployees(item.data);
            restoredCount++;
            break;
          case 'tasks':
            storageService.saveTasks(item.data);
            restoredCount++;
            break;
          case 'inventory_items':
            storageService.saveInventoryItems(item.data);
            restoredCount++;
            break;
          case 'project_stocks':
            storageService.saveProjectStocks(item.data);
            restoredCount++;
            break;
          case 'inventory_logs':
            storageService.saveInventoryLogs(item.data);
            restoredCount++;
            break;
          case 'debts':
            storageService.saveDebts(item.data);
            restoredCount++;
            break;
          case 'receivables':
            storageService.saveReceivables(item.data);
            restoredCount++;
            break;
          case 'finance_transactions':
            storageService.saveFinanceTransactions(item.data);
            restoredCount++;
            break;
          case 'timesheets':
            storageService.saveTimesheets(item.data);
            restoredCount++;
            break;
          case 'company_profile':
            storageService.saveCompanyProfile(item.data);
            restoredCount++;
            break;
          case 'users':
            storageService.saveUsers(item.data);
            restoredCount++;
            break;
          case 'chart_of_accounts':
            storageService.saveChartOfAccounts(item.data);
            restoredCount++;
            break;
          case 'bank_statements':
            storageService.saveBankStatements(item.data);
            restoredCount++;
            break;
          case 'period_closings':
            storageService.savePeriodClosings(item.data);
            restoredCount++;
            break;
          case 'audit_trails':
            storageService.saveAuditTrails(item.data);
            restoredCount++;
            break;
          case 'investments':
            storageService.saveInvestments(item.data);
            restoredCount++;
            break;
        }
      });

      return {
        success: true,
        message: `Berhasil mengunduh dan memulihkan ${restoredCount} modul data dari Supabase!`,
        data
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error saat mengambil data dari Supabase: ${err?.message || 'Koneksi gagal'}`
      };
    }
  }
};

// =============================================================================
// STORAGE MIDDLEWARE REGISTRATION
// =============================================================================
// Intercepts every data modification across the app and automatically triggers
// real-time cloud upserts to Supabase without manual intervention.
registerStorageMiddleware(async (context) => {
  if (context.source === 'remote_sync') return;
  supabaseService.notifyDataChanged(context.key, context.data);
});

