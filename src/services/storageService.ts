import {
  Project,
  Employee,
  TimesheetMonthRecord,
  MutationHistory,
  InventoryItem,
  ProjectStock,
  InventoryLog,
  MaterialRequest,
  CleaningTask,
  BlastAnnouncement,
  SopDocument,
  UserAccount,
  CompanyProfile,
  ChartOfAccount,
  FinanceTransaction,
  BankStatementImport,
  PeriodClosing,
  AuditTrailItem,
  CurrencyRate,
  DebtRecord,
  ReceivableRecord,
  InvestmentRecord,
  DashboardWidgetsState,
  DashboardWidgetId
} from '../types';
import {
  INITIAL_PROJECTS,
  INITIAL_EMPLOYEES,
  generateSeedTimesheets,
  INITIAL_MUTATIONS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_PROJECT_STOCKS,
  INITIAL_INVENTORY_LOGS,
  INITIAL_MATERIAL_REQUESTS,
  INITIAL_TASKS,
  INITIAL_BLASTS,
  INITIAL_SOPS,
  INITIAL_USERS,
  INITIAL_COMPANY_PROFILE
} from '../data/initialData';
import {
  INITIAL_CHART_OF_ACCOUNTS,
  INITIAL_FINANCE_TRANSACTIONS,
  INITIAL_BANK_STATEMENTS,
  INITIAL_PERIOD_CLOSINGS,
  INITIAL_AUDIT_TRAILS,
  INITIAL_CURRENCY_RATES,
  INITIAL_DEBTS,
  INITIAL_RECEIVABLES,
  INITIAL_INVESTMENTS
} from '../data/initialFinanceData';

const STORAGE_KEYS = {
  COMPANY_PROFILE: 'rajawali_company_profile',
  PROJECTS: 'rajawali_projects',
  EMPLOYEES: 'rajawali_employees',
  TIMESHEETS: 'rajawali_timesheets',
  MUTATIONS: 'rajawali_mutations',
  INVENTORY_ITEMS: 'rajawali_inventory_items',
  PROJECT_STOCKS: 'rajawali_project_stocks',
  INVENTORY_LOGS: 'rajawali_inventory_logs',
  MATERIAL_REQUESTS: 'rajawali_material_requests',
  TASKS: 'rajawali_tasks',
  BLASTS: 'rajawali_blasts',
  SOPS: 'rajawali_sops',
  USERS: 'rajawali_users_accounts',
  ACTIVE_USER: 'rajawali_active_session_user',
  SELECTED_PROJECT: 'rajawali_selected_project_id',
  USER_ROLE: 'rajawali_user_role',
  CHART_OF_ACCOUNTS: 'rajawali_finance_coa',
  FINANCE_TRANSACTIONS: 'rajawali_finance_transactions',
  BANK_STATEMENTS: 'rajawali_finance_bank_statements',
  PERIOD_CLOSINGS: 'rajawali_finance_period_closings',
  AUDIT_TRAILS: 'rajawali_finance_audit_trails',
  CURRENCY_RATES: 'rajawali_finance_currency_rates',
  DEBTS: 'rajawali_finance_debts',
  RECEIVABLES: 'rajawali_finance_receivables',
  INVESTMENTS: 'rajawali_finance_investments',
  DASHBOARD_WIDGETS: 'rajawali_dashboard_widgets'
};

// =============================================================================
// STORAGE MIDDLEWARE & EVENT PIPELINE
// =============================================================================
export type StorageActionType =
  | 'projects'
  | 'debts'
  | 'receivables'
  | 'finance_transactions'
  | 'employees'
  | 'timesheets'
  | 'mutations'
  | 'inventory_items'
  | 'project_stocks'
  | 'inventory_logs'
  | 'material_requests'
  | 'tasks'
  | 'blasts'
  | 'sops'
  | 'users'
  | 'company_profile'
  | 'chart_of_accounts'
  | 'bank_statements'
  | 'period_closings'
  | 'audit_trails'
  | 'currency_rates'
  | 'investments';

