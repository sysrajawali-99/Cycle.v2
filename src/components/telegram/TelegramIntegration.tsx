import React, { useState, useEffect } from 'react';
import {
  Send,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Key,
  Hash,
  Play,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  HelpCircle,
  Package,
  ListChecks,
  MessageSquare,
  Clock,
  Power,
  Layers,
  ArrowUpRight,
  Search,
  ClipboardPaste
} from 'lucide-react';
import { TelegramBotConfig, TelegramLogItem, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { telegramService } from '../../services/telegramService';
import { getSystemConnectionConfig, saveSystemConnectionConfig } from '../../utils/supabase';

interface TelegramIntegrationProps {
  currentUser?: UserAccount;
}

export const TelegramIntegration: React.FC<TelegramIntegrationProps> = ({ currentUser }) => {
  const [config, setConfig] = useState<TelegramBotConfig>(() => storageService.getTelegramConfig());
  const [logs, setLogs] = useState<TelegramLogItem[]>(() => storageService.getTelegramLogs());
  const [activeTab, setActiveTab] = useState<'config' | 'notifications' | 'simulator' | 'logs'>('config');

  // Input form states
  const [botToken, setBotToken] = useState(config.botToken || '8810715512:AAHNTN8pwVIuXwfkwQIMHR6LFw_LNvk09qo');
  const [groupChatId, setGroupChatId] = useState(config.groupChatId || '-1004355969725');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Execution state for "JALANKAN BOT TELEGRAM"
  const [isExecutingTelegram, setIsExecutingTelegram] = useState(false);
  const [telegramExecutionResult, setTelegramExecutionResult] = useState<{
    success: boolean;
    botName?: string;
    botUsername?: string;
    message: string;
    webhookOk?: boolean;
  } | null>(null);

  const isSuperAdmin = !currentUser || currentUser.role === 'Super Admin (HQ)';

  // Testing & Webhook states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Group Chat ID Auto-Detection States
  const [isDetectingChatId, setIsDetectingChatId] = useState(false);
  const [detectedChats, setDetectedChats] = useState<Array<{ id: number | string; title?: string; type: string; username?: string; lastMessage?: string }>>([]);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);

  // Simulator states
  const [simCategory, setSimCategory] = useState<'all' | 'ops' | 'hrd' | 'finance' | 'ai'>('all');
  const [simCommand, setSimCommand] = useState<string>('/stok');
  const [simCustomQuery, setSimCustomQuery] = useState<string>('');
  const [simResponse, setSimResponse] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load config & listen to storage updates
  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
        setBotToken(e.detail.botToken || '');
        setGroupChatId(e.detail.groupChatId || '');
      }
    };
    const handleLogsUpdate = (e: any) => {
      if (e.detail) {
        setLogs(e.detail);
      }
    };

    window.addEventListener('telegram_config_updated', handleConfigUpdate);
    window.addEventListener('telegram_logs_updated', handleLogsUpdate);

    // Initial background sync to backend
    telegramService.syncSnapshotToBackend();

    return () => {
      window.removeEventListener('telegram_config_updated', handleConfigUpdate);
      window.removeEventListener('telegram_logs_updated', handleLogsUpdate);
    };
  }, []);

  const handleSaveConfig = () => {
    setIsSaving(true);
    const updated: TelegramBotConfig = {
      ...config,
      botToken: botToken.trim(),
      groupChatId: groupChatId.trim(),
      isEnabled: config.isEnabled
    };
    storageService.saveTelegramConfig(updated);
    setConfig(updated);

    // Also sync current data snapshot
    telegramService.syncSnapshotToBackend();

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  const handleToggleMasterEnable = () => {
    const updated: TelegramBotConfig = {
      ...config,
      isEnabled: !config.isEnabled
    };
    storageService.saveTelegramConfig(updated);
    setConfig(updated);
  };

  const handleToggleTrigger = (key: keyof TelegramBotConfig) => {
    const updated: TelegramBotConfig = {
      ...config,
      [key]: !config[key]
    };
    storageService.saveTelegramConfig(updated);
    setConfig(updated);
  };

  const handleTestConnection = async () => {
    if (!botToken.trim()) {
      setTestResult({ success: false, message: 'Masukkan Bot Token terlebih dahulu.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    // First save current values
    const currentConfig: TelegramBotConfig = {
      ...config,
      botToken: botToken.trim(),
      groupChatId: groupChatId.trim()
    };
    storageService.saveTelegramConfig(currentConfig);

    const result = await telegramService.testConnection(botToken.trim(), groupChatId.trim());
    setIsTesting(false);

    if (result.success) {
      setTestResult({
        success: true,
        message: `Terhubung dengan ${result.botInfo?.first_name} (@${result.botInfo?.username})! ${
          groupChatId ? 'Pesan uji coba berhasil dikirim ke grup.' : 'Token valid. Masukkan Group Chat ID untuk menguji pengiriman pesan.'
        }`
      });
      // Update bot info in config
      if (result.botInfo) {
        const withBotInfo: TelegramBotConfig = {
          ...currentConfig,
          botUsername: result.botInfo.username,
          botFirstName: result.botInfo.first_name,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'success'
        };
        storageService.saveTelegramConfig(withBotInfo);
        setConfig(withBotInfo);
      }
      setLogs(storageService.getTelegramLogs());
    } else {
      setTestResult({
        success: false,
        message: result.error || 'Gagal terhubung ke Telegram API. Periksa kembali Bot Token Anda.'
      });
    }
  };

  const handleDetectChatId = async () => {
    if (!botToken.trim()) {
      setDetectionError('Silakan masukkan Bot Token terlebih dahulu.');
      return;
    }
    setIsDetectingChatId(true);
    setDetectionError(null);
    setDetectionNotice(null);
    setDetectedChats([]);

    try {
      const res = await fetch('/api/telegram/get-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: botToken.trim() })
      });
      const data = await res.json();
      if (data.success) {
        if (data.chats && data.chats.length > 0) {
          setDetectedChats(data.chats);
          setDetectionNotice(`Ditemukan ${data.chats.length} riwayat obrolan / grup! Klik "Gunakan Chat ID Ini" pada target yang diinginkan.`);
        } else {
          setDetectionError('Belum ada riwayat pesan di bot. Langkah mudah: 1) Masukkan bot ke grup Telegram Anda. 2) Kirim pesan sembarang di grup itu (misal: "Halo bot"). 3) Klik kembali tombol Deteksi ini.');
        }
      } else {
        setDetectionError(data.error || 'Gagal mengambil update dari Telegram bot.');
      }
    } catch (err: any) {
      setDetectionError(err?.message || 'Gagal menghubungi server.');
    } finally {
      setIsDetectingChatId(false);
    }
  };

  const handleSetupWebhook = async () => {
    if (!botToken.trim()) {
      setWebhookResult({ success: false, message: 'Bot Token wajib diisi untuk memasang webhook.' });
      return;
    }
    setIsSettingWebhook(true);
    setWebhookResult(null);

    const currentOrigin = window.location.origin;
    const webhookUrl = `${currentOrigin}/api/telegram/webhook?token=${encodeURIComponent(botToken.trim())}`;

    const res = await telegramService.setupWebhook(botToken.trim(), webhookUrl);
    setIsSettingWebhook(false);

    if (res.success) {
      setWebhookResult({
        success: true,
        message: `Webhook aktif di ${webhookUrl}. Perintah slash (/stok, /tugas, dll) kini dapat langsung dijawab oleh bot di Telegram!`
      });
      const updated: TelegramBotConfig = {
        ...config,
        webhookUrl,
        webhookActive: true
      };
      storageService.saveTelegramConfig(updated);
      setConfig(updated);
    } else {
      setWebhookResult({
        success: false,
        message: res.message || 'Gagal mendaftarkan webhook. Pastikan aplikasi dapat diakses publik melalui HTTPS.'
      });
    }
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

  const isTelegramConfigComplete = Boolean(botToken.trim() && groupChatId.trim());

  const handleExecuteTelegramBot = async () => {
    if (!botToken.trim() || !groupChatId.trim()) {
      alert('Mohon lengkapi Bot Token dan Target Group Chat ID terlebih dahulu.');
      return;
    }

    setIsExecutingTelegram(true);
    setTelegramExecutionResult(null);

    try {
      // 1. Simpan konfigurasi lokal dengan status aktif
      const updatedConfig: TelegramBotConfig = {
        ...config,
        botToken: botToken.trim(),
        groupChatId: groupChatId.trim(),
        isEnabled: true
      };
      storageService.saveTelegramConfig(updatedConfig);
      setConfig(updatedConfig);

      // 2. Simpan juga ke kredensial sistem terpusat (LocalStorage Super Admin)
      const sys = getSystemConnectionConfig();
      saveSystemConnectionConfig({
        ...sys,
        telegramBotToken: botToken.trim(),
        telegramGroupChatId: groupChatId.trim()
      });

      // 3. Sinkronkan snapshot data ke server backend
      await telegramService.syncSnapshotToBackend();

      // 4. Uji koneksi & kirim pesan sambutan aktivasi ke grup Telegram
      const testRes = await telegramService.testConnection(botToken.trim(), groupChatId.trim());

      // 5. Otomatis daftarkan webhook agar perintah slash langsung aktif
      let webhookSuccess = false;
      try {
        const currentOrigin = window.location.origin;
        const webhookUrl = `${currentOrigin}/api/telegram/webhook?token=${encodeURIComponent(botToken.trim())}`;
        const whRes = await telegramService.setupWebhook(botToken.trim(), webhookUrl);
        webhookSuccess = whRes.success;
      } catch {
        webhookSuccess = false;
      }

      if (testRes.success) {
        if (testRes.botInfo) {
          const withInfo: TelegramBotConfig = {
            ...updatedConfig,
            botUsername: testRes.botInfo.username,
            botFirstName: testRes.botInfo.first_name,
            lastTestedAt: new Date().toISOString(),
            lastTestStatus: 'success'
          };
          storageService.saveTelegramConfig(withInfo);
          setConfig(withInfo);
        }
        setLogs(storageService.getTelegramLogs());

        setTelegramExecutionResult({
          success: true,
          botName: testRes.botInfo?.first_name,
          botUsername: testRes.botInfo?.username,
          message: `🚀 BOT TELEGRAM BERHASIL DIJALANKAN & AKTIF! Bot "${testRes.botInfo?.first_name || 'Rajawali Bot'}" (@${testRes.botInfo?.username || 'bot'}) kini aktif terhubung ke grup chat ${groupChatId}. Notifikasi verifikasi telah terkirim ke grup.`,
          webhookOk: webhookSuccess
        });
      } else {
        setTelegramExecutionResult({
          success: false,
          message: testRes.error || 'Gagal menjalankan bot Telegram. Periksa kembali Bot Token dan Chat ID Anda.'
        });
      }
    } catch (err: any) {
      setTelegramExecutionResult({
        success: false,
        message: `Terjadi kendala saat menjalankan bot: ${err?.message || 'Error tidak terduga'}`
      });
    } finally {
      setIsExecutingTelegram(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await telegramService.syncSnapshotToBackend();
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 600);
  };

  const handleRunSimulation = async (cmd: string, customArg?: string) => {
    setIsSimulating(true);
    setSimResponse('');

    // Ensure backend has current snapshot
    await telegramService.syncSnapshotToBackend();

    try {
      const promptArg = customArg !== undefined ? customArg : simCustomQuery;
      const fullCmd = promptArg ? `${cmd} ${promptArg}` : cmd;

      // Prioritas 1: Eksekusi langsung melalui Server Simulator yang terhubung ke data real-time
      try {
        const simRes = await fetch('/api/telegram/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: fullCmd,
            senderName: 'Portal Simulator (Admin)'
          })
        });

        if (simRes.ok) {
          const simData = await simRes.json();
          if (simData.success && simData.reply) {
            setSimResponse(simData.reply);
            return;
          }
        }
      } catch (err) {
        console.warn('Simulator endpoint fallback to local logic:', err);
      }

      // If simulated locally as fallback
      const inventory = storageService.getInventoryItems();
      const projectStocks = storageService.getProjectStocks();
      const tasks = storageService.getTasks();
      const mrs = storageService.getMaterialRequests();
      const projects = storageService.getProjects();
      const employees = storageService.getEmployees();

      const getItemStock = (itemId: string) => {
        return projectStocks
          .filter(ps => ps.itemId === itemId)
          .reduce((sum, ps) => sum + (Number(ps.currentStock) || 0), 0);
      };

      if (cmd === '/stok') {
        let totalCriticalAll = 0;
        const areaSections = projects.map((p, pIdx) => {
          const siteStocks = projectStocks.filter(ps => ps.projectId === p.id);
          let itemsText = '';

          if (siteStocks.length === 0) {
            itemsText = `     ℹ️ <i>Stok disuplai langsung dari Gudang Pusat</i>`;
          } else {
            const rendered = siteStocks.slice(0, 4).map(ps => {
              const item = inventory.find(i => i.id === ps.itemId) || {
                name: (ps as any).itemName || 'Item',
                unit: (ps as any).unit || 'Unit',
                minStock: 5
              };
              const current = Number(ps.currentStock);
              const min = Number(item.minStock || 5);
              let icon = '🟢';
              if (current <= min) {
                icon = '🔴';
                totalCriticalAll++;
              } else if (current <= min * 1.5) {
                icon = '🟡';
              }
              return `     • ${icon} ${item.name}: <b>${current} ${item.unit || 'Unit'}</b>`;
            }).join('\n');
            const moreCount = siteStocks.length > 4 ? `\n     <i>...dan ${siteStocks.length - 4} item lainnya</i>` : '';
            itemsText = `${rendered}${moreCount}`;
          }

          return `📍 <b>${pIdx + 1}. ${p.name}</b> (<code>${p.code}</code>)
   👤 Spv: ${p.siteSupervisor || 'PIC Area'}
${itemsText}`;
        }).join('\n\n');

        setSimResponse(`
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>DATA STOK DI SETIAP AREA / PROYEK</b>
━━━━━━━━━━━━━━━━━━━━
Berikut rincian stok bahan & peralatan kerja di masing-masing lokasi:

${areaSections}

🏢 <b>Gudang Pusat / Master Warehouse:</b>
   • Total Katalog Master: <b>${inventory.length} Jenis Barang</b>
   • Distribusi: Siap kirim via Material Request

━━━━━━━━━━━━━━━━━━━━
📊 <b>Status Lapangan:</b> ${projects.length} Area Terpantau ${totalCriticalAll > 0 ? `| ⚠️ <b>${totalCriticalAll} Item Kritis!</b>` : '| ✅ Seluruh Area Aman'}
💡 <b>Tips Pencarian:</b>
• <code>/stok [nama area]</code> (contoh: <code>/stok medika</code>) - Rincian khusus 1 area
• <code>/stok [nama barang]</code> (contoh: <code>/stok mop</code>) - Posisi barang di semua area
• <code>/stok kritis</code> - Filter barang yang menipis
━━━━━━━━━━━━━━━━━━━━
<i>Status Real-Time Rajawali Inventory Guard</i>`.trim());
      } else if (cmd === '/tugas') {
        const pending = tasks.filter(t => t.status === 'todo');
        const inProgress = tasks.filter(t => t.status === 'in_progress');
        const review = tasks.filter(t => t.status === 'review');
        const done = tasks.filter(t => t.status === 'done');

        setSimResponse(`
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
📋 <b>RINGKASAN TUGAS OPERASIONAL (KANBAN)</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>Statistik Pekerjaan:</b>
⏳ <b>Menunggu (Pending):</b> ${pending.length} tugas
⚡ <b>Sedang Dikerjakan:</b> ${inProgress.length} tugas
🔍 <b>Menunggu QC Audit:</b> ${review.length} tugas
✅ <b>Selesai Hari Ini:</b> ${done.length} tugas
📈 <b>Total Keseluruhan:</b> ${tasks.length} tugas
━━━━━━━━━━━━━━━━━━━━
<i>Gunakan Portal Rajawali Board untuk update checklist real-time</i>`.trim());
      } else if (cmd === '/material' || cmd === '/mr') {
        const pending = mrs.filter(m => m.status === 'PENDING');
        if (pending.length === 0) {
          setSimResponse(`
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>STATUS PENGAJUAN MATERIAL REQUEST</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>TIDAK ADA PENGAJUAN PENDING</b>
Semua pengajuan material request telah diproses atau disetujui.
━━━━━━━━━━━━━━━━━━━━`.trim());
        } else {
          const list = pending.slice(0, 3).map((m, i) => `  ${i + 1}. <b>${m.requestCode || m.id}</b>\n     📍 ${m.projectName || m.projectId}\n     👤 ${m.requesterName} (${(m.items || []).length} item)`).join('\n\n');
          setSimResponse(`
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
⏳ <b>DAFTAR MATERIAL REQUEST PENDING (${pending.length})</b>
━━━━━━━━━━━━━━━━━━━━
${list}

Silakan login ke Portal untuk menyetujui pengajuan.
━━━━━━━━━━━━━━━━━━━━`.trim());
        }
      } else if (cmd === '/ringkasan') {
        const activeCleaners = employees.filter(e => e.status === 'Aktif');
        const pendingMRs = mrs.filter(m => m.status === 'PENDING');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const criticalStocks = inventory.filter(i => getItemStock(i.id) <= Number(i.minStock || 5));

        setSimResponse(`
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
📑 <b>RINGKASAN OPERASIONAL HARIAN TERPADU</b>
━━━━━━━━━━━━━━━━━━━━
🏢 <b>Total Proyek Aktif:</b> ${projects.length} Lokasi
👥 <b>Manpower Cleaner Aktif:</b> ${activeCleaners.length} Karyawan
⚡ <b>Tugas Berjalan di Lapangan:</b> ${inProgressTasks.length} Pekerjaan
⏳ <b>Material Request Menunggu:</b> ${pendingMRs.length} Pengajuan
⚠️ <b>Stok Kritis / Perlu Restock:</b> ${criticalStocks.length} Item
━━━━━━━━━━━━━━━━━━━━
<i>Rajawali Cycle Integrated Enterprise System</i>`.trim());
      } else if (cmd === '/tanya') {
        const q = promptArg || 'Bagaimana takaran chemical pembersih keramik?';
        setSimResponse(`
🤖 <b>RAJAWALI AI OPERATIONS ASSISTANT</b>
━━━━━━━━━━━━━━━━━━━━
❓ <b>Pertanyaan:</b> <i>"${q}"</i>

💡 <b>Panduan Operasional:</b>
Berdasarkan Standar Operasional Prosedur (SOP) PT Rajawali Cycle Indonesia:
1. <b>Takaran Chemical:</b> Campurkan 50 ml floor cleaner / neutral cleaner dengan 5 liter air bersih untuk daily maintenance, atau rasio 1:20 untuk deep cleaning kerak membandel.
2. <b>Keselamatan Kerja (K3):</b> Wajib kenakan sarung tangan karet dan sepatu safety anti-slip saat menangani chemical asam atau alkali.
3. <b>Pelaksanaan:</b> Aplikasikan secara merata menggunakan mop microfiber, diamkan 3 menit, lalu bilas dengan air bersih hingga tidak meninggalkan residu licin.
━━━━━━━━━━━━━━━━━━━━
<i>Ditenagai oleh Gemini AI • PT Rajawali Cycle Indonesia</i>`.trim());
      }
    } catch {
      setSimResponse('Gagal menjalankan simulasi.');
    } finally {
      setIsSimulating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* ------------------------------------------------------------- */}
      {/* TOP BANNER / HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Integrasi Telegram Bot API
                  </h1>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                    config.isEnabled && config.botToken && config.groupChatId
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {config.isEnabled && config.botToken && config.groupChatId ? '● Aktif & Siap' : 'Belum Lengkap'}
                  </span>
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    <span>Khusus Super Admin (HQ)</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Kirim notifikasi real-time ke grup Telegram perusahaan dan aktifkan perintah slash untuk cek stok, tugas, & AI assistant.
                </p>
              </div>
            </div>

            {/* Quick Status Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bot: <b>{config.botUsername ? `@${config.botUsername}` : 'Belum diset'}</b></span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300">
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                <span>Grup Chat ID: <b className="font-mono">{config.groupChatId || 'Belum diisi'}</b></span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Perintah Slash: <b>5 Perintah Aktif</b></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Sinkronkan data terkini (stok, tugas, pengajuan) ke memori bot Telegram"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinkronisasi...' : syncSuccess ? 'Tersinkron!' : 'Sync Data ke Bot'}</span>
            </button>

            <button
              onClick={handleToggleMasterEnable}
              className={`flex items-center space-x-2 px-5 py-2.5 font-black text-xs rounded-2xl shadow-xl transition-all cursor-pointer active:scale-95 ${
                config.isEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{config.isEnabled ? 'Integrasi: AKTIF' : 'Integrasi: NONAKTIF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TABS NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
            activeTab === 'config'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Kredensial & Sambungan</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Pengaturan Notifikasi Real-Time</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Simulator Perintah Slash (/stok, dll)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Notifikasi ({logs.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: KREDENSIAL & SAMBUNGAN */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form: Token & Chat ID */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Kredensial Telegram Bot API</h3>
                    <p className="text-xs text-slate-400">Dapatkan token resmi gratis melalui akun @BotFather di Telegram</p>
                  </div>
                </div>

                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 transition"
                >
                  <span>Buka @BotFather</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* PERINTAH EKSEKUSI BOT TELEGRAM */}
              <div className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                isTelegramConfigComplete
                  ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/40 border-sky-500/40 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${isTelegramConfigComplete ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        Perintah Eksekusi: Jalankan & Aktifkan Bot Telegram
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      {isTelegramConfigComplete
                        ? 'Kedua parameter telah lengkap! Klik tombol di bawah untuk menjalankan bot, menguji pengiriman ke grup, dan mendaftarkan webhook interaktif.'
                        : 'Masukkan HTTP API Bot Token dan Group Chat ID di bawah untuk mengaktifkan perintah jalankan.'}
                    </p>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 self-start sm:self-center ${
                    isTelegramConfigComplete
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isTelegramConfigComplete ? '✅ 2/2 Parameter Terisi (Siap Dijalankan)' : `${[botToken.trim(), groupChatId.trim()].filter(Boolean).length}/2 Parameter Terisi`}
                  </span>
                </div>

                <div className="pt-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleExecuteTelegramBot}
                    disabled={isExecutingTelegram || !isTelegramConfigComplete}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isExecutingTelegram ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>SEDANG MENJALANKAN & MENGUJI BOT TELEGRAM...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>🚀 JALANKAN & AKTIFKAN BOT TELEGRAM SEKARANG</span>
                      </>
                    )}
                  </button>

                  {/* Telegram Live Execution Result Banner */}
                  {telegramExecutionResult && (
                    <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      telegramExecutionResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}>
                      <div className="flex items-center space-x-2 font-black">
                        {telegramExecutionResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{telegramExecutionResult.success ? 'Eksekusi Bot Berhasil!' : 'Eksekusi Bot Gagal'}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{telegramExecutionResult.message}</p>
                      {telegramExecutionResult.success && telegramExecutionResult.botUsername && (
                        <div className="pt-1 flex items-center space-x-2">
                          <a
                            href={`https://t.me/${telegramExecutionResult.botUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow"
                          >
                            <span>Buka Bot @{telegramExecutionResult.botUsername} di Telegram</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bot Token Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>1. HTTP API Bot Token *</span>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                  >
                    {showToken ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="Contoh: 789123456:AAFlkjasd987123jkhASd..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:border-blue-500 focus:outline-none pr-24"
                  />
                  <div className="absolute right-2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handlePasteField(setBotToken)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Tempel dari Clipboard"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    {botToken && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(botToken, 'token')}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Salin Token"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Diberikan oleh Telegram @BotFather setelah perintah <code>/newbot</code></span>
                  {botToken && <span className="text-emerald-400 font-bold">✓ Terisi</span>}
                </div>
              </div>

              {/* Group Chat ID Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    2. Target Group Chat ID (Grup Perusahaan) *
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectChatId}
                    disabled={isDetectingChatId}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Ambil Chat ID otomatis dari pesan terakhir bot"
                  >
                    <Search className={`w-3 h-3 ${isDetectingChatId ? 'animate-spin' : ''}`} />
                    <span>{isDetectingChatId ? 'Mendeteksi...' : '🔍 Deteksi Otomatis Chat ID'}</span>
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={groupChatId}
                    onChange={(e) => setGroupChatId(e.target.value)}
                    placeholder="Contoh: -1002345678901 (diawali tanda minus untuk grup)"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:border-blue-500 focus:outline-none pr-24"
                  />
                  <div className="absolute right-2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handlePasteField(setGroupChatId)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Tempel dari Clipboard"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    {groupChatId && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(groupChatId, 'chatId')}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Salin Chat ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>ID grup tempat bot akan mengirimkan notifikasi (diawali <code>-100</code>)</span>
                  {groupChatId && <span className="text-emerald-400 font-bold">✓ Terisi</span>}
                </div>

                {/* Detection notification message */}
                {detectionNotice && (
                  <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-300 text-xs flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span className="font-semibold">{detectionNotice}</span>
                  </div>
                )}

                {/* Detection error / guidance */}
                {detectionError && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold">Panduan Menemukan Chat ID:</div>
                      <p className="leading-relaxed">{detectionError}</p>
                    </div>
                  </div>
                )}

                {/* Detected Chats List */}
                {detectedChats.length > 0 && (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Daftar Obrolan / Grup Terdeteksi:
                    </div>
                    <div className="space-y-1.5">
                      {detectedChats.map((c) => (
                        <div
                          key={String(c.id)}
                          className="flex items-center justify-between p-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-white truncate flex items-center space-x-1.5">
                              <span>{c.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                                {c.type}
                              </span>
                            </div>
                            <div className="text-[11px] text-sky-400 font-mono">
                              ID: {c.id}
                            </div>
                            {c.lastMessage && (
                              <div className="text-[10px] text-slate-500 truncate">
                                Pesan: &quot;{c.lastMessage}&quot;
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setGroupChatId(String(c.id));
                              setDetectionNotice(`Chat ID "${c.id}" (${c.title}) telah dipilih! Jangan lupa klik Simpan Kredensial.`);
                            }}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm"
                          >
                            Gunakan ID Ini
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  ID grup tempat bot akan mengirimkan notifikasi. Untuk grup supergroup biasanya diawali angka <code>-100</code>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : saveSuccess ? 'Berhasil Disimpan!' : 'Simpan Kredensial'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 text-cyan-400 ${isTesting ? 'animate-pulse' : ''}`} />
                  <span>{isTesting ? 'Menguji Sambungan...' : 'Uji Sambungan & Kirim Pesan Tes'}</span>
                </button>
              </div>

              {/* Test Connection Alert Result */}
              {testResult && (
                <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-start space-x-3 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold">{testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</div>
                    <p className="font-normal leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Webhook Configuration Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Webhook Perintah Slash Otomatis</h3>
                    <p className="text-xs text-slate-400">Memungkinkan bot membalas perintah (/stok, /tugas, /ringkasan, /tanya) secara langsung di Telegram</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  config.webhookActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {config.webhookActive ? 'Webhook Aktif' : 'Webhook Belum Terpasang'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
                <span className="truncate">{window.location.origin}/api/telegram/webhook</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`${window.location.origin}/api/telegram/webhook`, 'webhook-url')}
                  className="ml-2 text-slate-400 hover:text-white p-1 text-xs shrink-0 cursor-pointer"
                  title="Salin Webhook URL"
                >
                  {copiedId === 'webhook-url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSetupWebhook}
                  disabled={isSettingWebhook}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSettingWebhook ? 'Mendaftarkan...' : 'Daftarkan Webhook ke Telegram API'}</span>
                </button>
              </div>

              {webhookResult && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  webhookResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {webhookResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Step-by-Step Guide */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-2.5 text-amber-400 font-black text-sm">
                <HelpCircle className="w-5 h-5" />
                <span>Panduan 5 Menit Membuat Bot</span>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                    <span>Buat Bot di Telegram</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Buka aplikasi Telegram, cari user <b>@BotFather</b>. Ketik perintah <code>/newbot</code>, beri nama bot (misal: <i>Rajawali Cycle Assistant</i>), lalu buat username unik berakhiran <i>bot</i>.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                    <span>Salin Bot Token</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    BotFather akan memberikan kode HTTP API Token panjang. Salin kode tersebut dan tempel pada kolom <b>Bot Token</b> di sebelah kiri.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">3</span>
                    <span>Buat Grup & Masukkan Bot</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Buat grup Telegram bersama tim manajemen atau pengawas lapangan, lalu tambahkan bot Anda ke dalam grup tersebut dan jadikan sebagai <b>Administrator</b>.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">4</span>
                    <span>Dapatkan ID Grup</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tambahkan bot pembantu seperti <code>@userinfobot</code> atau <code>@RawDataBot</code> ke grup untuk melihat angka ID grup Anda (contoh: <code>-1002456789012</code>).
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">5</span>
                    <span>Uji Sambungan</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Klik tombol <b>Uji Sambungan & Kirim Pesan Tes</b>. Bot akan mengirimkan sapaan verifikasi ke grup Anda!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PENGATURAN NOTIFIKASI OTOMATIS (TRIGGERS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <span>Pemicu Notifikasi Otomatis ke Grup Telegram</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tentukan kejadian apa saja di sistem yang akan otomatis memicu pengiriman pesan alert ke grup Telegram perusahaan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trigger 1: Material Request */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between space-x-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-sm font-black text-white">
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>Pengajuan Material Request Baru</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mengirim rincian barang, nama pemohon, dan lokasi proyek segera setelah ada pengajuan kebutuhan barang dari lapangan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTrigger('notifyOnMaterialRequest')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.notifyOnMaterialRequest ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      config.notifyOnMaterialRequest ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Trigger 2: Low Stock Alert */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between space-x-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-sm font-black text-white">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Peringatan Stok Minimum / Kritis</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mengirim peringatan darurat seketika saat jumlah stok master chemical atau alat kerja berada pada atau di bawah batas minimum.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTrigger('notifyOnLowStock')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.notifyOnLowStock ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      config.notifyOnLowStock ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Trigger 3: Task & Kanban Updates */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between space-x-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-sm font-black text-white">
                    <ListChecks className="w-4 h-4 text-blue-400" />
                    <span>Tugas Lapangan Prioritas Tinggi (Urgent)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mengirim alert penugasan ke grup saat supervisor membuat instruksi tugas darurat atau prioritas tinggi di Rajawali Board.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTrigger('notifyOnTaskUpdate')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.notifyOnTaskUpdate ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      config.notifyOnTaskUpdate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Trigger 4: Daily Summary */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between space-x-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-sm font-black text-white">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Ringkasan Harian Operasional Pabrik</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dukungan pengiriman laporan berkala rekap jumlah cleaner bertugas, proyek aktif, dan antrean pekerjaan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTrigger('notifyOnDailyReport')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.notifyOnDailyReport ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      config.notifyOnDailyReport ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SIMULATOR PERINTAH SLASH (/stok, /tugas, /ringkasan) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Command Selector & Presets */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Perintah Telegram (Operasional, HRD & Finance)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih menu divisi untuk menguji respons data yang dapat diakses melalui Telegram Bot.
                </p>

                {/* Divisi Category Tabs */}
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {[
                    { key: 'all', label: 'Semua Menu' },
                    { key: 'ops', label: 'Operasional' },
                    { key: 'hrd', label: 'HRD' },
                    { key: 'finance', label: 'Finance & Akun' },
                    { key: 'ai', label: 'AI Gemini' }
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSimCategory(cat.key as any)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                        simCategory === cat.key
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {[
                  // Operasional
                  { cmd: '/stok', label: '/stok', desc: 'Sebaran stok chemical & alat di setiap area', cat: 'ops', icon: '📦' },
                  { cmd: '/stok kritis', label: '/stok kritis', desc: 'Daftar stok di bawah batas minimum area', cat: 'ops', icon: '⚠️' },
                  { cmd: '/tugas', label: '/tugas', desc: 'Ringkasan tugas operasional & Kanban lapangan', cat: 'ops', icon: '📋' },
                  { cmd: '/proyek', label: '/proyek', desc: 'Daftar proyek & site klien aktif', cat: 'ops', icon: '🏢' },
                  { cmd: '/material', label: '/material', desc: 'Pengajuan Material Request pending', cat: 'ops', icon: '🚚' },
                  { cmd: '/ringkasan', label: '/ringkasan', desc: 'Rekapitulasi terpadu operasional & manpower', cat: 'ops', icon: '📑' },

                  // HRD
                  { cmd: '/hrd', label: '/hrd', desc: 'Portal ringkasan HRD & Personalia', cat: 'hrd', icon: '👥' },
                  { cmd: '/karyawan', label: '/karyawan', desc: 'Direktori cleaner & karyawan per divisi', cat: 'hrd', icon: '🪪' },
                  { cmd: '/absensi', label: '/absensi', desc: 'Rekap absensi & timesheet bulan berjalan', cat: 'hrd', icon: '⏱️' },
                  { cmd: '/sop', label: '/sop', desc: 'Katalog SOP kebersihan, K3, dan chemical', cat: 'hrd', icon: '📚' },
                  { cmd: '/broadcast', label: '/broadcast', desc: 'Arsip pengumuman & broadcast Eagle Blast', cat: 'hrd', icon: '📢' },

                  // Finance & Accounting
                  { cmd: '/finance', label: '/finance', desc: 'Ikhtisar posisi kas, bank, piutang & laba rugi', cat: 'finance', icon: '💰' },
                  { cmd: '/kas', label: '/kas', desc: 'Rincian saldo kas kecil & rekening bank', cat: 'finance', icon: '🏦' },
                  { cmd: '/jurnal', label: '/jurnal', desc: 'Transaksi jurnal kas & mutasi terkini', cat: 'finance', icon: '🧾' },
                  { cmd: '/hutang', label: '/hutang', desc: 'Kewajiban hutang supplier & vendor', cat: 'finance', icon: '📉' },
                  { cmd: '/piutang', label: '/piutang', desc: 'Tagihan piutang invoice klien', cat: 'finance', icon: '📈' },
                  { cmd: '/rekeningkoran', label: '/rekeningkoran', desc: 'Status rekonsiliasi mutasi rekening koran', cat: 'finance', icon: '📊' },
                  { cmd: '/tutupbuku', label: '/tutupbuku', desc: 'Status closing periode akuntansi bulanan', cat: 'finance', icon: '🔒' },

                  // AI Assistant
                  { cmd: '/tanya', label: '/tanya [tanya]', desc: 'Konsultasi SOP & teknis kebersihan dengan Gemini AI', cat: 'ai', icon: '✨', arg: 'Apa SOP pembersihan kerak pada kaca facade?' }
                ]
                  .filter((item) => simCategory === 'all' || item.cat === simCategory)
                  .map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => {
                        setSimCommand(item.cmd);
                        handleRunSimulation(item.cmd, item.arg);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                        simCommand === item.cmd
                          ? 'bg-blue-600/20 border-blue-500/50 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-base">{item.icon}</span>
                        <div>
                          <div className="font-mono text-xs font-bold text-cyan-300">{item.label}</div>
                          <div className="text-[11px] text-slate-400">{item.desc}</div>
                        </div>
                      </div>
                      <Play className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />
                    </button>
                  ))}
              </div>

              {simCommand === '/tanya' && (
                <div className="pt-2 space-y-2">
                  <label className="text-xs font-bold text-slate-300">Ketik Pertanyaan AI:</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={simCustomQuery}
                      onChange={(e) => setSimCustomQuery(e.target.value)}
                      placeholder="Contoh: Takaran stripper lantai marmer..."
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRunSimulation('/tanya', simCustomQuery)}
                      disabled={isSimulating}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
                    >
                      Kirim
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Telegram Chat Bubble Simulation */}
          <div className="lg:col-span-7">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm">
                      RC
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center space-x-1.5">
                        <span>Rajawali Cycle Operations Bot</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="text-[11px] text-emerald-400">bot terverifikasi • online</div>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">Simulasi Tampilan Telegram</span>
                </div>

                {/* User Message Bubble */}
                <div className="flex justify-end mb-4">
                  <div className="bg-blue-600/30 border border-blue-500/40 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-md font-mono text-xs shadow">
                    {simCommand} {simCommand === '/tanya' && (simCustomQuery || 'Apa SOP pembersihan kaca facade gedung tinggi?')}
                    <div className="text-[10px] text-slate-400 text-right mt-1">10:42 ✓✓</div>
                  </div>
                </div>

                {/* Bot Response Bubble */}
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl rounded-tl-none p-4 max-w-lg shadow-xl space-y-2">
                    {isSimulating ? (
                      <div className="flex items-center space-x-2 py-4 text-xs text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Bot sedang mengetik & memproses data...</span>
                      </div>
                    ) : simResponse ? (
                      <div
                        className="text-xs leading-relaxed space-y-1"
                        dangerouslySetInnerHTML={{ __html: simResponse.replace(/\n/g, '<br/>') }}
                      />
                    ) : (
                      <div className="text-xs text-slate-500 italic py-6 text-center">
                        Pilih salah satu perintah slash di sebelah kiri untuk melihat bagaimana bot menjawab di Telegram.
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 text-right">10:42</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6 flex items-center justify-between text-xs text-slate-400">
                <span>Data yang ditampilkan diambil secara real-time dari database aplikasi.</span>
                <button
                  type="button"
                  onClick={() => {
                    if (config.botToken && config.groupChatId && simResponse) {
                      telegramService.sendNotification({
                        title: `Simulasi ${simCommand}`,
                        message: simResponse,
                        type: 'COMMAND'
                      });
                      alert('Pesan simulasi berhasil dikirimkan ke grup Telegram Anda!');
                    } else {
                      alert('Pastikan Bot Token dan Group Chat ID sudah diisi.');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Forward Pesan Ini ke Grup Asli
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: RIWAYAT & LOG NOTIFIKASI */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-base">Riwayat Audit Notifikasi Telegram</h3>
              <p className="text-xs text-slate-400">Daftar pesan alert yang telah dipicu dan dikirimkan oleh sistem ke Telegram</p>
            </div>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bersihkan riwayat log Telegram?')) {
                    storageService.clearTelegramLogs();
                    setLogs([]);
                  }
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 rounded-xl text-xs transition cursor-pointer border border-slate-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Log</span>
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">Belum ada aktivitas pengiriman notifikasi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {log.status === 'SUCCESS' ? 'Terkirim' : 'Gagal'}
                      </span>
                      <span className="font-bold text-white">{log.title}</span>
                      <span className="text-slate-500 text-[11px] font-mono">[{log.type}]</span>
                    </div>
                    {log.errorMessage ? (
                      <p className="text-rose-400 text-[11px] font-mono">{log.errorMessage}</p>
                    ) : (
                      <p className="text-slate-400 text-[11px] line-clamp-1">{log.message.replace(/<[^>]*>?/gm, ' ')}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0 text-[11px] text-slate-500">
                    <div>{new Date(log.timestamp).toLocaleTimeString('id-ID')}</div>
                    <div>{new Date(log.timestamp).toLocaleDateString('id-ID')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
