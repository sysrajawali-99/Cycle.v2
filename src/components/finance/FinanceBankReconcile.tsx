import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  PlusCircle,
  HelpCircle,
  FileText,
  Printer,
  Download,
  Building2,
  PieChart,
  Calendar,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  X,
  RotateCcw,
  Pencil,
  Save
} from 'lucide-react';
import {
  BankStatementImport,
  BankStatementItem,
  FinanceTransaction,
  ChartOfAccount,
  ReconcileStatus,
  AuditTrailItem,
  DebtRecord,
  DebtPaymentHistory,
  DebtStatus,
  ReceivableRecord,
  ReceivablePaymentHistory,
  ReceivableStatus,
  InvestmentRecord,
  InvestmentScheduleRow
} from '../../types/finance';
import { Project, UserAccount } from '../../types';
import { financeService } from '../../services/financeService';
import { BankStatementUploadModal } from './BankStatementUploadModal';
import { getSamplePresetStatement } from '../../utils/bankStatementParser';

interface FinanceBankReconcileProps {
  bankStatements: BankStatementImport[];
  transactions: FinanceTransaction[];
  accounts: ChartOfAccount[];
  projects: Project[];
  debts?: DebtRecord[];
  receivables?: ReceivableRecord[];
  investments?: InvestmentRecord[];
  currentUser?: UserAccount | null;
  onUpdateStatements: (statements: BankStatementImport[]) => void;
  onAddTransaction: (trx: FinanceTransaction) => void;
  onBatchAddTransactions?: (trxs: FinanceTransaction[]) => void;
  onUpdateTransaction: (trx: FinanceTransaction) => void;
  onBatchUpdateTransactions?: (trxs: FinanceTransaction[]) => void;
  onDeleteTransaction?: (trxId: string) => void;
  onBatchDeleteTransactions?: (trxIds: string[]) => void;
  onUpdateDebts?: (debts: DebtRecord[]) => void;
  onUpdateDebt?: (debt: DebtRecord) => void;
  onUpdateReceivables?: (receivables: ReceivableRecord[]) => void;
  onUpdateReceivable?: (receivable: ReceivableRecord) => void;
  onUpdateInvestments?: (investments: InvestmentRecord[]) => void;
  onUpdateInvestment?: (investment: InvestmentRecord) => void;
  onUpdateAccounts?: (accounts: ChartOfAccount[]) => void;
  onLogAudit?: (audit: AuditTrailItem) => void;
}