export const ACTION_TO_STORAGE_KEY_MAP: Record<StorageActionType, string> = {
  projects: STORAGE_KEYS.PROJECTS,
  debts: STORAGE_KEYS.DEBTS,
  receivables: STORAGE_KEYS.RECEIVABLES,
  finance_transactions: STORAGE_KEYS.FINANCE_TRANSACTIONS,
  employees: STORAGE_KEYS.EMPLOYEES,
  timesheets: STORAGE_KEYS.TIMESHEETS,
  mutations: STORAGE_KEYS.MUTATIONS,
  inventory_items: STORAGE_KEYS.INVENTORY_ITEMS,
  project_stocks: STORAGE_KEYS.PROJECT_STOCKS,
  inventory_logs: STORAGE_KEYS.INVENTORY_LOGS,
  material_requests: STORAGE_KEYS.MATERIAL_REQUESTS,
  tasks: STORAGE_KEYS.TASKS,
  blasts: STORAGE_KEYS.BLASTS,
  sops: STORAGE_KEYS.SOPS,
  users: STORAGE_KEYS.USERS,
  company_profile: STORAGE_KEYS.COMPANY_PROFILE,
  chart_of_accounts: STORAGE_KEYS.CHART_OF_ACCOUNTS,
  bank_statements: STORAGE_KEYS.BANK_STATEMENTS,
  period_closings: STORAGE_KEYS.PERIOD_CLOSINGS,
  audit_trails: STORAGE_KEYS.AUDIT_TRAILS,
  currency_rates: STORAGE_KEYS.CURRENCY_RATES,
  investments: STORAGE_KEYS.INVESTMENTS
};

export interface StorageMiddlewareContext<T = any> {
  key: StorageActionType;
  storageKey: string;
  data: T;
  timestamp: string;
  source?: 'user_action' | 'system_sync' | 'remote_sync' | 'reset';
}

export type StorageMiddleware = (context: StorageMiddlewareContext) => void | Promise<void>;

const storageMiddlewares: StorageMiddleware[] = [];

/**
 * Register a storage middleware that intercepts and acts on every state update
 * (e.g. Activity Logging, Persistence Hooks).
 */
export function registerStorageMiddleware(middleware: StorageMiddleware) {
  storageMiddlewares.push(middleware);
}

// Backward compatibility alias
export function registerDataChangeListener(listener: (key: string, data: any) => void) {
  registerStorageMiddleware((ctx) => {
    if (ctx.source !== 'remote_sync') {
      listener(ctx.key, ctx.data);
    }
  });
}

/**
 * Core update wrapper: Persists to local storage instantly with zero latency,
 * dispatches optional DOM events, and runs all registered storage middlewares
 * without requiring manual sync triggers.
 */
function applyStorageUpdate<T>(
  actionKey: StorageActionType,
  storageKey: string,
  data: T,
  customEventName?: string,
  source: 'user_action' | 'system_sync' | 'remote_sync' | 'reset' = 'user_action'
): void {
  // 1. Instant local persistence
  localStorage.setItem(storageKey, JSON.stringify(data));

  // 2. Dispatch custom DOM event if requested
  if (customEventName) {
    try {
      window.dispatchEvent(new Event(customEventName));
    } catch {
      // ignore
    }
  }

  // 3. Dispatch global sync event for any active view/tab
  try {
    window.dispatchEvent(
      new CustomEvent('rajawali_data_synced', {
        detail: { key: actionKey, data, source }
      })
    );
  } catch {
    // ignore
  }

  // 4. Execute middleware pipeline (Audit Trail, Broadcast, etc.)
  const context: StorageMiddlewareContext<T> = {
    key: actionKey,
    storageKey,
    data,
    timestamp: new Date().toISOString(),
    source
  };

  storageMiddlewares.forEach((middleware) => {
    try {
      middleware(context);
    } catch (err) {
      console.warn(`[StorageMiddleware Error] on ${actionKey}:`, err);
    }
  });
}

