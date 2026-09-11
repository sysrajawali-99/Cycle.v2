export interface VpsSyncConfig {
  vpsUrl: string; // e.g. http://vps.rtisystem.my.id
  fallbackIp?: string; // e.g. http://202.10.34.203
  apiKey?: string; // Optional security auth key
  autoSyncEnabled: boolean; // Real-time upload on data mutations
  syncIntervalSeconds: number; // Periodic pull frequency (in seconds, default 25)
  lastSyncTime?: string; // ISO timestamp
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
  connectionState?: 'connected' | 'disconnected' | 'checking';
  activeTarget?: string;
  lastCheckedTime?: string;
  serverHostname?: string;
  serverPlatform?: string;
  serverUptime?: number;
}

export interface VpsBackupSnapshot {
  id: string;
  filename: string;
  timestamp: string;
  sizeBytes: number;
  author: string;
  note?: string;
  summary: {
    totalProjects: number;
    totalEmployees: number;
    totalTimesheets: number;
    totalTasks: number;
    totalFinanceTransactions: number;
    totalInventoryItems: number;
    totalUsers: number;
  };
}

export interface VpsStatusResponse {
  status: 'ok' | 'error';
  platform: string;
  hostname?: string;
  osRelease?: string;
  nodeVersion: string;
  uptimeSeconds: number;
  hasLiveDatabase: boolean;
  liveLastModified?: string;
  liveRecordsSummary?: {
    totalProjects: number;
    totalEmployees: number;
    totalTimesheets: number;
    totalTasks: number;
    totalFinanceTransactions: number;
    totalInventoryItems: number;
    totalUsers: number;
  };
  totalSnapshots: number;
  diskUsageEstimateKb?: number;
  message?: string;
}

export type { DatabaseBackupSnapshot } from '../services/googleDriveService';
