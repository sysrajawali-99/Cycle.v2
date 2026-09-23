import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface VpsDbStatus {
  connected: boolean;
  engine: 'postgresql' | 'remote_vps' | 'local_file';
  databaseUrlConfigured: boolean;
  host?: string;
  database?: string;
  lastSync?: string;
  error?: string;
}

let pgPool: Pool | null = null;
let remoteVpsUrl: string | null = null;
let remoteHost: string | undefined;
let remoteDatabase: string | undefined;
let dbEngine: 'postgresql' | 'remote_vps' | 'local_file' = 'local_file';
let lastSyncTimestamp: string = new Date().toISOString();
let lastError: string | undefined;

// Local fallback storage directory
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(LOCAL_DATA_DIR, 'vps_local_store.json');
const LOCAL_DB_BACKUP = path.join(LOCAL_DATA_DIR, 'vps_local_store.backup.json');

const inMemoryCache: Record<string, any> = {};

function ensureLocalStore() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }

    const mainExists = fs.existsSync(LOCAL_DB_FILE);
    const backupExists = fs.existsSync(LOCAL_DB_BACKUP);

    if (mainExists) {
      try {
        const stats = fs.statSync(LOCAL_DB_FILE);
        if (stats.size > 10) {
          if (!backupExists || fs.statSync(LOCAL_DB_BACKUP).size < 10) {
            fs.copyFileSync(LOCAL_DB_FILE, LOCAL_DB_BACKUP);
          }
          return;
        }
      } catch {}
    }

    if (backupExists) {
      try {
        const backupStats = fs.statSync(LOCAL_DB_BACKUP);
        if (backupStats.size > 10) {
          fs.copyFileSync(LOCAL_DB_BACKUP, LOCAL_DB_FILE);
          console.log('[VPS Store] Restored local database from backup file.');
          return;
        }
      } catch {}
    }

    if (!mainExists) {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify({}), 'utf8');
    }
  } catch (err) {
    console.error('Failed to initialize local data directory:', err);
  }
}

function readLocalStore(): Record<string, any> {
  ensureLocalStore();
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return { ...inMemoryCache, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[VPS Store] Error reading primary store, checking backup:', err);
  }

  try {
    if (fs.existsSync(LOCAL_DB_BACKUP)) {
      const rawBackup = fs.readFileSync(LOCAL_DB_BACKUP, 'utf8');
      const parsedBackup = JSON.parse(rawBackup);
      if (parsedBackup && typeof parsedBackup === 'object') {
        return { ...inMemoryCache, ...parsedBackup };
      }
    }
  } catch {}

  return { ...inMemoryCache };
}

function writeLocalStore(store: Record<string, any>) {
  Object.assign(inMemoryCache, store);
  ensureLocalStore();
  try {
    const serialized = JSON.stringify(store, null, 2);
    fs.writeFileSync(LOCAL_DB_FILE, serialized, 'utf8');
    fs.writeFileSync(LOCAL_DB_BACKUP, serialized, 'utf8');
    lastSyncTimestamp = new Date().toISOString();
  } catch (err) {
    console.error('Failed to write to local data store:', err);
  }
}

let inFlightRemoteStatesPromise: Promise<Record<string, any> | null> | null = null;
let lastRemoteSyncSuccessTime = 0;

/**
 * Fetch and synchronize states from remote VPS into local cache with deduplication and retries
 */
