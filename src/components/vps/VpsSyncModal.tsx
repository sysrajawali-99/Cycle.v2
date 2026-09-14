import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  DownloadCloud,
  X,
  Copy,
  Check,
  Radio,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  Globe
} from 'lucide-react';
import { vpsSyncService, VpsConnectionStatus } from '../../services/vpsSyncService';

interface VpsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VpsSyncModal: React.FC<VpsSyncModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<VpsConnectionStatus>(() => vpsSyncService.getStatus());
  const [activeGuideTab, setActiveGuideTab] = useState<'quick' | 'postgres' | 'deploy' | 'nginx'>('quick');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = vpsSyncService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });
    vpsSyncService.checkStatus();
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const handleReconnect = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await vpsSyncService.reconnect();
      if (res.connected) {
        setActionMessage({ type: 'success', text: 'Berhasil terhubung ke database PostgreSQL di VPS!' });
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || 'Belum dapat terhubung ke PostgreSQL VPS. Sistem otomatis memakai penyimpanan lokal fallback.'
        });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Gagal melakukan koneksi ke VPS.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushAll = async () => {
    if (!window.confirm('Unggah seluruh data lokal saat ini ke server VPS? Data di VPS akan diperbarui.')) {
      return;
    }
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await vpsSyncService.pushAllDataToVps();
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Berhasil mengunggah data lokal ke database VPS (${res.count ?? 20} modul data tersinkronisasi)!`
        });
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Gagal mengunggah data ke VPS.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Terjadi kendala jaringan saat sinkronisasi.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullAll = async () => {
    if (!window.confirm('Tarik data terbaru dari server VPS? Data lokal browser Anda akan disinkronkan dengan data VPS.')) {
      return;
    }
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await vpsSyncService.pullAllDataFromVps();
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Berhasil memperbarui data browser dari VPS (${res.count ?? 0} modul data diperbarui)!`
        });
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Gagal menarik data dari VPS.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Terjadi kendala jaringan saat mengambil data.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto p-3 sm:p-5 md:p-6 flex justify-center items-start sm:items-center">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>Integrasi Database VPS & Real-Time Sync</span>
              </h3>
              <p className="text-xs text-slate-400">
                Penyimpanan terpusat pada server VPS Anda dengan sinkronisasi multi-pengguna instan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status Alert Message */}
          {actionMessage && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center space-x-3 text-xs animate-in fade-in duration-200 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="font-semibold">{actionMessage.text}</span>
            </div>
          )}

          {/* Real-time Status Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Status Database Backend
                </span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      status.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-bold text-sm text-white">
                    {status.connected ? 'PostgreSQL VPS Terhubung' : 'Penyimpanan Lokal (Local File Engine)'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                      status.connected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {status.engine === 'postgresql' ? 'PostgreSQL' : 'Local Fallback'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleReconnect}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Cek Koneksi</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[11px] text-slate-400 block">Aliran Real-Time (Socket.IO):</span>
                <div className="flex items-center space-x-1.5">
                  <Radio
                    className={`w-3.5 h-3.5 ${
                      status.socketConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                    }`}
                  />
                  <span className="font-bold text-slate-200">
                    {status.socketConnected ? 'Real-Time Aktif' : 'Standby / Polling'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[11px] text-slate-400 block">Host VPS / Database:</span>
                <span className="font-mono text-slate-200 font-semibold truncate block" title={status.host || 'Default'}>
                  {status.host || 'Server Internal / Localhost'}
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[11px] text-slate-400 block">Sinkronisasi Terakhir:</span>
                <span className="text-slate-200 font-mono">
                  {status.lastSync ? new Date(status.lastSync).toLocaleTimeString('id-ID') : '-'}
                </span>
              </div>
            </div>

            {/* Manual Bulk Sync Controls */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Data disinkronkan secara <b>otomatis</b> setiap ada perubahan. Anda juga dapat melakukan sinkronisasi manual:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handlePushAll}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Lokal ke VPS</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handlePullAll}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Download dari VPS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guide Tabs */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveGuideTab('quick')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeGuideTab === 'quick'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Cara Cepat (.env)
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('postgres')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeGuideTab === 'postgres'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Setup PostgreSQL VPS
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('deploy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeGuideTab === 'deploy'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Deploy Node.js & PM2
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('nginx')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeGuideTab === 'nginx'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4. Nginx Reverse Proxy
              </button>
            </div>

            {/* TAB 1: Quick ENV Setup */}
            {activeGuideTab === 'quick' && (
              <div className="space-y-4 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Sistem ini telah dilengkapi dengan adapter dual-mode bawaan. Cukup tambahkan variabel lingkungan{' '}
                  <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300">DATABASE_URL</code>{' '}
                  pada file <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">.env</code> di server VPS Anda.
                  Tabel state dan audit log akan dibuat <b>secara otomatis</b> saat server pertama kali berjalan.
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 relative">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-mono">Contoh isi file .env di VPS:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `PORT=3000\nDATABASE_URL="postgresql://rajawali_user:PasswordKuat123@127.0.0.1:5432/rajawali_db"\nNODE_ENV=production`,
                          'env'
                        )
                      }
                      className="flex items-center space-x-1 text-amber-400 hover:underline cursor-pointer"
                    >
                      {copiedSnippet === 'env' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === 'env' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-amber-300 overflow-x-auto p-2 bg-slate-900 rounded-xl">
{`PORT=3000
DATABASE_URL="postgresql://rajawali_user:PasswordKuat123@127.0.0.1:5432/rajawali_db"
NODE_ENV=production`}
                  </pre>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Toleransi Kegagalan (Zero Downtime Fallback)</span>
                  </span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Bila koneksi internet ke PostgreSQL terputus sementara atau VPS sedang di-restart, sistem akan otomatis
                    beralih ke penyimpanan lokal file JSON tanpa membuat pengguna logout atau kehilangan data yang baru diinput.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Postgres Setup */}
            {activeGuideTab === 'postgres' && (
              <div className="space-y-4 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Jalankan perintah berikut melalui terminal SSH di VPS Ubuntu/Debian untuk menginstal dan membuat database:
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-mono">1. Install PostgreSQL & Buat Database:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `sudo apt update && sudo apt install -y postgresql postgresql-contrib\nsudo -u postgres psql -c "CREATE USER rajawali_user WITH PASSWORD 'PasswordKuat123';"\nsudo -u postgres psql -c "CREATE DATABASE rajawali_db OWNER rajawali_user;"\nsudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rajawali_db TO rajawali_user;"`,
                          'pg_install'
                        )
                      }
                      className="flex items-center space-x-1 text-amber-400 hover:underline cursor-pointer"
                    >
                      {copiedSnippet === 'pg_install' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === 'pg_install' ? 'Tersalin' : 'Salin Perintah'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto p-2.5 bg-slate-900 rounded-xl">
{`# Update & Install
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# Buat User & Database
sudo -u postgres psql -c "CREATE USER rajawali_user WITH PASSWORD 'PasswordKuat123';"
sudo -u postgres psql -c "CREATE DATABASE rajawali_db OWNER rajawali_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rajawali_db TO rajawali_user;"`}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 3: Node & PM2 */}
            {activeGuideTab === 'deploy' && (
              <div className="space-y-4 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Gunakan Process Manager 2 (PM2) agar aplikasi tetap berjalan 24/7 dan otomatis menyala kembali jika VPS reboot:
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-mono">Menjalankan via PM2:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `npm install -g pm2\ncd /var/www/rajawali-cycle\nnpm install\nnpm run build\npm2 start npm --name "rajawali-app" -- start\npm2 save\npm2 startup`,
                          'pm2'
                        )
                      }
                      className="flex items-center space-x-1 text-amber-400 hover:underline cursor-pointer"
                    >
                      {copiedSnippet === 'pm2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === 'pm2' ? 'Tersalin' : 'Salin Perintah'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-cyan-300 overflow-x-auto p-2.5 bg-slate-900 rounded-xl">
{`npm install -g pm2
cd /var/www/rajawali-cycle
npm install
npm run build
pm2 start npm --name "rajawali-app" -- start
pm2 save
pm2 startup`}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 4: Nginx Proxy */}
            {activeGuideTab === 'nginx' && (
              <div className="space-y-4 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Konfigurasi Nginx untuk meneruskan traffic domain/IP ke port 3000 lengkap dengan dukungan WebSocket Socket.IO:
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-mono">/etc/nginx/sites-available/rajawali:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `server {
    listen 80;
    server_name portal.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`,
                          'nginx'
                        )
                      }
                      className="flex items-center space-x-1 text-amber-400 hover:underline cursor-pointer"
                    >
                      {copiedSnippet === 'nginx' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === 'nginx' ? 'Tersalin' : 'Salin Konfigurasi'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-amber-300 overflow-x-auto p-2.5 bg-slate-900 rounded-xl">
{`server {
    listen 80;
    server_name portal.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Database className="w-4 h-4 text-amber-400" />
            <span>Dual-Mode Storage: PostgreSQL Primary + Local File Fallback</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
