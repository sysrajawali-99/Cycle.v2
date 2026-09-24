import React, { useState, useMemo } from 'react';
import {
  FileText,
  Receipt,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Trash2,
  Edit2,
  Eye,
  Send,
  Sparkles,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import {
  ClientContract,
  ClientInvoice,
  ContractAddendum,
  InvoicePaymentRecord,
  InvoiceStatus,
  ReceivableRecord,
  ChartOfAccount,
  FinanceTransaction,
  AuditTrailItem
} from '../../types/finance';
import {
  Project,
  Employee,
  InventoryItem,
  InventoryLog,
  TimesheetMonthRecord,
  UserAccount,
  CompanyProfile
} from '../../types';
import { formatCurrency, formatDateDDMMYYYY, downloadCSV } from '../../utils/formatters';
import { ContractDashboard } from './contracts/ContractDashboard';
import { ContractModal } from './contracts/ContractModal';
import { InvoiceModal } from './contracts/InvoiceModal';
import { InvoicePrintModal } from './contracts/InvoicePrintModal';
import { InvoicePaymentModal } from './contracts/InvoicePaymentModal';
import { ContractAddendumModal } from './contracts/ContractAddendumModal';
import { ContractProfitabilityTab } from './contracts/ContractProfitabilityTab';
import { SecurityPinModal } from '../common/SecurityPinModal';

interface FinanceClientContractsInvoicesProps {
  contracts: ClientContract[];
  invoices: ClientInvoice[];
  receivables: ReceivableRecord[];
  accounts: ChartOfAccount[];
  projects: Project[];
  employees: Employee[];
  inventoryItems: InventoryItem[];
  inventoryLogs: InventoryLog[];
  timesheets: TimesheetMonthRecord[];
  currentUser?: UserAccount | null;
  companyProfile: CompanyProfile;
  onAddContract: (contract: ClientContract) => void;
  onUpdateContract: (contract: ClientContract) => void;
  onDeleteContract: (id: string, reason: string) => void;
  onAddInvoice: (invoice: ClientInvoice) => void;
  onUpdateInvoice: (invoice: ClientInvoice) => void;
  onDeleteInvoice: (id: string, reason: string) => void;
  onAddReceivable?: (rec: ReceivableRecord) => void;
  onUpdateReceivable?: (rec: ReceivableRecord) => void;
  onAddTransaction?: (trx: FinanceTransaction) => void;
  onLogAudit?: (audit: AuditTrailItem) => void;
}

type MainTab = 'CONTRACTS' | 'INVOICES' | 'PROFITABILITY';

export const FinanceClientContractsInvoices: React.FC<FinanceClientContractsInvoicesProps> = ({
  contracts = [],
  invoices = [],
  receivables = [],
  accounts = [],
  projects = [],
  employees = [],
  inventoryItems = [],
  inventoryLogs = [],
  timesheets = [],
  currentUser,
  companyProfile,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onAddReceivable,
  onUpdateReceivable,
  onAddTransaction,
  onLogAudit
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('CONTRACTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [contractFilter, setContractFilter] = useState<string>('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [isFilteringExpiring, setIsFilteringExpiring] = useState(false);

  // Modals state
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<ClientContract | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<ClientInvoice | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [invoiceForPrint, setInvoiceForPrint] = useState<ClientInvoice | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<ClientInvoice | null>(null);

  const [isAddendumModalOpen, setIsAddendumModalOpen] = useState(false);
  const [contractForAddendum, setContractForAddendum] = useState<ClientContract | null>(null);

  // Security Pin Deletion Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'CONTRACT' | 'INVOICE';
    id: string;
    title: string;
  } | null>(null);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    const today = new Date();
    return contracts.filter((c) => {
      const matchSearch =
        c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.projectName || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchFilter = true;
      if (isFilteringExpiring) {
        if (!c.endDate) return false;
        const end = new Date(c.endDate);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        matchFilter = diffDays >= 0 && diffDays <= 60;
      } else if (contractFilter !== 'ALL') {
        matchFilter = c.status === contractFilter;
      }

      return matchSearch && matchFilter;
    });
  }, [contracts, searchQuery, contractFilter, isFilteringExpiring]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.billingPeriod.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, invoiceStatusFilter]);

  // =========================================================================
  // CONTRACT HANDLERS
  // =========================================================================
  const handleOpenAddContract = () => {
    setContractToEdit(null);
    setIsContractModalOpen(true);
  };

  const handleOpenEditContract = (c: ClientContract) => {
    setContractToEdit(c);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = (contract: ClientContract, addendumReason?: string) => {
    const isEditing = contracts.some((c) => c.id === contract.id);

    if (isEditing) {
      let finalContract = { ...contract };
      if (addendumReason) {
        const previous = contracts.find((c) => c.id === contract.id);
        const prevVal = previous?.monthlyContractValue || contract.monthlyContractValue;
        const newAddendum: ContractAddendum = {
          id: `add-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          reason: addendumReason,
          previousMonthlyValue: prevVal,
          newMonthlyValue: contract.monthlyContractValue,
          differenceAmount: contract.monthlyContractValue - prevVal,
          recordedBy: currentUser?.name || 'Finance Lead'
        };
        finalContract.addendumHistory = [newAddendum, ...(finalContract.addendumHistory || [])];
      }

      onUpdateContract(finalContract);

      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'UPDATE',
        module: 'Kontrak Klien',
        recordId: finalContract.id,
        recordCode: finalContract.contractNumber,
        description: `Memperbarui data kontrak klien ${finalContract.clientName} (${finalContract.contractNumber})`,
        amount: finalContract.monthlyContractValue
      });
    } else {
      onAddContract(contract);

      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'CREATE',
        module: 'Kontrak Klien',
        recordId: contract.id,
        recordCode: contract.contractNumber,
        description: `Menerbitkan kontrak kerjasama baru dengan ${contract.clientName} (${contract.contractNumber}) senilai ${formatCurrency(contract.monthlyContractValue)}/bulan`,
        amount: contract.monthlyContractValue
      });
    }
  };

  const handleAddAddendumFromModal = (contractId: string, addendum: ContractAddendum) => {
    const target = contracts.find((c) => c.id === contractId);
    if (!target) return;

    const updated: ClientContract = {
      ...target,
      monthlyContractValue: addendum.newMonthlyValue,
      addendumHistory: [addendum, ...(target.addendumHistory || [])],
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Finance Lead'
    };

    onUpdateContract(updated);
    setContractForAddendum(updated);

    onLogAudit?.({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName: currentUser?.name || 'Finance Lead',
      userRole: currentUser?.role || 'Finance',
      actionType: 'UPDATE',
      module: 'Kontrak Klien',
      recordId: target.id,
      recordCode: target.contractNumber,
      description: `Mencatat addendum kontrak ${target.contractNumber} (${target.clientName}): ${addendum.reason}. Nilai disesuaikan menjadi ${formatCurrency(addendum.newMonthlyValue)}/bulan`,
      amount: addendum.newMonthlyValue
    });
  };

  // =========================================================================
  // INVOICE HANDLERS & PIUTANG INTEGRATION
  // =========================================================================
  const handleOpenAddInvoice = (fromContract?: ClientContract) => {
    setInvoiceToEdit(null);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenEditInvoice = (inv: ClientInvoice) => {
    setInvoiceToEdit(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleSaveInvoice = (invoice: ClientInvoice) => {
    const isEditing = invoices.some((i) => i.id === invoice.id);
    let finalInvoice = { ...invoice };

    // Integrasi 1: Jika invoice berstatus 'Terkirim', otomatis tercatat sebagai piutang klien di modul Pencatatan Hutang & Piutang
    if (finalInvoice.status === 'Terkirim' || finalInvoice.status === 'Dibayar Sebagian' || finalInvoice.status === 'Lunas') {
      const existingRec = receivables.find(
        (r) => r.invoiceNumber === finalInvoice.invoiceNumber || (finalInvoice.receivableRecordId && r.id === finalInvoice.receivableRecordId)
      );

      const contract = contracts.find((c) => c.id === finalInvoice.contractId);
      const prj = projects.find((p) => p.id === finalInvoice.projectId);

      const recStatus =
        finalInvoice.remainingAmount <= 0
          ? 'PAID'
          : finalInvoice.paidAmount > 0
          ? 'PARTIAL'
          : new Date(finalInvoice.dueDate) < new Date()
          ? 'OVERDUE'
          : 'UNPAID';

      if (existingRec) {
        const updatedRec: ReceivableRecord = {
          ...existingRec,
          invoiceNumber: finalInvoice.invoiceNumber,
          customerName: finalInvoice.clientName,
          issueDate: finalInvoice.issueDate,
          dueDate: finalInvoice.dueDate,
          totalAmount: finalInvoice.totalAmount,
          paidAmount: finalInvoice.paidAmount,
          remainingAmount: finalInvoice.remainingAmount,
          status: recStatus,
          projectId: finalInvoice.projectId,
          projectName: prj?.name || finalInvoice.projectName,
          notes: `Tagihan Kontrak: ${finalInvoice.contractNumber} (${finalInvoice.billingPeriod})`,
          updatedAt: new Date().toISOString()
        };
        onUpdateReceivable?.(updatedRec);
        finalInvoice.receivableRecordId = existingRec.id;
      } else {
        const newRecCode = `PIU-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(receivables.length + 1).padStart(3, '0')}`;
        const newRec: ReceivableRecord = {
          id: `rec-inv-${Date.now()}`,
          code: newRecCode,
          type: 'PIUTANG_KONTRAK_JASA',
          customerName: finalInvoice.clientName,
          invoiceNumber: finalInvoice.invoiceNumber,
          issueDate: finalInvoice.issueDate,
          dueDate: finalInvoice.dueDate,
          termOfPayment: `Net ${contract?.paymentTermDays || 30}`,
          totalAmount: finalInvoice.totalAmount,
          paidAmount: finalInvoice.paidAmount,
          remainingAmount: finalInvoice.remainingAmount,
          status: recStatus,
          projectId: finalInvoice.projectId,
          projectName: prj?.name || finalInvoice.projectName,
          accountCode: '1140', // Piutang Usaha
          notes: `Tagihan Kontrak: ${finalInvoice.contractNumber} (${finalInvoice.billingPeriod})`,
          payments: [],
          createdAt: new Date().toISOString()
        };
        onAddReceivable?.(newRec);
        finalInvoice.receivableRecordId = newRec.id;
      }
    }

    if (isEditing) {
      onUpdateInvoice(finalInvoice);
      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'UPDATE',
        module: 'Invoice Klien',
        recordId: finalInvoice.id,
        recordCode: finalInvoice.invoiceNumber,
        description: `Memperbarui faktur invoice ${finalInvoice.invoiceNumber} (${finalInvoice.clientName}) - Status: ${finalInvoice.status}`,
        amount: finalInvoice.totalAmount
      });
    } else {
      onAddInvoice(finalInvoice);
      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'CREATE',
        module: 'Invoice Klien',
        recordId: finalInvoice.id,
        recordCode: finalInvoice.invoiceNumber,
        description: `Menerbitkan faktur invoice ${finalInvoice.invoiceNumber} ke ${finalInvoice.clientName} senilai ${formatCurrency(finalInvoice.totalAmount)}`,
        amount: finalInvoice.totalAmount
      });
    }
  };

  const handleSendInvoiceDirectly = (inv: ClientInvoice) => {
    const updated: ClientInvoice = {
      ...inv,
      status: 'Terkirim',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Finance Lead'
    };
    handleSaveInvoice(updated);
  };

  // =========================================================================
  // RECORD PAYMENT (INTEGRASI DENGAN BUKU KAS & PIUTANG)
  // =========================================================================
  const handleSavePaymentForInvoice = (
    invoiceId: string,
    payment: InvoicePaymentRecord,
    paymentAccountCode: string
  ) => {
    const targetInvoice = invoices.find((i) => i.id === invoiceId);
    if (!targetInvoice) return;

    const newPaid = (targetInvoice.paidAmount || 0) + payment.amount;
    const newRemaining = Math.max(0, targetInvoice.totalAmount - newPaid);
    const newStatus: InvoiceStatus = newRemaining <= 0 ? 'Lunas' : 'Dibayar Sebagian';

    const updatedInvoice: ClientInvoice = {
      ...targetInvoice,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: [payment, ...(targetInvoice.payments || [])],
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Finance Lead'
    };

    onUpdateInvoice(updatedInvoice);

    // Integrasi 2: Kurangi piutang di Pencatatan Hutang & Piutang
    const matchedRec = receivables.find(
      (r) => r.invoiceNumber === targetInvoice.invoiceNumber || (targetInvoice.receivableRecordId && r.id === targetInvoice.receivableRecordId)
    );

    if (matchedRec) {
      const recPaid = (matchedRec.paidAmount || 0) + payment.amount;
      const recRemaining = Math.max(0, matchedRec.totalAmount - recPaid);
      const recStatus = recRemaining <= 0 ? 'PAID' : 'PARTIAL';

      const updatedRec: ReceivableRecord = {
        ...matchedRec,
        paidAmount: recPaid,
        remainingAmount: recRemaining,
        status: recStatus,
        payments: [
          {
            id: payment.id,
            date: payment.date,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            accountCode: paymentAccountCode,
            referenceNumber: payment.referenceNumber,
            notes: payment.notes,
            recordedBy: currentUser?.name || 'Finance Lead'
          },
          ...(matchedRec.payments || [])
        ],
        updatedAt: new Date().toISOString()
      };
      onUpdateReceivable?.(updatedRec);
    }

    // Integrasi 3: Masuk ke Buku Kas (BKM - Uang Masuk)
    if (onAddTransaction) {
      const primaryAcc = accounts.find((a) => a.code === paymentAccountCode) || {
        code: paymentAccountCode,
        name: payment.paymentMethod
      };

      const bkmTransaction: FinanceTransaction = {
        id: `trx-bkm-cinv-${Date.now()}`,
        code: `BKM-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
        date: payment.date,
        type: 'IN',
        title: `Penerimaan Invoice: ${targetInvoice.invoiceNumber} - ${targetInvoice.clientName}`,
        description: `Penerimaan pelunasan/termin pembayaran invoice ${targetInvoice.invoiceNumber} (${targetInvoice.billingPeriod}) via ${payment.paymentMethod}. Ref: ${payment.referenceNumber || '-'}`,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        primaryAccountCode: paymentAccountCode,
        contraAccountCode: '1140', // Piutang Usaha
        journalEntries: [
          {
            id: `je-d-${Date.now()}`,
            accountCode: paymentAccountCode,
            accountName: primaryAcc.name,
            debit: payment.amount,
            credit: 0,
            notes: `Debit Kas/Bank: ${payment.paymentMethod}`
          },
          {
            id: `je-c-${Date.now()}`,
            accountCode: '1140',
            accountName: 'Piutang Usaha / Klien',
            debit: 0,
            credit: payment.amount,
            notes: `Kredit Piutang Invoice ${targetInvoice.invoiceNumber}`
          }
        ],
        projectId: targetInvoice.projectId || 'ALL',
        projectName: targetInvoice.projectName,
        division: 'Cleaning Service',
        currency: 'IDR',
        exchangeRate: 1,
        referenceNumber: payment.referenceNumber || targetInvoice.invoiceNumber,
        payeeOrPayer: targetInvoice.clientName,
        isReconciled: false,
        isAdjusting: false,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Finance Lead'
      };

      onAddTransaction(bkmTransaction);
    }

    // Log Audit Trail
    onLogAudit?.({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName: currentUser?.name || 'Finance Lead',
      userRole: currentUser?.role || 'Finance',
      actionType: 'UPDATE',
      module: 'Invoice Klien',
      recordId: targetInvoice.id,
      recordCode: targetInvoice.invoiceNumber,
      description: `Mencatat penerimaan pembayaran invoice ${targetInvoice.invoiceNumber} (${targetInvoice.clientName}) sebesar ${formatCurrency(payment.amount)} via ${payment.paymentMethod}. Sisa: ${formatCurrency(newRemaining)}`,
      amount: payment.amount
    });
  };

  // =========================================================================
  // DELETION WITH PIN
  // =========================================================================
  const handleTriggerDelete = (type: 'CONTRACT' | 'INVOICE', id: string, title: string) => {
    setDeleteTarget({ type, id, title });
    setIsPinModalOpen(true);
  };

  const handleConfirmDelete = (pin: string, reason: string) => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'CONTRACT') {
      onDeleteContract(deleteTarget.id, reason);
      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'DELETE',
        module: 'Kontrak Klien',
        recordId: deleteTarget.id,
        description: `Menghapus kontrak ${deleteTarget.title} - Alasan: ${reason}`
      });
    } else {
      onDeleteInvoice(deleteTarget.id, reason);
      onLogAudit?.({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'DELETE',
        module: 'Invoice Klien',
        recordId: deleteTarget.id,
        description: `Menghapus invoice ${deleteTarget.title} - Alasan: ${reason}`
      });
    }

    setIsPinModalOpen(false);
    setDeleteTarget(null);
  };

  // Status Badge Helper
  const getInvoiceStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Lunas':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Dibayar Sebagian':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Terkirim':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Jatuh Tempo':
        return 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse';
      case 'Draft':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Tab Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Kontrak & Invoice Klien
              </h1>
              <p className="text-xs text-slate-500">
                Divisi Finance & Commercial Billing • Manajemen Kontrak, Invoice Bulanan & Profitabilitas
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('CONTRACTS')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CONTRACTS'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            Data Kontrak ({contracts.length})
          </button>

          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'INVOICES'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-500" />
            Invoice Klien ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab('PROFITABILITY')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PROFITABILITY'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Analisis Margin Profitabilitas
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: DATA KONTRAK */}
      {/* ==================================================================== */}
      {activeTab === 'CONTRACTS' && (
        <div className="space-y-6">
          {/* Dashboard Ringkasan Kontrak */}
          <ContractDashboard
            contracts={contracts}
            onFilterExpiring={() => setIsFilteringExpiring(!isFilteringExpiring)}
            isFilteringExpiring={isFilteringExpiring}
          />

          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor kontrak, nama klien, atau lokasi..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={contractFilter}
                onChange={(e) => {
                  setContractFilter(e.target.value);
                  setIsFilteringExpiring(false);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 shrink-0"
              >
                <option value="ALL">Semua Status Kontrak</option>
                <option value="Aktif">Aktif</option>
                <option value="Akan Berakhir">Akan Berakhir (&le; 60 Hari)</option>
                <option value="Berakhir">Berakhir (Selesai)</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddContract}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Kontrak Klien Baru
            </button>
          </div>

          {/* Table of Contracts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10.5px] font-bold">
                  <tr>
                    <th className="py-3 px-4">No. Kontrak & Klien</th>
                    <th className="py-3 px-4">Lokasi Proyek</th>
                    <th className="py-3 px-4">Alokasi Manpower</th>
                    <th className="py-3 px-4 text-right">Nilai Bulanan</th>
                    <th className="py-3 px-4">Masa Berlaku</th>
                    <th className="py-3 px-4 text-center">Termin</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Addendum</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                        Tidak ada kontrak yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((c) => {
                      const totalManpower = (c.manpowerAllocations || []).reduce(
                        (sum, m) => sum + (Number(m.count) || 0),
                        0
                      );

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{c.clientName}</p>
                            <p className="text-[10.5px] font-mono text-slate-500">{c.contractNumber}</p>
                            {c.clientTaxId && (
                              <p className="text-[9.5px] text-slate-400">NPWP: {c.clientTaxId}</p>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{c.projectName}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{totalManpower} Orang</span>
                            <div className="text-[10px] text-slate-500 space-x-1">
                              {(c.manpowerAllocations || []).map((m) => (
                                <span key={m.id} className="inline-block">
                                  {m.position}: {m.count}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                            {formatCurrency(c.monthlyContractValue)}
                          </td>

                          <td className="py-3 px-4">
                            <p className="text-slate-700 font-medium">
                              {formatDateDDMMYYYY(c.startDate)} s/d {formatDateDDMMYYYY(c.endDate)}
                            </p>
                          </td>

                          <td className="py-3 px-4 text-center font-semibold text-slate-700">
                            {c.paymentTermDays || 30} Hari
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                c.status === 'Aktif'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : c.status === 'Akan Berakhir'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600 border border-slate-300'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setContractForAddendum(c);
                                setIsAddendumModalOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5 text-amber-600" />
                              {c.addendumHistory?.length || 0} Riwayat
                            </button>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenAddInvoice(c)}
                                title="Buat Invoice Bulanan"
                                className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md border border-emerald-300 flex items-center gap-1 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" /> +Invoice
                              </button>
                              <button
                                onClick={() => handleOpenEditContract(c)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-slate-100 cursor-pointer"
                                title="Edit Kontrak"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleTriggerDelete('CONTRACT', c.id, c.contractNumber)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                                title="Hapus Kontrak"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* ==================================================================== */}
      {/* TAB 2: INVOICE TAGIHAN KLIEN */}
      {/* ==================================================================== */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6">
          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor invoice, klien, periode tagihan..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 shrink-0"
              >
                <option value="ALL">Semua Status Invoice</option>
                <option value="Draft">Draft</option>
                <option value="Terkirim">Terkirim (Piutang Aktif)</option>
                <option value="Dibayar Sebagian">Dibayar Sebagian</option>
                <option value="Lunas">Lunas</option>
                <option value="Jatuh Tempo">Jatuh Tempo</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenAddInvoice()}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Buat Invoice Bulanan
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10.5px] font-bold">
                  <tr>
                    <th className="py-3 px-4">No. Invoice & Klien</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Tgl Terbit / Tempo</th>
                    <th className="py-3 px-4 text-right">Subtotal Jasa</th>
                    <th className="py-3 px-4 text-right">Pajak (PPN/PPh)</th>
                    <th className="py-3 px-4 text-right">Total Tagihan</th>
                    <th className="py-3 px-4 text-right">Sisa Piutang</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                        Belum ada invoice tagihan yang terdaftar.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const hasRemaining = inv.remainingAmount > 0;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{inv.clientName}</p>
                            <p className="text-[10.5px] font-mono text-slate-500">{inv.invoiceNumber}</p>
                            <p className="text-[10px] text-slate-400">{inv.projectName}</p>
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {inv.billingPeriod}
                          </td>

                          <td className="py-3 px-4">
                            <p className="text-slate-700">{formatDateDDMMYYYY(inv.issueDate)}</p>
                            <p className="text-[10.5px] text-rose-600 font-semibold">
                              Tempo: {formatDateDDMMYYYY(inv.dueDate)}
                            </p>
                          </td>

                          <td className="py-3 px-4 text-right font-semibold text-slate-800">
                            {formatCurrency(inv.subtotalBeforeTax)}
                            {inv.extraItems?.length > 0 && (
                              <p className="text-[10px] text-amber-700">+{inv.extraItems.length} Ekstra</p>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right text-[11px]">
                            {inv.isPpnEnabled && (
                              <span className="block text-emerald-700 font-medium">
                                +PPN: {formatCurrency(inv.ppnAmount)}
                              </span>
                            )}
                            {inv.isPph23Enabled && (
                              <span className="block text-rose-700 font-medium">
                                -PPh23: {formatCurrency(inv.pph23Amount)}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                            {formatCurrency(inv.totalAmount)}
                          </td>

                          <td className="py-3 px-4 text-right font-bold">
                            {hasRemaining ? (
                              <span className="text-rose-700">{formatCurrency(inv.remainingAmount)}</span>
                            ) : (
                              <span className="text-emerald-700">Lunas (Rp 0)</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getInvoiceStatusBadge(
                                inv.status
                              )}`}
                            >
                              {inv.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Tombol Cetak / PDF */}
                              <button
                                onClick={() => {
                                  setInvoiceForPrint(inv);
                                  setIsPrintModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                                title="Cetak / Unduh PDF Resmi"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Tombol Catat Pembayaran */}
                              {hasRemaining && (
                                <button
                                  onClick={() => {
                                    setInvoiceForPayment(inv);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md border border-emerald-300 flex items-center gap-1 cursor-pointer"
                                  title="Catat Pembayaran Masuk"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> Bayar
                                </button>
                              )}

                              {/* Tombol Kirim jika status Draft */}
                              {inv.status === 'Draft' && (
                                <button
                                  onClick={() => handleSendInvoiceDirectly(inv)}
                                  className="px-2 py-1 text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-md border border-amber-400 flex items-center gap-1 cursor-pointer"
                                  title="Kirim Invoice & Catat Piutang"
                                >
                                  <Send className="w-3 h-3" /> Kirim
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditInvoice(inv)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-slate-100 cursor-pointer"
                                title="Edit Invoice"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleTriggerDelete('INVOICE', inv.id, inv.invoiceNumber)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                                title="Hapus Invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* ==================================================================== */}
      {/* TAB 3: ANALISIS MARGIN PROFITABILITAS PER KONTRAK */}
      {/* ==================================================================== */}
      {activeTab === 'PROFITABILITY' && (
        <ContractProfitabilityTab
          contracts={contracts}
          projects={projects}
          employees={employees}
          inventoryItems={inventoryItems}
          inventoryLogs={inventoryLogs}
          timesheets={timesheets}
        />
      )}

      {/* MODALS */}
      {isContractModalOpen && (
        <ContractModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          onSave={handleSaveContract}
          contractToEdit={contractToEdit}
          projects={projects}
          currentUser={currentUser}
        />
      )}

      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSave={handleSaveInvoice}
          invoiceToEdit={invoiceToEdit}
          contracts={contracts}
          existingInvoicesCount={invoices.length}
          currentUser={currentUser}
          companyProfile={companyProfile}
        />
      )}

      {isPrintModalOpen && invoiceForPrint && (
        <InvoicePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setInvoiceForPrint(null);
          }}
          invoice={invoiceForPrint}
          contract={contracts.find((c) => c.id === invoiceForPrint.contractId)}
          companyProfile={companyProfile}
        />
      )}

      {isPaymentModalOpen && invoiceForPayment && (
        <InvoicePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setInvoiceForPayment(null);
          }}
          invoice={invoiceForPayment}
          onSavePayment={handleSavePaymentForInvoice}
          companyProfile={companyProfile}
          currentUser={currentUser}
        />
      )}

      {isAddendumModalOpen && contractForAddendum && (
        <ContractAddendumModal
          isOpen={isAddendumModalOpen}
          onClose={() => {
            setIsAddendumModalOpen(false);
            setContractForAddendum(null);
          }}
          contract={contractForAddendum}
          onAddAddendum={handleAddAddendumFromModal}
          currentUser={currentUser}
        />
      )}

      {isPinModalOpen && deleteTarget && (
        <SecurityPinModal
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false);
            setDeleteTarget(null);
          }}
          title={`Hapus ${deleteTarget.type === 'CONTRACT' ? 'Kontrak' : 'Invoice'} ${deleteTarget.title}`}
          description={`Tindakan ini memerlukan PIN otorisasi. Mohon berikan alasan penghapusan.`}
          onConfirm={handleConfirmDelete}
          expectedPin={currentUser?.securityPin || '123456'}
        />
      )}
    </div>
  );
};