function initStorageQuietly<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// One-time client auto-cleanup: wipe sample data and preserve ONLY location data
const CLEANUP_MIGRATION_VERSION = 'rajawali_clean_locations_only_v2';
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    if (localStorage.getItem('rajawali_data_cleaned_locations_only') !== CLEANUP_MIGRATION_VERSION) {
      // Ensure projects (locations) exist
      const existingProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (!existingProjects) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      }

      // Clear sample/demo operational and finance records
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TIMESHEETS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INVENTORY_ITEMS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PROJECT_STOCKS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.MATERIAL_REQUESTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BLASTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.FINANCE_TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BANK_STATEMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PERIOD_CLOSINGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.AUDIT_TRAILS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify([]));

      // Reset initial and current account balances to 0
      const existingAccountsRaw = localStorage.getItem(STORAGE_KEYS.CHART_OF_ACCOUNTS);
      if (existingAccountsRaw) {
        try {
          const accounts = JSON.parse(existingAccountsRaw);
          if (Array.isArray(accounts)) {
            const cleaned = accounts.map((acc: any) => ({
              ...acc,
              initialBalance: 0,
              currentBalance: 0
            }));
            localStorage.setItem(STORAGE_KEYS.CHART_OF_ACCOUNTS, JSON.stringify(cleaned));
          }
        } catch {}
      }

      localStorage.setItem('rajawali_data_cleaned_locations_only', CLEANUP_MIGRATION_VERSION);
    }
  } catch {
    // ignore
  }
}

