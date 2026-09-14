import { io, Socket } from 'socket.io-client';
import { storageService, StorageActionType } from './storageService';
import { UserAccount } from '../types';

export interface VpsConnectionStatus {
  connected: boolean;
  engine: 'postgresql' | 'local_file';
  databaseUrlConfigured: boolean;
  socketConnected: boolean;
  host?: string;
  database?: string;
  lastSync?: string;
  error?: string;
  isSyncing?: boolean;
}

type StatusChangeListener = (status: VpsConnectionStatus) => void;

class VpsSyncService {
  private socket: Socket | null = null;
  private statusListeners: StatusChangeListener[] = [];
  private isInitialized = false;
  private currentStatus: VpsConnectionStatus = {
    connected: false,
    engine: 'local_file',
    databaseUrlConfigured: false,
    socketConnected: false,
    lastSync: new Date().toISOString()
  };

  private syncQueue: Map<string, any> = new Map();
  private debounceTimer: any = null;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Check initial VPS DB status and silently sync in background
    this.checkStatus().then(() => {
      this.autoSyncOnStartup();
    });

    // 2. Initialize Socket.IO connection
    try {
      this.socket = io({
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        this.currentStatus.socketConnected = true;
        this.notifyStatusListeners();
        // Silently pull latest state on socket reconnect
        this.autoSyncOnStartup();
      });

      this.socket.on('disconnect', () => {
        this.currentStatus.socketConnected = false;
        this.notifyStatusListeners();
      });

      // Handle real-time updates from other clients or VPS backend
      this.socket.on(
        'state_updated',
        (payload: { key: StorageActionType; data: any; senderId?: string; timestamp?: string }) => {
          if (!payload?.key) return;

          const currentUser = storageService.getActiveUser();
          // If this update was originated from this user's current session, skip to avoid loops
          if (payload.senderId && currentUser?.id && payload.senderId === currentUser.id) {
            return;
          }

          this.applyRemoteUpdate(payload.key, payload.data);
          this.currentStatus.lastSync = payload.timestamp || new Date().toISOString();
          this.notifyStatusListeners();
        }
      );

      this.socket.on('bulk_synced', () => {
        this.checkStatus();
      });
    } catch (err) {
      console.warn('Socket.IO initialization error:', err);
    }