export async function fetchStatesFromRemoteVps(url: string, retries = 1): Promise<Record<string, any> | null> {
  if (inFlightRemoteStatesPromise) {
    return inFlightRemoteStatesPromise;
  }

  inFlightRemoteStatesPromise = (async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${url}/api/vps/states`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(20000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.states && typeof json.states === 'object') {
            const local = readLocalStore();
            const merged = { ...local, ...json.states };
            writeLocalStore(merged);
            lastSyncTimestamp = new Date().toISOString();
            lastRemoteSyncSuccessTime = Date.now();
            console.log(`[VPS] Successfully synced ${Object.keys(json.states).length} entities from remote VPS.`);
            return merged;
          }
        }
      } catch (err: any) {
        if (attempt < retries) {
          // Brief backoff before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        const local = readLocalStore();
        if (Object.keys(local).length > 0) {
          console.log(`[VPS] Remote VPS states fetch fallback to local cache (${err?.message || 'offline'}). Serving ${Object.keys(local).length} records.`);
          return local;
        } else {
          console.warn('[VPS] Remote state fetch failed and local cache is empty:', err?.message || err);
        }
      }
    }
    return null;
  })().finally(() => {
    inFlightRemoteStatesPromise = null;
  });

  return inFlightRemoteStatesPromise;
}

/**
 * Initialize VPS Database or Remote Sync based on DATABASE_URL.
 * Supports:
 * 1. Direct PostgreSQL connection strings (postgres://, postgresql://)
 * 2. Remote VPS HTTP/HTTPS endpoints (https://vps.domain.com)
 * 3. Graceful fallback to local file store
 */
export async function initVpsDatabase(): Promise<VpsDbStatus> {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl || rawUrl.trim() === '') {
    dbEngine = 'local_file';
    ensureLocalStore();
    return getVpsDbStatus();
  }

  const databaseUrl = rawUrl.trim();

  // Mode 1: Remote VPS HTTP/HTTPS endpoint
  if (databaseUrl.startsWith('http://') || databaseUrl.startsWith('https://')) {
    const cleanedUrl = databaseUrl.replace(/\/+$/, '');
    remoteVpsUrl = cleanedUrl;
    try {
      const parsedUrl = new URL(cleanedUrl);
      remoteHost = parsedUrl.host;
    } catch {
      remoteHost = cleanedUrl;
    }

    try {
      const res = await fetch(`${cleanedUrl}/api/vps/status`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const statusJson = await res.json();
        dbEngine = 'remote_vps';
        remoteDatabase = statusJson.database || 'rajawali_cycle';
        lastError = undefined;
        lastSyncTimestamp = new Date().toISOString();
        console.log(`[VPS] Connected to Remote VPS API at ${cleanedUrl} (Host: ${remoteHost})`);

        // Synchronize remote data to local store in background with deduplication
        fetchStatesFromRemoteVps(cleanedUrl).catch(() => {});
        return getVpsDbStatus();
      } else {
        throw new Error(`Remote VPS responded with status ${res.status}`);
      }
    } catch (err: any) {
      console.info(`[VPS] Remote VPS ${cleanedUrl} not reachable (${err?.message || 'offline'}). Using local storage fallback.`);
      dbEngine = 'local_file';
      lastError = err?.message || 'Remote VPS tidak dapat dijangkau';
      ensureLocalStore();
      return getVpsDbStatus();
    }
  }

  // Mode 2: Direct PostgreSQL connection
  try {
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10
    });
    pgPool.on('error', (err) => {
      console.warn('[VPS] Unexpected error on idle pgPool client:', err?.message || err);
    });

    const client = await pgPool.connect();
    try {
      // Create main state key-value table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rajawali_app_state (
          key VARCHAR(64) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create sync audit table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rajawali_sync_logs (
          id SERIAL PRIMARY KEY,
          action_key VARCHAR(64) NOT NULL,
          user_id VARCHAR(64),
          user_name VARCHAR(128),
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      dbEngine = 'postgresql';
      lastError = undefined;
      lastSyncTimestamp = new Date().toISOString();
      console.log('[VPS] Successfully connected to VPS PostgreSQL Database');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.info(`[VPS] PostgreSQL connection could not be established (${err?.message || 'offline'}). Using local storage fallback.`);
    dbEngine = 'local_file';
    lastError = err?.message || 'Gagal terhubung ke PostgreSQL';
    ensureLocalStore();
  }

  return getVpsDbStatus();
}

/**
 * Get current database status
 */
export function getVpsDbStatus(): VpsDbStatus {
  const databaseUrl = process.env.DATABASE_URL;
  let host = undefined;
  let database = undefined;

  if (dbEngine === 'remote_vps') {
    host = remoteHost;
    database = remoteDatabase || 'rajawali_cycle';
  } else if (databaseUrl) {
    try {
      const urlObj = new URL(databaseUrl.replace('postgresql://', 'http://'));
      host = urlObj.host;
      database = urlObj.pathname.replace(/^\//, '');
    } catch {
      host = 'Configured in DATABASE_URL';
    }
  }

  return {
    connected: dbEngine === 'postgresql' || dbEngine === 'remote_vps',
    engine: dbEngine,
    databaseUrlConfigured: Boolean(databaseUrl && databaseUrl.trim().length > 0),
    host,
    database,
    lastSync: lastSyncTimestamp,
    error: lastError
  };
}

/**
 * Save single state entry (upsert)
 */
export async function saveVpsState(
  key: string,
  data: any,
  meta?: { userId?: string; userName?: string }
): Promise<boolean> {
  lastSyncTimestamp = new Date().toISOString();

  // 1. Always update local store immediately for instant response
  const store = readLocalStore();
  store[key] = data;
  writeLocalStore(store);

  // 2. If connected to PostgreSQL directly
  if (dbEngine === 'postgresql' && pgPool) {
    try {
      await pgPool.query(
        `
        INSERT INTO rajawali_app_state (key, data, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key)
        DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP
        `,
        [key, JSON.stringify(data)]
      );

      if (meta?.userId || meta?.userName) {
        pgPool
          .query(
            `INSERT INTO rajawali_sync_logs (action_key, user_id, user_name) VALUES ($1, $2, $3)`,
            [key, meta.userId || 'system', meta.userName || 'Anonymous']
          )
          .catch(() => {});
      }
      return true;
    } catch (err: any) {
      console.warn(`[VPS] PostgreSQL save error for key ${key}:`, err?.message || err);
      return false;
    }
  }

  // 3. If connected to Remote VPS via HTTP API
  if (dbEngine === 'remote_vps' && remoteVpsUrl) {
    try {
      fetch(`${remoteVpsUrl}/api/vps/state/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, meta }),
        signal: AbortSignal.timeout(12000)
      }).catch((err) => {
        console.warn(`[VPS] Remote VPS sync failed for key ${key}:`, err?.message || err);
      });
      return true;
    } catch {
      return true;
    }
  }

  return true;
}

