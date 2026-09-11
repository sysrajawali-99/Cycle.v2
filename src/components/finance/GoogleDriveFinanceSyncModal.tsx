import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Clock,
  Database,
  X,
  Lock,
  Layers,
  ArrowRight,
  Download,
  Key,
  LogOut,
  UserCheck
} from 'lucide-react';
import {
  googleDriveService,
  DriveUserInfo,
  DEFAULT_DRIVE_FOLDER_URL
} from '../../services/googleDriveService';
import { AuditTrailItem } from '../../types';

interface GoogleDriveFinanceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onAddAuditLog?: (log: AuditTrailItem) => void;
}

export const GoogleDriveFinanceSyncModal: React.FC<GoogleDriveFinanceSyncModalProps> = ({
  isOpen,
  onClose,
  userName = 'Finance Manager',
  onAddAuditLog
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(!!googleDriveService.getStoredToken());
  const [userInfo, setUserInfo] = useState<DriveUserInfo | null>(googleDriveService.getStoredUserInfo());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [showManualTokenInput, setShowManualTokenInput] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState<boolean>(false);
  const [backupNote, setBackupNote] = useState<string>('Backup Rutin Divisi Finance & Accounting');
  const [lastBackupResult, setLastBackupResult] = useState<{
    timestamp: string;
    files: Array<{ name: string; size?: string; id?: string }>;
    folderName: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const token = googleDriveService.getStoredToken();
      setIsConnected(!!token);
      setUserInfo(googleDriveService.getStoredUserInfo());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    setStatusMessage(null);
    try {
      const res = await googleDriveService.requestAccessToken();
      setIsConnected(true);
      setUserInfo(res.user);
      setStatusMessage({
        type: 'success',
        text: `Berhasil terhubung dengan Google Drive (${res.user.email})!`
      });
    } catch (err: any) {
      setIsConnected(false);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal menyambungkan Google Drive. Periksa perizinan popup browser.'
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSaveManualToken = async () => {
    if (!manualToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Masukkan Google OAuth Access Token yang valid.' });
      return;
    }
    setIsAuthenticating(true);
    setStatusMessage(null);
    try {
      const res = await googleDriveService.setManualAccessToken(manualToken.trim(), 'sys.rajawali@gmail.com');
      setIsConnected(true);
      setUserInfo(res.user);
      setManualToken('');
      setShowManualTokenInput(false);
      setStatusMessage({
        type: 'success',
        text: `Berhasil terhubung menggunakan Access Token (${res.user.email})!`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Token tidak valid.' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    googleDriveService.clearSession();
    setIsConnected(false);
    setUserInfo(null);
    setStatusMessage({ type: 'success', text: 'Koneksi akun Google Drive berhasil diputuskan.' });
  };

  const handleExecuteFinanceBackup = async () => {
    if (!isConnected) {
      setStatusMessage({
        type: 'error',
        text: 'Silakan hubungkan akun Google Drive terlebih dahulu sebelum memulai proses backup.'
      });
      return;
    }

    setIsBackingUp(true);
    setStatusMessage(null);
    try {
      const res = await googleDriveService.backupFinanceModuleToDrive(userName, backupNote);

      if (res && res.files && res.files.length > 0) {
        setLastBackupResult({
          timestamp: new Date().toLocaleString('id-ID'),
          files: res.files.map((f) => ({ name: f.name, size: f.size || '15 KB', id: f.id })),
          folderName: res.folderInfo.name || '07_Finance_dan_Accounting'
        });

        setStatusMessage({
          type: 'success',
          text: `Berhasil mencadangkan ${res.files.length} file ke Google Drive folder "${res.folderInfo.name || '07_Finance_dan_Accounting'}"!`
        });

        if (onAddAuditLog) {
          onAddAuditLog({
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            userName: userName,
            userRole: 'Finance & Accounting',
            actionType: 'CREATE',
            module: 'Master Akun COA',
            recordId: `gdrive-bkp-${Date.now()}`,
            recordCode: 'GDRIVE-BKP',
            description: `Melakukan pencadangan cloud Google Drive modul Finance ke folder 07_Finance_dan_Accounting (${backupNote})`
          });
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Terjadi kendala saat mengunggah data ke Google Drive.'
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Gagal memproses backup.';
      if (errMsg.includes('401') || errMsg.includes('kedaluwarsa') || errMsg.includes('authentication credential')) {
        setIsConnected(false);
        setUserInfo(null);
      }
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Direct offline download without Google credentials
  const handleDownloadOfflineBackup = () => {
    try {
      setIsDownloadingOffline(true);
      const financePayload = googleDriveService.generateFinanceBackupPayload(userName, backupNote);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(financePayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `BACKUP_FINANCE_RAJAWALI_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({
        type: 'success',
        text: 'File cadangan offline modul Finance (.json) berhasil diunduh langsung ke komputer Anda!'
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Gagal membuat file unduhan offline: ' + (err?.message || err)
      });
    } finally {
      setIsDownloadingOffline(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Drive Backup - Divisi Finance</h3>
              <p className="text-xs text-slate-400">
                Pencadangan otomatis Buku Kas, Jurnal, COA, Laporan SAK, dan Jejak Audit Trail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* Authentication State Card */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isConnected ? <UserCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Status Otorisasi Google Drive</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {isConnected ? 'Terhubung' : 'Belum Terhubung'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isConnected && userInfo
                  ? `Akun aktif: ${userInfo.email || userInfo.name}`
                  : 'Hubungkan akun Google Drive untuk pencadangan otomatis.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putus Akun</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isAuthenticating}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center space-x-1.5 shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAuthenticating ? 'animate-spin' : ''}`} />
                  <span>{isAuthenticating ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualTokenInput(!showManualTokenInput)}
                  title="Gunakan OAuth Access Token Manual"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Manual Token Input (Expandable) */}
        {!isConnected && showManualTokenInput && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Masukkan OAuth Access Token Google (Manual)</span>
              </span>
              <a
                href="https://developers.google.com/oauthplayground"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-400 hover:underline flex items-center space-x-0.5"
              >
                <span>OAuth Playground</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex space-x-2">
              <input
                type="password"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="ya29.a0AfH6SM..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveManualToken}
                disabled={isAuthenticating}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Gunakan
              </button>
            </div>
          </div>
        )}

        {/* Target Folder Details */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Lokasi Penyimpanan Cloud GDrive:</span>
            </div>
            <a
              href={DEFAULT_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1 font-semibold"
            >
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-1 font-mono text-slate-300">
            <div className="text-emerald-400 font-bold">📂 RAJAWALI_CYCLE_CLOUD_BACKUP</div>
            <div className="pl-4 text-slate-400">└── 📁 07_Finance_dan_Accounting</div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>File Transaksi Kas & Bank (CSV)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Bagan Akun Master COA & Saldo Berjalan (CSV)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Log Jejak Audit Trail & Riwayat Penghapusan (CSV)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Snapshot JSON Terenkripsi untuk Pemulihan Cepat (Restore)</span>
            </div>
          </div>
        </div>

        {/* Form Note */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Catatan / Label Backup</label>
          <input
            type="text"
            value={backupNote}
            onChange={(e) => setBackupNote(e.target.value)}
            placeholder="Contoh: Backup Akhir Bulan Agustus 2026"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
          />
        </div>

        {/* Last Backup Result */}
        {lastBackupResult && (
          <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span>Pencadangan Berhasil Disimpan:</span>
              <span className="font-mono text-[11px] text-slate-400">{lastBackupResult.timestamp}</span>
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              {lastBackupResult.files.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{f.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{f.size}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleDownloadOfflineBackup}
            disabled={isDownloadingOffline}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            title="Download cadangan langsung ke komputer tanpa memerlukan koneksi Google"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Unduh File Cadangan Offline (.json)</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={isConnected ? handleExecuteFinanceBackup : handleConnectGoogle}
              disabled={isBackingUp || isAuthenticating}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
              <span>
                {isBackingUp
                  ? 'Mengunggah ke GDrive...'
                  : isConnected
                  ? 'Mulai Backup ke GDrive'
                  : 'Hubungkan & Backup ke GDrive'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
