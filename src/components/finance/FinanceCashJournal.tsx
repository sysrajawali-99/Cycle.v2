import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  CreditCard,
  Layers,
  ArrowRightLeft,
  Sparkles,
  Printer,
  Trash2,
  Edit,
  Eye,
  FileText,
  DollarSign,
  Receipt,
  Scale,
  FolderTree,
  CornerDownRight,
  GitBranch,
  Check,
  X,
  Tag,
  Info,
  ChevronRight,
  Clock,
  Landmark,
  ShieldCheck
} from 'lucide-react';
import {
  ChartOfAccount,
  FinanceTransaction,
  TransactionType,
  PaymentMethod,
  DivisionType,
  PeriodClosing,
  AuditTrailItem,
  AccountType,
  AccountCategory
} from '../../types/finance';
import { Project, UserAccount, CompanyProfile, CompanyBankAccount } from '../../types';
import { financeService } from '../../services/financeService';
import { storageService } from '../../services/storageService';
import { SecurityPinModal } from '../common/SecurityPinModal';

interface FinanceCashJournalProps {
  accounts: ChartOfAccount[];
  transactions: FinanceTransaction[];
  projects: Project[];
  currentUser?: UserAccount | null;
  periodClosings: PeriodClosing[];
  companyProfile?: CompanyProfile;
  onAddTransaction: (trx: FinanceTransaction) => void;
  onUpdateTransaction?: (trx: FinanceTransaction) => void;
  onDeleteTransaction?: (trxId: string) => void;
  onBatchDeleteTransactions?: (trxIds: string[]) => void;
  onAddAccount?: (account: ChartOfAccount) => void;
  onUpdateAccount?: (account: ChartOfAccount) => void;
  onDeleteAccount?: (accountCode: string) => void;
  onBatchDeleteAccounts?: (accountCodes: string[]) => void;
  onLogAudit?: (audit: AuditTrailItem) => void;
}