    // 3. Register storage middleware to automatically broadcast and sync local changes to VPS
    storageService.registerStorageMiddleware((ctx) => {
      // Do not re-sync if the change arrived from remote
      if (ctx.source === 'remote_sync') return;

      const activeUser = storageService.getActiveUser();
      this.queueStateSync(ctx.key, ctx.data, activeUser);
    });
  }

  public subscribeStatus(listener: StatusChangeListener): () => void {
    this.statusListeners.push(listener);
    listener({ ...this.currentStatus });
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public getStatus(): VpsConnectionStatus {
    return { ...this.currentStatus };
  }

  public async checkStatus(): Promise<VpsConnectionStatus> {
    try {
      const res = await fetch('/api/vps/status');
      if (res.ok) {
        const json = await res.json();
        this.currentStatus = {
          ...this.currentStatus,
          connected: json.connected ?? false,
          engine: json.engine ?? 'local_file',
          databaseUrlConfigured: json.databaseUrlConfigured ?? false,
          host: json.host,
          database: json.database,
          lastSync: json.lastSync || this.currentStatus.lastSync,
          error: json.error
        };
      }
    } catch (err: any) {
      this.currentStatus.error = err?.message || 'Gagal menghubungi server VPS';
    }
    this.notifyStatusListeners();
    return { ...this.currentStatus };
  }

  public async reconnect(): Promise<VpsConnectionStatus> {
    this.currentStatus.isSyncing = true;
    this.notifyStatusListeners();

    try {
      const res = await fetch('/api/vps/reconnect', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        this.currentStatus = {
          ...this.currentStatus,
          connected: json.connected ?? false,
          engine: json.engine ?? 'local_file',
          databaseUrlConfigured: json.databaseUrlConfigured ?? false,
          host: json.host,
          database: json.database,
          lastSync: json.lastSync || new Date().toISOString(),
          error: json.error
        };
      }
    } catch (err: any) {
      this.currentStatus.error = err?.message || 'Gagal menyambung kembali ke VPS';
    } finally {
      this.currentStatus.isSyncing = false;
      this.notifyStatusListeners();
    }
    return { ...this.currentStatus };
  }

  /**
   * Queue a single key state change to be sent to VPS
   */
  private queueStateSync(key: StorageActionType, data: any, user: UserAccount | null) {
    this.syncQueue.set(key, { data, user });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushSyncQueue();
    }, 400);
  }

  /**
   * Flush queue to server via Socket or HTTP
   */
  private async flushSyncQueue() {
    if (this.syncQueue.size === 0) return;

    const items = Array.from(this.syncQueue.entries());
    this.syncQueue.clear();

    for (const [key, { data, user }] of items) {
      const meta = {
        userId: user?.id,
        userName: user?.name
      };

      // Realtime via Socket.IO if connected
      if (this.socket && this.currentStatus.socketConnected) {
        this.socket.emit('sync_state', { key, data, meta });
      }

      // HTTP fallback for persistence guarantee
      try {
        await fetch(`/api/vps/state/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, meta })
        });
        this.currentStatus.lastSync = new Date().toISOString();
        this.notifyStatusListeners();
      } catch (err) {
        console.warn(`[VPS Sync] HTTP save failed for ${key}:`, err);
      }
    }
  }

  /**
   * Push all current localStorage data to VPS database
   */
  public async pushAllDataToVps(): Promise<{ success: boolean; count?: number; error?: string }> {
    this.currentStatus.isSyncing = true;
    this.notifyStatusListeners();

    try {
      const allStates: Record<string, any> = {
        company_profile: storageService.getCompanyProfile(),
        projects: storageService.getProjects(),
        employees: storageService.getEmployees(),
        timesheets: storageService.getTimesheets(),
        mutations: storageService.getMutations(),
        inventory_items: storageService.getInventoryItems(),
        project_stocks: storageService.getProjectStocks(),
        inventory_logs: storageService.getInventoryLogs(),
        material_requests: storageService.getMaterialRequests(),
        tasks: storageService.getTasks(),
        blasts: storageService.getBlasts(),
        sops: storageService.getSops(),
        users: storageService.getUsers(),
        chart_of_accounts: storageService.getChartOfAccounts(),
        finance_transactions: storageService.getFinanceTransactions(),
        bank_statements: storageService.getBankStatements(),
        period_closings: storageService.getPeriodClosings(),
        audit_trails: storageService.getAuditTrails(),
        debts: storageService.getDebts(),
        receivables: storageService.getReceivables(),
        investments: storageService.getInvestments()
      };

      const res = await fetch('/api/vps/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          states: allStates,
          meta: { userId: storageService.getActiveUser()?.id, userName: storageService.getActiveUser()?.name }
        })
      });

      const json = await res.json();
      this.currentStatus.lastSync = new Date().toISOString();
      return { success: Boolean(json.success), count: json.count };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengunggah data ke VPS' };
    } finally {
      this.currentStatus.isSyncing = false;
      this.notifyStatusListeners();
    }
  }

  /**
   * Pull all data from VPS and populate local storage
   */
  public async pullAllDataFromVps(): Promise<{ success: boolean; count?: number; error?: string }> {
    this.currentStatus.isSyncing = true;
    this.notifyStatusListeners();

    try {
      const res = await fetch('/api/vps/states');
      if (!res.ok) throw new Error('Gagal mengambil data dari VPS');

      const json = await res.json();
      const states = json.states;
      if (!states || typeof states !== 'object') {
        return { success: true, count: 0 };
      }

      let count = 0;
      for (const [key, data] of Object.entries(states)) {
        if (data !== undefined && data !== null) {
          this.applyRemoteUpdate(key as StorageActionType, data);
          count++;
        }
      }

      this.currentStatus.lastSync = new Date().toISOString();
      return { success: true, count };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menyinkronkan data dari VPS' };
    } finally {
      this.currentStatus.isSyncing = false;
      this.notifyStatusListeners();
    }
  }

  /**
   * Automatically synchronize with VPS on startup in background
   */
  private async autoSyncOnStartup() {
    try {
      const res = await fetch('/api/vps/states');
      if (!res.ok) return;

      const json = await res.json();
      const states = json.states;
      const keys = states && typeof states === 'object' ? Object.keys(states) : [];

      if (keys.length > 0) {
        // VPS already has records: hydrate local memory silently
        for (const [key, data] of Object.entries(states)) {
          if (data !== undefined && data !== null) {
            this.applyRemoteUpdate(key as StorageActionType, data);
          }
        }
        this.currentStatus.lastSync = new Date().toISOString();
        this.notifyStatusListeners();
      } else {
        // Fresh database: seed VPS with current state automatically
        await this.pushAllDataToVps();
      }
    } catch (err) {
      console.warn('[VPS Auto-Sync] Background startup sync:', err);
    }
  }

  /**
   * Map remote key to storageService setter
   */
  private applyRemoteUpdate(key: StorageActionType, data: any) {
    storageService.saveRemoteState(key, data);
  }

  private notifyStatusListeners() {
    const copy = { ...this.currentStatus };
    this.statusListeners.forEach((l) => {
      try {
        l(copy);
      } catch (err) {
        console.error('Error in status listener:', err);
      }
    });
  }
}

export const vpsSyncService = new VpsSyncService();