export const FinanceBankReconcile: React.FC<FinanceBankReconcileProps> = ({
  bankStatements,
  transactions,
  accounts,
  projects,
  debts = [],
  receivables = [],
  investments = [],
  currentUser,
  onUpdateStatements,
  onAddTransaction,
  onBatchAddTransactions,
  onUpdateTransaction,
  onBatchUpdateTransactions,
  onDeleteTransaction,
  onBatchDeleteTransactions,
  onUpdateDebts,
  onUpdateDebt,
  onUpdateReceivables,
  onUpdateReceivable,
  onUpdateInvestments,
  onUpdateInvestment,
  onUpdateAccounts,
  onLogAudit
}) => {
  const [selectedStatementId, setSelectedStatementId] = useState<string>(
    bankStatements[0]?.id || ''
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReconcileStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [manualMatchItem, setManualMatchItem] = useState<BankStatementItem | null>(null);
  const [quickConvertItem, setQuickConvertItem] = useState<BankStatementItem | null>(null);
  const [quickConvertCategory, setQuickConvertCategory] = useState<'STANDARD' | 'RECEIVABLE' | 'DEBT' | 'INVESTMENT'>('STANDARD');
  const [quickConvertTargetId, setQuickConvertTargetId] = useState<string>('');
  const [isSyncingAllModules, setIsSyncingAllModules] = useState(false);

  // Auto-Match Otomatis Masal Modal & Config
  const [isAutoMatchModalOpen, setIsAutoMatchModalOpen] = useState(false);
  const [autoMatchMinConfidence, setAutoMatchMinConfidence] = useState<number>(70);
  const [autoMatchToleranceDays, setAutoMatchToleranceDays] = useState<number>(5);
  const [autoMatchAmountTolerance, setAutoMatchAmountTolerance] = useState<number>(0);
  const [autoMatchScope, setAutoMatchScope] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [autoSyncToBukuKas, setAutoSyncToBukuKas] = useState<boolean>(true);

  // Batch Auto-Journal Modal & Config
  const [isBatchJournalModalOpen, setIsBatchJournalModalOpen] = useState(false);
  const [batchJournalIncomeAccount, setBatchJournalIncomeAccount] = useState<string>('4110');
  const [batchJournalExpenseAccount, setBatchJournalExpenseAccount] = useState<string>('5120');
  const [batchJournalProjectId, setBatchJournalProjectId] = useState<string>('');

  // Delete Modals State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteRelatedTransactions, setDeleteRelatedTransactions] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Edit Statement Item State
  const [editingItem, setEditingItem] = useState<BankStatementItem | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editType, setEditType] = useState<'CR' | 'DB'>('CR');
  const [editAmount, setEditAmount] = useState<number | string>(0);
  const [editSyncMatchedTrx, setEditSyncMatchedTrx] = useState<boolean>(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Selected Active Statement
  const activeStatement = useMemo(() => {
    return bankStatements.find((s) => s.id === selectedStatementId) || bankStatements[0];
  }, [bankStatements, selectedStatementId]);

  // Filtered items in active statement
  const filteredItems = useMemo(() => {
    if (!activeStatement) return [];
    return activeStatement.items.filter((item) => {
      if (statusFilter !== 'ALL' && item.matchStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchRef = (item.referenceNumber || '').toLowerCase().includes(q);
        const matchCode = (item.matchedTransactionCode || '').toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchCode) return false;
      }
      return true;
    });
  }, [activeStatement, statusFilter, searchQuery]);

  // Reconciliation Statistics
  const stats = useMemo(() => {
    if (!activeStatement) {
      return { totalCount: 0, matchedCount: 0, unmatchedCount: 0, matchPct: 0, totalCr: 0, totalDb: 0 };
    }
    const totalCount = activeStatement.items.length;
    const matchedCount = activeStatement.items.filter(
      (i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED'
    ).length;
    const unmatchedCount = totalCount - matchedCount;
    const matchPct = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
    const totalCr = activeStatement.items
      .filter((i) => i.type === 'CR')
      .reduce((s, i) => s + i.amount, 0);
    const totalDb = activeStatement.items
      .filter((i) => i.type === 'DB')
      .reduce((s, i) => s + i.amount, 0);

    return { totalCount, matchedCount, unmatchedCount, matchPct, totalCr, totalDb };
  }, [activeStatement]);

  // Bank vs Book Ledger Balance comparison
  const bankBookComparison = useMemo(() => {
    if (!activeStatement) {
      return {
        accountName: 'Rekening Buku Kas',
        bankEndingBalance: 0,
        bookBalance: 0,
        variance: 0,
        isReconciled: true
      };
    }

    let matchedAcc = accounts.find((a) => 
      activeStatement.accountNumber && a.name.includes(activeStatement.accountNumber)
    );
    if (!matchedAcc && activeStatement.bankName) {
      const bName = activeStatement.bankName.toUpperCase();
      if (bName.includes('BNI')) {
        matchedAcc = accounts.find((a) => a.code === '1122' || a.name.includes('BNI'));
      } else if (bName.includes('MANDIRI')) {
        matchedAcc = accounts.find((a) => a.code === '1121' || a.name.includes('Mandiri'));
      } else if (bName.includes('BCA')) {
        matchedAcc = accounts.find((a) => a.code === '1120' || a.name.includes('BCA'));
      }
    }
    const primaryAccount = matchedAcc || accounts.find((a) => a.code === '1120') || accounts[0];
    const bookBalance = primaryAccount?.currentBalance || 0;
    const lastBankItem = activeStatement.items[activeStatement.items.length - 1];
    const bankEndingBalance = lastBankItem?.balance || 0;
    const variance = Math.abs(bankEndingBalance - bookBalance);

    return {
      accountName: primaryAccount?.name || 'Rekening Buku Kas',
      bankEndingBalance,
      bookBalance,
      variance,
      isReconciled: variance < 1000
    };
  }, [accounts, activeStatement]);

  // Transaksi sistem yang dimuat/terkait dengan rekening koran aktif
  const activeStatementRelatedTransactions = useMemo(() => {
    if (!activeStatement) return [];
    const statementItemIds = new Set(activeStatement.items.map((i) => i.id));
    const statementMatchedTrxIds = new Set(
      activeStatement.items.map((i) => i.matchedTransactionId).filter(Boolean) as string[]
    );
    const statementMatchedTrxCodes = new Set(
      activeStatement.items.map((i) => i.matchedTransactionCode).filter(Boolean) as string[]
    );

    return transactions.filter((trx) => {
      if (trx.bankStatementItemId && statementItemIds.has(trx.bankStatementItemId)) return true;
      if (statementMatchedTrxIds.has(trx.id)) return true;
      if (statementMatchedTrxCodes.has(trx.code)) return true;
      return false;
    });
  }, [activeStatement, transactions]);

  const activeStatementRelatedAmount = useMemo(() => {
    return activeStatementRelatedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [activeStatementRelatedTransactions]);

  // Transaksi sistem yang dimuat/terkait dengan SELURUH rekening koran
  const allStatementsRelatedTransactions = useMemo(() => {
    const allItemIds = new Set<string>();
    const allMatchedTrxIds = new Set<string>();
    const allMatchedTrxCodes = new Set<string>();

    bankStatements.forEach((stmt) => {
      stmt.items.forEach((item) => {
        allItemIds.add(item.id);
        if (item.matchedTransactionId) allMatchedTrxIds.add(item.matchedTransactionId);
        if (item.matchedTransactionCode) allMatchedTrxCodes.add(item.matchedTransactionCode);
      });
    });

    return transactions.filter((trx) => {
      if (trx.bankStatementItemId && allItemIds.has(trx.bankStatementItemId)) return true;
      if (allMatchedTrxIds.has(trx.id)) return true;
      if (allMatchedTrxCodes.has(trx.code)) return true;
      if (trx.bankStatementItemId) return true;
      return false;
    });
  }, [bankStatements, transactions]);

  const allStatementsRelatedAmount = useMemo(() => {
    return allStatementsRelatedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [allStatementsRelatedTransactions]);

  // ---------------------------------------------------------------------------
  // AUTO-MATCH LOGIC: Pencocokan Otomatis Baris Mutasi Rekening Koran dengan Transaksi Keuangan
  // Berdasarkan Tanggal, Nominal, dan Arah Arus Kas (CR/DB vs IN/OUT)
  // ---------------------------------------------------------------------------
  const executeAutoMatchLogic = (
    bankItems: BankStatementItem[],
    internalTrxs: FinanceTransaction[],
    options: {
      minConfidence: number;
      toleranceDays: number;
      amountTolerance: number;
      forceRematch?: boolean;
    }
  ): {
    matchedItems: BankStatementItem[];
    matchedTrxMap: Map<string, string>;
    exactDateAndAmountCount: number;
    totalMatchedCount: number;
  } => {
    const { minConfidence, toleranceDays, amountTolerance, forceRematch = false } = options;
    const usedTrxIds = new Set<string>();
    const matchedTrxMap = new Map<string, string>(); // trxId -> bankItemId
    let exactDateAndAmountCount = 0;
    let totalMatchedCount = 0;

    // Track already matched transactions if not force rematching
    if (!forceRematch) {
      bankItems.forEach((item) => {
        if ((item.matchStatus === 'MATCHED' || item.matchStatus === 'MANUAL_MATCHED') && item.matchedTransactionId) {
          usedTrxIds.add(item.matchedTransactionId);
        }
      });
    }

    const matchedItems = bankItems.map((item) => {
      // Retain existing match if not forcing rematch
      if (!forceRematch && (item.matchStatus === 'MATCHED' || item.matchStatus === 'MANUAL_MATCHED') && item.matchedTransactionId) {
        matchedTrxMap.set(item.matchedTransactionId, item.id);
        totalMatchedCount++;
        return item;
      }

      // Filter available internal transactions by cash flow direction
      const expectedTrxType = item.type === 'CR' ? 'IN' : 'OUT';
      const candidateTrxs = internalTrxs.filter(
        (t) => t.type === expectedTrxType && (!usedTrxIds.has(t.id) || t.bankStatementItemId === item.id)
      );

      let bestScore = 0;
      let bestTrx: FinanceTransaction | null = null;
      let isExactDateAndAmount = false;

      candidateTrxs.forEach((trx) => {
        let score = 0;

        // 1. EVALUASI NOMINAL (Hingga 50 Poin)
        const amountDiff = Math.abs(trx.amount - item.amount);
        if (amountDiff <= amountTolerance) {
          score += 50; // Nominal Persis Sama
        } else if (amountDiff <= 1000) {
          score += 35; // Selisih pembulatan kecil
        } else if (amountDiff / Math.max(trx.amount, item.amount) <= 0.01) {
          score += 25; // Selisih < 1% (misal potongan biaya admin bank)
        } else {
          return; // Nominal tidak mendekati, lewati kandidat ini
        }

        // 2. EVALUASI TANGGAL (Hingga 30 Poin)
        const isSameDate = trx.date === item.date;
        if (isSameDate) {
          score += 30; // Tanggal Persis Sama
          if (amountDiff <= amountTolerance) {
            isExactDateAndAmount = true;
          }
        } else {
          try {
            const trxTime = new Date(trx.date).getTime();
            const itemTime = new Date(item.date).getTime();
            const diffDays = Math.abs((trxTime - itemTime) / (1000 * 3600 * 24));
            
            if (diffDays <= 1) {
              score += 22; // Selisih 1 hari (kliring H+1)
            } else if (diffDays <= toleranceDays) {
              score += 15; // Dalam batas toleransi hari
            } else if (diffDays <= toleranceDays + 2) {
              score += 8;
            }
          } catch {
            // fallback
          }
        }

        // 3. EVALUASI KESESUAIAN ARAH (20 Poin)
        score += 20;

        // 4. EVALUASI KATA KUNCI & NOMOR REFERENSI (Bonus hingga 10 Poin)
        const bText = `${item.description} ${item.referenceNumber || ''}`.toLowerCase();
        if (trx.code && bText.includes(trx.code.toLowerCase())) {
          score += 10;
        } else if (trx.referenceNumber && trx.referenceNumber.length >= 4 && bText.includes(trx.referenceNumber.toLowerCase())) {
          score += 10;
        }

        if (score > bestScore) {
          bestScore = score;
          bestTrx = trx;
        }
      });

      // Validasi ambang batas kecocokan (confidence threshold)
      if (bestScore >= minConfidence && bestTrx) {
        usedTrxIds.add((bestTrx as FinanceTransaction).id);
        matchedTrxMap.set((bestTrx as FinanceTransaction).id, item.id);
        totalMatchedCount++;
        if (isExactDateAndAmount) {
          exactDateAndAmountCount++;
        }

        const matchedResult: BankStatementItem = {
          ...item,
          matchStatus: 'MATCHED',
          matchedTransactionId: (bestTrx as FinanceTransaction).id,
          matchedTransactionCode: (bestTrx as FinanceTransaction).code,
          confidenceScore: Math.min(100, bestScore),
          notes: `Auto-Match: Cocok dengan ${(bestTrx as FinanceTransaction).code} (Tgl: ${(bestTrx as FinanceTransaction).date}, Nominal: ${financeService.formatRupiah((bestTrx as FinanceTransaction).amount)})`
        };
        return matchedResult;
      }

      const unmatchedResult: BankStatementItem = {
        ...item,
        matchStatus: 'UNMATCHED',
        matchedTransactionId: undefined,
        matchedTransactionCode: undefined,
        confidenceScore: 0,
        notes: undefined
      };
      return unmatchedResult;
    });

    return {
      matchedItems,
      matchedTrxMap,
      exactDateAndAmountCount,
      totalMatchedCount
    };
  };

  // ---------------------------------------------------------------------------
  // CROSS-MODULE SYNCHRONIZATION ENGINES (7 MODUL KEUANGAN TERPADU)
  // ---------------------------------------------------------------------------

  // 1. Sinkronisasi Saldo Akun COA & Jurnal Umum Buku Kas
  const recalculateAndSyncAccounts = (currentTrxs: FinanceTransaction[]) => {
    if (!onUpdateAccounts || accounts.length === 0) return;

    const debitMap = new Map<string, number>();
    const creditMap = new Map<string, number>();

    currentTrxs.forEach((trx) => {
      trx.journalEntries?.forEach((je) => {
        debitMap.set(je.accountCode, (debitMap.get(je.accountCode) || 0) + (je.debit || 0));
        creditMap.set(je.accountCode, (creditMap.get(je.accountCode) || 0) + (je.credit || 0));
      });
    });

    const updatedAccounts = accounts.map((acc) => {
      const totalDebits = debitMap.get(acc.code) || 0;
      const totalCredits = creditMap.get(acc.code) || 0;
      const initial = acc.initialBalance || 0;

      let currentBalance = initial;
      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        currentBalance = initial + totalDebits - totalCredits;
      } else {
        // LIABILITY, EQUITY, REVENUE
        currentBalance = initial + totalCredits - totalDebits;
      }

      return {
        ...acc,
        balance: currentBalance,
        currentBalance: currentBalance
      };
    });

    onUpdateAccounts(updatedAccounts);
  };

  // 2. Sinkronisasi Hutang Vendor (AP), Piutang Klien (AR), & Bagi Hasil Investor (12 Baris Jadwal)
  const syncHutangPiutangAndInvestments = (
    itemsToSync: Array<{
      item: BankStatementItem;
      trxCode?: string;
      trxTitle?: string;
      targetType?: 'STANDARD' | 'RECEIVABLE' | 'DEBT' | 'INVESTMENT';
      targetId?: string;
    }>
  ) => {
    let debtsChanged = false;
    let receivablesChanged = false;
    let investmentsChanged = false;

    let updatedDebtsList = [...debts];
    let updatedRecsList = [...receivables];
    let updatedInvsList = [...investments];

    itemsToSync.forEach(({ item, trxCode, trxTitle, targetType, targetId }) => {
      const isCr = item.type === 'CR'; // Inflow -> Piutang (AR) / Investasi Masuk
      const isDb = item.type === 'DB'; // Outflow -> Hutang (AP) / Bagi Hasil Investor
      const desc = `${item.description} ${item.referenceNumber || ''} ${trxTitle || ''}`.toLowerCase();

      // A. SINKRONISASI PIUTANG KLIEN (AR INVOICE & AGING)
      if (isCr && updatedRecsList.length > 0) {
        let matchedRecIndex = -1;

        if (targetType === 'RECEIVABLE' && targetId) {
          matchedRecIndex = updatedRecsList.findIndex((r) => r.id === targetId);
        } else {
          matchedRecIndex = updatedRecsList.findIndex((rec) => {
            if (rec.status === 'PAID') return false;
            const invMatch = rec.invoiceNumber && desc.includes(rec.invoiceNumber.toLowerCase());
            const codeMatch = rec.code && desc.includes(rec.code.toLowerCase());
            const custMatch = rec.customerName && desc.includes(rec.customerName.toLowerCase());
            const amountMatch = Math.abs(rec.remainingAmount - item.amount) <= 10000 || Math.abs(rec.totalAmount - item.amount) <= 10000;
            return invMatch || codeMatch || custMatch || (amountMatch && rec.customerName && desc.includes(rec.customerName.substring(0, 4).toLowerCase()));
          });
        }

        if (matchedRecIndex >= 0) {
          const matchedRec = updatedRecsList[matchedRecIndex];
          const payAmount = Math.min(item.amount, matchedRec.remainingAmount || matchedRec.totalAmount);
          const newPaid = matchedRec.paidAmount + payAmount;
          const newRemaining = Math.max(0, matchedRec.totalAmount - newPaid);
          const newStatus: ReceivableStatus = newRemaining === 0 ? 'PAID' : 'PARTIAL';

          const paymentLog: ReceivablePaymentHistory = {
            id: `rec-pay-reconcile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: item.date,
            amount: payAmount,
            paymentMethod: activeStatement?.bankName || 'Bank Transfer',
            accountCode: '1120',
            referenceNumber: item.referenceNumber || trxCode || 'BANK-RECONCILE',
            notes: `Pelunasan otomatis tersinkronisasi via Rekonsiliasi Bank: ${item.description}`,
            recordedBy: currentUser?.name || 'Auto-Reconcile System'
          };

          updatedRecsList[matchedRecIndex] = {
            ...matchedRec,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            payments: [paymentLog, ...(matchedRec.payments || [])],
            updatedAt: new Date().toISOString()
          };
          receivablesChanged = true;
        }
      }

      // B. SINKRONISASI HUTANG VENDOR (AP BILL & AGING)
      if (isDb && updatedDebtsList.length > 0) {
        let matchedDebtIndex = -1;

        if (targetType === 'DEBT' && targetId) {
          matchedDebtIndex = updatedDebtsList.findIndex((d) => d.id === targetId);
        } else {
          matchedDebtIndex = updatedDebtsList.findIndex((debt) => {
            if (debt.status === 'PAID') return false;
            const invMatch = debt.invoiceNumber && desc.includes(debt.invoiceNumber.toLowerCase());
            const codeMatch = debt.code && desc.includes(debt.code.toLowerCase());
            const credMatch = debt.creditorName && desc.includes(debt.creditorName.toLowerCase());
            const amountMatch = Math.abs(debt.remainingAmount - item.amount) <= 10000 || Math.abs(debt.totalAmount - item.amount) <= 10000;
            return invMatch || codeMatch || credMatch || (amountMatch && debt.creditorName && desc.includes(debt.creditorName.substring(0, 4).toLowerCase()));
          });
        }

        if (matchedDebtIndex >= 0) {
          const matchedDebt = updatedDebtsList[matchedDebtIndex];
          const payAmount = Math.min(item.amount, matchedDebt.remainingAmount || matchedDebt.totalAmount);
          const newPaid = matchedDebt.paidAmount + payAmount;
          const newRemaining = Math.max(0, matchedDebt.totalAmount - newPaid);
          const newStatus: DebtStatus = newRemaining === 0 ? 'PAID' : 'PARTIAL';

          const paymentLog: DebtPaymentHistory = {
            id: `debt-pay-reconcile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: item.date,
            amount: payAmount,
            paymentMethod: activeStatement?.bankName || 'Bank Transfer',
            accountCode: '1120',
            referenceNumber: item.referenceNumber || trxCode || 'BANK-RECONCILE',
            notes: `Pembayaran hutang otomatis tersinkronisasi via Rekonsiliasi Bank: ${item.description}`,
            recordedBy: currentUser?.name || 'Auto-Reconcile System'
          };

          updatedDebtsList[matchedDebtIndex] = {
            ...matchedDebt,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            payments: [paymentLog, ...(matchedDebt.payments || [])],
            updatedAt: new Date().toISOString()
          };
          debtsChanged = true;
        }
      }

      // C. SINKRONISASI INVESTASI & BAGI HASIL 12 BARIS JADWAL DIVIDEN
      if (isDb && updatedInvsList.length > 0) {
        let matchedInvIndex = -1;

        if (targetType === 'INVESTMENT' && targetId) {
          matchedInvIndex = updatedInvsList.findIndex((i) => i.id === targetId);
        } else {
          const isProfitSharingWord = desc.includes('bagi hasil') || desc.includes('dividen') || desc.includes('investor') || desc.includes('roi') || desc.includes('profit');
          matchedInvIndex = updatedInvsList.findIndex((inv) => {
            const nameMatch = inv.investorName && desc.includes(inv.investorName.toLowerCase());
            const codeMatch = inv.code && desc.includes(inv.code.toLowerCase());
            const monthlyProfitMatch = Math.abs(inv.monthlyProfitAmount - item.amount) <= 10000;
            return nameMatch || codeMatch || (isProfitSharingWord && monthlyProfitMatch);
          });
        }

        if (matchedInvIndex >= 0) {
          const matchedInv = updatedInvsList[matchedInvIndex];
          let scheduleRowUpdated = false;

          const updatedSchedules: InvestmentScheduleRow[] = matchedInv.schedules.map((row) => {
            if (!scheduleRowUpdated && row.status === 'Ditunda') {
              scheduleRowUpdated = true;
              return {
                ...row,
                status: 'DI Realisasikan' as const,
                realizationDate: item.date,
                bankAccountSnapshot: matchedInv.bankAccountNumber,
                bankAccountNumberSnapshot: matchedInv.bankAccountNumber,
                bankNameSnapshot: activeStatement?.bankName || matchedInv.bankName,
                accountHolderSnapshot: matchedInv.bankAccountHolder,
                transferProof: 'Terverifikasi via Rekonsiliasi Bank',
                notes: `Bagi hasil ${row.monthLabel} terverifikasi lunas via mutasi bank (${item.description})`,
                updatedBy: currentUser?.name || 'Auto-Reconcile System'
              };
            }
            return row;
          });

          if (scheduleRowUpdated) {
            updatedInvsList[matchedInvIndex] = {
              ...matchedInv,
              schedules: updatedSchedules,
              updatedAt: new Date().toISOString()
            };
            investmentsChanged = true;
          }
        }
      }
    });

    if (receivablesChanged) {
      if (onUpdateReceivables) onUpdateReceivables(updatedRecsList);
    }
    if (debtsChanged) {
      if (onUpdateDebts) onUpdateDebts(updatedDebtsList);
    }
    if (investmentsChanged) {
      if (onUpdateInvestments) onUpdateInvestments(updatedInvsList);
    }
  };

  // Rollback Sinkronisasi Hutang, Piutang, & Bagi Hasil jika Rekening Koran atau Transaksinya Dihapus
  const rollbackDebtsReceivablesAndInvestments = (
    deletedTrxCodes: Set<string>,
    deletedTrxIds: Set<string>,
    statementItemIds: Set<string>
  ) => {
    // 1. Rollback Pembayaran Piutang (AR)
    if (receivables.length > 0 && onUpdateReceivables) {
      let recsChanged = false;
      const updatedRecs = receivables.map((rec) => {
        const initialPayments = rec.payments || [];
        const remainingPayments = initialPayments.filter((p) => {
          const isDeletedRef = p.referenceNumber && deletedTrxCodes.has(p.referenceNumber);
          const isDeletedTrx = p.id && deletedTrxIds.has(p.id);
          const isReconcilePayment =
            p.id.startsWith('rec-pay-reconcile-') &&
            (p.referenceNumber === 'BANK-RECONCILE' || (p.notes && p.notes.includes('Rekonsiliasi Bank')));
          return !(isDeletedRef || isDeletedTrx || isReconcilePayment);
        });

        if (remainingPayments.length !== initialPayments.length) {
          recsChanged = true;
          const newPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
          const newRemaining = Math.max(0, rec.totalAmount - newPaid);
          const newStatus: ReceivableStatus =
            newRemaining === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
          return {
            ...rec,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            payments: remainingPayments,
            updatedAt: new Date().toISOString()
          };
        }
        return rec;
      });
      if (recsChanged) onUpdateReceivables(updatedRecs);
    }

    // 2. Rollback Pembayaran Hutang (AP)
    if (debts.length > 0 && onUpdateDebts) {
      let debtsChanged = false;
      const updatedDebts = debts.map((debt) => {
        const initialPayments = debt.payments || [];
        const remainingPayments = initialPayments.filter((p) => {
          const isDeletedRef = p.referenceNumber && deletedTrxCodes.has(p.referenceNumber);
          const isDeletedTrx = p.id && deletedTrxIds.has(p.id);
          const isReconcilePayment =
            p.id.startsWith('debt-pay-reconcile-') &&
            (p.referenceNumber === 'BANK-RECONCILE' || (p.notes && p.notes.includes('Rekonsiliasi Bank')));
          return !(isDeletedRef || isDeletedTrx || isReconcilePayment);
        });

        if (remainingPayments.length !== initialPayments.length) {
          debtsChanged = true;
          const newPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
          const newRemaining = Math.max(0, debt.totalAmount - newPaid);
          const newStatus: DebtStatus =
            newRemaining === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
          return {
            ...debt,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            payments: remainingPayments,
            updatedAt: new Date().toISOString()
          };
        }
        return debt;
      });
      if (debtsChanged) onUpdateDebts(updatedDebts);
    }

    // 3. Rollback Realisasi Bagi Hasil Investor
    if (investments.length > 0 && onUpdateInvestments) {
      let invsChanged = false;
      const updatedInvs = investments.map((inv) => {
        let scheduleChanged = false;
        const updatedSchedules = inv.schedules.map((row) => {
          if (
            row.status === 'DI Realisasikan' &&
            row.transferProof === 'Terverifikasi via Rekonsiliasi Bank'
          ) {
            scheduleChanged = true;
            return {
              ...row,
              status: 'Ditunda' as const,
              realizationDate: undefined,
              transferProof: undefined,
              notes: 'Jadwal dividen dikembalikan ke status Ditunda karena rekening koran terkait dihapus',
              updatedBy: currentUser?.name || 'Auto-Reconcile System'
            };
          }
          return row;
        });

        if (scheduleChanged) {
          invsChanged = true;
          return {
            ...inv,
            schedules: updatedSchedules,
            updatedAt: new Date().toISOString()
          };
        }
        return inv;
      });
      if (invsChanged) onUpdateInvestments(updatedInvs);
    }
  };

  // 3. Manual Trigger Full Cross-Module Sync
  const handleRunFullCrossModuleSync = () => {
    setIsSyncingAllModules(true);

    try {
      // Step A: Sync COA Balances with all current transactions
      recalculateAndSyncAccounts(transactions);

      // Step B: Collect all matched bank items
      const allMatchedItems: Array<{ item: BankStatementItem; trxCode?: string; trxTitle?: string }> = [];
      bankStatements.forEach((stmt) => {
        stmt.items.forEach((it) => {
          if (it.matchStatus === 'MATCHED' || it.matchStatus === 'MANUAL_MATCHED') {
            allMatchedItems.push({
              item: it,
              trxCode: it.matchedTransactionCode,
              trxTitle: it.description
            });
          }
        });
      });

      // Step C: Sync Hutang, Piutang, and Investments
      if (allMatchedItems.length > 0) {
        syncHutangPiutangAndInvestments(allMatchedItems);
      }

      // Step D: Log Audit
      if (onLogAudit) {
        onLogAudit({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          userName: currentUser?.name || 'Finance Lead',
          userRole: currentUser?.role || 'Finance',
          actionType: 'RECONCILE',
          module: 'Rekonsiliasi Bank',
          recordId: 'FULL_SYNC',
          recordCode: 'CROSS_MODULE_SYNC',
          description: `Sinkronisasi menyeluruh 7 Modul Keuangan berhasil: Buku Kas & Jurnal COA, Hutang Vendor, Piutang Klien, 12 Baris Jadwal Dividen, Forecast Pengeluaran, Laba Rugi, dan Laporan Keuangan SAK.`
        });
      }

      setNotification({
        type: 'success',
        message: '⚡ 7 Modul Keuangan berhasil disinkronkan secara menyeluruh (Buku Kas, AP/AR, Investasi, Forecast, P&L, SAK, dan Audit Trail)!'
      });
      setTimeout(() => setNotification(null), 4500);
    } finally {
      setIsSyncingAllModules(false);
    }
  };

  // Run Auto-Matching Algorithm on Current Statement (or All Statements) with 2-Way Sync
  const handleExecuteAutoMatch = (
    options: {
      scope?: 'ACTIVE' | 'ALL';
      minConfidence?: number;
      toleranceDays?: number;
      amountTolerance?: number;
      syncBukuKas?: boolean;
    } = {}
  ) => {
    const targetScope = options.scope || autoMatchScope;
    const minConfidence = options.minConfidence !== undefined ? options.minConfidence : autoMatchMinConfidence;
    const toleranceDays = options.toleranceDays !== undefined ? options.toleranceDays : autoMatchToleranceDays;
    const amountTolerance = options.amountTolerance !== undefined ? options.amountTolerance : autoMatchAmountTolerance;
    const syncBukuKas = options.syncBukuKas !== undefined ? options.syncBukuKas : autoSyncToBukuKas;

    if (bankStatements.length === 0) return;

    let totalMatchedOverall = 0;
    let totalExactDateAndAmountOverall = 0;
    const allMatchedTrxMap = new Map<string, string>(); // trxId -> bankStatementItemId
    const newlyMatchedItems: Array<{ item: BankStatementItem; trxCode?: string; trxTitle?: string }> = [];

    const updatedStatements = bankStatements.map((stmt) => {
      if (targetScope === 'ACTIVE' && stmt.id !== activeStatement?.id) {
        return stmt;
      }

      const { matchedItems, matchedTrxMap, exactDateAndAmountCount, totalMatchedCount } = executeAutoMatchLogic(
        stmt.items,
        transactions,
        {
          minConfidence,
          toleranceDays,
          amountTolerance,
          forceRematch: true
        }
      );

      matchedTrxMap.forEach((val, key) => {
        allMatchedTrxMap.set(key, val);
      });

      matchedItems.forEach((it) => {
        if (it.matchStatus === 'MATCHED') {
          newlyMatchedItems.push({
            item: it,
            trxCode: it.matchedTransactionCode,
            trxTitle: it.description
          });
        }
      });

      totalMatchedOverall += totalMatchedCount;
      totalExactDateAndAmountOverall += exactDateAndAmountCount;

      const matchedCount = matchedItems.filter(
        (i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED'
      ).length;
      const unmatchedCount = matchedItems.length - matchedCount;

      return {
        ...stmt,
        items: matchedItems,
        matchedCount,
        unmatchedCount
      };
    });

    onUpdateStatements(updatedStatements);

    // Sync 2-Way to Internal Buku Kas transactions
    let finalTrxs = transactions;
    if (syncBukuKas && allMatchedTrxMap.size > 0) {
      finalTrxs = transactions.map((t) => {
        if (allMatchedTrxMap.has(t.id)) {
          return {
            ...t,
            isReconciled: true,
            bankStatementItemId: allMatchedTrxMap.get(t.id)
          };
        }
        return t;
      });

      if (onBatchUpdateTransactions) {
        onBatchUpdateTransactions(finalTrxs);
      } else {
        finalTrxs.forEach((t) => {
          if (allMatchedTrxMap.has(t.id)) onUpdateTransaction(t);
        });
      }
    }

    // Sync COA Balances and Hutang/Piutang/Investments
    recalculateAndSyncAccounts(finalTrxs);
    if (newlyMatchedItems.length > 0) {
      syncHutangPiutangAndInvestments(newlyMatchedItems);
    }

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'RECONCILE',
        module: 'Rekonsiliasi Bank',
        recordId: activeStatement?.id || 'ALL',
        recordCode: targetScope === 'ACTIVE' ? activeStatement?.bankName : 'ALL_STATEMENTS',
        description: `Menjalankan Auto-Match Otomatis (${targetScope === 'ACTIVE' ? activeStatement?.bankName : 'Semua Rekening'}) - ${totalMatchedOverall} mutasi berhasil dicocokkan berdasarkan Tanggal & Nominal (${totalExactDateAndAmountOverall} tanggal & nominal persis sama) dan disinkronkan ke seluruh modul keuangan.`
      });
    }

    setIsAutoMatchModalOpen(false);

    setNotification({
      type: 'success',
      message: `⚡ Auto-Match Berhasil! ${totalMatchedOverall} mutasi berhasil dicocokkan otomatis (${totalExactDateAndAmountOverall} tanggal & nominal persis sama) dan 7 Modul Keuangan berhasil disinkronkan!`
    });
    setTimeout(() => setNotification(null), 4500);
  };

  // Quick 1-click Run Auto-Match from header button
  const handleRunAutoMatch = () => {
    handleExecuteAutoMatch({ scope: 'ACTIVE' });
  };

  // Batch Auto-Journal Generator for all unmatched items
  const handleBulkGenerateJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStatement) return;

    const unmatchedItems = activeStatement.items.filter((i) => i.matchStatus === 'UNMATCHED');
    if (unmatchedItems.length === 0) {
      alert('Semua mutasi pada rekening koran ini sudah tercatat dan cocok!');
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    let runningTrxCount = transactions.length;
    const newTrxs: FinanceTransaction[] = [];
    const updatedStatementItems = [...activeStatement.items];

    unmatchedItems.forEach((item) => {
      runningTrxCount++;
      const isCr = item.type === 'CR';
      const prefix = isCr ? 'BKM' : 'BKK';
      const code = `${prefix}-${currentYear}${currentMonth}-${String(runningTrxCount).padStart(3, '0')}`;
      const newTrxId = `trx-auto-${Date.now()}-${runningTrxCount}`;

      const contraAccountCode = isCr ? batchJournalIncomeAccount : batchJournalExpenseAccount;
      const primaryAccCode = '1120'; // Default BCA or matched bank

      const newTrx: FinanceTransaction = {
        id: newTrxId,
        code,
        date: item.date,
        type: isCr ? 'IN' : 'OUT',
        title: item.description,
        description: `Dicatat otomatis masal dari mutasi e-Statement: ${item.description}${
          item.referenceNumber ? ` (Ref: ${item.referenceNumber})` : ''
        }`,
        amount: item.amount,
        paymentMethod: activeStatement.bankName?.toUpperCase().includes('MANDIRI')
          ? 'Bank Mandiri (987-654-3210)'
          : activeStatement.bankName?.toUpperCase().includes('BNI')
          ? 'Bank BNI (555-444-333)'
          : activeStatement.bankName?.toUpperCase().includes('BRI')
          ? 'Bank BRI (888-999-000)'
          : 'Bank BCA (123-456-7890)',
        primaryAccountCode: primaryAccCode,
        contraAccountCode: contraAccountCode,
        journalEntries: isCr
          ? [
              {
                id: `je-${newTrxId}-1`,
                accountCode: primaryAccCode,
                accountName: 'Bank BCA',
                debit: item.amount,
                credit: 0
              },
              {
                id: `je-${newTrxId}-2`,
                accountCode: contraAccountCode,
                accountName: accounts.find((a) => a.code === contraAccountCode)?.name || 'Pendapatan',
                debit: 0,
                credit: item.amount
              }
            ]
          : [
              {
                id: `je-${newTrxId}-1`,
                accountCode: contraAccountCode,
                accountName: accounts.find((a) => a.code === contraAccountCode)?.name || 'Beban Operasional',
                debit: item.amount,
                credit: 0
              },
              {
                id: `je-${newTrxId}-2`,
                accountCode: primaryAccCode,
                accountName: 'Bank BCA',
                debit: 0,
                credit: item.amount
              }
            ],
        projectId: batchJournalProjectId || 'ALL',
        division: 'HQ Management & Operasional',
        currency: 'IDR',
        exchangeRate: 1,
        referenceNumber: item.referenceNumber || 'BANK-MUTATION',
        payeeOrPayer: item.description,
        isReconciled: true,
        bankStatementItemId: item.id,
        isAdjusting: false,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Finance Admin'
      };

      newTrxs.push(newTrx);

      // Update item in statement
      const itemIndex = updatedStatementItems.findIndex((it) => it.id === item.id);
      if (itemIndex >= 0) {
        updatedStatementItems[itemIndex] = {
          ...updatedStatementItems[itemIndex],
          matchStatus: 'MATCHED',
          matchedTransactionId: newTrx.id,
          matchedTransactionCode: newTrx.code,
          confidenceScore: 100,
          notes: 'Dibuat otomatis via Auto-Jurnal Masal'
        };
      }
    });

    // Save newly created transactions
    if (onBatchAddTransactions) {
      onBatchAddTransactions(newTrxs);
    } else {
      newTrxs.forEach((t) => onAddTransaction(t));
    }

    const allCurrentTrxs = [...transactions, ...newTrxs];

    // Synchronize COA Balances & Debts/Receivables/Investments
    recalculateAndSyncAccounts(allCurrentTrxs);
    syncHutangPiutangAndInvestments(
      newTrxs.map((nt) => {
        const correspondingItem = unmatchedItems.find((ui) => ui.id === nt.bankStatementItemId);
        return {
          item: correspondingItem || {
            id: nt.bankStatementItemId || '',
            date: nt.date,
            type: nt.type === 'IN' ? 'CR' : 'DB',
            description: nt.title,
            amount: nt.amount,
            matchStatus: 'MATCHED'
          },
          trxCode: nt.code,
          trxTitle: nt.title
        };
      })
    );

    // Update active statement
    const updatedStatements = bankStatements.map((s) => {
      if (s.id === activeStatement.id) {
        return {
          ...s,
          items: updatedStatementItems,
          matchedCount: updatedStatementItems.filter((i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED').length,
          unmatchedCount: updatedStatementItems.filter((i) => i.matchStatus === 'UNMATCHED').length
        };
      }
      return s;
    });

    onUpdateStatements(updatedStatements);

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'CREATE',
        module: 'Rekonsiliasi Bank',
        recordId: activeStatement.id,
        recordCode: activeStatement.fileName,
        description: `Membuat ${newTrxs.length} transaksi Buku Kas baru secara masal dari mutasi rekening koran ${activeStatement.bankName}, menyinkronkan COA & seluruh modul keuangan.`
      });
    }

    setIsBatchJournalModalOpen(false);

    setNotification({
      type: 'success',
      message: `⚡ Berhasil membuat ${newTrxs.length} transaksi Buku Kas dan merekonsiliasi seluruh mutasi rekening koran serta menyinkronkan COA & Modul Terkait!`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Convert Unmatched Statement Item to New Internal Transaction
  const handleQuickConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickConvertItem || !activeStatement) return;

    const form = e.target as any;
    const accountCode = form.accountCode?.value || (quickConvertItem.type === 'CR' ? '4110' : '5120');
    const projectId = form.projectId?.value || 'ALL';
    const title = form.title?.value || quickConvertItem.description;
    const now = new Date();

    const isCr = quickConvertItem.type === 'CR';
    const prefix = isCr ? 'BKM' : 'BKK';
    const code = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(transactions.length + 1).padStart(3, '0')}`;

    const primaryAccCode = '1120'; // BCA
    const selectedAcc = accounts.find((a) => a.code === accountCode);
    const selectedProj = projects.find((p) => p.id === projectId);

    const newTrx: FinanceTransaction = {
      id: `trx-${Date.now()}`,
      code,
      date: quickConvertItem.date,
      type: isCr ? 'IN' : 'OUT',
      title: title || quickConvertItem.description,
      description: `Dicatat otomatis dari mutasi rekening koran: ${quickConvertItem.description}`,
      amount: quickConvertItem.amount,
      paymentMethod: activeStatement.bankName || 'Bank BCA (123-456-7890)',
      primaryAccountCode: primaryAccCode,
      contraAccountCode: accountCode,
      journalEntries: isCr
        ? [
            {
              id: `j-${Date.now()}-1`,
              accountCode: primaryAccCode,
              accountName: `${activeStatement.bankName || 'Bank BCA'} - Rek Operasional`,
              debit: quickConvertItem.amount,
              credit: 0,
              notes: 'Penerimaan rekening koran'
            },
            {
              id: `j-${Date.now()}-2`,
              accountCode,
              accountName: selectedAcc?.name || 'Pendapatan',
              debit: 0,
              credit: quickConvertItem.amount,
              notes: title
            }
          ]
        : [
            {
              id: `j-${Date.now()}-1`,
              accountCode,
              accountName: selectedAcc?.name || 'Beban Operasional',
              debit: quickConvertItem.amount,
              credit: 0,
              notes: title
            },
            {
              id: `j-${Date.now()}-2`,
              accountCode: primaryAccCode,
              accountName: `${activeStatement.bankName || 'Bank BCA'} - Rek Operasional`,
              debit: 0,
              credit: quickConvertItem.amount,
              notes: 'Pengeluaran rekening koran'
            }
          ],
      projectId,
      projectName: selectedProj ? selectedProj.name : 'Seluruh Lokasi (HQ)',
      division: 'Cleaning Service',
      currency: 'IDR',
      exchangeRate: 1,
      referenceNumber: quickConvertItem.referenceNumber || 'BANK-MUTATION',
      payeeOrPayer: quickConvertItem.description,
      isReconciled: true,
      bankStatementItemId: quickConvertItem.id,
      isAdjusting: false,
      createdAt: `${quickConvertItem.date} 12:00`,
      createdBy: currentUser?.name || 'Finance Admin'
    };

    // Add transaction
    onAddTransaction(newTrx);

    // Sync COA and Hutang / Piutang / Investasi
    const updatedTransactions = [...transactions, newTrx];
    recalculateAndSyncAccounts(updatedTransactions);

    syncHutangPiutangAndInvestments([
      {
        item: quickConvertItem,
        trxCode: newTrx.code,
        trxTitle: newTrx.title,
        targetType: quickConvertCategory,
        targetId: quickConvertTargetId
      }
    ]);

    // Update statement item as MATCHED
    const updatedItems = activeStatement.items.map((i) => {
      if (i.id === quickConvertItem.id) {
        return {
          ...i,
          matchStatus: 'MATCHED' as ReconcileStatus,
          matchedTransactionId: newTrx.id,
          matchedTransactionCode: newTrx.code,
          confidenceScore: 100,
          notes: `Dibuat & dicocokkan otomatis dengan ${newTrx.code}`
        };
      }
      return i;
    });

    const updatedStatements = bankStatements.map((s) => {
      if (s.id === activeStatement.id) {
        const matchedCount = updatedItems.filter((i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED').length;
        return {
          ...s,
          items: updatedItems,
          matchedCount,
          unmatchedCount: updatedItems.length - matchedCount
        };
      }
      return s;
    });

    onUpdateStatements(updatedStatements);

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'CREATE',
        module: 'Rekonsiliasi Bank',
        recordId: newTrx.id,
        recordCode: newTrx.code,
        description: `Konversi cepat mutasi ${quickConvertItem.description} (${financeService.formatRupiah(quickConvertItem.amount)}) menjadi transaksi ${code} & sinkronisasi modul ${quickConvertCategory}.`
      });
    }

    setQuickConvertItem(null);
    setQuickConvertCategory('STANDARD');
    setQuickConvertTargetId('');

    setNotification({
      type: 'success',
      message: `Mutasi berhasil dicatat sebagai transaksi ${code}, berstatus MATCHED, dan disinkronkan ke seluruh modul keuangan!`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle Manual Match with Existing Transaction
  const handleManualForceMatch = (trxId: string) => {
    if (!manualMatchItem || !activeStatement) return;

    const matchedTrx = transactions.find((t) => t.id === trxId);
    if (!matchedTrx) return;

    const updatedItems = activeStatement.items.map((i) => {
      if (i.id === manualMatchItem.id) {
        return {
          ...i,
          matchStatus: 'MANUAL_MATCHED' as ReconcileStatus,
          matchedTransactionId: matchedTrx.id,
          matchedTransactionCode: matchedTrx.code,
          confidenceScore: 100,
          notes: `Dicocokkan manual oleh ${currentUser?.name || 'Finance Admin'}`
        };
      }
      return i;
    });

    const updatedStatements = bankStatements.map((s) => {
      if (s.id === activeStatement.id) {
        const matchedCount = updatedItems.filter((i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED').length;
        return {
          ...s,
          items: updatedItems,
          matchedCount,
          unmatchedCount: updatedItems.length - matchedCount
        };
      }
      return s;
    });

    // Mark internal transaction as reconciled
    const reconciledTrx: FinanceTransaction = { ...matchedTrx, isReconciled: true, bankStatementItemId: manualMatchItem.id };
    onUpdateTransaction(reconciledTrx);
    onUpdateStatements(updatedStatements);

    // Sync cross-module
    recalculateAndSyncAccounts(transactions);
    syncHutangPiutangAndInvestments([
      {
        item: manualMatchItem,
        trxCode: matchedTrx.code,
        trxTitle: matchedTrx.title
      }
    ]);

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'RECONCILE',
        module: 'Rekonsiliasi Bank',
        recordId: manualMatchItem.id,
        recordCode: matchedTrx.code,
        description: `Pencocokan manual mutasi ${manualMatchItem.description} dengan transaksi ${matchedTrx.code} (${financeService.formatRupiah(manualMatchItem.amount)}) & sinkronisasi modul keuangan.`
      });
    }

    setManualMatchItem(null);
    setNotification({
      type: 'success',
      message: `Mutasi berhasil dicocokkan manual dengan ${matchedTrx.code} dan disinkronkan ke seluruh modul keuangan!`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle Unmatch / Release
  const handleUnmatch = (item: BankStatementItem) => {
    if (!activeStatement) return;

    if (item.matchedTransactionId) {
      const targetTrx = transactions.find((t) => t.id === item.matchedTransactionId);
      if (targetTrx) {
        onUpdateTransaction({
          ...targetTrx,
          isReconciled: false,
          bankStatementItemId: undefined
        });
      }
    }

    const updatedItems = activeStatement.items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          matchStatus: 'UNMATCHED' as ReconcileStatus,
          matchedTransactionId: undefined,
          matchedTransactionCode: undefined,
          confidenceScore: 0,
          notes: 'Dilepas dari pencocokan'
        };
      }
      return i;
    });

    const updatedStatements = bankStatements.map((s) => {
      if (s.id === activeStatement.id) {
        const matchedCount = updatedItems.filter((i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED').length;
        return {
          ...s,
          items: updatedItems,
          matchedCount,
          unmatchedCount: updatedItems.length - matchedCount
        };
      }
      return s;
    });

    onUpdateStatements(updatedStatements);

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'UPDATE',
        module: 'Rekonsiliasi Bank',
        recordId: item.id,
        recordCode: item.matchedTransactionCode || 'UNMATCH',
        description: `Melepas pencocokan rekonsiliasi mutasi ${item.description} (${financeService.formatRupiah(item.amount)}).`
      });
    }

    setNotification({
      type: 'info',
      message: 'Status pencocokan mutasi bank telah dilepas (UNMATCHED).'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle Upload Statement Success from BankStatementUploadModal
  const handleImportSuccess = (newImport: BankStatementImport) => {
    const nextStatements = [newImport, ...bankStatements];
    onUpdateStatements(nextStatements);
    setSelectedStatementId(newImport.id);

    // Auto-sync matched internal transactions if any
    const matchedPairs = newImport.items.filter((i) => (i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED') && i.matchedTransactionId);
    if (matchedPairs.length > 0) {
      const matchedMap = new Map(matchedPairs.map((i) => [i.matchedTransactionId!, i.id]));
      const updatedTrxs = transactions
        .filter((t) => matchedMap.has(t.id))
        .map((t) => ({
          ...t,
          isReconciled: true,
          bankStatementItemId: matchedMap.get(t.id)
        }));

      if (updatedTrxs.length > 0) {
        if (onBatchUpdateTransactions) {
          onBatchUpdateTransactions(updatedTrxs);
        } else {
          updatedTrxs.forEach((t) => onUpdateTransaction(t));
        }
      }

      // Sync COA balances and entities
      recalculateAndSyncAccounts(transactions);
      syncHutangPiutangAndInvestments(
        matchedPairs.map((mp) => ({
          item: mp,
          trxCode: mp.matchedTransactionCode,
          trxTitle: mp.description
        }))
      );
    }

    setNotification({
      type: 'success',
      message: `⚡ Rekening koran "${newImport.bankName}" (${newImport.items.length} mutasi) berhasil diunggah dengan ${newImport.matchedCount} transaksi auto-matched (${newImport.items.length > 0 ? Math.round((newImport.matchedCount / newImport.items.length) * 100) : 0}% akurasi)!`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // DELETE ACTIVE BANK STATEMENT HANDLER (CASCADE DELETE TRANSAKSI SISTEM)
  // ---------------------------------------------------------------------------
  const handleDeleteActiveStatement = () => {
    if (!activeStatement) return;

    const deletedId = activeStatement.id;
    const deletedName = `${activeStatement.bankName} - ${activeStatement.periodMonth}`;
    const count = activeStatement.items.length;
    const statementItemIds = new Set<string>(activeStatement.items.map((i) => i.id));

    // Ambil seluruh transaksi internal yang dimuat atau dicocokkan dengan rekening koran ini
    const trxsToDelete = activeStatementRelatedTransactions;
    const deletedTrxIds: string[] = trxsToDelete.map((t) => t.id);
    const deletedTrxCodes = new Set<string>(trxsToDelete.map((t) => t.code));
    const totalDeletedAmount = activeStatementRelatedAmount;

    // 1. Hapus transaksi sistem secara otomatis (Cascade Delete)
    if (deleteRelatedTransactions && deletedTrxIds.length > 0) {
      if (onBatchDeleteTransactions) {
        onBatchDeleteTransactions(deletedTrxIds);
      } else if (onDeleteTransaction) {
        deletedTrxIds.forEach((id) => onDeleteTransaction(id));
      }

      // Hitung ulang saldo buku besar & akun COA
      const remainingTrxs = transactions.filter((t) => !deletedTrxIds.includes(t.id));
      recalculateAndSyncAccounts(remainingTrxs);

      // Rollback pembayaran hutang/piutang/dividen yang terhubung
      rollbackDebtsReceivablesAndInvestments(deletedTrxCodes, new Set<string>(deletedTrxIds), statementItemIds);
    } else {
      // Jika cascade dinonaktifkan, lepaskan status relasi pencocokan
      transactions.forEach((trx) => {
        if (trx.bankStatementItemId && statementItemIds.has(trx.bankStatementItemId)) {
          onUpdateTransaction({
            ...trx,
            isReconciled: false,
            bankStatementItemId: undefined
          });
        }
      });
    }

    // 2. Hapus berkas rekening koran dari state
    const nextStatements = bankStatements.filter((s) => s.id !== deletedId);
    onUpdateStatements(nextStatements);
    setSelectedStatementId(nextStatements[0]?.id || '');
    setIsDeleteModalOpen(false);

    // 3. Catat Riwayat Audit Trail
    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'DELETE',
        module: 'Rekonsiliasi Bank',
        recordId: deletedId,
        recordCode: activeStatement.fileName || activeStatement.bankName,
        description: `Menghapus rekening koran "${deletedName}" (${activeStatement.accountNumber}) berisi ${count} mutasi. Sebanyak ${deletedTrxIds.length} transaksi di dalam sistem otomatis dihapus secara serentak (Total nominal: ${financeService.formatRupiah(totalDeletedAmount)}).`
      });
    }

    setNotification({
      type: 'success',
      message: `Rekening koran "${deletedName}" dan ${deletedTrxIds.length} transaksi yang dimuat di sistem (${financeService.formatRupiah(totalDeletedAmount)}) berhasil otomatis dihapus.`
    });
    setTimeout(() => setNotification(null), 4500);
  };

  // ---------------------------------------------------------------------------
  // DELETE ALL BANK STATEMENTS HANDLER (CASCADE DELETE SEMUA TRANSAKSI SISTEM)
  // ---------------------------------------------------------------------------
  const handleDeleteAllStatements = () => {
    if (bankStatements.length === 0) return;

    const totalStatementCount = bankStatements.length;
    const totalMutasiCount = bankStatements.reduce((sum, s) => sum + s.items.length, 0);

    const allItemIds = new Set<string>();
    bankStatements.forEach((stmt) => {
      stmt.items.forEach((item) => allItemIds.add(item.id));
    });

    const trxsToDelete = allStatementsRelatedTransactions;
    const deletedTrxIds: string[] = trxsToDelete.map((t) => t.id);
    const deletedTrxCodes = new Set<string>(trxsToDelete.map((t) => t.code));
    const totalDeletedAmount = allStatementsRelatedAmount;

    // 1. Hapus seluruh transaksi internal yang dimuat dari rekening koran
    if (deleteRelatedTransactions && deletedTrxIds.length > 0) {
      if (onBatchDeleteTransactions) {
        onBatchDeleteTransactions(deletedTrxIds);
      } else if (onDeleteTransaction) {
        deletedTrxIds.forEach((id) => onDeleteTransaction(id));
      }

      const remainingTrxs = transactions.filter((t) => !deletedTrxIds.includes(t.id));
      recalculateAndSyncAccounts(remainingTrxs);
      rollbackDebtsReceivablesAndInvestments(deletedTrxCodes, new Set<string>(deletedTrxIds), allItemIds);
    } else {
      transactions.forEach((trx) => {
        if (trx.bankStatementItemId || trx.isReconciled) {
          onUpdateTransaction({
            ...trx,
            isReconciled: false,
            bankStatementItemId: undefined
          });
        }
      });
    }

    // 2. Kosongkan seluruh rekening koran
    onUpdateStatements([]);
    setSelectedStatementId('');
    setIsDeleteAllModalOpen(false);

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'DELETE',
        module: 'Rekonsiliasi Bank',
        recordId: 'ALL_STATEMENTS',
        recordCode: 'CASCADE_DELETE_ALL',
        description: `Menghapus seluruh (${totalStatementCount}) rekening koran dan ${deletedTrxIds.length} transaksi internal yang dimuat di sistem secara otomatis (Total nominal: ${financeService.formatRupiah(totalDeletedAmount)}).`
      });
    }

    setNotification({
      type: 'success',
      message: `Seluruh (${totalStatementCount}) rekening koran dan ${deletedTrxIds.length} transaksi di sistem berhasil otomatis dihapus.`
    });
    setTimeout(() => setNotification(null), 4500);
  };

  // ---------------------------------------------------------------------------
  // DELETE SINGLE STATEMENT ITEM (CASCADE DELETE TRANSAKSI SISTEM TERKAIT)
  // ---------------------------------------------------------------------------
  const handleDeleteStatementItem = (itemToDelete: BankStatementItem) => {
    if (!activeStatement) return;

    // Temukan transaksi internal yang tertaut dengan baris mutasi ini
    const linkedTrxs = transactions.filter(
      (t) =>
        t.id === itemToDelete.matchedTransactionId ||
        t.bankStatementItemId === itemToDelete.id ||
        (itemToDelete.matchedTransactionCode && t.code === itemToDelete.matchedTransactionCode)
    );

    const linkedTrxIds: string[] = linkedTrxs.map((t) => t.id);
    const linkedTrxCodes = new Set<string>(linkedTrxs.map((t) => t.code));

    // Hapus transaksi internal terkait secara otomatis jika ada
    if (linkedTrxIds.length > 0) {
      if (onBatchDeleteTransactions) {
        onBatchDeleteTransactions(linkedTrxIds);
      } else if (onDeleteTransaction) {
        linkedTrxIds.forEach((id) => onDeleteTransaction(id));
      }

      const remainingTrxs = transactions.filter((t) => !linkedTrxIds.includes(t.id));
      recalculateAndSyncAccounts(remainingTrxs);
      rollbackDebtsReceivablesAndInvestments(
        linkedTrxCodes,
        new Set<string>(linkedTrxIds),
        new Set<string>([itemToDelete.id])
      );
    }

    // Hapus baris dari rekening koran aktif
    const updatedItems = activeStatement.items.filter((i) => i.id !== itemToDelete.id);
    const matchedCount = updatedItems.filter(
      (i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED'
    ).length;

    const updatedStatement: BankStatementImport = {
      ...activeStatement,
      items: updatedItems,
      totalTransactions: updatedItems.length,
      matchedCount,
      unmatchedCount: updatedItems.length - matchedCount,
      totalCredit: updatedItems.filter((i) => i.type === 'CR').reduce((s, i) => s + i.amount, 0),
      totalDebit: updatedItems.filter((i) => i.type === 'DB').reduce((s, i) => s + i.amount, 0)
    };

    const nextStatements = bankStatements.map((s) =>
      s.id === activeStatement.id ? updatedStatement : s
    );
    onUpdateStatements(nextStatements);

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'DELETE',
        module: 'Rekonsiliasi Bank',
        recordId: itemToDelete.id,
        recordCode: itemToDelete.matchedTransactionCode || itemToDelete.referenceNumber || 'STATEMENT_ITEM',
        description: `Menghapus baris mutasi "${itemToDelete.description}" (${financeService.formatRupiah(itemToDelete.amount)}) dan otomatis menghapus ${linkedTrxIds.length} transaksi sistem terkait.`
      });
    }

    setNotification({
      type: 'success',
      message: `Baris mutasi bank dan ${linkedTrxIds.length > 0 ? `${linkedTrxIds.length} transaksi sistem terkait (${linkedTrxs.map((t) => t.code).join(', ')})` : 'data mutasi'} berhasil dihapus.`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // EDIT STATEMENT ITEM (TANGGAL, KETERANGAN, JENIS, NOMINAL) & UPDATE
  // ---------------------------------------------------------------------------
  const handleOpenEditModal = (item: BankStatementItem) => {
    setEditingItem(item);
    setEditDate(item.date || new Date().toISOString().split('T')[0]);
    setEditDescription(item.description || '');
    setEditType(item.type || 'CR');
    setEditAmount(item.amount || 0);
    setEditSyncMatchedTrx(true);
    setEditError(null);
  };

  const handleUpdateStatementItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !activeStatement) return;

    const trimmedDesc = editDescription.trim();
    if (!trimmedDesc) {
      setEditError('Keterangan mutasi bank tidak boleh kosong.');
      return;
    }

    const numAmount = typeof editAmount === 'string' ? parseFloat(editAmount) : editAmount;
    if (isNaN(numAmount) || numAmount < 0) {
      setEditError('Nominal mutasi harus berupa angka valid dan lebih besar atau sama dengan 0.');
      return;
    }

    if (!editDate) {
      setEditError('Tanggal mutasi bank harus diisi.');
      return;
    }

    // 1. Update the statement item in activeStatement
    const updatedItems = activeStatement.items.map((i) => {
      if (i.id === editingItem.id) {
        return {
          ...i,
          date: editDate,
          description: trimmedDesc,
          type: editType,
          amount: numAmount
        };
      }
      return i;
    });

    const totalCredit = updatedItems.filter((i) => i.type === 'CR').reduce((s, i) => s + i.amount, 0);
    const totalDebit = updatedItems.filter((i) => i.type === 'DB').reduce((s, i) => s + i.amount, 0);
    const matchedCount = updatedItems.filter(
      (i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED'
    ).length;

    const updatedStatement: BankStatementImport = {
      ...activeStatement,
      items: updatedItems,
      totalCredit,
      totalDebit,
      matchedCount,
      unmatchedCount: updatedItems.length - matchedCount
    };

    const nextStatements = bankStatements.map((s) =>
      s.id === activeStatement.id ? updatedStatement : s
    );
    onUpdateStatements(nextStatements);

    // 2. If matched to a system transaction and user opted to sync:
    let syncedTrxCode: string | undefined = undefined;
    if (editSyncMatchedTrx && (editingItem.matchedTransactionId || editingItem.matchedTransactionCode)) {
      const targetTrx = transactions.find(
        (t) =>
          t.id === editingItem.matchedTransactionId ||
          t.bankStatementItemId === editingItem.id ||
          (editingItem.matchedTransactionCode && t.code === editingItem.matchedTransactionCode)
      );

      if (targetTrx) {
        syncedTrxCode = targetTrx.code;
        const newTrxType = editType === 'CR' ? 'INCOME' : 'EXPENSE';
        const updatedTrx: FinanceTransaction = {
          ...targetTrx,
          date: editDate,
          amount: numAmount,
          title: trimmedDesc,
          description: `Mutasi Bank: ${trimmedDesc}`,
          type: newTrxType,
          lines: targetTrx.lines.map((line) => {
            if (line.debit > 0) return { ...line, debit: numAmount };
            if (line.credit > 0) return { ...line, credit: numAmount };
            return line;
          }),
          updatedAt: new Date().toISOString()
        };

        onUpdateTransaction(updatedTrx);

        const updatedAllTrxs = transactions.map((t) => (t.id === targetTrx.id ? updatedTrx : t));
        recalculateAndSyncAccounts(updatedAllTrxs);
      }
    }

    // 3. Audit log
    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'UPDATE',
        module: 'Rekonsiliasi Bank',
        recordId: editingItem.id,
        recordCode: editingItem.matchedTransactionCode || editingItem.referenceNumber || 'STATEMENT_ITEM',
        description: `Memperbarui baris mutasi bank: Tanggal ${editDate}, Keterangan "${trimmedDesc}", Jenis ${editType}, Nominal ${financeService.formatRupiah(numAmount)}${syncedTrxCode ? ` (sinkron ke transaksi sistem ${syncedTrxCode})` : ''}.`
      });
    }

    setNotification({
      type: 'success',
      message: `Data mutasi bank "${trimmedDesc}" berhasil di-update${syncedTrxCode ? ` & transaksi sistem (${syncedTrxCode}) telah disinkronkan` : ''}.`
    });
    setTimeout(() => setNotification(null), 3500);

    setEditingItem(null);
  };

  // Quick Preset Sample Loader
  const handleLoadSampleStatement = (bankKey: 'BNI' | 'BCA' | 'MANDIRI' = 'BNI') => {
    const sample = getSamplePresetStatement(bankKey);
    const newImport: BankStatementImport = {
      id: `stmt-${Date.now()}`,
      bankName: sample.bankName,
      accountNumber: sample.accountNumber,
      accountHolder: sample.accountHolder,
      periodMonth: sample.periodMonth,
      fileName: sample.fileName,
      uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      totalTransactions: sample.items.length,
      totalCredit: sample.totalCredit,
      totalDebit: sample.totalDebit,
      matchedCount: sample.items.filter((i) => i.matchStatus === 'MATCHED').length,
      unmatchedCount: sample.items.filter((i) => i.matchStatus === 'UNMATCHED').length,
      items: sample.items
    };

    const nextStatements = [newImport, ...bankStatements];
    onUpdateStatements(nextStatements);
    setSelectedStatementId(newImport.id);

    setNotification({
      type: 'success',
      message: `Contoh rekening koran ${sample.bankName} berhasil dimuat.`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : notification.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
              : 'bg-blue-950/90 text-blue-300 border-blue-500/40'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Reconcile Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Rekonsiliasi Bank & Pembaca Rekening Koran
                </h1>
                <p className="text-xs text-slate-400">
                  Upload e-Statement mutasi bank, auto-matching dengan buku kas, dan kelola data rekening koran
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>+ Upload Rekening Koran</span>
            </button>

            <div className="inline-flex rounded-xl shadow-lg shadow-emerald-900/30">
              <button
                onClick={handleRunAutoMatch}
                disabled={!activeStatement || activeStatement.items.length === 0}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-l-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-all cursor-pointer border-r border-emerald-500/50"
                title="Jalankan Auto-Match Otomatis Cerdas sekarang"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Auto-Match Otomatis Masal</span>
              </button>
              <button
                onClick={() => setIsAutoMatchModalOpen(true)}
                disabled={!activeStatement || activeStatement.items.length === 0}
                className="px-2.5 py-2.5 rounded-r-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-all cursor-pointer"
                title="Buka opsi & pengaturan parameter Auto-Match"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeStatement && stats.unmatchedCount > 0 && (
              <button
                onClick={() => setIsBatchJournalModalOpen(true)}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all cursor-pointer animate-in fade-in"
                title="Otomatis buat transaksi Buku Kas untuk seluruh mutasi yang belum terdaftar"
              >
                <PlusCircle className="w-4 h-4 text-indigo-200" />
                <span>⚡ Buat Jurnal Masal ({stats.unmatchedCount})</span>
              </button>
            )}

            {activeStatement && (
              <button
                id="delete-active-bank-statement-btn"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-800/80 text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-950/30"
                title="Hapus berkas rekening koran yang sedang aktif"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Hapus Rekening Koran Aktif</span>
              </button>
            )}
          </div>
        </div>

        {/* Bank Statement Selector & KPI Banner */}
        {bankStatements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Rekening Koran Aktif ({bankStatements.length})
                  </label>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
                    title="Hapus rekening koran yang dipilih"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                </div>
                <select
                  value={selectedStatementId}
                  onChange={(e) => setSelectedStatementId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:outline-none"
                >
                  {bankStatements.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.bankName} - {s.periodMonth} ({s.items.length} Trx)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-800/80">
                <span className="truncate">{activeStatement?.accountNumber} ({activeStatement?.accountHolder})</span>
                {bankStatements.length > 1 && (
                  <button
                    onClick={() => setIsDeleteAllModalOpen(true)}
                    className="text-slate-400 hover:text-rose-400 underline shrink-0 ml-1"
                  >
                    Hapus Semua
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Tingkat Kesesuaian</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <div className="text-xl font-extrabold text-emerald-400">{stats.matchPct}%</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {stats.matchedCount} / {stats.totalCount} Matched
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.matchPct}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Mutasi Masuk (CR)</span>
              <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                {financeService.formatRupiah(stats.totalCr)}
              </div>
              <span className="text-[10px] text-slate-500">Penerimaan Rekening Bank</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Mutasi Keluar (DB)</span>
              <div className="text-base font-extrabold text-rose-400 mt-0.5">
                {financeService.formatRupiah(stats.totalDb)}
              </div>
              <span className="text-[10px] text-slate-500">Pengeluaran Rekening Bank</span>
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3 text-slate-400">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Belum Ada Rekening Koran yang Diimpor</div>
                  <p className="text-[11px] text-slate-400">
                    Data rekening koran sedang kosong. Unggah file mutasi bank untuk memulai rekonsiliasi.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                >
                  + Upload e-Statement
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Variance & Audit Reconciliation Bar */}
      {activeStatement && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Rekening Koran Bank:</span>
              <div className="text-sm font-bold font-mono text-white">
                {financeService.formatRupiah(bankBookComparison.bankEndingBalance)}
              </div>
            </div>

            <div className="text-slate-500 font-bold text-lg">vs</div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Buku Kas di Sistem:</span>
              <div className="text-sm font-bold font-mono text-white">
                {financeService.formatRupiah(bankBookComparison.bookBalance)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Selisih Rekonsiliasi:</span>
              <div
                className={`text-sm font-extrabold font-mono ${
                  bankBookComparison.variance === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {financeService.formatRupiah(bankBookComparison.variance)}
              </div>
            </div>

            <button
              id="download-reconcile-csv-btn"
              data-testid="download-as-csv-btn"
              onClick={() => {
                if (!activeStatement) return;
                const headers = [
                  'Bank',
                  'No Rekening',
                  'Periode',
                  'Tanggal Mutasi',
                  'Keterangan Mutasi',
                  'Tipe Mutasi',
                  'Nominal (Rp)',
                  'Status Rekonsiliasi',
                  'Kode Transaksi Terkait',
                  'ID Transaksi Terkait'
                ];
                const rows = activeStatement.items.map((i) => [
                  activeStatement.bankName,
                  activeStatement.accountNumber,
                  activeStatement.periodMonth,
                  i.date,
                  i.description,
                  i.type === 'CR' ? 'Kredit (Masuk)' : 'Debit (Keluar)',
                  i.amount,
                  i.matchStatus,
                  i.matchedTransactionCode || '-',
                  i.matchedTransactionId || '-'
                ]);
                financeService.exportToCSV(
                  `Rekonsiliasi_Bank_${activeStatement.bankName}_${activeStatement.periodMonth}`,
                  headers,
                  rows
                );
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white text-xs font-bold border border-emerald-600/50 shadow-md shadow-emerald-950/40 cursor-pointer transition-all"
              title="Download hasil rekonsiliasi dan mutasi rekening bank dalam format CSV untuk Excel atau Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Download as CSV</span>
            </button>

            <button
              onClick={() => {
                if (!activeStatement) return;
                const headers = ['Tanggal', 'Keterangan Mutasi', 'Tipe', 'Nominal (Rp)', 'Status Match', 'Transaksi Terkait'];
                const rows = activeStatement.items.map((i) => [
                  i.date,
                  i.description,
                  i.type === 'CR' ? 'Kredit (Masuk)' : 'Debit (Keluar)',
                  financeService.formatRupiah(i.amount),
                  i.matchStatus,
                  i.matchedTransactionCode || '-'
                ]);
                financeService.exportFinancialStatementPDF(
                  `Laporan Rekonsiliasi Bank ${activeStatement.bankName}`,
                  activeStatement.periodMonth,
                  headers,
                  rows
                );
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7-MODULE FINANCIAL CROSS-SYNCHRONIZATION LIVE STATUS BANNER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-lg shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Status Sinkronisasi 7 Modul Keuangan Terpadu
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  ● Real-Time Auto-Sync Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Setiap mutasi rekening koran yang dicocokkan (Match / Quick-Convert) otomatis menyinkronkan data buku kas, hutang piutang, dan laporan finansial.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunFullCrossModuleSync}
            disabled={isSyncingAllModules}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-950/40 shrink-0"
            title="Jalankan sinkronisasi menyeluruh ke seluruh modul keuangan sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllModules ? 'animate-spin' : ''}`} />
            <span>{isSyncingAllModules ? 'Menyinkronkan...' : '⚡ Sinkronkan 7 Modul Sekarang'}</span>
          </button>
        </div>

        {/* 7 Module Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">1. Buku Kas & Jurnal</span>
            <span className="font-bold text-emerald-400 font-mono text-xs">{transactions.length} Trx Sync</span>
            <span className="text-[9px] text-slate-500">COA & General Ledger</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">2. Hutang Vendor</span>
            <span className="font-bold text-rose-400 font-mono text-xs">
              {debts.filter((d) => d.status === 'PAID').length}/{debts.length} Lunas
            </span>
            <span className="text-[9px] text-slate-500">AP Bill & Aging</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">3. Piutang Klien</span>
            <span className="font-bold text-emerald-400 font-mono text-xs">
              {receivables.filter((r) => r.status === 'PAID').length}/{receivables.length} Lunas
            </span>
            <span className="text-[9px] text-slate-500">AR Invoice & Aging</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">4. Investasi & Dividen</span>
            <span className="font-bold text-purple-400 font-mono text-xs">
              {investments.length} Investor
            </span>
            <span className="text-[9px] text-slate-500">12 Baris Jadwal</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">5. Forecast Belanja</span>
            <span className="font-bold text-blue-400 font-mono text-xs">Gaji + AP + Dividen</span>
            <span className="text-[9px] text-slate-500">Proyeksi Arus Kas</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">6. Laba Rugi (P&L)</span>
            <span className="font-bold text-amber-400 font-mono text-xs">Laba Komprehensif</span>
            <span className="text-[9px] text-slate-500">Revenue & Expense</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">7. SAK & Biaya</span>
            <span className="font-bold text-cyan-400 font-mono text-xs">Neraca & Arus Kas</span>
            <span className="text-[9px] text-slate-500">Cost Center & Audit</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      {activeStatement && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mutasi rekening, nama pengirim, atau no referensi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({activeStatement?.items.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('UNMATCHED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'UNMATCHED'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Belum Cocok ({stats.unmatchedCount})
              </button>
              <button
                onClick={() => setStatusFilter('MATCHED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'MATCHED'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sudah Cocok ({stats.matchedCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Statement Transactions Table */}
      {activeStatement ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Keterangan Mutasi Bank</th>
                  <th className="p-3.5">Jenis</th>
                  <th className="p-3.5 text-right">Nominal Mutasi</th>
                  <th className="p-3.5 text-center">Status Match</th>
                  <th className="p-3.5">Transaksi Sistem Terkait</th>
                  <th className="p-3.5 text-center">Aksi / Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Tidak ada mutasi yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">
                        {item.date}
                      </td>

                      <td className="p-3.5 max-w-[320px]">
                        <div className="font-semibold text-white">{item.description}</div>
                        {item.referenceNumber && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Ref: {item.referenceNumber}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-amber-400/90 mt-0.5 italic">
                            {item.notes}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {item.type === 'CR' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>MASUK (CR)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-bold text-[10px] border border-rose-500/30">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>KELUAR (DB)</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold">
                        <span className={item.type === 'CR' ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.type === 'CR' ? '+' : '-'} {financeService.formatRupiah(item.amount)}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        {item.matchStatus === 'MATCHED' || item.matchStatus === 'MANUAL_MATCHED' ? (
                          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Matched ({item.confidenceScore || 100}%)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            <AlertCircle className="w-3 h-3" />
                            <span>Unmatched</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {item.matchedTransactionCode ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-blue-400 text-xs">
                              {item.matchedTransactionCode}
                            </span>
                            <div className="text-[10px] text-slate-400">Tersinkronisasi ke Buku Kas</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Belum ada jurnal terkait</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {item.matchStatus === 'UNMATCHED' ? (
                            <>
                              <button
                                onClick={() => setQuickConvertItem(item)}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer"
                                title="Konversi langsung menjadi transaksi jurnal baru"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>+ Buat Jurnal</span>
                              </button>

                              <button
                                onClick={() => setManualMatchItem(item)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                                title="Hubungkan secara manual dengan transaksi yang sudah ada"
                              >
                                <LinkIcon className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleUnmatch(item)}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-slate-400 hover:text-amber-400 text-[10px] font-semibold transition-all cursor-pointer"
                              title="Lepas status pencocokan"
                            >
                              <Unlink className="w-3 h-3" />
                              <span>Lepas Match</span>
                            </button>
                          )}

                          {/* Tombol Edit Mutasi */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-blue-900/60 text-slate-400 hover:text-blue-400 border border-slate-700/60 hover:border-blue-500/50 transition-all cursor-pointer"
                            title="Edit data mutasi (Tanggal, Keterangan, Jenis, Nominal)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteStatementItem(item)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/50 transition-all cursor-pointer"
                            title={
                              item.matchedTransactionCode
                                ? `Hapus mutasi & otomatis hapus transaksi sistem (${item.matchedTransactionCode})`
                                : 'Hapus baris mutasi rekening koran ini'
                            }
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
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-blue-400 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-extrabold text-white text-lg">Belum Ada Rekening Koran Aktif</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seluruh data rekening koran telah dibersihkan atau belum diunggah. Unggah file mutasi bank (PDF, Excel, CSV, atau Teks) untuk memulai rekonsiliasi otomatis.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>+ Upload Rekening Koran Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: HAPUS REKENING KORAN AKTIF (CASCADE DELETE TRANSAKSI SISTEM) */}
      {/* ------------------------------------------------------------- */}
      {isDeleteModalOpen && activeStatement && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Hapus Rekening Koran Aktif</h3>
                  <p className="text-xs text-slate-400">Cascade delete transaksi internal yang dimuat di sistem</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Statement Summary Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Bank & Periode:</span>
                <span className="text-amber-400 font-bold font-mono">
                  {activeStatement.bankName} • {activeStatement.periodMonth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Nomor Rekening:</span>
                <span className="text-white font-mono font-semibold">{activeStatement.accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Pemilik Akun:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{activeStatement.accountHolder}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Baris Mutasi:</span>
                <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded-md">
                  {activeStatement.items.length} mutasi
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                <span className="text-rose-400 font-bold">Transaksi Sistem Terkait:</span>
                <span className="text-rose-300 font-mono font-extrabold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  {activeStatementRelatedTransactions.length} transaksi ({financeService.formatRupiah(activeStatementRelatedAmount)})
                </span>
              </div>
            </div>

            {/* Preview Transaksi Terkait di Sistem */}
            {activeStatementRelatedTransactions.length > 0 && (
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/70">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Daftar Kode Transaksi yang Dimuat di Sistem:
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {activeStatementRelatedTransactions.slice(0, 10).map((t) => (
                    <span
                      key={t.id}
                      className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800/50"
                    >
                      {t.code}
                    </span>
                  ))}
                  {activeStatementRelatedTransactions.length > 10 && (
                    <span className="text-[10px] text-slate-500 px-1 py-0.5">
                      +{activeStatementRelatedTransactions.length - 10} transaksi lainnya
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Cascade Delete Checkbox & Notice */}
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center space-x-2 text-rose-300 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Logika Cascade Delete Otomatis Aktif</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Jika rekening koran ini dihapus, seluruh <strong className="text-rose-300">{activeStatementRelatedTransactions.length} transaksi internal</strong> yang dimuat di dalam sistem (Buku Kas & Jurnal Umum) akan <strong className="text-white">otomatis terhapus</strong> dan saldo akun COA akan disinkronkan kembali.
              </p>
              <label className="flex items-center space-x-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteRelatedTransactions}
                  onChange={(e) => setDeleteRelatedTransactions(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0"
                />
                <span className="text-white text-xs font-semibold">
                  Otomatis hapus seluruh transaksi internal terkait di sistem ({activeStatementRelatedTransactions.length} transaksi)
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="confirm-delete-active-statement-btn"
                onClick={handleDeleteActiveStatement}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Rekening Koran & Transaksi Terkait</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: HAPUS SEMUA REKENING KORAN (CASCADE DELETE TOTAL) */}
      {/* ------------------------------------------------------------- */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Hapus Seluruh Rekening Koran</h3>
                  <p className="text-xs text-slate-400">Pembersihan total {bankStatements.length} berkas dan transaksi sistem</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Berkas Rekening Koran:</span>
                <span className="text-white font-bold">{bankStatements.length} berkas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Baris Mutasi Bank:</span>
                <span className="text-white font-mono font-semibold">
                  {bankStatements.reduce((sum, s) => sum + s.items.length, 0)} mutasi
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                <span className="text-rose-400 font-bold">Total Transaksi Sistem yang Dimuat:</span>
                <span className="text-rose-300 font-mono font-extrabold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  {allStatementsRelatedTransactions.length} transaksi ({financeService.formatRupiah(allStatementsRelatedAmount)})
                </span>
              </div>
            </div>

            {/* Cascade Delete Notice */}
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-2.5 text-xs">
              <div className="font-bold text-rose-300 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Peringatan Cascade Delete Total</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Menghapus semua rekening koran akan <strong className="text-rose-300">otomatis menghapus seluruh {allStatementsRelatedTransactions.length} transaksi</strong> internal yang dimuat ke dalam Buku Kas & Jurnal Umum, serta mengembalikan saldo akun COA ke kondisi semula.
              </p>
              <label className="flex items-center space-x-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteRelatedTransactions}
                  onChange={(e) => setDeleteRelatedTransactions(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0"
                />
                <span className="text-white text-xs font-semibold">
                  Otomatis hapus seluruh {allStatementsRelatedTransactions.length} transaksi internal di sistem
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAllStatements}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Semua ({bankStatements.length}) & Transaksi Terkait</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT DATA MUTASI REKENING KORAN */}
      {/* ------------------------------------------------------------- */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Data Mutasi Rekening Koran</h3>
                  <p className="text-xs text-slate-400">
                    Revisi tanggal, keterangan, jenis transaksi, dan nominal mutasi bank
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatementItem} className="space-y-4">
              {/* Tanggal Mutasi */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tanggal Mutasi Bank</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Keterangan Mutasi Bank */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Keterangan Mutasi Bank</span>
                  <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Contoh: TRANSFER MASUK DARI PT ABC / PEMBAYARAN TAGIHAN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Jenis Mutasi (CR vs DB) */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Jenis Mutasi (Aliran Dana) <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditType('CR')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editType === 'CR'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    <span>CR - Uang Masuk (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType('DB')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editType === 'DB'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    <span>DB - Uang Keluar (-)</span>
                  </button>
                </div>
              </div>

              {/* Nominal Mutasi */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Nominal Mutasi (Rp) <span className="text-rose-400">*</span></span>
                  <span className="font-mono text-[11px] font-bold text-blue-400">
                    {financeService.formatRupiah(typeof editAmount === 'string' ? parseFloat(editAmount) || 0 : editAmount)}
                  </span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Transaksi Sistem Terkait Notice (If Matched) */}
              {(editingItem.matchedTransactionId || editingItem.matchedTransactionCode) && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200">
                      <span className="font-bold">Perhatian: Mutasi Sudah Match</span>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        Mutasi ini telah dicocokkan dengan transaksi sistem{' '}
                        <span className="font-mono font-bold text-white">
                          {editingItem.matchedTransactionCode || editingItem.matchedTransactionId}
                        </span>.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center space-x-2 text-xs text-amber-100 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={editSyncMatchedTrx}
                      onChange={(e) => setEditSyncMatchedTrx(e.target.checked)}
                      className="rounded border-amber-600 bg-slate-950 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Sinkronkan perubahan tanggal, keterangan, dan nominal ke transaksi sistem terkait</span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: UPLOAD REKENING KORAN & PARSER */}
      {/* ------------------------------------------------------------- */}
      <BankStatementUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        transactions={transactions}
        currentUser={currentUser}
        onImportSuccess={handleImportSuccess}
        onLogAudit={onLogAudit}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: QUICK CONVERT UNMATCHED ITEM TO NEW TRANSACTION */}
      {/* ------------------------------------------------------------- */}
      {quickConvertItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Konversi Mutasi Jadi Jurnal Kas</h3>
                  <p className="text-xs text-slate-400">
                    Otomatis catat dan hubungkan mutasi rekening bank yang belum ada di sistem
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickConvertItem(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickConvert} className="space-y-3.5">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mutasi Rekening:</span>
                  <span className="text-white font-semibold">{quickConvertItem.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="text-slate-300 font-mono">{quickConvertItem.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis & Nominal:</span>
                  <span
                    className={`font-mono font-bold ${
                      quickConvertItem.type === 'CR' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {quickConvertItem.type === 'CR' ? 'UANG MASUK (+)' : 'UANG KELUAR (-)'}{' '}
                    {financeService.formatRupiah(quickConvertItem.amount)}
                  </span>
                </div>
              </div>

              {/* Module Destination Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Tujuan Integrasi Modul Keuangan
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickConvertCategory('STANDARD');
                      setQuickConvertTargetId('');
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                      quickConvertCategory === 'STANDARD'
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📊 Buku Kas & COA</span>
                  </button>

                  {quickConvertItem.type === 'CR' && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickConvertCategory('RECEIVABLE');
                        const firstOpen = receivables.find((r) => r.status !== 'PAID');
                        setQuickConvertTargetId(firstOpen?.id || '');
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                        quickConvertCategory === 'RECEIVABLE'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>📥 Pelunasan Piutang (AR)</span>
                    </button>
                  )}

                  {quickConvertItem.type === 'DB' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickConvertCategory('DEBT');
                          const firstOpen = debts.find((d) => d.status !== 'PAID');
                          setQuickConvertTargetId(firstOpen?.id || '');
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          quickConvertCategory === 'DEBT'
                            ? 'bg-rose-600/20 border-rose-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>📤 Bayar Hutang (AP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuickConvertCategory('INVESTMENT');
                          const firstInv = investments.find((i) => i.status === 'ACTIVE');
                          setQuickConvertTargetId(firstInv?.id || '');
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          quickConvertCategory === 'INVESTMENT'
                            ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>💎 Bagi Hasil Investor</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Target Entity Selection based on Category */}
              {quickConvertCategory === 'RECEIVABLE' && (
                <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-3 space-y-1.5 animate-in fade-in">
                  <label className="text-[11px] font-bold text-emerald-300 block">
                    Pilih Invoice Piutang Klien yang Dilunasi:
                  </label>
                  <select
                    value={quickConvertTargetId}
                    onChange={(e) => setQuickConvertTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    {receivables.filter((r) => r.status !== 'PAID').length === 0 ? (
                      <option value="">Tidak ada piutang outstanding</option>
                    ) : (
                      receivables
                        .filter((r) => r.status !== 'PAID')
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.invoiceNumber || r.code} - {r.customerName} (Sisa: {financeService.formatRupiah(r.remainingAmount)})
                          </option>
                        ))
                    )}
                  </select>
                </div>
              )}

              {quickConvertCategory === 'DEBT' && (
                <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-3 space-y-1.5 animate-in fade-in">
                  <label className="text-[11px] font-bold text-rose-300 block">
                    Pilih Tagihan Hutang Vendor yang Dibayar:
                  </label>
                  <select
                    value={quickConvertTargetId}
                    onChange={(e) => setQuickConvertTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    {debts.filter((d) => d.status !== 'PAID').length === 0 ? (
                      <option value="">Tidak ada hutang outstanding</option>
                    ) : (
                      debts
                        .filter((d) => d.status !== 'PAID')
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.invoiceNumber || d.code} - {d.creditorName} (Sisa: {financeService.formatRupiah(d.remainingAmount)})
                          </option>
                        ))
                    )}
                  </select>
                </div>
              )}

              {quickConvertCategory === 'INVESTMENT' && (
                <div className="bg-purple-950/30 border border-purple-800/60 rounded-xl p-3 space-y-1.5 animate-in fade-in">
                  <label className="text-[11px] font-bold text-purple-300 block">
                    Pilih Portofolio Investor (12 Bulan Bagi Hasil):
                  </label>
                  <select
                    value={quickConvertTargetId}
                    onChange={(e) => setQuickConvertTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    {investments.length === 0 ? (
                      <option value="">Tidak ada data investor</option>
                    ) : (
                      investments.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.code} - {i.investorName} (Bagi Hasil: {financeService.formatRupiah(i.monthlyProfitAmount)}/bln)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Judul Transaksi / Keperluan *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={
                    quickConvertCategory === 'RECEIVABLE'
                      ? `Pelunasan Piutang - ${quickConvertItem.description}`
                      : quickConvertCategory === 'DEBT'
                      ? `Pembayaran Hutang Tagihan - ${quickConvertItem.description}`
                      : quickConvertCategory === 'INVESTMENT'
                      ? `Bagi Hasil Dividen Investor - ${quickConvertItem.description}`
                      : quickConvertItem.description
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Alokasi Akun Lawan (COA) *
                </label>
                <select
                  name="accountCode"
                  defaultValue={
                    quickConvertCategory === 'RECEIVABLE'
                      ? '1140'
                      : quickConvertCategory === 'DEBT'
                      ? '2110'
                      : quickConvertCategory === 'INVESTMENT'
                      ? '3210'
                      : quickConvertItem.type === 'CR'
                      ? '4110'
                      : '6170'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {accounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Cost Center (Proyek / Site)
                </label>
                <select
                  name="projectId"
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

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickConvertItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  Simpan & Sinkronkan Modul
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANUAL MATCH WITH EXISTING TRANSACTION */}
      {/* ------------------------------------------------------------- */}
      {manualMatchItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Pilih Transaksi Untuk Dicocokkan</h3>
                  <p className="text-xs text-slate-400">
                    Pilih transaksi internal yang sesuai dengan mutasi {financeService.formatRupiah(manualMatchItem.amount)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManualMatchItem(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const candidates = transactions
                  .filter((t) => (manualMatchItem.type === 'CR' ? t.type === 'IN' : t.type === 'OUT'))
                  .map((trx) => {
                    const isSameAmount = Math.abs(trx.amount - manualMatchItem.amount) <= 1;
                    const isSameDate = trx.date === manualMatchItem.date;
                    const amountDiff = Math.abs(trx.amount - manualMatchItem.amount);
                    
                    let sortPriority = 4;
                    if (isSameDate && isSameAmount) sortPriority = 1;
                    else if (isSameAmount) sortPriority = 2;
                    else if (isSameDate) sortPriority = 3;

                    return {
                      trx,
                      isSameAmount,
                      isSameDate,
                      amountDiff,
                      sortPriority
                    };
                  })
                  .sort((a, b) => a.sortPriority - b.sortPriority);

                if (candidates.length === 0) {
                  return (
                    <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl">
                      Tidak ada transaksi internal dengan arah {manualMatchItem.type === 'CR' ? 'Uang Masuk (IN)' : 'Uang Keluar (OUT)'}.
                    </div>
                  );
                }

                return candidates.map(({ trx, isSameAmount, isSameDate, sortPriority }) => (
                  <div
                    key={trx.id}
                    onClick={() => handleManualForceMatch(trx.id)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between group border ${
                      sortPriority === 1
                        ? 'bg-emerald-950/40 border-emerald-500/80 hover:bg-emerald-900/50 shadow-md shadow-emerald-950/30'
                        : sortPriority === 2
                        ? 'bg-slate-950 hover:bg-slate-800/80 border-slate-700/90 hover:border-emerald-500'
                        : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 hover:border-blue-500'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs">{trx.title}</span>
                        {isSameDate && isSameAmount && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Tanggal & Nominal Cocok</span>
                          </span>
                        )}
                        {!isSameDate && isSameAmount && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[9px] border border-emerald-500/30">
                            Nominal Sama
                          </span>
                        )}
                        {isSameDate && !isSameAmount && (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold text-[9px] border border-blue-500/30">
                            Tanggal Sama
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {trx.code} • 📅 {trx.date} • {trx.projectName || 'Kantor Pusat'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-xs ${
                          isSameAmount ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {financeService.formatRupiah(trx.amount)}
                      </div>
                      <span className="text-[10px] text-blue-400 group-hover:underline">
                        Pilih & Cocokkan →
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setManualMatchItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PENGATURAN & EKSEKUSI AUTO-MATCH OTOMATIS MASAL */}
      {/* ------------------------------------------------------------- */}
      {isAutoMatchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Parameter Auto-Match Otomatis Masal</h3>
                  <p className="text-xs text-slate-400">
                    Konfigurasi kecerdasan pencocokan mutasi e-Statement dengan Buku Kas internal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAutoMatchModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Scope Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Cakupan Rekonsiliasi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoMatchScope('ACTIVE')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      autoMatchScope === 'ACTIVE'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-emerald-400">Rekening Aktif</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {activeStatement?.bankName} ({activeStatement?.items.length || 0} mutasi)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoMatchScope('ALL')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      autoMatchScope === 'ALL'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-emerald-400">Seluruh Rekening Koran</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {bankStatements.length} berkas rekening terdaftar
                    </div>
                  </button>
                </div>
              </div>

              {/* Confidence Threshold */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">Ambang Batas Skor Kecocokan (Threshold)</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{autoMatchMinConfidence}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={autoMatchMinConfidence}
                  onChange={(e) => setAutoMatchMinConfidence(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>50% (Lebih Fleksibel)</span>
                  <span>70% (Direkomendasikan)</span>
                  <span>95% (Sangat Ketat)</span>
                </div>
              </div>

              {/* Tolerance Days */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                  <label className="font-bold text-slate-300 block mb-1 text-[11px]">
                    Toleransi Selisih Hari
                  </label>
                  <select
                    value={autoMatchToleranceDays}
                    onChange={(e) => setAutoMatchToleranceDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>0 Hari (Tanggal Persis Sama)</option>
                    <option value={3}>±3 Hari</option>
                    <option value={5}>±5 Hari (Standar Kliring)</option>
                    <option value={7}>±7 Hari (1 Minggu)</option>
                    <option value={14}>±14 Hari (2 Minggu)</option>
                  </select>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                  <label className="font-bold text-slate-300 block mb-1 text-[11px]">
                    Toleransi Selisih Nominal
                  </label>
                  <select
                    value={autoMatchAmountTolerance}
                    onChange={(e) => setAutoMatchAmountTolerance(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>Rp 0 (Nominal Persis)</option>
                    <option value={2500}>± Rp 2.500 (Biaya BI-FAST)</option>
                    <option value={6500}>± Rp 6.500 (Biaya Kliring/ATM)</option>
                    <option value={15000}>± Rp 15.000 (Biaya Admin Bank)</option>
                  </select>
                </div>
              </div>

              {/* Auto Sync Toggle */}
              <label className="flex items-start space-x-2.5 p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncToBukuKas}
                  onChange={(e) => setAutoSyncToBukuKas(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-emerald-300 block">Sinkronkan Status Otomatis ke Buku Kas Internal</span>
                  Tandai transaksi jurnal internal yang cocok sebagai <span className="text-emerald-400 font-semibold font-mono">isReconciled: true</span> dan hubungkan ID mutasi secara 2 arah.
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAutoMatchModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAutoMatch()}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>⚡ Jalankan Auto-Match Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: BATCH AUTO-JOURNAL GENERATOR UNTUK MUTASI BELUM COCOK */}
      {/* ------------------------------------------------------------- */}
      {isBatchJournalModalOpen && activeStatement && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">⚡ Buat Jurnal Kas Masal (Auto-Journal)</h3>
                  <p className="text-xs text-slate-400">
                    Otomatis buat transaksi Buku Kas untuk {stats.unmatchedCount} mutasi e-Statement yang belum cocok
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchJournalModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkGenerateJournal} className="space-y-4 text-xs">
              {/* Summary of Unmatched Items */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-900">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Mutasi</span>
                  <div className="text-sm font-bold text-white font-mono">{stats.unmatchedCount} Baris</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-900">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Uang Masuk (CR)</span>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {activeStatement.items.filter((i) => i.matchStatus === 'UNMATCHED' && i.type === 'CR').length} Trx
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-900">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Uang Keluar (DB)</span>
                  <div className="text-sm font-bold text-rose-400 font-mono">
                    {activeStatement.items.filter((i) => i.matchStatus === 'UNMATCHED' && i.type === 'DB').length} Trx
                  </div>
                </div>
              </div>

              {/* Default Income Account */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Akun Lawan Default untuk Uang Masuk / CR (BKM) *
                </label>
                <select
                  value={batchJournalIncomeAccount}
                  onChange={(e) => setBatchJournalIncomeAccount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {accounts
                    .filter((a) => a.category === 'REVENUE' || a.category === 'ASSET' || a.category === 'LIABILITY')
                    .map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.category})
                      </option>
                    ))}
                </select>
              </div>

              {/* Default Expense Account */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Akun Lawan Default untuk Uang Keluar / DB (BKK) *
                </label>
                <select
                  value={batchJournalExpenseAccount}
                  onChange={(e) => setBatchJournalExpenseAccount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {accounts
                    .filter((a) => a.category === 'EXPENSE' || a.category === 'COGS' || a.category === 'LIABILITY')
                    .map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.category})
                      </option>
                    ))}
                </select>
              </div>

              {/* Project Allocation */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Alokasi Cost Center / Proyek
                </label>
                <select
                  value={batchJournalProjectId}
                  onChange={(e) => setBatchJournalProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Kantor Pusat HQ (Seluruh Operasional)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-300 leading-relaxed flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Sistem akan membuat nomor bukti transaksi kas otomatis (BKM-xxx & BKK-xxx), menyusun entri jurnal debit/kredit seimbang, dan langsung menandai mutasi sebagai MATCHED (100% Cocok).
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchJournalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/60 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>⚡ Buat {stats.unmatchedCount} Transaksi & Rekonsiliasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