export const FinanceCashJournal: React.FC<FinanceCashJournalProps> = ({
  accounts,
  transactions,
  projects,
  currentUser,
  periodClosings,
  companyProfile,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onBatchDeleteTransactions,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onBatchDeleteAccounts,
  onLogAudit
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'transactions' | 'journals' | 'ledger' | 'trial_balance' | 'coa'
  >('transactions');

  // Bulk Selection & Delete States
  const [selectedTrxIds, setSelectedTrxIds] = useState<string[]>([]);
  const [selectedAccountCodes, setSelectedAccountCodes] = useState<string[]>([]);
  const [isBulkDeleteTrxModalOpen, setIsBulkDeleteTrxModalOpen] = useState(false);
  const [isBulkDeleteAccountModalOpen, setIsBulkDeleteAccountModalOpen] = useState(false);
  const [journalActionNotice, setJournalActionNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [filterBankStatus, setFilterBankStatus] = useState<'ALL' | 'RECONCILED' | 'UNRECONCILED'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Ledger Account
  const [selectedLedgerAccountCode, setSelectedLedgerAccountCode] = useState<string>('1120');

  // Modal States
  const [isCashInModalOpen, setIsCashInModalOpen] = useState(false);
  const [isCashOutModalOpen, setIsCashOutModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isDepreciationModalOpen, setIsDepreciationModalOpen] = useState(false);
  const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
  const [viewTransactionDetail, setViewTransactionDetail] = useState<FinanceTransaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<FinanceTransaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Bank Reconciliation Verification Modal States
  const [reconcileModalTrx, setReconcileModalTrx] = useState<FinanceTransaction | null>(null);
  const [reconcileSelectedStatus, setReconcileSelectedStatus] = useState<boolean>(true);
  const [reconcileNote, setReconcileNote] = useState<string>('');

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
    // Fallback to primary company profile bank info if no multi-bank is registered
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

  // Edit Modal Payment Method States (Support Registered Banks & Manual)
  const [editPaymentMethodSelection, setEditPaymentMethodSelection] = useState<string>('');
  const [editIsManualPayment, setEditIsManualPayment] = useState<boolean>(false);
  const [editManualPaymentMethod, setEditManualPaymentMethod] = useState<string>('');

  // Create Modal Payment Method States (Support Registered Banks & Manual)
  const [createPaymentMethodSelection, setCreatePaymentMethodSelection] = useState<string>('');
  const [createIsManualPayment, setCreateIsManualPayment] = useState<boolean>(false);
  const [createManualPaymentMethod, setCreateManualPaymentMethod] = useState<string>('');

  const [editFormData, setEditFormData] = useState({
    date: '',
    title: '',
    description: '',
    amount: '',
    paymentMethod: '' as PaymentMethod,
    primaryAccountCode: '1120',
    contraAccountCode: '4110',
    projectId: 'ALL',
    division: 'Cleaning Service' as DivisionType,
    referenceNumber: '',
    payeeOrPayer: ''
  });
  const [editJournalLines, setEditJournalLines] = useState<
    { id: string; accountCode: string; debit: number; credit: number; notes: string }[]
  >([]);

  // COA / Sub COA Management States
  const [coaModalMode, setCoaModalMode] = useState<'create' | 'edit'>('create');
  const [coaSearchQuery, setCoaSearchQuery] = useState('');
  const [coaFilterType, setCoaFilterType] = useState<string>('ALL');
  const [coaFilterHierarchy, setCoaFilterHierarchy] = useState<'ALL' | 'PARENT' | 'SUB'>('ALL');
  const [coaFilterCategory, setCoaFilterCategory] = useState<string>('ALL');
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<FinanceTransaction | null>(null);

  const [coaFormData, setCoaFormData] = useState({
    accountKind: 'PARENT' as 'PARENT' | 'SUB',
    parentCode: '',
    code: '',
    name: '',
    type: 'Asset' as AccountType,
    category: 'Kas & Bank' as string,
    customCategory: '',
    normalBalance: 'Debit' as 'Debit' | 'Credit',
    initialBalance: '',
    description: '',
    isActive: true,
    editingOriginalCode: ''
  });

  // Form State for Cash In / Out
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    paymentMethod: 'Bank BCA (123-456-7890)' as PaymentMethod,
    primaryAccountCode: '1120',
    contraAccountCode: '4110',
    projectId: 'ALL',
    division: 'Cleaning Service' as DivisionType,
    referenceNumber: '',
    payeeOrPayer: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Form State for General Journal Entries
  const [journalLines, setJournalLines] = useState<
    { id: string; accountCode: string; debit: number; credit: number; notes: string }[]
  >([
    { id: '1', accountCode: '1120', debit: 0, credit: 0, notes: '' },
    { id: '2', accountCode: '4110', debit: 0, credit: 0, notes: '' }
  ]);
  const [journalHeader, setJournalHeader] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    projectId: 'ALL',
    division: 'Cleaning Service' as DivisionType,
    referenceNumber: '',
    isAdjusting: false
  });

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((trx) => {
      if (filterType !== 'ALL' && trx.type !== filterType) return false;
      if (filterProject !== 'ALL' && trx.projectId !== filterProject) return false;
      if (filterBankStatus === 'RECONCILED' && !trx.isReconciled) return false;
      if (filterBankStatus === 'UNRECONCILED' && trx.isReconciled) return false;
      if (startDate && trx.date < startDate) return false;
      if (endDate && trx.date > endDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = trx.title.toLowerCase().includes(q);
        const matchDesc = trx.description.toLowerCase().includes(q);
        const matchCode = trx.code.toLowerCase().includes(q);
        const matchRef = (trx.referenceNumber || '').toLowerCase().includes(q);
        const matchPayee = (trx.payeeOrPayer || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCode && !matchRef && !matchPayee) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterProject, filterBankStatus, startDate, endDate, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let inCount = 0;
    let outCount = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === 'IN') {
        totalIn += t.amount;
        inCount++;
      } else if (t.type === 'OUT') {
        totalOut += t.amount;
        outCount++;
      }
    });

    const netCash = totalIn - totalOut;

    return { totalIn, totalOut, netCash, inCount, outCount, totalCount: filteredTransactions.length };
  }, [filteredTransactions]);

  // General Ledger calculations
  const generalLedgers = useMemo(() => {
    return financeService.generateGeneralLedger(
      accounts,
      transactions,
      startDate || undefined,
      endDate || undefined,
      filterProject !== 'ALL' ? filterProject : undefined
    );
  }, [accounts, transactions, startDate, endDate, filterProject]);

  const activeLedger = useMemo(() => {
    return (
      generalLedgers.find((l) => l.account.code === selectedLedgerAccountCode) ||
      generalLedgers[0]
    );
  }, [generalLedgers, selectedLedgerAccountCode]);

  // Trial Balance calculation
  const trialBalance = useMemo(() => {
    return financeService.generateTrialBalance(accounts, transactions, endDate || undefined);
  }, [accounts, transactions, endDate]);

  // Open Edit Modal for a Transaction
  const handleOpenEditTransaction = (trx: FinanceTransaction) => {
    setTransactionToEdit(trx);

    // Check if trx.paymentMethod matches any registered company bank account
    const matchedBank = registeredBankAccounts.find((b) => {
      const standardFormat = `${b.bankName} (${b.accountNumber})`;
      const dashFormat = `${b.bankName} - ${b.accountNumber}`;
      return (
        trx.paymentMethod === standardFormat ||
        trx.paymentMethod === dashFormat ||
        trx.paymentMethod === b.bankName ||
        trx.paymentMethod === `${b.bankName} - ${b.accountNumber} (${b.role})` ||
        trx.paymentMethod === b.accountNumber
      );
    });

    if (matchedBank) {
      const standardVal = `${matchedBank.bankName} (${matchedBank.accountNumber})`;
      setEditPaymentMethodSelection(standardVal);
      setEditIsManualPayment(false);
      setEditManualPaymentMethod('');
      setEditFormData({
        date: trx.date,
        title: trx.title,
        description: trx.description || '',
        amount: String(trx.amount),
        paymentMethod: standardVal,
        primaryAccountCode: trx.primaryAccountCode,
        contraAccountCode: trx.contraAccountCode,
        projectId: trx.projectId,
        division: trx.division,
        referenceNumber: trx.referenceNumber || '',
        payeeOrPayer: trx.payeeOrPayer || ''
      });
    } else {
      setEditPaymentMethodSelection('__MANUAL__');
      setEditIsManualPayment(true);
      setEditManualPaymentMethod(trx.paymentMethod || '');
      setEditFormData({
        date: trx.date,
        title: trx.title,
        description: trx.description || '',
        amount: String(trx.amount),
        paymentMethod: trx.paymentMethod || '',
        primaryAccountCode: trx.primaryAccountCode,
        contraAccountCode: trx.contraAccountCode,
        projectId: trx.projectId,
        division: trx.division,
        referenceNumber: trx.referenceNumber || '',
        payeeOrPayer: trx.payeeOrPayer || ''
      });
    }

    if (trx.journalEntries && trx.journalEntries.length > 0) {
      setEditJournalLines(
        trx.journalEntries.map((j) => ({
          id: j.id,
          accountCode: j.accountCode,
          debit: j.debit,
          credit: j.credit,
          notes: j.notes || ''
        }))
      );
    } else {
      setEditJournalLines([
        { id: '1', accountCode: trx.primaryAccountCode || '1120', debit: trx.amount, credit: 0, notes: '' },
        { id: '2', accountCode: trx.contraAccountCode || '4110', debit: 0, credit: trx.amount, notes: '' }
      ]);
    }

    setIsEditModalOpen(true);
  };

  // Save changes to edited transaction
  const handleSaveEditedTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionToEdit) return;

    if (financeService.isDateInClosedPeriod(editFormData.date, periodClosings)) {
      alert('Periode tanggal ini telah DITUTUP (Closed Period). Transaksi tidak dapat diubah.');
      return;
    }

    // Determine final effective payment method
    let effectivePaymentMethod = editFormData.paymentMethod;
    if (editIsManualPayment) {
      if (!editManualPaymentMethod.trim()) {
        alert('Mohon tuliskan nama metode pembayaran manual.');
        return;
      }
      effectivePaymentMethod = editManualPaymentMethod.trim();
    } else if (editPaymentMethodSelection && editPaymentMethodSelection !== '__MANUAL__') {
      effectivePaymentMethod = editPaymentMethodSelection;
    }

    const selectedProj = projects.find((p) => p.id === editFormData.projectId);
    const primaryAcc = accounts.find((a) => a.code === editFormData.primaryAccountCode);
    const contraAcc = accounts.find((a) => a.code === editFormData.contraAccountCode);

    let updatedTrx: FinanceTransaction;

    if (transactionToEdit.type === 'IN') {
      const amountNum = parseFloat(String(editFormData.amount).replace(/[^\d.-]/g, '')) || 0;
      if (amountNum <= 0) {
        alert('Nominal uang masuk harus lebih besar dari 0.');
        return;
      }

      updatedTrx = {
        ...transactionToEdit,
        date: editFormData.date,
        title: editFormData.title || `Penerimaan Kas/Bank - ${contraAcc?.name || 'Pendapatan'}`,
        description: editFormData.description,
        amount: amountNum,
        paymentMethod: effectivePaymentMethod,
        primaryAccountCode: editFormData.primaryAccountCode,
        contraAccountCode: editFormData.contraAccountCode,
        journalEntries: [
          {
            id: transactionToEdit.journalEntries?.[0]?.id || `j-${Date.now()}-1`,
            accountCode: editFormData.primaryAccountCode,
            accountName: primaryAcc?.name || 'Kas & Bank',
            debit: amountNum,
            credit: 0,
            notes: `Penerimaan kas ${effectivePaymentMethod}`
          },
          {
            id: transactionToEdit.journalEntries?.[1]?.id || `j-${Date.now()}-2`,
            accountCode: editFormData.contraAccountCode,
            accountName: contraAcc?.name || 'Pendapatan',
            debit: 0,
            credit: amountNum,
            notes: editFormData.title
          }
        ],
        projectId: editFormData.projectId,
        projectName: selectedProj ? selectedProj.name : 'Seluruh Lokasi (HQ)',
        division: editFormData.division,
        referenceNumber: editFormData.referenceNumber,
        payeeOrPayer: editFormData.payeeOrPayer,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    } else if (transactionToEdit.type === 'OUT') {
      const amountNum = parseFloat(String(editFormData.amount).replace(/[^\d.-]/g, '')) || 0;
      if (amountNum <= 0) {
        alert('Nominal uang keluar harus lebih besar dari 0.');
        return;
      }

      updatedTrx = {
        ...transactionToEdit,
        date: editFormData.date,
        title: editFormData.title || `Pengeluaran Kas/Bank - ${contraAcc?.name || 'Beban Operasional'}`,
        description: editFormData.description,
        amount: amountNum,
        paymentMethod: effectivePaymentMethod,
        primaryAccountCode: editFormData.primaryAccountCode,
        contraAccountCode: editFormData.contraAccountCode,
        journalEntries: [
          {
            id: transactionToEdit.journalEntries?.[0]?.id || `j-${Date.now()}-1`,
            accountCode: editFormData.contraAccountCode,
            accountName: contraAcc?.name || 'Beban Operasional',
            debit: amountNum,
            credit: 0,
            notes: editFormData.title
          },
          {
            id: transactionToEdit.journalEntries?.[1]?.id || `j-${Date.now()}-2`,
            accountCode: editFormData.primaryAccountCode,
            accountName: primaryAcc?.name || 'Kas & Bank',
            debit: 0,
            credit: amountNum,
            notes: `Pembayaran via ${effectivePaymentMethod}`
          }
        ],
        projectId: editFormData.projectId,
        projectName: selectedProj ? selectedProj.name : 'Seluruh Lokasi (HQ)',
        division: editFormData.division,
        referenceNumber: editFormData.referenceNumber,
        payeeOrPayer: editFormData.payeeOrPayer,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    } else {
      // General Journal / Adjustment
      const totalDebit = editJournalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      const totalCredit = editJournalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

      if (totalDebit <= 0 || totalCredit <= 0) {
        alert('Total nominal jurnal debit dan kredit harus lebih besar dari 0.');
        return;
      }

      if (Math.abs(totalDebit - totalCredit) > 1) {
        alert(
          `Jurnal tidak seimbang! Total Debit: ${financeService.formatRupiah(
            totalDebit
          )}, Total Kredit: ${financeService.formatRupiah(
            totalCredit
          )}. Selisih: ${financeService.formatRupiah(Math.abs(totalDebit - totalCredit))}`
        );
        return;
      }

      updatedTrx = {
        ...transactionToEdit,
        date: editFormData.date,
        title: editFormData.title || 'Jurnal Umum Transaksi',
        description: editFormData.description,
        amount: totalDebit,
        primaryAccountCode: editJournalLines[0]?.accountCode || '1110',
        contraAccountCode: editJournalLines[1]?.accountCode || '4110',
        journalEntries: editJournalLines.map((l, idx) => {
          const acc = accounts.find((a) => a.code === l.accountCode);
          return {
            id: l.id || `j-${Date.now()}-${idx}`,
            accountCode: l.accountCode,
            accountName: acc?.name || 'Akun Jurnal',
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            notes: l.notes || editFormData.title
          };
        }),
        projectId: editFormData.projectId,
        projectName: selectedProj ? selectedProj.name : 'Seluruh Lokasi (HQ)',
        division: editFormData.division,
        referenceNumber: editFormData.referenceNumber,
        payeeOrPayer: editFormData.payeeOrPayer || 'Internal Accounting',
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    }

    if (onUpdateTransaction) {
      onUpdateTransaction(updatedTrx);
    }

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Staff Keuangan',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'UPDATE',
        module: updatedTrx.type === 'IN' ? 'Uang Masuk' : updatedTrx.type === 'OUT' ? 'Uang Keluar' : 'Jurnal Umum',
        recordId: updatedTrx.id,
        recordCode: updatedTrx.code,
        description: `Memperbarui transaksi ${updatedTrx.code}: "${updatedTrx.title}" senilai ${financeService.formatRupiah(updatedTrx.amount)}`,
        amount: updatedTrx.amount
      });
    }

    setIsEditModalOpen(false);
    setTransactionToEdit(null);
  };

  // Bank Reconciliation Modal Handlers
  const handleOpenReconcileModal = (trx: FinanceTransaction) => {
    setReconcileModalTrx(trx);
    // Default the selection to true (Reconciled) so if user clicked to verify, they can easily confirm
    setReconcileSelectedStatus(true);
    setReconcileNote(trx.bankStatementItemId ? `ID Mutasi: ${trx.bankStatementItemId}` : '');
  };

  const handleSaveReconcileStatus = (newStatus: boolean) => {
    if (!reconcileModalTrx) return;

    const updatedTrx: FinanceTransaction = {
      ...reconcileModalTrx,
      isReconciled: newStatus,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedBy: currentUser?.name || 'Staff Keuangan'
    };

    if (onUpdateTransaction) {
      onUpdateTransaction(updatedTrx);
    }

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Staff Keuangan',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'UPDATE',
        module: 'Rekonsiliasi Bank',
        recordId: updatedTrx.id,
        recordCode: updatedTrx.code,
        description: `Status Bank transaksi ${updatedTrx.code} ("${updatedTrx.title}") diubah menjadi ${
          newStatus ? 'RECONCILED (Sesuai Bank)' : 'UNRECONCILED (Belum Sesuai)'
        }${reconcileNote.trim() ? ` - Catatan: ${reconcileNote.trim()}` : ''}`,
        amount: updatedTrx.amount
      });
    }

    setJournalActionNotice({
      type: 'success',
      message: `Status Bank untuk transaksi ${updatedTrx.code} berhasil diubah menjadi "${
        newStatus ? 'Reconciled' : 'Unreconciled'
      }"!`
    });
    setTimeout(() => setJournalActionNotice(null), 4000);

    setReconcileModalTrx(null);
  };

  // Handle Form Submission: Cash In (Uang Masuk / BKM)
  const handleCreateCashIn = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount.replace(/[^\d.-]/g, '')) || 0;
    if (amountNum <= 0) {
      alert('Mohon masukkan nominal uang masuk yang valid.');
      return;
    }

    if (financeService.isDateInClosedPeriod(formData.date, periodClosings)) {
      alert('Periode tanggal ini telah DITUTUP (Closed Period). Transaksi tidak dapat ditambahkan.');
      return;
    }

    const primaryAcc = accounts.find((a) => a.code === formData.primaryAccountCode);
    const contraAcc = accounts.find((a) => a.code === formData.contraAccountCode);
    const selectedProj = projects.find((p) => p.id === formData.projectId);

    // Determine final effective payment method for creation
    let effectivePaymentMethod = formData.paymentMethod;
    if (createIsManualPayment) {
      if (!createManualPaymentMethod.trim()) {
        alert('Mohon tuliskan nama metode pembayaran manual.');
        return;
      }
      effectivePaymentMethod = createManualPaymentMethod.trim();
    } else if (createPaymentMethodSelection && createPaymentMethodSelection !== '__MANUAL__') {
      effectivePaymentMethod = createPaymentMethodSelection;
    } else if (registeredBankAccounts[0]) {
      effectivePaymentMethod = `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`;
    }

    const now = new Date();
    const code = `BKM-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      transactions.length + 1
    ).padStart(3, '0')}`;

    const newTrx: FinanceTransaction = {
      id: `trx-${Date.now()}`,
      code,
      date: formData.date,
      type: 'IN',
      title: formData.title || `Penerimaan Kas/Bank - ${contraAcc?.name || 'Pendapatan'}`,
      description: formData.description,
      amount: amountNum,
      paymentMethod: effectivePaymentMethod,
      primaryAccountCode: formData.primaryAccountCode,
      contraAccountCode: formData.contraAccountCode,
      journalEntries: [
        {
          id: `j-${Date.now()}-1`,
          accountCode: formData.primaryAccountCode,
          accountName: primaryAcc?.name || 'Kas & Bank',
          debit: amountNum,
          credit: 0,
          notes: `Penerimaan kas ${effectivePaymentMethod}`
        },
        {
          id: `j-${Date.now()}-2`,
          accountCode: formData.contraAccountCode,
          accountName: contraAcc?.name || 'Pendapatan',
          debit: 0,
          credit: amountNum,
          notes: formData.title
        }
      ],
      projectId: formData.projectId,
      projectName: selectedProj ? selectedProj.name : 'Seluruh Lokasi (HQ)',
      division: formData.division,
      currency: 'IDR',
      exchangeRate: 1,
      referenceNumber: formData.referenceNumber,
      payeeOrPayer: formData.payeeOrPayer,
      isReconciled: false,
      isAdjusting: false,
      createdAt: `${formData.date} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      createdBy: currentUser?.name || 'Finance Staff'
    };

    onAddTransaction(newTrx);
    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Staff',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'CREATE',
        module: 'Uang Masuk',
        recordId: newTrx.id,
        recordCode: newTrx.code,
        description: `Pencatatan Uang Masuk ${code} sebesar ${financeService.formatRupiah(amountNum)} (${formData.title})`,
        amount: amountNum
      });
    }

    setIsCashInModalOpen(false);
    resetFormData();
  };

  // Handle Form Submission: Cash Out (Uang Keluar / BKK)
  const handleCreateCashOut = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount.replace(/[^\d.-]/g, '')) || 0;
    if (amountNum <= 0) {
      alert('Mohon masukkan nominal uang keluar yang valid.');
      return;
    }

    if (financeService.isDateInClosedPeriod(formData.date, periodClosings)) {
      alert('Periode tanggal ini telah DITUTUP (Closed Period). Transaksi tidak dapat ditambahkan.');
      return;
    }

    const primaryAcc = accounts.find((a) => a.code === formData.primaryAccountCode);
    const contraAcc = accounts.find((a) => a.code === formData.contraAccountCode);
    const selectedProj = projects.find((p) => p.id === formData.projectId);

    // Determine final effective payment method for creation
    let effectivePaymentMethod = formData.paymentMethod;
    if (createIsManualPayment) {
      if (!createManualPaymentMethod.trim()) {
        alert('Mohon tuliskan nama metode pembayaran manual.');
        return;
      }
      effectivePaymentMethod = createManualPaymentMethod.trim();
    } else if (createPaymentMethodSelection && createPaymentMethodSelection !== '__MANUAL__') {
      effectivePaymentMethod = createPaymentMethodSelection;
    } else if (registeredBankAccounts[0]) {
      effectivePaymentMethod = `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`;
    }

    const now = new Date();
    const code = `BKK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      transactions.length + 1
    ).padStart(3, '0')}`;

    const newTrx: FinanceTransaction = {
      id: `trx-${Date.now()}`,
      code,
      date: formData.date,
      type: 'OUT',
      title: formData.title || `Pengeluaran Kas/Bank - ${contraAcc?.name || 'Beban Operasional'}`,
      description: formData.description,
      amount: amountNum,
      paymentMethod: effectivePaymentMethod,
      primaryAccountCode: formData.primaryAccountCode,
      contraAccountCode: formData.contraAccountCode,
      journalEntries: [
        {
          id: `j-${Date.now()}-1`,
          accountCode: formData.contraAccountCode,
          accountName: contraAcc?.name || 'Beban Operasional',
          debit: amountNum,
          credit: 0,
          notes: formData.title
        },
        {
          id: `j-${Date.now()}-2`,
          accountCode: formData.primaryAccountCode,
          accountName: primaryAcc?.name || 'Kas & Bank',
          debit: 0,
          credit: amountNum,
          notes: `Pembayaran via ${effectivePaymentMethod}`
        }
      ],
      projectId: formData.projectId,
      projectName: selectedProj ? selectedProj.name : 'Seluruh Lokasi (HQ)',
      division: formData.division,
      currency: 'IDR',
      exchangeRate: 1,
      referenceNumber: formData.referenceNumber,
      payeeOrPayer: formData.payeeOrPayer,
      isReconciled: false,
      isAdjusting: false,
      createdAt: `${formData.date} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      createdBy: currentUser?.name || 'Finance Staff'
    };

    onAddTransaction(newTrx);
    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Staff',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'CREATE',
        module: 'Uang Keluar',
        recordId: newTrx.id,
        recordCode: newTrx.code,
        description: `Pencatatan Uang Keluar ${code} sebesar ${financeService.formatRupiah(amountNum)} (${formData.title})`,
        amount: amountNum
      });
    }

    setIsCashOutModalOpen(false);
    resetFormData();
  };

  // Handle Form Submission: General Journal / Adjusting Entry (Double-entry balanced validation)
  const handleCreateJournal = (e: React.FormEvent) => {
    e.preventDefault();
    const totalDebit = journalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = journalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

    if (totalDebit <= 0 || totalCredit <= 0) {
      alert('Total nominal jurnal debit dan kredit harus lebih besar dari 0.');
      return;
    }

    if (Math.abs(totalDebit - totalCredit) > 1) {
      alert(
        `Jurnal tidak seimbang! Total Debit: ${financeService.formatRupiah(
          totalDebit
        )}, Total Kredit: ${financeService.formatRupiah(
          totalCredit
        )}. Selisih: ${financeService.formatRupiah(Math.abs(totalDebit - totalCredit))}`
      );
      return;
    }

    if (financeService.isDateInClosedPeriod(journalHeader.date, periodClosings)) {
      alert('Periode tanggal ini telah DITUTUP. Jurnal tidak dapat disimpan.');
      return;
    }

    const now = new Date();
    const prefix = journalHeader.isAdjusting ? 'AJE' : 'JU';
    const code = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(transactions.length + 1).padStart(3, '0')}`;

    const selectedProj = projects.find((p) => p.id === journalHeader.projectId);

    const newTrx: FinanceTransaction = {
      id: `trx-${Date.now()}`,
      code,
      date: journalHeader.date,
      type: journalHeader.isAdjusting ? 'ADJUSTMENT' : 'JOURNAL',
      title: journalHeader.title || (journalHeader.isAdjusting ? 'Jurnal Penyesuaian Akrual' : 'Jurnal Umum Transaksi'),
      description: journalHeader.description,
      amount: totalDebit,
      paymentMethod: 'Kas Operasional Lapangan',
      primaryAccountCode: journalLines[0]?.accountCode || '1110',
      contraAccountCode: journalLines[1]?.accountCode || '4110',
      journalEntries: journalLines.map((l, idx) => {
        const acc = accounts.find((a) => a.code === l.accountCode);
        return {
          id: `j-${Date.now()}-${idx}`,
          accountCode: l.accountCode,
          accountName: acc?.name || 'Akun Jurnal',
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          notes: l.notes || journalHeader.title
        };
      }),
      projectId: journalHeader.projectId,
      projectName: selectedProj ? selectedProj.name : 'Seluruh Lokasi (HQ)',
      division: journalHeader.division,
      currency: 'IDR',
      exchangeRate: 1,
      referenceNumber: journalHeader.referenceNumber,
      payeeOrPayer: 'Internal Accounting',
      isReconciled: true,
      isAdjusting: journalHeader.isAdjusting,
      createdAt: `${journalHeader.date} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      createdBy: currentUser?.name || 'Senior Accountant'
    };

    onAddTransaction(newTrx);
    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Senior Accountant',
        userRole: currentUser?.role || 'Super Admin (HQ)',
        actionType: 'CREATE',
        module: journalHeader.isAdjusting ? 'Jurnal Penyesuaian' : 'Jurnal Umum',
        recordId: newTrx.id,
        recordCode: newTrx.code,
        description: `Posting ${code} sebesar ${financeService.formatRupiah(totalDebit)} (${journalHeader.title})`,
        amount: totalDebit
      });
    }

    setIsJournalModalOpen(false);
    resetJournalForm();
  };

  // Quick Straight-Line Depreciation Generator
  const handleCreateDepreciationEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const monthlyDeprScrubber = 4500000;
    const monthlyDeprVehicle = 2500000;
    const total = monthlyDeprScrubber + monthlyDeprVehicle;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const code = `AJE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      transactions.length + 1
    ).padStart(3, '0')}`;

    const newTrx: FinanceTransaction = {
      id: `trx-${Date.now()}`,
      code,
      date: today,
      type: 'ADJUSTMENT',
      title: `Penyusutan Mesin Scrubber & Mobil Box Logistik - ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      description: 'Penyusutan garis lurus aset tetap peralatan kebersihan (Rp 4.500.000) dan armada logistik (Rp 2.500.000)',
      amount: total,
      paymentMethod: 'Kas Operasional Lapangan',
      primaryAccountCode: '6160',
      contraAccountCode: '1290',
      journalEntries: [
        {
          id: `j-${Date.now()}-1`,
          accountCode: '6160',
          accountName: 'Beban Penyusutan Aset Tetap',
          debit: total,
          credit: 0,
          notes: 'Alokasi beban penyusutan bulanan'
        },
        {
          id: `j-${Date.now()}-2`,
          accountCode: '1290',
          accountName: 'Akumulasi Penyusutan Aset Tetap',
          debit: 0,
          credit: total,
          notes: 'Kontra akun aset tetap'
        }
      ],
      projectId: 'ALL',
      projectName: 'Seluruh Lokasi (HQ)',
      division: 'HQ Management & Operasional',
      currency: 'IDR',
      exchangeRate: 1,
      referenceNumber: `MEMO-DEPR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      payeeOrPayer: 'Internal Accounting',
      isReconciled: true,
      isAdjusting: true,
      createdAt: `${today} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      createdBy: currentUser?.name || 'Senior Accountant'
    };

    onAddTransaction(newTrx);
    setIsDepreciationModalOpen(false);
    alert('Jurnal Penyesuaian Penyusutan Otomatis berhasil diposting!');
  };

  const resetFormData = () => {
    const defaultBank = registeredBankAccounts[0]
      ? `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`
      : 'Kas Operasional Lapangan';
    setCreatePaymentMethodSelection(defaultBank);
    setCreateIsManualPayment(false);
    setCreateManualPaymentMethod('');
    setFormData({
      title: '',
      description: '',
      amount: '',
      paymentMethod: defaultBank,
      primaryAccountCode: '1120',
      contraAccountCode: '4110',
      projectId: 'ALL',
      division: 'Cleaning Service',
      referenceNumber: '',
      payeeOrPayer: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const resetJournalForm = () => {
    setJournalHeader({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      projectId: 'ALL',
      division: 'Cleaning Service',
      referenceNumber: '',
      isAdjusting: false
    });
    setJournalLines([
      { id: '1', accountCode: '1120', debit: 0, credit: 0, notes: '' },
      { id: '2', accountCode: '4110', debit: 0, credit: 0, notes: '' }
    ]);
  };

  // Export Transactions List to CSV
  const handleExportTransactionsCSV = () => {
    const headers = [
      'No Bukti',
      'Tanggal',
      'Jenis Transaksi',
      'Judul',
      'Keterangan',
      'Kode Akun Kas/Bank',
      'Nama Akun Kas/Bank',
      'Kode Akun Lawan',
      'Nama Akun Lawan',
      'Cost Center (Lokasi)',
      'Divisi',
      'Metode Pembayaran',
      'Pihak Terkait (Payee/Payer)',
      'No Referensi',
      'Nominal (Rp)',
      'Status Rekonsiliasi'
    ];
    const rows = filteredTransactions.map((trx) => {
      const primaryAcc = accounts.find((a) => a.code === trx.primaryAccountCode);
      const contraAcc = accounts.find((a) => a.code === trx.contraAccountCode);
      return [
        trx.code,
        trx.date,
        trx.type === 'IN' ? 'Uang Masuk (BKM)' : trx.type === 'OUT' ? 'Uang Keluar (BKK)' : 'Jurnal Umum',
        trx.title,
        trx.description || '',
        trx.primaryAccountCode,
        primaryAcc?.name || '',
        trx.contraAccountCode,
        contraAcc?.name || '',
        trx.projectName || 'HQ & Non-Project',
        trx.division || 'Cleaning Service',
        trx.paymentMethod,
        trx.payeeOrPayer || '',
        trx.referenceNumber || '',
        trx.amount,
        trx.isReconciled ? 'Reconciled' : 'Unreconciled'
      ];
    });
    financeService.exportToCSV(`Buku_Kas_Transaksi_${startDate || 'Semua'}_${endDate || ''}`, headers, rows);
  };

  // Export General Ledger to CSV
  const handleExportLedgerCSV = () => {
    if (!activeLedger) return;
    const headers = [
      'Tanggal',
      'No Transaksi',
      'Keterangan Jurnal',
      'No Referensi',
      'Lokasi / Proyek',
      'Debit (Rp)',
      'Kredit (Rp)',
      'Saldo Berjalan (Rp)'
    ];
    const rows: (string | number)[][] = [
      ['-', '-', 'Saldo Awal Periode', '-', '-', 0, 0, activeLedger.initialBalance],
      ...activeLedger.entries.map((e) => [
        e.date,
        e.transactionCode,
        e.description,
        e.referenceNumber || '-',
        e.projectName || '-',
        e.debit,
        e.credit,
        e.runningBalance
      ]),
      ['TOTAL', '-', 'Total Mutasi & Saldo Akhir', '-', '-', activeLedger.totalDebit, activeLedger.totalCredit, activeLedger.endingBalance]
    ];
    financeService.exportToCSV(`Buku_Besar_${activeLedger.account.code}_${activeLedger.account.name}`, headers, rows);
  };

  // Export Trial Balance to CSV
  const handleExportTrialBalanceCSV = () => {
    const headers = ['Kode Akun', 'Nama Akun', 'Golongan / Tipe', 'Kategori', 'Debit (Rp)', 'Kredit (Rp)'];
    const rows: (string | number)[][] = trialBalance.rows.map((r) => [
      r.accountCode,
      r.accountName,
      r.type,
      r.category,
      r.debitBalance,
      r.creditBalance
    ]);
    rows.push([
      'TOTAL',
      'TOTAL SELURUH AKUN',
      '-',
      '-',
      trialBalance.totalDebit,
      trialBalance.totalCredit
    ]);
    financeService.exportToCSV('Neraca_Saldo_Trial_Balance', headers, rows);
  };

  // Standard Accounting Categories
  const STANDARD_CATEGORIES: AccountCategory[] = [
    'Kas & Bank',
    'Piutang Usaha',
    'Persediaan & Logistik',
    'Biaya Dibayar di Muka',
    'Aset Tetap',
    'Akumulasi Penyusutan',
    'Utang Usaha / Supplier',
    'Utang Gaji & Operasional',
    'Utang Pajak',
    'Utang Jangka Panjang',
    'Modal Saham',
    'Laba Ditahan',
    'Pendapatan Jasa Kontrak',
    'Pendapatan Jasa Khusus',
    'Pendapatan Non-Operasional',
    'HPP - Tenaga Kerja Langsung',
    'HPP - Chemical & Perlengkapan',
    'Beban Gaji Staf & Manajemen',
    'Beban Operasional Gedung',
    'Beban Pemeliharaan & Mesin',
    'Beban Pemasaran & Representasi',
    'Beban Umum & Administrasi',
    'Beban Penyusutan Aset',
    'Beban Pajak & Bunga Bank'
  ];

  // Helper to generate smart next Sub COA code based on parent code
  const generateNextSubAccountCode = (parentCode: string) => {
    const parent = accounts.find((a) => a.code === parentCode);
    if (!parent) return '';
    const children = accounts.filter(
      (a) => a.parentCode === parentCode || a.code.startsWith(`${parentCode}-`) || a.code.startsWith(`${parentCode}.`)
    );
    let highest = 0;
    children.forEach((c) => {
      const match = c.code.match(/[-.](\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highest) highest = num;
      }
    });
    const nextNum = highest + 1;
    return `${parentCode}-${String(nextNum).padStart(2, '0')}`;
  };

  // Open Add Account modal with prefilled defaults
  const handleOpenAddCoaModal = (kind: 'PARENT' | 'SUB' = 'PARENT', targetParentCode?: string) => {
    setCoaModalMode('create');
    if (kind === 'SUB') {
      const parentAccounts = accounts.filter((a) => !a.isSubAccount);
      const selectedParent = targetParentCode
        ? accounts.find((a) => a.code === targetParentCode)
        : parentAccounts[0] || accounts[0];
      const pCode = selectedParent ? selectedParent.code : '';
      const autoCode = pCode ? generateNextSubAccountCode(pCode) : '';
      setCoaFormData({
        accountKind: 'SUB',
        parentCode: pCode,
        code: autoCode,
        name: '',
        type: selectedParent?.type || 'Asset',
        category: selectedParent?.category || 'Kas & Bank',
        customCategory: '',
        normalBalance: selectedParent?.normalBalance || 'Debit',
        initialBalance: '',
        description: '',
        isActive: true,
        editingOriginalCode: ''
      });
    } else {
      setCoaFormData({
        accountKind: 'PARENT',
        parentCode: '',
        code: '',
        name: '',
        type: 'Asset',
        category: 'Kas & Bank',
        customCategory: '',
        normalBalance: 'Debit',
        initialBalance: '',
        description: '',
        isActive: true,
        editingOriginalCode: ''
      });
    }
    setIsCoaModalOpen(true);
  };

  // Open Edit Account modal
  const handleOpenEditCoaModal = (acc: ChartOfAccount) => {
    setCoaModalMode('edit');
    const isSub = !!acc.isSubAccount || !!acc.parentCode;
    const isStandardCat = STANDARD_CATEGORIES.includes(acc.category as AccountCategory);
    setCoaFormData({
      accountKind: isSub ? 'SUB' : 'PARENT',
      parentCode: acc.parentCode || '',
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: isStandardCat ? acc.category : 'CUSTOM',
      customCategory: isStandardCat ? '' : acc.category,
      normalBalance: acc.normalBalance,
      initialBalance: String(acc.initialBalance || 0),
      description: acc.description || '',
      isActive: acc.isActive,
      editingOriginalCode: acc.code
    });
    setIsCoaModalOpen(true);
  };

  // Save Account (Create or Update)
  const handleSaveCoaAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = coaFormData.code.trim();
    const cleanName = coaFormData.name.trim();

    if (!cleanCode) {
      alert('Mohon masukkan Kode Akun COA.');
      return;
    }
    if (!cleanName) {
      alert('Mohon masukkan Nama Akun.');
      return;
    }

    if (coaModalMode === 'create' || (coaModalMode === 'edit' && cleanCode !== coaFormData.editingOriginalCode)) {
      const exists = accounts.some((a) => a.code.toLowerCase() === cleanCode.toLowerCase());
      if (exists) {
        alert(`Kode Akun "${cleanCode}" sudah terdaftar dalam sistem. Mohon gunakan kode akun unik.`);
        return;
      }
    }

    const initBalNum = parseFloat(coaFormData.initialBalance.replace(/[^\d.-]/g, '')) || 0;
    const finalCategory =
      coaFormData.category === 'CUSTOM'
        ? (coaFormData.customCategory.trim() || 'Lain-Lain')
        : coaFormData.category;

    const parentAcc =
      coaFormData.accountKind === 'SUB' && coaFormData.parentCode
        ? accounts.find((a) => a.code === coaFormData.parentCode)
        : undefined;

    const accountPayload: ChartOfAccount = {
      code: cleanCode,
      name: cleanName,
      type: coaFormData.type,
      category: finalCategory,
      normalBalance: coaFormData.normalBalance,
      initialBalance: initBalNum,
      currentBalance:
        coaModalMode === 'create'
          ? initBalNum
          : (accounts.find((a) => a.code === coaFormData.editingOriginalCode)?.currentBalance ?? initBalNum),
      description: coaFormData.description.trim(),
      isActive: coaFormData.isActive,
      isSystem: false,
      isSubAccount: coaFormData.accountKind === 'SUB',
      parentCode: coaFormData.accountKind === 'SUB' ? coaFormData.parentCode : undefined,
      parentName: parentAcc ? parentAcc.name : undefined,
      level: coaFormData.accountKind === 'SUB' ? 2 : 1
    };

    if (coaModalMode === 'create') {
      if (onAddAccount) {
        onAddAccount(accountPayload);
      }
      if (onLogAudit) {
        onLogAudit({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          userName: currentUser?.name || 'Finance Staff',
          userRole: currentUser?.role || 'Admin Operasional',
          actionType: 'CREATE',
          module: 'Bagan Akun (COA)',
          recordId: accountPayload.code,
          recordCode: accountPayload.code,
          description: `Penambahan ${accountPayload.isSubAccount ? 'Sub COA' : 'Akun COA'} [${accountPayload.code}] ${accountPayload.name} (${accountPayload.type} - ${accountPayload.category})`,
          amount: initBalNum
        });
      }
    } else {
      if (onUpdateAccount) {
        onUpdateAccount(accountPayload);
      }
      if (onLogAudit) {
        onLogAudit({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          userName: currentUser?.name || 'Finance Staff',
          userRole: currentUser?.role || 'Admin Operasional',
          actionType: 'UPDATE',
          module: 'Bagan Akun (COA)',
          recordId: accountPayload.code,
          recordCode: accountPayload.code,
          description: `Pembaruan Akun COA [${accountPayload.code}] ${accountPayload.name}`,
          amount: accountPayload.currentBalance
        });
      }
    }

    setIsCoaModalOpen(false);
  };

  // Delete Account Handler with Security PIN Verification
  const handleExecuteDeleteAccount = (reason: string) => {
    if (!accountToDelete) return;

    if (accountToDelete.isSystem) {
      alert('Akun standar sistem PSAK tidak dapat dihapus untuk menjaga konsistensi laporan.');
      setAccountToDelete(null);
      return;
    }

    const hasChildren = accounts.some((a) => a.parentCode === accountToDelete.code);
    if (hasChildren) {
      alert(`Akun ini memiliki Sub-Akun turunan. Mohon hapus atau alihkan Sub COA terlebih dahulu sebelum menghapus akun induk [${accountToDelete.code}].`);
      setAccountToDelete(null);
      return;
    }

    const hasTransactions = transactions.some(
      (t) =>
        t.primaryAccountCode === accountToDelete.code ||
        t.contraAccountCode === accountToDelete.code ||
        (t.journalEntries && t.journalEntries.some((j) => j.accountCode === accountToDelete.code))
    );

    if (hasTransactions) {
      alert(`Akun [${accountToDelete.code}] memiliki riwayat transaksi/jurnal. Untuk kepatuhan audit, ubah status akun menjadi Nonaktif alih-alih menghapusnya.`);
      setAccountToDelete(null);
      return;
    }

    if (onDeleteAccount) {
      onDeleteAccount(accountToDelete.code);
      if (onLogAudit) {
        onLogAudit({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          userName: currentUser?.name || 'Finance Staff',
          userRole: currentUser?.role || 'Admin Operasional',
          actionType: 'DELETE',
          module: 'Bagan Akun (COA)',
          recordId: accountToDelete.code,
          recordCode: accountToDelete.code,
          description: `Penghapusan Akun COA [${accountToDelete.code}] ${accountToDelete.name} via Verifikasi PIN Otorisasi. Alasan: ${reason}`
        });
      }
    }
    setAccountToDelete(null);
  };

  // Delete Transaction Handler with Security PIN Verification
  const handleExecuteDeleteTransaction = (reason: string) => {
    if (!transactionToDelete) return;

    if (financeService.isDateInClosedPeriod(transactionToDelete.date, periodClosings)) {
      alert('Transaksi pada periode yang telah DITUTUP tidak dapat dihapus.');
      setTransactionToDelete(null);
      return;
    }

    if (onDeleteTransaction) {
      onDeleteTransaction(transactionToDelete.id);
      if (onLogAudit) {
        onLogAudit({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          userName: currentUser?.name || 'Finance Staff',
          userRole: currentUser?.role || 'Admin Operasional',
          actionType: 'DELETE',
          module: 'Buku Kas & Transaksi',
          recordId: transactionToDelete.id,
          recordCode: transactionToDelete.code,
          description: `Penghapusan Transaksi [${transactionToDelete.code}] ${transactionToDelete.title} via Verifikasi PIN Otorisasi. Alasan: ${reason}`,
          amount: transactionToDelete.amount
        });
      }
    }
    setTransactionToDelete(null);
  };

  // Selection helpers & handlers for Transactions Bulk Delete
  const isAllTrxSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((t) => selectedTrxIds.includes(t.id));

  const isSomeTrxSelected =
    filteredTransactions.some((t) => selectedTrxIds.includes(t.id)) && !isAllTrxSelected;

  const handleToggleSelectAllTrx = () => {
    if (isAllTrxSelected) {
      const filteredIdSet = new Set(filteredTransactions.map((t) => t.id));
      setSelectedTrxIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = Array.from(new Set([...selectedTrxIds, ...filteredTransactions.map((t) => t.id)]));
      setSelectedTrxIds(combined);
    }
  };

  const handleToggleSelectTrx = (trxId: string) => {
    setSelectedTrxIds((prev) =>
      prev.includes(trxId) ? prev.filter((id) => id !== trxId) : [...prev, trxId]
    );
  };

  const selectedTransactionsData = useMemo(() => {
    const set = new Set(selectedTrxIds);
    return transactions.filter((t) => set.has(t.id));
  }, [transactions, selectedTrxIds]);

  const selectedTrxTotalAmount = useMemo(() => {
    return selectedTransactionsData.reduce((sum, t) => sum + t.amount, 0);
  }, [selectedTransactionsData]);

  const handleRequestBulkDeleteTransactions = () => {
    if (selectedTrxIds.length === 0) return;

    const closedItems = selectedTransactionsData.filter((t) =>
      financeService.isDateInClosedPeriod(t.date, periodClosings)
    );

    if (closedItems.length > 0) {
      alert(
        `Terdapat ${closedItems.length} transaksi yang berada dalam periode tertutup (Closed Period):\n` +
          closedItems
            .map((t) => `- ${t.code} (${t.date}): ${t.title}`)
            .slice(0, 5)
            .join('\n') +
          (closedItems.length > 5 ? `\n...dan ${closedItems.length - 5} lainnya` : '') +
          '\n\nTransaksi pada periode tertutup tidak dapat dihapus.'
      );
      return;
    }

    setIsBulkDeleteTrxModalOpen(true);
  };

  const handleExecuteBulkDeleteTransactions = (reason: string) => {
    const idsToDelete = [...selectedTrxIds];
    const trxsToDelete = selectedTransactionsData;
    const count = idsToDelete.length;
    const totalAmount = selectedTrxTotalAmount;
    const codesList = trxsToDelete.map((t) => t.code).join(', ');

    if (onBatchDeleteTransactions) {
      onBatchDeleteTransactions(idsToDelete);
    } else if (onDeleteTransaction) {
      idsToDelete.forEach((id) => onDeleteTransaction(id));
    }

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Staff',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'DELETE',
        module: 'Buku Kas & Transaksi',
        recordId: idsToDelete.slice(0, 5).join(','),
        recordCode: `${count} Transaksi`,
        description: `Hapus Masal ${count} Transaksi Kas & Jurnal (${codesList.length > 120 ? codesList.substring(0, 117) + '...' : codesList}) via Verifikasi PIN Otorisasi. Alasan: ${reason}`,
        amount: totalAmount
      });
    }

    setSelectedTrxIds([]);
    setIsBulkDeleteTrxModalOpen(false);
    setJournalActionNotice({
      type: 'success',
      message: `Berhasil menghapus ${count} transaksi kas & jurnal terpilih secara masal.`
    });
    setTimeout(() => setJournalActionNotice(null), 5000);
  };

  // Helper to determine if an account is deletable
  const getAccountDeletability = (acc: ChartOfAccount) => {
    if (acc.isSystem) {
      return { canDelete: false, reason: 'Akun sistem default PSAK' };
    }
    const hasChildren = accounts.some((a) => a.parentCode === acc.code);
    if (hasChildren) {
      return { canDelete: false, reason: 'Memiliki Sub-Akun turunan' };
    }
    const hasTrx = transactions.some(
      (t) =>
        t.primaryAccountCode === acc.code ||
        t.contraAccountCode === acc.code ||
        (t.journalEntries && t.journalEntries.some((j) => j.accountCode === acc.code))
    );
    if (hasTrx) {
      return { canDelete: false, reason: 'Memiliki riwayat transaksi aktif' };
    }
    return { canDelete: true, reason: '' };
  };

  // Filtered Accounts for COA Tab
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (coaFilterType !== 'ALL' && acc.type !== coaFilterType) return false;
      if (coaFilterHierarchy === 'PARENT' && acc.isSubAccount) return false;
      if (coaFilterHierarchy === 'SUB' && !acc.isSubAccount) return false;
      if (coaFilterCategory !== 'ALL' && acc.category !== coaFilterCategory) return false;
      if (coaSearchQuery.trim()) {
        const q = coaSearchQuery.toLowerCase();
        const matchCode = acc.code.toLowerCase().includes(q);
        const matchName = acc.name.toLowerCase().includes(q);
        const matchCategory = (acc.category || '').toLowerCase().includes(q);
        const matchDesc = (acc.description || '').toLowerCase().includes(q);
        const matchParent =
          (acc.parentCode || '').toLowerCase().includes(q) ||
          (acc.parentName || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchCategory && !matchDesc && !matchParent) return false;
      }
      return true;
    });
  }, [accounts, coaFilterType, coaFilterHierarchy, coaFilterCategory, coaSearchQuery]);

  const deletableFilteredAccounts = useMemo(() => {
    return filteredAccounts.filter((a) => getAccountDeletability(a).canDelete);
  }, [filteredAccounts, accounts, transactions]);

  const isAllAccountsSelected =
    deletableFilteredAccounts.length > 0 &&
    deletableFilteredAccounts.every((a) => selectedAccountCodes.includes(a.code));

  const isSomeAccountsSelected =
    deletableFilteredAccounts.some((a) => selectedAccountCodes.includes(a.code)) && !isAllAccountsSelected;

  const handleToggleSelectAllAccounts = () => {
    if (isAllAccountsSelected) {
      const deletableSet = new Set(deletableFilteredAccounts.map((a) => a.code));
      setSelectedAccountCodes((prev) => prev.filter((code) => !deletableSet.has(code)));
    } else {
      const combined = Array.from(
        new Set([...selectedAccountCodes, ...deletableFilteredAccounts.map((a) => a.code)])
      );
      setSelectedAccountCodes(combined);
    }
  };

  const handleToggleSelectAccount = (accountCode: string) => {
    setSelectedAccountCodes((prev) =>
      prev.includes(accountCode)
        ? prev.filter((code) => code !== accountCode)
        : [...prev, accountCode]
    );
  };

  const selectedAccountsData = useMemo(() => {
    const set = new Set(selectedAccountCodes);
    return accounts.filter((a) => set.has(a.code));
  }, [accounts, selectedAccountCodes]);

  const handleRequestBulkDeleteAccounts = () => {
    if (selectedAccountCodes.length === 0) return;

    const undeletable = selectedAccountsData.filter((a) => !getAccountDeletability(a).canDelete);
    if (undeletable.length > 0) {
      alert(
        `Terdapat ${undeletable.length} akun yang tidak dapat dihapus:\n` +
          undeletable.map((a) => `- [${a.code}] ${a.name}: ${getAccountDeletability(a).reason}`).join('\n')
      );
      return;
    }

    setIsBulkDeleteAccountModalOpen(true);
  };

  const handleExecuteBulkDeleteAccounts = (reason: string) => {
    const codesToDelete = [...selectedAccountCodes];
    const count = codesToDelete.length;
    const codesList = codesToDelete.join(', ');

    if (onBatchDeleteAccounts) {
      onBatchDeleteAccounts(codesToDelete);
    } else if (onDeleteAccount) {
      codesToDelete.forEach((code) => onDeleteAccount(code));
    }

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Staff',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'DELETE',
        module: 'Bagan Akun (COA)',
        recordId: codesToDelete.slice(0, 5).join(','),
        recordCode: `${count} Akun COA`,
        description: `Hapus Masal ${count} Akun COA (${codesList}) via Verifikasi PIN Otorisasi. Alasan: ${reason}`
      });
    }

    setSelectedAccountCodes([]);
    setIsBulkDeleteAccountModalOpen(false);
    setJournalActionNotice({
      type: 'success',
      message: `Berhasil menghapus ${count} akun COA terpilih secara masal.`
    });
    setTimeout(() => setJournalActionNotice(null), 5000);
  };

  // Total Accounts Metrics
  const coaMetrics = useMemo(() => {
    const totalCount = accounts.length;
    const parentCount = accounts.filter((a) => !a.isSubAccount).length;
    const subCount = accounts.filter((a) => a.isSubAccount).length;
    const totalAssetBalance = accounts
      .filter((a) => a.type === 'Asset')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalCashBankBalance = accounts
      .filter((a) => a.category === 'Kas & Bank')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    return {
      totalCount,
      parentCount,
      subCount,
      totalAssetBalance,
      totalCashBankBalance
    };
  }, [accounts]);

  // Export Chart of Accounts to CSV (with Sub COA hierarchy support)
  const handleExportCOACSV = () => {
    const headers = [
      'Kode Akun',
      'Nama Akun',
      'Tipe Akun',
      'Hirarki',
      'Kode Akun Induk',
      'Nama Akun Induk',
      'Kategori Laporan (PSAK)',
      'Saldo Normal',
      'Saldo Berjalan (Rp)',
      'Status',
      'Keterangan'
    ];
    const rows = accounts.map((acc) => [
      acc.code,
      acc.name,
      acc.type,
      acc.isSubAccount ? 'Sub COA' : 'Akun Utama (Induk)',
      acc.parentCode || '-',
      acc.parentName || '-',
      acc.category,
      acc.normalBalance,
      acc.currentBalance,
      acc.isActive ? 'Aktif' : 'Nonaktif',
      acc.description || ''
    ]);
    financeService.exportToCSV('Bagan_Akun_COA_PSAK_Rajawali', headers, rows);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header & Fast Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Pencatatan Kas & Jurnal Umum (COA)
                </h1>
                <p className="text-xs text-slate-400">
                  Input uang masuk/keluar, buku besar otomatis, jurnal penyesuaian, dan neraca saldo PSAK
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  primaryAccountCode: '1120',
                  contraAccountCode: '4110'
                }));
                setIsCashInModalOpen(true);
              }}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>+ Uang Masuk (BKM)</span>
            </button>

            <button
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  primaryAccountCode: '1120',
                  contraAccountCode: '5110'
                }));
                setIsCashOutModalOpen(true);
              }}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
            >
              <TrendingDown className="w-4 h-4" />
              <span>+ Uang Keluar (BKK)</span>
            </button>

            <button
              onClick={() => setIsJournalModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>+ Jurnal Umum / Penyesuaian</span>
            </button>

            <button
              onClick={() => setIsDepreciationModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Hitung & posting penyusutan mesin scrubber dan aset"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Penyusutan Otomatis</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Uang Masuk</span>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5">
              {financeService.formatRupiah(metrics.totalIn)}
            </div>
            <span className="text-[10px] text-slate-500">{metrics.inCount} Transaksi</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Uang Keluar</span>
            <div className="text-base font-extrabold text-rose-400 mt-0.5">
              {financeService.formatRupiah(metrics.totalOut)}
            </div>
            <span className="text-[10px] text-slate-500">{metrics.outCount} Transaksi</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Arus Kas Bersih (Net)</span>
            <div
              className={`text-base font-extrabold mt-0.5 ${
                metrics.netCash >= 0 ? 'text-blue-400' : 'text-rose-400'
              }`}
            >
              {financeService.formatRupiah(metrics.netCash)}
            </div>
            <span className="text-[10px] text-slate-500">Saldo Kas & Bank</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Neraca Saldo Status</span>
            <div className="flex items-center space-x-1.5 text-xs font-extrabold mt-1">
              {trialBalance.isBalanced ? (
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SEIMBANG (OK)</span>
                </span>
              ) : (
                <span className="text-rose-400 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>SELISIH</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              D/K: {financeService.formatRupiah(trialBalance.totalDebit)}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Chart of Accounts</span>
            <div className="text-base font-extrabold text-amber-400 mt-0.5">
              {accounts.length} Akun PSAK
            </div>
            <span className="text-[10px] text-slate-500">Bagan Akun Terstandar</span>
          </div>
        </div>
      </div>

      {/* Global Notification Banner */}
      {journalActionNotice && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border animate-in slide-in-from-top-2 shadow-lg ${
            journalActionNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : journalActionNotice.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
          }`}
        >
          <div className="flex items-center space-x-3 text-xs font-semibold">
            {journalActionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{journalActionNotice.message}</span>
          </div>
          <button
            onClick={() => setJournalActionNotice(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'transactions'
              ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-950" />
          <span className="text-amber-950 font-black">Daftar Transaksi Kas & Bank</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('journals')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'journals'
              ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-950" />
          <span className="text-amber-950 font-black">Jurnal Umum (General Journal)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-950" />
          <span className="text-amber-950 font-black">Buku Besar (General Ledger)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('trial_balance')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'trial_balance'
              ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-4 h-4 text-amber-950" />
          <span className="text-amber-950 font-black">Neraca Saldo (Trial Balance)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('coa')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'coa'
              ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-950" />
          <span className="text-amber-950 font-black">Bagan Akun (COA Standar)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: DAFTAR TRANSAKSI KAS & BANK */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari deskripsi, no faktur, kuitansi, atau pihak ketiga..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Semua Jenis Transaksi</option>
                <option value="IN">Uang Masuk (BKM)</option>
                <option value="OUT">Uang Keluar (BKK)</option>
                <option value="JOURNAL">Jurnal Umum</option>
                <option value="ADJUSTMENT">Jurnal Penyesuaian</option>
              </select>

              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 max-w-[200px]"
              >
                <option value="ALL">Semua Lokasi Project (Cost Center)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={filterBankStatus}
                onChange={(e) => setFilterBankStatus(e.target.value as 'ALL' | 'RECONCILED' | 'UNRECONCILED')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                title="Filter berdasarkan status rekonsiliasi bank"
              >
                <option value="ALL">Semua Status Bank</option>
                <option value="RECONCILED">🟢 Reconciled (Sesuai Bank)</option>
                <option value="UNRECONCILED">🟡 Unreconciled (Belum Sesuai)</option>
              </select>

              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
                />
                <span className="text-slate-500 text-xs">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
                />
              </div>

              {/* Download Transactions as CSV */}
              <button
                id="download-transactions-csv-btn"
                data-testid="download-as-csv-btn"
                onClick={handleExportTransactionsCSV}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white font-bold text-xs border border-emerald-600/50 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                title="Download seluruh mutasi kas dan jurnal dalam format CSV untuk Excel atau Google Sheets"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Download as CSV</span>
              </button>
            </div>

            {(searchQuery || filterType !== 'ALL' || filterProject !== 'ALL' || filterBankStatus !== 'ALL' || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('ALL');
                  setFilterProject('ALL');
                  setFilterBankStatus('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-slate-400 hover:text-amber-400 px-3 py-1.5 rounded-lg bg-slate-800 text-center cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Bulk Action Bar for Transactions */}
          {selectedTrxIds.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-rose-950 text-sm">
                      {selectedTrxIds.length} Transaksi Terpilih
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono text-xs font-bold border border-rose-300">
                      Total: {financeService.formatRupiah(selectedTrxTotalAmount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Mode hapus masal aktif. Hapus transaksi terpilih secara permanen dengan otorisasi PIN keamanan.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTrxIds([])}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-xs"
                >
                  Batalkan Pilihan
                </button>
                <button
                  type="button"
                  onClick={handleRequestBulkDeleteTransactions}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 !text-white" />
                  <span className="!text-white">Hapus Masal ({selectedTrxIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isAllTrxSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isSomeTrxSelected;
                        }}
                        onChange={handleToggleSelectAllTrx}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        title={isAllTrxSelected ? 'Batalkan pilihan semua' : 'Pilih semua transaksi pada halaman ini'}
                      />
                    </th>
                    <th className="p-3.5">Tanggal / No Bukti</th>
                    <th className="p-3.5">Jenis / Akun COA</th>
                    <th className="p-3.5">Keterangan & Rincian</th>
                    <th className="p-3.5">Cost Center (Lokasi)</th>
                    <th className="p-3.5 text-right">Nominal (Rp)</th>
                    <th className="p-3.5 text-center">Status Bank</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Tidak ada transaksi yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((trx) => {
                      const primaryAcc = accounts.find((a) => a.code === trx.primaryAccountCode);
                      const contraAcc = accounts.find((a) => a.code === trx.contraAccountCode);
                      const isSelected = selectedTrxIds.includes(trx.id);

                      return (
                        <tr
                          key={trx.id}
                          className={`hover:bg-slate-800/50 transition-colors group cursor-pointer ${
                            isSelected ? 'bg-rose-950/20' : ''
                          }`}
                          onClick={() => setViewTransactionDetail(trx)}
                        >
                          <td className="p-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectTrx(trx.id)}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-white font-mono">{trx.code}</div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{trx.date}</span>
                            </div>
                            {trx.referenceNumber && (
                              <div className="text-[10px] text-amber-400/90 font-mono">
                                Ref: {trx.referenceNumber}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center space-x-1.5">
                              {trx.type === 'IN' && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                                  UANG MASUK
                                </span>
                              )}
                              {trx.type === 'OUT' && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-bold text-[10px] border border-rose-500/30">
                                  UANG KELUAR
                                </span>
                              )}
                              {trx.type === 'JOURNAL' && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold text-[10px] border border-blue-500/30">
                                  JURNAL UMUM
                                </span>
                              )}
                              {trx.type === 'ADJUSTMENT' && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold text-[10px] border border-purple-500/30">
                                  PENYESUAIAN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1 font-medium truncate max-w-[200px]">
                              {primaryAcc?.code} {primaryAcc?.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              vs {contraAcc?.code} {contraAcc?.name}
                            </div>
                          </td>

                          <td className="p-3.5 max-w-[280px]">
                            <div className="font-semibold text-white truncate">{trx.title}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {trx.description || '-'}
                            </div>
                            {trx.payeeOrPayer && (
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                Pihak: {trx.payeeOrPayer}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center space-x-1 text-slate-300">
                              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{trx.projectName || 'Seluruh Site (HQ)'}</span>
                            </div>
                            <div className="text-[10px] text-amber-500/80 font-medium mt-0.5">
                              Unit: {trx.division || 'Cleaning Service'}
                            </div>
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold">
                            <span
                              className={
                                trx.type === 'IN'
                                  ? 'text-emerald-400'
                                  : trx.type === 'OUT'
                                  ? 'text-rose-400'
                                  : 'text-blue-400'
                              }
                            >
                              {trx.type === 'IN' ? '+' : trx.type === 'OUT' ? '-' : ''}
                              {financeService.formatRupiah(trx.amount)}
                            </span>
                            <div className="text-[10px] text-slate-500">{trx.paymentMethod}</div>
                          </td>

                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            {trx.isReconciled ? (
                              <button
                                type="button"
                                onClick={() => handleOpenReconcileModal(trx)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                                title="Status Bank: Reconciled (Sesuai Bank). Klik untuk melihat rincian rekonsiliasi atau mengubah status."
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Reconciled</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReconcileModal(trx)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[11px] font-bold border border-amber-500/40 shadow-sm transition-all cursor-pointer group"
                                title="Status Bank: Unreconciled (Belum Sesuai). Klik untuk melihat detail & sesuaikan status ke Reconciled."
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-400 group-hover:text-slate-950" />
                                <span>Unreconciled</span>
                              </button>
                            )}
                          </td>

                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setViewTransactionDetail(trx)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                                title="Lihat Detail Jurnal"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {onUpdateTransaction && (
                                <button
                                  onClick={() => handleOpenEditTransaction(trx)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
                                  title="Edit & Perbaiki Transaksi"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteTransaction && (
                                <button
                                  onClick={() => setTransactionToDelete(trx)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                                  title="Hapus Transaksi (Memerlukan PIN Keamanan)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: JURNAL UMUM (GENERAL JOURNAL) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'journals' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter Bar for Journals */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari voucher jurnal, deskripsi akun, atau no bukti..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Semua Tipe Jurnal</option>
                <option value="JOURNAL">Jurnal Umum (Memorial)</option>
                <option value="ADJUSTMENT">Jurnal Penyesuaian (AJP)</option>
                <option value="IN">Jurnal Penerimaan Kas (BKM)</option>
                <option value="OUT">Jurnal Pengeluaran Kas (BKK)</option>
              </select>

              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 max-w-[200px]"
              >
                <option value="ALL">Semua Cost Center (Proyek)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
                />
                <span className="text-slate-500 text-xs">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
                />
              </div>

              <button
                onClick={handleExportTransactionsCSV}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white font-bold text-xs border border-emerald-600/50 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                title="Download seluruh jurnal umum dalam format CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Export CSV</span>
              </button>
            </div>

            {(searchQuery || filterType !== 'ALL' || filterProject !== 'ALL' || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('ALL');
                  setFilterProject('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-slate-400 hover:text-amber-400 px-3 py-1.5 rounded-lg bg-slate-800 text-center cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Bulk Action Bar for General Journal */}
          {selectedTrxIds.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-rose-950 text-sm">
                      {selectedTrxIds.length} Voucher Jurnal Terpilih
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-mono text-xs font-bold border border-rose-300">
                      Total: {financeService.formatRupiah(selectedTrxTotalAmount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Hapus masal voucher jurnal umum terpilih secara permanen dengan otorisasi PIN keamanan.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTrxIds([])}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Batalkan Pilihan
                </button>
                <button
                  type="button"
                  onClick={handleRequestBulkDeleteTransactions}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Masal ({selectedTrxIds.length} Jurnal)</span>
                </button>
              </div>
            </div>
          )}

          {/* General Journal Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isAllTrxSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isSomeTrxSelected;
                        }}
                        onChange={handleToggleSelectAllTrx}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        title={isAllTrxSelected ? 'Batalkan pilihan semua' : 'Pilih semua jurnal pada filter ini'}
                      />
                    </th>
                    <th className="p-3.5 w-36">Tanggal / No Bukti</th>
                    <th className="p-3.5">Akun COA & Keterangan Ayat Jurnal</th>
                    <th className="p-3.5 w-28 text-center">Ref (COA)</th>
                    <th className="p-3.5 w-32 text-right">Debit (Rp)</th>
                    <th className="p-3.5 w-32 text-right">Kredit (Rp)</th>
                    <th className="p-3.5 w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Tidak ada voucher jurnal yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((trx) => {
                      const isSelected = selectedTrxIds.includes(trx.id);

                      // Build balanced lines for this journal voucher
                      let journalRows: { code: string; name: string; debit: number; credit: number }[] = [];
                      if (trx.journalEntries && trx.journalEntries.length > 0) {
                        journalRows = trx.journalEntries.map((j) => {
                          const acc = accounts.find((a) => a.code === j.accountCode);
                          return {
                            code: j.accountCode,
                            name: acc ? acc.name : j.accountCode,
                            debit: j.debit || 0,
                            credit: j.credit || 0
                          };
                        });
                      } else if (trx.type === 'IN') {
                        const prim = accounts.find((a) => a.code === trx.primaryAccountCode);
                        const cont = accounts.find((a) => a.code === trx.contraAccountCode);
                        journalRows = [
                          { code: trx.primaryAccountCode, name: prim ? prim.name : trx.primaryAccountCode, debit: trx.amount, credit: 0 },
                          { code: trx.contraAccountCode, name: cont ? cont.name : trx.contraAccountCode, debit: 0, credit: trx.amount }
                        ];
                      } else {
                        const prim = accounts.find((a) => a.code === trx.primaryAccountCode);
                        const cont = accounts.find((a) => a.code === trx.contraAccountCode);
                        journalRows = [
                          { code: trx.contraAccountCode, name: cont ? cont.name : trx.contraAccountCode, debit: trx.amount, credit: 0 },
                          { code: trx.primaryAccountCode, name: prim ? prim.name : trx.primaryAccountCode, debit: 0, credit: trx.amount }
                        ];
                      }

                      const totalDebitRow = journalRows.reduce((s, r) => s + r.debit, 0);
                      const totalCreditRow = journalRows.reduce((s, r) => s + r.credit, 0);
                      const isBalanced = Math.abs(totalDebitRow - totalCreditRow) < 1;

                      return (
                        <tr
                          key={trx.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-3.5 w-10 text-center align-top" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectTrx(trx.id)}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer mt-1"
                            />
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="font-bold text-white font-mono">{trx.code}</div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{trx.date}</span>
                            </div>
                            {trx.referenceNumber && (
                              <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                                Ref: {trx.referenceNumber}
                              </div>
                            )}
                            <div className="mt-1">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  trx.type === 'IN'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : trx.type === 'OUT'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}
                              >
                                {trx.type === 'IN' ? 'BKM' : trx.type === 'OUT' ? 'BKK' : 'JURNAL'}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 align-top" colSpan={4}>
                            <div className="text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                              <span>{trx.title}</span>
                              {trx.projectName && (
                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  {trx.projectName}
                                </span>
                              )}
                            </div>

                            {/* Double-Entry Sub-lines */}
                            <div className="space-y-1 bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
                              {journalRows.map((jr, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center text-xs py-0.5 ${
                                    jr.credit > 0 ? 'pl-6 text-slate-300' : 'text-slate-100 font-medium'
                                  }`}
                                >
                                  <div className="flex-1 truncate">
                                    <span>{jr.name}</span>
                                  </div>
                                  <div className="w-24 text-center font-mono text-[11px] text-slate-400">
                                    {jr.code}
                                  </div>
                                  <div className="w-32 text-right font-mono text-emerald-400">
                                    {jr.debit > 0 ? financeService.formatRupiah(jr.debit) : '-'}
                                  </div>
                                  <div className="w-32 text-right font-mono text-rose-400">
                                    {jr.credit > 0 ? financeService.formatRupiah(jr.credit) : '-'}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {!isBalanced && (
                              <div className="mt-1 text-[10px] text-rose-400 font-bold flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Perhatian: Ayat jurnal tidak seimbang (Selisih: {financeService.formatRupiah(Math.abs(totalDebitRow - totalCreditRow))})</span>
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 align-top text-center">
                            <div className="flex items-center justify-center space-x-1 mt-1">
                              <button
                                type="button"
                                onClick={() => setViewTransactionDetail(trx)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Lihat detail lengkap voucher jurnal"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {onUpdateTransaction && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTransaction(trx)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                                  title="Edit & Perbaiki Voucher Jurnal"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteTransaction && (
                                <button
                                  type="button"
                                  onClick={() => setTransactionToDelete(trx)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer"
                                  title="Hapus voucher jurnal ini (Memerlukan PIN Keamanan)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-300">Pilih Akun Buku Besar:</label>
              <select
                value={selectedLedgerAccountCode}
                onChange={(e) => setSelectedLedgerAccountCode(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500 min-w-[280px]"
              >
                {accounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name} ({acc.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="download-ledger-csv-btn"
                data-testid="download-as-csv-btn"
                onClick={handleExportLedgerCSV}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white font-bold text-xs border border-emerald-600/50 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                title="Download buku besar akun aktif dalam format CSV untuk Excel atau Google Sheets"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Download as CSV</span>
              </button>
            </div>
          </div>

          {activeLedger && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              {/* Account Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-sm">
                      {activeLedger.account.code}
                    </span>
                    <h2 className="text-base font-bold text-white">{activeLedger.account.name}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Kategori: <strong className="text-slate-300">{activeLedger.account.category}</strong> |
                    Saldo Normal:{' '}
                    <strong className="text-slate-300">{activeLedger.account.normalBalance}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-4 bg-slate-950 p-3 rounded-xl border border-slate-800 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Saldo Awal</span>
                    <div className="text-xs font-bold text-slate-300">
                      {financeService.formatRupiah(activeLedger.initialBalance)}
                    </div>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <span className="text-[10px] text-slate-400 uppercase">Saldo Akhir</span>
                    <div className="text-sm font-extrabold text-emerald-400">
                      {financeService.formatRupiah(activeLedger.endingBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">No Bukti</th>
                      <th className="p-3">Keterangan Jurnal</th>
                      <th className="p-3">Lokasi / Proyek</th>
                      <th className="p-3 text-right">Debit (Rp)</th>
                      <th className="p-3 text-right">Kredit (Rp)</th>
                      <th className="p-3 text-right">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr className="bg-slate-950/40 text-slate-400 italic">
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3 font-medium">Saldo Awal Periode</td>
                      <td className="p-3">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-300">
                        {financeService.formatRupiah(activeLedger.initialBalance)}
                      </td>
                    </tr>

                    {activeLedger.entries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">
                          Belum ada mutasi transaksi untuk akun ini pada periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      activeLedger.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-slate-400">{entry.date}</td>
                          <td className="p-3 font-mono font-semibold text-amber-400">
                            {entry.transactionCode}
                          </td>
                          <td className="p-3 text-white font-medium max-w-[280px] truncate">
                            {entry.description}
                          </td>
                          <td className="p-3 text-slate-400">{entry.projectName || '-'}</td>
                          <td className="p-3 text-right font-mono text-emerald-400">
                            {entry.debit > 0 ? financeService.formatRupiah(entry.debit) : '-'}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-400">
                            {entry.credit > 0 ? financeService.formatRupiah(entry.credit) : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">
                            {financeService.formatRupiah(entry.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-950 font-bold text-white border-t-2 border-slate-700">
                    <tr>
                      <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-[11px]">
                        Total Mutasi & Saldo Akhir:
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-400">
                        {financeService.formatRupiah(activeLedger.totalDebit)}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-400">
                        {financeService.formatRupiah(activeLedger.totalCredit)}
                      </td>
                      <td className="p-3 text-right font-mono text-amber-400 text-sm">
                        {financeService.formatRupiah(activeLedger.endingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: NERACA SALDO (TRIAL BALANCE) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'trial_balance' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <span>Neraca Saldo (Trial Balance)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Memverifikasi kesetaraan total saldo Debit dan Kredit seluruh akun sebelum penerbitan laporan
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="download-trial-balance-csv-btn"
                  data-testid="download-as-csv-btn"
                  onClick={handleExportTrialBalanceCSV}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white font-bold text-xs border border-emerald-600/50 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                  title="Download seluruh neraca saldo akun dalam format CSV untuk Excel atau Google Sheets"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Download as CSV</span>
                </button>

                <button
                  onClick={() => {
                    const headers = ['Kode Akun', 'Nama Akun', 'Kategori', 'Debit (Rp)', 'Kredit (Rp)'];
                    const rows = trialBalance.rows.map((r) => [
                      r.accountCode,
                      r.accountName,
                      r.category,
                      r.debitBalance > 0 ? financeService.formatRupiah(r.debitBalance) : '-',
                      r.creditBalance > 0 ? financeService.formatRupiah(r.creditBalance) : '-'
                    ]);
                    rows.push([
                      'TOTAL',
                      'TOTAL SELURUH AKUN',
                      '-',
                      financeService.formatRupiah(trialBalance.totalDebit),
                      financeService.formatRupiah(trialBalance.totalCredit)
                    ]);
                    financeService.exportFinancialStatementPDF(
                      'Neraca Saldo (Trial Balance)',
                      new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                      headers,
                      rows
                    );
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* Balance Status Banner */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between mb-4 ${
                trialBalance.isBalanced
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {trialBalance.isBalanced ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <div className="font-bold text-xs">
                    {trialBalance.isBalanced
                      ? 'NERACA SALDO SEIMBANG (BALANCED)'
                      : 'PERINGATAN: NERACA SALDO TIDAK SEIMBANG'}
                  </div>
                  <div className="text-[11px] opacity-80">
                    Total Debit:{' '}
                    <strong>{financeService.formatRupiah(trialBalance.totalDebit)}</strong> | Total Kredit:{' '}
                    <strong>{financeService.formatRupiah(trialBalance.totalCredit)}</strong>
                  </div>
                </div>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-slate-900 border border-slate-700">
                {trialBalance.isBalanced
                  ? 'Keseimbangan 100%'
                  : `Selisih: ${financeService.formatRupiah(
                      Math.abs(trialBalance.totalDebit - trialBalance.totalCredit)
                    )}`}
              </span>
            </div>

            {/* Trial Balance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Kode</th>
                    <th className="p-3">Nama Akun</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-right">Debit (Rp)</th>
                    <th className="p-3 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {trialBalance.rows.map((row) => (
                    <tr key={row.accountCode} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-400">{row.accountCode}</td>
                      <td className="p-3 font-semibold text-white">{row.accountName}</td>
                      <td className="p-3 text-slate-400">{row.category}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-medium">
                        {row.debitBalance > 0 ? financeService.formatRupiah(row.debitBalance) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-400 font-medium">
                        {row.creditBalance > 0 ? financeService.formatRupiah(row.creditBalance) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 font-bold text-white border-t-2 border-slate-600">
                  <tr>
                    <td colSpan={3} className="p-3 text-right uppercase tracking-wider">
                      TOTAL NERACA SALDO:
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 text-sm">
                      {financeService.formatRupiah(trialBalance.totalDebit)}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-400 text-sm">
                      {financeService.formatRupiah(trialBalance.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: BAGAN AKUN (CHART OF ACCOUNTS / COA & SUB COA) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'coa' && (
        <div className="space-y-4">
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Bagan Akun</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">{coaMetrics.totalCount} <span className="text-xs font-normal text-slate-500">Akun</span></div>
              <div className="text-[10px] text-slate-500 mt-1">Struktur COA Aktif PSAK</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Akun Utama (Induk)</span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-black text-blue-400">{coaMetrics.parentCount} <span className="text-xs font-normal text-slate-500">Header</span></div>
              <div className="text-[10px] text-slate-500 mt-1">Akun Utama Level 1</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Sub-Akun (Sub COA)</span>
                <GitBranch className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400">{coaMetrics.subCount} <span className="text-xs font-normal text-slate-500">Rincian</span></div>
              <div className="text-[10px] text-slate-500 mt-1">Sub-Pos, Proyek & Bank</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Kas & Bank Berjalan</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm sm:text-base font-black text-emerald-400 font-mono truncate">
                {financeService.formatRupiah(coaMetrics.totalCashBankBalance)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Likuiditas Lancar</div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Nilai Aset</span>
                <Scale className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-sm sm:text-base font-black text-purple-300 font-mono truncate">
                {financeService.formatRupiah(coaMetrics.totalAssetBalance)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Total Aktiva Terdaftar</div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            {/* Header & Main Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Bagan Akun Standar (Chart of Accounts & Sub COA - PSAK)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Kelola struktur akun induk dan sub-akun turunan untuk klasifikasi rincian per bank, cabang, divisi, atau pos beban
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="download-coa-csv-btn"
                  data-testid="download-as-csv-btn"
                  onClick={handleExportCOACSV}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                  title="Download daftar COA & Sub COA lengkap format CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download CSV</span>
                </button>

                <button
                  onClick={() => handleOpenAddCoaModal('PARENT')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Akun Utama (Induk)</span>
                </button>

                <button
                  onClick={() => handleOpenAddCoaModal('SUB')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/40 transition-all cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>+ Tambah Sub COA</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari kode, nama akun, sub COA, kategori..."
                    value={coaSearchQuery}
                    onChange={(e) => setCoaSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {coaSearchQuery && (
                    <button
                      onClick={() => setCoaSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tipe */}
                <select
                  value={coaFilterType}
                  onChange={(e) => setCoaFilterType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Tipe Akun</option>
                  <option value="Asset">Asset (Aset & Kas)</option>
                  <option value="Liability">Liability (Liabilitas & Utang)</option>
                  <option value="Equity">Equity (Ekuitas & Modal)</option>
                  <option value="Revenue">Revenue (Pendapatan)</option>
                  <option value="Expense">Expense (Beban & HPP)</option>
                </select>

                {/* Filter Hirarki */}
                <select
                  value={coaFilterHierarchy}
                  onChange={(e) => setCoaFilterHierarchy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Hirarki</option>
                  <option value="PARENT">Hanya Akun Utama (Induk)</option>
                  <option value="SUB">Hanya Sub-Akun (Sub COA)</option>
                </select>

                {/* Filter Kategori */}
                <select
                  value={coaFilterCategory}
                  onChange={(e) => setCoaFilterCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 max-w-[180px] truncate"
                >
                  <option value="ALL">Semua Kategori</option>
                  {Array.from(new Set(accounts.map((a) => a.category))).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {(coaSearchQuery || coaFilterType !== 'ALL' || coaFilterHierarchy !== 'ALL' || coaFilterCategory !== 'ALL') && (
                  <button
                    onClick={() => {
                      setCoaSearchQuery('');
                      setCoaFilterType('ALL');
                      setCoaFilterHierarchy('ALL');
                      setCoaFilterCategory('ALL');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <div className="text-right text-[11px] text-slate-400 whitespace-nowrap self-center">
                Menampilkan <strong className="text-white">{filteredAccounts.length}</strong> dari <strong className="text-white">{accounts.length}</strong> akun
              </div>
            </div>

            {/* Bulk Action Bar for COA */}
            {selectedAccountCodes.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-rose-950 text-sm">
                        {selectedAccountCodes.length} Akun COA Terpilih
                      </span>
                      <span className="text-xs text-rose-800 font-mono font-bold">
                        ({selectedAccountCodes.join(', ')})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Hapus akun COA kustom non-sistem terpilih sekaligus dengan otorisasi PIN keamanan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountCodes([])}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Batalkan Pilihan
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestBulkDeleteAccounts}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Masal ({selectedAccountCodes.length} Akun)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isAllAccountsSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isSomeAccountsSelected;
                        }}
                        onChange={handleToggleSelectAllAccounts}
                        disabled={deletableFilteredAccounts.length === 0}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer disabled:opacity-40"
                        title={
                          deletableFilteredAccounts.length === 0
                            ? 'Tidak ada akun kustom yang dapat dihapus pada filter ini'
                            : isAllAccountsSelected
                            ? 'Batalkan pilihan semua'
                            : 'Pilih semua akun kustom yang dapat dihapus'
                        }
                      />
                    </th>
                    <th className="p-3">Kode Akun</th>
                    <th className="p-3">Nama Akun & Struktur</th>
                    <th className="p-3">Tipe</th>
                    <th className="p-3">Kategori Laporan</th>
                    <th className="p-3 text-center">Saldo Normal</th>
                    <th className="p-3 text-right">Saldo Saat Ini</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-slate-400">Tidak ada akun yang sesuai dengan filter.</p>
                        <p className="text-[11px] text-slate-600 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isSub = !!acc.isSubAccount || !!acc.parentCode;
                      const hasSubAccounts = accounts.some((a) => a.parentCode === acc.code);
                      const deletability = getAccountDeletability(acc);
                      const isSelected = selectedAccountCodes.includes(acc.code);

                      return (
                        <tr
                          key={acc.code}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-rose-950/25' : isSub ? 'bg-slate-950/40' : ''
                          }`}
                        >
                          {/* Bulk Checkbox */}
                          <td className="p-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                            {deletability.canDelete ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectAccount(acc.code)}
                                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                title={`Pilih akun [${acc.code}] untuk hapus masal`}
                              />
                            ) : (
                              <span
                                className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-800/60 border border-slate-700/40 text-[9px] text-slate-600 cursor-not-allowed mx-auto"
                                title={`Tidak dapat dihapus: ${deletability.reason}`}
                              >
                                -
                              </span>
                            )}
                          </td>

                          {/* Kode */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {isSub && (
                                <span className="text-slate-600 ml-2">
                                  <CornerDownRight className="w-3.5 h-3.5 text-amber-500/70 inline" />
                                </span>
                              )}
                              <span
                                className={`font-mono font-extrabold ${
                                  isSub ? 'text-amber-300 text-[11px]' : 'text-amber-400 text-xs'
                                }`}
                              >
                                {acc.code}
                              </span>
                            </div>
                          </td>

                          {/* Nama Akun & Struktur */}
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${isSub ? 'text-slate-200' : 'text-white'}`}>
                                {acc.name}
                              </span>
                              {isSub ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[9px] font-semibold border border-amber-500/20">
                                  <GitBranch className="w-2.5 h-2.5" />
                                  <span>Sub: {acc.parentCode || 'Induk'}</span>
                                </span>
                              ) : hasSubAccounts ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[9px] font-semibold border border-blue-500/20">
                                  Induk
                                </span>
                              ) : null}
                            </div>
                            {acc.description && (
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {acc.description}
                              </div>
                            )}
                            {isSub && acc.parentName && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Induk: <span className="text-slate-300">{acc.parentCode} - {acc.parentName}</span>
                              </div>
                            )}
                          </td>

                          {/* Tipe */}
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                acc.type === 'Asset'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : acc.type === 'Liability'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : acc.type === 'Equity'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : acc.type === 'Revenue'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {acc.type}
                            </span>
                          </td>

                          {/* Kategori */}
                          <td className="p-3 text-slate-300 whitespace-nowrap">{acc.category}</td>

                          {/* Saldo Normal */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`font-semibold text-[11px] ${
                                acc.normalBalance === 'Debit' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {acc.normalBalance}
                            </span>
                          </td>

                          {/* Saldo Saat Ini */}
                          <td className="p-3 text-right font-mono font-bold text-white whitespace-nowrap">
                            {financeService.formatRupiah(acc.currentBalance)}
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {acc.isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              {!isSub && (
                                <button
                                  onClick={() => handleOpenAddCoaModal('SUB', acc.code)}
                                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                                  title={`Tambah Sub-Akun turunan di bawah ${acc.code} - ${acc.name}`}
                                >
                                  + Sub COA
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedLedgerAccountCode(acc.code);
                                  setActiveSubTab('ledger');
                                }}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Buka Buku Besar untuk akun ini"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEditCoaModal(acc)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                                title="Edit Akun COA"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {acc.isSystem ? (
                                <button
                                  disabled
                                  className="p-1 rounded-lg bg-slate-800/40 text-slate-600 cursor-not-allowed transition-colors"
                                  title="Akun standar sistem PSAK (tidak dapat dihapus)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setAccountToDelete(acc)}
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                  title="Hapus Akun"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INPUT UANG MASUK (BKM) */}
      {/* ------------------------------------------------------------- */}
      {isCashInModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Pencatatan Uang Masuk (BKM)</h3>
                  <p className="text-xs text-slate-400">Bukti Kas Masuk & Jurnal Penerimaan Otomatis</p>
                </div>
              </div>
              <button
                onClick={() => setIsCashInModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCashIn} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nominal Uang Masuk (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 15000000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Judul Penerimaan Kas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pembayaran Invoice Termin 1 Mall Gandaria City"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Masuk Ke Rekening / Kas (Debit) *
                  </label>
                  <select
                    value={formData.primaryAccountCode}
                    onChange={(e) => setFormData({ ...formData, primaryAccountCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {accounts
                      .filter((a) => a.category === 'Kas & Bank')
                      .map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Akun Sumber / Lawan (Kredit) *
                  </label>
                  <select
                    value={formData.contraAccountCode}
                    onChange={(e) => setFormData({ ...formData, contraAccountCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {accounts
                      .filter((a) => a.type === 'Revenue' || a.type === 'Liability' || a.type === 'Asset')
                      .map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Cost Center (Proyek / Site)
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Seluruh Lokasi (Kantor Pusat HQ)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Unit</label>
                  <select
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value as DivisionType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Cleaning Service">Cleaning Service</option>
                    <option value="Labor Supply">Labor Supply</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Parking Service">Parking Service</option>
                    <option value="Investment">Investment</option>
                    <option value="Lain - Lain">Lain - Lain</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Metode Rekening Pembayaran *
                    </label>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {createIsManualPayment ? 'Manual' : 'Rekening Resmi'}
                    </span>
                  </div>
                  <select
                    value={
                      createPaymentMethodSelection ||
                      (registeredBankAccounts[0]
                        ? `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`
                        : '')
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreatePaymentMethodSelection(val);
                      if (val === '__MANUAL__') {
                        setCreateIsManualPayment(true);
                      } else {
                        setCreateIsManualPayment(false);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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

                  {createIsManualPayment && (
                    <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Kas Tunai HQ, Kas Operasional Lapangan, dll."
                        value={createManualPaymentMethod}
                        onChange={(e) => setCreateManualPaymentMethod(e.target.value)}
                        className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-medium"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Diterima Dari (Klien / Pihak Ketiga)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PT Pakuwon Jati Tbk"
                    value={formData.payeeOrPayer}
                    onChange={(e) => setFormData({ ...formData, payeeOrPayer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  No Faktur / Invoice / Kuitansi
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV/2026/08/MGC-01"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Catatan Tambahan & Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan detail pekerjaan atau termin pembayaran..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Journal Preview */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">
                  Otomatis Menghasilkan Jurnal Double-Entry:
                </div>
                <div className="flex justify-between text-emerald-400 font-mono">
                  <span>(D) Akun {formData.primaryAccountCode}</span>
                  <span>{financeService.formatRupiah(Number(formData.amount) || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono pl-4">
                  <span>(K) Akun {formData.contraAccountCode}</span>
                  <span>{financeService.formatRupiah(Number(formData.amount) || 0)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashInModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  Simpan Uang Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INPUT UANG KELUAR (BKK) */}
      {/* ------------------------------------------------------------- */}
      {isCashOutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Pencatatan Uang Keluar (BKK)</h3>
                  <p className="text-xs text-slate-400">Bukti Kas Keluar & Pengeluaran Beban Operasional</p>
                </div>
              </div>
              <button
                onClick={() => setIsCashOutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCashOut} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nominal Uang Keluar (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 4500000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Keperluan / Judul Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pembelian 30 Jerigen Karbol Pinus & MPC PT Chemco"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Alokasi Akun Beban / HPP (Debit) *
                  </label>
                  <select
                    value={formData.contraAccountCode}
                    onChange={(e) => setFormData({ ...formData, contraAccountCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {accounts
                      .filter((a) => a.type === 'Expense' || a.type === 'Liability' || a.type === 'Asset')
                      .map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Sumber Kas / Bank Pembayar (Kredit) *
                  </label>
                  <select
                    value={formData.primaryAccountCode}
                    onChange={(e) => setFormData({ ...formData, primaryAccountCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {accounts
                      .filter((a) => a.category === 'Kas & Bank')
                      .map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Cost Center (Beban Proyek / Site)
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="ALL">Seluruh Lokasi (Kantor Pusat HQ)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Unit</label>
                  <select
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value as DivisionType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Cleaning Service">Cleaning Service</option>
                    <option value="Labor Supply">Labor Supply</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Parking Service">Parking Service</option>
                    <option value="Investment">Investment</option>
                    <option value="Lain - Lain">Lain - Lain</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Metode Rekening Pembayaran *
                    </label>
                    <span className="text-[10px] text-rose-400 font-medium">
                      {createIsManualPayment ? 'Manual' : 'Rekening Resmi'}
                    </span>
                  </div>
                  <select
                    value={
                      createPaymentMethodSelection ||
                      (registeredBankAccounts[0]
                        ? `${registeredBankAccounts[0].bankName} (${registeredBankAccounts[0].accountNumber})`
                        : '')
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreatePaymentMethodSelection(val);
                      if (val === '__MANUAL__') {
                        setCreateIsManualPayment(true);
                      } else {
                        setCreateIsManualPayment(false);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
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

                  {createIsManualPayment && (
                    <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Kas Tunai HQ, Kas Operasional Lapangan, dll."
                        value={createManualPaymentMethod}
                        onChange={(e) => setCreateManualPaymentMethod(e.target.value)}
                        className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 font-medium"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Dibayarkan Kepada (Vendor / Personil)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PT Chemco Prima Industri"
                    value={formData.payeeOrPayer}
                    onChange={(e) => setFormData({ ...formData, payeeOrPayer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  No Referensi / Kuitansi / PO
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-CHEM-8842"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Keterangan Lengkap & Spesifikasi
                </label>
                <textarea
                  rows={2}
                  placeholder="Detail barang atau keperluan pembelian..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Journal Preview */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">
                  Otomatis Menghasilkan Jurnal Double-Entry:
                </div>
                <div className="flex justify-between text-rose-400 font-mono">
                  <span>(D) Akun {formData.contraAccountCode}</span>
                  <span>{financeService.formatRupiah(Number(formData.amount) || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono pl-4">
                  <span>(K) Akun {formData.primaryAccountCode}</span>
                  <span>{financeService.formatRupiah(Number(formData.amount) || 0)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashOutModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 cursor-pointer"
                >
                  Simpan Uang Keluar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INPUT JURNAL UMUM / PENYESUAIAN MULTI-LINE */}
      {/* ------------------------------------------------------------- */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-3xl w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Posting Jurnal Umum & Penyesuaian (Multi-Line)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Input jurnal berpasangan akuntansi dengan verifikasi debit = kredit seimbang
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Tanggal Jurnal *
                  </label>
                  <input
                    type="date"
                    required
                    value={journalHeader.date}
                    onChange={(e) => setJournalHeader({ ...journalHeader, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Tipe Jurnal</label>
                  <select
                    value={journalHeader.isAdjusting ? 'ADJ' : 'GEN'}
                    onChange={(e) =>
                      setJournalHeader({ ...journalHeader, isAdjusting: e.target.value === 'ADJ' })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="GEN">Jurnal Umum (General Journal)</option>
                    <option value="ADJ">Jurnal Penyesuaian (Adjusting Entry / AJE)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    No Referensi / Memo
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MEMO-AJE-001"
                    value={journalHeader.referenceNumber}
                    onChange={(e) =>
                      setJournalHeader({ ...journalHeader, referenceNumber: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Keterangan / Judul Jurnal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Penyesuaian Beban Asuransi Dibayar Dimuka & Penyusutan"
                  value={journalHeader.title}
                  onChange={(e) => setJournalHeader({ ...journalHeader, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Multi-line journal entry builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Rincian Baris Debit & Kredit:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setJournalLines([
                        ...journalLines,
                        {
                          id: String(Date.now()),
                          accountCode: accounts[0]?.code || '1110',
                          debit: 0,
                          credit: 0,
                          notes: ''
                        }
                      ])
                    }
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded bg-slate-800"
                  >
                    + Tambah Baris Akun
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {journalLines.map((line, idx) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-12 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 items-center"
                    >
                      <div className="col-span-5">
                        <select
                          value={line.accountCode}
                          onChange={(e) => {
                            const next = [...journalLines];
                            next[idx].accountCode = e.target.value;
                            setJournalLines(next);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          {accounts.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Debit (Rp)"
                          value={line.debit || ''}
                          onChange={(e) => {
                            const next = [...journalLines];
                            next[idx].debit = Number(e.target.value) || 0;
                            if (next[idx].debit > 0) next[idx].credit = 0;
                            setJournalLines(next);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Kredit (Rp)"
                          value={line.credit || ''}
                          onChange={(e) => {
                            const next = [...journalLines];
                            next[idx].credit = Number(e.target.value) || 0;
                            if (next[idx].credit > 0) next[idx].debit = 0;
                            setJournalLines(next);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-rose-400 font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        {journalLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setJournalLines(journalLines.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Balance Check */}
                {(() => {
                  const totalDebit = journalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
                  const totalCredit = journalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
                  const isBal = Math.abs(totalDebit - totalCredit) < 1 && totalDebit > 0;

                  return (
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isBal
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {isBal ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span>
                          Total Debit: <strong>{financeService.formatRupiah(totalDebit)}</strong> | Total Kredit:{' '}
                          <strong>{financeService.formatRupiah(totalCredit)}</strong>
                        </span>
                      </div>
                      <span className="font-bold">
                        {isBal
                          ? 'SEIMBANG'
                          : `Selisih: ${financeService.formatRupiah(Math.abs(totalDebit - totalCredit))}`}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/40 cursor-pointer"
                >
                  Posting Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DETAIL TRANSAKSI & JURNAL ENTRY */}
      {/* ------------------------------------------------------------- */}
      {viewTransactionDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                  {viewTransactionDetail.code}
                </span>
                <h3 className="font-bold text-white text-base mt-1.5">
                  {viewTransactionDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setViewTransactionDetail(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-500 text-[10px]">Tanggal Transaksi:</span>
                <div className="text-slate-200 font-semibold">{viewTransactionDetail.date}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Nominal Total:</span>
                <div className="text-emerald-400 font-bold font-mono text-sm">
                  {financeService.formatRupiah(viewTransactionDetail.amount)}
                </div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Metode Pembayaran:</span>
                <div className="text-slate-200">{viewTransactionDetail.paymentMethod}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Cost Center / Site:</span>
                <div className="text-slate-200">{viewTransactionDetail.projectName || 'HQ'}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Unit:</span>
                <div className="text-amber-400 font-semibold">{viewTransactionDetail.division || 'Cleaning Service'}</div>
              </div>
              {viewTransactionDetail.referenceNumber && (
                <div>
                  <span className="text-slate-500 text-[10px]">No Faktur / Ref:</span>
                  <div className="text-amber-400 font-mono font-semibold">
                    {viewTransactionDetail.referenceNumber}
                  </div>
                </div>
              )}
              {viewTransactionDetail.payeeOrPayer && (
                <div>
                  <span className="text-slate-500 text-[10px]">Pihak Terkait:</span>
                  <div className="text-slate-200">{viewTransactionDetail.payeeOrPayer}</div>
                </div>
              )}
              <div>
                <span className="text-slate-500 text-[10px]">Status Rekonsiliasi Bank:</span>
                <div className="mt-0.5">
                  {viewTransactionDetail.isReconciled ? (
                    <button
                      type="button"
                      onClick={() => {
                        const trx = viewTransactionDetail;
                        setViewTransactionDetail(null);
                        handleOpenReconcileModal(trx);
                      }}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                      title="Status Reconciled. Klik untuk melihat detail atau ubah status."
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span>Reconciled (Sesuai Bank)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const trx = viewTransactionDetail;
                        setViewTransactionDetail(null);
                        handleOpenReconcileModal(trx);
                      }}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[10px] font-bold border border-amber-500/40 shadow-sm transition-all cursor-pointer group"
                      title="Klik untuk verifikasi & ubah status ke Reconciled"
                    >
                      <Clock className="w-3 h-3 text-amber-400 group-hover:text-slate-950" />
                      <span>Unreconciled (Klik untuk Rekonsiliasi)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Journal Lines Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300">Struktur Jurnal Akuntansi:</h4>
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Akun COA</th>
                      <th className="p-2.5 text-right">Debit (Rp)</th>
                      <th className="p-2.5 text-right">Kredit (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                    {viewTransactionDetail.journalEntries.map((j) => (
                      <tr key={j.id}>
                        <td className="p-2.5">
                          <span className="text-amber-400 font-bold">{j.accountCode}</span>{' '}
                          <span className="text-slate-200">{j.accountName}</span>
                          {j.notes && <div className="text-[10px] text-slate-500">{j.notes}</div>}
                        </td>
                        <td className="p-2.5 text-right text-emerald-400">
                          {j.debit > 0 ? financeService.formatRupiah(j.debit) : '-'}
                        </td>
                        <td className="p-2.5 text-right text-rose-400">
                          {j.credit > 0 ? financeService.formatRupiah(j.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500">
              <span>Dibuat oleh: {viewTransactionDetail.createdBy}</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const trx = viewTransactionDetail;
                    setViewTransactionDetail(null);
                    handleOpenReconcileModal(trx);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                    viewTransactionDetail.isReconciled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                      : 'bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 shadow-emerald-950/20'
                  }`}
                  title="Buka panel verifikasi rekonsiliasi status bank"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{viewTransactionDetail.isReconciled ? 'Status Bank: Reconciled' : 'Rekonsiliasi Bank'}</span>
                </button>
                {onUpdateTransaction && (
                  <button
                    type="button"
                    onClick={() => {
                      const trx = viewTransactionDetail;
                      setViewTransactionDetail(null);
                      handleOpenEditTransaction(trx);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-semibold transition-colors cursor-pointer border border-amber-500/30"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Transaksi</span>
                  </button>
                )}
                <button
                  onClick={() => setViewTransactionDetail(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DETAIL & VERIFIKASI STATUS BANK (REKONSILIASI) */}
      {/* ------------------------------------------------------------- */}
      {reconcileModalTrx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-in zoom-in-95 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                      {reconcileModalTrx.code}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Verifikasi Mutasi Bank</span>
                  </div>
                  <h3 className="font-bold text-white text-base mt-0.5">
                    Detail & Status Rekonsiliasi Bank
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReconcileModalTrx(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Current Status Banner */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                reconcileModalTrx.isReconciled
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-amber-950/40 border-amber-500/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    reconcileModalTrx.isReconciled
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {reconcileModalTrx.isReconciled ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Status Bank Saat Ini:</div>
                  <div className="text-xs font-semibold text-slate-200">
                    {reconcileModalTrx.isReconciled
                      ? 'Telah Terverifikasi Sesuai dengan Rekening Koran'
                      : 'Belum Selesai Direkonsiliasi (Menunggu Verifikasi)'}
                  </div>
                </div>
              </div>
              <div>
                {reconcileModalTrx.isReconciled ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-950/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Reconciled</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unreconciled</span>
                  </span>
                )}
              </div>
            </div>

            {/* Transaction Detail Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>Rincian Pembukuan Transaksi:</span>
                <span className="text-amber-400 font-mono text-[11px]">{reconcileModalTrx.date}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 text-[10px]">Nominal Transaksi:</span>
                    <div
                      className={`font-mono font-bold text-base ${
                        reconcileModalTrx.type === 'IN'
                          ? 'text-emerald-400'
                          : reconcileModalTrx.type === 'OUT'
                          ? 'text-rose-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {reconcileModalTrx.type === 'IN' ? '+' : reconcileModalTrx.type === 'OUT' ? '-' : ''}
                      {financeService.formatRupiah(reconcileModalTrx.amount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Jenis & Tipe:</span>
                    <div className="mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                        {reconcileModalTrx.type === 'IN'
                          ? 'Uang Masuk (BKM)'
                          : reconcileModalTrx.type === 'OUT'
                          ? 'Uang Keluar (BKK)'
                          : 'Jurnal Umum'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Akun Kas & Bank:</span>
                    <div className="text-slate-200 font-semibold truncate">
                      {reconcileModalTrx.primaryAccountCode} -{' '}
                      {accounts.find((a) => a.code === reconcileModalTrx.primaryAccountCode)?.name || 'Kas & Bank'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Akun Lawan / Kategori:</span>
                    <div className="text-slate-300 truncate">
                      {reconcileModalTrx.contraAccountCode} -{' '}
                      {accounts.find((a) => a.code === reconcileModalTrx.contraAccountCode)?.name || 'Akun Lawan'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Metode Pembayaran:</span>
                    <div className="text-slate-200">{reconcileModalTrx.paymentMethod}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">No. Referensi / No. Faktur:</span>
                    <div className="text-amber-400 font-mono font-semibold">
                      {reconcileModalTrx.referenceNumber || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Pihak Terkait:</span>
                    <div className="text-slate-200 truncate">{reconcileModalTrx.payeeOrPayer || '-'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Cost Center / Site:</span>
                    <div className="text-slate-200 truncate">{reconcileModalTrx.projectName || 'HQ & Non-Project'}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-850">
                  <span className="text-slate-500 text-[10px]">Keterangan & Uraian:</span>
                  <div className="text-slate-200 font-medium mt-0.5">{reconcileModalTrx.title}</div>
                  {reconcileModalTrx.description && (
                    <div className="text-[11px] text-slate-400 mt-0.5">{reconcileModalTrx.description}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist Panduan Kesesuaian */}
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Panduan Kesesuaian Rekonsiliasi Bank</span>
              </div>
              <ul className="text-slate-400 space-y-1 pl-4 list-disc text-[11px]">
                <li>Pastikan mutasi debit/kredit pada rekening koran bank memiliki nominal yang sama persis (<strong>{financeService.formatRupiah(reconcileModalTrx.amount)}</strong>).</li>
                <li>Periksa keselarasan tanggal transaksi dengan tanggal efektif mutasi di bank.</li>
                <li>Jika data mutasi bank sudah cocok, pilih opsi <strong>Reconciled</strong> (berwarna hijau dengan huruf putih) di bawah.</li>
              </ul>
            </div>

            {/* Pilihan Status Bank (Reconciled vs Unreconciled) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Pilihan Status Rekonsiliasi Bank:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Pilihan Reconciled: Bewarna Hijau dan Huruf Bewarna Putih */}
                <button
                  type="button"
                  onClick={() => setReconcileSelectedStatus(true)}
                  className={`p-3.5 rounded-2xl transition-all text-left cursor-pointer flex flex-col justify-between ${
                    reconcileSelectedStatus
                      ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-lg shadow-emerald-950/60'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        reconcileSelectedStatus
                          ? 'bg-emerald-700/90 text-white'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Reconciled</span>
                    </span>
                    {reconcileSelectedStatus && (
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    )}
                  </div>
                  <div className={`text-xs font-bold ${reconcileSelectedStatus ? 'text-white' : 'text-slate-200'}`}>
                    Sudah Sesuai (Matched)
                  </div>
                  <div className={`text-[10px] mt-0.5 ${reconcileSelectedStatus ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Transaksi internal telah dicocokkan dengan mutasi rekening koran bank.
                  </div>
                </button>

                {/* Pilihan Unreconciled */}
                <button
                  type="button"
                  onClick={() => setReconcileSelectedStatus(false)}
                  className={`p-3.5 rounded-2xl transition-all text-left cursor-pointer flex flex-col justify-between ${
                    !reconcileSelectedStatus
                      ? 'bg-amber-500/20 text-amber-200 border-2 border-amber-500 shadow-lg shadow-amber-950/50'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-amber-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        !reconcileSelectedStatus
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Unreconciled</span>
                    </span>
                    {!reconcileSelectedStatus && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <div className={`text-xs font-bold ${!reconcileSelectedStatus ? 'text-amber-300' : 'text-slate-300'}`}>
                    Belum Sesuai
                  </div>
                  <div className={`text-[10px] mt-0.5 ${!reconcileSelectedStatus ? 'text-amber-200/80' : 'text-slate-500'}`}>
                    Belum cocok atau masih memerlukan klarifikasi mutasi bank.
                  </div>
                </button>
              </div>
            </div>

            {/* Catatan Verifikasi */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Catatan Verifikasi Rekonsiliasi (Opsional):
              </label>
              <input
                type="text"
                value={reconcileNote}
                onChange={(e) => setReconcileNote(e.target.value)}
                placeholder="Contoh: Sesuai rekening koran BCA tgl 23/09 Ref Mutasi #88219"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Quick 1-Click Action if currently Unreconciled */}
            {!reconcileModalTrx.isReconciled && (
              <button
                type="button"
                onClick={() => handleSaveReconcileStatus(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 cursor-pointer transition-all border border-emerald-400/40"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Transaksi Sudah Sesuai? 1-Klik Terapkan Status Reconciled</span>
              </button>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              <span className="truncate max-w-[200px]">
                Dibuat oleh: {reconcileModalTrx.createdBy}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setReconcileModalTrx(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Batal
                </button>
                {reconcileSelectedStatus ? (
                  <button
                    type="button"
                    onClick={() => handleSaveReconcileStatus(true)}
                    className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer border border-emerald-400/30"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Simpan Status: Reconciled</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveReconcileStatus(false)}
                    className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Simpan Status: Unreconciled</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: QUICK DEPRECIATION GENERATOR */}
      {/* ------------------------------------------------------------- */}
      {isDepreciationModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Kalkulator Penyusutan Aset Otomatis (Straight-Line)
                </h3>
                <p className="text-xs text-slate-400">
                  Perhitungan alokasi depresiasi mesin cleaning dan armada logistik
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div>
                  <div className="font-bold text-white">Mesin Scrubber & Polisher (Akun 1210)</div>
                  <div className="text-[10px] text-slate-500">Harga Perolehan Rp 240 Juta / 5 Tahun</div>
                </div>
                <div className="font-mono font-bold text-rose-400">Rp 4.500.000 / bln</div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div>
                  <div className="font-bold text-white">Armada Kendaraan & Mobil Box (Akun 1220)</div>
                  <div className="text-[10px] text-slate-500">Harga Perolehan Rp 180 Juta / 6 Tahun</div>
                </div>
                <div className="font-mono font-bold text-rose-400">Rp 2.500.000 / bln</div>
              </div>

              <div className="flex justify-between items-center pt-1 font-bold text-white">
                <span>Total Beban Penyusutan Bulan Ini:</span>
                <span className="text-amber-400 font-mono text-sm">Rp 7.000.000</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDepreciationModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleCreateDepreciationEntry}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-900/40 cursor-pointer"
              >
                Posting Jurnal Penyusutan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TAMBAH & EDIT AKUN COA / SUB COA */}
      {/* ------------------------------------------------------------- */}
      {isCoaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {coaFormData.accountKind === 'SUB' ? (
                    <GitBranch className="w-5 h-5" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {coaModalMode === 'create'
                      ? coaFormData.accountKind === 'SUB'
                        ? 'Tambah Sub COA (Sub-Akun Rincian)'
                        : 'Tambah Akun COA Utama (Induk)'
                      : `Edit Akun COA [${coaFormData.editingOriginalCode}]`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Konfigurasi kode akun, klasifikasi PSAK, dan saldo awal untuk pembukuan akuntansi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCoaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveCoaAccount} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Account Kind Selector (Only when creating) */}
              {coaModalMode === 'create' && (
                <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCoaFormData((prev) => ({
                        ...prev,
                        accountKind: 'PARENT',
                        parentCode: '',
                        code: ''
                      }));
                    }}
                    className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      coaFormData.accountKind === 'PARENT'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Akun Utama / Induk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const parentAccounts = accounts.filter((a) => !a.isSubAccount);
                      const defaultParent = parentAccounts[0] || accounts[0];
                      const pCode = defaultParent?.code || '';
                      const autoCode = pCode ? generateNextSubAccountCode(pCode) : '';
                      setCoaFormData((prev) => ({
                        ...prev,
                        accountKind: 'SUB',
                        parentCode: pCode,
                        code: autoCode,
                        type: defaultParent?.type || prev.type,
                        category: defaultParent?.category || prev.category,
                        normalBalance: defaultParent?.normalBalance || prev.normalBalance
                      }));
                    }}
                    className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      coaFormData.accountKind === 'SUB'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Sub-Akun (Sub COA)</span>
                  </button>
                </div>
              )}

              {/* Sub COA: Select Parent Account */}
              {coaFormData.accountKind === 'SUB' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pilih Akun Induk (Parent COA) *</span>
                    </label>
                    <span className="text-[10px] text-amber-300/80">Tipe & Kategori otomatis terhubung</span>
                  </div>

                  <select
                    value={coaFormData.parentCode}
                    onChange={(e) => {
                      const selectedParentCode = e.target.value;
                      const parent = accounts.find((a) => a.code === selectedParentCode);
                      const autoCode = generateNextSubAccountCode(selectedParentCode);
                      setCoaFormData((prev) => ({
                        ...prev,
                        parentCode: selectedParentCode,
                        code: autoCode,
                        type: parent ? parent.type : prev.type,
                        category: parent ? parent.category : prev.category,
                        normalBalance: parent ? parent.normalBalance : prev.normalBalance
                      }));
                    }}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="" disabled>-- Pilih Akun Induk --</option>
                    {accounts
                      .filter((a) => !a.isSubAccount)
                      .map((p) => (
                        <option key={p.code} value={p.code}>
                          [{p.code}] {p.name} ({p.type} - {p.category})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Code & Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Kode Akun COA *
                    </label>
                    {coaFormData.accountKind === 'SUB' && (
                      <span className="text-[9px] text-amber-400 font-mono">Format: [Induk]-[XX]</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={coaFormData.accountKind === 'SUB' ? 'e.g. 1120-01' : 'e.g. 1140'}
                    value={coaFormData.code}
                    onChange={(e) => setCoaFormData({ ...coaFormData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Nama Akun / Sub-Akun *
                    </label>
                    <span className="text-[10px] text-amber-400/80 font-normal">
                      Ketik manual atau pilih rekomendasi
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    list="coa-account-name-suggestions"
                    placeholder={
                      coaFormData.accountKind === 'SUB'
                        ? 'e.g. Bank Mandiri KCP Sudirman (Rek. Operasional)'
                        : 'e.g. Piutang Retensi Proyek'
                    }
                    value={coaFormData.name}
                    onChange={(e) => setCoaFormData({ ...coaFormData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                  <datalist id="coa-account-name-suggestions">
                    {coaFormData.accountKind === 'SUB' ? (
                      <>
                        <option value="Rek. Operasional Site" />
                        <option value="Rek. Payroll Karyawan" />
                        <option value="Rek. Penerimaan Invoice Klien" />
                        <option value="Kas Kecil Proyek / Site Operasional" />
                        <option value="Piutang Retensi Termin Proyek" />
                        <option value="Persediaan Chemical & Cleaning Supplies" />
                        <option value="Utang Vendor Bahan Pembersih" />
                        <option value="Beban Gaji & Upah Tenaga Kerja" />
                        <option value="Beban Transportasi & Logistik Proyek" />
                        <option value="Beban Listrik, Air & Utilitas Kantor" />
                        <option value="Beban Sewa Gedung & Fasilitas" />
                      </>
                    ) : (
                      <>
                        <option value="Kas Besar Kantor Pusat (HQ)" />
                        <option value="Bank Operasional Utama" />
                        <option value="Piutang Usaha Jasa Cleaning & Facility" />
                        <option value="Persediaan Bahan & Perlengkapan Kerja" />
                        <option value="Aset Tetap Peralatan Mesin Polisher & Vacuum" />
                        <option value="Utang Usaha & Pembelian Vendor" />
                        <option value="Pendapatan Jasa Kontrak Kebersihan" />
                        <option value="Beban Pokok Pendapatan (HPP)" />
                        <option value="Beban Operasional & Administrasi Umum" />
                      </>
                    )}
                  </datalist>
                </div>
              </div>

              {/* Tipe Akun & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Tipe Golongan Akun (PSAK)
                  </label>
                  <select
                    value={coaFormData.type}
                    disabled={coaFormData.accountKind === 'SUB'}
                    onChange={(e) => {
                      const newType = e.target.value as AccountType;
                      const defaultNormal =
                        newType === 'Asset' || newType === 'Expense' ? 'Debit' : 'Credit';
                      setCoaFormData((prev) => ({
                        ...prev,
                        type: newType,
                        normalBalance: defaultNormal
                      }));
                    }}
                    className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 ${
                      coaFormData.accountKind === 'SUB' ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="Asset">Asset (Aset / Aktiva / Kas)</option>
                    <option value="Liability">Liability (Liabilitas / Kewajiban / Utang)</option>
                    <option value="Equity">Equity (Ekuitas / Modal Saham)</option>
                    <option value="Revenue">Revenue (Pendapatan Operasional & Lainnya)</option>
                    <option value="Expense">Expense (Beban Usaha, HPP & Operasional)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Kategori Laporan
                  </label>
                  <select
                    value={coaFormData.category}
                    disabled={coaFormData.accountKind === 'SUB'}
                    onChange={(e) => setCoaFormData({ ...coaFormData, category: e.target.value })}
                    className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 ${
                      coaFormData.accountKind === 'SUB' ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                  >
                    {STANDARD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Kategori Kustom Lainnya...</option>
                  </select>
                </div>
              </div>

              {/* Custom Category Input (if selected) */}
              {coaFormData.category === 'CUSTOM' && (
                <div>
                  <label className="text-[11px] font-bold text-amber-300 block mb-1">
                    Nama Kategori Kustom Baru *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Beban Outsourcing Tenaga Pengamanan"
                    value={coaFormData.customCategory}
                    onChange={(e) => setCoaFormData({ ...coaFormData, customCategory: e.target.value })}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Saldo Normal & Saldo Awal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Saldo Normal Akun
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCoaFormData({ ...coaFormData, normalBalance: 'Debit' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        coaFormData.normalBalance === 'Debit'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-850'
                      }`}
                    >
                      Debit (D)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoaFormData({ ...coaFormData, normalBalance: 'Credit' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        coaFormData.normalBalance === 'Credit'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-850'
                      }`}
                    >
                      Kredit (K)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Saldo Awal (Rp)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {financeService.formatRupiah(parseFloat(coaFormData.initialBalance.replace(/[^\d.-]/g, '')) || 0)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={coaFormData.initialBalance}
                    onChange={(e) => setCoaFormData({ ...coaFormData, initialBalance: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Keterangan & Peruntukan Akun
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan fungsi akun atau peruntukan proyek/divisi..."
                  value={coaFormData.description}
                  onChange={(e) => setCoaFormData({ ...coaFormData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="coa-is-active"
                  checked={coaFormData.isActive}
                  onChange={(e) => setCoaFormData({ ...coaFormData, isActive: e.target.checked })}
                  className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-950"
                />
                <label htmlFor="coa-is-active" className="text-xs font-bold text-slate-300 cursor-pointer">
                  Akun Aktif (Dapat digunakan untuk pencatatan kas, transaksi & jurnal)
                </label>
              </div>

              {/* Visual Preview Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pratinjau Akun dalam Laporan</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Hirarki: {coaFormData.accountKind === 'SUB' ? 'Sub-Akun Rincian' : 'Akun Utama (Level 1)'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-amber-400">{coaFormData.code || '----'}</span>
                      <span className="font-bold text-white">{coaFormData.name || '(Nama Akun Belum Diisi)'}</span>
                      {coaFormData.accountKind === 'SUB' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                          SUB COA
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {coaFormData.type} • {coaFormData.category} • Normal: <span className={coaFormData.normalBalance === 'Debit' ? 'text-emerald-400' : 'text-rose-400'}>{coaFormData.normalBalance}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Saldo Awal</div>
                    <div className="font-mono font-bold text-white text-xs">
                      {financeService.formatRupiah(parseFloat(coaFormData.initialBalance.replace(/[^\d.-]/g, '')) || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCoaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-900/40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{coaModalMode === 'create' ? 'Simpan Akun COA' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT TRANSAKSI / VOUCHER JURNAL */}
      {/* ------------------------------------------------------------- */}
      {isEditModalOpen && transactionToEdit && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    transactionToEdit.type === 'IN'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : transactionToEdit.type === 'OUT'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}
                >
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-base">
                      Edit Transaksi [{transactionToEdit.code}]
                    </h3>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        transactionToEdit.type === 'IN'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : transactionToEdit.type === 'OUT'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {transactionToEdit.type === 'IN'
                        ? 'Uang Masuk (BKM)'
                        : transactionToEdit.type === 'OUT'
                        ? 'Uang Keluar (BKK)'
                        : 'Jurnal Umum'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Perbaiki dan perbarui data yang telah terlanjur diinput, lalu simpan perubahan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setTransactionToEdit(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveEditedTransaction} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Common Fields: Date & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {(transactionToEdit.type === 'IN' || transactionToEdit.type === 'OUT') && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Nominal Transaksi (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                        transactionToEdit.type === 'IN'
                          ? 'text-emerald-400 focus:border-emerald-500'
                          : 'text-rose-400 focus:border-rose-500'
                      }`}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Judul / Keterangan Transaksi *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Specific for Cash IN / OUT: Primary Account and Contra Account */}
              {(transactionToEdit.type === 'IN' || transactionToEdit.type === 'OUT') && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {transactionToEdit.type === 'IN'
                          ? 'Masuk Ke Rekening / Kas (Debit) *'
                          : 'Sumber Rekening Kas/Bank (Kredit) *'}
                      </label>
                      <select
                        value={editFormData.primaryAccountCode}
                        onChange={(e) => setEditFormData({ ...editFormData, primaryAccountCode: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {accounts
                          .filter((a) => a.category === 'Kas & Bank')
                          .map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {transactionToEdit.type === 'IN'
                          ? 'Akun Sumber / Pendapatan (Kredit) *'
                          : 'Alokasi Akun Beban / Utang (Debit) *'}
                      </label>
                      <select
                        value={editFormData.contraAccountCode}
                        onChange={(e) => setEditFormData({ ...editFormData, contraAccountCode: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {accounts.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.name} ({a.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-300">
                          Metode Pembayaran *
                        </label>
                        <span className="text-[10px] text-amber-400 font-medium">
                          {editIsManualPayment ? 'Manual' : 'Rekening Resmi'}
                        </span>
                      </div>
                      <select
                        value={editPaymentMethodSelection}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditPaymentMethodSelection(val);
                          if (val === '__MANUAL__') {
                            setEditIsManualPayment(true);
                            setEditFormData({
                              ...editFormData,
                              paymentMethod: editManualPaymentMethod
                            });
                          } else {
                            setEditIsManualPayment(false);
                            setEditFormData({
                              ...editFormData,
                              paymentMethod: val
                            });
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                      >
                        {registeredBankAccounts.length > 0 ? (
                          registeredBankAccounts.map((b) => {
                            const optVal = `${b.bankName} (${b.accountNumber})`;
                            return (
                              <option key={b.id} value={optVal}>
                                {b.bankName} - {b.accountNumber} ({b.role}){b.isPrimary ? ' ★' : ''}
                              </option>
                            );
                          })
                        ) : (
                          <option value="" disabled>
                            -- Tidak ada rekening terdaftar di Pengaturan Perusahaan --
                          </option>
                        )}
                        <option value="__MANUAL__">
                          + Lainnya (Tulis / Ketik Manual...)
                        </option>
                      </select>

                      {editIsManualPayment && (
                        <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[10px] font-bold text-amber-400 block">
                            Tulis Metode Pembayaran Manual *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Kas Tunai HQ, Petty Cash Site, Cek Giro No. 123, dll."
                            value={editManualPaymentMethod}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditManualPaymentMethod(val);
                              setEditFormData({
                                ...editFormData,
                                paymentMethod: val
                              });
                            }}
                            className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                          />
                          <p className="text-[10px] text-slate-400">
                            Pilihan manual di luar rekening bank operasional yang telah didaftarkan di Pengaturan Perusahaan.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {transactionToEdit.type === 'IN'
                          ? 'Diterima Dari (Klien / Pihak Ketiga)'
                          : 'Dibayarkan Kepada (Vendor / Personil)'}
                      </label>
                      <input
                        type="text"
                        value={editFormData.payeeOrPayer}
                        onChange={(e) => setEditFormData({ ...editFormData, payeeOrPayer: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Multi-line editor for General Journal */}
              {(transactionToEdit.type === 'JOURNAL' || transactionToEdit.type === 'ADJUSTMENT') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Rincian Baris Debit & Kredit Jurnal:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditJournalLines([
                          ...editJournalLines,
                          {
                            id: String(Date.now()),
                            accountCode: accounts[0]?.code || '1110',
                            debit: 0,
                            credit: 0,
                            notes: ''
                          }
                        ])
                      }
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded bg-slate-800 cursor-pointer"
                    >
                      + Tambah Baris Akun
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {editJournalLines.map((line, idx) => (
                      <div
                        key={line.id || idx}
                        className="grid grid-cols-12 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 items-center"
                      >
                        <div className="col-span-5">
                          <select
                            value={line.accountCode}
                            onChange={(e) => {
                              const next = [...editJournalLines];
                              next[idx].accountCode = e.target.value;
                              setEditJournalLines(next);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                          >
                            {accounts.map((a) => (
                              <option key={a.code} value={a.code}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Debit (Rp)"
                            value={line.debit || ''}
                            onChange={(e) => {
                              const next = [...editJournalLines];
                              next[idx].debit = Number(e.target.value) || 0;
                              if (next[idx].debit > 0) next[idx].credit = 0;
                              setEditJournalLines(next);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Kredit (Rp)"
                            value={line.credit || ''}
                            onChange={(e) => {
                              const next = [...editJournalLines];
                              next[idx].credit = Number(e.target.value) || 0;
                              if (next[idx].credit > 0) next[idx].debit = 0;
                              setEditJournalLines(next);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-rose-400 font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-1 text-center">
                          {editJournalLines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditJournalLines(editJournalLines.filter((_, i) => i !== idx));
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Balance checker */}
                  {(() => {
                    const totalDebit = editJournalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
                    const totalCredit = editJournalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
                    const isBal = Math.abs(totalDebit - totalCredit) < 1 && totalDebit > 0;

                    return (
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isBal
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isBal ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span>
                            Total Debit: <strong>{financeService.formatRupiah(totalDebit)}</strong> | Total Kredit:{' '}
                            <strong>{financeService.formatRupiah(totalCredit)}</strong>
                          </span>
                        </div>
                        <span className="font-bold">
                          {isBal
                            ? 'SEIMBANG'
                            : `Selisih: ${financeService.formatRupiah(Math.abs(totalDebit - totalCredit))}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Project & Division & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Cost Center (Site / Lokasi)
                  </label>
                  <select
                    value={editFormData.projectId}
                    onChange={(e) => setEditFormData({ ...editFormData, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Seluruh Lokasi (Kantor Pusat HQ)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Unit
                  </label>
                  <select
                    value={editFormData.division}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, division: e.target.value as DivisionType })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Cleaning Service">Cleaning Service</option>
                    <option value="Labor Supply">Labor Supply</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Parking Service">Parking Service</option>
                    <option value="Investment">Investment</option>
                    <option value="Lain - Lain">Lain - Lain</option>
                    {editFormData.division && ![
                      'Cleaning Service',
                      'Labor Supply',
                      'Marketing',
                      'Parking Service',
                      'Investment',
                      'Lain - Lain'
                    ].includes(editFormData.division) && (
                      <option value={editFormData.division}>{editFormData.division}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    No Referensi / Invoice / Memo
                  </label>
                  <input
                    type="text"
                    value={editFormData.referenceNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, referenceNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Catatan Tambahan & Keterangan Rinci
                </label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setTransactionToEdit(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-900/40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SECURITY PIN AUTHORIZATION FOR TRANSACTION DELETION */}
      {/* ------------------------------------------------------------- */}
      <SecurityPinModal
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={(reason) => handleExecuteDeleteTransaction(reason)}
        title="Otorisasi PIN Hapus Transaksi"
        itemCode={transactionToDelete?.code}
        itemName={transactionToDelete?.title}
        itemAmount={transactionToDelete?.amount}
        itemDetails={`${transactionToDelete?.type === 'IN' ? 'Uang Masuk (BKM)' : transactionToDelete?.type === 'OUT' ? 'Uang Keluar (BKK)' : 'Jurnal Transaksi'} • Lokasi: ${transactionToDelete?.projectName || 'HQ'}`}
        moduleName="Buku Kas & Transaksi"
        currentUser={currentUser}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SECURITY PIN AUTHORIZATION FOR COA / SUB COA DELETION */}
      {/* ------------------------------------------------------------- */}
      <SecurityPinModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={(reason) => handleExecuteDeleteAccount(reason)}
        title="Otorisasi PIN Hapus Akun COA"
        itemCode={accountToDelete?.code}
        itemName={accountToDelete?.name}
        itemAmount={accountToDelete?.currentBalance}
        itemDetails={`${accountToDelete?.type} - ${accountToDelete?.category} (${accountToDelete?.isSubAccount ? 'Sub COA' : 'Akun Utama'})`}
        moduleName="Bagan Akun (COA)"
        currentUser={currentUser}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SECURITY PIN AUTHORIZATION FOR BULK TRANSACTION DELETION */}
      {/* ------------------------------------------------------------- */}
      <SecurityPinModal
        isOpen={isBulkDeleteTrxModalOpen}
        onClose={() => setIsBulkDeleteTrxModalOpen(false)}
        onConfirm={(reason) => handleExecuteBulkDeleteTransactions(reason)}
        title="Otorisasi PIN Hapus Masal Transaksi"
        itemCode={`${selectedTrxIds.length} Transaksi`}
        itemName={`${selectedTrxIds.length} transaksi kas & jurnal kasir/bank`}
        itemAmount={selectedTrxTotalAmount}
        itemDetails={`Daftar Transaksi: ${selectedTransactionsData.map((t) => t.code).slice(0, 6).join(', ')}${selectedTransactionsData.length > 6 ? ` (+${selectedTransactionsData.length - 6} lainnya)` : ''}`}
        moduleName="Buku Kas & Transaksi (Hapus Masal)"
        currentUser={currentUser}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SECURITY PIN AUTHORIZATION FOR BULK COA DELETION */}
      {/* ------------------------------------------------------------- */}
      <SecurityPinModal
        isOpen={isBulkDeleteAccountModalOpen}
        onClose={() => setIsBulkDeleteAccountModalOpen(false)}
        onConfirm={(reason) => handleExecuteBulkDeleteAccounts(reason)}
        title="Otorisasi PIN Hapus Masal Akun COA"
        itemCode={`${selectedAccountCodes.length} Akun COA`}
        itemName={`${selectedAccountCodes.length} bagan akun non-sistem terpilih`}
        itemDetails={`Kode Akun: ${selectedAccountCodes.slice(0, 8).join(', ')}${selectedAccountCodes.length > 8 ? ` (+${selectedAccountCodes.length - 8} lainnya)` : ''}`}
        moduleName="Bagan Akun (COA - Hapus Masal)"
        currentUser={currentUser}
      />
    </div>
  );
};
