import React, { useState, useMemo } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Search,
  Filter,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Layers,
  FileCheck,
  TrendingDown,
  TrendingUp,
  PieChart,
  Sliders,
  DollarSign,
  Download,
  Sparkles,
  KeyRound,
  AlertTriangle,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import {
  AuditTrailItem,
  FinanceTransaction,
  ChartOfAccount,
  PeriodClosing,
  TrialBalanceSummary
} from '../../types/finance';
import { UserAccount, Project } from '../../types';
import { financeService } from '../../services/financeService';
import { AIFinancialAdvisoryModal } from './AIFinancialAdvisoryModal';

interface FinanceAnalyticsAuditProps {
  auditLogs: AuditTrailItem[];
  transactions: FinanceTransaction[];
  accounts: ChartOfAccount[];
  projects: Project[];
  currentUser?: UserAccount | null;
  onAddAuditLog: (log: AuditTrailItem) => void;
}

export const FinanceAnalyticsAudit: React.FC<FinanceAnalyticsAuditProps> = ({
  auditLogs,
  transactions,
  accounts,
  projects,
  currentUser,
  onAddAuditLog
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'ANALYTICS' | 'CLOSING'>('AUDIT');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // AI Advisory Modal & Tab Selection
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiModalTab, setAiModalTab] = useState<'INSIGHTS' | 'COST_ANALYSIS' | 'CLOSING_AUDIT'>('INSIGHTS');

  // Closed Periods State
  const [closedPeriods, setClosedPeriods] = useState<PeriodClosing[]>([
    {
      id: 'close-2026-07',
      periodMonth: '2026-07',
      closedAt: '2026-08-02 18:00',
      closedBy: 'Budi Santoso (Finance Manager)',
      isLocked: true,
      totalRevenue: 285000000,
      totalExpenses: 215000000,
      netProfit: 70000000,
      notes: 'Tutup buku Juli 2026 telah diverifikasi dan diaudit tim akuntansi internal.'
    }
  ]);

  const [periodToClose, setPeriodToClose] = useState('2026-08');
  const [closingNotes, setClosingNotes] = useState('');

  // Financial aggregates
  const totalIncome = useMemo(() => {
    return transactions.filter((t) => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions.filter((t) => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalCash = useMemo(() => {
    return accounts
      .filter((a) => a.type === 'Asset' && (a.category === 'Kas & Setara Kas' || a.category === 'Bank'))
      .reduce((sum, a) => sum + a.currentBalance, 0);
  }, [accounts]);

  // Trial Balance calculation
  const trialBalanceSummary = useMemo<TrialBalanceSummary>(() => {
    return financeService.generateTrialBalance(accounts, transactions);
  }, [accounts, transactions]);

  // Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (actionFilter !== 'ALL' && log.actionType !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mDesc = log.description.toLowerCase().includes(q);
        const mUser = log.userName.toLowerCase().includes(q);
        const mCode = (log.recordCode || '').toLowerCase().includes(q);
        const mMod = log.module.toLowerCase().includes(q);
        if (!mDesc && !mUser && !mCode && !mMod) return false;
      }
      return true;
    });
  }, [auditLogs, actionFilter, searchQuery]);

  // Deletion logs count with PIN verification
  const deleteLogs = useMemo(() => {
    return auditLogs.filter((l) => l.actionType === 'DELETE');
  }, [auditLogs]);

  // Analytics: Cost Center Expenses Breakdown
  const projectExpenses = useMemo(() => {
    const map: { [key: string]: { name: string; amount: number; count: number } } = {};

    transactions
      .filter((t) => t.type === 'OUT')
      .forEach((t) => {
        const projName = t.projectName || 'HQ & Non-Project';
        if (!map[projName]) {
          map[projName] = { name: projName, amount: 0, count: 0 };
        }
        map[projName].amount += t.amount;
        map[projName].count += 1;
      });

    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Analytics: Top Expense Categories
  const expenseCategories = useMemo(() => {
    const map: { [key: string]: { name: string; amount: number } } = {};

    transactions
      .filter((t) => t.type === 'OUT')
      .forEach((t) => {
        const acc = accounts.find((a) => a.code === t.contraAccountCode);
        const accName = acc?.name || 'Beban Operasional Lainnya';
        if (!map[accName]) {
          map[accName] = { name: accName, amount: 0 };
        }
        map[accName].amount += t.amount;
      });

    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [transactions, accounts]);

  // Handle Close Accounting Period
  const handleExecuteClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = closedPeriods.find((p) => p.periodMonth === periodToClose);
    if (existing && existing.isLocked) {
      alert(`Periode ${periodToClose} sudah ditutup dan terkunci sebelumnya.`);
      return;
    }

    const [year, month] = periodToClose.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const start = `${periodToClose}-01`;
    const end = `${periodToClose}-${String(lastDay).padStart(2, '0')}`;

    const pl = financeService.generateProfitLoss(accounts, transactions, start, end);

    const newClosing: PeriodClosing = {
      id: `close-${periodToClose}`,
      periodMonth: periodToClose,
      closedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      closedBy: currentUser?.name || 'Finance Manager',
      isLocked: true,
      totalRevenue: pl.totalRevenue,
      totalExpenses: (pl.totalOpex || 0) + (pl.totalCogs || 0),
      netProfit: pl.netProfit,
      notes: closingNotes || `Tutup buku bulanan periode ${periodToClose}`
    };

    setClosedPeriods([newClosing, ...closedPeriods.filter((p) => p.periodMonth !== periodToClose)]);

    onAddAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userName: currentUser?.name || 'Finance Manager',
      userRole: currentUser?.role || 'Admin Operasional',
      actionType: 'PERIOD_CLOSE',
      module: 'Tutup Buku',
      recordId: newClosing.id,
      recordCode: periodToClose,
      description: `Melakukan Tutup Buku & Penguncian Transaksi periode ${periodToClose} (Laba Bersih: ${financeService.formatRupiah(
        pl.netProfit
      )})`
    });

    setClosingNotes('');
    alert(`Periode ${periodToClose} berhasil ditutup dan dikunci dari perubahan transaksi.`);
  };

  // Handle Toggle Period Lock
  const handleToggleLock = (p: PeriodClosing) => {
    const updated = closedPeriods.map((item) => {
      if (item.id === p.id) {
        return { ...item, isLocked: !item.isLocked };
      }
      return item;
    });
    setClosedPeriods(updated);

    onAddAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userName: currentUser?.name || 'Finance Manager',
      userRole: currentUser?.role || 'Admin Operasional',
      actionType: 'PERIOD_CLOSE',
      module: 'Tutup Buku',
      recordId: p.id,
      recordCode: p.periodMonth,
      description: `${p.isLocked ? 'Membuka kunci (Unlock)' : 'Mengunci (Lock)'} kembali periode buku ${p.periodMonth}`
    });
  };

  // Export Audit Logs to CSV
  const handleExportAuditLogsCSV = () => {
    const headers = [
      'Waktu & Tanggal',
      'Pengguna',
      'Jabatan / Peran',
      'Jenis Tindakan',
      'Modul / Objek',
      'Kode Transaksi / Dokumen',
      'Rincian Aktivitas Audit',
      'Nominal (Rp)'
    ];
    const rows = filteredLogs.map((log) => [
      log.timestamp,
      log.userName,
      log.userRole,
      log.actionType,
      log.module,
      log.recordCode || '-',
      log.description,
      log.amount !== undefined ? log.amount : '-'
    ]);
    financeService.exportToCSV(`Audit_Trail_Log_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // Export Analytics Expense Breakdown to CSV
  const handleExportAnalyticsCSV = () => {
    const headers = ['Tipe Analisa', 'Cost Center / Kategori', 'Total Pengeluaran (Rp)', 'Jumlah Transaksi / Alokasi'];
    const rows: (string | number)[][] = [
      ...projectExpenses.map((p) => ['Pengeluaran per Proyek/Cost Center', p.name, p.amount, `${p.count} Transaksi`]),
      ...expenseCategories.map((c) => ['Kategori Akun Beban (COA)', c.name, c.amount, '-'])
    ];
    financeService.exportToCSV(`Analisa_Pengeluaran_Biaya_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const openAIModalWithTab = (tab: 'INSIGHTS' | 'COST_ANALYSIS' | 'CLOSING_AUDIT') => {
    setAiModalTab(tab);
    setIsAIModalOpen(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header & Sub-Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Audit Trail, Analisa Biaya & Tutup Buku
              </h1>
              <p className="text-xs text-slate-400">
                Log jejak aktivitas transaksi, kepatuhan audit PIN, analisa AI, dan penguncian periode keuangan
              </p>
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-2">
            {/* AI Advisor Button */}
            <button
              onClick={() => openAIModalWithTab('INSIGHTS')}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
              title="Konsultasi saran strategis keuangan berbasis AI"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Saran Ahli Keuangan AI</span>
            </button>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            {/* View Tabs */}
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'AUDIT'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Jejak Audit ({auditLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ANALYTICS'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analisa Pengeluaran</span>
            </button>

            <button
              onClick={() => setActiveTab('CLOSING')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CLOSING'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Tutup Buku Bulanan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: AUDIT TRAIL LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4 animate-in fade-in">
          {/* AI Compliance & Security Banner */}
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-900/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 mt-0.5">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-white">
                    Audit Kepatuhan & Integritas Data Anti-Fraud
                  </h3>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.2 rounded border border-purple-500/30">
                    Sistem PIN Aktif
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Semua aktivitas penghapusan transaksi dan COA wajib melalui verifikasi PIN Otorisasi 6 digit.
                  Tercatat <strong>{deleteLogs.length} aktivitas penghapusan</strong> dalam database jejak audit.
                </p>
              </div>
            </div>

            <button
              onClick={() => openAIModalWithTab('INSIGHTS')}
              className="px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer self-end md:self-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Analisa Anomali AI</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari deskripsi audit, nama user, kode voucher, PIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-semibold">Tipe Aksi:</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Semua Aksi</option>
                <option value="CREATE">Pencatatan Baru (CREATE)</option>
                <option value="UPDATE">Perubahan (UPDATE)</option>
                <option value="DELETE">Penghapusan dengan PIN (DELETE)</option>
                <option value="RECONCILE">Rekonsiliasi Bank</option>
                <option value="PERIOD_CLOSE">Tutup Buku</option>
              </select>

              {/* Download Audit Trail as CSV */}
              <button
                id="download-audit-csv-btn"
                data-testid="download-as-csv-btn"
                onClick={handleExportAuditLogsCSV}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white font-bold text-xs border border-emerald-600/50 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                title="Download riwayat log jejak audit dalam format CSV untuk Excel atau Google Sheets"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Audit Logs List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Waktu & Tanggal</th>
                    <th className="p-3.5">Pengguna & Jabatan</th>
                    <th className="p-3.5">Jenis Tindakan</th>
                    <th className="p-3.5">Modul / Objek</th>
                    <th className="p-3.5">Kode Transaksi</th>
                    <th className="p-3.5">Rincian Aktivitas Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Tidak ada log audit yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-white flex items-center space-x-1.5">
                            <User className="w-3 h-3 text-purple-400" />
                            <span>{log.userName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{log.userRole}</div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] border flex items-center space-x-1 w-fit ${
                              log.actionType === 'CREATE'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : log.actionType === 'UPDATE'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : log.actionType === 'DELETE'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : log.actionType === 'RECONCILE'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {log.actionType === 'DELETE' && <KeyRound className="w-3 h-3" />}
                            <span>{log.actionType}</span>
                          </span>
                        </td>

                        <td className="p-3.5 font-medium text-slate-300">{log.module}</td>

                        <td className="p-3.5 font-mono font-bold text-amber-400">
                          {log.recordCode || '-'}
                        </td>

                        <td className="p-3.5 text-slate-300 max-w-[360px] leading-relaxed">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ANALISA PENGELUARAN & COST CENTER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-4 animate-in fade-in">
          {/* AI Cost Center Advisory Card */}
          <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-900/40 rounded-2xl p-4.5 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Saran Ahli Keuangan AI: Efisiensi & Kontrol Beban Proyek</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deteksi anomali pemakaian bahan chemical, lembur tenaga alih daya, dan overhead kantor
                  </p>
                </div>
              </div>

              <button
                onClick={() => openAIModalWithTab('COST_ANALYSIS')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-lg shadow-blue-900/30 cursor-pointer self-end sm:self-center"
              >
                <span>Buka Detail Analisa AI</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 block font-semibold">Beban Terbesar</span>
                <div className="font-bold text-white">
                  {expenseCategories[0]?.name || 'Gaji & Upah Tenaga Kebersihan'}
                </div>
                <span className="text-[10px] text-amber-400">
                  {expenseCategories[0] ? financeService.formatRupiah(expenseCategories[0].amount) : 'Rp 0'}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 block font-semibold">Fokus Penghematan AI</span>
                <div className="font-bold text-emerald-400">Sentralisasi Chemical & Takaran</div>
                <span className="text-[10px] text-slate-400">Potensi efisiensi 5-8% dari total beban</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 block font-semibold">Rasio Beban Operasional</span>
                <div className="font-bold text-cyan-400">
                  {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0}% dari Omset
                </div>
                <span className="text-[10px] text-emerald-400">Dalam batas sehat SAK (&lt; 85%)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Breakdown per Site / Cost Center */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Pengeluaran per Lokasi Proyek (Cost Center)</span>
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    id="download-analytics-csv-btn"
                    data-testid="download-as-csv-btn"
                    onClick={handleExportAnalyticsCSV}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white font-bold text-xs border border-emerald-600/50 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                    title="Download analisa pengeluaran biaya per lokasi dan kategori ke format CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Export CSV</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    Total: {projectExpenses.length} Lokasi
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {projectExpenses.map((proj) => {
                  const totalAll = projectExpenses.reduce((s, p) => s + p.amount, 0);
                  const pct = totalAll > 0 ? (proj.amount / totalAll) * 100 : 0;

                  return (
                    <div key={proj.name} className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">{proj.name}</span>
                        <span className="font-mono font-bold text-rose-400">
                          {financeService.formatRupiah(proj.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{proj.count} Transaksi Voucher</span>
                        <span>{pct.toFixed(1)}% dari Total Biaya</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Expense Categories */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>Kategori Beban Terbesar (COA Allocation)</span>
                </h3>
                <span className="text-xs text-slate-400">Top Categories</span>
              </div>

              <div className="space-y-3">
                {expenseCategories.map((cat) => {
                  const totalExp = expenseCategories.reduce((s, c) => s + c.amount, 0);
                  const pct = totalExp > 0 ? (cat.amount / totalExp) * 100 : 0;

                  return (
                    <div key={cat.name} className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">{cat.name}</span>
                        <span className="font-mono font-bold text-amber-400">
                          {financeService.formatRupiah(cat.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Alokasi Akun Beban</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: TUTUP BUKU & PENGUNCIAN PERIODE AKUNTANSI */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'CLOSING' && (
        <div className="space-y-4 animate-in fade-in">
          {/* AI Pre-Closing Readiness Alert Card */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-900/40 rounded-2xl p-4.5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">
                    Audit Kesiapan Tutup Buku (AI Pre-Closing Audit)
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.2 rounded border border-emerald-500/30">
                    {trialBalanceSummary.isBalanced ? 'Neraca Saldo Balanced' : 'Perlu Penyesuaian'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pemeriksaan otomatis kesesuaian saldo debit/kredit, rekonsiliasi mutasi bank, dan alokasi laba ditahan (Retained Earnings).
                </p>
              </div>
            </div>

            <button
              onClick={() => openAIModalWithTab('CLOSING_AUDIT')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer self-end sm:self-center shrink-0"
            >
              <span>Lihat Checklist Akuntan AI</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Closing Action Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-1">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Form Kunci & Tutup Buku</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mengunci transaksi pada periode agar tidak dapat diubah atau dihapus kembali
                </p>
              </div>

              <form onSubmit={handleExecuteClosing} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Pilih Bulan Buku *
                  </label>
                  <input
                    type="month"
                    required
                    value={periodToClose}
                    onChange={(e) => setPeriodToClose(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Catatan Auditor / Finance Manager
                  </label>
                  <textarea
                    rows={3}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Contoh: Seluruh rekonsiliasi bank dan jurnal penyesuaian telah klop & selesai diaudit."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300/90 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Kepatuhan Audit:</span>
                  </div>
                  <p>
                    Setelah periode ditutup, pengguna tidak dapat membuat transaksi baru atau mengedit jurnal
                    pada tanggal periode tersebut.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  Kunci & Tutup Periode Sekarang
                </button>
              </form>
            </div>

            {/* List of Closed Periods */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-2">
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-sm">Daftar Riwayat Periode Tutup Buku</h3>
                  <p className="text-xs text-slate-400">Status penguncian dan performa laba pada setiap periode</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {closedPeriods.length} Periode
                </span>
              </div>

              <div className="space-y-3">
                {closedPeriods.map((p) => (
                  <div
                    key={p.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`p-2 rounded-xl border ${
                            p.isLocked
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {p.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Periode: {p.periodMonth}</div>
                          <div className="text-[10px] text-slate-400">
                            Ditutup pada {p.closedAt} oleh {p.closedBy}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            p.isLocked
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {p.isLocked ? 'LOCKED (TERKUNCI)' : 'UNLOCKED (TERBUKA)'}
                        </span>

                        <button
                          onClick={() => handleToggleLock(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition-all cursor-pointer"
                        >
                          {p.isLocked ? 'Buka Kunci' : 'Kunci Ulang'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-900 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Total Pendapatan:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {financeService.formatRupiah(p.totalRevenue)}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Total Beban:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {financeService.formatRupiah(p.totalExpenses)}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Laba Bersih:</span>
                        <span className="font-mono font-bold text-blue-400">
                          {financeService.formatRupiah(p.netProfit)}
                        </span>
                      </div>
                    </div>

                    {p.notes && (
                      <div className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
                        "{p.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Financial Advisory Modal */}
      <AIFinancialAdvisoryModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        accounts={accounts}
        transactions={transactions}
        trialBalance={trialBalanceSummary}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        totalCash={totalCash}
        currentPeriod={periodToClose}
        initialTab={aiModalTab}
      />
    </div>
  );
};
