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
  ClientContract,
  ClientInvoice,
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
  INITIAL_INVESTMENTS,
  INITIAL_CLIENT_CONTRACTS,
  INITIAL_CLIENT_INVOICES
} from '../data/initialFinanceData';

export interface TimesheetCutoffSettings {
  isCutoffMode: boolean;
  startDay: number;
  startMonth: number;
  startYear: number;
  endDay: number;
  endMonth: number;
  endYear: number;
  calendarMonth: number;
  calendarYear: number;
}

export const DEFAULT_CUTOFF_SETTINGS: TimesheetCutoffSettings = {
  isCutoffMode: true,
  startDay: 21,
  startMonth: 8,
  startYear: 2026,
  endDay: 20,
  endMonth: 9,
  endYear: 2026,
  calendarMonth: 8,
  calendarYear: 2026
};

import { STORAGE_KEYS, DATA_KEY_REGISTRY, validateDataRegistry } from './dataRegistry';
export { STORAGE_KEYS, DATA_KEY_REGISTRY, validateDataRegistry };

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
  | 'investments'
  | 'client_contracts'
  | 'client_invoices';

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
  investments: STORAGE_KEYS.INVESTMENTS,
  client_contracts: STORAGE_KEYS.CLIENT_CONTRACTS,
  client_invoices: STORAGE_KEYS.CLIENT_INVOICES
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

// =============================================================================
// PERSISTENT OUTBOX (Tracks unconfirmed local user changes)
// =============================================================================
export interface OutboxEntry {
  key: StorageActionType;
  data: any;
  timestamp: string;
  userId?: string;
  userName?: string;
}

const OUTBOX_STORAGE_KEY = 'rajawali_sync_outbox';

export const outboxService = {
  getEntries(): Record<string, OutboxEntry> {
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  addEntry(key: StorageActionType, data: any, user?: { id?: string; name?: string } | null) {
    try {
      const outbox = this.getEntries();
      outbox[key] = {
        key,
        data,
        timestamp: new Date().toISOString(),
        userId: user?.id,
        userName: user?.name
      };
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
    } catch (err) {
      console.warn('[Outbox] Failed to add entry:', err);
    }
  },

  removeEntry(key: string, timestamp?: string) {
    try {
      const outbox = this.getEntries();
      if (outbox[key]) {
        if (!timestamp || new Date(outbox[key].timestamp).getTime() <= new Date(timestamp).getTime()) {
          delete outbox[key];
          localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
        }
      }
    } catch (err) {
      console.warn('[Outbox] Failed to remove entry:', err);
    }
  },

  hasPending(key: string): boolean {
    const outbox = this.getEntries();
    return Boolean(outbox[key]);
  },

  getPending(key: string): OutboxEntry | undefined {
    const outbox = this.getEntries();
    return outbox[key];
  }
};

// =============================================================================
// RECORD METADATA & SOFT DELETE HELPERS
// =============================================================================
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
}

/**
 * Deterministically derives or preserves a record's unique identity.
 * Rule:
 * - If item already has a valid id, it is NEVER changed (set once, immutable).
 * - For chart_of_accounts (11 records) and currency_rates (3 records): id = value of field "code" (e.g. id "1110", id "USD").
 * - Other collections keep their existing id.
 * - Truly new records created by user can use UUID.
 */
export function getDeterministicRecordId<T extends Record<string, any>>(item: T, collectionKey?: string): string {
  if (item && item.id !== undefined && item.id !== null && String(item.id).trim().length > 0) {
    return String(item.id).trim();
  }

  // Specifically for chart_of_accounts or currency_rates when id is missing
  if (
    collectionKey === 'chart_of_accounts' ||
    collectionKey === 'rajawali_finance_coa' ||
    collectionKey === 'currency_rates' ||
    collectionKey === 'rajawali_finance_currency_rates' ||
    (item && (item.category === 'Kas & Bank' || item.type === 'Asset' || item.type === 'Liability' || item.type === 'Equity' || item.type === 'Revenue' || item.type === 'Expense')) ||
    (item && (item.code === 'IDR' || item.code === 'USD' || item.code === 'SGD'))
  ) {
    if (item && item.code !== undefined && item.code !== null && String(item.code).trim().length > 0) {
      return String(item.code).trim();
    }
  }

  // Fallback if item has a natural code field
  if (item && item.code !== undefined && item.code !== null && String(item.code).trim().length > 0) {
    return String(item.code).trim();
  }

  return generateUUID();
}

