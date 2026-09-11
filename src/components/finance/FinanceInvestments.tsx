import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Briefcase,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  CreditCard,
  Percent,
  Layers,
  Edit3,
  Trash2,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  X,
  FileCheck
} from 'lucide-react';
import {
  InvestmentRecord,
  InvestmentScheduleRow,
  ProfitSharingStatus,
  AuditTrailItem
} from '../../types/finance';
import { Project, UserAccount } from '../../types';
import { generateInvestmentSchedule } from '../../data/initialFinanceData';
import { formatCurrency, downloadCSV } from '../../utils/formatters';

interface FinanceInvestmentsProps {
  investments: InvestmentRecord[];
  projects: Project[];
  currentUser?: UserAccount | null;
  onAddInvestment: (inv: InvestmentRecord) => void;
  onUpdateInvestment: (inv: InvestmentRecord) => void;
  onDeleteInvestment: (id: string, reason: string, pin: string) => void;
  onLogAudit?: (audit: AuditTrailItem) => void;
}

export const FinanceInvestments: React.FC<FinanceInvestmentsProps> = ({
  investments = [],
  projects = [],
  currentUser,
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  onLogAudit
}) => {
  const [selectedInvestorFilter, setSelectedInvestorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedInvestmentId, setExpandedInvestmentId] = useState<string | null>(
    investments.length > 0 ? investments[0].id : null
  );

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentRecord | null>(null);

  // Status Change Modal for Schedule Row
  const [scheduleModalTarget, setScheduleModalTarget] = useState<{
    investment: InvestmentRecord;
    scheduleRow: InvestmentScheduleRow;
  } | null>(null);
  const [modalNewStatus, setModalNewStatus] = useState<ProfitSharingStatus>('DI Realisasikan');
  const [modalTransferProof, setModalTransferProof] = useState<string>('');
  const [modalRealizationDate, setModalRealizationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [modalScheduleNotes, setModalScheduleNotes] = useState<string>('');

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<InvestmentRecord | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State for Investment
  const [formData, setFormData] = useState<{
    investorName: string;
    investorContact: string;
    investorEmail: string;
    investorIdNumber: string;
    startDate: string;
    durationMonths: number;
    capitalAmount: number;
    allocation: string;
    projectId: string;
    profitSharingPercent: number;
    profitSharingDay: number;
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    notes: string;
  }>({
    investorName: '',
    investorContact: '',
    investorEmail: '',
    investorIdNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    durationMonths: 12, // Default 12 bulan
    capitalAmount: 100000000,
    allocation: 'Modal Kerja Operasional Manpower & Pengadaan Mesin Sanitasi',
    projectId: 'proj-1',
    profitSharingPercent: 1.5,
    profitSharingDay: 25,
    bankName: 'Bank BCA',
    bankAccountNumber: '',
    bankAccountHolder: '',
    notes: ''
  });

  // Unique list of investors for filter dropdown
  const uniqueInvestors = useMemo(() => {
    const map = new Map<string, string>();
    investments.forEach((inv) => {
      map.set(inv.investorName, inv.investorName);
    });
    return Array.from(map.values());
  }, [investments]);

  // Filtered investments
  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      if (selectedInvestorFilter !== 'ALL' && inv.investorName !== selectedInvestorFilter) return false;
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          inv.code.toLowerCase().includes(q) ||
          inv.investorName.toLowerCase().includes(q) ||
          inv.allocation.toLowerCase().includes(q) ||
          inv.bankAccountHolder.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [investments, selectedInvestorFilter, statusFilter, searchQuery]);

  // Reminders for Upcoming / Overdue Profit Sharing Payouts
  const reminders = useMemo(() => {
    const list: Array<{
      investment: InvestmentRecord;
      schedule: InvestmentScheduleRow;
      isOverdue: boolean;
      daysRemaining: number;
    }> = [];

    const today = new Date('2026-08-29');

    investments.forEach((inv) => {
      if (inv.status === 'ACTIVE') {
        inv.schedules.forEach((sch) => {
          if (sch.status === 'Ditunda') {
            const due = new Date(sch.dueDate);
            const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            // Show if overdue or due in next 14 days
            if (diffDays <= 14) {
              list.push({
                investment: inv,
                schedule: sch,
                isOverdue: diffDays < 0,
                daysRemaining: diffDays
              });
            }
          }
        });
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [investments]);

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    let totalCapital = 0;
    let totalRealizedProfit = 0;
    let totalPendingProfit = 0;
    let thisMonthDueProfit = 0;

    investments.forEach((inv) => {
      totalCapital += inv.capitalAmount;
      inv.schedules.forEach((sch) => {
        if (sch.status === 'DI Realisasikan') {
          totalRealizedProfit += sch.profitAmount;
        } else {
          totalPendingProfit += sch.profitAmount;
          // Check if due in August 2026
          if (sch.dueDate.startsWith('2026-08')) {
            thisMonthDueProfit += sch.profitAmount;
          }
        }
      });
    });

    return {
      totalCapital,
      totalRealizedProfit,
      totalPendingProfit,
      thisMonthDueProfit,
      activeInvestorsCount: investments.filter((i) => i.status === 'ACTIVE').length
    };
  }, [investments]);

  // Open Add Investment Modal
  const handleOpenAdd = () => {
    setEditingInvestment(null);
    setFormData({
      investorName: '',
      investorContact: '',
      investorEmail: '',
      investorIdNumber: '',
      startDate: new Date().toISOString().split('T')[0],
      durationMonths: 12,
      capitalAmount: 100000000,
      allocation: 'Modal Kerja Operasional & Pengadaan Perlengkapan Sanitasi',
      projectId: projects[0]?.id || 'proj-1',
      profitSharingPercent: 1.5,
      profitSharingDay: 25,
      bankName: 'Bank BCA',
      bankAccountNumber: '',
      bankAccountHolder: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Investment Modal
  const handleOpenEdit = (inv: InvestmentRecord) => {
    setEditingInvestment(inv);
    setFormData({
      investorName: inv.investorName,
      investorContact: inv.investorContact || '',
      investorEmail: inv.investorEmail || '',
      investorIdNumber: inv.investorIdNumber || '',
      startDate: inv.startDate,
      durationMonths: inv.durationMonths,
      capitalAmount: inv.capitalAmount,
      allocation: inv.allocation,
      projectId: inv.projectId || 'proj-1',
      profitSharingPercent: inv.profitSharingPercent,
      profitSharingDay: inv.profitSharingDay,
      bankName: inv.bankName,
      bankAccountNumber: inv.bankAccountNumber,
      bankAccountHolder: inv.bankAccountHolder,
      notes: inv.notes || ''
    });
    setIsModalOpen(true);
  };

  // Save Investment
  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.investorName || formData.capitalAmount <= 0 || !formData.bankAccountNumber) {
      alert('Mohon lengkapi Nama Investor, Nominal Modal Kerja, dan Nomor Rekening.');
      return;
    }

    const prj = projects.find((p) => p.id === formData.projectId);
    const projectName = prj?.name || 'Proyek';

    // Calculate End Date
    const startObj = new Date(formData.startDate);
    const endObj = new Date(startObj.getFullYear(), startObj.getMonth() + formData.durationMonths, startObj.getDate());
    const endDate = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;

    const monthlyProfitAmount = (formData.capitalAmount * formData.profitSharingPercent) / 100;
    const totalProjectedProfit = monthlyProfitAmount * formData.durationMonths;

    if (editingInvestment) {
      // Regenerate schedules while preserving realized status if possible
      const newSchedules = generateInvestmentSchedule(
        formData.startDate,
        formData.durationMonths,
        formData.capitalAmount,
        formData.profitSharingPercent,
        formData.profitSharingDay,
        formData.bankName,
        formData.bankAccountNumber,
        formData.bankAccountHolder
      );

      // Preserve existing realizations
      const mergedSchedules = newSchedules.map((ns, idx) => {
        const old = editingInvestment.schedules[idx];
        if (old && old.status === 'DI Realisasikan') {
          return {
            ...ns,
            status: 'DI Realisasikan' as ProfitSharingStatus,
            realizationDate: old.realizationDate,
            transferProof: old.transferProof,
            notes: old.notes
          };
        }
        return ns;
      });

      const updated: InvestmentRecord = {
        ...editingInvestment,
        investorName: formData.investorName,
        investorContact: formData.investorContact,
        investorEmail: formData.investorEmail,
        investorIdNumber: formData.investorIdNumber,
        startDate: formData.startDate,
        endDate,
        durationMonths: formData.durationMonths,
        capitalAmount: formData.capitalAmount,
        allocation: formData.allocation,
        projectId: formData.projectId,
        projectName,
        profitSharingPercent: formData.profitSharingPercent,
        profitSharingDay: formData.profitSharingDay,
        monthlyProfitAmount,
        totalProjectedProfit,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountHolder: formData.bankAccountHolder,
        notes: formData.notes,
        schedules: mergedSchedules,
        updatedAt: new Date().toLocaleString('id-ID')
      };

      onUpdateInvestment(updated);
      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'UPDATE',
        module: 'Investasi & Bagi Hasil',
        recordId: updated.id,
        recordCode: updated.code,
        description: `Memperbarui data investasi investor ${updated.investorName} (${formatCurrency(updated.capitalAmount)})`,
        amount: updated.capitalAmount
      });
    } else {
      // Create New with Auto Generated 12 Rows (or N-month rows)
      const newCode = `INV-${new Date().getFullYear()}-${String(investments.length + 1).padStart(3, '0')}`;
      const schedules = generateInvestmentSchedule(
        formData.startDate,
        formData.durationMonths,
        formData.capitalAmount,
        formData.profitSharingPercent,
        formData.profitSharingDay,
        formData.bankName,
        formData.bankAccountNumber,
        formData.bankAccountHolder
      );

      const newInv: InvestmentRecord = {
        id: `inv-${Date.now()}`,
        code: newCode,
        investorName: formData.investorName,
        investorContact: formData.investorContact,
        investorEmail: formData.investorEmail,
        investorIdNumber: formData.investorIdNumber,
        startDate: formData.startDate,
        endDate,
        durationMonths: formData.durationMonths,
        capitalAmount: formData.capitalAmount,
        allocation: formData.allocation,
        projectId: formData.projectId,
        projectName,
        profitSharingPercent: formData.profitSharingPercent,
        profitSharingDay: formData.profitSharingDay,
        monthlyProfitAmount,
        totalProjectedProfit,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountHolder: formData.bankAccountHolder,
        status: 'ACTIVE',
        notes: formData.notes,
        schedules,
        createdAt: new Date().toLocaleString('id-ID')
      };

      onAddInvestment(newInv);
      setExpandedInvestmentId(newInv.id);
      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'CREATE',
        module: 'Investasi & Bagi Hasil',
        recordId: newInv.id,
        recordCode: newInv.code,
        description: `Mencatat investasi baru dari ${newInv.investorName} modal ${formatCurrency(newInv.capitalAmount)} dengan jadwal ${newInv.durationMonths} baris otomatis`,
        amount: newInv.capitalAmount
      });
    }

    setIsModalOpen(false);
  };

  // Open Schedule Row Realization Modal
  const handleOpenScheduleModal = (inv: InvestmentRecord, sch: InvestmentScheduleRow) => {
    setScheduleModalTarget({ investment: inv, scheduleRow: sch });
    setModalNewStatus(sch.status === 'Ditunda' ? 'DI Realisasikan' : 'Ditunda');
    setModalTransferProof(sch.transferProof || `TRF-BGI-M${sch.monthIndex}-${Date.now().toString().slice(-4)}`);
    setModalRealizationDate(sch.realizationDate || new Date().toISOString().split('T')[0]);
    setModalScheduleNotes(sch.notes || '');
  };

  // Save Schedule Status
  const handleSaveScheduleStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalTarget) return;

    const { investment, scheduleRow } = scheduleModalTarget;
    const updatedSchedules = investment.schedules.map((s) => {
      if (s.id === scheduleRow.id) {
        return {
          ...s,
          status: modalNewStatus,
          realizationDate: modalNewStatus === 'DI Realisasikan' ? modalRealizationDate : undefined,
          transferProof: modalNewStatus === 'DI Realisasikan' ? modalTransferProof : undefined,
          notes: modalScheduleNotes
        };
      }
      return s;
    });

    const updatedInv: InvestmentRecord = {
      ...investment,
      schedules: updatedSchedules,
      updatedAt: new Date().toLocaleString('id-ID')
    };

    onUpdateInvestment(updatedInv);
    onLogAudit?.({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName: currentUser?.name || 'Finance Lead',
      userRole: currentUser?.role || 'Finance',
      actionType: 'UPDATE',
      module: 'Investasi & Bagi Hasil',
      recordId: investment.id,
      recordCode: investment.code,
      description: `Mengubah status bagi hasil ${investment.investorName} (${scheduleRow.monthLabel}) menjadi "${modalNewStatus}" (${formatCurrency(scheduleRow.profitAmount)})`,
      amount: scheduleRow.profitAmount
    });

    setScheduleModalTarget(null);
  };

  // Quick Realize from Reminder Banner
  const handleQuickRealize = (inv: InvestmentRecord, sch: InvestmentScheduleRow) => {
    handleOpenScheduleModal(inv, sch);
  };

  // Delete Investment with PIN
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const validPin = currentUser?.securityPin || '123456';
    if (deletePin !== validPin) {
      setDeleteError('PIN Keamanan tidak valid. Otorisasi penghapusan ditolak!');
      return;
    }

    if (!deleteReason.trim()) {
      setDeleteError('Wajib mengisi alasan penghapusan data.');
      return;
    }

    onDeleteInvestment(deleteTarget.id, deleteReason, deletePin);
    setDeleteTarget(null);
    setDeletePin('');
    setDeleteReason('');
    setDeleteError(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const exportData: any[] = [];
    filteredInvestments.forEach((inv) => {
      inv.schedules.forEach((sch) => {
        exportData.push({
          'Kode Investasi': inv.code,
          'Nama Investor': inv.investorName,
          'Modal Kerja (Rp)': inv.capitalAmount,
          'Alokasi Investasi': inv.allocation,
          'Bagi Hasil (%)': `${inv.profitSharingPercent}%`,
          'Bulan Ke-': sch.monthIndex,
          'Periode Payout': sch.monthLabel,
          'Jatuh Tempo': sch.dueDate,
          'Nilai Bagi Hasil (Rp)': sch.profitAmount,
          'Pengembalian Pokok (Rp)': sch.principalReturnAmount,
          'Total Pembayaran (Rp)': sch.totalPayout,
          'Status Payout': sch.status,
          'Tanggal Realisasi': sch.realizationDate || '-',
          'Nama Bank': inv.bankName,
          'No Rekening': inv.bankAccountNumber,
          'Atas Nama': inv.bankAccountHolder,
          'Bukti Transfer': sch.transferProof || '-'
        });
      });
    });

    downloadCSV(exportData, `Rajawali_Pencatatan_Investasi_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Penyertaan Modal & Bagi Hasil
            </span>
            <span className="text-xs text-slate-400">Auto Generate 12 Baris Jadwal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-400" />
            Pencatatan Investasi & Bagi Hasil
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manajemen investor, alokasi modal kerja, jadwal 12 baris bagi hasil otomatis, rekening penerima & kontrol status "Ditunda / DI Realisasikan".
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Ekspor Jadwal CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Investasi Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Modal Kerja */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Modal Kerja Investasi</span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-400 mt-1">
            {formatCurrency(stats.totalCapital)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Investor Aktif:</span>
            <span className="font-bold text-white">{stats.activeInvestorsCount} Mitra</span>
          </div>
        </div>

        {/* Bagi Hasil Realisasi */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Bagi Hasil Telah Direalisasikan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(stats.totalRealizedProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Status Pembayaran:</span>
            <span className="font-bold text-emerald-300">Telah Ditransfer</span>
          </div>
        </div>

        {/* Bagi Hasil Ditunda / Pending */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Bagi Hasil Masih "Ditunda"</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-400 mt-1">
            {formatCurrency(stats.totalPendingProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Proyeksi Total Kontrak:</span>
            <span className="font-medium text-slate-300">12 Periode / Investor</span>
          </div>
        </div>

        {/* Jatuh Tempo Bulan Ini */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Bagi Hasil Jatuh Tempo Bulan Ini</span>
            <AlertCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-cyan-400 mt-1">
            {formatCurrency(stats.thisMonthDueProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Periode Berjalan:</span>
            <span className="font-bold text-cyan-300">Agustus 2026</span>
          </div>
        </div>
      </div>

      {/* Reminder Notification Box */}
      {reminders.length > 0 && (
        <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-amber-950/30 border border-purple-500/30 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                <Bell className="w-4 h-4" />
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-purple-300">
                Reminder Pembagian Bagi Hasil Investor ({reminders.length} Jadwal Jatuh Tempo / Ditunda)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Pengingat Rekening & Tanggal Bagi Hasil</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
            {reminders.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  item.isOverdue
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-white truncate">{item.investment.investorName}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.schedule.monthLabel} • Due: {item.schedule.dueDate}
                  </div>
                  <div className="text-[10px] text-purple-300 font-mono mt-0.5 truncate">
                    {item.investment.bankName}: {item.investment.bankAccountNumber} a/n {item.investment.bankAccountHolder}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-purple-300">{formatCurrency(item.schedule.profitAmount)}</div>
                  <button
                    onClick={() => handleQuickRealize(item.investment, item.schedule)}
                    className="mt-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Realisasikan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Investor Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Investor Filter Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold">
            <User className="w-4 h-4 text-purple-400" />
            <span>Pilih Investor:</span>
          </div>

          <select
            value={selectedInvestorFilter}
            onChange={(e) => setSelectedInvestorFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="ALL">Semua Investor ({investments.length})</option>
            {uniqueInvestors.map((invName, i) => (
              <option key={i} value={invName}>
                {invName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="ALL">Semua Status Kontrak</option>
            <option value="ACTIVE">Kontrak Aktif</option>
            <option value="COMPLETED">Selesai / Lunas</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari investor / alokasi / no rek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Investment Contracts List with Expandable 12-Month Schedule */}
      <div className="space-y-4">
        {filteredInvestments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            Tidak ada data investasi yang sesuai dengan filter.
          </div>
        ) : (
          filteredInvestments.map((inv) => {
            const isExpanded = expandedInvestmentId === inv.id;
            const realizedCount = inv.schedules.filter((s) => s.status === 'DI Realisasikan').length;
            const totalRows = inv.schedules.length;

            return (
              <div
                key={inv.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                {/* Investment Header / Card */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/60 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {inv.code}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        {inv.investorName}
                      </h2>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          inv.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {inv.status === 'ACTIVE' ? 'KONTRAK AKTIF' : 'SELESAI'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-400">Alokasi Investasi / Modal Kerja:</span>
                      <span className="text-slate-200">{inv.allocation}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                          Periode: <strong className="text-slate-200">{inv.startDate}</strong> s/d{' '}
                          <strong className="text-slate-200">{inv.endDate}</strong> ({inv.durationMonths} Bulan)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          Rekening: <strong className="text-slate-200">{inv.bankName} - {inv.bankAccountNumber}</strong> a/n{' '}
                          <strong className="text-slate-200">{inv.bankAccountHolder}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics of the Contract */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-400 font-medium">Modal Kerja Disetor</div>
                      <div className="text-base sm:text-xl font-black text-purple-400">
                        {formatCurrency(inv.capitalAmount)}
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Bagi Hasil ({inv.profitSharingPercent}% / Bln - Tgl {inv.profitSharingDay})
                      </div>
                      <div className="text-sm sm:text-base font-bold text-emerald-400">
                        {formatCurrency(inv.monthlyProfitAmount)} / bulan
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 pl-2">
                      <button
                        onClick={() => handleOpenEdit(inv)}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-colors"
                        title="Edit Kontrak Investasi"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(inv)}
                        className="p-1.5 hover:bg-rose-950 text-rose-400 rounded-lg cursor-pointer transition-colors"
                        title="Hapus Kontrak (Wajib PIN)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedInvestmentId(isExpanded ? null : inv.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        <span>{isExpanded ? 'Tutup Jadwal' : `Lihat ${totalRows} Baris Jadwal`}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar of Realized vs Pending */}
                <div className="px-4 sm:px-5 py-2 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-300">Realisasi Bagi Hasil:</span>
                    <span className="font-bold text-emerald-400">
                      {realizedCount} dari {totalRows} Bulan Direalisasikan
                    </span>
                  </div>
                  <div className="w-36 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${(realizedCount / (totalRows || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 12-MONTH SCHEDULE TABLE (EXPANDED) */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 overflow-x-auto bg-slate-900/90">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">
                        Jadwal Otomatis 12 Baris Pembagian Bagi Hasil ({inv.durationMonths} Bulan Payout)
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Klik tombol status untuk mengubah menjadi <strong>"Ditunda"</strong> atau{' '}
                        <strong>"DI Realisasikan"</strong>
                      </span>
                    </div>

                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700 uppercase font-bold text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Bulan</th>
                          <th className="py-2.5 px-3">Tgl Jatuh Tempo</th>
                          <th className="py-2.5 px-3 text-right">Bagi Hasil ({inv.profitSharingPercent}%)</th>
                          <th className="py-2.5 px-3 text-right">Pengembalian Pokok</th>
                          <th className="py-2.5 px-3 text-right">Total Payout</th>
                          <th className="py-2.5 px-3">Rekening Penerima (Snapshot)</th>
                          <th className="py-2.5 px-3 text-center">Status Pembagian</th>
                          <th className="py-2.5 px-3">Tgl / Bukti Realisasi</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {inv.schedules.map((sch) => (
                          <tr
                            key={sch.id}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              sch.status === 'DI Realisasikan' ? 'bg-emerald-950/10' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-semibold text-white">
                              <div>{sch.monthLabel}</div>
                              <div className="text-[10px] text-slate-400">Cicilan #{sch.monthIndex}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono text-slate-300">{sch.dueDate}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-purple-300">
                              {formatCurrency(sch.profitAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-400">
                              {sch.principalReturnAmount > 0 ? (
                                <span className="font-bold text-cyan-400">{formatCurrency(sch.principalReturnAmount)}</span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-white">
                              {formatCurrency(sch.totalPayout)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              <div className="font-semibold text-slate-200">{sch.accountHolderSnapshot}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sch.bankNameSnapshot} - {sch.bankAccountNumberSnapshot}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                  sch.status === 'DI Realisasikan'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {sch.status === 'DI Realisasikan' ? 'DI Realisasikan' : 'Ditunda'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                              {sch.status === 'DI Realisasikan' ? (
                                <div>
                                  <div className="font-semibold text-emerald-400">{sch.realizationDate}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{sch.transferProof}</div>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">Menunggu realisasi</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleOpenScheduleModal(inv, sch)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Ubah Status
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: TAMBAH / EDIT INVESTASI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 text-white my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                {editingInvestment ? 'Edit Kontrak Investasi' : 'Pencatatan Investasi & Modal Kerja Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nama Investor / Mitra *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: H. Gunawan Prasetyo (Mitra Investama)"
                    value={formData.investorName}
                    onChange={(e) => setFormData({ ...formData, investorName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">No. Kontak / HP</label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={formData.investorContact}
                    onChange={(e) => setFormData({ ...formData, investorContact: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email / NIK / NPWP</label>
                  <input
                    type="text"
                    placeholder="investor@domain.com"
                    value={formData.investorEmail}
                    onChange={(e) => setFormData({ ...formData, investorEmail: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Modal Kerja Disetor (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="1000000"
                    step="1000000"
                    value={formData.capitalAmount || ''}
                    onChange={(e) => setFormData({ ...formData, capitalAmount: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-purple-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Durasi Kontrak (Bulan) *</label>
                  <select
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                  >
                    <option value={6}>6 Bulan (6 Baris Jadwal)</option>
                    <option value={12}>12 Bulan (12 Baris Jadwal Otomatis)</option>
                    <option value={24}>24 Bulan (24 Baris Jadwal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Alokasi Investasi / Modal Kerja *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pengadaan Mesin Ride-on Scrubber & Penambahan Manpower RS Siloam"
                  value={formData.allocation}
                  onChange={(e) => setFormData({ ...formData, allocation: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Bagi Hasil (% / Bln) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="100"
                    required
                    value={formData.profitSharingPercent || ''}
                    onChange={(e) => setFormData({ ...formData, profitSharingPercent: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tgl Pembagian (1-28) *</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    required
                    value={formData.profitSharingDay || ''}
                    onChange={(e) => setFormData({ ...formData, profitSharingDay: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-cyan-300"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  Rekening Penerima Bagi Hasil
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Nama Bank *</label>
                    <input
                      type="text"
                      required
                      placeholder="Bank BCA / Mandiri"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Nomor Rekening *</label>
                    <input
                      type="text"
                      required
                      placeholder="123-456-7890"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Atas Nama Penerima *</label>
                    <input
                      type="text"
                      required
                      placeholder="H. Gunawan P."
                      value={formData.bankAccountHolder}
                      onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Catatan Tambahan / No Akta Notaris</label>
                <textarea
                  rows={2}
                  placeholder="Klausul perjanjian notaris, pengembalian pokok modal..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  {editingInvestment ? 'Simpan Perubahan' : 'Generate 12 Baris & Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UBAH STATUS REALISASI / DITUNDA */}
      {scheduleModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-400" />
                Update Realisasi Bagi Hasil
              </h3>
              <button
                onClick={() => setScheduleModalTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-800/80 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Investor:</span>
                <span className="font-bold text-white">{scheduleModalTarget.investment.investorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Periode:</span>
                <span className="font-semibold text-purple-300">
                  {scheduleModalTarget.scheduleRow.monthLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nilai Bagi Hasil:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(scheduleModalTarget.scheduleRow.profitAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rekening Tujuan:</span>
                <span className="font-mono text-slate-300">
                  {scheduleModalTarget.scheduleRow.bankNameSnapshot} - {scheduleModalTarget.scheduleRow.bankAccountNumberSnapshot}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveScheduleStatus} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pilihan Status *</label>
                <select
                  value={modalNewStatus}
                  onChange={(e) => setModalNewStatus(e.target.value as ProfitSharingStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="DI Realisasikan">DI Realisasikan (Telah Ditransfer)</option>
                  <option value="Ditunda">Ditunda (Menunggu Jadwal / Pending)</option>
                </select>
              </div>

              {modalNewStatus === 'DI Realisasikan' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Tanggal Realisasi</label>
                      <input
                        type="date"
                        value={modalRealizationDate}
                        onChange={(e) => setModalRealizationDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">No. Bukti Transfer</label>
                      <input
                        type="text"
                        value={modalTransferProof}
                        onChange={(e) => setModalTransferProof(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Keterangan transfer / alasan penundaan..."
                  value={modalScheduleNotes}
                  onChange={(e) => setModalScheduleNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setScheduleModalTarget(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HAPUS INVESTASI DENGAN PIN */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-white">
            <div className="flex items-center space-x-3 text-rose-400 mb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Otorisasi Hapus Investasi</h3>
                <p className="text-[11px] text-slate-400">Tindakan ini permanen & menghapus 12 baris jadwal</p>
              </div>
            </div>

            <div className="my-3 p-3 bg-slate-800/80 rounded-xl text-xs">
              <div className="font-bold text-slate-200">{deleteTarget.investorName}</div>
              <div className="text-purple-300 font-mono text-[11px]">
                {deleteTarget.code} • {formatCurrency(deleteTarget.capitalAmount)}
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs mb-3">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Alasan Penghapusan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembatalan kontrak / renegosiasi"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">PIN Keamanan (6 Digit) *</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="******"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center text-lg tracking-widest text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Konfirmasi Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
