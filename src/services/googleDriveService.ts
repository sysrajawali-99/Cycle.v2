import { storageService } from './storageService';
import {
  Project,
  Employee,
  TimesheetMonthRecord,
  MutationHistory,
  InventoryItem,
  ProjectStock,
  InventoryLog,
  CleaningTask,
  BlastAnnouncement,
  SopDocument,
  UserAccount,
  ChartOfAccount,
  FinanceTransaction,
  BankStatementImport,
  PeriodClosing,
  AuditTrailItem,
  CurrencyRate
} from '../types';

export const DEFAULT_DRIVE_FOLDER_ID = '1GaPlyK1JeoLhjxcuxeapN2N9oJ9yNAJA';
export const DEFAULT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}?usp=drive_link`;
export const DEFAULT_GOOGLE_CLIENT_ID = '90022021121-putcjfmghgnls1atmk7j7eq3dv6s8g5i.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

const STORAGE_KEYS = {
  TOKEN: 'rajawali_gdrive_access_token',
  TOKEN_EXPIRY: 'rajawali_gdrive_token_expiry',
  USER_INFO: 'rajawali_gdrive_user_info',
  SYNC_SETTINGS: 'rajawali_gdrive_sync_settings',
  LAST_BACKUP_TIME: 'rajawali_gdrive_last_backup_time',
  LAST_BACKUP_SUMMARY: 'rajawali_gdrive_last_backup_summary',
  SUBFOLDER_CACHE: 'rajawali_gdrive_subfolder_cache',
  CUSTOM_CLIENT_ID: 'rajawali_gdrive_custom_client_id'
};

export const SUBFOLDER_DEFINITIONS = [
  {
    key: 'database',
    name: '01_Full_Database_Backups',
    description: 'Arsip dan snapshot lengkap database sistem Rajawali (.json)',
    icon: 'Database'
  },
  {
    key: 'employees',
    name: '02_Master_Karyawan',
    description: 'Data master personil, penempatan, dan riwayat mutasi (.csv)',
    icon: 'Users'
  },
  {
    key: 'timesheets',
    name: '03_Timesheet_Kehadiran',
    description: 'Rekap absensi bulanan, potongan, lembur, dan payroll (.csv)',
    icon: 'Calendar'
  },
  {
    key: 'inventory',
    name: '04_Inventory_Stok',
    description: 'Katalog chemical, peralatan kerja, dan log mutasi stok (.csv)',
    icon: 'Package'
  },
  {
    key: 'tasks_sop',
    name: '05_Tugas_Kebersihan_SOP',
    description: 'Monitoring checklist kebersihan harian dan katalog SOP K3 (.csv)',
    icon: 'CheckSquare'
  },
  {
    key: 'reports',
    name: '06_Laporan_Eksekutif',
    description: 'Ringkasan performa operasional dan rekap keuangan bulanan (.csv)',
    icon: 'BarChart3'
  },
  {
    key: 'finance',
    name: '07_Finance_dan_Accounting',
    description: 'Jurnal Kas/Bank, Master COA, Laporan Keuangan SAK, & Audit Trail (.csv & .json)',
    icon: 'DollarSign'
  }
] as const;

export type SubfolderKey = typeof SUBFOLDER_DEFINITIONS[number]['key'];

export interface DriveUserInfo {
  email: string;
  name: string;
  picture?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime?: string;
  description?: string;
  webViewLink?: string;
  parents?: string[];
  subfolderName?: string;
  isUpdated?: boolean;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
  key?: SubfolderKey;
}

export interface DriveSyncSettings {
  folderId: string;
  autoSyncEnabled: boolean;
  autoSyncIntervalHours: number;
  notifyOnSuccess: boolean;
  alwaysOverwriteLiveFile: boolean; // Overwrite latest live file to prevent clutter
  keepHistoricalArchive: boolean; // Also keep timestamped archives
}

export interface LastBackupNotification {
  timestamp: string;
  author: string;
  fileName: string;
  fileId: string;
  folderName: string;
  folderId: string;
  webViewLink?: string;
  summary: {
    totalProjects: number;
    totalEmployees: number;
    totalTimesheets: number;
    totalTasks: number;
    totalSops: number;
    totalInventoryItems: number;
    totalFinanceTransactions?: number;
    totalCoaAccounts?: number;
  };
  syncedFilesCount: number;
  mode: 'single' | 'batch_all';
}

export interface DatabaseBackupSnapshot {
  app: string;
  version: string;
  timestamp: string;
  description?: string;
  author?: string;
  data: {
    projects: Project[];
    employees: Employee[];
    timesheets: TimesheetMonthRecord[];
    mutations: MutationHistory[];
    inventoryItems: InventoryItem[];
    projectStocks: ProjectStock[];
    inventoryLogs: InventoryLog[];
    tasks: CleaningTask[];
    blasts: BlastAnnouncement[];
    sops: SopDocument[];
    users: UserAccount[];
    financeAccounts?: ChartOfAccount[];
    financeTransactions?: FinanceTransaction[];
    bankStatements?: BankStatementImport[];
    periodClosings?: PeriodClosing[];
    auditTrails?: AuditTrailItem[];
    currencyRates?: CurrencyRate[];
  };
  summary: {
    totalProjects: number;
    totalEmployees: number;
    totalTimesheets: number;
    totalTasks: number;
    totalSops: number;
    totalInventoryItems: number;
    totalFinanceTransactions?: number;
    totalCoaAccounts?: number;
  };
}

export const googleDriveService = {
  getStoredToken(): string | null {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!token || !expiry) return null;

    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime - 60000) {
      this.clearSession();
      return null;
    }
    return token;
  },

  getStoredUserInfo(): DriveUserInfo | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  getSyncSettings(): DriveSyncSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_SETTINGS);
    const defaultSettings: DriveSyncSettings = {
      folderId: DEFAULT_DRIVE_FOLDER_ID,
      autoSyncEnabled: false,
      autoSyncIntervalHours: 24,
      notifyOnSuccess: true,
      alwaysOverwriteLiveFile: true,
      keepHistoricalArchive: true
    };
    if (!raw) return defaultSettings;
    try {
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {
      return defaultSettings;
    }
  },

  saveSyncSettings(settings: Partial<DriveSyncSettings>) {
    const current = this.getSyncSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(updated));
  },

  getLastBackupTime(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIME);
  },

  setLastBackupTime(timestamp: string) {
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_TIME, timestamp);
  },

  getLastBackupNotification(): LastBackupNotification | null {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_SUMMARY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setLastBackupNotification(summary: LastBackupNotification) {
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_SUMMARY, JSON.stringify(summary));
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    localStorage.removeItem(STORAGE_KEYS.SUBFOLDER_CACHE);
  },

  getClientId(): string {
    const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }
    return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  },

  setCustomClientId(clientId: string) {
    if (!clientId || clientId.trim().length === 0) {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
    } else {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLIENT_ID, clientId.trim());
    }
  },

  getCustomClientId(): string {
    return localStorage.getItem(STORAGE_KEYS.CUSTOM_CLIENT_ID) || '';
  },

  /**
   * Directly inject an Access Token (e.g. from Google OAuth Playground, gcloud, or custom token)
   */
  async setManualAccessToken(token: string, email: string = 'sys.rajawali@gmail.com'): Promise<{ token: string; user: DriveUserInfo }> {
    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
    if (!cleanToken) {
      throw new Error('Token akses tidak boleh kosong.');
    }

    const expiryTime = Date.now() + 24 * 3600 * 1000; // 24 hours
    localStorage.setItem(STORAGE_KEYS.TOKEN, cleanToken);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

    let userInfo: DriveUserInfo = {
      email: email || 'sys.rajawali@gmail.com',
      name: 'Rajawali System Admin'
    };

    try {
      const fetched = await this.fetchUserInfo(cleanToken);
      if (fetched && fetched.email) {
        userInfo = fetched;
      }
    } catch {
      // Use fallback
    }

    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    return { token: cleanToken, user: userInfo };
  },

  /**
   * Helper to ensure Google Identity Services script is loaded
   */
  async ensureGsiScript(): Promise<void> {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.accounts?.oauth2) return;

    return new Promise((resolve) => {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        if ((window as any).google?.accounts?.oauth2) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => resolve());
        setTimeout(resolve, 2500);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
      setTimeout(resolve, 2500);
    });
  },

  /**
   * Request Google OAuth Access Token via Google Identity Services (GSI)
   */
  async requestAccessToken(): Promise<{ token: string; user: DriveUserInfo }> {
    await this.ensureGsiScript();
    const clientId = this.getClientId();
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
        reject(
          new Error(
            'Google Identity Services belum termuat. Periksa koneksi internet Anda atau refresh halaman browser.'
          )
        );
        return;
      }

      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              reject(new Error(`Otorisasi Google Drive gagal (${tokenResponse.error}). Pastikan Client ID valid dan asal URL diizinkan di Google Cloud Console.`));
              return;
            }

            const token = tokenResponse.access_token;
            if (!token) {
              reject(new Error('Token otorisasi Google tidak diterima. Silakan ulangi proses login.'));
              return;
            }

            const expiresIn = tokenResponse.expires_in
              ? parseInt(tokenResponse.expires_in, 10) * 1000
              : 3600 * 1000;
            const expiryTime = Date.now() + expiresIn;

            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
            localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

            try {
              const userInfo = await googleDriveService.fetchUserInfo(token);
              localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
              resolve({ token, user: userInfo });
            } catch (err) {
              const fallbackUser: DriveUserInfo = {
                email: 'sys.rajawali@gmail.com',
                name: 'Rajawali Admin'
              };
              localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(fallbackUser));
              resolve({ token, user: fallbackUser });
            }
          }
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        reject(new Error(`Inisialisasi otorisasi gagal: ${err?.message || err}`));
      }
    });
  },

  async fetchUserInfo(token: string): Promise<DriveUserInfo> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) {
      if (res.status === 401) {
        this.clearSession();
        throw new Error('Sesi akun Google telah kedaluwarsa (401). Silakan login ulang.');
      }
      throw new Error('Gagal mengambil data profil Google');
    }
    const data = await res.json();
    return {
      email: data.email || 'sys.rajawali@gmail.com',
      name: data.name || 'Akun Google Rajawali',
      picture: data.picture
    };
  },

  async getValidToken(): Promise<string> {
    const existing = this.getStoredToken();
    if (existing) return existing;
    const { token } = await this.requestAccessToken();
    return token;
  },

  // -------------------------------------------------------------
  // FOLDER & SUBFOLDER MANAGEMENT
  // -------------------------------------------------------------

  /**
   * Search or create a subfolder inside a given parent folder
   */
  async getOrCreateSubfolder(folderName: string, parentFolderId?: string): Promise<DriveFolderInfo> {
    const token = await this.getValidToken();
    const parentId = parentFolderId || this.getSyncSettings().folderId || DEFAULT_DRIVE_FOLDER_ID;

    // 1. Check if folder already exists
    const query = encodeURIComponent(
      `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`;

    const searchRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.status === 401) {
      this.clearSession();
      throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan klik "Hubungkan Ulang Akun Google" atau masukkan Access Token aktif.');
    }

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return {
          id: searchData.files[0].id,
          name: searchData.files[0].name,
          webViewLink: searchData.files[0].webViewLink
        };
      }
    }

    // 2. Folder does not exist -> Create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
        description: `Subfolder Rajawali Cycle: ${folderName}`
      })
    });

    if (!createRes.ok) {
      if (createRes.status === 401) {
        this.clearSession();
        throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan klik "Hubungkan Ulang Akun Google" atau masukkan Access Token aktif.');
      }
      const err = await createRes.json().catch(() => ({}));
      throw new Error(`Gagal membuat subfolder "${folderName}" di Google Drive: ${err?.error?.message || createRes.statusText}`);
    }

    const createdData = await createRes.json();
    return {
      id: createdData.id,
      name: createdData.name,
      webViewLink: createdData.webViewLink
    };
  },

  /**
   * Initializes all standard subfolders in Google Drive if they don't exist yet
   */
  async ensureAllSubfoldersExist(rootFolderId?: string): Promise<Record<SubfolderKey, DriveFolderInfo>> {
    const parentId = rootFolderId || this.getSyncSettings().folderId || DEFAULT_DRIVE_FOLDER_ID;
    const result: Partial<Record<SubfolderKey, DriveFolderInfo>> = {};

    for (const def of SUBFOLDER_DEFINITIONS) {
      const folderInfo = await this.getOrCreateSubfolder(def.name, parentId);
      result[def.key] = {
        ...folderInfo,
        key: def.key
      };
    }

    localStorage.setItem(STORAGE_KEYS.SUBFOLDER_CACHE, JSON.stringify(result));
    return result as Record<SubfolderKey, DriveFolderInfo>;
  },

  /**
   * Look up existing file by exact name inside a specific folder (for overwrite/update)
   */
  async findFileByNameInFolder(fileName: string, folderId: string): Promise<DriveBackupFile | null> {
    const token = await this.getValidToken();
    const query = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,description,webViewLink)&pageSize=1`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      this.clearSession();
      throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan klik "Hubungkan Ulang Akun Google" atau masukkan Access Token aktif.');
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  },

  /**
   * Upload or Update (Overwrite) file to Google Drive.
   * If updateIfExists is true and file with same name exists, it updates content without creating duplicate!
   */
  async saveOrUpdateFileInDrive(params: {
    fileName: string;
    mimeType: string;
    content: string | Blob;
    folderId: string;
    description?: string;
    updateIfExists?: boolean;
  }): Promise<DriveBackupFile> {
    const token = await this.getValidToken();
    const { fileName, mimeType, folderId, description, updateIfExists = true } = params;

    let fileContentString = '';
    if (typeof params.content === 'string') {
      fileContentString = params.content;
    } else {
      fileContentString = await params.content.text();
    }

    // Check if file exists and we should update it
    let existingFile: DriveBackupFile | null = null;
    if (updateIfExists) {
      existingFile = await this.findFileByNameInFolder(fileName, folderId);
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    if (existingFile) {
      // UPDATE EXISTING FILE CONTENT & METADATA (PATCH)
      const metadata = {
        name: fileName,
        description: description || `Diperbarui otomatis pada ${new Date().toLocaleString('id-ID')}`
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        fileContentString +
        closeDelimiter;

      const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,description,webViewLink`;

      const response = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearSession();
          throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan klik "Hubungkan Ulang Akun Google" atau masukkan Access Token aktif.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gagal memperbarui file di Google Drive: ${errorData?.error?.message || response.statusText}`);
      }

      const updatedFile = await response.json();
      return { ...updatedFile, isUpdated: true };
    } else {
      // CREATE NEW FILE (POST)
      const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId],
        description: description || `Dibuat pada ${new Date().toLocaleString('id-ID')}`
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        fileContentString +
        closeDelimiter;

      const postUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,description,webViewLink`;

      const response = await fetch(postUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearSession();
          throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan klik "Hubungkan Ulang Akun Google" atau masukkan Access Token aktif.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gagal mengunggah file baru ke Google Drive: ${errorData?.error?.message || response.statusText}`);
      }

      const newFile = await response.json();
      return { ...newFile, isUpdated: false };
    }
  },

  /**
   * List files from root and all known subfolders
   */
  async listAllDriveFiles(rootFolderId?: string): Promise<{
    rootFiles: DriveBackupFile[];
    subfolderFiles: Record<SubfolderKey, DriveBackupFile[]>;
    subfolders: Record<SubfolderKey, DriveFolderInfo>;
  }> {
    const parentId = rootFolderId || this.getSyncSettings().folderId || DEFAULT_DRIVE_FOLDER_ID;
    const subfolders = await this.ensureAllSubfoldersExist(parentId);

    const token = await this.getValidToken();
    const fields = encodeURIComponent('files(id, name, mimeType, size, createdTime, modifiedTime, description, webViewLink, parents)');

    // Fetch root files
    const rootQuery = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
    const rootRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${rootQuery}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (rootRes.status === 401) {
      this.clearSession();
      throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan klik "Hubungkan Ulang Akun Google" atau masukkan Access Token aktif.');
    }
    const rootData = rootRes.ok ? await rootRes.json() : { files: [] };

    // Fetch files inside each subfolder in parallel
    const subfolderFiles: Partial<Record<SubfolderKey, DriveBackupFile[]>> = {};

    await Promise.all(
      SUBFOLDER_DEFINITIONS.map(async (def) => {
        const folder = subfolders[def.key];
        if (!folder?.id) {
          subfolderFiles[def.key] = [];
          return;
        }
        const subQuery = encodeURIComponent(`'${folder.id}' in parents and trashed = false`);
        const subRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${subQuery}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const subData = subRes.ok ? await subRes.json() : { files: [] };
        subfolderFiles[def.key] = (subData.files || []).map((f: DriveBackupFile) => ({
          ...f,
          subfolderName: def.name
        }));
      })
    );

    return {
      rootFiles: rootData.files || [],
      subfolderFiles: subfolderFiles as Record<SubfolderKey, DriveBackupFile[]>,
      subfolders
    };
  },

  async downloadFileContent(fileId: string): Promise<string> {
    const token = await this.getValidToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401) {
      this.clearSession();
      throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan hubungkan ulang akun Google Anda.');
    }

    if (!response.ok) {
      throw new Error('Gagal mengunduh file dari Google Drive');
    }

    return await response.text();
  },

  async deleteFileFromDrive(fileId: string): Promise<void> {
    const token = await this.getValidToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401) {
      this.clearSession();
      throw new Error('Sesi Google Drive kedaluwarsa atau token tidak valid (401). Silakan hubungkan ulang akun Google Anda.');
    }

    if (!response.ok) {
      throw new Error('Gagal menghapus file dari Google Drive');
    }
  },

  /**
   * Generate complete database snapshot payload
   */
  generateDatabaseSnapshot(authorName?: string, customNote?: string): DatabaseBackupSnapshot {
    const projects = storageService.getProjects();
    const employees = storageService.getEmployees();
    const timesheets = storageService.getTimesheets();
    const mutations = storageService.getMutations();
    const inventoryItems = storageService.getInventoryItems();
    const projectStocks = storageService.getProjectStocks();
    const inventoryLogs = storageService.getInventoryLogs();
    const tasks = storageService.getTasks();
    const blasts = storageService.getBlasts();
    const sops = storageService.getSops();
    const users = storageService.getUsers();
    const financeAccounts = storageService.getChartOfAccounts();
    const financeTransactions = storageService.getFinanceTransactions();
    const bankStatements = storageService.getBankStatements();
    const periodClosings = storageService.getPeriodClosings();
    const auditTrails = storageService.getAuditTrails();
    const currencyRates = storageService.getCurrencyRates();

    return {
      app: 'Rajawali Cycle - Outsourcing Suite',
      version: '2.5 (Drive Subfolder Edition)',
      timestamp: new Date().toISOString(),
      description: customNote || 'Full Automated System Snapshot with Finance & Accounting',
      author: authorName || 'Super Admin HQ',
      data: {
        projects,
        employees,
        timesheets,
        mutations,
        inventoryItems,
        projectStocks,
        inventoryLogs,
        tasks,
        blasts,
        sops,
        users,
        financeAccounts,
        financeTransactions,
        bankStatements,
        periodClosings,
        auditTrails,
        currencyRates
      },
      summary: {
        totalProjects: projects.length,
        totalEmployees: employees.length,
        totalTimesheets: timesheets.length,
        totalTasks: tasks.length,
        totalSops: sops.length,
        totalInventoryItems: inventoryItems.length,
        totalFinanceTransactions: financeTransactions.length,
        totalCoaAccounts: financeAccounts.length
      }
    };
  },

  /**
   * Primary Backup: Backs up full snapshot to 01_Full_Database_Backups subfolder.
   * Always updates the live file `Rajawali_Database_Terbaru.json` AND can create a timestamped archive.
   */
  async backupAllDataToDrive(authorName?: string, customNote?: string): Promise<{
    liveFile: DriveBackupFile;
    archiveFile?: DriveBackupFile;
    folderInfo: DriveFolderInfo;
    notification: LastBackupNotification;
  }> {
    const settings = this.getSyncSettings();
    const subfolders = await this.ensureAllSubfoldersExist(settings.folderId);
    const dbFolder = subfolders.database;

    const snapshot = this.generateDatabaseSnapshot(authorName, customNote);
    const jsonContent = JSON.stringify(snapshot, null, 2);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // 1. ALWAYS UPDATE THE LATEST LIVE SNAPSHOT FILE
    const liveFileName = 'Rajawali_Database_Terbaru.json';
    const liveFile = await this.saveOrUpdateFileInDrive({
      fileName: liveFileName,
      mimeType: 'application/json',
      content: jsonContent,
      folderId: dbFolder.id,
      description: `Snapshot Live Terkini Rajawali Cycle (Diperbarui: ${new Date().toLocaleString('id-ID')}) oleh ${authorName || 'Admin'}`,
      updateIfExists: true
    });

    // 2. OPTIONALLY CREATE A TIMESTAMPED ARCHIVE FOR AUDIT TRAIL
    let archiveFile: DriveBackupFile | undefined;
    if (settings.keepHistoricalArchive) {
      const archiveFileName = `Rajawali_Arsip_${dateStr}.json`;
      archiveFile = await this.saveOrUpdateFileInDrive({
        fileName: archiveFileName,
        mimeType: 'application/json',
        content: jsonContent,
        folderId: dbFolder.id,
        description: `Arsip Historis Snapshot: ${snapshot.summary.totalProjects} Lokasi, ${snapshot.summary.totalEmployees} Karyawan, ${snapshot.summary.totalTimesheets} Timesheet`,
        updateIfExists: false
      });
    }

    const timestamp = new Date().toISOString();
    this.setLastBackupTime(timestamp);

    const notification: LastBackupNotification = {
      timestamp,
      author: authorName || 'Super Admin HQ',
      fileName: liveFileName,
      fileId: liveFile.id,
      folderName: dbFolder.name,
      folderId: dbFolder.id,
      webViewLink: liveFile.webViewLink,
      summary: snapshot.summary,
      syncedFilesCount: archiveFile ? 2 : 1,
      mode: 'single'
    };
    this.setLastBackupNotification(notification);

    return {
      liveFile,
      archiveFile,
      folderInfo: dbFolder,
      notification
    };
  },

  /**
   * BATCH SYNC: Backs up full snapshot + all 5 subfolder module spreadsheets in 1 single execution
   */
  async syncAllModulesToSubfolders(authorName?: string): Promise<{
    results: Array<{ module: string; folder: string; fileName: string; isUpdated: boolean; link?: string }>;
    notification: LastBackupNotification;
  }> {
    const settings = this.getSyncSettings();
    const subfolders = await this.ensureAllSubfoldersExist(settings.folderId);
    const results: Array<{ module: string; folder: string; fileName: string; isUpdated: boolean; link?: string }> = [];

    // 1. Full Database Snapshot
    const backupRes = await this.backupAllDataToDrive(authorName, 'Batch Sync Semua Modul');
    results.push({
      module: 'Full Database Snapshot',
      folder: subfolders.database.name,
      fileName: backupRes.liveFile.name,
      isUpdated: Boolean(backupRes.liveFile.isUpdated),
      link: backupRes.liveFile.webViewLink
    });

    // 2. Master Karyawan Spreadsheet
    const empFile = await this.exportModuleCsvToSubfolder('employees');
    results.push({
      module: 'Master Karyawan & Penempatan',
      folder: subfolders.employees.name,
      fileName: empFile.name,
      isUpdated: Boolean(empFile.isUpdated),
      link: empFile.webViewLink
    });

    // 3. Timesheet Absensi Spreadsheet
    const tsFile = await this.exportModuleCsvToSubfolder('timesheets');
    results.push({
      module: 'Rekap Timesheet & Kehadiran',
      folder: subfolders.timesheets.name,
      fileName: tsFile.name,
      isUpdated: Boolean(tsFile.isUpdated),
      link: tsFile.webViewLink
    });

    // 4. Smart Inventory Spreadsheet
    const invFile = await this.exportModuleCsvToSubfolder('inventory');
    results.push({
      module: 'Smart Inventory & Chemical',
      folder: subfolders.inventory.name,
      fileName: invFile.name,
      isUpdated: Boolean(invFile.isUpdated),
      link: invFile.webViewLink
    });

    // 5. Tasks & SOP Spreadsheet
    const taskFile = await this.exportModuleCsvToSubfolder('tasks_sop');
    results.push({
      module: 'Monitoring Tugas & SOP K3',
      folder: subfolders.tasks_sop.name,
      fileName: taskFile.name,
      isUpdated: Boolean(taskFile.isUpdated),
      link: taskFile.webViewLink
    });

    // 6. Laporan Eksekutif
    const repFile = await this.exportModuleCsvToSubfolder('reports');
    results.push({
      module: 'Ringkasan Laporan Eksekutif',
      folder: subfolders.reports.name,
      fileName: repFile.name,
      isUpdated: Boolean(repFile.isUpdated),
      link: repFile.webViewLink
    });

    const timestamp = new Date().toISOString();
    this.setLastBackupTime(timestamp);

    const snapshot = this.generateDatabaseSnapshot();
    const notification: LastBackupNotification = {
      timestamp,
      author: authorName || 'Super Admin HQ',
      fileName: 'Batch Sync (6 Subfolder)',
      fileId: subfolders.database.id,
      folderName: 'Struktur Lengkap Google Drive',
      folderId: settings.folderId,
      webViewLink: DEFAULT_DRIVE_FOLDER_URL,
      summary: snapshot.summary,
      syncedFilesCount: results.length,
      mode: 'batch_all'
    };
    this.setLastBackupNotification(notification);

    return { results, notification };
  },

  /**
   * Export specific module CSV to its dedicated subfolder (updating live file)
   */
  async exportModuleCsvToSubfolder(
    moduleKey: 'employees' | 'timesheets' | 'inventory' | 'tasks_sop' | 'reports' | 'finance'
  ): Promise<DriveBackupFile> {
    const settings = this.getSyncSettings();
    const subfolders = await this.ensureAllSubfoldersExist(settings.folderId);
    let targetFolder = subfolders.employees;
    let fileName = '';
    let csvContent = '';

    if (moduleKey === 'employees') {
      targetFolder = subfolders.employees;
      fileName = 'Master_Karyawan_Aktif.csv';
      const emps = storageService.getEmployees();
      const projects = storageService.getProjects();
      const projectMap = new Map(projects.map((p) => [p.id, p.name]));

      const headers = ['NIK', 'Nama', 'Posisi / Jabatan', 'Lokasi Penempatan', 'Shift', 'Gaji Harian', 'Ukuran Seragam', 'Bank', 'No Rekening', 'Status', 'Tanggal Masuk'];
      const rows = emps.map((e) => [
        `"${e.nik}"`,
        `"${e.name}"`,
        `"${e.position}"`,
        `"${projectMap.get(e.projectId) || e.projectId}"`,
        `"${e.shift}"`,
        e.dailyRate,
        `"${e.uniformSize}"`,
        `"${e.bankName}"`,
        `"${e.bankAccount}"`,
        `"${e.status}"`,
        `"${e.joinDate}"`
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    } else if (moduleKey === 'timesheets') {
      targetFolder = subfolders.timesheets;
      fileName = 'Timesheet_Kehadiran_Terkini.csv';
      const timesheets = storageService.getTimesheets();
      const emps = storageService.getEmployees();
      const empMap = new Map(emps.map((e) => [e.id, e.name]));
      const projects = storageService.getProjects();
      const projMap = new Map(projects.map((p) => [p.id, p.name]));

      const headers = ['ID', 'Nama Karyawan', 'Lokasi Proyek', 'Bulan', 'Tahun', 'Total Hadir (H)', 'Absen (A)', 'Izin (I)', 'Off (O)', 'Potongan', 'Bonus Lembur', 'Catatan'];
      const rows = timesheets.map((ts) => {
        const dayValues = Object.values(ts.days || {});
        const totalHadir = dayValues.filter((v) => v === 'H').length;
        const totalAbsen = dayValues.filter((v) => v === 'A').length;
        const totalIzin = dayValues.filter((v) => v === 'I').length;
        const totalOff = dayValues.filter((v) => v === 'O').length;
        return [
          `"${ts.id}"`,
          `"${empMap.get(ts.employeeId) || ts.employeeId}"`,
          `"${projMap.get(ts.projectId) || ts.projectId}"`,
          ts.month,
          ts.year,
          totalHadir,
          totalAbsen,
          totalIzin,
          totalOff,
          ts.deductionAmount || 0,
          ts.bonusAmount || 0,
          `"${ts.notes || ''}"`
        ];
      });
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    } else if (moduleKey === 'inventory') {
      targetFolder = subfolders.inventory;
      fileName = 'Master_Inventory_Chemical_Stok.csv';
      const items = storageService.getInventoryItems();
      const headers = ['Kode', 'Nama Item', 'Kategori', 'Satuan', 'Min Stock', 'Estimasi Harga Satuan', 'Deskripsi'];
      const rows = items.map((i) => [
        `"${i.code}"`,
        `"${i.name}"`,
        `"${i.category}"`,
        `"${i.unit}"`,
        i.minStock,
        i.unitPrice,
        `"${i.description || ''}"`
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    } else if (moduleKey === 'tasks_sop') {
      targetFolder = subfolders.tasks_sop;
      fileName = 'Monitoring_Tugas_dan_SOP.csv';
      const tasks = storageService.getTasks();
      const sops = storageService.getSops();
      const projects = storageService.getProjects();
      const projMap = new Map(projects.map((p) => [p.id, p.name]));

      const headersTasks = ['TIPE', 'ID / Kode', 'Judul / Area', 'Lokasi Proyek', 'Shift / Kategori', 'Status', 'QC Review / Versi', 'Update Terakhir'];
      const rowsTasks = tasks.map((t) => [
        '"TUGAS_KEBERSIHAN"',
        `"${t.id}"`,
        `"${t.areaName}"`,
        `"${projMap.get(t.projectId) || t.projectId}"`,
        `"${t.shift}"`,
        `"${t.status}"`,
        `"${t.qcStatus || 'Pending'}"`,
        `"${t.updatedAt}"`
      ]);
      const rowsSops = sops.map((s) => [
        '"SOP_PEDOMAN"',
        `"${s.code || s.id}"`,
        `"${s.title}"`,
        '"HQ / SEMUA PROYEK"',
        `"${s.category}"`,
        '"AKTIF"',
        `"Ver. ${s.version}"`,
        `"${s.lastUpdated}"`
      ]);
      csvContent = [headersTasks.join(','), ...rowsTasks.map((r) => r.join(',')), ...rowsSops.map((r) => r.join(','))].join('\r\n');
    } else if (moduleKey === 'finance') {
      targetFolder = subfolders.finance;
      fileName = '01_Jurnal_Kas_dan_Bank.csv';
      const transactions = storageService.getFinanceTransactions();
      const accounts = storageService.getChartOfAccounts();
      const accMap = new Map(accounts.map((a) => [a.code, a.name]));

      const headers = ['No Bukti', 'Tanggal', 'Jenis', 'Judul Transaksi', 'Keterangan', 'Akun Kas/Bank', 'Akun Lawan', 'Cost Center', 'Divisi', 'Metode Bayar', 'Pihak Terkait', 'Nominal (Rp)', 'Status Reconcile'];
      const rows = transactions.map((t) => [
        `"${t.code}"`,
        `"${t.date}"`,
        `"${t.type}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${t.primaryAccountCode} - ${accMap.get(t.primaryAccountCode) || ''}"`,
        `"${t.contraAccountCode} - ${accMap.get(t.contraAccountCode) || ''}"`,
        `"${t.projectName || 'HQ'}"`,
        `"${t.division || 'Cleaning'}"`,
        `"${t.paymentMethod}"`,
        `"${t.payeeOrPayer || '-'}"`,
        t.amount,
        t.isReconciled ? '"Matched"' : '"Unreconciled"'
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    } else {
      targetFolder = subfolders.reports;
      fileName = 'Ringkasan_Eksekutif_Operasional.csv';
      const projects = storageService.getProjects();
      const emps = storageService.getEmployees();
      const tasks = storageService.getTasks();

      const headers = ['ID Lokasi', 'Nama Proyek / Klien', 'Alamat Lokasi', 'Tipe Fasilitas', 'Jumlah Personil', 'Tugas Aktif', 'Site Supervisor'];
      const rows = projects.map((p) => {
        const pEmps = emps.filter((e) => e.projectId === p.id);
        const pTasks = tasks.filter((t) => t.projectId === p.id);
        return [
          `"${p.id}"`,
          `"${p.name}"`,
          `"${(p.address || '-').replace(/"/g, '""')}"`,
          `"${p.type}"`,
          pEmps.length,
          pTasks.length,
          `"${p.siteSupervisor || '-'}"`
        ];
      });
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    return await this.saveOrUpdateFileInDrive({
      fileName,
      mimeType: 'text/csv',
      content: csvContent,
      folderId: targetFolder.id,
      description: `Data ${moduleKey} Rajawali Cycle (Selalu diperbarui otomatis)`,
      updateIfExists: true
    });
  },

  /**
   * Generates a complete JSON payload for Finance module (useful for offline download & cloud upload)
   */
  generateFinanceBackupPayload(authorName?: string, customNote?: string) {
    return {
      app: 'Rajawali Cycle - Finance & Accounting Module',
      version: '2.5',
      timestamp: new Date().toISOString(),
      author: authorName || 'Finance & Accounting Lead',
      description: customNote || 'Cadangan Khusus Divisi Keuangan & Akuntansi',
      accounts: storageService.getChartOfAccounts(),
      transactions: storageService.getFinanceTransactions(),
      auditTrails: storageService.getAuditTrails(),
      periodClosings: storageService.getPeriodClosings(),
      bankStatements: storageService.getBankStatements()
    };
  },

  /**
   * Backup dedicated Finance & Accounting Module to Drive Subfolder (07_Finance_dan_Accounting)
   * Produces:
   * 1. 01_Jurnal_Transaksi_Kas_Bank.csv
   * 2. 02_Master_Bagan_Akun_COA.csv
   * 3. 03_Log_Audit_Trail_Keuangan.csv
   * 4. 04_Snapshot_Finance_Master.json
   */
  async backupFinanceModuleToDrive(authorName?: string, customNote?: string): Promise<{
    files: DriveBackupFile[];
    folderInfo: DriveFolderInfo;
  }> {
    const settings = this.getSyncSettings();
    const subfolders = await this.ensureAllSubfoldersExist(settings.folderId);
    const financeFolder = subfolders.finance;

    const transactions = storageService.getFinanceTransactions();
    const accounts = storageService.getChartOfAccounts();
    const auditTrails = storageService.getAuditTrails();
    const periodClosings = storageService.getPeriodClosings();
    const bankStatements = storageService.getBankStatements();
    const accMap = new Map(accounts.map((a) => [a.code, a.name]));

    const uploadedFiles: DriveBackupFile[] = [];

    // 1. Jurnal Kas & Bank CSV
    const trxHeaders = ['No Bukti', 'Tanggal', 'Tipe', 'Judul Transaksi', 'Keterangan', 'Akun Kas/Bank', 'Akun Lawan', 'Cost Center', 'Divisi', 'Metode Bayar', 'Pihak Terkait', 'No Ref', 'Nominal (Rp)', 'Reconciled'];
    const trxRows = transactions.map((t) => [
      `"${t.code}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.primaryAccountCode} - ${accMap.get(t.primaryAccountCode) || ''}"`,
      `"${t.contraAccountCode} - ${accMap.get(t.contraAccountCode) || ''}"`,
      `"${t.projectName || 'HQ'}"`,
      `"${t.division || 'Cleaning'}"`,
      `"${t.paymentMethod}"`,
      `"${t.payeeOrPayer || '-'}"`,
      `"${t.referenceNumber || '-'}"`,
      t.amount,
      t.isReconciled ? '"YES"' : '"NO"'
    ]);
    const trxCsv = [trxHeaders.join(','), ...trxRows.map((r) => r.join(','))].join('\r\n');
    const trxFile = await this.saveOrUpdateFileInDrive({
      fileName: '01_Jurnal_Transaksi_Kas_Bank.csv',
      mimeType: 'text/csv',
      content: trxCsv,
      folderId: financeFolder.id,
      description: `Buku Kas & Jurnal Keuangan (${transactions.length} Transaksi) - Diperbarui ${new Date().toLocaleString('id-ID')}`,
      updateIfExists: true
    });
    uploadedFiles.push(trxFile);

    // 2. Master COA CSV
    const coaHeaders = ['Kode Akun', 'Nama Akun', 'Tipe Akun', 'Hirarki', 'Kode Induk', 'Kategori PSAK', 'Saldo Normal', 'Saldo Awal (Rp)', 'Saldo Berjalan (Rp)', 'Status'];
    const coaRows = accounts.map((a) => [
      `"${a.code}"`,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${a.type}"`,
      a.isSubAccount ? '"Sub-Akun"' : '"Akun Induk"',
      `"${a.parentCode || '-'}"`,
      `"${a.category}"`,
      `"${a.normalBalance}"`,
      a.initialBalance || 0,
      a.currentBalance || 0,
      a.isActive ? '"Aktif"' : '"Nonaktif"'
    ]);
    const coaCsv = [coaHeaders.join(','), ...coaRows.map((r) => r.join(','))].join('\r\n');
    const coaFile = await this.saveOrUpdateFileInDrive({
      fileName: '02_Master_Bagan_Akun_COA.csv',
      mimeType: 'text/csv',
      content: coaCsv,
      folderId: financeFolder.id,
      description: `Chart of Accounts & Sub COA (${accounts.length} Akun)`,
      updateIfExists: true
    });
    uploadedFiles.push(coaFile);

    // 3. Audit Trail CSV
    const auditHeaders = ['Timestamp', 'User', 'Role', 'Aksi', 'Modul', 'ID Data', 'No Bukti', 'Keterangan Log', 'Nominal (Rp)'];
    const auditRows = auditTrails.map((aud) => [
      `"${aud.timestamp}"`,
      `"${aud.userName}"`,
      `"${aud.userRole}"`,
      `"${aud.actionType}"`,
      `"${aud.module}"`,
      `"${aud.recordId}"`,
      `"${aud.recordCode || '-'}"`,
      `"${(aud.description || '').replace(/"/g, '""')}"`,
      aud.amount || 0
    ]);
    const auditCsv = [auditHeaders.join(','), ...auditRows.map((r) => r.join(','))].join('\r\n');
    const auditFile = await this.saveOrUpdateFileInDrive({
      fileName: '03_Log_Audit_Trail_Keuangan.csv',
      mimeType: 'text/csv',
      content: auditCsv,
      folderId: financeFolder.id,
      description: `Jejak Audit Keuangan & Rekam Penghapusan PIN (${auditTrails.length} Catatan)`,
      updateIfExists: true
    });
    uploadedFiles.push(auditFile);

    // 4. JSON Full Finance Snapshot
    const financeSnapshot = {
      app: 'Rajawali Cycle - Finance & Accounting Module',
      version: '2.5',
      timestamp: new Date().toISOString(),
      author: authorName || 'Finance & Accounting Lead',
      description: customNote || 'Cadangan Khusus Divisi Keuangan & Akuntansi',
      accounts,
      transactions,
      auditTrails,
      periodClosings,
      bankStatements
    };
    const jsonFile = await this.saveOrUpdateFileInDrive({
      fileName: 'Rajawali_Finance_Snapshot.json',
      mimeType: 'application/json',
      content: JSON.stringify(financeSnapshot, null, 2),
      folderId: financeFolder.id,
      description: `Snapshot Lengkap Data Finance (${transactions.length} Trx, ${accounts.length} COA, ${auditTrails.length} Audit Logs)`,
      updateIfExists: true
    });
    uploadedFiles.push(jsonFile);

    return {
      files: uploadedFiles,
      folderInfo: financeFolder
    };
  },

  /**
   * Restore database from snapshot JSON string
   */
  restoreDatabaseFromSnapshot(snapshotJson: string): { success: boolean; summary?: any; error?: string } {
    try {
      const parsed: DatabaseBackupSnapshot = JSON.parse(snapshotJson);
      if (!parsed || !parsed.data) {
        return { success: false, error: 'Format file cadangan tidak valid (struktur data tidak lengkap).' };
      }

      const { data } = parsed;

      if (Array.isArray(data.projects)) storageService.saveProjects(data.projects);
      if (Array.isArray(data.employees)) storageService.saveEmployees(data.employees);
      if (Array.isArray(data.timesheets)) storageService.saveTimesheets(data.timesheets);
      if (Array.isArray(data.mutations)) storageService.saveMutations(data.mutations);
      if (Array.isArray(data.inventoryItems)) storageService.saveInventoryItems(data.inventoryItems);
      if (Array.isArray(data.projectStocks)) storageService.saveProjectStocks(data.projectStocks);
      if (Array.isArray(data.inventoryLogs)) storageService.saveInventoryLogs(data.inventoryLogs);
      if (Array.isArray(data.tasks)) storageService.saveTasks(data.tasks);
      if (Array.isArray(data.blasts)) storageService.saveBlasts(data.blasts);
      if (Array.isArray(data.sops)) storageService.saveSops(data.sops);
      if (Array.isArray(data.users)) storageService.saveUsers(data.users);

      // Restore finance records if present in snapshot
      if (Array.isArray(data.financeAccounts)) storageService.saveChartOfAccounts(data.financeAccounts);
      if (Array.isArray(data.financeTransactions)) storageService.saveFinanceTransactions(data.financeTransactions);
      if (Array.isArray(data.bankStatements)) storageService.saveBankStatements(data.bankStatements);
      if (Array.isArray(data.periodClosings)) storageService.savePeriodClosings(data.periodClosings);
      if (Array.isArray(data.auditTrails)) storageService.saveAuditTrails(data.auditTrails);
      if (Array.isArray(data.currencyRates)) storageService.saveCurrencyRates(data.currencyRates);

      return {
        success: true,
        summary: parsed.summary || {
          totalProjects: data.projects?.length || 0,
          totalEmployees: data.employees?.length || 0,
          totalTimesheets: data.timesheets?.length || 0,
          totalTasks: data.tasks?.length || 0,
          totalSops: data.sops?.length || 0,
          totalFinanceTransactions: data.financeTransactions?.length || 0,
          totalCoaAccounts: data.financeAccounts?.length || 0
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memulihkan database dari snapshot' };
    }
  }
};
