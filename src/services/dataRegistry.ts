/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Registri Terpusat Definisi Kunci Unik & Protokol Penyimpanan Data
 * PT Rajawali Cycle Indonesia
 */

export const STORAGE_KEYS = {
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
  CLIENT_CONTRACTS: 'rajawali_client_contracts',
  CLIENT_INVOICES: 'rajawali_client_invoices',
  DASHBOARD_WIDGETS: 'rajawali_dashboard_widgets',
  TIMESHEET_CUTOFF: 'rajawali_timesheet_cutoff_settings'
} as const;

export type StorageKeyConstant = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export interface DataKeyDefinition {
  storageKey: string;
  collectionType: 'record_array' | 'singleton_object' | 'primitive';
  uniqueKeyField: 'id' | 'code' | 'singleton' | 'primitive';
  idStrategy: 'direct_id' | 'deterministic_code' | 'singleton' | 'primitive';
  description: string;
}

export const DATA_KEY_REGISTRY: Record<string, DataKeyDefinition> = {
  [STORAGE_KEYS.COMPANY_PROFILE]: {
    storageKey: STORAGE_KEYS.COMPANY_PROFILE,
    collectionType: 'singleton_object',
    uniqueKeyField: 'singleton',
    idStrategy: 'singleton',
    description: 'Profil dan identitas resmi perusahaan'
  },
  [STORAGE_KEYS.PROJECTS]: {
    storageKey: STORAGE_KEYS.PROJECTS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Daftar lokasi proyek & site operasional'
  },
  [STORAGE_KEYS.EMPLOYEES]: {
    storageKey: STORAGE_KEYS.EMPLOYEES,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Database karyawan & cleaner'
  },
  [STORAGE_KEYS.TIMESHEETS]: {
    storageKey: STORAGE_KEYS.TIMESHEETS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Matriks kehadiran timesheet 1-31 hari'
  },
  [STORAGE_KEYS.MUTATIONS]: {
    storageKey: STORAGE_KEYS.MUTATIONS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Riwayat mutasi penempatan karyawan'
  },
  [STORAGE_KEYS.INVENTORY_ITEMS]: {
    storageKey: STORAGE_KEYS.INVENTORY_ITEMS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Katalog master chemical, peralatan & APD'
  },
  [STORAGE_KEYS.PROJECT_STOCKS]: {
    storageKey: STORAGE_KEYS.PROJECT_STOCKS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Jumlah stok barang di masing-masing lokasi'
  },
  [STORAGE_KEYS.INVENTORY_LOGS]: {
    storageKey: STORAGE_KEYS.INVENTORY_LOGS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Log pemakaian harian & restock barang'
  },
  [STORAGE_KEYS.MATERIAL_REQUESTS]: {
    storageKey: STORAGE_KEYS.MATERIAL_REQUESTS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Pengajuan permintaan barang dari lokasi proyek'
  },
  [STORAGE_KEYS.TASKS]: {
    storageKey: STORAGE_KEYS.TASKS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Papan tugas kebersihan & audit QC'
  },
  [STORAGE_KEYS.BLASTS]: {
    storageKey: STORAGE_KEYS.BLASTS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Pengumuman dan memo internal manajemen'
  },
  [STORAGE_KEYS.SOPS]: {
    storageKey: STORAGE_KEYS.SOPS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Standar Operasional Prosedur (SOP) & K3'
  },
  [STORAGE_KEYS.USERS]: {
    storageKey: STORAGE_KEYS.USERS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Akun pengguna sistem & hak akses'
  },
  [STORAGE_KEYS.ACTIVE_USER]: {
    storageKey: STORAGE_KEYS.ACTIVE_USER,
    collectionType: 'singleton_object',
    uniqueKeyField: 'singleton',
    idStrategy: 'singleton',
    description: 'Sesi akun pengguna yang sedang login'
  },
  [STORAGE_KEYS.SELECTED_PROJECT]: {
    storageKey: STORAGE_KEYS.SELECTED_PROJECT,
    collectionType: 'primitive',
    uniqueKeyField: 'primitive',
    idStrategy: 'primitive',
    description: 'Filter lokasi proyek aktif'
  },
  [STORAGE_KEYS.USER_ROLE]: {
    storageKey: STORAGE_KEYS.USER_ROLE,
    collectionType: 'primitive',
    uniqueKeyField: 'primitive',
    idStrategy: 'primitive',
    description: 'Role aktif pengguna'
  },
  [STORAGE_KEYS.CHART_OF_ACCOUNTS]: {
    storageKey: STORAGE_KEYS.CHART_OF_ACCOUNTS,
    collectionType: 'record_array',
    uniqueKeyField: 'code',
    idStrategy: 'deterministic_code',
    description: 'Bagan Akun Standar (COA PSAK) dengan id = code'
  },
  [STORAGE_KEYS.FINANCE_TRANSACTIONS]: {
    storageKey: STORAGE_KEYS.FINANCE_TRANSACTIONS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Buku kas dan jurnal transaksi keuangan'
  },
  [STORAGE_KEYS.BANK_STATEMENTS]: {
    storageKey: STORAGE_KEYS.BANK_STATEMENTS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Import e-Statement rekening koran bank'
  },
  [STORAGE_KEYS.PERIOD_CLOSINGS]: {
    storageKey: STORAGE_KEYS.PERIOD_CLOSINGS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Catatan penutupan periode akuntansi'
  },
  [STORAGE_KEYS.AUDIT_TRAILS]: {
    storageKey: STORAGE_KEYS.AUDIT_TRAILS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Log jejak audit perubahan data keuangan'
  },
  [STORAGE_KEYS.CURRENCY_RATES]: {
    storageKey: STORAGE_KEYS.CURRENCY_RATES,
    collectionType: 'record_array',
    uniqueKeyField: 'code',
    idStrategy: 'deterministic_code',
    description: 'Master kurs mata uang asing dengan id = code'
  },
  [STORAGE_KEYS.DEBTS]: {
    storageKey: STORAGE_KEYS.DEBTS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Pencatatan kewajiban hutang usaha'
  },
  [STORAGE_KEYS.RECEIVABLES]: {
    storageKey: STORAGE_KEYS.RECEIVABLES,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Pencatatan piutang invoice klien'
  },
  [STORAGE_KEYS.INVESTMENTS]: {
    storageKey: STORAGE_KEYS.INVESTMENTS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Pencatatan investasi modal & bagi hasil'
  },
  [STORAGE_KEYS.CLIENT_CONTRACTS]: {
    storageKey: STORAGE_KEYS.CLIENT_CONTRACTS,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Dokumen kontrak klien jasa kebersihan'
  },
  [STORAGE_KEYS.CLIENT_INVOICES]: {
    storageKey: STORAGE_KEYS.CLIENT_INVOICES,
    collectionType: 'record_array',
    uniqueKeyField: 'id',
    idStrategy: 'direct_id',
    description: 'Invoice penagihan klien'
  },
  [STORAGE_KEYS.DASHBOARD_WIDGETS]: {
    storageKey: STORAGE_KEYS.DASHBOARD_WIDGETS,
    collectionType: 'singleton_object',
    uniqueKeyField: 'singleton',
    idStrategy: 'singleton',
    description: 'Konfigurasi widget tampilan dashboard'
  },
  [STORAGE_KEYS.TIMESHEET_CUTOFF]: {
    storageKey: STORAGE_KEYS.TIMESHEET_CUTOFF,
    collectionType: 'singleton_object',
    uniqueKeyField: 'singleton',
    idStrategy: 'singleton',
    description: 'Pengaturan periode cutoff absensi & payroll'
  }
};

/**
 * Validasi registri: Setiap key yang terdaftar di STORAGE_KEYS WAJIB memiliki
 * definisi kunci unik di DATA_KEY_REGISTRY.
 */
export function validateDataRegistry(): { valid: boolean; missingKeys: string[] } {
  const missingKeys: string[] = [];
  for (const [name, storageKey] of Object.entries(STORAGE_KEYS)) {
    const def = DATA_KEY_REGISTRY[storageKey];
    if (!def) {
      missingKeys.push(`${name} (${storageKey})`);
    } else if (!def.uniqueKeyField || !def.idStrategy) {
      missingKeys.push(`${name} (${storageKey}) [incomplate definition]`);
    }
  }

  return {
    valid: missingKeys.length === 0,
    missingKeys
  };
}