export function ensureRecordMetadata<T extends Record<string, any>>(
  item: T,
  forceUpdate = false,
  collectionKey?: string
): T & { id: string; updatedAt: string } {
  if (!item || typeof item !== 'object') return item as any;
  const now = new Date().toISOString();
  const id = getDeterministicRecordId(item, collectionKey);
  const updatedAt = forceUpdate ? now : item.updatedAt || item.createdAt || now;
  return {
    ...item,
    id,
    updatedAt
  };
}

function readProcessedRecords<T extends Record<string, any>>(rawArray: any[], collectionKey?: string): T[] {
  if (!Array.isArray(rawArray)) return [];
  return rawArray
    .filter((r) => r && typeof r === 'object' && !r.deletedAt)
    .map((r) => ensureRecordMetadata(r, false, collectionKey) as T);
}

function writeProcessedRecords<T extends Record<string, any>>(
  storageKey: string,
  incomingRecords: T[],
  collectionKey?: string
): any[] {
  if (!Array.isArray(incomingRecords)) return [];
  const now = new Date().toISOString();

  let existingRaw: any[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existingRaw = parsed;
    }
  } catch {}

  const incomingProcessed = incomingRecords.map((item) =>
    ensureRecordMetadata(item, true, collectionKey)
  );
  const incomingIds = new Set(incomingProcessed.map((item) => String(item.id)));

  // Soft Delete: Any records present in existing raw storage that are missing in incoming are preserved with deletedAt.
  // Rule 3: Soft delete (deletedAt) hanya diberikan saat user benar-benar menghapus record.
  // Jangan pernah menandai record dengan deletedAt karena id tidak cocok atau tidak ditemukan saat merge.
  const preservedDeleted: any[] = [];
  for (const old of existingRaw) {
    if (old && typeof old === 'object') {
      const oldId = getDeterministicRecordId(old, collectionKey);
      if (!incomingIds.has(oldId)) {
        if (old.deletedAt) {
          preservedDeleted.push({
            ...old,
            id: oldId,
            deletedAt: old.deletedAt,
            updatedAt: old.updatedAt || now
          });
        } else if (incomingRecords.length > 0) {
          // Explicit user deletion: incoming list is non-empty and missing this item
          preservedDeleted.push({
            ...old,
            id: oldId,
            deletedAt: now,
            updatedAt: now
          });
        }
      }
    }
  }

  return [...incomingProcessed, ...preservedDeleted];
}

function readStorageRecords<T extends Record<string, any>>(
  storageKey: string,
  defaultData: T[] = [],
  collectionKey?: string
): T[] {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) {
    if (defaultData && defaultData.length > 0) {
      const seeded = defaultData.map((d) => ensureRecordMetadata(d, false, collectionKey));
      initStorageQuietly(storageKey, seeded);
      return readProcessedRecords<T>(seeded, collectionKey);
    }
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Auto-recovery for chart_of_accounts or currency_rates if stored as "[]" from earlier merge bug
    if (
      parsed.length === 0 &&
      defaultData.length > 0 &&
      (storageKey === STORAGE_KEYS.CHART_OF_ACCOUNTS || storageKey === STORAGE_KEYS.CURRENCY_RATES)
    ) {
      console.warn(`[Storage] Auto-recovering empty collection for ${storageKey} from default data.`);
      const seeded = defaultData.map((d) => ensureRecordMetadata(d, false, collectionKey));
      initStorageQuietly(storageKey, seeded);
      return readProcessedRecords<T>(seeded, collectionKey);
    }
    return readProcessedRecords<T>(parsed, collectionKey);
  } catch {
    return [];
  }
}

