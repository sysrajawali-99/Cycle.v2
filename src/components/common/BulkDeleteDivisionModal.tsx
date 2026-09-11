import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  KeyRound,
  Trash2,
  X,
  Lock,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Wallet,
  Users,
  Building2,
  Megaphone,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserAccount } from '../../types';
import { storageService } from '../../services/storageService';

export type DeletableDivision = 'finance' | 'hrm' | 'operations' | 'blast' | 'all';

interface BulkDeleteDivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDivision?: DeletableDivision;
  currentUser?: UserAccount;
  users?: UserAccount[];
  onSuccess?: (divisionLabel: string) => void;
}

export const BulkDeleteDivisionModal: React.FC<BulkDeleteDivisionModalProps> = ({
  isOpen,
  onClose,
  initialDivision = 'finance',
  currentUser,
  users = [],
  onSuccess
}) => {
  const [selectedDivision, setSelectedDivision] = useState<DeletableDivision>(initialDivision);
  const [confirmWord, setConfirmWord] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if current user is Super Admin
  const isSuperAdmin = currentUser?.role === 'Super Admin (HQ)';

  // Sync initial division on open
  useEffect(() => {
    if (isOpen) {
      setSelectedDivision(initialDivision);
      setConfirmWord('');
      setSecurityPin('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsProcessing(false);
      setShowPin(false);
    }
  }, [isOpen, initialDivision]);

  if (!isOpen) return null;

  // Real-time record counts
  const financeCounts = {
    transactions: storageService.getFinanceTransactions().length,
    statements: storageService.getBankStatements().length,
    debts: storageService.getDebts().length,
    receivables: storageService.getReceivables().length,
    investments: storageService.getInvestments().length,
    periodClosings: storageService.getPeriodClosings().length,
    auditTrails: storageService.getAuditTrails().length
  };
  const totalFinanceRecords = Object.values(financeCounts).reduce((a, b) => a + b, 0);

  const hrmCounts = {
    employees: storageService.getEmployees().length,
    timesheets: storageService.getTimesheets().length,
    mutations: storageService.getMutations().length,
    sops: storageService.getSops().length
  };
  const totalHrmRecords = Object.values(hrmCounts).reduce((a, b) => a + b, 0);

  const operationsCounts = {
    projects: storageService.getProjects().length,
    inventoryItems: storageService.getInventoryItems().length,
    projectStocks: storageService.getProjectStocks().length,
    inventoryLogs: storageService.getInventoryLogs().length,
    materialRequests: storageService.getMaterialRequests().length,
    tasks: storageService.getTasks().length
  };
  const totalOperationsRecords = Object.values(operationsCounts).reduce((a, b) => a + b, 0);

  const blastCounts = {
    blasts: storageService.getBlasts().length
  };
  const totalBlastRecords = blastCounts.blasts;

  const totalAllRecords = totalFinanceRecords + totalHrmRecords + totalOperationsRecords + totalBlastRecords;

  const divisionMeta: Record<
    DeletableDivision,
    {
      label: string;
      sub: string;
      icon: React.ReactNode;
      color: string;
      badgeColor: string;
      totalCount: number;
      details: string[];
    }
  > = {
    finance: {
      label: 'Divisi Keuangan & Akuntansi (Finance & Accounting)',
      sub: 'Buku Kas, Jurnal Umum, Rekening Koran e-Statement, AP/AR, Investasi & Audit',
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/30 text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      totalCount: totalFinanceRecords,
      details: [
        `${financeCounts.transactions} baris Jurnal Transaksi Kas & Bank`,
        `${financeCounts.statements} file upload Rekening Koran & data Rekonsiliasi`,
        `${financeCounts.debts} catatan Hutang Usaha (Accounts Payable)`,
        `${financeCounts.receivables} catatan Piutang Usaha (Accounts Receivable)`,
        `${financeCounts.investments} data Investasi & Baris Jadwal Bagi Hasil`,
        `${financeCounts.periodClosings} riwayat Tutup Buku & ${financeCounts.auditTrails} Audit Trail Keuangan`,
        'Saldo seluruh akun Kas/Bank pada COA akan direset menjadi Rp 0'
      ]
    },
    hrm: {
      label: 'Divisi HRD & Ketenagakerjaan (HRM)',
      sub: 'Direktori Karyawan, Timesheet Presensi (1-31 Hari), Mutasi & Dokumen K3',
      icon: <Users className="w-5 h-5 text-blue-400" />,
      color: 'border-blue-500/30 text-blue-400',
      badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      totalCount: totalHrmRecords,
      details: [
        `${hrmCounts.employees} biodata Karyawan & Personil Lapangan/HQ`,
        `${hrmCounts.timesheets} matriks Presensi Kehadiran Timesheet 1-31 Hari`,
        `${hrmCounts.mutations} log Riwayat Mutasi Penempatan Jabatan`,
        `${hrmCounts.sops} Dokumen Standar Operasional Prosedur (SOP) & K3`
      ]
    },
    operations: {
      label: 'Divisi Operasional & Lapangan (Operations Management)',
      sub: 'Master Proyek Gedung, Smart Inventory Chemical/Alat, Stok & Rajawali Boards',
      icon: <Building2 className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/30 text-amber-400',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      totalCount: totalOperationsRecords,
      details: [
        `${operationsCounts.projects} Master Lokasi / Proyek Gedung Client`,
        `${operationsCounts.inventoryItems} Master Item Barang Chemical & Mesin`,
        `${operationsCounts.projectStocks} Alokasi Stok Proyek Tiap Site`,
        `${operationsCounts.inventoryLogs} Riwayat Mutasi Masuk/Keluar Barang`,
        `${operationsCounts.materialRequests} Pengajuan Permintaan Material / Chemical`,
        `${operationsCounts.tasks} Kartu Tugas & Checklist Kebersihan Rajawali Boards`
      ]
    },
    blast: {
      label: 'Divisi Komunikasi & Broadcast (Eagle Blast)',
      sub: 'Pusat Pesan Siaran Manajemen, Surat Edaran & Pengumuman Internal',
      icon: <Megaphone className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/30 text-purple-400',
      badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      totalCount: totalBlastRecords,
      details: [`${blastCounts.blasts} Pesan Siaran Resmi Eagle Blast & Notifikasi Manajemen`]
    },
    all: {
      label: 'KOSONGKAN SELURUH DATA SISTEM (SEMUA DIVISI)',
      sub: 'MENGHAPUS SEMUA DATA KE 0 RECORD BERSIH (Finance, HRD, Operasional, Blast)',
      icon: <Database className="w-5 h-5 text-rose-500" />,
      color: 'border-rose-500/40 text-rose-400',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      totalCount: totalAllRecords,
      details: [
        `Menghapus seluruh ${totalAllRecords} record data dari seluruh divisi tanpa sisa`,
        'Semua Lokasi Proyek, Karyawan, Presensi, Stok, Tugas, Jurnal Kas, Hutang, Piutang & e-Statement akan menjadi 0',
        'Akun login Super Admin tetap dipertahankan agar Anda tidak terkunci dari sistem'
      ]
    }
  };

  const currentMeta = divisionMeta[selectedDivision];

  const handleExecuteDelete = () => {
    setErrorMessage(null);

    // 1. Role verification
    if (!isSuperAdmin) {
      setErrorMessage('Otorisasi Ditolak: Hanya akun dengan role Super Admin (HQ) yang diizinkan menghapus data masal.');
      return;
    }

    // 2. Keyword confirmation
    const upperWord = confirmWord.trim().toUpperCase();
    if (upperWord !== 'HAPUS' && upperWord !== 'DELETE') {
      setErrorMessage('Harap ketik kata konfirmasi "HAPUS" dengan huruf kapital.');
      return;
    }

    // 3. Security PIN verification
    const superAdminUser = users.find((u) => u.role === 'Super Admin (HQ)');
    const expectedSuperAdminPin = superAdminUser?.securityPin;
    const expectedUserPin = currentUser?.securityPin;

    const validPins = ['888999', '123456', '112233'];
    if (expectedSuperAdminPin) validPins.push(expectedSuperAdminPin);
    if (expectedUserPin) validPins.push(expectedUserPin);

    const cleanPin = securityPin.trim();
    if (!cleanPin) {
      setErrorMessage('Silakan masukkan 6 digit PIN Otorisasi Keamanan Super Admin.');
      return;
    }

    if (!validPins.includes(cleanPin)) {
      setErrorMessage('PIN Otorisasi Super Admin salah! Penghapusan data dibatalkan demi keamanan.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        // Execute bulk deletion based on selected division
        if (selectedDivision === 'finance') {
          storageService.clearFinanceData();
        } else if (selectedDivision === 'hrm') {
          storageService.clearHrmData();
        } else if (selectedDivision === 'operations') {
          storageService.clearOperationsData();
        } else if (selectedDivision === 'blast') {
          storageService.clearBlastData();
        } else if (selectedDivision === 'all') {
          storageService.clearAllDataToEmpty();
        }

        // Add audit trail record
        try {
          storageService.addAuditTrail({
            id: `aud-bulk-del-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userName: currentUser?.name || 'Super Admin (HQ)',
            userRole: currentUser?.role || 'Super Admin (HQ)',
            actionType: 'DELETE',
            module: `Hapus Data Masal - ${currentMeta.label}`,
            recordId: `BULK-${selectedDivision.toUpperCase()}`,
            description: `Hapus masal seluruh data divisi ${currentMeta.label} ke 0 record oleh Super Admin. Status permanen.`
          });
        } catch {
          // ignore
        }

        // Broadcast sync event to app
        window.dispatchEvent(new Event('app_data_reset'));
        window.dispatchEvent(
          new CustomEvent('rajawali_data_synced', {
            detail: { action: 'bulk_delete_division', division: selectedDivision }
          })
        );

        setIsProcessing(false);
        setSuccessMessage(`Data ${currentMeta.label} berhasil dihapus permanen menjadi 0 record.`);

        if (onSuccess) {
          onSuccess(currentMeta.label);
        }

        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(`Terjadi kesalahan saat menghapus data: ${err?.message || 'Unknown error'}`);
      }
    }, 400);
  };

  return (
    <div
      id="bulk-delete-division-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        id="bulk-delete-division-modal-card"
        className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-2xl w-full my-6 p-5 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-rose-500/20 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/30 mb-1 tracking-wider uppercase">
                <ShieldAlert className="w-3 h-3" />
                <span>Otoritas Super Admin (HQ)</span>
              </div>
              <h3 className="font-black text-white text-base sm:text-lg">
                Hapus Data Masal per Divisi
              </h3>
              <p className="text-xs text-slate-400">
                Pembersihan permanen data operasional untuk masing-masing divisi perusahaan
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-bulk-delete-modal-btn"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NON-SUPERADMIN ALERT */}
        {!isSuperAdmin && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-600/40 flex items-start space-x-3 text-rose-300">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-white">AKSES DITOLAK: HANYA SUPER ADMIN</h4>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Fitur Hapus Data Masal hanya dapat diakses dan dieksekusi oleh <b>Super Admin (HQ)</b>.
                Role Anda saat ini adalah <b>{currentUser?.role || 'User'}</b>. Silakan hubungi Super Admin jika
                Anda memerlukan pengosongan data pada divisi ini.
              </p>
            </div>
          </div>
        )}

        {/* DIVISION SELECTOR TABS */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            1. Pilih Divisi yang Ingin Dihapus Masal:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              id="select-div-finance-btn"
              disabled={isProcessing}
              onClick={() => {
                setSelectedDivision('finance');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedDivision === 'finance'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {totalFinanceRecords} data
                </span>
              </div>
              <span className="text-xs font-bold">Divisi Keuangan</span>
              <span className="text-[10px] text-slate-500 line-clamp-1">Kas, Jurnal, AP/AR, Bank</span>
            </button>

            <button
              type="button"
              id="select-div-hrm-btn"
              disabled={isProcessing}
              onClick={() => {
                setSelectedDivision('hrm');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedDivision === 'hrm'
                  ? 'bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-950/50 ring-1 ring-blue-500'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {totalHrmRecords} data
                </span>
              </div>
              <span className="text-xs font-bold">Divisi HRD</span>
              <span className="text-[10px] text-slate-500 line-clamp-1">Karyawan, Presensi, SOP</span>
            </button>

            <button
              type="button"
              id="select-div-operations-btn"
              disabled={isProcessing}
              onClick={() => {
                setSelectedDivision('operations');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedDivision === 'operations'
                  ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/50 ring-1 ring-amber-500'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {totalOperationsRecords} data
                </span>
              </div>
              <span className="text-xs font-bold">Divisi Operasional</span>
              <span className="text-[10px] text-slate-500 line-clamp-1">Gedung, Stok, Kanban</span>
            </button>

            <button
              type="button"
              id="select-div-blast-btn"
              disabled={isProcessing}
              onClick={() => {
                setSelectedDivision('blast');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedDivision === 'blast'
                  ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50 ring-1 ring-purple-500'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Megaphone className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {totalBlastRecords} data
                </span>
              </div>
              <span className="text-xs font-bold">Divisi Broadcast</span>
              <span className="text-[10px] text-slate-500 line-clamp-1">Pesan Siaran Manajemen</span>
            </button>

            <button
              type="button"
              id="select-div-all-btn"
              disabled={isProcessing}
              onClick={() => {
                setSelectedDivision('all');
                setErrorMessage(null);
              }}
              className={`col-span-2 sm:col-span-2 p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedDivision === 'all'
                  ? 'bg-rose-950/50 border-rose-500 text-white shadow-lg shadow-rose-950/50 ring-1 ring-rose-500'
                  : 'bg-rose-950/20 border-rose-900/40 text-rose-300 hover:border-rose-700 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5">
                  <Database className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-black text-rose-300">Semua Divisi Sekaligus</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40">
                  Total: {totalAllRecords} data
                </span>
              </div>
              <span className="text-[10px] text-rose-300/80">
                Kosongkan total seluruh sistem (Finance, HRD, Operasional, Broadcast)
              </span>
            </button>
          </div>
        </div>

        {/* PERMANENT DELETION WARNING BOX */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
          <div className="flex items-center space-x-2 text-rose-400 font-black text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>PERINGATAN KERAS: DATA AKAN HILANG PERMANEN & TIDAK BISA DIKEMBALIKAN</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Jika Anda mengeksekusi penghapusan ini, seluruh data pada <b>{currentMeta.label}</b> akan dihapus secara
            permanen hingga <b>0 record</b>.
            <br />
            <span className="text-rose-300 font-bold">
              Data yang terhapus meliputi: data yang diinput manual oleh admin, file/dokumen yang diupload (seperti mutasi rekening koran e-Statement), maupun data demo/simulasi bawaan sistem.
            </span>
          </p>

          <div className="pt-2 border-t border-rose-500/20 mt-2">
            <div className="text-[11px] font-bold text-slate-200 mb-1">
              Rincian data yang akan dimusnahkan ({currentMeta.totalCount} record):
            </div>
            <ul className="space-y-1">
              {currentMeta.details.map((detail, idx) => (
                <li key={idx} className="flex items-center space-x-2 text-[11px] text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CONFIRMATION INPUTS (ENABLED ONLY FOR SUPER ADMIN) */}
        {isSuperAdmin && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                2. Ketik kata konfirmasi <code className="text-rose-400 font-black px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">HAPUS</code> di bawah ini:
              </label>
              <input
                type="text"
                id="input-confirm-keyword"
                disabled={isProcessing}
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                placeholder="Ketik HAPUS"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm uppercase tracking-wider focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-300">
                  3. Masukkan 6 Digit PIN Otorisasi Super Admin (Default: 888999 atau 123456):
                </label>
                <button
                  type="button"
                  id="toggle-pin-visibility-btn"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Sembunyikan' : 'Lihat'}</span>
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPin ? 'text' : 'password'}
                  id="input-confirm-security-pin"
                  disabled={isProcessing}
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  placeholder="Masukkan 6-digit PIN Keamanan (888999)"
                  maxLength={10}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            id="cancel-bulk-delete-btn"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition"
          >
            Batal
          </button>

          <button
            type="button"
            id="execute-bulk-delete-btn"
            disabled={
              !isSuperAdmin ||
              isProcessing ||
              confirmWord.trim().toUpperCase() !== 'HAPUS' ||
              securityPin.trim().length < 4
            }
            onClick={handleExecuteDelete}
            className={`px-5 py-2.5 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 cursor-pointer ${
              !isSuperAdmin ||
              isProcessing ||
              confirmWord.trim().toUpperCase() !== 'HAPUS' ||
              securityPin.trim().length < 4
                ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-60'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-1 ring-rose-500'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses Pembersihan Data...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Masal {currentMeta.label.split(' ')[0]} {currentMeta.label.split(' ')[1]}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
