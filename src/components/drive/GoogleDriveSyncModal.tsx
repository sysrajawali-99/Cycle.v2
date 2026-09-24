import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileJson,
  FileSpreadsheet,
  Trash2,
  X,
  Clock,
  Database,
  Sparkles,
  Settings,
  HardDrive,
  Folder,
  Layers,
  Check,
  ArrowUpRight,
  Bell,
  Users,
  Calendar,
  Package,
  CheckSquare,
  BarChart3,
  FileText,
  Key
} from 'lucide-react';
import {
  googleDriveService,
  DriveBackupFile,
  DriveUserInfo,
  DriveSyncSettings,
  DriveFolderInfo,
  LastBackupNotification,
  SUBFOLDER_DEFINITIONS,
  SubfolderKey,
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  DEFAULT_GOOGLE_CLIENT_ID
} from '../../services/googleDriveService';
import { ConfirmModal } from '../common/ConfirmModal';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
  userName?: string;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  userName = 'Super Admin HQ'
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'subfolders' | 'history' | 'export' | 'settings'>('backup');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<DriveUserInfo | null>(null);
  const [syncSettings, setSyncSettings] = useState<DriveSyncSettings>(googleDriveService.getSyncSettings());
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(googleDriveService.getLastBackupTime());
  const [lastNotification, setLastNotification] = useState<LastBackupNotification | null>(
    googleDriveService.getLastBackupNotification()
  );

  // Loading & process states
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState<boolean>(false);
  const [isInitializingFolders, setIsInitializingFolders] = useState<boolean>(false);
  const [isFetchingFiles, setIsFetchingFiles] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Drive Data State
  const [subfolders, setSubfolders] = useState<Record<SubfolderKey, DriveFolderInfo> | null>(null);
  const [subfolderFiles, setSubfolderFiles] = useState<Record<SubfolderKey, DriveBackupFile[]> | null>(null);
  const [rootFiles, setRootFiles] = useState<DriveBackupFile[]>([]);
  const [selectedSubfolderKey, setSelectedSubfolderKey] = useState<SubfolderKey>('database');

  // File selection for modals
  const [selectedFileToRestore, setSelectedFileToRestore] = useState<DriveBackupFile | null>(null);
  const [selectedFileToDelete, setSelectedFileToDelete] = useState<DriveBackupFile | null>(null);

  // Messages & Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string } | null>(
    null
  );
  const [backupNote, setBackupNote] = useState<string>('');
  const [showSuccessBanner, setShowSuccessBanner] = useState<boolean>(false);

  // Token manual input state
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [showManualTokenBox, setShowManualTokenBox] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
    }
  }, [isOpen]);

  const checkAuthStatus = () => {
    const token = googleDriveService.getStoredToken();
    const user = googleDriveService.getStoredUserInfo();
    if (token) {
      setIsConnected(true);
      setUserInfo(user || { email: 'sys.rajawali@gmail.com', name: 'Rajawali Account' });
      fetchDriveData();
    } else {
      setIsConnected(false);
      setUserInfo(null);
    }
    setSyncSettings(googleDriveService.getSyncSettings());
    setLastBackupTime(googleDriveService.getLastBackupTime());
    setLastNotification(googleDriveService.getLastBackupNotification());
  };

  const showToast = (type: 'success' | 'error', text: string, details?: string) => {
    setToastMessage({ type, text, details });
    if (type === 'success') {
      setShowSuccessBanner(true);
    }
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    try {
      const { user } = await googleDriveService.requestAccessToken();
      setIsConnected(true);
      setUserInfo(user);
      showToast('success', `Berhasil terhubung ke Google Drive (${user.email})`);
      fetchDriveData();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyambungkan Google Drive.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleConnectWithManualToken = async () => {
    if (!manualTokenInput.trim()) {
      showToast('error', 'Silakan masukkan Access Token terlebih dahulu.');
      return;
    }
    setIsAuthenticating(true);
    try {
      const { user } = await googleDriveService.setManualAccessToken(manualTokenInput.trim(), 'sys.rajawali@gmail.com');
      setIsConnected(true);
      setUserInfo(user);
      setManualTokenInput('');
      setShowManualTokenBox(false);
      showToast('success', `Berhasil terhubung langsung via Access Token (${user.email})`);
      fetchDriveData();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menggunakan token.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    googleDriveService.clearSession();
    setIsConnected(false);
    setUserInfo(null);
    setSubfolders(null);
    setSubfolderFiles(null);
    setRootFiles([]);
    setShowSuccessBanner(false);
    showToast('success', 'Koneksi Google Drive diputuskan.');
  };

  const fetchDriveData = async () => {
    if (!googleDriveService.getStoredToken()) return;
    setIsFetchingFiles(true);
    try {
      const data = await googleDriveService.listAllDriveFiles(syncSettings.folderId);
      setRootFiles(data.rootFiles);
      setSubfolderFiles(data.subfolderFiles);
      setSubfolders(data.subfolders);
    } catch (err: any) {
      console.warn('Could not list drive files:', err);
      if (err?.message?.includes('401') || err?.message?.includes('kedaluwarsa') || err?.message?.includes('authentication credential')) {
        setIsConnected(false);
        setUserInfo(null);
        showToast('error', err.message);
      }
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleInitializeFolders = async () => {
    setIsInitializingFolders(true);
    try {
      const created = await googleDriveService.ensureAllSubfoldersExist(syncSettings.folderId);
      setSubfolders(created);
      showToast(
        'success',
        'Struktur 6 Subfolder Berhasil Diverifikasi & Dibuat di Google Drive!',
        'Folder untuk Database, Karyawan, Timesheet, Inventory, Tugas & SOP, serta Laporan Eksekutif siap digunakan.'
      );
      fetchDriveData();
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('kedaluwarsa') || err?.message?.includes('authentication credential')) {
        setIsConnected(false);
        setUserInfo(null);
      }
      showToast('error', err.message || 'Gagal membuat struktur folder.');
    } finally {
      setIsInitializingFolders(false);
    }
  };

  // Action: Single Full Backup (Auto-Updates live file in 01_Full_Database_Backups)
  const handleExecuteBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await googleDriveService.backupAllDataToDrive(
        userName,
        backupNote || 'Cadangan Sistem Terkini Rajawali'
      );
      setLastBackupTime(result.notification.timestamp);
      setLastNotification(result.notification);
      setBackupNote('');

      showToast(
        'success',
        result.liveFile.isUpdated
          ? `Data Berhasil Diperbarui: "${result.liveFile.name}" di Subfolder [${result.folderInfo.name}]`
          : `Cadangan Berhasil Disimpan: "${result.liveFile.name}" di Subfolder [${result.folderInfo.name}]`,
        `Snapshot mencakup ${result.notification.summary.totalProjects} Lokasi Proyek, ${result.notification.summary.totalEmployees} Karyawan, dan ${result.notification.summary.totalTimesheets} Timesheet.`
      );
      fetchDriveData();
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('kedaluwarsa') || err?.message?.includes('authentication credential')) {
        setIsConnected(false);
        setUserInfo(null);
      }
      showToast('error', err.message || 'Gagal membuat cadangan data ke Google Drive.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Action: Batch Sync All 6 Modules to Subfolders
  const handleBatchSyncAll = async () => {
    setIsBatchSyncing(true);
    try {
      const { results, notification } = await googleDriveService.syncAllModulesToSubfolders(userName);
      setLastBackupTime(notification.timestamp);
      setLastNotification(notification);

      showToast(
        'success',
        'Semua 6 Modul Berhasil Disinkronkan & Diperbarui di Subfolder Google Drive!',
        `Database Snapshot (.json) dan 5 File Spreadsheet (.csv) telah tersimpan rapi di subfolder masing-masing.`
      );
      fetchDriveData();
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('kedaluwarsa') || err?.message?.includes('authentication credential')) {
        setIsConnected(false);
        setUserInfo(null);
      }
      showToast('error', err.message || 'Gagal menyinkronkan seluruh modul ke Google Drive.');
    } finally {
      setIsBatchSyncing(false);
    }
  };

  const handleExportSingleModule = async (
    moduleKey: 'employees' | 'timesheets' | 'inventory' | 'tasks_sop' | 'reports'
  ) => {
    setIsExporting(moduleKey);
    try {
      const file = await googleDriveService.exportModuleCsvToSubfolder(moduleKey);
      const def = SUBFOLDER_DEFINITIONS.find((d) => d.key === moduleKey);
      showToast(
        'success',
        file.isUpdated
          ? `File "${file.name}" Berhasil Diperbarui di Subfolder [${def?.name || moduleKey}]`
          : `File "${file.name}" Berhasil Diunggah ke Subfolder [${def?.name || moduleKey}]`,
        'File spreadsheet langsung siap dibuka dan dianalisis di Google Sheets.'
      );
      fetchDriveData();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal mengekspor data ke subfolder Google Drive.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedFileToRestore) return;
    setIsRestoring(true);
    try {
      const content = await googleDriveService.downloadFileContent(selectedFileToRestore.id);
      const result = googleDriveService.restoreDatabaseFromSnapshot(content);

      if (result.success) {
        showToast(
          'success',
          `Database Berhasil Dipulihkan dari Google Drive!`,
          `Dipulihkan: ${result.summary.totalProjects} Proyek, ${result.summary.totalEmployees} Karyawan, ${result.summary.totalTimesheets} Timesheet.`
        );
        setSelectedFileToRestore(null);
        if (onDataRestored) {
          onDataRestored();
        }
      } else {
        showToast('error', result.error || 'Gagal memulihkan database.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal mengunduh dan memulihkan file cadangan.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedFileToDelete) return;
    try {
      await googleDriveService.deleteFileFromDrive(selectedFileToDelete.id);
      showToast('success', `File "${selectedFileToDelete.name}" berhasil dihapus dari Google Drive.`);
      setSelectedFileToDelete(null);
      fetchDriveData();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus file dari Google Drive.');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    googleDriveService.saveSyncSettings(syncSettings);
    showToast('success', 'Pengaturan sinkronisasi Google Drive tersimpan.');
    fetchDriveData();
  };

  if (!isOpen) return null;

  const currentFolderUrl = `https://drive.google.com/drive/folders/${syncSettings.folderId || DEFAULT_DRIVE_FOLDER_ID}?usp=drive_link`;

  const getSubfolderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Database':
        return <Database className="w-4 h-4 text-amber-400" />;
      case 'Users':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      case 'Package':
        return <Package className="w-4 h-4 text-orange-400" />;
      case 'CheckSquare':
        return <CheckSquare className="w-4 h-4 text-purple-400" />;
      case 'BarChart3':
        return <BarChart3 className="w-4 h-4 text-sky-400" />;
      default:
        return <Folder className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-lg">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Google Drive Cloud Sync & Auto-Backup
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Auto-Update Aktif
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Penyimpanan terstruktur dalam folder & subfolder Google Drive dengan pembaruan data otomatis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFIKASI BERHASIL POPUP / SUCCESS BANNER */}
        {showSuccessBanner && lastNotification && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                  <span>Data Berhasil Dicadangkan & Diperbarui ke Google Drive</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                    {new Date(lastNotification.timestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Tersimpan di: <b className="text-slate-900">{lastNotification.folderName}</b> •{' '}
                  <span className="text-slate-600">
                    {lastNotification.summary.totalProjects} Lokasi, {lastNotification.summary.totalEmployees} Karyawan,{' '}
                    {lastNotification.summary.totalTimesheets} Timesheet
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
              <a
                href={lastNotification.webViewLink || currentFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
              >
                <span>Buka di Drive</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-white" />
              </a>
              <button
                type="button"
                onClick={() => setShowSuccessBanner(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && !showSuccessBanner && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl text-xs flex items-start space-x-2 border transition-all ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold">{toastMessage.text}</div>
              {toastMessage.details && <div className="text-[11px] opacity-80 mt-0.5">{toastMessage.details}</div>}
            </div>
          </div>
        )}

        {/* Connection Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-2">
                <span>Status Drive:</span>
                <span className={isConnected ? 'text-emerald-400' : 'text-slate-400'}>
                  {isConnected ? 'Terhubung & Siap Sinkronisasi' : 'Belum Terhubung'}
                </span>
              </div>
              {userInfo && (
                <div className="text-[11px] text-slate-400">
                  Akun: <b className="text-slate-200">{userInfo.email}</b> ({userInfo.name})
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={currentFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition"
              title="Buka Folder Utama di Google Drive"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Folder Utama Drive</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 transition cursor-pointer"
              >
                Putus Koneksi
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isAuthenticating}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
                <span>Hubungkan Google Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-3 sm:px-4 bg-slate-900 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Cadangkan & Perbarui</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('subfolders');
              fetchDriveData();
            }}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'subfolders'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Struktur 6 Subfolder</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              fetchDriveData();
            }}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Riwayat File Cadangan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Modul CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan Folder</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* PROMINENT CONNECT BANNER IF NOT CONNECTED */}
          {!isConnected && (
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-xs space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start space-x-3">
                <div className="p-3 bg-blue-100 border border-blue-200 rounded-xl text-blue-700 shrink-0">
                  <Cloud className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm sm:text-base font-extrabold text-blue-950">
                    Hubungkan Akun Google Drive Anda
                  </h4>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    Status saat ini: <span className="font-bold text-amber-700">Belum Terhubung</span>. Berikan otorisasi akun Google (<span className="text-blue-800 font-semibold font-mono">sys.rajawali@gmail.com</span>) agar sistem dapat membuat folder, mencadangkan, dan memperbarui data secara otomatis.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-blue-200">
                <div className="text-[11px] text-slate-600 flex items-center space-x-1.5 self-start sm:self-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Koneksi aman langsung via Google Identity Services</span>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowManualTokenBox(!showManualTokenBox)}
                    className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-xs"
                    title="Alternatif: Masukkan Access Token Langsung"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isAuthenticating}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>{isAuthenticating ? 'Membuka Jendela Otorisasi...' : 'Hubungkan Google Drive Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Manual Token Input */}
              {showManualTokenBox && (
                <div className="p-3.5 mt-2 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Metode Alternatif: Masukkan Google OAuth Access Token</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManualTokenBox(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Batal
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Jika pop-up Google OAuth di browser Anda terblokir, Anda dapat menempelkan <strong>Access Token</strong> (dari OAuth Playground / gcloud) untuk langsung menghubungkan akun:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="Tempelkan Access Token (ya29.a0...)"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleConnectWithManualToken}
                      disabled={isAuthenticating || !manualTokenInput.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Aktifkan & Sambungkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: CADANGKAN & PERBARUI DATA */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Snapshot Info Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 shrink-0">
                      <Database className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Cadangan Komprehensif & Auto-Update Subfolder
                      </h4>
                      <p className="text-xs text-slate-600">
                        Data otomatis diperbarui di file terkini tanpa duplikasi, tersimpan rapi di subfolder Google Drive.
                      </p>
                    </div>
                  </div>
                  {lastBackupTime && (
                    <div className="text-left sm:text-right bg-slate-50 p-2 sm:p-0 rounded-lg sm:bg-transparent">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Terakhir Diperbarui
                      </div>
                      <div className="text-xs text-emerald-700 font-semibold flex items-center sm:justify-end space-x-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{new Date(lastBackupTime).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">Target Subfolder Snapshot</div>
                    <div className="font-bold text-amber-800 truncate">📁 01_Full_Database_Backups</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">File Live Terkini</div>
                    <div className="font-bold text-slate-800 truncate">Rajawali_Database_Terbaru.json</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">Metode Pembaruan</div>
                    <div className="font-bold text-emerald-700">Auto-Overwrite / Patch</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">Notifikasi Sukses</div>
                    <div className="font-bold text-blue-700">Aktif & Terverifikasi</div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (SINGLE OR BATCH ALL) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* 1. Cadangkan Database */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
                      <Database className="w-4 h-4 text-amber-600" />
                      <span>Cadangkan Snapshot Database</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Memperbarui file JSON database lengkap di folder <code className="text-slate-800 font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">01_Full_Database_Backups</code>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteBackup}
                    disabled={isBackingUp || !isConnected}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    <span>{isBackingUp ? 'Memperbarui di Google Drive...' : 'Perbarui Database Sekarang'}</span>
                  </button>
                </div>

                {/* 2. Batch Sync All 6 Modules */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Sinkronkan Semua 6 Subfolder (1-Klik)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Otomatis membuat/memperbarui seluruh file spreadsheet (.csv) dan snapshot (.json) ke semua 6 subfolder Drive.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleBatchSyncAll}
                    disabled={isBatchSyncing || !isConnected}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isBatchSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isBatchSyncing ? 'Menyinkronkan 6 Subfolder...' : 'Sinkronkan Semua Subfolder (1-Klik)'}</span>
                  </button>
                </div>
              </div>

              {/* Note input */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Tambahan Cadangan (Opsional):
                </label>
                <input
                  type="text"
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  placeholder="Contoh: Pembaruan Rutin Mingguan / Penutupan Payroll Bulan Ini"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: STRUKTUR 6 SUBFOLDER */}
          {activeTab === 'subfolders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span>Struktur Subfolder Terorganisir di Google Drive</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Folder induk ID: <code className="text-amber-400 font-mono">{syncSettings.folderId}</code>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleInitializeFolders}
                    disabled={isInitializingFolders || !isConnected}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isInitializingFolders ? 'animate-spin' : ''}`} />
                    <span>Verifikasi / Buat Subfolder</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchDriveData}
                    disabled={isFetchingFiles}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Segarkan data folder"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Subfolder Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {SUBFOLDER_DEFINITIONS.map((def) => {
                  const folderInfo = subfolders ? subfolders[def.key] : null;
                  const fileCount = subfolderFiles && subfolderFiles[def.key] ? subfolderFiles[def.key].length : 0;
                  const isSelected = selectedSubfolderKey === def.key;

                  return (
                    <div
                      key={def.key}
                      onClick={() => setSelectedSubfolderKey(def.key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-slate-950/70 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                            {getSubfolderIcon(def.icon)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white truncate max-w-[150px]">{def.name}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold">{fileCount} File Tersimpan</div>
                          </div>
                        </div>

                        {folderInfo?.webViewLink && (
                          <a
                            href={folderInfo.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Buka subfolder ini di tab baru"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{def.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Files in Selected Subfolder */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>
                    Daftar File dalam Subfolder:{' '}
                    <span className="text-amber-400">
                      {SUBFOLDER_DEFINITIONS.find((d) => d.key === selectedSubfolderKey)?.name}
                    </span>
                  </span>
                  {selectedSubfolderKey !== 'database' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleExportSingleModule(
                          selectedSubfolderKey as 'employees' | 'timesheets' | 'inventory' | 'tasks_sop' | 'reports'
                        )
                      }
                      disabled={Boolean(isExporting) || !isConnected}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Perbarui Data Modul Ini</span>
                    </button>
                  )}
                </div>

                {subfolderFiles && subfolderFiles[selectedSubfolderKey]?.length > 0 ? (
                  <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950/60">
                    {subfolderFiles[selectedSubfolderKey].map((file) => {
                      const isJson = file.name.endsWith('.json') || file.mimeType?.includes('json');
                      return (
                        <div key={file.id} className="p-3 flex items-center justify-between hover:bg-slate-900/60 transition gap-2">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${isJson ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {isJson ? <FileJson className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">{file.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                                <span>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('id-ID') : '-'}</span>
                                {file.size && <span>• {(parseInt(file.size, 10) / 1024).toFixed(1)} KB</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {isJson && (
                              <button
                                type="button"
                                onClick={() => setSelectedFileToRestore(file)}
                                className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                              >
                                <CloudDownload className="w-3 h-3" />
                                <span>Pulihkan</span>
                              </button>
                            )}

                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                                title="Buka di Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedFileToDelete(file)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Hapus file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                    Belum ada file di subfolder ini. Klik tombol "Sinkronkan Semua Subfolder" atau "Perbarui Data Modul Ini".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT SEMUA FILE CADANGAN */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Daftar File Cadangan di Seluruh Folder & Subfolder
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    File dapat langsung dipulihkan atau dilihat di Google Drive.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchDriveData}
                  disabled={isFetchingFiles}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFiles ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {isFetchingFiles ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span>Memeriksa file di Google Drive...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Database Subfolder files */}
                  {subfolderFiles?.database && subfolderFiles.database.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-amber-400 flex items-center space-x-1">
                        <Database className="w-3.5 h-3.5" />
                        <span>📁 01_Full_Database_Backups (Snapshot JSON)</span>
                      </div>
                      <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950/60">
                        {subfolderFiles.database.map((file) => (
                          <div key={file.id} className="p-3 flex items-center justify-between hover:bg-slate-900/60 transition gap-2">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                                <FileJson className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
                                  <span>{file.name}</span>
                                  {file.name.includes('Terbaru') && (
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                      Live Terkini
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Diperbarui: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('id-ID') : '-'} •{' '}
                                  {file.size ? `${(parseInt(file.size, 10) / 1024).toFixed(1)} KB` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedFileToRestore(file)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                              >
                                <CloudDownload className="w-3.5 h-3.5" />
                                <span>Pulihkan</span>
                              </button>

                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedFileToDelete(file)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Root or Other Files */}
                  {rootFiles.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>📁 Root Folder Files</span>
                      </div>
                      <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950/60">
                        {rootFiles.map((file) => (
                          <div key={file.id} className="p-3 flex items-center justify-between hover:bg-slate-900/60 transition gap-2">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{file.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('id-ID') : '-'}
                                </div>
                              </div>
                            </div>
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EKSPOR MODUL CSV */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Ekspor & Perbarui Modul Spreadsheet (.CSV) ke Subfolder Drive
                </h4>
                <p className="text-[11px] text-slate-400">
                  File spreadsheet otomatis diperbarui pada subfolder yang sesuai, siap dibuka di Google Sheets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Master Karyawan */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Master Karyawan</div>
                      <div className="text-[10px] text-slate-400">📁 02_Master_Karyawan</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportSingleModule('employees')}
                    disabled={Boolean(isExporting) || !isConnected}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {isExporting === 'employees' ? 'Memperbarui...' : 'Perbarui CSV'}
                  </button>
                </div>

                {/* 2. Timesheet Absensi */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Rekap Timesheet</div>
                      <div className="text-[10px] text-slate-400">📁 03_Timesheet_Kehadiran</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportSingleModule('timesheets')}
                    disabled={Boolean(isExporting) || !isConnected}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {isExporting === 'timesheets' ? 'Memperbarui...' : 'Perbarui CSV'}
                  </button>
                </div>

                {/* 3. Smart Inventory */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Smart Inventory</div>
                      <div className="text-[10px] text-slate-400">📁 04_Inventory_Stok</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportSingleModule('inventory')}
                    disabled={Boolean(isExporting) || !isConnected}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {isExporting === 'inventory' ? 'Memperbarui...' : 'Perbarui CSV'}
                  </button>
                </div>

                {/* 4. Tugas & SOP */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Tugas & SOP K3</div>
                      <div className="text-[10px] text-slate-400">📁 05_Tugas_Kebersihan_SOP</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportSingleModule('tasks_sop')}
                    disabled={Boolean(isExporting) || !isConnected}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {isExporting === 'tasks_sop' ? 'Memperbarui...' : 'Perbarui CSV'}
                  </button>
                </div>

                {/* 5. Laporan Eksekutif */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between sm:col-span-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Ringkasan Eksekutif Operasional</div>
                      <div className="text-[10px] text-slate-400">📁 06_Laporan_Eksekutif</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportSingleModule('reports')}
                    disabled={Boolean(isExporting) || !isConnected}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {isExporting === 'reports' ? 'Memperbarui...' : 'Perbarui CSV'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PENGATURAN FOLDER */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Pengaturan Folder & Kebijakan Pembaruan
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Google Drive Root Folder ID:
                  </label>
                  <input
                    type="text"
                    value={syncSettings.folderId}
                    onChange={(e) => setSyncSettings({ ...syncSettings, folderId: e.target.value.trim() })}
                    placeholder={DEFAULT_DRIVE_FOLDER_ID}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Folder saat ini: <code className="text-amber-400">{DEFAULT_DRIVE_FOLDER_URL}</code>
                  </p>
                </div>

                {/* Custom Client ID field for OAuth troubleshooting */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Google OAuth Client ID (Opsional / Kustom):
                  </label>
                  <input
                    type="text"
                    defaultValue={googleDriveService.getCustomClientId()}
                    onChange={(e) => googleDriveService.setCustomClientId(e.target.value)}
                    placeholder={DEFAULT_GOOGLE_CLIENT_ID}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Default Client ID: <code className="text-blue-300 text-[10px] break-all">{DEFAULT_GOOGLE_CLIENT_ID}</code>
                  </p>
                  <p className="text-[11px] text-amber-400/90 mt-1">
                    💡 Jika muncul <em>Error 401: invalid_client</em>, Anda dapat memasukkan OAuth Client ID (Web Application) dari Google Cloud Console Anda dengan Authorized JavaScript Origins URL aplikasi ini.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Selalu Perbarui File Terkini (Overwrite / Patch)</div>
                      <div className="text-[11px] text-slate-400">
                        Memperbarui file data langsung tanpa membuat duplikat bertumpuk
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={syncSettings.alwaysOverwriteLiveFile}
                      onChange={(e) => setSyncSettings({ ...syncSettings, alwaysOverwriteLiveFile: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Simpan Arsip Historis Bertanggal</div>
                      <div className="text-[11px] text-slate-400">
                        Membuat salinan snapshot bertanggal (misal: <code>Rajawali_Arsip_2026-08-29.json</code>) untuk audit
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={syncSettings.keepHistoricalArchive}
                      onChange={(e) => setSyncSettings({ ...syncSettings, keepHistoricalArchive: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Tampilkan Banner & Notifikasi Sukses</div>
                      <div className="text-[11px] text-slate-400">
                        Tampilkan banner detail setiap kali data berhasil dicadangkan/diperbarui
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={syncSettings.notifyOnSuccess}
                      onChange={(e) => setSyncSettings({ ...syncSettings, notifyOnSuccess: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Koneksi Google Drive terenkripsi TLS dengan otorisasi resmi Google OAuth.</span>
            <span className="sm:hidden">Koneksi aman Google OAuth.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* CONFIRM RESTORE MODAL */}
      <ConfirmModal
        isOpen={Boolean(selectedFileToRestore)}
        title="Pulihkan Database dari Google Drive"
        message={`PERINGATAN: Memulihkan file "${selectedFileToRestore?.name}" akan menimpa data operasional aplikasi saat ini dengan data dari file cadangan tersebut. Apakah Anda yakin ingin melanjutkan?`}
        confirmText="Ya, Pulihkan Sekarang"
        cancelText="Batal"
        confirmVariant="warning"
        onConfirm={handleConfirmRestore}
        onCancel={() => setSelectedFileToRestore(null)}
      />

      {/* CONFIRM DELETE BACKUP MODAL */}
      <ConfirmModal
        isOpen={Boolean(selectedFileToDelete)}
        title="Hapus File Cadangan dari Google Drive"
        message={`Apakah Anda yakin ingin menghapus file "${selectedFileToDelete?.name}" dari Google Drive? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus File"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSelectedFileToDelete(null)}
      />
    </div>
  );
};