/**
 * Get single state entry
 */
export async function getVpsState(key: string): Promise<any | null> {
  if (dbEngine === 'postgresql' && pgPool) {
    try {
      const res = await pgPool.query('SELECT data FROM rajawali_app_state WHERE key = $1', [key]);
      if (res.rows.length > 0) {
        return res.rows[0].data;
      }
      return null;
    } catch (err: any) {
      console.warn(`[VPS] PostgreSQL get error for key ${key}:`, err?.message || err);
    }
  }

  const store = readLocalStore();
  return store[key] !== undefined ? store[key] : null;
}

/**
 * Get all states from database with stale-while-revalidate and in-flight deduplication
 */
export async function getAllVpsStates(): Promise<Record<string, any>> {
  if (dbEngine === 'postgresql' && pgPool) {
    try {
      const res = await pgPool.query('SELECT key, data FROM rajawali_app_state');
      const result: Record<string, any> = {};
      for (const row of res.rows) {
        result[row.key] = row.data;
      }
      return result;
    } catch (err: any) {
      console.warn('[VPS] PostgreSQL getAll error:', err?.message || err);
    }
  }

  if (dbEngine === 'remote_vps' && remoteVpsUrl) {
    const local = readLocalStore();
    const hasLocalData = Object.keys(local).length > 0;
    const isStale = Date.now() - lastRemoteSyncSuccessTime > 30000;

    // Fast return: if local cache has data and is not stale, serve immediately
    if (hasLocalData && !isStale) {
      return local;
    }

    // Stale-while-revalidate: if local cache has data, return it immediately and refresh in background
    if (hasLocalData) {
      fetchStatesFromRemoteVps(remoteVpsUrl).catch(() => {});
      return local;
    }

    // If local cache is empty, wait for remote fetch
    try {
      const remoteData = await fetchStatesFromRemoteVps(remoteVpsUrl);
      if (remoteData && Object.keys(remoteData).length > 0) {
        return remoteData;
      }
    } catch (err: any) {
      console.info('[VPS] Remote states fetch error, using local fallback:', err?.message || err);
    }
  }

  return readLocalStore();
}

/**
 * Bulk save multiple states in single operation
 */
export async function bulkSaveVpsStates(states: Record<string, any>): Promise<number> {
  let count = 0;

  // 1. Save to local store
  const store = readLocalStore();
  for (const [key, data] of Object.entries(states)) {
    if (data !== undefined && data !== null) {
      store[key] = data;
      count++;
    }
  }
  writeLocalStore(store);

  // 2. If PostgreSQL
  if (dbEngine === 'postgresql' && pgPool) {
    for (const [key, data] of Object.entries(states)) {
      if (data !== undefined && data !== null) {
        await saveVpsState(key, data);
      }
    }
    return count;
  }

  // 3. If Remote VPS
  if (dbEngine === 'remote_vps' && remoteVpsUrl) {
    try {
      fetch(`${remoteVpsUrl}/api/vps/bulk-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states }),
        signal: AbortSignal.timeout(20000)
      }).catch((err) => {
        console.warn('[VPS] Remote VPS bulk-sync failed:', err?.message || err);
      });
    } catch {}
  }

  return count;
}