function writeStorageRecords<T extends Record<string, any>>(
  actionKey: StorageActionType,
  storageKey: string,
  incomingData: T[],
  customEvent?: string
): void {
  // Guard Rule 2b: JANGAN PERNAH menulis array kosong ke localStorage bila salah satu sisi tidak kosong
  let existingCount = 0;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existingCount = parsed.length;
    }
  } catch {}

  if (
    Array.isArray(incomingData) &&
    incomingData.length === 0 &&
    existingCount > 0 &&
    (actionKey === 'chart_of_accounts' || actionKey === 'currency_rates')
  ) {
    console.warn(`[Storage Guard] Attempted to write empty array to ${storageKey} while ${existingCount} items exist. Aborted.`);
    return;
  }

  const fullData = writeProcessedRecords<T>(storageKey, incomingData, actionKey);
  applyStorageUpdate(actionKey, storageKey, fullData, customEvent, 'user_action');
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
  // Track in persistent outbox if this change was triggered by local user action
  if (source === 'user_action') {
    const activeUser = storageService.getActiveUser();
    outboxService.addEntry(actionKey, data, activeUser);
  }

  // 1. Instant local persistence
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Storage] LocalStorage write failed for ${storageKey}:`, err);
  }

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
    return readStorageRecords<Project>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
  },

  saveProjects(data: Project[]) {
    writeStorageRecords('projects', STORAGE_KEYS.PROJECTS, data);
  },

  getEmployees(): Employee[] {
    return readStorageRecords<Employee>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  },

  saveEmployees(data: Employee[]) {
    writeStorageRecords('employees', STORAGE_KEYS.EMPLOYEES, data);
  },

  getTimesheets(): TimesheetMonthRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMESHEETS);
    if (raw === null) {
      const emps = this.getEmployees();
      const initialTS = generateSeedTimesheets(emps);
      initStorageQuietly(STORAGE_KEYS.TIMESHEETS, initialTS);
      return readProcessedRecords<TimesheetMonthRecord>(initialTS);
    }
    return readStorageRecords<TimesheetMonthRecord>(STORAGE_KEYS.TIMESHEETS, []);
  },

  saveTimesheets(data: TimesheetMonthRecord[]) {
    writeStorageRecords('timesheets', STORAGE_KEYS.TIMESHEETS, data);
  },

  getTimesheetCutoffSettings(): TimesheetCutoffSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMESHEET_CUTOFF);
    if (!raw) {
      initStorageQuietly(STORAGE_KEYS.TIMESHEET_CUTOFF, DEFAULT_CUTOFF_SETTINGS);
      return DEFAULT_CUTOFF_SETTINGS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_CUTOFF_SETTINGS, ...parsed };
      }
      return DEFAULT_CUTOFF_SETTINGS;
    } catch {
      return DEFAULT_CUTOFF_SETTINGS;
    }
  },

  saveTimesheetCutoffSettings(settings: TimesheetCutoffSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMESHEET_CUTOFF, JSON.stringify(settings));
      window.dispatchEvent(
        new CustomEvent('timesheet_cutoff_updated', {
          detail: settings
        })
      );
    } catch {
      // ignore
    }
  },

  getMutations(): MutationHistory[] {
    return readStorageRecords<MutationHistory>(STORAGE_KEYS.MUTATIONS, INITIAL_MUTATIONS);
  },

  saveMutations(data: MutationHistory[]) {
    writeStorageRecords('mutations', STORAGE_KEYS.MUTATIONS, data);
  },

  getInventoryItems(): InventoryItem[] {
    return readStorageRecords<InventoryItem>(STORAGE_KEYS.INVENTORY_ITEMS, INITIAL_INVENTORY_ITEMS);
  },

  saveInventoryItems(data: InventoryItem[]) {
    writeStorageRecords('inventory_items', STORAGE_KEYS.INVENTORY_ITEMS, data);
  },

  getProjectStocks(): ProjectStock[] {
    return readStorageRecords<ProjectStock>(STORAGE_KEYS.PROJECT_STOCKS, INITIAL_PROJECT_STOCKS);
  },

  saveProjectStocks(data: ProjectStock[]) {
    writeStorageRecords('project_stocks', STORAGE_KEYS.PROJECT_STOCKS, data);
  },

  getInventoryLogs(): InventoryLog[] {
    return readStorageRecords<InventoryLog>(STORAGE_KEYS.INVENTORY_LOGS, INITIAL_INVENTORY_LOGS);
  },

  saveInventoryLogs(data: InventoryLog[]) {
    writeStorageRecords('inventory_logs', STORAGE_KEYS.INVENTORY_LOGS, data);
  },

  getMaterialRequests(): MaterialRequest[] {
    return readStorageRecords<MaterialRequest>(STORAGE_KEYS.MATERIAL_REQUESTS, INITIAL_MATERIAL_REQUESTS);
  },

  saveMaterialRequests(data: MaterialRequest[]) {
    writeStorageRecords('material_requests', STORAGE_KEYS.MATERIAL_REQUESTS, data);
  },

  getTasks(): CleaningTask[] {
    return readStorageRecords<CleaningTask>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
  },

  saveTasks(data: CleaningTask[]) {
    writeStorageRecords('tasks', STORAGE_KEYS.TASKS, data);
  },

  getBlasts(): BlastAnnouncement[] {
    return readStorageRecords<BlastAnnouncement>(STORAGE_KEYS.BLASTS, INITIAL_BLASTS);
  },

  saveBlasts(data: BlastAnnouncement[]) {
    writeStorageRecords('blasts', STORAGE_KEYS.BLASTS, data);
  },

  getSops(): SopDocument[] {
    return readStorageRecords<SopDocument>(STORAGE_KEYS.SOPS, INITIAL_SOPS);
  },

  saveSops(data: SopDocument[]) {
    writeStorageRecords('sops', STORAGE_KEYS.SOPS, data);
  },

  getUsers(): UserAccount[] {
    return readStorageRecords<UserAccount>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  saveUsers(data: UserAccount[]) {
    writeStorageRecords('users', STORAGE_KEYS.USERS, data);
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
    return readStorageRecords<ChartOfAccount>(
      STORAGE_KEYS.CHART_OF_ACCOUNTS,
      INITIAL_CHART_OF_ACCOUNTS,
      'chart_of_accounts'
    );
  },

  saveChartOfAccounts(data: ChartOfAccount[]) {
    writeStorageRecords('chart_of_accounts', STORAGE_KEYS.CHART_OF_ACCOUNTS, data);
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
    return readStorageRecords<FinanceTransaction>(STORAGE_KEYS.FINANCE_TRANSACTIONS, INITIAL_FINANCE_TRANSACTIONS);
  },

  saveFinanceTransactions(data: FinanceTransaction[]) {
    writeStorageRecords('finance_transactions', STORAGE_KEYS.FINANCE_TRANSACTIONS, data);
  },

  getBankStatements(): BankStatementImport[] {
    return readStorageRecords<BankStatementImport>(STORAGE_KEYS.BANK_STATEMENTS, INITIAL_BANK_STATEMENTS);
  },

  saveBankStatements(data: BankStatementImport[]) {
    writeStorageRecords('bank_statements', STORAGE_KEYS.BANK_STATEMENTS, data);
  },

  getPeriodClosings(): PeriodClosing[] {
    return readStorageRecords<PeriodClosing>(STORAGE_KEYS.PERIOD_CLOSINGS, INITIAL_PERIOD_CLOSINGS);
  },

  savePeriodClosings(data: PeriodClosing[]) {
    writeStorageRecords('period_closings', STORAGE_KEYS.PERIOD_CLOSINGS, data);
  },

  getAuditTrails(): AuditTrailItem[] {
    return readStorageRecords<AuditTrailItem>(STORAGE_KEYS.AUDIT_TRAILS, INITIAL_AUDIT_TRAILS);
  },

  saveAuditTrails(data: AuditTrailItem[]) {
    writeStorageRecords('audit_trails', STORAGE_KEYS.AUDIT_TRAILS, data);
  },

  addAuditTrail(item: AuditTrailItem) {
    const list = this.getAuditTrails();
    this.saveAuditTrails([item, ...list].slice(0, 500));
  },

  getCurrencyRates(): CurrencyRate[] {
    return readStorageRecords<CurrencyRate>(
      STORAGE_KEYS.CURRENCY_RATES,
      INITIAL_CURRENCY_RATES,
      'currency_rates'
    );
  },

  saveCurrencyRates(data: CurrencyRate[]) {
    writeStorageRecords('currency_rates', STORAGE_KEYS.CURRENCY_RATES, data);
  },

  // -------------------------------------------------------------------------
  // DEBTS (HUTANG USAHA & OPERASIONAL)
  // -------------------------------------------------------------------------
  getDebts(): DebtRecord[] {
    return readStorageRecords<DebtRecord>(STORAGE_KEYS.DEBTS, []);
  },

  saveDebts(data: DebtRecord[]) {
    writeStorageRecords('debts', STORAGE_KEYS.DEBTS, data);
  },

  // -------------------------------------------------------------------------
  // RECEIVABLES (PIUTANG USAHA & KONTRAK KLIEN)
  // -------------------------------------------------------------------------
  getReceivables(): ReceivableRecord[] {
    return readStorageRecords<ReceivableRecord>(STORAGE_KEYS.RECEIVABLES, []);
  },

  saveReceivables(data: ReceivableRecord[]) {
    writeStorageRecords('receivables', STORAGE_KEYS.RECEIVABLES, data);
  },

  // -------------------------------------------------------------------------
  // INVESTMENTS (INVESTASI & BAGI HASIL INVESTOR)
  // -------------------------------------------------------------------------
  getInvestments(): InvestmentRecord[] {
    return readStorageRecords<InvestmentRecord>(STORAGE_KEYS.INVESTMENTS, INITIAL_INVESTMENTS);
  },

  saveInvestments(data: InvestmentRecord[]) {
    writeStorageRecords('investments', STORAGE_KEYS.INVESTMENTS, data);
  },

  // -------------------------------------------------------------------------
  // CLIENT CONTRACTS (KONTRAK KERJASAMA KLIEN)
  // -------------------------------------------------------------------------
  getClientContracts(): ClientContract[] {
    return readStorageRecords<ClientContract>(STORAGE_KEYS.CLIENT_CONTRACTS, INITIAL_CLIENT_CONTRACTS);
  },

  saveClientContracts(data: ClientContract[]) {
    writeStorageRecords('client_contracts', STORAGE_KEYS.CLIENT_CONTRACTS, data);
  },

  // -------------------------------------------------------------------------
  // CLIENT INVOICES (INVOICE BULANAN & PEKERJAAN EKSTRA)
  // -------------------------------------------------------------------------
  getClientInvoices(): ClientInvoice[] {
    return readStorageRecords<ClientInvoice>(STORAGE_KEYS.CLIENT_INVOICES, INITIAL_CLIENT_INVOICES);
  },

  saveClientInvoices(data: ClientInvoice[]) {
    writeStorageRecords('client_invoices', STORAGE_KEYS.CLIENT_INVOICES, data);
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
    this.saveClientContracts([]);
    this.saveClientInvoices([]);
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

  saveRemoteState(key: StorageActionType, remoteData: any) {
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
      investments: STORAGE_KEYS.INVESTMENTS,
      client_contracts: STORAGE_KEYS.CLIENT_CONTRACTS,
      client_invoices: STORAGE_KEYS.CLIENT_INVOICES
    };
    const storageKey = keyMap[key];
    if (storageKey) {
      let localRaw: any = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) localRaw = JSON.parse(raw);
      } catch {}

      let mergedData = remoteData;

      if (Array.isArray(remoteData)) {
        const localArray: any[] = Array.isArray(localRaw) ? localRaw : [];

        // Rule 2c: Jika lokal berisi "[]" atau kosong sedangkan remote berisi data, pakai data remote (pulihkan otomatis)
        if (localArray.length === 0 && remoteData.length > 0) {
          mergedData = remoteData.map((item) => ensureRecordMetadata(item, false, key));
        } else if (remoteData.length === 0 && localArray.length > 0) {
          console.warn(`[Sync Guard] Remote state for ${key} is empty while local has ${localArray.length} records. Preserving local data.`);
          mergedData = localArray.map((item) => ensureRecordMetadata(item, false, key));
        } else {
          const pendingEntry = outboxService.getPending(key);
          const pendingIds = new Set<string>();
          if (pendingEntry && Array.isArray(pendingEntry.data)) {
            for (const item of pendingEntry.data) {
              if (item) {
                const id = getDeterministicRecordId(item, key);
                if (id) pendingIds.add(id);
              }
            }
          }

          const map = new Map<string, any>();

          // 1. Put local items (using deterministic id so records without id are NEVER skipped)
          for (let i = 0; i < localArray.length; i++) {
            const rawItem = localArray[i];
            if (!rawItem || typeof rawItem !== 'object') continue;
            const item = ensureRecordMetadata(rawItem, false, key);
            const id = String(item.id);
            map.set(id, item);
          }

          // 2. Merge remote items (using deterministic id so records without id are NEVER skipped)
          for (let j = 0; j < remoteData.length; j++) {
            const rawRemote = remoteData[j];
            if (!rawRemote || typeof rawRemote !== 'object') continue;
            const remoteItem = ensureRecordMetadata(rawRemote, false, key);
            const id = String(remoteItem.id);
            const localItem = map.get(id);

            if (!localItem) {
              map.set(id, remoteItem);
            } else {
              // If local item is in outbox (pending unsent change by user), preserve local item
              if (pendingIds.has(id)) {
                map.set(id, localItem);
              } else {
                const localUpdated = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
                const remoteUpdated = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;

                if (!remoteItem.updatedAt || remoteUpdated >= localUpdated) {
                  map.set(id, remoteItem);
                } else {
                  map.set(id, localItem);
                }
              }
            }
          }

          mergedData = Array.from(map.values());
        }

        // Rule 2b: JANGAN PERNAH menulis array kosong ke localStorage bila salah satu sisi (lokal atau remote) tidak kosong.
        // Jika hasil merge kosong padahal ada input tidak kosong: batalkan, pertahankan data yang ada, dan tulis log peringatan.
        if (mergedData.length === 0 && (localArray.length > 0 || remoteData.length > 0)) {
          console.warn(
            `[Sync Guard] ABORT: Merge result for ${key} produced 0 records while local (${localArray.length}) or remote (${remoteData.length}) is not empty. Aborting merge and keeping existing data.`
          );
          return;
        }
      } else if (remoteData && typeof remoteData === 'object' && !Array.isArray(remoteData)) {
        const localObj = localRaw && typeof localRaw === 'object' && !Array.isArray(localRaw) ? localRaw : {};
        mergedData = { ...localObj, ...remoteData };
      }

      applyStorageUpdate(
        key,
        storageKey,
        mergedData,
        key === 'company_profile' ? 'company_profile_updated' : undefined,
        'remote_sync'
      );
    }
  },

  registerStorageMiddleware(middleware: StorageMiddleware) {
    return registerStorageMiddleware(middleware);
  }
};
