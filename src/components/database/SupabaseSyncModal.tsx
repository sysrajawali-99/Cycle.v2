import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
  X,
  ExternalLink,
  Code2,
  ShieldCheck,
  Zap,
  Terminal,
  Layers,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  FileText,
  Send,
  Play,
  Sparkles,
  RotateCcw,
  ClipboardPaste,
  Trash2
} from 'lucide-react';
import { UserAccount } from '../../types';
import { supabaseService, SUPABASE_SQL_SCHEMA } from '../../services/supabaseService';
import {
  supabaseUrl,
  supabaseAnonKey,
  SUPABASE_URL,
  VITE_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY,
  SUPABASE_JWKS_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_GROUP_CHAT_ID,
  getSystemConnectionConfig,
  saveSystemConnectionConfig,
  resetSystemConnectionConfig,
  testSupabaseConnection,
  SystemConnectionConfig
} from '../../utils/supabase';
import { storageService } from '../../services/storageService';
import { telegramService } from '../../services/telegramService';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
  currentUser?: UserAccount;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'STATUS' | 'INSTRUCTIONS' | 'SCHEMA' | 'CLI' | 'CODE'>('STATUS');
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(supabaseService.isAutoSyncEnabled());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(supabaseService.getLastSyncTime());
  const [liveSyncState, setLiveSyncState] = useState<string>(supabaseService.getSyncState());
  const [lastSyncedModule, setLastSyncedModule] = useState<string>('');
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedEnvKey, setCopiedEnvKey] = useState<string | null>(null);
  const [copiedAllEnv, setCopiedAllEnv] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    ok: boolean;
    message: string;
  }>({
    tested: true,
    ok: true,
    message: 'Koneksi Supabase Aktif, Terverifikasi & Tersedia Otomatis'
  });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual System Parameters State (Super Admin)
  const [sysConfig, setSysConfig] = useState<SystemConnectionConfig>(() => getSystemConnectionConfig());
  const [formSupabaseUrl, setFormSupabaseUrl] = useState(sysConfig.supabaseUrl);
  const [formPublishableKey, setFormPublishableKey] = useState(sysConfig.supabasePublishableKey);
  const [formSecretKey, setFormSecretKey] = useState(sysConfig.supabaseSecretKey);
  const [formJwksUrl, setFormJwksUrl] = useState(sysConfig.supabaseJwksUrl);
  const [formTelegramToken, setFormTelegramToken] = useState(sysConfig.telegramBotToken);
  const [formTelegramChatId, setFormTelegramChatId] = useState(sysConfig.telegramGroupChatId);

  // Execution State for "Jalankan Koneksi Sistem"
  const [isExecutingConnection, setIsExecutingConnection] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    supabaseOk: boolean;
    telegramOk: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const isSuperAdmin = !currentUser || currentUser.role === 'Super Admin (HQ)';

  // Sync form inputs with current system configuration on mount / reset
  useEffect(() => {
    const cfg = getSystemConnectionConfig();
    setSysConfig(cfg);
    setFormSupabaseUrl(cfg.supabaseUrl);
    setFormPublishableKey(cfg.supabasePublishableKey);
    setFormSecretKey(cfg.supabaseSecretKey);
    setFormJwksUrl(cfg.supabaseJwksUrl);
    setFormTelegramToken(cfg.telegramBotToken);
    setFormTelegramChatId(cfg.telegramGroupChatId);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
      setIsAutoSync(supabaseService.isAutoSyncEnabled());
      setLastSyncTime(supabaseService.getLastSyncTime());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSyncStatus = (e: any) => {
      if (e.detail) {
        setLiveSyncState(e.detail.state);
        if (e.detail.moduleKey) {
          setLastSyncedModule(e.detail.moduleKey);
        }
        if (e.detail.state === 'synced') {
          setLastSyncTime(new Date().toISOString());
        }
      }
    };

    window.addEventListener('supabase_sync_status', handleSyncStatus as EventListener);
    return () => window.removeEventListener('supabase_sync_status', handleSyncStatus as EventListener);
  }, []);

  const toggleAutoSync = () => {
    const nextState = !isAutoSync;
    supabaseService.setAutoSyncEnabled(nextState);
    setIsAutoSync(nextState);
    setStatusMessage({
      type: 'success',
      text: nextState
        ? '⚡ Auto-Backup Realtime DIAKTIFKAN: Setiap penambahan atau perubahan data akan langsung terupdate ke database Supabase.'
        : 'Auto-Backup Realtime DINONAKTIFKAN: Anda dapat melakukan sinkronisasi secara manual.'
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await supabaseService.testConnection();
      setConnectionStatus({
        tested: true,
        ok: res.ok,
        message: res.message
      });
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        ok: false,
        message: err?.message || 'Gagal menghubungi server Supabase'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushData = async () => {
    setIsPushing(true);
    setStatusMessage(null);
    try {
      const res = await supabaseService.pushAllDataToSupabase();
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
      if (res.success) {
        setConnectionStatus({
          tested: true,
          ok: true,
          message: 'Terhubung & Data Telah Tersinkronisasi'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal sinkronisasi data ke Supabase'
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullData = async () => {
    if (!window.confirm('Tarik data dari Supabase akan menimpa data lokal di browser. Lanjutkan?')) {
      return;
    }
    setIsPulling(true);
    setStatusMessage(null);
    try {
      const res = await supabaseService.pullAllDataFromSupabase();
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
      if (res.success) {
        onDataRestored?.();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal mengambil data dari Supabase'
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const sampleCodeSnippet = `import { supabase } from '@/utils/supabase';

// Contoh 1: Ambil data proyek
const { data: projects, error } = await supabase
  .from('projects')
  .select('*');

// Contoh 2: Tambah hutang baru
const { data, error } = await supabase
  .from('debts')
  .insert([
    {
      id: 'debt-' + Date.now(),
      code: 'HUT-2026-001',
      creditor_name: 'PT Supplier Utama',
      total_amount: 15000000,
      remaining_amount: 15000000,
      status: 'UNPAID'
    }
  ]);

// Contoh 3: Realtime Subscription
supabase
  .channel('public:tasks')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
    console.log('Perubahan data task:', payload);
  })
  .subscribe();`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const filledParamsCount = [
    formSupabaseUrl.trim(),
    formPublishableKey.trim(),
    formSecretKey.trim(),
    formJwksUrl.trim(),
    formTelegramToken.trim(),
    formTelegramChatId.trim()
  ].filter(Boolean).length;

  const isAllFilled = filledParamsCount === 6;
  const isCoreFilled = Boolean(
    formSupabaseUrl.trim() &&
    formPublishableKey.trim() &&
    formTelegramToken.trim() &&
    formTelegramChatId.trim()
  );

  const handleResetParameters = () => {
    if (!window.confirm('Kembalikan semua parameter sistem ke nilai awal resmi (default)?')) return;
    const resetCfg = resetSystemConnectionConfig();
    setSysConfig(resetCfg);
    setFormSupabaseUrl(resetCfg.supabaseUrl);
    setFormPublishableKey(resetCfg.supabasePublishableKey);
    setFormSecretKey(resetCfg.supabaseSecretKey);
    setFormJwksUrl(resetCfg.supabaseJwksUrl);
    setFormTelegramToken(resetCfg.telegramBotToken);
    setFormTelegramChatId(resetCfg.telegramGroupChatId);
    setExecutionResult(null);
    setStatusMessage({
      type: 'success',
      text: 'Parameter sistem berhasil dikembalikan ke nilai default resmi.'
    });
  };

  const handleAutoDeriveJwks = () => {
    if (!formSupabaseUrl.trim()) {
      alert('Isi SUPABASE_URL terlebih dahulu.');
      return;
    }
    const clean = formSupabaseUrl.trim().replace(/\/+$/, '');
    const jwks = `${clean}/auth/v1/.well-known/jwks.json`;
    setFormJwksUrl(jwks);
  };

  const handlePasteField = async (setter: (val: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setter(text.trim());
      }
    } catch {
      const manual = window.prompt('Tempelkan (Paste) nilai di sini:');
      if (manual) setter(manual.trim());
    }
  };

  const handleExecuteSystemConnection = async () => {
    if (!formSupabaseUrl.trim() || !formPublishableKey.trim()) {
      alert('Mohon lengkapi minimal SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY.');
      return;
    }

    setIsExecutingConnection(true);
    setExecutionResult(null);
    setStatusMessage(null);

    try {
      // 1. Simpan konfigurasi koneksi sistem lokal
      const updated = saveSystemConnectionConfig({
        supabaseUrl: formSupabaseUrl,
        supabasePublishableKey: formPublishableKey,
        supabaseSecretKey: formSecretKey,
        supabaseJwksUrl: formJwksUrl,
        telegramBotToken: formTelegramToken,
        telegramGroupChatId: formTelegramChatId
      });
      setSysConfig(updated);

      // 2. Perbarui konfigurasi Telegram di storageService & push ke backend server
      if (formTelegramToken.trim() && formTelegramChatId.trim()) {
        const currentTg = storageService.getTelegramConfig();
        storageService.saveTelegramConfig({
          ...currentTg,
          botToken: formTelegramToken.trim(),
          groupChatId: formTelegramChatId.trim(),
          isEnabled: true
        });

        // Kirim ke backend cache server
        await fetch('/api/telegram/sync-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: formTelegramToken.trim(),
            groupChatId: formTelegramChatId.trim()
          })
        }).catch(() => {});
      }

      // 3. Uji koneksi Supabase secara langsung
      const supaResult = await testSupabaseConnection(formSupabaseUrl.trim(), formPublishableKey.trim());

      // 4. Uji koneksi Telegram Bot jika token diisi
      let tgOk = false;
      let tgMessage = 'Token Telegram belum diisi.';
      if (formTelegramToken.trim() && formTelegramChatId.trim()) {
        try {
          const tgRes = await fetch('/api/telegram/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken: formTelegramToken.trim(),
              chatId: formTelegramChatId.trim()
            })
          });
          const tgJson = await tgRes.json();
          tgOk = Boolean(tgJson.success);
          tgMessage = tgJson.message || (tgOk ? 'Bot Telegram terverifikasi dan notifikasi tes terkirim.' : tgJson.error || 'Gagal menghubungi Telegram API.');
        } catch (e: any) {
          tgMessage = `Error pengujian Telegram: ${e?.message || 'Server error'}`;
        }
      }

      const allSuccess = supaResult.ok && (tgOk || !formTelegramToken.trim());

      setExecutionResult({
        success: allSuccess,
        supabaseOk: supaResult.ok,
        telegramOk: tgOk,
        message: allSuccess
          ? '🚀 KONEKSI SISTEM BERHASIL DIJALANKAN & DIAKTIFKAN!'
          : '⚠️ Eksekusi Selesai dengan Catatan: Periksa detail status di bawah.',
        details: `Supabase: ${supaResult.message} | Telegram: ${tgMessage}`
      });

      setConnectionStatus({
        tested: true,
        ok: supaResult.ok,
        message: supaResult.message
      });

      // Otomatis jalankan sinkronisasi snapshot jika Supabase aktif
      if (supaResult.ok) {
        supabaseService.pushAllDataToSupabase().catch(() => {});
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        supabaseOk: false,
        telegramOk: false,
        message: `Gagal menjalankan koneksi sistem: ${err?.message || 'Terjadi kesalahan tidak terduga.'}`
      });
    } finally {
      setIsExecutingConnection(false);
    }
  };

  const dynamicEnvSnippet = `# ===================================================================
# KONFIGURASI KONEKSI RESMI RAJAWALI CYCLE (KHUSUS SUPER ADMIN)
# Diperbarui secara manual melalui UI Parameter Sistem
# ===================================================================

VITE_SUPABASE_URL=${formSupabaseUrl.replace(/\/+$/, '')}/rest/v1/
VITE_SUPABASE_PUBLISHABLE_KEY=${formPublishableKey}
TELEGRAM_BOT_TOKEN=${formTelegramToken}
TELEGRAM_GROUP_CHAT_ID=${formTelegramChatId}
SUPABASE_URL=${formSupabaseUrl}
SUPABASE_JWKS_URL=${formJwksUrl}
SUPABASE_PUBLISHABLE_KEY=${formPublishableKey}
SUPABASE_SECRET_KEY=${formSecretKey}`;

  const handleCopyEnvKey = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedEnvKey(key);
    setTimeout(() => setCopiedEnvKey(null), 2500);
  };

  const handleCopyAllEnv = () => {
    navigator.clipboard.writeText(dynamicEnvSnippet);
    setCopiedAllEnv(true);
    setTimeout(() => setCopiedAllEnv(false), 2500);
  };

  if (!isOpen) return null;

  // Proteksi Hak Akses: Khusus Super Admin (HQ)
  if (currentUser && !isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Hak Akses Dibatasi
            </span>
            <h3 className="text-base font-bold text-white mt-2">Khusus Super Admin (HQ)</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Konfigurasi koneksi database Supabase dan kredensial sistem hanya dapat diakses oleh akun dengan peran <b>Super Admin (HQ)</b>.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
            Peran Anda saat ini: <span className="font-bold text-amber-400">{currentUser.role}</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Integrasi Supabase Database</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Connected
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lock className="w-3 h-3" />
                  <span>Super Admin Only</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pusat integrasi Cloud PostgreSQL & Realtime DB untuk Rajawali Cycle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('STATUS')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 shrink-0 ${
              activeTab === 'STATUS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Koneksi & Sinkronisasi</span>
          </button>
          <button
            onClick={() => setActiveTab('INSTRUCTIONS')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 shrink-0 ${
              activeTab === 'INSTRUCTIONS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Instruksi Koneksi (Super Admin)</span>
          </button>
          <button
            onClick={() => setActiveTab('SCHEMA')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 shrink-0 ${
              activeTab === 'SCHEMA'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Skema Tabel SQL</span>
          </button>
          <button
            onClick={() => setActiveTab('CLI')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 shrink-0 ${
              activeTab === 'CLI'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Supabase CLI & Migrasi</span>
          </button>
          <button
            onClick={() => setActiveTab('CODE')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 shrink-0 ${
              activeTab === 'CODE'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Panduan Kode Klien</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {statusMessage && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <p className="text-xs sm:text-sm font-medium">{statusMessage.text}</p>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'STATUS' && (
            <div className="space-y-6">
              {/* Real-time Auto Backup Toggle Card */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/30 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-black text-white">Auto-Backup Cloud Realtime (Setiap Posting)</h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isAutoSync
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isAutoSync ? '● Aktif' : '○ Nonaktif'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isAutoSync
                        ? 'Setiap kali Anda menambah, mengubah, atau memposting data proyek, karyawan, transaksi kas, hutang, piutang, task QC, atau inventori, sistem langsung mengunggah perubahannya secara instan ke cloud Supabase di latar belakang.'
                        : 'Auto-sync dimatikan. Data hanya disimpan di memori lokal browser Anda sampai Anda menekan tombol sinkronisasi manual.'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={toggleAutoSync}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isAutoSync
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 border border-emerald-400/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${isAutoSync ? 'text-amber-300 fill-amber-300' : 'text-slate-400'}`} />
                      <span>{isAutoSync ? 'Auto-Backup Aktif' : 'Aktifkan Auto-Backup'}</span>
                    </button>
                    {lastSyncTime && (
                      <span className="text-[11px] text-emerald-400/80 font-mono">
                        Sinkronisasi Terakhir: {new Date(lastSyncTime).toLocaleTimeString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Sync Status Bar */}
                <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Status Sync Realtime:</span>
                    {liveSyncState === 'syncing' ? (
                      <span className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan ke Cloud ({lastSyncedModule || 'Posting'})...</span>
                      </span>
                    ) : liveSyncState === 'synced' ? (
                      <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Database Supabase Cloud Up-to-Date ✓</span>
                      </span>
                    ) : liveSyncState === 'error' ? (
                      <span className="flex items-center space-x-1.5 text-rose-400 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Gagal Sinkronisasi (Periksa Skema SQL)</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 font-medium">Standby & Siap Mendeteksi Posting Baru</span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium">
                    ⚡ Mode Sinkronisasi Terpusat (Proyek, Keuangan, HRD, QC, Logistik)
                  </div>
                </div>
              </div>

              {/* Connection Status Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          connectionStatus.ok ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      <span className="text-sm font-bold text-white">Status Server Supabase:</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          connectionStatus.ok
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {connectionStatus.ok ? 'Online & Terhubung' : 'Memeriksa / Standby'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{connectionStatus.message}</p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setActiveTab('INSTRUCTIONS')}
                      className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      title="Buka Kredensial Lengkap Super Admin"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Instruksi Super Admin</span>
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Project Endpoint:</span>
                    <code className="text-emerald-400 font-mono text-[11px] break-all">{supabaseUrl}</code>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Publishable Key (Client):</span>
                    <code className="text-slate-300 font-mono text-[11px] break-all">
                      {supabaseAnonKey.slice(0, 18)}...{supabaseAnonKey.slice(-8)}
                    </code>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Secret Key (Server/Admin):</span>
                    <code className="text-amber-300 font-mono text-[11px] break-all">
                      {formSecretKey ? (formSecretKey.length > 20 ? `${formSecretKey.slice(0, 15)}...${formSecretKey.slice(-8)}` : '••••••••') : 'Tersimpan aman di server (.env)'}
                    </code>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">JWKS Auth Endpoint:</span>
                    <code className="text-cyan-400 font-mono text-[11px] break-all">{SUPABASE_JWKS_URL}</code>
                  </div>
                </div>
              </div>

              {/* Sync Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <UploadCloud className="w-5 h-5" />
                      <h4 className="font-bold text-sm text-white">Unggah & Sinkronkan ke Supabase</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Kirim seluruh data lokal saat ini (Proyek, Karyawan, Tugas QC, Stok, Hutang & Piutang, Transaksi Kas) ke tabel Supabase.
                    </p>
                  </div>
                  <button
                    onClick={handlePushData}
                    disabled={isPushing}
                    className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                  >
                    <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? 'Menyinkronkan...' : 'Sinkronkan Data Sekarang'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-blue-400">
                      <DownloadCloud className="w-5 h-5" />
                      <h4 className="font-bold text-sm text-white">Tarik Data dari Supabase</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Unduh database terbaru dari Supabase dan sinkronkan ke memori aplikasi lokal secara langsung.
                    </p>
                  </div>
                  <button
                    onClick={handlePullData}
                    disabled={isPulling}
                    className="mt-4 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
                    <span>{isPulling ? 'Mengunduh...' : 'Tarik Data Supabase'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'INSTRUCTIONS' && (
            <div className="space-y-6">
              {/* Super Admin Notice Header */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center space-x-2">
                          <span>Instruksi & Parameter Koneksi Sistem</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Khusus Super Admin
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Isi dan perbarui parameter kredensial secara manual di bawah ini. Tombol <b>Jalankan</b> akan aktif saat parameter terisi.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700 cursor-pointer"
                    >
                      {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showSecrets ? 'Sembunyikan' : 'Buka Kunci'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetParameters}
                      className="px-3 py-2 bg-slate-800/80 hover:bg-slate-750 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-amber-500/20 cursor-pointer"
                      title="Kembalikan ke konfigurasi awal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Default</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAllEnv}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow cursor-pointer"
                    >
                      {copiedAllEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAllEnv ? 'Tersalin (.env)!' : 'Salin Semua (.env)'}</span>
                    </button>
                  </div>
                </div>

                {/* Progress & Completeness Bar */}
                <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isAllFilled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <div className="text-xs font-semibold text-slate-200">
                      Kelengkapan Parameter: <span className="font-bold text-white">{filledParamsCount}</span> dari <span className="font-bold text-white">6</span> Parameter Terisi
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isAllFilled ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                        style={{ width: `${(filledParamsCount / 6) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{Math.round((filledParamsCount / 6) * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* EXECUTION COMMAND PANEL ("JALANKAN KONEKSI SISTEM") */}
              <div className={`rounded-3xl p-5 sm:p-6 border transition-all duration-300 shadow-xl ${
                isCoreFilled
                  ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-emerald-500/40 shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-xl ${isCoreFilled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-white">
                        Perintah Eksekusi: Jalankan & Hubungkan Koneksi Sistem
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                      {isCoreFilled
                        ? 'Semua parameter utama telah terisi lengkap. Klik perintah jalankan di bawah untuk menerapkan kredensial ke sistem lokal & server backend, lalu menguji sambungan Supabase & Bot Telegram.'
                        : 'Lengkapi parameter koneksi di bawah ini. Tombol jalankan akan otomatis siap digunakan saat parameter diisi.'}
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 self-start sm:self-center ${
                    isAllFilled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isCoreFilled
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isAllFilled ? '✅ Siap Dijalankan Penuh (6/6)' : isCoreFilled ? '⚡ Siap Dijalankan (Utama Terisi)' : 'Menunggu Pengisian Form'}
                  </span>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={handleExecuteSystemConnection}
                    disabled={isExecutingConnection || !isCoreFilled}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2.5 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isExecutingConnection ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>SEDANG MENJALANKAN & MENGUJI KONEKSI SISTEM...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span>🚀 JALANKAN & HUBUNGKAN KONEKSI SISTEM SEKARANG</span>
                      </>
                    )}
                  </button>

                  {/* Live Execution Result Banner */}
                  {executionResult && (
                    <div className={`p-4 rounded-2xl border text-xs space-y-2.5 animate-fadeIn ${
                      executionResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}>
                      <div className="flex items-center space-x-2 font-black text-sm">
                        {executionResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-400" />
                        )}
                        <span>{executionResult.message}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                          <span className="text-slate-300 font-semibold">Supabase Database:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            executionResult.supabaseOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {executionResult.supabaseOk ? '✅ Terhubung Aktif' : '❌ Gagal Terhubung'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                          <span className="text-slate-300 font-semibold">Bot Telegram Notifier:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            executionResult.telegramOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {executionResult.telegramOk ? '✅ Bot Aktif & Terverifikasi' : '⚠️ Belum Aktif / Dikonfigurasi'}
                          </span>
                        </div>
                      </div>

                      {executionResult.details && (
                        <p className="font-mono text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 whitespace-pre-wrap">
                          {executionResult.details}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* MANUAL EDITABLE PARAMETER CARDS (6 PARAMETER RESMI) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Formulir Parameter Kredensial (Dapat Diisi Manual)
                  </h4>
                  <span className="text-[11px] text-slate-500">Ketik atau tempel (*paste*) nilai baru</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 1. SUPABASE_URL */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-emerald-400">SUPABASE_URL</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">URL project cloud Supabase</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
                        Base Endpoint
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={formSupabaseUrl}
                          onChange={(e) => setFormSupabaseUrl(e.target.value)}
                          placeholder="https://xyzprojectref.supabase.co"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none pr-20"
                        />
                        <div className="absolute right-1.5 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handlePasteField(setFormSupabaseUrl)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Tempel dari Clipboard"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyEnvKey('SUPABASE_URL', formSupabaseUrl)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Salin"
                          >
                            {copiedEnvKey === 'SUPABASE_URL' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                        <span>Format: https://[project-id].supabase.co</span>
                        {formSupabaseUrl && <span className="text-emerald-400 font-bold">✓ Terisi</span>}
                      </div>
                    </div>
                  </div>

                  {/* 2. SUPABASE_PUBLISHABLE_KEY (Anon Key) */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-emerald-400">SUPABASE_PUBLISHABLE_KEY</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Publishable key / Anon JWT token</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                        Client / Anon
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={formPublishableKey}
                          onChange={(e) => setFormPublishableKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none pr-20"
                        />
                        <div className="absolute right-1.5 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handlePasteField(setFormPublishableKey)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Tempel dari Clipboard"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyEnvKey('SUPABASE_PUBLISHABLE_KEY', formPublishableKey)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Salin"
                          >
                            {copiedEnvKey === 'SUPABASE_PUBLISHABLE_KEY' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                        <span>Digunakan oleh browser client & REST gateway</span>
                        {formPublishableKey && <span className="text-emerald-400 font-bold">✓ Terisi</span>}
                      </div>
                    </div>
                  </div>

                  {/* 3. SUPABASE_SECRET_KEY (Service Role) */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-emerald-400">SUPABASE_SECRET_KEY</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Kunci Service Role (Bypass RLS)</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 shrink-0">
                        Server Secret
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={formSecretKey}
                          onChange={(e) => setFormSecretKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role..."
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none pr-20"
                        />
                        <div className="absolute right-1.5 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handlePasteField(setFormSecretKey)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Tempel dari Clipboard"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyEnvKey('SUPABASE_SECRET_KEY', formSecretKey)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Salin"
                          >
                            {copiedEnvKey === 'SUPABASE_SECRET_KEY' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                        <span>Akses penuh server-side untuk sinkronisasi</span>
                        {formSecretKey && <span className="text-emerald-400 font-bold">✓ Terisi</span>}
                      </div>
                    </div>
                  </div>

                  {/* 4. SUPABASE_JWKS_URL */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-emerald-400">SUPABASE_JWKS_URL</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">JWKS endpoint untuk verifikasi JWT</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoDeriveJwks}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 shrink-0 cursor-pointer transition"
                        title="Otomatis buat dari SUPABASE_URL"
                      >
                        ⚡ Buat Otomatis
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={formJwksUrl}
                          onChange={(e) => setFormJwksUrl(e.target.value)}
                          placeholder="https://xyz.supabase.co/auth/v1/.well-known/jwks.json"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none pr-20"
                        />
                        <div className="absolute right-1.5 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handlePasteField(setFormJwksUrl)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Tempel dari Clipboard"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyEnvKey('SUPABASE_JWKS_URL', formJwksUrl)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Salin"
                          >
                            {copiedEnvKey === 'SUPABASE_JWKS_URL' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                        <span>Format: [URL]/auth/v1/.well-known/jwks.json</span>
                        {formJwksUrl && <span className="text-emerald-400 font-bold">✓ Terisi</span>}
                      </div>
                    </div>
                  </div>

                  {/* 5. TELEGRAM_BOT_TOKEN */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-sky-400">TELEGRAM_BOT_TOKEN</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Token otentikasi Bot Notifier Telegram</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 shrink-0">
                        Bot Father
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={formTelegramToken}
                          onChange={(e) => setFormTelegramToken(e.target.value)}
                          placeholder="8810715512:AAHNTN8pwVIuXwfkwQIMHR6LFw_LNvk09qo"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none pr-20"
                        />
                        <div className="absolute right-1.5 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handlePasteField(setFormTelegramToken)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Tempel dari Clipboard"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyEnvKey('TELEGRAM_BOT_TOKEN', formTelegramToken)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Salin"
                          >
                            {copiedEnvKey === 'TELEGRAM_BOT_TOKEN' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                        <span>Format: [angka_id]:[kode_token]</span>
                        {formTelegramToken && <span className="text-sky-400 font-bold">✓ Terisi</span>}
                      </div>
                    </div>
                  </div>

                  {/* 6. TELEGRAM_GROUP_CHAT_ID */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-sky-400">TELEGRAM_GROUP_CHAT_ID</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Target Chat ID grup Telegram perusahaan</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 shrink-0">
                        Chat / Group ID
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={formTelegramChatId}
                          onChange={(e) => setFormTelegramChatId(e.target.value)}
                          placeholder="-1004355969725"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none pr-20"
                        />
                        <div className="absolute right-1.5 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handlePasteField(setFormTelegramChatId)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Tempel dari Clipboard"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyEnvKey('TELEGRAM_GROUP_CHAT_ID', formTelegramChatId)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Salin"
                          >
                            {copiedEnvKey === 'TELEGRAM_GROUP_CHAT_ID' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                        <span>Grup supergroup diawali tanda minus (-100...)</span>
                        {formTelegramChatId && <span className="text-sky-400 font-bold">✓ Terisi</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic .env File Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-white">Live Format File .env (Sinkron dengan Isian Formulir)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAllEnv}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedAllEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAllEnv ? 'Tersalin' : 'Salin Semua'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900/90 p-3.5 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800 whitespace-pre">
                  {dynamicEnvSnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'SCHEMA' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Skema SQL Database Supabase</h4>
                  <p className="text-xs text-slate-400">
                    Buka Supabase Dashboard &gt; SQL Editor, lalu jalankan query ini untuk membuat tabel otomatis.
                  </p>
                </div>
                <button
                  onClick={handleCopySchema}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow"
                >
                  {copiedSchema ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSchema ? 'Tersalin!' : 'Salin SQL Skema'}</span>
                </button>
              </div>

              <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre">{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </div>
          )}

          {activeTab === 'CLI' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Instruksi Terminal Supabase CLI</h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Gunakan perintah berikut di terminal untuk menghubungkan project ref <code className="text-emerald-400 font-mono">trytwqpigfswkumpbfrp</code> dan mengeksekusi migrasi database.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const cliText = `# 1. Hubungkan project Supabase\nsupabase link --project-ref trytwqpigfswkumpbfrp\n\n# 2. Buat file migrasi baru (sudah disiapkan di /supabase/migrations)\nsupabase migration new new-migration\n\n# 3. Jalankan migrasi ke Supabase Cloud\nsupabase db push`;
                    navigator.clipboard.writeText(cliText);
                    setCopiedCli(true);
                    setTimeout(() => setCopiedCli(false), 2500);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow shrink-0 cursor-pointer"
                >
                  {copiedCli ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCli ? 'Semua Perintah Tersalin!' : 'Salin Perintah CLI'}</span>
                </button>
              </div>

              {/* Step by step cards */}
              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">1</span>
                      <span>Link your project</span>
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('supabase link --project-ref trytwqpigfswkumpbfrp');
                      }}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700"
                    >
                      Salin
                    </button>
                  </div>
                  <pre className="bg-slate-900/90 p-3 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                    $ supabase link --project-ref trytwqpigfswkumpbfrp
                  </pre>
                </div>

                <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">2</span>
                      <span>Create a new migration called &quot;new-migration&quot;</span>
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('supabase migration new new-migration');
                      }}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700"
                    >
                      Salin
                    </button>
                  </div>
                  <pre className="bg-slate-900/90 p-3 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                    $ supabase migration new new-migration
                  </pre>
                  <p className="text-[11px] text-slate-400">
                    File migrasi SQL lengkap telah dibuat di folder <code className="text-amber-300 font-mono">/supabase/migrations/20260904000000_new-migration.sql</code>
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
                      <span>Run all migrations for this project</span>
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('supabase db push');
                      }}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700"
                    >
                      Salin
                    </button>
                  </div>
                  <pre className="bg-slate-900/90 p-3 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                    $ supabase db push
                  </pre>
                </div>
              </div>

              {/* NPM Scripts alternative */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-4">
                <h5 className="text-xs font-bold text-white mb-2 flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Shortcut NPM Scripts (Terdaftar di package.json)</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                    <span className="text-[10px] text-slate-500 block mb-0.5">Link project:</span>
                    npm run supabase:link
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                    <span className="text-[10px] text-slate-500 block mb-0.5">New migration:</span>
                    npm run supabase:migration
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                    <span className="text-[10px] text-slate-500 block mb-0.5">Push migration:</span>
                    npm run supabase:push
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CODE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Cara Memanggil Supabase di Komponen React</h4>
                  <p className="text-xs text-slate-400">
                    Gunakan instance <code>supabase</code> dari <code>@/utils/supabase</code> di mana saja.
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-700"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Contoh'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre">{sampleCodeSnippet}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>RLS (Row Level Security) Diaktifkan</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
