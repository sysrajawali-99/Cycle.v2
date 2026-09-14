import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface VpsDbStatus {
  connected: boolean;
  engine: 'postgresql' | 'local_file';
  databaseUrlConfigured: boolean;
  host?: string;
  database?: string;
  lastSync?: string;
  error?: string;
}

let pgPool: Pool | null = null;
let dbEngine: 'postgresql' | 'local_file' = 'local_file';
let lastSyncTimestamp: string = new Date().toISOString();
let lastError: string | undefined;

// Local fallback storage directory
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(LOCAL_DATA_DIR, 'vps_local_store.json');

function ensureLocalStore() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify({}), 'utf8');
    }
  } catch (err) {
    console.error('Failed to initialize local data directory:', err);
  }
}

function readLocalStore(): Record<string, any> {
  ensureLocalStore();
  try {
    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, any>) {
  ensureLocalStore();
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(store, null, 2), 'utf8');
    lastSyncTimestamp = new Date().toISOString();
  } catch (err) {
    console.error('Failed to write to local data store:', err);
  }
}

/**
 * Initialize PostgreSQL connection if DATABASE_URL is set in environment.
 * Gracefully falls back to local file store if DATABASE_URL is absent or unreachable.
 */
export async function initVpsDatabase(): Promise<VpsDbStatus> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.trim() === '') {
    dbEngine = 'local_file';
    ensureLocalStore();
    return getVpsDbStatus();
  }

  try {
    // Attempt connecting to PostgreSQL
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10
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
      console.log('Successfully connected to VPS PostgreSQL Database');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('PostgreSQL connection attempt failed. Using local storage fallback:', err?.message || err);
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

  if (databaseUrl) {
    try {
      const urlObj = new URL(databaseUrl.replace('postgresql://', 'http://'));
      host = urlObj.host;
      database = urlObj.pathname.replace(/^\//, '');
    } catch {
      host = 'Configured in DATABASE_URL';
    }
  }

  return {
    connected: dbEngine === 'postgresql',
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
      console.error(`PostgreSQL save error for key ${key}:`, err?.message || err);
      // Fallback save to local file
      const store = readLocalStore();
      store[key] = data;
      writeLocalStore(store);
      return false;
    }
  }

  // Local fallback
  const store = readLocalStore();
  store[key] = data;
  writeLocalStore(store);
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
      console.error(`PostgreSQL get error for key ${key}:`, err?.message || err);
    }
  }

  const store = readLocalStore();
  return store[key] !== undefined ? store[key] : null;
}

/**
 * Get all states from database
 */
export async function getAllVpsStates(): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  if (dbEngine === 'postgresql' && pgPool) {
    try {
      const res = await pgPool.query('SELECT key, data FROM rajawali_app_state');
      for (const row of res.rows) {
        result[row.key] = row.data;
      }
      return result;
    } catch (err: any) {
      console.error('PostgreSQL getAll error:', err?.message || err);
    }
  }

  return readLocalStore();
}

/**
 * Bulk save multiple states in single operation
 */
export async function bulkSaveVpsStates(states: Record<string, any>): Promise<number> {
  let count = 0;
  for (const [key, data] of Object.entries(states)) {
    if (data !== undefined && data !== null) {
      await saveVpsState(key, data);
      count++;
    }
  }
  return count;
}
