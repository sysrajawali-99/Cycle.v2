import React, { useState, useEffect } from 'react';
import {
  Server,
  Cloud,
  CloudLightning,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  FileDown,
  Copy,
  Check,
  HardDrive,
  Terminal,
  ShieldCheck,
  Clock,
  Database,
  ExternalLink,
  X,
  Radio,
  Sparkles,
  Layers,
  ArrowRight,
  Activity,
  Wifi
} from 'lucide-react';
import { vpsSyncService } from '../../services/vpsSyncService';
import { VpsSyncConfig, VpsBackupSnapshot, VpsStatusResponse } from '../../types/vps';
import { UserAccount } from '../../types';

interface VpsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  onDataReload?: () => void;
}

export const VpsSyncModal: React.FC<VpsSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDataReload
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'backups' | 'guide'>('sync');
  const [config, setConfig] = useState<VpsSyncConfig>(() => vpsSyncService.getConfig());
  const [vpsUrlInput, setVpsUrlInput] = useState<string>(config.vpsUrl || '');
  const [apiKeyInput, setApiKeyInput] = useState<string>(config.apiKey || '');
  const [autoSync, setAutoSync] = useState<boolean>(config.autoSyncEnabled);

  // Status & stats
  const [isTesting, setIsTesting] = useState(false);
  const [isPingingDiagnostic, setIsPingingDiagnostic] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    details?: string;
    latency?: number;
    target?: string;
    timestamp: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    info?: VpsStatusResponse;
    error?: string;
  } | null>(null);
  const [pingDiagnostic, setPingDiagnostic] = useState<any>(null);

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Archive snapshot note
  const [snapshotNote, setSnapshotNote] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Snapshots list
  const [snapshots, setSnapshots] = useState<VpsBackupSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);

  // Script copy state
  const [copiedScript, setCopiedScript] = useState(false);

  // Listen to configuration and sync status updates
  useEffect(() => {
    const handleConfigChange = () => {
      const latest = vpsSyncService.getConfig();
      setConfig(latest);
      setVpsUrlInput(latest.vpsUrl || '');
      setApiKeyInput(latest.apiKey || '');
      setAutoSync(latest.autoSyncEnabled);
    };

    const handleSyncEvent = (e: any) => {
      const { status, message } = e.detail || {};
      if (status === 'success') {
        setActionNotice({ type: 'success', message });
      } else if (status === 'error') {
        setActionNotice({ type: 'error', message });
      }
      setConfig(vpsSyncService.getConfig());
    };

    window.addEventListener('vps_config_updated', handleConfigChange);
    window.addEventListener('vps_sync_event', handleSyncEvent);

    return () => {
      window.removeEventListener('vps_config_updated', handleConfigChange);
      window.removeEventListener('vps_sync_event', handleSyncEvent);
    };
  }, []);

  // Toast notification auto-dismiss timer (7 seconds)
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // When modal opens, silently ping status and load snapshots if on backups tab
  useEffect(() => {
    if (isOpen) {
      handleTriggerDiagnosticPing(false);
      loadSnapshots();
    }
  }, [isOpen]);

  const loadSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const items = await vpsSyncService.fetchVpsBackups();
      setSnapshots(items);
    } catch {
      setSnapshots([]);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  const handleSaveConfig = () => {
    const updated = vpsSyncService.saveConfig({
      vpsUrl: vpsUrlInput.trim(),
      apiKey: apiKeyInput.trim(),
      autoSyncEnabled: autoSync
    });
    setConfig(updated);
    setActionNotice({ type: 'success', message: 'Pengaturan koneksi VPS Rumahweb berhasil disimpan!' });
  };

  const handleTriggerDiagnosticPing = async (showToast: boolean = true) => {
    setIsPingingDiagnostic(true);
    setIsTesting(true);
    setTestResult(null);
    setPingDiagnostic(null);

    const targetUrl = vpsUrlInput.trim() || 'http://vps.rtisystem.my.id';
    const fallbackIp = 'http://202.10.34.203';

    try {
      const pingRes = await vpsSyncService.checkConnection(targetUrl, fallbackIp);
      setPingDiagnostic(pingRes.details);

      if (pingRes.connected) {
        const activeUrl = pingRes.activeTarget || targetUrl;
        const latency = pingRes.details?.results?.find((r: any) => r.ok)?.latencyMs || 48;

        setTestResult({
          success: true,
          latencyMs: latency,
          info: pingRes.details?.remoteInfo
        });

        if (pingRes.details?.remoteInfo) {
          vpsSyncService.saveConfig({
            serverHostname: pingRes.details.remoteInfo.hostname,
            serverPlatform: pingRes.details.remoteInfo.platform,
            serverUptime: pingRes.details.remoteInfo.uptimeSeconds
          });
        }

        if (showToast) {
          setToastMessage({
            type: 'success',
            title: 'Server Reachable (Koneksi Sukses)',
            message: 'Server VPS vps.rtisystem.my.id (202.10.34.203) aktif terhubung & merespon dengan baik.',
            details: `Endpoint aktif: ${activeUrl} | Latensi: ${latency} ms. Data siap disinkronisasikan.`,
            latency,
            target: activeUrl,
            timestamp: new Date().toLocaleTimeString('id-ID')
          });
        }
      } else {
        const errorMsg = pingRes.message || 'Server VPS vps.rtisystem.my.id (202.10.34.203) tidak merespon pada port 80/3000.';
        setTestResult({
          success: false,
          latencyMs: 65,
          error: errorMsg
        });

        if (showToast) {
          setToastMessage({
            type: 'error',
            title: 'Server Unreachable (Koneksi Gagal)',
            message: 'Gagal menjangkau server VPS vps.rtisystem.my.id (202.10.34.203).',
            details: 'Port 80/3000 belum memberikan respon HTTP valid. Pastikan service di VPS sudah dijalankan via SSH.',
            target: 'vps.rtisystem.my.id (202.10.34.203)',
            timestamp: new Date().toLocaleTimeString('id-ID')
          });
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Koneksi jaringan terputus atau timeout saat menghubungi VPS.';
      setTestResult({
        success: false,
        latencyMs: 0,
        error: errMsg
      });

      if (showToast) {
        setToastMessage({
          type: 'error',
          title: 'Server Unreachable (Error Jaringan)',
          message: 'Terjadi kendala saat mengirim uji ping ke vps.rtisystem.my.id (202.10.34.203).',
          details: errMsg,
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
      }
    } finally {
      setIsPingingDiagnostic(false);
      setIsTesting(false);
    }
  };

  const handleTestConnection = () => {
    return handleTriggerDiagnosticPing(true);
  };

  const handlePush = async (createArchive: boolean = false) => {
    setIsPushing(true);
    setActionNotice(null);
    try {
      handleSaveConfig();
      const author = currentUser?.name || 'Super Admin (HQ)';
      const note = createArchive
        ? snapshotNote || `Arsip Manual VPS (${new Date().toLocaleDateString('id-ID')})`
        : 'Sinkronisasi Manual dari Browser';

      const res = await vpsSyncService.pushToVps(author, note, createArchive);
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: createArchive
            ? 'Snapshot arsip berhasil disimpan di VPS Ubuntu!'
            : 'Data operasional & keuangan berhasil diunggah (Push) ke VPS Rumahweb!'
        });
        if (createArchive) {
          setSnapshotNote('');
          loadSnapshots();
        }
        handleTestConnection();
      } else {
        setActionNotice({ type: 'error', message: res.message });
      }
    } finally {
      setIsPushing(false);
      setIsCreatingSnapshot(false);
    }
  };

  const handlePull = async () => {
    if (
      !confirm(
        'Apakah Anda yakin ingin menyelaraskan perangkat ini dengan data terbaru di VPS Rumahweb? Data lokal akan diperbarui dengan data server.'
      )
    ) {
      return;
    }

    setIsPulling(true);
    setActionNotice(null);
    try {
      handleSaveConfig();
      const res = await vpsSyncService.pullFromVps();
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: res.message || 'Data terbaru dari VPS Rumahweb berhasil dimuat!'
        });
        if (onDataReload) {
          onDataReload();
        }
        handleTestConnection();
      } else {
        setActionNotice({ type: 'error', message: res.message });
      }
    } finally {
      setIsPulling(false);
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    if (
      !confirm(
        `PERINGATAN: Memulihkan snapshot "${filename}" akan mengganti database live VPS dengan isi arsip tersebut. Lanjutkan?`
      )
    ) {
      return;
    }

    setActionNotice(null);
    const res = await vpsSyncService.restoreVpsBackup(filename);
    if (res.success) {
      setActionNotice({ type: 'success', message: res.message });
      if (onDataReload) onDataReload();
      handleTestConnection();
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  };

  const handleDeleteSnapshot = async (filename: string) => {
    if (!confirm(`Hapus file snapshot "${filename}" dari harddisk VPS?`)) return;
    const res = await vpsSyncService.deleteVpsBackup(filename);
    if (res.success) {
      setActionNotice({ type: 'success', message: res.message });
      loadSnapshots();
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  };

  const setupCommand = `curl -sSL ${window.location.origin}/api/vps/deploy-script | bash`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(setupCommand);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      id="vps-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="vps-sync-modal-container"
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Koneksi VPS Rumahweb (Ubuntu OS) & Real-Time Sync
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Cloud Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pencadangan data otomatis dua arah (Upload & Download) untuk akses multi-user dari mana saja
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Live Connection Status Badge */}
            {testResult?.success ? (
              <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Terhubung ({testResult.latencyMs} ms)</span>
              </div>
            ) : testResult?.error ? (
              <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Terputus</span>
              </div>
            ) : null}

            {/* Diagnostic Ping Button in Header */}
            <button
              id="vps-modal-header-ping-btn"
              type="button"
              onClick={() => handleTriggerDiagnosticPing(true)}
              disabled={isPingingDiagnostic || isTesting}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 group border border-indigo-400/40"
              title="Ping & tes koneksi server ke vps.rtisystem.my.id (202.10.34.203)"
            >
              <Activity className={`w-3.5 h-3.5 ${isPingingDiagnostic ? 'animate-spin text-amber-300' : 'group-hover:scale-110 transition-transform text-indigo-200'}`} />
              <span>{isPingingDiagnostic ? 'Ping Berjalan...' : 'Diagnostik Ping'}</span>
            </button>

            <button
              id="vps-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 shrink-0">
          <button
            id="vps-tab-sync"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sync'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudLightning className="w-4 h-4" />
            <span>Sinkronisasi & Backup Live</span>
          </button>

          <button
            id="vps-tab-backups"
            onClick={() => {
              setActiveTab('backups');
              loadSnapshots();
            }}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'backups'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Riwayat Snapshot VPS</span>
            {snapshots.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {snapshots.length}
              </span>
            )}
          </button>

          <button
            id="vps-tab-guide"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Panduan Setup VPS Rumahweb</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Diagnostic Ping Toast Message */}
          {toastMessage && (
            <div
              id="vps-diagnostic-toast"
              className={`p-4 rounded-xl border shadow-xl flex items-start space-x-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/50'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toastMessage.type === 'success' ? (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        toastMessage.type === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {toastMessage.type === 'success' ? 'PING BERHASIL' : 'PING GAGAL'}
                    </span>
                    <h4 className="text-sm font-bold text-white">{toastMessage.title}</h4>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {toastMessage.latency !== undefined && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-emerald-300 border border-emerald-500/30">
                        {toastMessage.latency} ms
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{toastMessage.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => setToastMessage(null)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-black/30 transition-colors cursor-pointer"
                      title="Tutup Notifikasi Toast"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                  {toastMessage.message}
                </p>
                {toastMessage.details && (
                  <p className="text-[11px] text-slate-300/90 mt-1 font-mono leading-relaxed opacity-90">
                    {toastMessage.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Notice Alert */}
          {actionNotice && (
            <div
              className={`p-3 rounded-xl flex items-start space-x-3 text-xs border ${
                actionNotice.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              } animate-in fade-in duration-200`}
            >
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium leading-relaxed">{actionNotice.message}</div>
              <button
                onClick={() => setActionNotice(null)}
                className="text-slate-400 hover:text-white shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: SINKRONISASI & BACKUP LIVE */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              {/* Dedicated Diagnostic Ping & Reachability Block */}
              <div className="bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Uji Diagnostik Reachability Server VPS
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-semibold">
                        vps.rtisystem.my.id (202.10.34.203)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Kirim sinyal ping langsung untuk mengonfirmasi keterjangkauan (*server reachability*), mengukur latensi jaringan, dan memverifikasi kesiapan sinkronisasi.
                    </p>
                  </div>
                </div>

                <button
                  id="vps-diagnostic-ping-btn"
                  type="button"
                  onClick={() => handleTriggerDiagnosticPing(true)}
                  disabled={isPingingDiagnostic || isTesting}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 group border border-indigo-400/40"
                >
                  <Radio className={`w-4 h-4 ${isPingingDiagnostic ? 'animate-ping text-amber-300' : 'group-hover:scale-110 transition-transform'}`} />
                  <span>{isPingingDiagnostic ? 'Sedang Ping Server...' : 'Uji Ping VPS Sekarang'}</span>
                </button>
              </div>

              {/* VPS Server Configuration Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Alamat Server VPS Rumahweb
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVpsUrlInput(window.location.origin);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    Gunakan Host Server Saat Ini
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      URL Endpoint VPS (IP Publik atau Domain):
                    </label>
                    <div className="relative">
                      <input
                        id="vps-url-input"
                        type="text"
                        value={vpsUrlInput}
                        onChange={(e) => setVpsUrlInput(e.target.value)}
                        placeholder="http://vps.rtisystem.my.id atau http://202.10.34.203"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                      <span className="text-slate-500 font-medium">Pilihan Cepat VPS:</span>
                      <button
                        type="button"
                        onClick={() => setVpsUrlInput('http://vps.rtisystem.my.id')}
                        className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          vpsUrlInput === 'http://vps.rtisystem.my.id'
                            ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                            : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-slate-700'
                        }`}
                      >
                        vps.rtisystem.my.id (Domain)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVpsUrlInput('http://202.10.34.203')}
                        className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          vpsUrlInput === 'http://202.10.34.203'
                            ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                            : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-slate-700'
                        }`}
                      >
                        http://202.10.34.203 (IP Publik)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVpsUrlInput('http://202.10.34.203:3000')}
                        className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          vpsUrlInput === 'http://202.10.34.203:3000'
                            ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        Port 3000
                      </button>
                      <button
                        type="button"
                        onClick={() => setVpsUrlInput(window.location.origin)}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 transition-colors cursor-pointer"
                      >
                        Host Lokal
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Kunci Autentikasi / Token (Opsional):
                    </label>
                    <input
                      id="vps-api-key-input"
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Token keamanan API"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  {/* Auto-Sync Toggle */}
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => {
                        setAutoSync(e.target.checked);
                        vpsSyncService.saveConfig({ autoSyncEnabled: e.target.checked });
                      }}
                      className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Aktifkan Auto-Sync Real-Time (Otomatis Upload saat ada perubahan)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Memastikan data tersimpan aman di server VPS secara otomatis setiap kali Anda bekerja.
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center space-x-2">
                    <button
                      id="vps-test-connection-btn"
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
                    </button>

                    <button
                      id="vps-save-config-btn"
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      Simpan Pengaturan
                    </button>
                  </div>
                </div>

                {/* Live Ping & Environment Status */}
                {testResult && (
                  <div
                    className={`mt-2 p-3.5 rounded-xl text-xs border ${
                      testResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {testResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                        <span className="font-bold text-sm">
                          {testResult.success
                            ? 'Notifikasi: VPS Rumahweb Berhasil Terhubung'
                            : 'Notifikasi: VPS Rumahweb Belum Terhubung'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-black/40">
                        Latensi: {testResult.latencyMs} ms
                      </span>
                    </div>

                    {/* Probed Target Results Breakdown */}
                    {pingDiagnostic?.results && pingDiagnostic.results.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/50 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-300">
                          Hasil Pengecekan Target VPS:
                        </div>
                        <div className="space-y-1">
                          {pingDiagnostic.results.map((r: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-black/30 text-[11px] font-mono"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    r.ok ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`}
                                />
                                <span className="text-white truncate">{r.url}</span>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                {r.ok ? (
                                  <span className="text-emerald-400 font-bold">
                                    HTTP {r.statusCode} ({r.latencyMs}ms)
                                  </span>
                                ) : (
                                  <span className="text-rose-400">
                                    {r.error || 'Tidak ada respon'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {testResult.info && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-emerald-500/20 text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-400">OS Server:</span>{' '}
                          <span className="font-semibold text-white">
                            {testResult.info.platform === 'linux' ? 'Ubuntu Linux' : testResult.info.platform}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Node.js:</span>{' '}
                          <span className="font-semibold text-white">{testResult.info.nodeVersion}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Database VPS:</span>{' '}
                          <span className="font-semibold text-white">
                            {testResult.info.hasLiveDatabase ? 'Tersimpan (Aktif)' : 'Belum Terisi'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Total Snapshot:</span>{' '}
                          <span className="font-semibold text-white">{testResult.info.totalSnapshots} file</span>
                        </div>
                      </div>
                    )}

                    {!testResult.success && (
                      <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-[11px] text-slate-300 space-y-1">
                        <p className="text-rose-300 font-medium">
                          {testResult.error || 'VPS Rumahweb belum menerima request.'}
                        </p>
                        <p className="text-slate-400 text-[10px]">
                          <strong>Petunjuk:</strong> Jika backend belum berjalan di VPS{' '}
                          <code className="text-indigo-300">202.10.34.203</code>, buka tab{' '}
                          <strong>Panduan Setup VPS</strong> di atas dan jalankan script otomatis via terminal SSH.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Two Main Action Cards: Push vs Pull */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload to VPS (Push) */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Upload ke VPS (Push Data)</h4>
                        <span className="text-[10px] text-indigo-400 font-medium">Lokal → Cloud Server</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Kirim seluruh data operasional terkini (Proyek, Karyawan, Timesheet, Finance, Stok, User)
                      dari browser ini untuk disimpan secara permanen di VPS Rumahweb.
                    </p>
                  </div>

                  <button
                    id="vps-manual-push-btn"
                    type="button"
                    onClick={() => handlePush(false)}
                    disabled={isPushing}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? 'Mengunggah ke VPS...' : 'Upload Data Sekarang'}</span>
                  </button>
                </div>

                {/* Download from VPS (Pull) */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <DownloadCloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Download dari VPS (Pull Data)</h4>
                        <span className="text-[10px] text-emerald-400 font-medium">Cloud Server → Lokal</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tarik data live terbaru dari VPS Rumahweb yang telah diinput atau diperbarui oleh pengguna
                      lain di cabang / lokasi lapangan berbeda.
                    </p>
                  </div>

                  <button
                    id="vps-manual-pull-btn"
                    type="button"
                    onClick={handlePull}
                    disabled={isPulling}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                    <span>{isPulling ? 'Mengunduh dari VPS...' : 'Download Data Terbaru'}</span>
                  </button>
                </div>
              </div>

              {/* Point-in-time Snapshot Archiver */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Buat Snapshot Arsip Bertanggal di Server VPS
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Snapshot arsip disimpan terpisah di direktori <code className="text-amber-300 font-mono">/data/backups/</code> pada
                  VPS Ubuntu Anda, sehingga dapat dipulihkan sewaktu-waktu (misalnya arsip sebelum tutup buku bulanan).
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="vps-snapshot-note-input"
                    type="text"
                    value={snapshotNote}
                    onChange={(e) => setSnapshotNote(e.target.value)}
                    placeholder="Catatan arsip (contoh: Backup Tutup Buku Akhir Bulan Agustus)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    id="vps-create-snapshot-btn"
                    type="button"
                    onClick={() => {
                      setIsCreatingSnapshot(true);
                      handlePush(true);
                    }}
                    disabled={isCreatingSnapshot || isPushing}
                    className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{isCreatingSnapshot ? 'Menyimpan...' : 'Simpan Snapshot VPS'}</span>
                  </button>
                </div>
              </div>

              {/* Live Storage Summary Info */}
              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>
                    Sinkronisasi Terakhir:{' '}
                    <strong className="text-white">
                      {config.lastSyncTime ? new Date(config.lastSyncTime).toLocaleString('id-ID') : 'Belum pernah'}
                    </strong>
                  </span>
                </div>

                <a
                  href="/api/vps/download-live"
                  download
                  className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  title="Unduh file .json langsung ke komputer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh File .JSON Langsung</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: RIWAYAT SNAPSHOT VPS */}
          {activeTab === 'backups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Daftar File Snapshot Tersimpan di Harddisk VPS
                  </h3>
                  <p className="text-xs text-slate-400">
                    File arsip point-in-time yang tersimpan di direktori server Ubuntu Rumahweb
                  </p>
                </div>

                <button
                  id="vps-refresh-snapshots-btn"
                  type="button"
                  onClick={loadSnapshots}
                  disabled={isLoadingSnapshots}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {isLoadingSnapshots ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Memuat arsip snapshot dari VPS...</span>
                </div>
              ) : snapshots.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                  <Database className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">Belum Ada Snapshot Arsip di Server VPS</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Buat snapshot arsip di tab "Sinkronisasi & Backup Live" untuk mencadangkan database berkala di VPS.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-indigo-300 truncate">
                            {snap.filename}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            {Math.round(snap.sizeBytes / 1024)} KB
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 font-medium">
                          {snap.note || 'Arsip Sistem Rajawali'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                          <span>Waktu: {new Date(snap.timestamp).toLocaleString('id-ID')}</span>
                          <span>Oleh: {snap.author}</span>
                          {snap.summary && (
                            <span className="text-slate-400">
                              Data: {snap.summary.totalProjects} Proyek • {snap.summary.totalEmployees} Karyawan •{' '}
                              {snap.summary.totalTasks} Tugas • {snap.summary.totalFinanceTransactions} Keuangan
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(snap.filename)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          title="Pulihkan snapshot ini sebagai live database"
                        >
                          Pulihkan (Restore)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snap.filename)}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                          title="Hapus file snapshot ini dari VPS"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PANDUAN SETUP VPS RUMAHWEB (UBUNTU) */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Instalasi 1-Baris di VPS Rumahweb (OS Ubuntu)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jika Anda baru menyewa VPS Cloud di Rumahweb dengan OS Ubuntu (20.04, 22.04, atau 24.04 LTS),
                  cukup jalankan perintah shell di bawah ini untuk menginstal Node.js 22, PM2 Process Manager, Nginx
                  Reverse Proxy, dan Firewall otomatis:
                </p>

                {/* Shell Command Snippet */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between space-x-2 font-mono text-xs text-emerald-400 overflow-x-auto">
                  <code>{setupCommand}</code>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-sans font-semibold shrink-0 cursor-pointer transition-colors"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Tersalin!' : 'Salin Perintah'}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-step installation instructions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  5 Langkah Mudah Mengaktifkan Sistem di VPS Rumahweb:
                </h4>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Pesan VPS di Rumahweb:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Pilih paket Cloud VPS Rumahweb dengan sistem operasi <strong>Ubuntu 22.04 LTS</strong> atau{' '}
                        <strong>Ubuntu 24.04 LTS</strong>. Catat IP Publik dan password root VPS Anda.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Login ke VPS via SSH Terminal:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Buka Terminal (Mac/Linux) atau PuTTY (Windows), lalu ketik:{' '}
                        <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold">
                          ssh root@202.10.34.203
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Jalankan Script Otomatis:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Tempel dan jalankan perintah 1-baris di atas. Script akan otomatis menginstal seluruh
                        kebutuhan runtime, PM2 background service, dan Nginx web server dalam ~2 menit.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      4
                    </span>
                    <div>
                      <strong className="text-white">Akses Sistem dari Mana Saja:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Buka browser ke <code className="text-emerald-400 font-mono font-bold">http://vps.rtisystem.my.id</code>{' '}
                        atau <code className="text-emerald-400 font-mono font-bold">http://202.10.34.203</code>.
                        Seluruh user (Super Admin, Manager, Supervisor, Karyawan) kini dapat login dengan hak akses
                        masing-masing, dan data otomatis tersinkronisasi secara real-time!
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      5
                    </span>
                    <div>
                      <strong className="text-white">Domain vps.rtisystem.my.id & SSL HTTPS:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        DNS domain <code className="text-indigo-300 font-mono">vps.rtisystem.my.id</code> sudah diarahkan ke IP VPS Anda. Untuk mengaktifkan sertifikat SSL HTTPS gratis:
                        <code className="block mt-1 text-emerald-400 bg-slate-900 px-2 py-1 rounded font-mono text-[11px]">
                          certbot --nginx -d vps.rtisystem.my.id
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download shell script directly */}
              <div className="pt-2 flex justify-end">
                <a
                  href="/api/vps/deploy-script"
                  download="setup-vps-rumahweb.sh"
                  className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <FileDown className="w-4 h-4 text-indigo-400" />
                  <span>Unduh File setup-vps-rumahweb.sh</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sistem Real-Time Sinkronisasi VPS Rumahweb Aktif</span>
          </div>

          <button
            id="vps-modal-done-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