export const storageService = {
  getCompanyProfile(): CompanyProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
    if (!raw) {
      initStorageQuietly(STORAGE_KEYS.COMPANY_PROFILE, INITIAL_COMPANY_PROFILE);
      return INITIAL_COMPANY_PROFILE;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const merged = { ...INITIAL_COMPANY_PROFILE, ...parsed };
        if (!Array.isArray(merged.bankAccounts) || merged.bankAccounts.length === 0) {
          merged.bankAccounts = INITIAL_COMPANY_PROFILE.bankAccounts || [];
        }
        return merged;
      }
      return INITIAL_COMPANY_PROFILE;
    } catch {
      return INITIAL_COMPANY_PROFILE;
    }
  },

  saveCompanyProfile(data: CompanyProfile) {
    applyStorageUpdate('company_profile', STORAGE_KEYS.COMPANY_PROFILE, data, 'company_profile_updated');
  },

  getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
      return INITIAL_PROJECTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveProjects(data: Project[]) {
    applyStorageUpdate('projects', STORAGE_KEYS.PROJECTS, data);
  },

  getEmployees(): Employee[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
      return INITIAL_EMPLOYEES;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveEmployees(data: Employee[]) {
    applyStorageUpdate('employees', STORAGE_KEYS.EMPLOYEES, data);
  },

  getTimesheets(): TimesheetMonthRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMESHEETS);
    if (raw === null) {
      const emps = this.getEmployees();
      const initialTS = generateSeedTimesheets(emps);
      initStorageQuietly(STORAGE_KEYS.TIMESHEETS, initialTS);
      return initialTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveTimesheets(data: TimesheetMonthRecord[]) {
    applyStorageUpdate('timesheets', STORAGE_KEYS.TIMESHEETS, data);
  },

  getMutations(): MutationHistory[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MUTATIONS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.MUTATIONS, INITIAL_MUTATIONS);
      return INITIAL_MUTATIONS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveMutations(data: MutationHistory[]) {
    applyStorageUpdate('mutations', STORAGE_KEYS.MUTATIONS, data);
  },

  getInventoryItems(): InventoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY_ITEMS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.INVENTORY_ITEMS, INITIAL_INVENTORY_ITEMS);
      return INITIAL_INVENTORY_ITEMS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveInventoryItems(data: InventoryItem[]) {
    applyStorageUpdate('inventory_items', STORAGE_KEYS.INVENTORY_ITEMS, data);
  },

  getProjectStocks(): ProjectStock[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECT_STOCKS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.PROJECT_STOCKS, INITIAL_PROJECT_STOCKS);
      return INITIAL_PROJECT_STOCKS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      initStorageQuietly(STORAGE_KEYS.PROJECT_STOCKS, INITIAL_PROJECT_STOCKS);
      return INITIAL_PROJECT_STOCKS;
    } catch {
      return INITIAL_PROJECT_STOCKS;
    }
  },

  saveProjectStocks(data: ProjectStock[]) {
    applyStorageUpdate('project_stocks', STORAGE_KEYS.PROJECT_STOCKS, data);
  },

  getInventoryLogs(): InventoryLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY_LOGS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.INVENTORY_LOGS, INITIAL_INVENTORY_LOGS);
      return INITIAL_INVENTORY_LOGS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveInventoryLogs(data: InventoryLog[]) {
    applyStorageUpdate('inventory_logs', STORAGE_KEYS.INVENTORY_LOGS, data);
  },

  getMaterialRequests(): MaterialRequest[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MATERIAL_REQUESTS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.MATERIAL_REQUESTS, INITIAL_MATERIAL_REQUESTS);
      return INITIAL_MATERIAL_REQUESTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveMaterialRequests(data: MaterialRequest[]) {
    applyStorageUpdate('material_requests', STORAGE_KEYS.MATERIAL_REQUESTS, data);
  },

  getTasks(): CleaningTask[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      return INITIAL_TASKS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveTasks(data: CleaningTask[]) {
    applyStorageUpdate('tasks', STORAGE_KEYS.TASKS, data);
  },

  getBlasts(): BlastAnnouncement[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BLASTS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.BLASTS, INITIAL_BLASTS);
      return INITIAL_BLASTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveBlasts(data: BlastAnnouncement[]) {
    applyStorageUpdate('blasts', STORAGE_KEYS.BLASTS, data);
  },

  getSops(): SopDocument[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SOPS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.SOPS, INITIAL_SOPS);
      return INITIAL_SOPS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveSops(data: SopDocument[]) {
    applyStorageUpdate('sops', STORAGE_KEYS.SOPS, data);
  },

  getUsers(): UserAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      initStorageQuietly(STORAGE_KEYS.USERS, INITIAL_USERS);
      return INITIAL_USERS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(data: UserAccount[]) {
    applyStorageUpdate('users', STORAGE_KEYS.USERS, data);
  },

  getActiveUser(): UserAccount | null {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveActiveUser(user: UserAccount | null) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    }
  },

  clearActiveUser() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
  },

  resetToDefault() {
    this.clearAllDataToEmpty();
  },

  // Finance Storage Handlers
  getChartOfAccounts(): ChartOfAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHART_OF_ACCOUNTS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.CHART_OF_ACCOUNTS, INITIAL_CHART_OF_ACCOUNTS);
      return INITIAL_CHART_OF_ACCOUNTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_CHART_OF_ACCOUNTS;
    } catch {
      return INITIAL_CHART_OF_ACCOUNTS;
    }
  },

  saveChartOfAccounts(data: ChartOfAccount[]) {
    applyStorageUpdate('chart_of_accounts', STORAGE_KEYS.CHART_OF_ACCOUNTS, data);
  },

  resetCoaBalancesToZero(): ChartOfAccount[] {
    const currentAccounts = this.getChartOfAccounts();
    const zeroed = currentAccounts.map((acc) => ({
      ...acc,
      initialBalance: 0,
      currentBalance: 0
    }));
    this.saveChartOfAccounts(zeroed);
    return zeroed;
  },

  updateAccountBalance(accountCode: string, newBalance: number): ChartOfAccount[] {
    const currentAccounts = this.getChartOfAccounts();
    const updated = currentAccounts.map((acc) => {
      if (acc.code === accountCode) {
        return {
          ...acc,
          initialBalance: newBalance,
          currentBalance: newBalance
        };
      }
      return acc;
    });
    this.saveChartOfAccounts(updated);
    return updated;
  },

  getFinanceTransactions(): FinanceTransaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FINANCE_TRANSACTIONS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.FINANCE_TRANSACTIONS, INITIAL_FINANCE_TRANSACTIONS);
      return INITIAL_FINANCE_TRANSACTIONS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveFinanceTransactions(data: FinanceTransaction[]) {
    applyStorageUpdate('finance_transactions', STORAGE_KEYS.FINANCE_TRANSACTIONS, data);
  },

  getBankStatements(): BankStatementImport[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BANK_STATEMENTS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.BANK_STATEMENTS, INITIAL_BANK_STATEMENTS);
      return INITIAL_BANK_STATEMENTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveBankStatements(data: BankStatementImport[]) {
    applyStorageUpdate('bank_statements', STORAGE_KEYS.BANK_STATEMENTS, data);
  },

  getPeriodClosings(): PeriodClosing[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PERIOD_CLOSINGS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.PERIOD_CLOSINGS, INITIAL_PERIOD_CLOSINGS);
      return INITIAL_PERIOD_CLOSINGS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  savePeriodClosings(data: PeriodClosing[]) {
    applyStorageUpdate('period_closings', STORAGE_KEYS.PERIOD_CLOSINGS, data);
  },

  getAuditTrails(): AuditTrailItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_TRAILS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.AUDIT_TRAILS, INITIAL_AUDIT_TRAILS);
      return INITIAL_AUDIT_TRAILS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveAuditTrails(data: AuditTrailItem[]) {
    applyStorageUpdate('audit_trails', STORAGE_KEYS.AUDIT_TRAILS, data);
  },

  addAuditTrail(item: AuditTrailItem) {
    const list = this.getAuditTrails();
    this.saveAuditTrails([item, ...list].slice(0, 500));
  },

  getCurrencyRates(): CurrencyRate[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENCY_RATES);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.CURRENCY_RATES, INITIAL_CURRENCY_RATES);
      return INITIAL_CURRENCY_RATES;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_CURRENCY_RATES;
    } catch {
      return INITIAL_CURRENCY_RATES;
    }
  },

  saveCurrencyRates(data: CurrencyRate[]) {
    applyStorageUpdate('currency_rates', STORAGE_KEYS.CURRENCY_RATES, data);
  },

  // -------------------------------------------------------------------------
  // DEBTS (HUTANG USAHA & OPERASIONAL)
  // -------------------------------------------------------------------------
  getDebts(): DebtRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DEBTS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.DEBTS, []);
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Bersihkan data dummy/demo awal agar data mencerminkan data aktual 0 bila belum ada input hutang riil
      const cleaned = parsed.filter((d: any) => {
        if (!d || !d.id) return false;
        const id = String(d.id || '');
        const code = String(d.code || '');
        if (/^debt-00[0-9]$/.test(id) || id.startsWith('HUT-INV-') || /^HUT-2026-08-00[0-9]$/.test(id) || /^HUT-2026-08-00[0-9]$/.test(code)) {
          return false;
        }
        if (typeof d.creditorName === 'string' && (d.creditorName.includes('Diversey') || d.creditorName.includes('Karcher') || d.creditorName.includes('Mitra Seragam') || d.creditorName.includes('KMK'))) {
          return false;
        }
        return true;
      });
      if (cleaned.length !== parsed.length) {
        this.saveDebts(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveDebts(data: DebtRecord[]) {
    applyStorageUpdate('debts', STORAGE_KEYS.DEBTS, data);
  },

  // -------------------------------------------------------------------------
  // RECEIVABLES (PIUTANG USAHA & KONTRAK KLIEN)
  // -------------------------------------------------------------------------
  getReceivables(): ReceivableRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIVABLES);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.RECEIVABLES, []);
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Bersihkan data dummy/demo awal agar data mencerminkan data aktual 0 bila belum ada piutang tertagih
      const cleaned = parsed.filter((r: any) => {
        if (!r || !r.id) return false;
        const id = String(r.id || '');
        const code = String(r.code || '');
        if (/^rec-00[0-9]$/.test(id) || /^PIU-2026-08-00[0-9]$/.test(id) || /^PIU-2026-08-00[0-9]$/.test(code)) {
          return false;
        }
        if (typeof r.customerName === 'string' && (r.customerName.includes('Pakuwon') || r.customerName.includes('Medika') || r.customerName.includes('Menara Bintang') || r.customerName.includes('Senopati'))) {
          return false;
        }
        return true;
      });
      if (cleaned.length !== parsed.length) {
        this.saveReceivables(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveReceivables(data: ReceivableRecord[]) {
    applyStorageUpdate('receivables', STORAGE_KEYS.RECEIVABLES, data);
  },

  // -------------------------------------------------------------------------
  // INVESTMENTS (INVESTASI & BAGI HASIL INVESTOR)
  // -------------------------------------------------------------------------
  getInvestments(): InvestmentRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
    if (raw === null) {
      initStorageQuietly(STORAGE_KEYS.INVESTMENTS, INITIAL_INVESTMENTS);
      return INITIAL_INVESTMENTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveInvestments(data: InvestmentRecord[]) {
    applyStorageUpdate('investments', STORAGE_KEYS.INVESTMENTS, data);
  },

  // -------------------------------------------------------------------------
  // SYSTEM RESET & BULK DELETE PER DIVISI (KHUSUS SUPER ADMIN)
  // -------------------------------------------------------------------------
  // 1. Hapus Data Masal Divisi Keuangan & Akuntansi
  clearFinanceData() {
    this.saveFinanceTransactions([]);
    this.saveBankStatements([]);
    this.saveDebts([]);
    this.saveReceivables([]);
    this.saveInvestments([]);
    this.savePeriodClosings([]);
    this.saveAuditTrails([]);

    // Reset saldo akun-akun COA menjadi Rp 0
    const resetAccounts = (this.getChartOfAccounts() || INITIAL_CHART_OF_ACCOUNTS).map((acc) => ({
      ...acc,
      initialBalance: 0,
      currentBalance: 0
    }));
    this.saveChartOfAccounts(resetAccounts);

    try {
      window.dispatchEvent(new Event('app_data_reset'));
    } catch {
      // ignore
    }
  },

  // 2. Hapus Data Masal Divisi HRD & Ketenagakerjaan
  clearHrmData() {
    this.saveEmployees([]);
    this.saveTimesheets([]);
    this.saveMutations([]);
    this.saveSops([]);

    try {
      window.dispatchEvent(new Event('app_data_reset'));
    } catch {
      // ignore
    }
  },

  // 3. Hapus Data Masal Divisi Operasional & Lapangan
  clearOperationsData() {
    this.saveProjects([]);
    this.saveInventoryItems([]);
    this.saveProjectStocks([]);
    this.saveInventoryLogs([]);
    this.saveMaterialRequests([]);
    this.saveTasks([]);

    try {
      window.dispatchEvent(new Event('app_data_reset'));
    } catch {
      // ignore
    }
  },

  // 4. Hapus Data Masal Divisi Komunikasi & Broadcast
  clearBlastData() {
    this.saveBlasts([]);

    try {
      window.dispatchEvent(new Event('app_data_reset'));
    } catch {
      // ignore
    }
  },

  // KOSONGKAN SELURUH DATA SISTEM (SEMUA DIVISI - 0 DATA BERSIH TOTAL)
  clearAllDataToEmpty() {
    this.saveProjects([]);
    this.saveEmployees([]);
    this.saveTimesheets([]);
    this.saveMutations([]);
    this.saveInventoryItems([]);
    this.saveProjectStocks([]);
    this.saveInventoryLogs([]);
    this.saveMaterialRequests([]);
    this.saveTasks([]);
    this.saveBlasts([]);
    this.saveSops([]);
    this.saveFinanceTransactions([]);
    this.saveBankStatements([]);
    this.savePeriodClosings([]);
    this.saveAuditTrails([]);
    this.saveDebts([]);
    this.saveReceivables([]);
    this.saveInvestments([]);

    // Pertahankan struktur Chart of Accounts baku dengan saldo Rp 0
    const resetAccounts = INITIAL_CHART_OF_ACCOUNTS.map((acc) => ({
      ...acc,
      initialBalance: 0,
      currentBalance: 0
    }));
    this.saveChartOfAccounts(resetAccounts);
    this.saveCurrencyRates(INITIAL_CURRENCY_RATES);

    // Pertahankan sesi akun Super Admin agar tidak ter-logout
    const active = this.getActiveUser();
    const adminUser: UserAccount = active || INITIAL_USERS[0];
    this.saveUsers([adminUser]);
    this.saveActiveUser(adminUser);

    try {
      window.dispatchEvent(new Event('app_data_reset'));
    } catch {
      // ignore
    }
  },

  // ISI ULANG DENGAN DATA CONTOH / DEMO
  resetAllDataToDefault() {
    this.saveProjects(INITIAL_PROJECTS);
    this.saveEmployees(INITIAL_EMPLOYEES);
    this.saveTimesheets(generateSeedTimesheets(INITIAL_EMPLOYEES));
    this.saveMutations(INITIAL_MUTATIONS);
    this.saveInventoryItems(INITIAL_INVENTORY_ITEMS);
    this.saveProjectStocks(INITIAL_PROJECT_STOCKS);
    this.saveInventoryLogs(INITIAL_INVENTORY_LOGS);
    this.saveTasks(INITIAL_TASKS);
    this.saveBlasts(INITIAL_BLASTS);
    this.saveSops(INITIAL_SOPS);
    this.saveCompanyProfile(INITIAL_COMPANY_PROFILE);
    this.saveUsers(INITIAL_USERS);
    this.saveChartOfAccounts(INITIAL_CHART_OF_ACCOUNTS);
    this.saveFinanceTransactions(INITIAL_FINANCE_TRANSACTIONS);
    this.saveBankStatements(INITIAL_BANK_STATEMENTS);
    this.savePeriodClosings(INITIAL_PERIOD_CLOSINGS);
    this.saveAuditTrails(INITIAL_AUDIT_TRAILS);
    this.saveCurrencyRates(INITIAL_CURRENCY_RATES);
    this.saveDebts([]);
    this.saveReceivables([]);
    this.saveInvestments(INITIAL_INVESTMENTS);

    // Keep active user or reset to superadmin
    try {
      window.dispatchEvent(new Event('app_data_reset'));
    } catch {
      // ignore
    }
  },

  // ----------------------------------------------------
  // DASHBOARD WIDGETS CONFIGURATION
  // ----------------------------------------------------
  getDefaultDashboardWidgets(): DashboardWidgetsState {
    return {
      banner: true,
      critical_alerts: true,
      stat_employees: true,
      stat_attendance: true,
      stat_inventory: true,
      stat_payroll: true,
      liquidity_accounts: true,
      comparative_payroll: true,
      comparative_manpower: true,
      tasks_board: true,
      blasts_announcements: true
    };
  },

  getDashboardWidgets(): DashboardWidgetsState {
    const raw = localStorage.getItem(STORAGE_KEYS.DASHBOARD_WIDGETS);
    const defaults = this.getDefaultDashboardWidgets();
    if (!raw) return defaults;
    try {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  },

  saveDashboardWidgets(widgets: DashboardWidgetsState): DashboardWidgetsState {
    localStorage.setItem(STORAGE_KEYS.DASHBOARD_WIDGETS, JSON.stringify(widgets));
    try {
      window.dispatchEvent(new CustomEvent('dashboard_widgets_updated', { detail: widgets }));
    } catch {
      // ignore
    }
    return widgets;
  },

  resetDashboardWidgets(): DashboardWidgetsState {
    const defaults = this.getDefaultDashboardWidgets();
    return this.saveDashboardWidgets(defaults);
  },

  saveRemoteState(key: StorageActionType, data: any) {
    const keyMap: Record<StorageActionType, string> = {
      company_profile: STORAGE_KEYS.COMPANY_PROFILE,
      projects: STORAGE_KEYS.PROJECTS,
      employees: STORAGE_KEYS.EMPLOYEES,
      timesheets: STORAGE_KEYS.TIMESHEETS,
      mutations: STORAGE_KEYS.MUTATIONS,
      inventory_items: STORAGE_KEYS.INVENTORY_ITEMS,
      project_stocks: STORAGE_KEYS.PROJECT_STOCKS,
      inventory_logs: STORAGE_KEYS.INVENTORY_LOGS,
      material_requests: STORAGE_KEYS.MATERIAL_REQUESTS,
      tasks: STORAGE_KEYS.TASKS,
      blasts: STORAGE_KEYS.BLASTS,
      sops: STORAGE_KEYS.SOPS,
      users: STORAGE_KEYS.USERS,
      chart_of_accounts: STORAGE_KEYS.CHART_OF_ACCOUNTS,
      finance_transactions: STORAGE_KEYS.FINANCE_TRANSACTIONS,
      bank_statements: STORAGE_KEYS.BANK_STATEMENTS,
      period_closings: STORAGE_KEYS.PERIOD_CLOSINGS,
      audit_trails: STORAGE_KEYS.AUDIT_TRAILS,
      currency_rates: STORAGE_KEYS.CURRENCY_RATES,
      debts: STORAGE_KEYS.DEBTS,
      receivables: STORAGE_KEYS.RECEIVABLES,
      investments: STORAGE_KEYS.INVESTMENTS
    };
    const storageKey = keyMap[key];
    if (storageKey) {
      applyStorageUpdate(
        key,
        storageKey,
        data,
        key === 'company_profile' ? 'company_profile_updated' : undefined,
        'remote_sync'
      );
    }
  },

  registerStorageMiddleware(middleware: StorageMiddleware) {
    return registerStorageMiddleware(middleware);
  }
};
