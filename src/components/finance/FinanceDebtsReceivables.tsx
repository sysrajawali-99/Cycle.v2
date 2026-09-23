import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  DollarSign,
  Download,
  Printer,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  FileText,
  Trash2,
  Edit3,
  Eye,
  Send,
  AlertCircle,
  HelpCircle,
  X,
  ExternalLink,
  Briefcase,
  Sparkles
} from 'lucide-react';
import {
  DebtRecord,
  ReceivableRecord,
  DebtType,
  DebtStatus,
  ReceivableType,
  ReceivableStatus,
  ChartOfAccount,
  PaymentMethod,
  FinanceTransaction,
  AuditTrailItem,
  InvestmentRecord
} from '../../types/finance';
import { Project, UserAccount, CompanyProfile, CompanyBankAccount } from '../../types';
import { financeService } from '../../services/financeService';
import { storageService } from '../../services/storageService';
import { formatCurrency, downloadCSV } from '../../utils/formatters';

interface FinanceDebtsReceivablesProps {
  debts: DebtRecord[];
  receivables: ReceivableRecord[];
  investments?: InvestmentRecord[];
  accounts: ChartOfAccount[];
  projects: Project[];
  currentUser?: UserAccount | null;
  companyProfile?: CompanyProfile;
  onAddDebt?: (debt: DebtRecord) => void;
  onUpdateDebt?: (debt: DebtRecord) => void;
  onDeleteDebt?: (id: string, reason: string, pin: string) => void;
  onAddReceivable?: (rec: ReceivableRecord) => void;
  onUpdateReceivable?: (rec: ReceivableRecord) => void;
  onDeleteReceivable?: (id: string, reason: string, pin: string) => void;
  onUpdateDebts?: (debts: DebtRecord[]) => void;
  onUpdateReceivables?: (receivables: ReceivableRecord[]) => void;
  onUpdateInvestments?: (investments: InvestmentRecord[]) => void;
  onAddTransaction?: (transaction: FinanceTransaction) => void;
  onLogAudit?: (audit: AuditTrailItem) => void;
}

type ActiveViewTab = 'DEBTS' | 'RECEIVABLES' | 'AGING_SCHEDULE';

