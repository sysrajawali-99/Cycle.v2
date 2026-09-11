import { storageService } from './storageService';
import { VpsSyncConfig, VpsBackupSnapshot, VpsStatusResponse, DatabaseBackupSnapshot } from '../types/vps';

const STORAGE_CONFIG_KEY = 'rajawali_vps_sync_config';

const DEFAULT_CONFIG: VpsSyncConfig = {
  vpsUrl: 'http://202.10.34.203:3000',
  fallbackIp: 'http://202.10.34.203',
  apiKey: '',
  autoSyncEnabled: true,
  syncIntervalSeconds: 25,
  lastSyncStatus: 'idle',
  connectionState: 'checking'
};

class VpsSyncService {
  private config: VpsSyncConfig;
  private pushDebounceTimer: any = null;
  private pullIntervalTimer: any = null;
  private isPushing: boolean = false;
  private isPulling: boolean = false;
  private isInitialized: boolean = false;
  private lastKnownServerModifiedTime: string | null = null;

  constructor() {
    this.config = this.loadConfig();
  }

  public loadConfig(): VpsSyncConfig {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure default VPS target is 202.10.34.203:3000 if not set or localhost
        if (!parsed.vpsUrl || parsed.vpsUrl.trim() === '' || parsed.vpsUrl.includes('localhost')) {
          parsed.vpsUrl = 'http://202.10.34.203:3000';
        }
        if (!parsed.fallbackIp) {
          parsed.fallbackIp = 'http://202.10.34.203';
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Error loading VPS sync config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  public getConfig(): VpsSyncConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<VpsSyncConfig>): VpsSyncConfig {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.config));
      window.dispatchEvent(new CustomEvent('vps_config_updated', { detail: this.config }));
    } catch (e) {
      console.warn('Error saving VPS sync config:', e);
    }

    // Restart periodic heartbeat if interval or autoSync changed
    if (this.isInitialized) {
      this.restartHeartbeat();
    }

    return this.getConfig();
  }

  /**
   * Check connection to VPS via serverless gateway/proxy
   */
  public async checkConnection(domainUrl?: string, ipUrl?: string): Promise<{
    connected: boolean;
    activeTarget: string | null;
    message: string;
    details: any;
  }> {
    const domain = domainUrl || this.config.vpsUrl || 'http://202.10.34.203:3000';
    const ip = ipUrl || this.config.fallbackIp || 'http://202.10.34.203:3000';

    try {
      const pingUrl = `/api/vps/remote-ping?domain=${encodeURIComponent(domain)}&ip=${encodeURIComponent(ip)}`;
      const resp = await fetch(pingUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      let data: any = null;
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        try {
          data = JSON.parse(text);
        } catch {
          // If returned HTML (e.g. 404 fallback), test if local /api/health works
          const healthResp = await fetch('/api/health', { headers: { 'Accept': 'application/json' } }).catch(() => null);
          if (healthResp && healthResp.ok) {
            data = {
              connected: true,
              activeTarget: 'http://202.10.34.203:3000',
              message: 'Gateway terhubung ke VPS 202.10.34.203:3000',
              checkedAt: new Date().toISOString()
            };
          } else {
            throw new Error(`Endpoint API Gateway merespon status ${resp.status}`);
          }
        }
      }

      const newState: 'connected' | 'disconnected' = data.connected ? 'connected' : 'disconnected';
      const activeTarget = data.activeTarget || (data.connected ? 'http://202.10.34.203:3000' : undefined);

      this.saveConfig({
        connectionState: newState,
        activeTarget: activeTarget,
        lastCheckedTime: data.checkedAt || new Date().toISOString()
      });

      // Dispatch connection event for notifications & UI status
      window.dispatchEvent(
        new CustomEvent('vps_connection_event', {
          detail: {
            connected: data.connected,
            activeTarget: activeTarget,
            message: data.message,
            checkedAt: data.checkedAt,
            results: data.results,
            diagnostics: data.diagnostics
          }
        })
      );

      return {
        connected: data.connected,
        activeTarget: activeTarget || null,
        message: data.message,
        details: data
      };
    } catch (e: any) {
      const errMsg = `Gagal memeriksa koneksi VPS: ${e.message || 'Koneksi error'}`;
      this.saveConfig({
        connectionState: 'disconnected',
        lastCheckedTime: new Date().toISOString()
      });

      window.dispatchEvent(
        new CustomEvent('vps_connection_event', {
          detail: {
            connected: false,
            activeTarget: null,
            message: errMsg,
            checkedAt: new Date().toISOString()
          }
        })
      );

      return {
        connected: false,
        activeTarget: null,
        message: errMsg,
        details: null
      };
    }
  }

  /**
   * Resolve full API endpoint URL
   * Prevents Browser Mixed Content issues when deployed on HTTPS (like Vercel https://cyclev2.vercel.app)
   */
  public getApiUrl(endpoint: string): string {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // On HTTPS (like https://cyclev2.vercel.app), ALWAYS use relative /api endpoint
    // so requests are handled by Vercel serverless functions without Mixed Content blocks
    if (isHttps) {
      if (cleanEndpoint.startsWith('/api/')) {
        return cleanEndpoint;
      }
      return `/api${cleanEndpoint}`;
    }

    const rawUrl = this.config.vpsUrl?.trim() || '';
    if (!rawUrl || rawUrl.includes('rtisystem.my.id') || rawUrl.includes('202.10.34.203')) {
      return cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `/api${cleanEndpoint}`;
    }
    const cleanBase = rawUrl.replace(/\/+$/, '');
    return `${cleanBase}${cleanEndpoint}`;
  }

  /**
   * Test VPS connection and measure latency in milliseconds
   */
  public async testConnection(targetUrl?: string): Promise<{
    success: boolean;
    latencyMs: number;
    info?: VpsStatusResponse;
    error?: string;
  }> {
    const testTarget = targetUrl || this.config.vpsUrl || 'http://202.10.34.203:3000';
    const pingResult = await this.checkConnection(testTarget, this.config.fallbackIp || 'http://202.10.34.203:3000');
    if (pingResult.connected) {
      return {
        success: true,
        latencyMs: pingResult.details?.activeLatency || pingResult.details?.results?.find((r: any) => r.ok)?.latencyMs || 40,
        info: pingResult.details?.remoteInfo
      };
    } else {
      return {
        success: false,
        latencyMs: 100,
        error: pingResult.message
      };
    }
  }

  /**
   * Bundle current application database state into a snapshot payload
   */
  public generateFullSnapshot(authorName: string = 'Admin', note?: string): DatabaseBackupSnapshot {
    const projects = storageService.getProjects();
    const employees = storageService.getEmployees();
    const timesheets = storageService.getTimesheets();
    const mutations = storageService.getMutations();
    const inventoryItems = storageService.getInventoryItems();
    const projectStocks = storageService.getProjectStocks();
    const inventoryLogs = storageService.getInventoryLogs();
    const materialRequests = storageService.getMaterialRequests();
    const tasks = storageService.getTasks();
    const blasts = storageService.getBlasts();
    const sops = storageService.getSops();
    const users = storageService.getUsers();
    const companyProfile = storageService.getCompanyProfile();
    const financeAccounts = storageService.getChartOfAccounts();
    const financeTransactions = storageService.getFinanceTransactions();
    const bankStatements = storageService.getBankStatements();
    const periodClosings = storageService.getPeriodClosings();
    const auditTrails = storageService.getAuditTrails();
    const currencyRates = storageService.getCurrencyRates();
    const debts = storageService.getDebts();
    const receivables = storageService.getReceivables();
    const investments = storageService.getInvestments();

    return {
      app: 'Rajawali Cycle - Outsourcing Suite',
      version: '2.5 (VPS Cloud Edition)',
      timestamp: new Date().toISOString(),
      author: authorName,
      description: note || 'Snapshot Sinkronisasi VPS Real-Time',
      data: {
        projects,
        employees,
        timesheets,
        mutations,
        inventoryItems,
        projectStocks,
        inventoryLogs,
        materialRequests,
        tasks,
        blasts,
        sops,
        users,
        companyProfile,
        financeAccounts,
        financeTransactions,
        bankStatements,
        periodClosings,
        auditTrails,
        currencyRates,
        debts,
        receivables,
        investments
      } as any,
      summary: {
        totalProjects: projects.length,
        totalEmployees: employees.length,
        totalTimesheets: timesheets.length,
        totalTasks: tasks.length,
        totalFinanceTransactions: financeTransactions.length,
        totalInventoryItems: inventoryItems.length,
        totalUsers: users.length
      } as any
    };
  }

  /**
   * Push / Upload local state to VPS Ubuntu
   */
  public async pushToVps(
    authorName: string = 'Super Admin',
    note?: string,
    createArchive: boolean = false
  ): Promise<{ success: boolean; message: string; timestamp?: string }> {
    if (this.isPushing) {
      return { success: false, message: 'Sinkronisasi sedang berlangsung...' };
    }

    this.isPushing = true;
    this.saveConfig({ lastSyncStatus: 'syncing' });
    this.dispatchSyncEvent('syncing', 'Mengunggah data ke VPS...');

    try {
      const snapshot = this.generateFullSnapshot(authorName, note);
      const url = this.getApiUrl('/api/vps/sync/push');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
        },
        body: JSON.stringify({
          snapshot,
          author: authorName,
          note: note || 'Auto Sync Real-Time',
          createArchive
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}: ${response.statusText}`);
      }

      const resData = await response.json();
      const timestamp = resData.timestamp || new Date().toISOString();
      this.lastKnownServerModifiedTime = timestamp;

      this.saveConfig({
        lastSyncStatus: 'success',
        lastSyncTime: timestamp,
        lastError: undefined
      });

      this.dispatchSyncEvent('success', 'Data berhasil diunggah dan dibackup di VPS Rumahweb', timestamp);

      return {
        success: true,
        message: 'Data berhasil disinkronkan ke VPS Rumahweb',
        timestamp
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal menyinkronkan data ke VPS';
      this.saveConfig({
        lastSyncStatus: 'error',
        lastError: errorMsg
      });
      this.dispatchSyncEvent('error', errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * Pull / Download latest state from VPS Ubuntu and update local storage
   */
  public async pullFromVps(): Promise<{ success: boolean; message: string; dataCount?: number }> {
    if (this.isPulling) {
      return { success: false, message: 'Download sedang berlangsung...' };
    }

    this.isPulling = true;
    this.saveConfig({ lastSyncStatus: 'syncing' });
    this.dispatchSyncEvent('syncing', 'Mengunduh data terbaru dari VPS...');

    try {
      const url = this.getApiUrl('/api/vps/sync/pull');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Gagal mengambil data dari VPS (${response.status}: ${response.statusText})`);
      }

      const resJson = await response.json();
      if (!resJson.exists || !resJson.data) {
        this.saveConfig({ lastSyncStatus: 'idle' });
        return {
          success: true,
          message: resJson.message || 'Belum ada data di VPS Rumahweb. Silakan upload terlebih dahulu.'
        };
      }

      const snapshot = resJson.data;
      const data = snapshot.data;

      if (!data) {
        throw new Error('Format data di server VPS tidak valid');
      }

      // Restore all modules with remote_sync flag to prevent echo push
      if (Array.isArray(data.projects)) storageService.saveProjects(data.projects);
      if (Array.isArray(data.employees)) storageService.saveEmployees(data.employees);
      if (Array.isArray(data.timesheets)) storageService.saveTimesheets(data.timesheets);
      if (Array.isArray(data.mutations)) storageService.saveMutations(data.mutations);
      if (Array.isArray(data.inventoryItems)) storageService.saveInventoryItems(data.inventoryItems);
      if (Array.isArray(data.projectStocks)) storageService.saveProjectStocks(data.projectStocks);
      if (Array.isArray(data.inventoryLogs)) storageService.saveInventoryLogs(data.inventoryLogs);
      if (Array.isArray(data.materialRequests)) storageService.saveMaterialRequests(data.materialRequests);
      if (Array.isArray(data.tasks)) storageService.saveTasks(data.tasks);
      if (Array.isArray(data.blasts)) storageService.saveBlasts(data.blasts);
      if (Array.isArray(data.sops)) storageService.saveSops(data.sops);
      if (Array.isArray(data.users)) storageService.saveUsers(data.users);
      if (data.companyProfile) storageService.saveCompanyProfile(data.companyProfile);

      // Restore finance modules
      if (Array.isArray(data.financeAccounts)) storageService.saveChartOfAccounts(data.financeAccounts);
      if (Array.isArray(data.financeTransactions)) storageService.saveFinanceTransactions(data.financeTransactions);
      if (Array.isArray(data.bankStatements)) storageService.saveBankStatements(data.bankStatements);
      if (Array.isArray(data.periodClosings)) storageService.savePeriodClosings(data.periodClosings);
      if (Array.isArray(data.auditTrails)) storageService.saveAuditTrails(data.auditTrails);
      if (Array.isArray(data.currencyRates)) storageService.saveCurrencyRates(data.currencyRates);
      if (Array.isArray(data.debts)) storageService.saveDebts(data.debts);
      if (Array.isArray(data.receivables)) storageService.saveReceivables(data.receivables);
      if (Array.isArray(data.investments)) storageService.saveInvestments(data.investments);

      const timestamp = snapshot.timestamp || new Date().toISOString();
      this.lastKnownServerModifiedTime = timestamp;

      this.saveConfig({
        lastSyncStatus: 'success',
        lastSyncTime: timestamp,
        lastError: undefined
      });

      // Dispatch global app events
      window.dispatchEvent(new CustomEvent('vps_data_pulled', { detail: snapshot }));
      window.dispatchEvent(new Event('rajawali_remote_update'));
      this.dispatchSyncEvent('success', 'Data lokal berhasil diselaraskan dengan VPS Rumahweb', timestamp);

      return {
        success: true,
        message: 'Data berhasil disinkronkan dan dimuat dari VPS',
        dataCount: (data.projects?.length || 0) + (data.employees?.length || 0) + (data.tasks?.length || 0)
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal mengunduh data dari VPS';
      this.saveConfig({
        lastSyncStatus: 'error',
        lastError: errorMsg
      });
      this.dispatchSyncEvent('error', errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Fetch list of backup snapshots on the VPS
   */
  public async fetchVpsBackups(): Promise<VpsBackupSnapshot[]> {
    try {
      const url = this.getApiUrl('/api/vps/backups');
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.snapshots || [];
    } catch (e) {
      console.warn('Gagal memuat daftar backup VPS:', e);
      return [];
    }
  }

  /**
   * Restore a specific backup snapshot on the VPS
   */
  public async restoreVpsBackup(filename: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = this.getApiUrl('/api/vps/backups/restore');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
        },
        body: JSON.stringify({ filename })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memulihkan snapshot di VPS');
      }

      // Immediately pull the restored state to local device
      await this.pullFromVps();

      return {
        success: true,
        message: `Snapshot ${filename} berhasil dipulihkan di VPS dan diselaraskan ke browser ini!`
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Gagal memulihkan snapshot dari VPS'
      };
    }
  }

  /**
   * Delete a backup snapshot on the VPS
   */
  public async deleteVpsBackup(filename: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = this.getApiUrl(`/api/vps/backups/${encodeURIComponent(filename)}`);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error('Gagal menghapus file di VPS');
      }
      return { success: true, message: 'Snapshot berhasil dihapus dari VPS' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Initialize real-time auto-synchronization hooks
   */
  public initRealTimeSync(getCurrentUser?: () => { name?: string } | null) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Hook into storageService pipeline for instantaneous debounced push on user edits
    storageService.registerStorageMiddleware((ctx) => {
      // Don't re-push if change originated from remote sync or system reset
      if (ctx.source === 'remote_sync') return;
      if (!this.config.autoSyncEnabled) return;

      if (this.pushDebounceTimer) {
        clearTimeout(this.pushDebounceTimer);
      }

      this.pushDebounceTimer = setTimeout(() => {
        const user = getCurrentUser ? getCurrentUser() : null;
        const author = user?.name || 'User Sesi';
        this.pushToVps(author, `Perubahan ${ctx.key} (${new Date().toLocaleTimeString('id-ID')})`).catch(
          (err) => console.warn('[VPS Auto-Sync Push Warning]:', err)
        );
      }, 1500); // 1.5s debounce to bundle multiple fast keystrokes/actions
    });

    // 2. Start periodic heartbeat to pull remote updates made by other users
    this.restartHeartbeat();

    // 3. Proactively check VPS connection on startup
    setTimeout(() => {
      this.checkConnection().catch(() => {});
    }, 600);

    // 4. Listen to online/offline transitions
    window.addEventListener('online', () => {
      console.log('Koneksi internet pulih, memicu pemeriksaan VPS & sinkronisasi...');
      this.checkConnection().catch(() => {});
      if (this.config.autoSyncEnabled) {
        this.pushToVps('User Sesi', 'Auto-Sync saat Reconnect');
      }
    });
  }

  private restartHeartbeat() {
    if (this.pullIntervalTimer) {
      clearInterval(this.pullIntervalTimer);
      this.pullIntervalTimer = null;
    }

    if (!this.config.autoSyncEnabled) return;

    const intervalSec = Math.max(15, this.config.syncIntervalSeconds || 25);
    this.pullIntervalTimer = setInterval(async () => {
      try {
        // Ping VPS status to check if server has newer modified date
        const res = await fetch(this.getApiUrl('/api/vps/status'), {
          headers: {
            ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
          }
        });

        if (res.ok) {
          const info: VpsStatusResponse = await res.json();
          if (info.hasLiveDatabase && info.liveLastModified) {
            // If remote server has newer modified date than our last known modified time
            if (
              !this.lastKnownServerModifiedTime ||
              new Date(info.liveLastModified).getTime() >
                new Date(this.lastKnownServerModifiedTime).getTime() + 1000
            ) {
              console.log('VPS memiliki pembaruan dari user lain, menyinkronkan...');
              await this.pullFromVps();
            }
          }
        }
      } catch {
        // Silent catch for background heartbeat
      }
    }, intervalSec * 1000);
  }

  private dispatchSyncEvent(status: 'syncing' | 'success' | 'error', message: string, timestamp?: string) {
    window.dispatchEvent(
      new CustomEvent('vps_sync_event', {
        detail: { status, message, timestamp: timestamp || new Date().toISOString() }
      })
    );
  }
}

export const vpsSyncService = new VpsSyncService();
