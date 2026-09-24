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
  FileCheck,
  DollarSign,
  Info
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
  const [modalSecondaryTransferProof, setModalSecondaryTransferProof] = useState<string>('');
  const [modalRealizationDate, setModalRealizationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [modalScheduleNotes, setModalScheduleNotes] = useState<string>('');

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<InvestmentRecord | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Date helper functions for synchronization
  const computeEndDate = (startDateStr: string, months: number): string => {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
    const end = new Date(y, m + Number(months || 1), d);
    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const computeDurationMonths = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 12;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 12;
    const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30.4375);
    return Math.max(1, months || 1);
  };

  // Form State for Investment
  const initialStartDate = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<{
    investorName: string;
    investorContact: string;
    investorEmail: string;
    investorIdNumber: string;
    startDate: string;
    endDate: string;
    durationMonths: number;
    capitalAmount: number;
    allocation: string;
    projectId: string;
    profitSharingPercent: number; // Bagi Hasil Utama (% / Bln)
    profitSharingDay: number;
    // Fitur Split Bagi Hasil: Imbal dari Bagi Hasil
    hasSplitProfit: boolean;
    secondaryProfitPercent: number; // Imbal dari Bagi Hasil (% / Bln)
    secondaryRecipientRole: string;
    // Rekening Penerima Bagi Hasil Utama
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    // Rekening Penerima Imbal Bagi Hasil (muncul jika split dipilih)
    secondaryBankName: string;
    secondaryBankAccountNumber: string;
    secondaryBankAccountHolder: string;
    notes: string;
  }>({
    investorName: '',
    investorContact: '',
    investorEmail: '',
    investorIdNumber: '',
    startDate: initialStartDate,
    endDate: computeEndDate(initialStartDate, 12),
    durationMonths: 12, // Default 12 bulan
    capitalAmount: 100000000,
    allocation: 'Modal Kerja Operasional Manpower & Pengadaan Mesin Sanitasi',
    projectId: 'proj-1',
    profitSharingPercent: 1.5,
    profitSharingDay: 25,
    hasSplitProfit: false,
    secondaryProfitPercent: 0.5,
    secondaryRecipientRole: 'Mitra Agen / Pengelola / Co-Investor',
    bankName: 'Bank BCA',
    bankAccountNumber: '',
    bankAccountHolder: '',
    secondaryBankName: 'Bank Mandiri',
    secondaryBankAccountNumber: '',
    secondaryBankAccountHolder: '',
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
        const profit = sch.totalProfitCombined ?? (sch.profitAmount + (sch.secondaryProfitAmount || 0));
        if (sch.status === 'DI Realisasikan') {
          totalRealizedProfit += profit;
        } else {
          totalPendingProfit += profit;
          // Check if due in August 2026
          if (sch.dueDate.startsWith('2026-08')) {
            thisMonthDueProfit += profit;
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
    const today = new Date().toISOString().split('T')[0];
    setEditingInvestment(null);
    setFormData({
      investorName: '',
      investorContact: '',
      investorEmail: '',
      investorIdNumber: '',
      startDate: today,
      endDate: computeEndDate(today, 12),
      durationMonths: 12,
      capitalAmount: 100000000,
      allocation: 'Modal Kerja Operasional & Pengadaan Perlengkapan Sanitasi',
      projectId: projects[0]?.id || 'proj-1',
      profitSharingPercent: 1.5,
      profitSharingDay: 25,
      hasSplitProfit: false,
      secondaryProfitPercent: 0.5,
      secondaryRecipientRole: 'Mitra Agen / Pengelola / Co-Investor',
      bankName: 'Bank BCA',
      bankAccountNumber: '',
      bankAccountHolder: '',
      secondaryBankName: 'Bank Mandiri',
      secondaryBankAccountNumber: '',
      secondaryBankAccountHolder: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Investment Modal
  const handleOpenEdit = (inv: InvestmentRecord) => {
    setEditingInvestment(inv);
    const end = inv.endDate || computeEndDate(inv.startDate, inv.durationMonths);
    setFormData({
      investorName: inv.investorName,
      investorContact: inv.investorContact || '',
      investorEmail: inv.investorEmail || '',
      investorIdNumber: inv.investorIdNumber || '',
      startDate: inv.startDate,
      endDate: end,
      durationMonths: inv.durationMonths,
      capitalAmount: inv.capitalAmount,
      allocation: inv.allocation,
      projectId: inv.projectId || 'proj-1',
      profitSharingPercent: inv.profitSharingPercent,
      profitSharingDay: inv.profitSharingDay,
      hasSplitProfit: inv.hasSplitProfit ?? false,
      secondaryProfitPercent: inv.secondaryProfitPercent ?? 0.5,
      secondaryRecipientRole: inv.secondaryRecipientRole || 'Mitra Agen / Pengelola / Co-Investor',
      bankName: inv.bankName,
      bankAccountNumber: inv.bankAccountNumber,
      bankAccountHolder: inv.bankAccountHolder,
      secondaryBankName: inv.secondaryBankName || 'Bank Mandiri',
      secondaryBankAccountNumber: inv.secondaryBankAccountNumber || '',
      secondaryBankAccountHolder: inv.secondaryBankAccountHolder || '',
      notes: inv.notes || ''
    });
    setIsModalOpen(true);
  };

  // Save Investment
  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.investorName || formData.capitalAmount <= 0 || !formData.bankAccountNumber) {
      alert('Mohon lengkapi Nama Investor, Nominal Modal Kerja, dan Nomor Rekening Utama.');
      return;
    }

    if (formData.hasSplitProfit) {
      if (!formData.secondaryBankName || !formData.secondaryBankAccountNumber || !formData.secondaryBankAccountHolder) {
        alert('Fitur Split Bagi Hasil diaktifkan: Mohon lengkapi Nama Bank, Nomor Rekening, dan Atas Nama Penerima Imbal Bagi Hasil.');
        return;
      }
    }

    const prj = projects.find((p) => p.id === formData.projectId);
    const projectName = prj?.name || 'Proyek';

    // Calculate/Ensure End Date is maintained
    const finalEndDate = formData.endDate || computeEndDate(formData.startDate, formData.durationMonths);

    const monthlyProfitAmount = (formData.capitalAmount * (formData.profitSharingPercent || 0)) / 100;
    const secondaryMonthlyAmount = formData.hasSplitProfit
      ? (formData.capitalAmount * (formData.secondaryProfitPercent || 0)) / 100
      : 0;
    const totalMonthlyProfitAmount = monthlyProfitAmount + secondaryMonthlyAmount;
    const totalProjectedProfit = totalMonthlyProfitAmount * formData.durationMonths;

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
        formData.bankAccountHolder,
        formData.hasSplitProfit,
        formData.secondaryProfitPercent,
        formData.secondaryBankName,
        formData.secondaryBankAccountNumber,
        formData.secondaryBankAccountHolder
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
            secondaryTransferProof: old.secondaryTransferProof,
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
        endDate: finalEndDate,
        durationMonths: formData.durationMonths,
        capitalAmount: formData.capitalAmount,
        allocation: formData.allocation,
        projectId: formData.projectId,
        projectName,
        profitSharingPercent: formData.profitSharingPercent,
        profitSharingDay: formData.profitSharingDay,
        monthlyProfitAmount,
        totalProjectedProfit,
        hasSplitProfit: formData.hasSplitProfit,
        secondaryProfitPercent: formData.hasSplitProfit ? formData.secondaryProfitPercent : 0,
        secondaryMonthlyAmount: secondaryMonthlyAmount,
        totalMonthlyProfitAmount: totalMonthlyProfitAmount,
        secondaryRecipientRole: formData.secondaryRecipientRole,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountHolder: formData.bankAccountHolder,
        secondaryBankName: formData.hasSplitProfit ? formData.secondaryBankName : undefined,
        secondaryBankAccountNumber: formData.hasSplitProfit ? formData.secondaryBankAccountNumber : undefined,
        secondaryBankAccountHolder: formData.hasSplitProfit ? formData.secondaryBankAccountHolder : undefined,
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
        description: `Memperbarui data investasi investor ${updated.investorName} (${formatCurrency(updated.capitalAmount)})${updated.hasSplitProfit ? ' [Split Bagi Hasil Aktif]' : ''}`,
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
        formData.bankAccountHolder,
        formData.hasSplitProfit,
        formData.secondaryProfitPercent,
        formData.secondaryBankName,
        formData.secondaryBankAccountNumber,
        formData.secondaryBankAccountHolder
      );

      const newInv: InvestmentRecord = {
        id: `inv-${Date.now()}`,
        code: newCode,
        investorName: formData.investorName,
        investorContact: formData.investorContact,
        investorEmail: formData.investorEmail,
        investorIdNumber: formData.investorIdNumber,
        startDate: formData.startDate,
        endDate: finalEndDate,
        durationMonths: formData.durationMonths,
        capitalAmount: formData.capitalAmount,
        allocation: formData.allocation,
        projectId: formData.projectId,
        projectName,
        profitSharingPercent: formData.profitSharingPercent,
        profitSharingDay: formData.profitSharingDay,
        monthlyProfitAmount,
        totalProjectedProfit,
        hasSplitProfit: formData.hasSplitProfit,
        secondaryProfitPercent: formData.hasSplitProfit ? formData.secondaryProfitPercent : 0,
        secondaryMonthlyAmount: secondaryMonthlyAmount,
        totalMonthlyProfitAmount: totalMonthlyProfitAmount,
        secondaryRecipientRole: formData.secondaryRecipientRole,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountHolder: formData.bankAccountHolder,
        secondaryBankName: formData.hasSplitProfit ? formData.secondaryBankName : undefined,
        secondaryBankAccountNumber: formData.hasSplitProfit ? formData.secondaryBankAccountNumber : undefined,
        secondaryBankAccountHolder: formData.hasSplitProfit ? formData.secondaryBankAccountHolder : undefined,
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
    setModalSecondaryTransferProof(
      sch.secondaryTransferProof || (inv.hasSplitProfit ? `TRF-IMB-M${sch.monthIndex}-${Date.now().toString().slice(-4)}` : '')
    );
    setModalRealizationDate(sch.realizationDate || new Date().toISOString().split('T')[0]);
    setModalScheduleNotes(sch.notes || '');
  };

  // Save Schedule Status
  const handleSaveScheduleStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalTarget) return;

    const { investment, scheduleRow } = scheduleModalTarget;
    const isRealized = modalNewStatus === 'DI Realisasikan';
    const updatedSchedules = investment.schedules.map((s) => {
      if (s.id === scheduleRow.id) {
        return {
          ...s,
          status: modalNewStatus,
          realizationDate: isRealized ? modalRealizationDate : undefined,
          transferProof: isRealized ? modalTransferProof : undefined,
          secondaryTransferProof: isRealized && investment.hasSplitProfit ? modalSecondaryTransferProof : undefined,
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
      description: `Mengubah status bagi hasil ${investment.investorName} (${scheduleRow.monthLabel}) menjadi "${modalNewStatus}" (${formatCurrency(scheduleRow.totalProfitCombined ?? scheduleRow.profitAmount)})`,
      amount: scheduleRow.totalProfitCombined ?? scheduleRow.profitAmount
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
          'Tanggal Mulai': inv.startDate,
          'Tanggal Berakhir': inv.endDate,
          'Durasi Kontrak (Bulan)': inv.durationMonths,
          'Bagi Hasil Utama (%)': `${inv.profitSharingPercent}%`,
          'Bagi Hasil Utama (Rp)': sch.profitAmount,
          'Fitur Split': inv.hasSplitProfit ? 'Ya' : 'Tidak',
          'Imbal Bagi Hasil (%)': inv.hasSplitProfit ? `${inv.secondaryProfitPercent || 0}%` : '-',
          'Imbal Bagi Hasil (Rp)': inv.hasSplitProfit ? (sch.secondaryProfitAmount || 0) : 0,
          'Bulan Ke-': sch.monthIndex,
          'Periode Payout': sch.monthLabel,
          'Jatuh Tempo': sch.dueDate,
          'Total Bagi Hasil (Rp)': sch.totalProfitCombined ?? (sch.profitAmount + (sch.secondaryProfitAmount || 0)),
          'Pengembalian Pokok (Rp)': sch.principalReturnAmount,
          'Total Pembayaran (Rp)': sch.totalPayout,
          'Status Payout': sch.status,
          'Tanggal Realisasi': sch.realizationDate || '-',
          'Bank Rek Utama': inv.bankName,
          'No Rek Utama': inv.bankAccountNumber,
          'Atas Nama Utama': inv.bankAccountHolder,
          'Bank Rek Imbalan': inv.hasSplitProfit ? (inv.secondaryBankName || '-') : '-',
          'No Rek Imbalan': inv.hasSplitProfit ? (inv.secondaryBankAccountNumber || '-') : '-',
          'Atas Nama Imbalan': inv.hasSplitProfit ? (inv.secondaryBankAccountHolder || '-') : '-',
          'Bukti Transfer Utama': sch.transferProof || '-',
          'Bukti Transfer Imbalan': sch.secondaryTransferProof || '-'
        });
      });
    });

    downloadCSV(exportData, `Rajawali_Pencatatan_Investasi_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300">
              Penyertaan Modal & Bagi Hasil
            </span>
            <span className="text-xs text-slate-500 font-medium">Auto Generate 12 Baris Jadwal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-600" />
            Pencatatan Investasi & Bagi Hasil
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Manajemen investor, alokasi modal kerja, jadwal 12 baris bagi hasil otomatis, rekening penerima & kontrol status "Ditunda / DI Realisasikan".
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Ekspor Jadwal CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-700/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 !text-white" />
            <span className="!text-white">Tambah Investasi Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Modal Kerja */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>Total Modal Kerja Investasi</span>
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-900 mt-1">
            {formatCurrency(stats.totalCapital)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2 font-medium">
            <span>Investor Aktif:</span>
            <span className="font-bold text-slate-900">{stats.activeInvestorsCount} Mitra</span>
          </div>
        </div>

        {/* Bagi Hasil Realisasi */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>Bagi Hasil Telah Direalisasikan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(stats.totalRealizedProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2 font-medium">
            <span>Status Pembayaran:</span>
            <span className="font-bold text-emerald-800">Telah Ditransfer</span>
          </div>
        </div>

        {/* Bagi Hasil Ditunda / Pending */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>Bagi Hasil Masih "Ditunda"</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-800 mt-1">
            {formatCurrency(stats.totalPendingProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2 font-medium">
            <span>Proyeksi Total Kontrak:</span>
            <span className="font-semibold text-slate-800">12 Periode / Investor</span>
          </div>
        </div>

        {/* Jatuh Tempo Bulan Ini */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>Bagi Hasil Jatuh Tempo Bulan Ini</span>
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-800 mt-1">
            {formatCurrency(stats.thisMonthDueProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2 font-medium">
            <span>Periode Berjalan:</span>
            <span className="font-bold text-blue-900">Agustus 2026</span>
          </div>
        </div>
      </div>

      {/* Reminder Notification Box */}
      {reminders.length > 0 && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-xl bg-purple-600 text-white shadow-xs">
                <Bell className="w-4 h-4 !text-white" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-purple-950">
                  Reminder Pembagian Bagi Hasil Investor ({reminders.length} Jadwal Jatuh Tempo / Ditunda)
                </h3>
                <span className="text-[11px] text-purple-900 font-semibold">Pengingat Rekening & Tanggal Bagi Hasil</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reminders.slice(0, 6).map((item, idx) => {
              const profitTotal = item.schedule.totalProfitCombined ?? (item.schedule.profitAmount + (item.schedule.secondaryProfitAmount || 0));
              const hasSplit = item.investment.hasSplitProfit || (item.schedule.secondaryProfitAmount && item.schedule.secondaryProfitAmount > 0);

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-xs transition-all ${
                    item.isOverdue
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-white border-slate-200 text-slate-900 hover:border-purple-300'
                  }`}
                >
                  <div className="min-w-0 pr-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="font-black text-slate-900 truncate text-xs sm:text-sm">{item.investment.investorName}</div>
                      {hasSplit && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                          Split
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium truncate">
                      {item.schedule.monthLabel} • <span className={item.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700'}>Due: {item.schedule.dueDate}</span>
                    </div>

                    <div className="text-[10px] text-purple-950 font-bold font-mono truncate bg-purple-100/70 px-1.5 py-0.5 rounded border border-purple-200">
                      Rek. Utama: {item.investment.bankName}: {item.investment.bankAccountNumber}
                    </div>

                    {hasSplit && item.investment.secondaryBankAccountNumber && (
                      <div className="text-[10px] text-amber-950 font-bold font-mono truncate bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200">
                        Rek. Imbalan: {item.investment.secondaryBankName}: {item.investment.secondaryBankAccountNumber}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-purple-900 text-sm">{formatCurrency(profitTotal)}</div>
                    {hasSplit && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Utama: {formatCurrency(item.schedule.profitAmount)} | Imb: {formatCurrency(item.schedule.secondaryProfitAmount || 0)}
                      </div>
                    )}
                    <button
                      onClick={() => handleQuickRealize(item.investment, item.schedule)}
                      className="mt-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 !text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <span className="!text-white">Realisasikan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Investor Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Investor Filter Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-bold">
            <User className="w-4 h-4 text-purple-600" />
            <span>Pilih Investor:</span>
          </div>

          <select
            value={selectedInvestorFilter}
            onChange={(e) => setSelectedInvestorFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          />
        </div>
      </div>

      {/* Investment Contracts List with Expandable 12-Month Schedule */}
      <div className="space-y-4">
        {filteredInvestments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
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
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all"
              >
                {/* Investment Header / Card */}
                <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded border border-purple-300">
                        {inv.code}
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                        {inv.investorName}
                      </h2>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          inv.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {inv.status === 'ACTIVE' ? 'KONTRAK AKTIF' : 'SELESAI'}
                      </span>
                      {inv.hasSplitProfit && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                          SPLIT BAGI HASIL
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-bold text-slate-600">Alokasi Investasi / Modal Kerja:</span>
                      <span className="text-slate-900 font-semibold">{inv.allocation}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span>
                          Periode: <strong className="text-slate-900">{inv.startDate}</strong> s/d{' '}
                          <strong className="text-slate-900">{inv.endDate}</strong> ({inv.durationMonths} Bulan)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          Rek. Utama: <strong className="text-slate-900">{inv.bankName} - {inv.bankAccountNumber}</strong> a/n{' '}
                          <strong className="text-slate-900">{inv.bankAccountHolder}</strong>
                        </span>
                      </div>
                      {inv.hasSplitProfit && inv.secondaryBankAccountNumber && (
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            Rek. Imbalan: <strong className="text-amber-900">{inv.secondaryBankName} - {inv.secondaryBankAccountNumber}</strong> a/n{' '}
                            <strong className="text-slate-900">{inv.secondaryBankAccountHolder}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Metrics of the Contract */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Modal Kerja Disetor</div>
                      <div className="text-base sm:text-xl font-black text-purple-900">
                        {formatCurrency(inv.capitalAmount)}
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                        {inv.hasSplitProfit ? (
                          <span>Bagi Hasil (Utama {inv.profitSharingPercent}% + Imbal {inv.secondaryProfitPercent || 0}%)</span>
                        ) : (
                          <span>Bagi Hasil ({inv.profitSharingPercent}% / Bln - Tgl {inv.profitSharingDay})</span>
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-black text-emerald-700">
                        {formatCurrency((inv.monthlyProfitAmount || 0) + (inv.secondaryMonthlyAmount || 0))} / bulan
                      </div>
                      {inv.hasSplitProfit && (
                        <div className="text-[10px] text-slate-500">
                          Utama: {formatCurrency(inv.monthlyProfitAmount)} • Imbal: {formatCurrency(inv.secondaryMonthlyAmount || 0)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 pl-2">
                      <button
                        onClick={() => handleOpenEdit(inv)}
                        className="p-2 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                        title="Edit Kontrak Investasi"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(inv)}
                        className="p-2 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-xl border border-rose-200 cursor-pointer transition-colors"
                        title="Hapus Kontrak (Wajib PIN)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedInvestmentId(isExpanded ? null : inv.id)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 !text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <span className="!text-white font-bold">{isExpanded ? 'Tutup Jadwal' : `Lihat ${totalRows} Baris Jadwal`}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 !text-white" /> : <ChevronDown className="w-4 h-4 !text-white" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar of Realized vs Pending */}
                <div className="px-4 sm:px-5 py-2.5 bg-slate-50 flex items-center justify-between text-xs text-slate-600 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">Realisasi Bagi Hasil:</span>
                    <span className="font-black text-emerald-700">
                      {realizedCount} dari {totalRows} Bulan Direalisasikan
                    </span>
                  </div>
                  <div className="w-36 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${(realizedCount / (totalRows || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 12-MONTH SCHEDULE TABLE (EXPANDED) */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 overflow-x-auto bg-white">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        Jadwal Otomatis 12 Baris Pembagian Bagi Hasil ({inv.durationMonths} Bulan Payout)
                        {inv.hasSplitProfit && (
                          <span className="ml-2 text-purple-800 bg-purple-100 font-bold px-2 py-0.5 rounded text-[11px]">
                            Skema Split: Bagi Hasil Utama ({inv.profitSharingPercent}%) + Imbalan ({inv.secondaryProfitPercent}%)
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Klik tombol status untuk mengubah menjadi <strong>"Ditunda"</strong> atau{' '}
                        <strong>"DI Realisasikan"</strong>
                      </span>
                    </div>

                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Bulan</th>
                          <th className="py-2.5 px-3">Tgl Jatuh Tempo</th>
                          <th className="py-2.5 px-3 text-right">Bagi Hasil Utama ({inv.profitSharingPercent}%)</th>
                          {inv.hasSplitProfit && (
                            <th className="py-2.5 px-3 text-right text-amber-900">Imbal Bagi Hasil ({inv.secondaryProfitPercent || 0}%)</th>
                          )}
                          <th className="py-2.5 px-3 text-right">Total Bagi Hasil</th>
                          <th className="py-2.5 px-3 text-right">Pengembalian Pokok</th>
                          <th className="py-2.5 px-3 text-right">Total Payout</th>
                          <th className="py-2.5 px-3">Rekening Penerima (Snapshot)</th>
                          <th className="py-2.5 px-3 text-center">Status Pembagian</th>
                          <th className="py-2.5 px-3">Tgl / Bukti Realisasi</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {inv.schedules.map((sch) => {
                          const profitTotal = sch.totalProfitCombined ?? (sch.profitAmount + (sch.secondaryProfitAmount || 0));

                          return (
                            <tr
                              key={sch.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                sch.status === 'DI Realisasikan' ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                <div>{sch.monthLabel}</div>
                                <div className="text-[10px] text-slate-500 font-normal">Cicilan #{sch.monthIndex}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-mono text-slate-700 font-medium">{sch.dueDate}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-purple-900">
                                {formatCurrency(sch.profitAmount)}
                              </td>
                              {inv.hasSplitProfit && (
                                <td className="py-2.5 px-3 text-right font-black text-amber-800">
                                  {formatCurrency(sch.secondaryProfitAmount || 0)}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                                {formatCurrency(profitTotal)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                                {sch.principalReturnAmount > 0 ? (
                                  <span className="font-bold text-blue-700">{formatCurrency(sch.principalReturnAmount)}</span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                {formatCurrency(sch.totalPayout)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800">
                                <div className="font-bold text-slate-900">{sch.accountHolderSnapshot}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {sch.bankNameSnapshot} - {sch.bankAccountNumberSnapshot}
                                </div>
                                {inv.hasSplitProfit && (sch.secondaryAccountNumberSnapshot || inv.secondaryBankAccountNumber) && (
                                  <div className="mt-1 pt-1 border-t border-slate-100 text-[10px]">
                                    <span className="text-amber-800 font-bold block">
                                      Imbalan: {sch.secondaryAccountHolderSnapshot || inv.secondaryBankAccountHolder}
                                    </span>
                                    <span className="text-slate-500 font-mono">
                                      {sch.secondaryBankNameSnapshot || inv.secondaryBankName} - {sch.secondaryAccountNumberSnapshot || inv.secondaryBankAccountNumber}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                    sch.status === 'DI Realisasikan'
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-950 border border-amber-300'
                                  }`}
                                >
                                  {sch.status === 'DI Realisasikan' ? 'DI Realisasikan' : 'Ditunda'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                                {sch.status === 'DI Realisasikan' ? (
                                  <div>
                                    <div className="font-bold text-emerald-700">{sch.realizationDate}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{sch.transferProof}</div>
                                    {sch.secondaryTransferProof && (
                                      <div className="text-[9px] text-amber-800 font-mono">Imb: {sch.secondaryTransferProof}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Menunggu realisasi</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => handleOpenScheduleModal(inv, sch)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                                >
                                  Ubah Status
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl p-5 sm:p-6 text-slate-900 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  {editingInvestment ? 'Edit Kontrak Investasi & Modal Kerja' : 'Pencatatan Investasi & Modal Kerja Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lengkapi data investor, skema bagi hasil utama, imbalan split bagi hasil, dan rekening penerima.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-4 mt-4 text-xs">
              {/* Profil Investor */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-purple-600" />
                  Identitas Investor / Mitra
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Nama Investor / Mitra *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: H. Gunawan Prasetyo (Mitra Investama)"
                      value={formData.investorName}
                      onChange={(e) => setFormData({ ...formData, investorName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">No. Kontak / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="0812-xxxx-xxxx"
                      value={formData.investorContact}
                      onChange={(e) => setFormData({ ...formData, investorContact: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email / NIK / NPWP</label>
                    <input
                      type="text"
                      placeholder="investor@domain.com"
                      value={formData.investorEmail}
                      onChange={(e) => setFormData({ ...formData, investorEmail: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Kerja Disetor & Durasi / Tanggal */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  Modal Kerja Disetor & Periode Kontrak
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Modal Kerja Disetor (Rp) *</label>
                    <input
                      type="number"
                      required
                      min="1000000"
                      step="1000000"
                      value={formData.capitalAmount || ''}
                      onChange={(e) => setFormData({ ...formData, capitalAmount: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-purple-900 font-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="text-[11px] text-purple-700 font-bold mt-1">
                      Terbilang: {formatCurrency(formData.capitalAmount || 0)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Durasi Kontrak (Bulan) *</label>
                    <select
                      value={formData.durationMonths}
                      onChange={(e) => {
                        const months = Number(e.target.value);
                        setFormData({
                          ...formData,
                          durationMonths: months,
                          endDate: computeEndDate(formData.startDate, months)
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={6}>6 Bulan (6 Baris Jadwal)</option>
                      <option value={12}>12 Bulan (12 Baris Jadwal Otomatis)</option>
                      <option value={24}>24 Bulan (24 Baris Jadwal)</option>
                      <option value={36}>36 Bulan (36 Baris Jadwal)</option>
                    </select>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Menghasilkan {formData.durationMonths} baris jadwal otomatis
                    </div>
                  </div>
                </div>

                {/* Tanggal Mulai dan Tanggal Berakhir (Tetap Dipertahankan) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tanggal Mulai Kontrak *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const newEnd = computeEndDate(newStart, formData.durationMonths);
                        setFormData({
                          ...formData,
                          startDate: newStart,
                          endDate: newEnd
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tanggal Berakhir Kontrak *</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        const newMonths = computeDurationMonths(formData.startDate, newEnd);
                        setFormData({
                          ...formData,
                          endDate: newEnd,
                          durationMonths: newMonths
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Alokasi Investasi / Modal Kerja *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pengadaan Mesin Ride-on Scrubber & Penambahan Manpower RS Siloam"
                    value={formData.allocation}
                    onChange={(e) => setFormData({ ...formData, allocation: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>

              {/* Skema Bagi Hasil: Bagi Hasil Utama & Fitur Split Imbal Bagi Hasil */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-purple-600" />
                    Skema Bagi Hasil & Pembagian Payout
                  </div>
                  <span className="text-[11px] text-purple-800 font-semibold">Tiap Bulan Tanggal {formData.profitSharingDay}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Bagi Hasil Utama (% / Bln) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="100"
                      required
                      value={formData.profitSharingPercent || ''}
                      onChange={(e) => setFormData({ ...formData, profitSharingPercent: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-emerald-800 font-black focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <div className="text-[11px] text-emerald-700 font-bold mt-1">
                      Nilai: {formatCurrency((formData.capitalAmount * (formData.profitSharingPercent || 0)) / 100)} / bulan
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tanggal Pembagian Payout (1-28) *</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      required
                      value={formData.profitSharingDay || ''}
                      onChange={(e) => setFormData({ ...formData, profitSharingDay: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-blue-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="text-[11px] text-slate-500 mt-1">
                      Ditransfer rutin tiap tanggal {formData.profitSharingDay}
                    </div>
                  </div>
                </div>

                {/* FITUR SPLIT BAGI HASIL TOGGLE */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-start space-x-2.5 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.hasSplitProfit}
                      onChange={(e) => setFormData({ ...formData, hasSplitProfit: e.target.checked })}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-black text-slate-900 text-xs block">
                        Aktifkan Fitur Split Bagi Hasil (Bagi Hasil Utama + Imbal Bagi Hasil)
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Centang opsi ini untuk memisahkan sebagian keuntungan bagi hasil kepada rekening mitra, agen, atau pengelola terpisah.
                      </span>
                    </div>
                  </label>
                </div>

                {/* JIKA FITUR SPLIT BAGI HASIL DIPILIH */}
                {formData.hasSplitProfit && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2.5">
                    <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-purple-600" />
                      Imbal dari Bagi Hasil (% / Bln)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-purple-950 font-bold mb-1">
                          Imbal dari Bagi Hasil (% / Bln) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="50"
                          required={formData.hasSplitProfit}
                          value={formData.secondaryProfitPercent || ''}
                          onChange={(e) => setFormData({ ...formData, secondaryProfitPercent: Number(e.target.value) })}
                          className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-purple-900 font-black focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                        <div className="text-[11px] text-purple-800 font-bold mt-1">
                          Nilai Imbalan: {formatCurrency((formData.capitalAmount * (formData.secondaryProfitPercent || 0)) / 100)} / bulan
                        </div>
                      </div>

                      <div>
                        <label className="block text-purple-950 font-bold mb-1">Peruntukan / Keterangan Imbalan</label>
                        <input
                          type="text"
                          value={formData.secondaryRecipientRole}
                          onChange={(e) => setFormData({ ...formData, secondaryRecipientRole: e.target.value })}
                          placeholder="Mitra Agen / Pengelola / Co-Investor"
                          className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* REKENING PENERIMA BAGI HASIL */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  Rekening Penerima Bagi Hasil
                </div>

                {/* Rekening Utama */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Rekening Penerima Bagi Hasil Utama (Investor) *
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-600 text-[11px] font-bold mb-1">Nama Bank *</label>
                      <input
                        type="text"
                        required
                        placeholder="Bank BCA / Mandiri / BNI"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-[11px] font-bold mb-1">Nomor Rekening *</label>
                      <input
                        type="text"
                        required
                        placeholder="123-456-7890"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-[11px] font-bold mb-1">Atas Nama Penerima *</label>
                      <input
                        type="text"
                        required
                        placeholder="H. Gunawan Prasetyo"
                        value={formData.bankAccountHolder}
                        onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Kolom Baru: Rekening Penerima Imbal Bagi Hasil (Hanya muncul jika split dipilih) */}
                {formData.hasSplitProfit && (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-300 space-y-2">
                    <div className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Kolom Baru: Rekening Penerima Imbal Bagi Hasil *</span>
                      </div>
                      <span className="text-[10px] text-amber-900 font-mono font-semibold">
                        {formData.secondaryRecipientRole || 'Mitra Agen'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-amber-950 text-[11px] font-bold mb-1">Nama Bank Imbalan *</label>
                        <input
                          type="text"
                          required={formData.hasSplitProfit}
                          placeholder="Bank Mandiri / BRI / BCA"
                          value={formData.secondaryBankName}
                          onChange={(e) => setFormData({ ...formData, secondaryBankName: e.target.value })}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-amber-950 text-[11px] font-bold mb-1">Nomor Rekening Imbalan *</label>
                        <input
                          type="text"
                          required={formData.hasSplitProfit}
                          placeholder="987-654-3210"
                          value={formData.secondaryBankAccountNumber}
                          onChange={(e) => setFormData({ ...formData, secondaryBankAccountNumber: e.target.value })}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-amber-950 text-[11px] font-bold mb-1">Atas Nama Penerima Imbalan *</label>
                        <input
                          type="text"
                          required={formData.hasSplitProfit}
                          placeholder="Nama Mitra / Pengelola"
                          value={formData.secondaryBankAccountHolder}
                          onChange={(e) => setFormData({ ...formData, secondaryBankAccountHolder: e.target.value })}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* INFORMASI LENGKAP PERHITUNGAN INVESTASI & BAGI HASIL */}
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2">
                <div className="text-xs font-black text-purple-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-purple-700" />
                    Informasi & Ringkasan Proyeksi Payout
                  </div>
                  <span className="text-[11px] text-purple-800 font-bold">
                    {formData.durationMonths} Bulan Periode
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-800">
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Modal Kerja</div>
                    <div className="font-black text-purple-950 text-xs sm:text-sm mt-0.5">
                      {formatCurrency(formData.capitalAmount || 0)}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Bagi Hasil Utama</div>
                    <div className="font-black text-emerald-700 text-xs sm:text-sm mt-0.5">
                      {formatCurrency((formData.capitalAmount * (formData.profitSharingPercent || 0)) / 100)} / bln
                    </div>
                    <div className="text-[9px] text-slate-500">Rate: {formData.profitSharingPercent}%/bln</div>
                  </div>

                  {formData.hasSplitProfit ? (
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <div className="text-[10px] text-amber-800 font-semibold uppercase">Imbal Bagi Hasil</div>
                      <div className="font-black text-amber-800 text-xs sm:text-sm mt-0.5">
                        {formatCurrency((formData.capitalAmount * (formData.secondaryProfitPercent || 0)) / 100)} / bln
                      </div>
                      <div className="text-[9px] text-slate-500">Rate: {formData.secondaryProfitPercent}%/bln</div>
                    </div>
                  ) : (
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Status Split</div>
                      <div className="font-bold text-slate-700 text-xs mt-0.5">Tidak Aktif</div>
                      <div className="text-[9px] text-slate-400">100% Bagi Hasil Utama</div>
                    </div>
                  )}

                  <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Payout / Bln</div>
                    <div className="font-black text-purple-900 text-xs sm:text-sm mt-0.5">
                      {formatCurrency(
                        (formData.capitalAmount * (formData.profitSharingPercent || 0)) / 100 +
                          (formData.hasSplitProfit ? (formData.capitalAmount * (formData.secondaryProfitPercent || 0)) / 100 : 0)
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500">Tiap tgl {formData.profitSharingDay}</div>
                  </div>
                </div>

                <div className="text-[11px] text-purple-900 bg-white/70 p-2 rounded-lg border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>
                    Periode Kontrak: <strong>{formData.startDate || '-'}</strong> s/d <strong>{formData.endDate || '-'}</strong>
                  </span>
                  <span>
                    Proyeksi Total Payout: <strong>{formatCurrency(
                      ((formData.capitalAmount * (formData.profitSharingPercent || 0)) / 100 +
                        (formData.hasSplitProfit ? (formData.capitalAmount * (formData.secondaryProfitPercent || 0)) / 100 : 0)) *
                        formData.durationMonths
                    )}</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Catatan Tambahan / No Akta Notaris</label>
                <textarea
                  rows={2}
                  placeholder="Klausul perjanjian notaris, pengembalian pokok modal..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 !text-white font-bold rounded-xl shadow-md shadow-purple-700/20 cursor-pointer transition-colors"
                >
                  <span className="!text-white font-bold">
                    {editingInvestment ? 'Simpan Perubahan Kontrak' : `Generate ${formData.durationMonths} Baris & Simpan`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UBAH STATUS REALISASI / DITUNDA */}
      {scheduleModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Update Realisasi Bagi Hasil
              </h3>
              <button
                onClick={() => setScheduleModalTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Investor:</span>
                <span className="font-bold text-slate-900">{scheduleModalTarget.investment.investorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Periode Payout:</span>
                <span className="font-bold text-purple-900">
                  {scheduleModalTarget.scheduleRow.monthLabel} (Cicilan #{scheduleModalTarget.scheduleRow.monthIndex})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Bagi Hasil Utama:</span>
                <span className="font-black text-emerald-700">
                  {formatCurrency(scheduleModalTarget.scheduleRow.profitAmount)}
                </span>
              </div>
              {scheduleModalTarget.investment.hasSplitProfit && (
                <div className="flex justify-between">
                  <span className="text-amber-800 font-medium">Imbal Bagi Hasil:</span>
                  <span className="font-black text-amber-800">
                    {formatCurrency(scheduleModalTarget.scheduleRow.secondaryProfitAmount || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-700 font-bold">Total Payout:</span>
                <span className="font-black text-purple-950">
                  {formatCurrency(scheduleModalTarget.scheduleRow.totalPayout)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 pt-1">
                <div>
                  Rek. Utama: <strong>{scheduleModalTarget.scheduleRow.bankNameSnapshot} - {scheduleModalTarget.scheduleRow.bankAccountNumberSnapshot}</strong> ({scheduleModalTarget.scheduleRow.accountHolderSnapshot})
                </div>
                {scheduleModalTarget.investment.hasSplitProfit && (
                  <div className="text-amber-900 mt-0.5">
                    Rek. Imbalan: <strong>{scheduleModalTarget.investment.secondaryBankName} - {scheduleModalTarget.investment.secondaryBankAccountNumber}</strong> ({scheduleModalTarget.investment.secondaryBankAccountHolder})
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveScheduleStatus} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Pilihan Status *</label>
                <select
                  value={modalNewStatus}
                  onChange={(e) => setModalNewStatus(e.target.value as ProfitSharingStatus)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="DI Realisasikan">DI Realisasikan (Telah Ditransfer)</option>
                  <option value="Ditunda">Ditunda (Menunggu Jadwal / Pending)</option>
                </select>
              </div>

              {modalNewStatus === 'DI Realisasikan' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Tanggal Realisasi</label>
                      <input
                        type="date"
                        value={modalRealizationDate}
                        onChange={(e) => setModalRealizationDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Bukti Transfer Utama</label>
                      <input
                        type="text"
                        value={modalTransferProof}
                        onChange={(e) => setModalTransferProof(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {scheduleModalTarget.investment.hasSplitProfit && (
                    <div>
                      <label className="block text-amber-900 font-bold mb-1">Bukti Transfer Imbalan (Split)</label>
                      <input
                        type="text"
                        value={modalSecondaryTransferProof}
                        onChange={(e) => setModalSecondaryTransferProof(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Keterangan transfer / alasan penundaan..."
                  value={modalScheduleNotes}
                  onChange={(e) => setModalScheduleNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setScheduleModalTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 !text-white font-bold rounded-xl shadow-md shadow-purple-700/20 cursor-pointer"
                >
                  <span className="!text-white font-bold">Simpan Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HAPUS INVESTASI DENGAN PIN */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-rose-300 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-slate-900">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Otorisasi Hapus Investasi</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini permanen & menghapus 12 baris jadwal</p>
              </div>
            </div>

            <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="font-bold text-slate-900">{deleteTarget.investorName}</div>
              <div className="text-purple-900 font-mono text-[11px] font-bold mt-0.5">
                {deleteTarget.code} • {formatCurrency(deleteTarget.capitalAmount)}
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold text-xs mb-3">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Alasan Penghapusan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembatalan kontrak / renegosiasi"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">PIN Keamanan (6 Digit) *</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="******"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-center text-lg tracking-widest text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 !text-white font-bold rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  <span className="!text-white font-bold">Konfirmasi Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