export const FinanceDebtsReceivables: React.FC<FinanceDebtsReceivablesProps> = ({
  debts = [],
  receivables = [],
  investments = [],
  accounts = [],
  projects = [],
  currentUser,
  companyProfile,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onAddReceivable,
  onUpdateReceivable,
  onDeleteReceivable,
  onUpdateDebts,
  onUpdateReceivables,
  onUpdateInvestments,
  onAddTransaction,
  onLogAudit
}) => {
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('DEBTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Modal States
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtRecord | null>(null);

  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<ReceivableRecord | null>(null);
  const [isReceivePaymentModalOpen, setIsReceivePaymentModalOpen] = useState(false);
  const [selectedReceivableForPayment, setSelectedReceivableForPayment] = useState<ReceivableRecord | null>(null);

  // Security Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'DEBT' | 'RECEIVABLE'; id: string; code: string; title: string } | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form States - Debt
  const [debtFormData, setDebtFormData] = useState<Partial<DebtRecord>>({
    type: 'HUTANG_VENDOR',
    creditorName: '',
    contactPerson: '',
    phone: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    totalAmount: 0,
    projectId: 'ALL',
    accountCode: '2110',
    category: 'Pengadaan Chemical & Logistik',
    notes: ''
  });

  // Registered Company Bank Accounts from CompanySettings (Rekening Bank Operasional & Catatan Dokumen)
  const currentCompanyProfile = companyProfile || storageService.getCompanyProfile();
  const registeredBankAccounts = useMemo<CompanyBankAccount[]>(() => {
    const list: CompanyBankAccount[] = [];
    if (Array.isArray(currentCompanyProfile?.bankAccounts) && currentCompanyProfile.bankAccounts.length > 0) {
      currentCompanyProfile.bankAccounts.forEach((b) => {
        if (b.status !== 'Nonaktif') {
          list.push(b);
        }
      });
    }
    if (list.length === 0 && currentCompanyProfile?.bankName) {
      list.push({
        id: 'default-primary',
        bankName: currentCompanyProfile.bankName,
        accountNumber: currentCompanyProfile.bankAccountNo || '-',
        accountHolder: currentCompanyProfile.bankAccountHolder || currentCompanyProfile.name || 'Perusahaan',
        role: 'Rekening Operasional',
        isPrimary: true,
        status: 'Aktif'
      });
    }
    return list;
  }, [currentCompanyProfile]);

  // Form States - Pay Debt
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payAccountCode, setPayAccountCode] = useState<string>('1120');
  const [payMethod, setPayMethod] = useState<string>('');
  const [payIsManual, setPayIsManual] = useState<boolean>(false);
  const [payManualText, setPayManualText] = useState<string>('');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Form States - Receivable
  const [recFormData, setRecFormData] = useState<Partial<ReceivableRecord>>({
    type: 'PIUTANG_KONTRAK_JASA',
    customerName: '',
    contactPerson: '',
    phone: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    termOfPayment: 'Net 30',
    totalAmount: 0,
    projectId: 'proj-1',
    accountCode: '1140',
    notes: ''
  });

  // Form States - Receive Payment
  const [receiveAmount, setReceiveAmount] = useState<number>(0);
  const [receiveDate, setReceiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiveAccountCode, setReceiveAccountCode] = useState<string>('1120');
  const [receiveMethod, setReceiveMethod] = useState<string>('');
  const [receiveIsManual, setReceiveIsManual] = useState<boolean>(false);
  const [receiveManualText, setReceiveManualText] = useState<string>('');
  const [receiveRef, setReceiveRef] = useState<string>('');
  const [receiveNotes, setReceiveNotes] = useState<string>('');
  const [debtCategoryFilter, setDebtCategoryFilter] = useState<'ALL' | 'VENDOR' | 'INVESTOR'>('ALL');

  // Otomatis sinkronkan jadwal pembayaran bagi hasil bulanan dari masing-masing investor ke dalam data hutang
  const investorDebts = useMemo(() => {
    if (!investments || investments.length === 0) return [];
    const generated: DebtRecord[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    investments.forEach((inv) => {
      (inv.schedules || []).forEach((sch) => {
        const isPaid = sch.status === 'DI Realisasikan';
        const isOverdue = !isPaid && sch.dueDate < todayStr;
        const status: DebtStatus = isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'UNPAID';
        const payout = sch.totalPayout || sch.profitAmount || 0;

        generated.push({
          id: `debt-inv-${inv.id}-${sch.id || sch.monthIndex}`,
          code: `HUT-BGI-${inv.code}-M${String(sch.monthIndex).padStart(2, '0')}`,
          type: 'HUTANG_LAINNYA',
          creditorName: `${inv.investorName} (Investor)`,
          contactPerson: inv.investorContact || 'Mitra Investor',
          phone: inv.investorContact || '',
          invoiceNumber: `BGI/${inv.code}/M${sch.monthIndex}`,
          issueDate: inv.startDate || todayStr,
          dueDate: sch.dueDate,
          totalAmount: payout,
          paidAmount: isPaid ? payout : 0,
          remainingAmount: isPaid ? 0 : payout,
          status: status,
          projectId: inv.projectId || 'ALL',
          projectName: inv.projectName || 'Semua Site / HQ',
          accountCode: '2120',
          category: 'Bagi Hasil Investor',
          notes: `Bagi hasil ${sch.monthLabel} (${inv.profitSharingPercent}%/bln dari modal ${financeService.formatRupiah(inv.capitalAmount)}). Rek: ${inv.bankName} No. ${inv.bankAccountNumber} a/n ${inv.bankAccountHolder || inv.investorName}`,
          payments: isPaid
            ? [
                {
                  id: `pay-inv-${sch.id || sch.monthIndex}`,
                  date: sch.realizationDate || sch.dueDate,
                  amount: payout,
                  paymentMethod: `${inv.bankName} (${inv.bankAccountNumber})`,
                  accountCode: '1120',
                  referenceNumber: sch.transferProof || 'REALISASI-BAGI-HASIL',
                  notes: sch.notes || `Realisasi bagi hasil ${sch.monthLabel}`,
                  recordedBy: sch.updatedBy || 'Finance System'
                }
              ]
            : [],
          createdAt: inv.createdAt || todayStr,
          updatedAt: sch.updatedAt || inv.updatedAt
        });
      });
    });

    return generated;
  }, [investments]);

  // Gabungan seluruh hutang usaha: Vendor/Operasional + Bagi Hasil Investor
  const allDebts = useMemo(() => {
    return [...debts, ...investorDebts];
  }, [debts, investorDebts]);

  // Filtered Debts
  const filteredDebts = useMemo(() => {
    return allDebts.filter((d) => {
      if (projectFilter !== 'ALL' && d.projectId !== projectFilter && d.projectId !== 'ALL') return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (debtCategoryFilter === 'INVESTOR' && d.category !== 'Bagi Hasil Investor') return false;
      if (debtCategoryFilter === 'VENDOR' && d.category === 'Bagi Hasil Investor') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.code.toLowerCase().includes(q) ||
          d.creditorName.toLowerCase().includes(q) ||
          d.invoiceNumber.toLowerCase().includes(q) ||
          (d.category && d.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allDebts, projectFilter, statusFilter, debtCategoryFilter, searchQuery]);

  // Filtered Receivables
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      if (projectFilter !== 'ALL' && r.projectId !== projectFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.code.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          (r.projectName && r.projectName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [receivables, projectFilter, statusFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalDebt = allDebts.reduce((sum, d) => sum + d.totalAmount, 0);
    const paidDebt = allDebts.reduce((sum, d) => sum + d.paidAmount, 0);
    const remainingDebt = allDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const overdueDebt = allDebts.filter((d) => d.status === 'OVERDUE').reduce((sum, d) => sum + d.remainingAmount, 0);
    const vendorDebtRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const investorDebtRemaining = investorDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalRec = receivables.reduce((sum, r) => sum + r.totalAmount, 0);
    const paidRec = receivables.reduce((sum, r) => sum + r.paidAmount, 0);
    const remainingRec = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);
    const overdueRec = receivables.filter((r) => r.status === 'OVERDUE').reduce((sum, r) => sum + r.remainingAmount, 0);

    // Aging Matrix for Receivables
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date(todayStr).getTime();
    let rec0_30 = 0;
    let rec31_60 = 0;
    let rec61_90 = 0;
    let recOver90 = 0;

    receivables.forEach((r) => {
      if (r.remainingAmount <= 0) return;
      const dueTime = new Date(r.dueDate || todayStr).getTime();
      const diffDays = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        rec0_30 += r.remainingAmount; // Belum jatuh tempo / < 30 hari
      } else if (diffDays <= 30) {
        rec0_30 += r.remainingAmount;
      } else if (diffDays <= 60) {
        rec31_60 += r.remainingAmount;
      } else if (diffDays <= 90) {
        rec61_90 += r.remainingAmount;
      } else {
        recOver90 += r.remainingAmount;
      }
    });

    return {
      totalDebt,
      paidDebt,
      remainingDebt,
      overdueDebt,
      totalRec,
      paidRec,
      remainingRec,
      overdueRec,
      rec0_30,
      rec31_60,
      rec61_90,
      recOver90
    };
  }, [debts, receivables]);

  // Reminders List (Due within 7 days or Overdue)
  const reminders = useMemo(() => {
    const list: Array<{
      type: 'DEBT' | 'RECEIVABLE';
      title: string;
      targetName: string;
      dueDate: string;
      amount: number;
      isOverdue: boolean;
      daysRemaining: number;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    debts.forEach((d) => {
      if (d.remainingAmount > 0) {
        const due = new Date(d.dueDate || todayStr);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          list.push({
            type: 'DEBT',
            title: `Kewajiban Hutang: ${d.category || d.invoiceNumber}`,
            targetName: d.creditorName,
            dueDate: d.dueDate,
            amount: d.remainingAmount,
            isOverdue: diffDays < 0,
            daysRemaining: diffDays
          });
        }
      }
    });

    receivables.forEach((r) => {
      if (r.remainingAmount > 0) {
        const due = new Date(r.dueDate || todayStr);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          list.push({
            type: 'RECEIVABLE',
            title: `Tagihan Invoice: ${r.invoiceNumber}`,
            targetName: r.customerName,
            dueDate: r.dueDate,
            amount: r.remainingAmount,
            isOverdue: diffDays < 0,
            daysRemaining: diffDays
          });
        }
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [debts, receivables]);

  // Handlers for Debt Modal
  const handleOpenNewDebt = () => {
    setEditingDebt(null);
    setDebtFormData({
      type: 'HUTANG_VENDOR',
      creditorName: '',
      contactPerson: '',
      phone: '',
      invoiceNumber: `INV-VND-${Date.now().toString().slice(-4)}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      totalAmount: 0,
      projectId: 'ALL',
      accountCode: '2110',
      category: 'Pengadaan Chemical & Logistik',
      notes: ''
    });
    setIsDebtModalOpen(true);
  };

  const handleOpenEditDebt = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setDebtFormData({ ...debt });
    setIsDebtModalOpen(true);
  };

  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(debtFormData.totalAmount);
    if (!debtFormData.creditorName?.trim() || !amount || amount <= 0) {
      alert('Mohon lengkapi Nama Vendor / Kreditor dan Nominal Hutang yang valid.');
      return;
    }

    const prj = projects.find((p) => p.id === debtFormData.projectId);
    const projectName = debtFormData.projectId === 'ALL' ? 'Konsolidasi Seluruh Site' : prj?.name || 'Proyek';
    const todayStr = new Date().toISOString().split('T')[0];

    if (editingDebt) {
      const remaining = amount - (editingDebt.paidAmount || 0);
      const isDuePast = (debtFormData.dueDate || '') < todayStr;
      const status: DebtStatus =
        remaining <= 0
          ? 'PAID'
          : (editingDebt.paidAmount || 0) > 0
          ? 'PARTIAL'
          : isDuePast
          ? 'OVERDUE'
          : 'UNPAID';

      const updated: DebtRecord = {
        ...editingDebt,
        ...(debtFormData as DebtRecord),
        totalAmount: amount,
        projectName,
        remainingAmount: Math.max(0, remaining),
        status,
        updatedAt: new Date().toISOString()
      };

      if (onUpdateDebt) {
        onUpdateDebt(updated);
      } else if (onUpdateDebts) {
        onUpdateDebts(debts.map((d) => (d.id === updated.id ? updated : d)));
      }

      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'UPDATE',
        module: 'Hutang Usaha',
        recordId: updated.id,
        recordCode: updated.code,
        description: `Memperbarui data hutang vendor ${updated.creditorName} (${updated.code})`,
        amount: updated.totalAmount
      });

      showToast(`Data hutang ${updated.creditorName} (${updated.code}) berhasil diperbarui!`, 'success');
    } else {
      const newCode = `HUT-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(debts.length + 1).padStart(3, '0')}`;
      const isDuePast = (debtFormData.dueDate || '') < todayStr;
      const newDebt: DebtRecord = {
        id: `debt-${Date.now()}`,
        code: newCode,
        type: debtFormData.type || 'HUTANG_VENDOR',
        creditorName: debtFormData.creditorName.trim(),
        contactPerson: debtFormData.contactPerson || '',
        phone: debtFormData.phone || '',
        invoiceNumber: debtFormData.invoiceNumber || `INV-${Date.now()}`,
        issueDate: debtFormData.issueDate || todayStr,
        dueDate: debtFormData.dueDate || todayStr,
        totalAmount: amount,
        paidAmount: 0,
        remainingAmount: amount,
        status: isDuePast ? 'OVERDUE' : 'UNPAID',
        projectId: debtFormData.projectId || 'ALL',
        projectName,
        accountCode: debtFormData.accountCode || '2110',
        category: debtFormData.category || 'Operasional',
        notes: debtFormData.notes || '',
        payments: [],
        createdAt: new Date().toLocaleString('id-ID')
      };

      if (onAddDebt) {
        onAddDebt(newDebt);
      } else if (onUpdateDebts) {
        onUpdateDebts([newDebt, ...debts]);
      }

      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'CREATE',
        module: 'Hutang Usaha',
        recordId: newDebt.id,
        recordCode: newDebt.code,
        description: `Mencatat kewajiban hutang baru ke ${newDebt.creditorName} (${formatCurrency(newDebt.totalAmount)})`,
        amount: newDebt.totalAmount
      });

      showToast(`Hutang baru ke ${newDebt.creditorName} senilai ${formatCurrency(newDebt.totalAmount)} berhasil dicatat!`, 'success');
    }

    setIsDebtModalOpen(false);
  };

  // Pay Debt Handler
  const handleOpenPayDebt = (debt: DebtRecord) => {
    setSelectedDebtForPayment(debt);
    setPayAmount(debt.remainingAmount);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef(`TRF-PAY-${Date.now().toString().slice(-5)}`);
    setPayNotes(`Pembayaran kewajiban hutang ${debt.creditorName} No. ${debt.invoiceNumber}`);
    const defaultBank = registeredBankAccounts[0]
      ? `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`
      : 'Kas Operasional Lapangan';
    setPayMethod(defaultBank);
    setPayIsManual(false);
    setPayManualText('');
    setIsPayDebtModalOpen(true);
  };

  const handleSavePayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment || payAmount <= 0) {
      alert('Nominal pembayaran harus lebih dari 0.');
      return;
    }

    if (payAmount > selectedDebtForPayment.remainingAmount) {
      alert(`Nominal bayar tidak boleh melebihi sisa hutang (${formatCurrency(selectedDebtForPayment.remainingAmount)}).`);
      return;
    }

    let effectivePayMethod = payMethod;
    if (payIsManual) {
      if (!payManualText.trim()) {
        alert('Mohon tuliskan nama metode pembayaran manual.');
        return;
      }
      effectivePayMethod = payManualText.trim();
    } else if (!effectivePayMethod && registeredBankAccounts[0]) {
      effectivePayMethod = `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`;
    }

    const newPaid = selectedDebtForPayment.paidAmount + payAmount;
    const newRemaining = selectedDebtForPayment.totalAmount - newPaid;
    const newStatus: DebtStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

    const newPayment = {
      id: `dp-${Date.now()}`,
      date: payDate,
      amount: payAmount,
      paymentMethod: effectivePayMethod,
      accountCode: payAccountCode,
      referenceNumber: payRef,
      notes: payNotes,
      recordedBy: currentUser?.name || 'Finance Lead'
    };

    const updated: DebtRecord = {
      ...selectedDebtForPayment,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: [newPayment, ...selectedDebtForPayment.payments],
      updatedAt: new Date().toLocaleString('id-ID')
    };

    if (selectedDebtForPayment.id.startsWith('debt-inv-')) {
      // Pembayaran Hutang Bagi Hasil Investor -> Sinkronkan ke modul Investasi
      const parts = selectedDebtForPayment.id.replace('debt-inv-', '').split('-');
      const invId = parts[0];
      const schIdOrIndex = parts.slice(1).join('-');

      if (investments && onUpdateInvestments) {
        const updatedInvestments = investments.map((inv) => {
          if (inv.id === invId || inv.code === invId) {
            const updatedSchedules = (inv.schedules || []).map((sch) => {
              if (String(sch.id) === schIdOrIndex || String(sch.monthIndex) === schIdOrIndex) {
                return {
                  ...sch,
                  status: 'DI Realisasikan' as const,
                  realizationDate: payDate,
                  transferProof: payRef || 'TRANSFER-DIVIDEND',
                  notes: payNotes,
                  updatedAt: new Date().toLocaleString('id-ID'),
                  updatedBy: currentUser?.name || 'Finance Lead'
                };
              }
              return sch;
            });
            return {
              ...inv,
              schedules: updatedSchedules,
              updatedAt: new Date().toLocaleString('id-ID')
            };
          }
          return inv;
        });
        onUpdateInvestments(updatedInvestments);
      }
      showToast(`Pembayaran Bagi Hasil ${selectedDebtForPayment.creditorName} berhasil direalisasikan dan disinkronkan ke Modul Investasi & Buku Kas!`, 'success');
    } else {
      if (onUpdateDebt) {
        onUpdateDebt(updated);
      } else if (onUpdateDebts) {
        onUpdateDebts(debts.map((d) => (d.id === updated.id ? updated : d)));
      }
      showToast(`Pembayaran kewajiban hutang ke ${selectedDebtForPayment.creditorName} berhasil dicatat & masuk kas keluar!`, 'success');
    }

    // Automatically sync with Cash Journal (BKK)
    if (onAddTransaction) {
      const nowStr = new Date().toISOString().split('T')[0];
      const isInvestor = selectedDebtForPayment.id.startsWith('debt-inv-');
      const contraAcc = accounts.find((a) => a.code === selectedDebtForPayment.accountCode) || {
        code: selectedDebtForPayment.accountCode || (isInvestor ? '2120' : '2110'),
        name: isInvestor ? 'Beban Bagi Hasil Investor' : 'Utang Usaha / Supplier'
      };
      const primaryAcc = accounts.find((a) => a.code === payAccountCode) || {
        code: payAccountCode || '1120',
        name: effectivePayMethod
      };

      onAddTransaction({
        id: `trx-bkk-debt-${Date.now()}`,
        code: `BKK-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
        date: payDate || nowStr,
        type: 'OUT',
        title: isInvestor
          ? `Pembayaran Bagi Hasil Investor: ${selectedDebtForPayment.creditorName}`
          : `Pembayaran Hutang Vendor: ${selectedDebtForPayment.creditorName}`,
        description: isInvestor
          ? `Realisasi dividen/bagi hasil investasi ${selectedDebtForPayment.notes} via ${effectivePayMethod}. Ref: ${payRef || '-'}`
          : `Pelunasan/cicilan faktur ${selectedDebtForPayment.invoiceNumber} (${selectedDebtForPayment.category || 'Operasional'}) via ${effectivePayMethod}. Ref: ${payRef || '-'}`,
        amount: payAmount,
        paymentMethod: effectivePayMethod,
        primaryAccountCode: payAccountCode || '1120',
        contraAccountCode: selectedDebtForPayment.accountCode || (isInvestor ? '2120' : '2110'),
        journalEntries: [
          {
            id: `je-d-${Date.now()}`,
            accountCode: selectedDebtForPayment.accountCode || (isInvestor ? '2120' : '2110'),
            accountName: contraAcc.name,
            debit: payAmount,
            credit: 0,
            notes: isInvestor
              ? `Debit Beban/Kewajiban Bagi Hasil: ${selectedDebtForPayment.creditorName}`
              : `Debit Utang: ${selectedDebtForPayment.creditorName}`
          },
          {
            id: `je-c-${Date.now()}`,
            accountCode: payAccountCode || '1120',
            accountName: primaryAcc.name,
            debit: 0,
            credit: payAmount,
            notes: `Kredit Kas/Bank: ${payMethod}`
          }
        ],
        projectId: selectedDebtForPayment.projectId || 'ALL',
        projectName: selectedDebtForPayment.projectName,
        division: 'HQ Management & Operasional',
        currency: 'IDR',
        exchangeRate: 1,
        referenceNumber: payRef || selectedDebtForPayment.invoiceNumber,
        payeeOrPayer: selectedDebtForPayment.creditorName,
        isReconciled: false,
        isAdjusting: false,
        createdAt: new Date().toLocaleString('id-ID'),
        createdBy: currentUser?.name || 'Finance Lead'
      });
    }

    onLogAudit?.({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName: currentUser?.name || 'Finance Lead',
      userRole: currentUser?.role || 'Finance',
      actionType: 'UPDATE',
      module: 'Hutang Usaha',
      recordId: updated.id,
      recordCode: updated.code,
      description: `Melakukan pembayaran cicilan/pelunasan hutang ${updated.creditorName} sebesar ${formatCurrency(payAmount)} via ${payMethod}`,
      amount: payAmount
    });

    showToast(`Pembayaran hutang ke ${updated.creditorName} sebesar ${formatCurrency(payAmount)} berhasil dicatat & dibukukan!`, 'success');
    setIsPayDebtModalOpen(false);
  };

  // Receivable Handlers
  const handleOpenNewReceivable = () => {
    setEditingReceivable(null);
    setRecFormData({
      type: 'PIUTANG_KONTRAK_JASA',
      customerName: '',
      contactPerson: '',
      phone: '',
      invoiceNumber: `INV/RC/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(receivables.length + 1).padStart(3, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      termOfPayment: 'Net 30',
      totalAmount: 0,
      projectId: projects[0]?.id || 'proj-1',
      accountCode: '1140',
      notes: ''
    });
    setIsReceivableModalOpen(true);
  };

  const handleOpenEditReceivable = (rec: ReceivableRecord) => {
    setEditingReceivable(rec);
    setRecFormData({ ...rec });
    setIsReceivableModalOpen(true);
  };

  const handleSaveReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(recFormData.totalAmount);
    if (!recFormData.customerName?.trim() || !amount || amount <= 0) {
      alert('Mohon lengkapi Nama Customer / Klien dan Nilai Invoice Tagihan yang valid.');
      return;
    }

    const prj = projects.find((p) => p.id === recFormData.projectId);
    const projectName = prj?.name || 'Proyek';
    const todayStr = new Date().toISOString().split('T')[0];

    if (editingReceivable) {
      const remaining = amount - (editingReceivable.paidAmount || 0);
      const isDuePast = (recFormData.dueDate || '') < todayStr;
      const status: ReceivableStatus =
        remaining <= 0
          ? 'PAID'
          : (editingReceivable.paidAmount || 0) > 0
          ? 'PARTIAL'
          : isDuePast
          ? 'OVERDUE'
          : 'UNPAID';

      const updated: ReceivableRecord = {
        ...editingReceivable,
        ...(recFormData as ReceivableRecord),
        totalAmount: amount,
        projectName,
        remainingAmount: Math.max(0, remaining),
        status,
        updatedAt: new Date().toISOString()
      };

      if (onUpdateReceivable) {
        onUpdateReceivable(updated);
      } else if (onUpdateReceivables) {
        onUpdateReceivables(receivables.map((r) => (r.id === updated.id ? updated : r)));
      }

      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'UPDATE',
        module: 'Piutang Usaha',
        recordId: updated.id,
        recordCode: updated.code,
        description: `Memperbarui tagihan piutang invoice ${updated.invoiceNumber} (${updated.customerName})`,
        amount: updated.totalAmount
      });

      showToast(`Piutang tagihan ${updated.invoiceNumber} (${updated.customerName}) berhasil diperbarui!`, 'success');
    } else {
      const newCode = `PIU-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(receivables.length + 1).padStart(3, '0')}`;
      const isDuePast = (recFormData.dueDate || '') < todayStr;
      const newRec: ReceivableRecord = {
        id: `rec-${Date.now()}`,
        code: newCode,
        type: recFormData.type || 'PIUTANG_KONTRAK_JASA',
        customerName: recFormData.customerName.trim(),
        contactPerson: recFormData.contactPerson || '',
        phone: recFormData.phone || '',
        invoiceNumber: recFormData.invoiceNumber || `INV-${Date.now()}`,
        issueDate: recFormData.issueDate || todayStr,
        dueDate: recFormData.dueDate || todayStr,
        termOfPayment: recFormData.termOfPayment || 'Net 30',
        totalAmount: amount,
        paidAmount: 0,
        remainingAmount: amount,
        status: isDuePast ? 'OVERDUE' : 'UNPAID',
        projectId: recFormData.projectId || projects[0]?.id || 'proj-1',
        projectName,
        accountCode: recFormData.accountCode || '1140',
        notes: recFormData.notes || '',
        payments: [],
        createdAt: new Date().toLocaleString('id-ID')
      };

      if (onAddReceivable) {
        onAddReceivable(newRec);
      } else if (onUpdateReceivables) {
        onUpdateReceivables([newRec, ...receivables]);
      }

      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'CREATE',
        module: 'Piutang Usaha',
        recordId: newRec.id,
        recordCode: newRec.code,
        description: `Menerbitkan tagihan piutang invoice ${newRec.invoiceNumber} ke ${newRec.customerName} (${formatCurrency(newRec.totalAmount)})`,
        amount: newRec.totalAmount
      });

      showToast(`Piutang invoice ${newRec.invoiceNumber} ke ${newRec.customerName} sebesar ${formatCurrency(newRec.totalAmount)} berhasil diterbitkan!`, 'success');
    }

    setIsReceivableModalOpen(false);
  };

  // Receive Payment Handler
  const handleOpenReceivePayment = (rec: ReceivableRecord) => {
    setSelectedReceivableForPayment(rec);
    setReceiveAmount(rec.remainingAmount);
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setReceiveRef(`TRF-RCV-${Date.now().toString().slice(-5)}`);
    setReceiveNotes(`Penerimaan pelunasan invoice ${rec.invoiceNumber} dari ${rec.customerName}`);
    const defaultBank = registeredBankAccounts[0]
      ? `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`
      : 'Kas Operasional Lapangan';
    setReceiveMethod(defaultBank);
    setReceiveIsManual(false);
    setReceiveManualText('');
    setIsReceivePaymentModalOpen(true);
  };

  const handleSaveReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivableForPayment || receiveAmount <= 0) {
      alert('Nominal penerimaan harus lebih dari 0.');
      return;
    }

    if (receiveAmount > selectedReceivableForPayment.remainingAmount) {
      alert(`Nominal pembayaran tidak boleh melebihi sisa piutang (${formatCurrency(selectedReceivableForPayment.remainingAmount)}).`);
      return;
    }

    let effectiveReceiveMethod = receiveMethod;
    if (receiveIsManual) {
      if (!receiveManualText.trim()) {
        alert('Mohon tuliskan nama metode pembayaran manual.');
        return;
      }
      effectiveReceiveMethod = receiveManualText.trim();
    } else if (!effectiveReceiveMethod && registeredBankAccounts[0]) {
      effectiveReceiveMethod = `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`;
    }

    const newPaid = selectedReceivableForPayment.paidAmount + receiveAmount;
    const newRemaining = selectedReceivableForPayment.totalAmount - newPaid;
    const newStatus: ReceivableStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

    const newPayment = {
      id: `rp-${Date.now()}`,
      date: receiveDate,
      amount: receiveAmount,
      paymentMethod: effectiveReceiveMethod,
      accountCode: receiveAccountCode,
      referenceNumber: receiveRef,
      notes: receiveNotes,
      recordedBy: currentUser?.name || 'Finance Lead'
    };

    const updated: ReceivableRecord = {
      ...selectedReceivableForPayment,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: [newPayment, ...selectedReceivableForPayment.payments],
      updatedAt: new Date().toLocaleString('id-ID')
    };

    if (onUpdateReceivable) {
      onUpdateReceivable(updated);
    } else if (onUpdateReceivables) {
      onUpdateReceivables(receivables.map((r) => (r.id === updated.id ? updated : r)));
    }

    // Automatically sync with Cash Journal (BKM)
    if (onAddTransaction) {
      const nowStr = new Date().toISOString().split('T')[0];
      const contraAcc = accounts.find((a) => a.code === selectedReceivableForPayment.accountCode) || {
        code: selectedReceivableForPayment.accountCode || '1140',
        name: 'Piutang Usaha / Klien'
      };
      const primaryAcc = accounts.find((a) => a.code === receiveAccountCode) || {
        code: receiveAccountCode || '1120',
        name: effectiveReceiveMethod
      };

      onAddTransaction({
        id: `trx-bkm-rec-${Date.now()}`,
        code: `BKM-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
        date: receiveDate || nowStr,
        type: 'IN',
        title: `Penerimaan Pembayaran Piutang: ${selectedReceivableForPayment.customerName}`,
        description: `Penerimaan pelunasan/termin invoice ${selectedReceivableForPayment.invoiceNumber} (${selectedReceivableForPayment.projectName || 'Proyek'}) via ${effectiveReceiveMethod}. Ref: ${receiveRef || '-'}`,
        amount: receiveAmount,
        paymentMethod: effectiveReceiveMethod,
        primaryAccountCode: receiveAccountCode || '1120',
        contraAccountCode: selectedReceivableForPayment.accountCode || '1140',
        journalEntries: [
          {
            id: `je-d-${Date.now()}`,
            accountCode: receiveAccountCode || '1120',
            accountName: primaryAcc.name,
            debit: receiveAmount,
            credit: 0,
            notes: `Debit Kas/Bank: ${effectiveReceiveMethod}`
          },
          {
            id: `je-c-${Date.now()}`,
            accountCode: selectedReceivableForPayment.accountCode || '1140',
            accountName: contraAcc.name,
            debit: 0,
            credit: receiveAmount,
            notes: `Kredit Piutang: ${selectedReceivableForPayment.customerName}`
          }
        ],
        projectId: selectedReceivableForPayment.projectId || 'ALL',
        projectName: selectedReceivableForPayment.projectName,
        division: 'Cleaning Service',
        currency: 'IDR',
        exchangeRate: 1,
        referenceNumber: receiveRef || selectedReceivableForPayment.invoiceNumber,
        payeeOrPayer: selectedReceivableForPayment.customerName,
        isReconciled: false,
        isAdjusting: false,
        createdAt: new Date().toLocaleString('id-ID'),
        createdBy: currentUser?.name || 'Finance Lead'
      });
    }

    onLogAudit?.({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName: currentUser?.name || 'Finance Lead',
      userRole: currentUser?.role || 'Finance',
      actionType: 'UPDATE',
      module: 'Piutang Usaha',
      recordId: updated.id,
      recordCode: updated.code,
      description: `Mencatat penerimaan pembayaran piutang invoice ${updated.invoiceNumber} dari ${updated.customerName} sebesar ${formatCurrency(receiveAmount)} ke ${receiveMethod}`,
      amount: receiveAmount
    });

    showToast(`Penerimaan pembayaran dari ${updated.customerName} sebesar ${formatCurrency(receiveAmount)} berhasil dicatat & masuk kas!`, 'success');
    setIsReceivePaymentModalOpen(false);
  };

  // Secure Delete Confirm
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

    if (deleteTarget.type === 'DEBT') {
      if (deleteTarget.id.startsWith('debt-inv-')) {
        setDeleteError('Hutang bagi hasil investor terhubung otomatis dengan modul Investasi. Untuk membatalkan atau mengubah jadwal, silakan kelola pada menu Investasi & Bagi Hasil.');
        return;
      }
      if (onDeleteDebt) {
        onDeleteDebt(deleteTarget.id, deleteReason, deletePin);
      } else if (onUpdateDebts) {
        onUpdateDebts(debts.filter((d) => d.id !== deleteTarget.id));
      }
      showToast(`Data hutang ${deleteTarget.title} (${deleteTarget.code}) berhasil dihapus.`, 'info');
    } else {
      if (onDeleteReceivable) {
        onDeleteReceivable(deleteTarget.id, deleteReason, deletePin);
      } else if (onUpdateReceivables) {
        onUpdateReceivables(receivables.filter((r) => r.id !== deleteTarget.id));
      }
      showToast(`Data piutang invoice ${deleteTarget.title} (${deleteTarget.code}) berhasil dihapus.`, 'info');
    }

    setDeleteTarget(null);
    setDeletePin('');
    setDeleteReason('');
    setDeleteError(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'DEBTS') {
      const exportData = filteredDebts.map((d) => ({
        'Kode Hutang': d.code,
        'Nama Vendor / Kreditor': d.creditorName,
        'No Faktur': d.invoiceNumber,
        'Kategori': d.category,
        'Alokasi Proyek': d.projectName || 'Semua Site',
        'Tanggal Tagihan': d.issueDate,
        'Jatuh Tempo': d.dueDate,
        'Total Hutang (Rp)': d.totalAmount,
        'Terbayar (Rp)': d.paidAmount,
        'Sisa Hutang (Rp)': d.remainingAmount,
        'Status': d.status,
        'Catatan': d.notes || '-'
      }));
      downloadCSV(exportData, `Rajawali_Hutang_Usaha_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const exportData = filteredReceivables.map((r) => ({
        'Kode Piutang': r.code,
        'Nama Klien / Customer': r.customerName,
        'No Invoice': r.invoiceNumber,
        'Proyek / Site': r.projectName || 'Proyek',
        'Termin': r.termOfPayment,
        'Tanggal Terbit': r.issueDate,
        'Jatuh Tempo': r.dueDate,
        'Total Invoice (Rp)': r.totalAmount,
        'Terbayar (Rp)': r.paidAmount,
        'Sisa Piutang (Rp)': r.remainingAmount,
        'Status': r.status,
        'Catatan': r.notes || '-'
      }));
      downloadCSV(exportData, `Rajawali_Piutang_Usaha_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
              : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <HelpCircle className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Accounts Payable & Receivable
            </span>
            <span className="text-xs text-slate-400">PSAK & Standar Akuntansi Outsourcing</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-400" />
            Pencatatan Hutang & Piutang
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manajemen kewajiban vendor, tagihan termin invoice klien gedung, jadwal jatuh tempo & umur piutang (*aging matrix*).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Ekspor CSV</span>
          </button>

          {activeTab === 'DEBTS' ? (
            <button
              onClick={handleOpenNewDebt}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Hutang Baru</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewReceivable}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Piutang Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Hutang */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Sisa Hutang Usaha (AP)</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-400 mt-1">
            {formatCurrency(stats.remainingDebt)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Jatuh Tempo / Overdue:</span>
            <span className="font-bold text-rose-300">{formatCurrency(stats.overdueDebt)}</span>
          </div>
        </div>

        {/* Total Terbayar Hutang */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Hutang Telah Dilunasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-200 mt-1">
            {formatCurrency(stats.paidDebt)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Total Komitmen Awal:</span>
            <span className="font-medium text-slate-300">{formatCurrency(stats.totalDebt)}</span>
          </div>
        </div>

        {/* Sisa Piutang Klien */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Sisa Piutang Klien (AR)</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-cyan-400 mt-1">
            {formatCurrency(stats.remainingRec)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Tertagih / Masuk Kas:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(stats.paidRec)}</span>
          </div>
        </div>

        {/* Piutang Overdue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Piutang Menunggak (&gt;30 Hari)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-400 mt-1">
            {formatCurrency(stats.overdueRec)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Kolektibilitas Lancar (0-30):</span>
            <span className="font-bold text-cyan-300">{formatCurrency(stats.rec0_30)}</span>
          </div>
        </div>
      </div>

      {/* Reminder Notification Banner */}
      {reminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/30 border border-amber-500/30 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                <AlertCircle className="w-4 h-4" />
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-amber-300">
                Notifikasi Pengingat Jatuh Tempo ({reminders.length} Transaksi Perlu Perhatian)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Prioritas Harian</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
            {reminders.slice(0, 6).map((rem, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  rem.isOverdue
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        rem.type === 'DEBT' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {rem.type === 'DEBT' ? 'HUTANG' : 'PIUTANG'}
                    </span>
                    <span className="font-semibold truncate">{rem.targetName}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{rem.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{formatCurrency(rem.amount)}</div>
                  <div className={`text-[10px] font-semibold ${rem.isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                    {rem.isOverdue ? `Telat ${Math.abs(rem.daysRemaining)} hari` : `H-${rem.daysRemaining} hari`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setActiveTab('DEBTS');
              setStatusFilter('ALL');
            }}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'DEBTS'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Pencatatan Hutang (AP)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 text-white">
              {debts.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('RECEIVABLES');
              setStatusFilter('ALL');
            }}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'RECEIVABLES'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Pencatatan Piutang (AR)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 text-white">
              {receivables.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('AGING_SCHEDULE')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'AGING_SCHEDULE'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Analisa Umur Piutang (Aging)</span>
          </button>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari transaksi / vendor / invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {activeTab === 'DEBTS' && (
            <select
              value={debtCategoryFilter}
              onChange={(e) => setDebtCategoryFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Jenis Hutang ({allDebts.length})</option>
              <option value="VENDOR">Hutang Vendor & Operasional ({debts.length})</option>
              <option value="INVESTOR">Bagi Hasil Mitra Investor ({investorDebts.length})</option>
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNPAID">Belum Bayar</option>
            <option value="PARTIAL">Cicilan / Sebagian</option>
            <option value="PAID">Lunas</option>
            <option value="OVERDUE">Jatuh Tempo (Overdue)</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Semua Lokasi / HQ</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SINKRONISASI BAGI HASIL INVESTOR BANNER */}
      {activeTab === 'DEBTS' && investorDebts.length > 0 && (
        <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              <Briefcase className="w-4 h-4 text-purple-400" />
            </span>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>Sinkronisasi Otomatis Bagi Hasil Mitra Investor</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REALTIME
                </span>
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                Terhubung langsung dengan {investments.length} mitra investor. Sebanyak <strong>{investorDebts.length} jadwal bagi hasil bulanan</strong> otomatis tercatat sebagai kewajiban hutang dengan sisa <strong>{formatCurrency(stats.investorDebtRemaining)}</strong>.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {investorDebts.filter((d) => d.status !== 'PAID').length} Jadwal Tertunda
            </span>
          </div>
        </div>
      )}

      {/* VIEW 1: TABEL HUTANG (ACCOUNTS PAYABLE) */}
      {activeTab === 'DEBTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-3">Kode / No Faktur</th>
                  <th className="py-3 px-3">Kreditor / Vendor</th>
                  <th className="py-3 px-3">Kategori & Alokasi</th>
                  <th className="py-3 px-3">Tgl / Jatuh Tempo</th>
                  <th className="py-3 px-3 text-right">Total Hutang</th>
                  <th className="py-3 px-3 text-right">Terbayar</th>
                  <th className="py-3 px-3 text-right">Sisa Hutang</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredDebts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Tidak ada data hutang usaha yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredDebts.map((debt) => (
                    <tr key={debt.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-rose-300">
                        <div>{debt.code}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{debt.invoiceNumber}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{debt.creditorName}</span>
                          {debt.id.startsWith('debt-inv-') && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-950 border border-purple-300 flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5 text-purple-950" /> Investor
                            </span>
                          )}
                        </div>
                        {debt.contactPerson && (
                          <div className="text-[10px] text-slate-400">
                            {debt.contactPerson} {debt.phone && `(${debt.phone})`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-300">{debt.category}</span>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-amber-400" />
                          <span>{debt.projectName || 'Semua Site'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-300">{debt.issueDate}</div>
                        <div
                          className={`text-[10px] font-bold ${
                            debt.status === 'OVERDUE' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          Due: {debt.dueDate}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-200">
                        {formatCurrency(debt.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-medium">
                        {formatCurrency(debt.paidAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400">
                        {formatCurrency(debt.remainingAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            debt.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : debt.status === 'PARTIAL'
                              ? 'bg-blue-100 text-blue-950 border border-blue-300'
                              : debt.status === 'OVERDUE'
                              ? 'bg-rose-100 text-rose-950 border border-rose-300 animate-pulse'
                              : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}
                        >
                          {debt.status === 'PAID'
                            ? 'LUNAS'
                            : debt.status === 'PARTIAL'
                            ? 'CICILAN'
                            : debt.status === 'OVERDUE'
                            ? 'OVERDUE'
                            : 'BELUM BAYAR'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {debt.remainingAmount > 0 && (
                            <button
                              onClick={() => handleOpenPayDebt(debt)}
                              className={`px-2 py-1 ${
                                debt.id.startsWith('debt-inv-')
                                  ? 'bg-purple-600/90 hover:bg-purple-600'
                                  : 'bg-rose-600/80 hover:bg-rose-600'
                              } text-white rounded text-[11px] font-bold transition-colors cursor-pointer`}
                              title={debt.id.startsWith('debt-inv-') ? 'Realisasi Bagi Hasil' : 'Bayar Cicilan / Lunas'}
                            >
                              {debt.id.startsWith('debt-inv-') ? 'Bayar Bagi Hasil' : 'Bayar'}
                            </button>
                          )}
                          {!debt.id.startsWith('debt-inv-') && (
                            <>
                              <button
                                onClick={() => handleOpenEditDebt(debt)}
                                className="p-1 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                                title="Edit Data Hutang"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'DEBT',
                                    id: debt.id,
                                    code: debt.code,
                                    title: debt.creditorName
                                  })
                                }
                                className="p-1 hover:bg-rose-950 text-rose-400 rounded cursor-pointer"
                                title="Hapus Data (Wajib PIN)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: TABEL PIUTANG (ACCOUNTS RECEIVABLE) */}
      {activeTab === 'RECEIVABLES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-3">Kode / No Invoice</th>
                  <th className="py-3 px-3">Customer / Klien</th>
                  <th className="py-3 px-3">Site Proyek & Termin</th>
                  <th className="py-3 px-3">Tgl / Jatuh Tempo</th>
                  <th className="py-3 px-3 text-right">Nilai Tagihan</th>
                  <th className="py-3 px-3 text-right">Tertagih</th>
                  <th className="py-3 px-3 text-right">Sisa Piutang</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Tidak ada data piutang usaha yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredReceivables.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                        <div>{rec.code}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{rec.invoiceNumber}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{rec.customerName}</div>
                        {rec.contactPerson && (
                          <div className="text-[10px] text-slate-400">
                            {rec.contactPerson} {rec.phone && `(${rec.phone})`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-medium text-slate-300">
                          <Building2 className="w-3 h-3 text-amber-400" />
                          <span>{rec.projectName || 'Proyek'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Termin: {rec.termOfPayment}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-300">{rec.issueDate}</div>
                        <div
                          className={`text-[10px] font-bold ${
                            rec.status === 'OVERDUE' ? 'text-rose-400' : 'text-cyan-400'
                          }`}
                        >
                          Due: {rec.dueDate}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-200">
                        {formatCurrency(rec.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-medium">
                        {formatCurrency(rec.paidAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-cyan-400">
                        {formatCurrency(rec.remainingAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            rec.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : rec.status === 'PARTIAL'
                              ? 'bg-blue-100 text-blue-950 border border-blue-300'
                              : rec.status === 'OVERDUE'
                              ? 'bg-rose-100 text-rose-950 border border-rose-300 animate-pulse'
                              : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}
                        >
                          {rec.status === 'PAID'
                            ? 'LUNAS'
                            : rec.status === 'PARTIAL'
                            ? 'SEBAGIAN'
                            : rec.status === 'OVERDUE'
                            ? 'OVERDUE'
                            : 'BELUM BAYAR'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {rec.remainingAmount > 0 && (
                            <button
                              onClick={() => handleOpenReceivePayment(rec)}
                              className="px-2 py-1 bg-cyan-600/80 hover:bg-cyan-600 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                              title="Catat Pembayaran Masuk"
                            >
                              Terima
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditReceivable(rec)}
                            className="p-1 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                            title="Edit Data Piutang"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: 'RECEIVABLE',
                                id: rec.id,
                                code: rec.code,
                                title: rec.customerName
                              })
                            }
                            className="p-1 hover:bg-rose-950 text-rose-400 rounded cursor-pointer"
                            title="Hapus Data (Wajib PIN)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: AGING SCHEDULE (UMUR PIUTANG & HUTANG) */}
      {activeTab === 'AGING_SCHEDULE' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold">0 - 30 Hari (Lancar)</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.rec0_30)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Kolektibilitas normal & belum jatuh tempo</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold">31 - 60 Hari (Perhatian)</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{formatCurrency(stats.rec31_60)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Perlu follow up tagihan ke Finance klien</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold">61 - 90 Hari (Kritis)</div>
              <div className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(stats.rec61_90)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Eskalasi ke Project Manager & Direksi</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold">&gt; 90 Hari (Macet / NPL)</div>
              <div className="text-xl font-bold text-rose-400 mt-1">{formatCurrency(stats.recOver90)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Pertimbangan penyisihan piutang tak tertagih</div>
            </div>
          </div>

          {/* Aging Matrix Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Matriks Umur Piutang per Klien Gedung
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Klien Gedung</th>
                    <th className="py-2.5 px-3">Proyek Site</th>
                    <th className="py-2.5 px-3 text-right">0-30 Hari</th>
                    <th className="py-2.5 px-3 text-right">31-60 Hari</th>
                    <th className="py-2.5 px-3 text-right">61-90 Hari</th>
                    <th className="py-2.5 px-3 text-right">&gt; 90 Hari</th>
                    <th className="py-2.5 px-3 text-right">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {receivables
                    .filter((r) => r.remainingAmount > 0)
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold">{r.customerName}</td>
                        <td className="py-2.5 px-3 text-slate-400">{r.projectName}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                          {r.status !== 'OVERDUE' ? formatCurrency(r.remainingAmount) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400 font-medium">
                          {r.status === 'OVERDUE' ? formatCurrency(r.remainingAmount) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">-</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">-</td>
                        <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                          {formatCurrency(r.remainingAmount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH / EDIT HUTANG */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-400" />
                {editingDebt ? 'Edit Kewajiban Hutang' : 'Catat Hutang Usaha Baru'}
              </h3>
              <button
                onClick={() => setIsDebtModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDebt} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Jenis Hutang</label>
                  <select
                    value={debtFormData.type}
                    onChange={(e) => setDebtFormData({ ...debtFormData, type: e.target.value as DebtType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="HUTANG_VENDOR">Hutang Vendor / Supplier</option>
                    <option value="HUTANG_LEASING_MESIN">Hutang Leasing / Mesin</option>
                    <option value="HUTANG_OPERASIONAL">Hutang Operasional Seragam/APD</option>
                    <option value="HUTANG_PINJAMAN">Hutang Pinjaman Bank / Lembaga</option>
                    <option value="HUTANG_LAINNYA">Hutang Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kategori Beban / Akun COA</label>
                  <select
                    value={debtFormData.accountCode}
                    onChange={(e) => setDebtFormData({ ...debtFormData, accountCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="2110">2110 - Utang Usaha / Supplier</option>
                    <option value="2120">2120 - Utang Gaji & Operasional</option>
                    <option value="2210">2210 - Utang Jangka Panjang / Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Vendor / Kreditor *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Diversey Hygiene Indonesia"
                  value={debtFormData.creditorName}
                  onChange={(e) => setDebtFormData({ ...debtFormData, creditorName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">No Faktur / Tagihan *</label>
                  <input
                    type="text"
                    required
                    placeholder="INV/2026/08/..."
                    value={debtFormData.invoiceNumber}
                    onChange={(e) => setDebtFormData({ ...debtFormData, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Total Nominal Hutang (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={debtFormData.totalAmount || ''}
                    onChange={(e) => setDebtFormData({ ...debtFormData, totalAmount: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Tagihan</label>
                  <input
                    type="date"
                    value={debtFormData.issueDate}
                    onChange={(e) => setDebtFormData({ ...debtFormData, issueDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Jatuh Tempo *</label>
                  <input
                    type="date"
                    required
                    value={debtFormData.dueDate}
                    onChange={(e) => setDebtFormData({ ...debtFormData, dueDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold text-rose-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Alokasi Site Proyek</label>
                  <select
                    value={debtFormData.projectId}
                    onChange={(e) => setDebtFormData({ ...debtFormData, projectId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="ALL">Semua Site / HQ</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Keterangan / Kategori</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pengadaan Chemical & Karbol"
                    value={debtFormData.category}
                    onChange={(e) => setDebtFormData({ ...debtFormData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Klausul termin, nomor PO atau kontak vendor..."
                  value={debtFormData.notes}
                  onChange={(e) => setDebtFormData({ ...debtFormData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDebtModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  {editingDebt ? 'Simpan Perubahan' : 'Catat Hutang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BAYAR CICILAN / LUNAS HUTANG */}
      {isPayDebtModalOpen && selectedDebtForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-white my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-400" />
                Bayar Hutang Vendor
              </h3>
              <button
                onClick={() => setIsPayDebtModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Vendor:</span>
                <span className="font-bold text-white">{selectedDebtForPayment.creditorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">No Faktur:</span>
                <span className="font-mono text-slate-300">{selectedDebtForPayment.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sisa Hutang:</span>
                <span className="font-bold text-rose-400">{formatCurrency(selectedDebtForPayment.remainingAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleSavePayDebt} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nominal Pembayaran (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedDebtForPayment.remainingAmount}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base text-rose-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-semibold">Sumber Rekening Kas / Bank *</label>
                  <span className="text-[10px] text-amber-400 font-medium">
                    {payIsManual ? 'Manual' : 'Rekening Resmi'}
                  </span>
                </div>
                <select
                  value={payIsManual ? '__MANUAL__' : payMethod}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__MANUAL__') {
                      setPayIsManual(true);
                    } else {
                      setPayIsManual(false);
                      setPayMethod(val);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {registeredBankAccounts.length > 0 ? (
                    registeredBankAccounts.map((b) => (
                      <option key={b.id} value={`${b.bankName} (${b.accountNumber})`}>
                        {b.bankName} - {b.accountNumber} ({b.role}){b.isPrimary ? ' ★' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      -- Tidak ada rekening terdaftar di Pengaturan Perusahaan --
                    </option>
                  )}
                  <option value="__MANUAL__">+ Lainnya (Tulis / Ketik Manual...)</option>
                </select>

                {payIsManual && (
                  <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kas Tunai HQ, Kas Operasional Lapangan, Cek/Giro, dll."
                      value={payManualText}
                      onChange={(e) => setPayManualText(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Bayar</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">No Bukti Referensi</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Catatan Pembayaran</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayDebtModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Eksekusi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH / EDIT PIUTANG INVOICE */}
      {isReceivableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-cyan-400" />
                {editingReceivable ? 'Edit Piutang Tagihan Invoice' : 'Terbitkan Piutang Invoice Baru'}
              </h3>
              <button
                onClick={() => setIsReceivableModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceivable} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Jenis Piutang</label>
                  <select
                    value={recFormData.type}
                    onChange={(e) => setRecFormData({ ...recFormData, type: e.target.value as ReceivableType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PIUTANG_KONTRAK_JASA">Piutang Kontrak Jasa Bulanan</option>
                    <option value="PIUTANG_PROJECT_KHUSUS">Piutang Jasa Khusus / Gondola</option>
                    <option value="PIUTANG_LAINNYA">Piutang Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Termin Pembayaran</label>
                  <select
                    value={recFormData.termOfPayment}
                    onChange={(e) => setRecFormData({ ...recFormData, termOfPayment: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Net 15">Net 15 Hari</option>
                    <option value="Net 30">Net 30 Hari</option>
                    <option value="Net 45">Net 45 Hari</option>
                    <option value="Net 60">Net 60 Hari</option>
                    <option value="COD">Cash On Delivery (COD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Customer / Klien Gedung *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Pakuwon Jati Tbk (Mall Gandaria City)"
                  value={recFormData.customerName}
                  onChange={(e) => setRecFormData({ ...recFormData, customerName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">No Invoice Resmi *</label>
                  <input
                    type="text"
                    required
                    placeholder="INV/RC/2026/..."
                    value={recFormData.invoiceNumber}
                    onChange={(e) => setRecFormData({ ...recFormData, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Total Tagihan (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={recFormData.totalAmount || ''}
                    onChange={(e) => setRecFormData({ ...recFormData, totalAmount: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Terbit</label>
                  <input
                    type="date"
                    value={recFormData.issueDate}
                    onChange={(e) => setRecFormData({ ...recFormData, issueDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Jatuh Tempo *</label>
                  <input
                    type="date"
                    required
                    value={recFormData.dueDate}
                    onChange={(e) => setRecFormData({ ...recFormData, dueDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold text-cyan-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Lokasi Proyek</label>
                  <select
                    value={recFormData.projectId}
                    onChange={(e) => setRecFormData({ ...recFormData, projectId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">PIC / Kontak Klien</label>
                  <input
                    type="text"
                    placeholder="Bpk. Ferry (0812-xxx)"
                    value={recFormData.contactPerson}
                    onChange={(e) => setRecFormData({ ...recFormData, contactPerson: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Deskripsi / Catatan Tagihan</label>
                <textarea
                  rows={2}
                  placeholder="Uraian pekerjaan, termin penagihan, periode kontrak..."
                  value={recFormData.notes}
                  onChange={(e) => setRecFormData({ ...recFormData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReceivableModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  {editingReceivable ? 'Simpan Perubahan' : 'Terbitkan Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CATAT PENERIMAAN PEMBAYARAN PIUTANG */}
      {isReceivePaymentModalOpen && selectedReceivableForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-white my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-cyan-400" />
                Terima Pembayaran Invoice
              </h3>
              <button
                onClick={() => setIsReceivePaymentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{selectedReceivableForPayment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">No Invoice:</span>
                <span className="font-mono text-slate-300">{selectedReceivableForPayment.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sisa Tagihan:</span>
                <span className="font-bold text-cyan-400">{formatCurrency(selectedReceivableForPayment.remainingAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveReceivePayment} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nominal Penerimaan (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedReceivableForPayment.remainingAmount}
                  value={receiveAmount || ''}
                  onChange={(e) => setReceiveAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base text-cyan-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-semibold">Rekening Tujuan Masuk Kas / Bank *</label>
                  <span className="text-[10px] text-cyan-400 font-medium">
                    {receiveIsManual ? 'Manual' : 'Rekening Resmi'}
                  </span>
                </div>
                <select
                  value={receiveIsManual ? '__MANUAL__' : receiveMethod}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__MANUAL__') {
                      setReceiveIsManual(true);
                    } else {
                      setReceiveIsManual(false);
                      setReceiveMethod(val);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {registeredBankAccounts.length > 0 ? (
                    registeredBankAccounts.map((b) => (
                      <option key={b.id} value={`${b.bankName} (${b.accountNumber})`}>
                        {b.bankName} - {b.accountNumber} ({b.role}){b.isPrimary ? ' ★' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      -- Tidak ada rekening terdaftar di Pengaturan Perusahaan --
                    </option>
                  )}
                  <option value="__MANUAL__">+ Lainnya (Tulis / Ketik Manual...)</option>
                </select>

                {receiveIsManual && (
                  <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kas Tunai HQ, Kas Operasional Lapangan, Cek/Giro, dll."
                      value={receiveManualText}
                      onChange={(e) => setReceiveManualText(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Terima</label>
                  <input
                    type="date"
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">No Referensi / Giro</label>
                  <input
                    type="text"
                    value={receiveRef}
                    onChange={(e) => setReceiveRef(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Catatan Penerimaan</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReceivePaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  Simpan Penerimaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: HAPUS DENGAN PROTEKSI PIN KEAMANAN */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-white">
            <div className="flex items-center space-x-3 text-rose-400 mb-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Otorisasi Hapus Data</h3>
                <p className="text-[11px] text-slate-400">Tindakan ini permanen & dicatat di audit trail</p>
              </div>
            </div>

            <div className="my-3 p-3 bg-slate-800/80 rounded-xl text-xs">
              <div className="font-bold text-slate-200">{deleteTarget.title}</div>
              <div className="text-slate-400 font-mono text-[11px]">{deleteTarget.code}</div>
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
                  placeholder="Contoh: Kesalahan input / invoice ganda"
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
