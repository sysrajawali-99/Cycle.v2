import { createClient } from '@supabase/supabase-js';

// Default Embedded Supabase Project Credentials (Authorized for Super Admin HQ)
export const DEFAULT_SUPABASE_URL = 'https://trytwqpigfswkumpbfrp.supabase.co';
export const DEFAULT_VITE_SUPABASE_URL = 'https://trytwqpigfswkumpbfrp.supabase.co/rest/v1/';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WsYAe5vdbfBKWlKtfbqUgQ_Lls3tbbF';
export const DEFAULT_VITE_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXR3cXBpZ2Zzd2t1bXBiZnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNjQyODUsImV4cCI6MjEwMzY0MDI4NX0.5gntSsIhiVw9c7g7e_KRNw0mOoRpYymEKBSfS607X5M';
export const DEFAULT_SUPABASE_SECRET_KEY = '';
export const DEFAULT_SUPABASE_JWKS_URL = 'https://trytwqpigfswkumpbfrp.supabase.co/auth/v1/.well-known/jwks.json';

// Telegram Bot Credentials
export const DEFAULT_TELEGRAM_BOT_TOKEN = '8810715512:AAHNTN8pwVIuXwfkwQIMHR6LFw_LNvk09qo';
export const DEFAULT_TELEGRAM_GROUP_CHAT_ID = '-1004355969725';

export const STORAGE_KEY_SYSTEM_CONFIG = 'rajawali_custom_supabase_credentials';

export interface SystemConnectionConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  supabaseJwksUrl: string;
  telegramBotToken: string;
  telegramGroupChatId: string;
  lastUpdated?: string;
}

export function getSystemConnectionConfig(): SystemConnectionConfig {
  if (typeof window === 'undefined') {
    return {
      supabaseUrl: DEFAULT_SUPABASE_URL,
      supabasePublishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
      supabaseSecretKey: DEFAULT_SUPABASE_SECRET_KEY,
      supabaseJwksUrl: DEFAULT_SUPABASE_JWKS_URL,
      telegramBotToken: DEFAULT_TELEGRAM_BOT_TOKEN,
      telegramGroupChatId: DEFAULT_TELEGRAM_GROUP_CHAT_ID
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYSTEM_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        supabaseUrl: parsed.supabaseUrl || DEFAULT_SUPABASE_URL,
        supabasePublishableKey: parsed.supabasePublishableKey || parsed.supabaseAnonKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
        supabaseSecretKey: parsed.supabaseSecretKey || DEFAULT_SUPABASE_SECRET_KEY,
        supabaseJwksUrl: parsed.supabaseJwksUrl || DEFAULT_SUPABASE_JWKS_URL,
        telegramBotToken: parsed.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN,
        telegramGroupChatId: parsed.telegramGroupChatId || DEFAULT_TELEGRAM_GROUP_CHAT_ID,
        lastUpdated: parsed.lastUpdated
      };
    }
  } catch (err) {
    console.warn('Error reading system credentials from localStorage:', err);
  }

  return {
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabasePublishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: DEFAULT_SUPABASE_SECRET_KEY,
    supabaseJwksUrl: DEFAULT_SUPABASE_JWKS_URL,
    telegramBotToken: DEFAULT_TELEGRAM_BOT_TOKEN,
    telegramGroupChatId: DEFAULT_TELEGRAM_GROUP_CHAT_ID
  };
}

export function saveSystemConnectionConfig(cfg: Partial<SystemConnectionConfig>): SystemConnectionConfig {
  const current = getSystemConnectionConfig();
  const updated: SystemConnectionConfig = {
    supabaseUrl: (cfg.supabaseUrl ?? current.supabaseUrl).trim(),
    supabasePublishableKey: (cfg.supabasePublishableKey ?? current.supabasePublishableKey).trim(),
    supabaseSecretKey: (cfg.supabaseSecretKey ?? current.supabaseSecretKey).trim(),
    supabaseJwksUrl: (cfg.supabaseJwksUrl ?? current.supabaseJwksUrl).trim(),
    telegramBotToken: (cfg.telegramBotToken ?? current.telegramBotToken).trim(),
    telegramGroupChatId: (cfg.telegramGroupChatId ?? current.telegramGroupChatId).trim(),
    lastUpdated: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SYSTEM_CONFIG, JSON.stringify(updated));
    // Push updated config to server backend so server-side proxy and client routes use it immediately
    fetch('/api/supabase/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
    reinitializeSupabaseClient();
    window.dispatchEvent(new CustomEvent('system_credentials_updated', { detail: updated }));
  }

  return updated;
}

