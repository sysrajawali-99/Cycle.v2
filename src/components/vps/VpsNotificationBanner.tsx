import React, { useState, useEffect } from 'react';
import { 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  ExternalLink, 
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { vpsSyncService } from '../../services/vpsSyncService';
import { VpsSyncConfig } from '../../types/vps';

interface VpsNotificationBannerProps {
  onOpenVpsModal: () => void;
}

export const VpsNotificationBanner: React.FC<VpsNotificationBannerProps> = ({ onOpenVpsModal }) => {
  const [config, setConfig] = useState<VpsSyncConfig>(() => vpsSyncService.getConfig());
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'checking'>(
    () => config.connectionState || 'checking'
  );
  const [activeTarget, setActiveTarget] = useState<string | null>(config.activeTarget || null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    const handleConnectionEvent = (e: any) => {
      if (e.detail) {
        setConnectionState(e.detail.connected ? 'connected' : 'disconnected');
        setActiveTarget(e.detail.activeTarget || null);
        setStatusMessage(e.detail.message || '');
        setIsChecking(false);
      }
    };

    const handleConfigUpdated = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
        if (e.detail.connectionState) {
          setConnectionState(e.detail.connectionState);
        }
        if (e.detail.activeTarget) {
          setActiveTarget(e.detail.activeTarget);
        }
      }
    };

    window.addEventListener('vps_connection_event', handleConnectionEvent as EventListener);
    window.addEventListener('vps_config_updated', handleConfigUpdated as EventListener);

    return () => {
      window.removeEventListener('vps_connection_event', handleConnectionEvent as EventListener);
      window.removeEventListener('vps_config_updated', handleConfigUpdated as EventListener);
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    setIsDismissed(false);
    await vpsSyncService.checkConnection();
    setIsChecking(false);
  };

  // If user dismissed the banner, render nothing here (still accessible from Navbar and Sidebar)
  if (isDismissed) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
      {connectionState === 'connected' ? (
        /* ================= CONNECTED NOTIFICATION (HIJAU) ================= */
        <div
          id="vps-connected-notification-banner"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/70 border border-emerald-500/40 p-3 sm:p-4 text-emerald-100 shadow-lg shadow-emerald-950/30 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm">
                    VPS Terhubung (Online)
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                    {activeTarget || 'vps.rtisystem.my.id'}
                  </span>
                </div>
                <p className="text-xs text-emerald-300/90 leading-relaxed mt-0.5">
                  Sistem aktif terhubung ke VPS Rumahweb (Ubuntu). Sinkronisasi data real-time dua arah berjalan normal.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenVpsModal}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1"
              >
                <span>Detail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-xl text-emerald-400/70 hover:text-white hover:bg-emerald-900/40 transition-colors cursor-pointer"
                title="Tutup pemberitahuan"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : connectionState === 'disconnected' ? (
        /* ================= DISCONNECTED NOTIFICATION (MERAH/AMBER) ================= */
        <div
          id="vps-disconnected-notification-banner"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/80 border border-rose-500/40 p-3.5 sm:p-4 text-rose-100 shadow-lg shadow-rose-950/30 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3 min-w-0">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm">
                    VPS Tidak Terhubung
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-900/80 text-rose-300 border border-rose-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
                    vps.rtisystem.my.id (202.10.34.203)
                  </span>
                </div>
                <p className="text-xs text-rose-300/90 leading-relaxed mt-0.5">
                  Server VPS belum merespon. Seluruh data operasional Anda <strong>tetap aman tersimpan secara lokal</strong> di perangkat ini.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isChecking ? 'Memeriksa...' : 'Cek Ulang'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenVpsModal}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center space-x-1"
              >
                <span>Pengaturan VPS</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-xl text-rose-400/70 hover:text-white hover:bg-rose-900/40 transition-colors cursor-pointer"
                title="Tutup pemberitahuan"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Troubleshooting Advice */}
          <div className="mt-2.5 pt-2.5 border-t border-rose-500/20 text-[11px] text-rose-300/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Penyebab: Port 3000/80 di VPS belum terbuka, Node.js belum distart dengan PM2, atau DNS sedang propagasi.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenVpsModal}
              className="text-amber-300 hover:text-white underline font-medium cursor-pointer"
            >
              Lihat script instalasi otomatis &rarr;
            </button>
          </div>
        </div>
      ) : (
        /* ================= CHECKING NOTIFICATION (INDIGO) ================= */
        <div
          id="vps-checking-notification-banner"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/70 border border-indigo-500/30 p-3 sm:p-4 text-indigo-100 shadow-md animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <div>
                <span className="font-semibold text-xs sm:text-sm text-white">
                  Memeriksa Koneksi VPS...
                </span>
                <p className="text-[11px] text-indigo-300/80">
                  Menghubungkan ke <code>vps.rtisystem.my.id</code> dan IP <code>202.10.34.203</code>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-xl text-indigo-400/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