export function resetSystemConnectionConfig(): SystemConnectionConfig {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_SYSTEM_CONFIG);
  }
  const resetCfg: SystemConnectionConfig = {
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabasePublishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: DEFAULT_SUPABASE_SECRET_KEY,
    supabaseJwksUrl: DEFAULT_SUPABASE_JWKS_URL,
    telegramBotToken: DEFAULT_TELEGRAM_BOT_TOKEN,
    telegramGroupChatId: DEFAULT_TELEGRAM_GROUP_CHAT_ID,
    lastUpdated: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    reinitializeSupabaseClient();
    window.dispatchEvent(new CustomEvent('system_credentials_updated', { detail: resetCfg }));
  }

  return resetCfg;
}

// Backward compatibility exports
export const SUPABASE_URL = DEFAULT_SUPABASE_URL;
export const VITE_SUPABASE_URL = DEFAULT_VITE_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = DEFAULT_SUPABASE_PUBLISHABLE_KEY;
export const VITE_SUPABASE_PUBLISHABLE_KEY = DEFAULT_VITE_SUPABASE_PUBLISHABLE_KEY;
export const SUPABASE_SECRET_KEY = DEFAULT_SUPABASE_SECRET_KEY;
export const SUPABASE_JWKS_URL = DEFAULT_SUPABASE_JWKS_URL;
export const TELEGRAM_BOT_TOKEN = DEFAULT_TELEGRAM_BOT_TOKEN;
export const TELEGRAM_GROUP_CHAT_ID = DEFAULT_TELEGRAM_GROUP_CHAT_ID;

export const supabaseUrl: string = DEFAULT_SUPABASE_URL;
export const supabaseAnonKey: string = DEFAULT_SUPABASE_PUBLISHABLE_KEY;

// Active client instance container
function createActiveClient(url: string, key: string) {
  let cleanUrl = (url || DEFAULT_SUPABASE_URL).replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const cleanKey = (key || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim();

  // If running in HTTPS browser and target is HTTP (like http://202.10.34.203),
  // browsers block it as Mixed-Content. Route transparently through our server backend proxy!
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && cleanUrl.startsWith('http://')) {
    cleanUrl = `${window.location.origin}/api/supabase-proxy`;
  }

  try {
    return createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (err) {
    console.error('Error creating active Supabase client:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_PUBLISHABLE_KEY);
  }
}

const initialCfg = getSystemConnectionConfig();
let activeSupabaseClient = createActiveClient(initialCfg.supabaseUrl, initialCfg.supabasePublishableKey);

export function reinitializeSupabaseClient(): any {
  const cfg = getSystemConnectionConfig();
  activeSupabaseClient = createActiveClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  return activeSupabaseClient;
}

// Proxied supabase client that dynamically accesses the active client
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    if (!activeSupabaseClient) {
      reinitializeSupabaseClient();
    }
    const val = (activeSupabaseClient as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activeSupabaseClient);
    }
    return val;
  }
});

/**
 * Utility to test active connectivity to Supabase or VPS PostgreSQL Database
 */
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{ ok: boolean; message: string; details?: any }> {
  const urlToTest = customUrl || getSystemConnectionConfig().supabaseUrl;
  const keyToTest = customKey || getSystemConnectionConfig().supabasePublishableKey;

  // 1. First test via backend server API (avoids browser Mixed-Content / CORS blocking when connecting to HTTP VPS)
  try {
    const srvRes = await fetch('/api/supabase/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabaseUrl: urlToTest, supabaseKey: keyToTest })
    });
    if (srvRes.ok) {
      const srvJson = await srvRes.json();
      if (srvJson.ok) {
        return srvJson;
      }
    }
  } catch {
    // Continue to client-side test fallback
  }

  // 2. Client-side fallback check
  try {
    const clientToTest = (customUrl && customKey)
      ? createActiveClient(customUrl, customKey)
      : (activeSupabaseClient || reinitializeSupabaseClient());

    // Check app_sync_store or projects
    const { data, error } = await clientToTest.from('app_sync_store').select('key', { count: 'exact', head: true });
    if (error) {
      // Fallback check on projects
      const fallback = await clientToTest.from('projects').select('id', { count: 'exact', head: true });
      if (fallback.error && fallback.error.code !== '42P01' && fallback.error.code !== 'PGRST205') {
        return {
          ok: false,
          message: `Koneksi Supabase/VPS gagal: ${error.message} (${error.code || 'ERR'})`,
          details: error
        };
      }
    }
    return {
      ok: true,
      message: 'Koneksi Database VPS/Supabase Aktif, Terverifikasi & Siap Digunakan!',
      details: data
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Error koneksi: ${err?.message || 'Tidak dapat menghubungi server Supabase'}`,
      details: err
    };
  }
}

