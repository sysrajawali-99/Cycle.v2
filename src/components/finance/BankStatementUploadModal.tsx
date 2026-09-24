import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  Building2,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  Eye,
  Info,
  ArrowDownRight,
  ArrowUpRight,
  User,
  X,
  Search,
  Filter,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Infinity as InfinityIcon,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import {
  BankStatementImport,
  BankStatementItem,
  FinanceTransaction,
  ReconcileStatus,
  AuditTrailItem
} from '../../types/finance';
import { financeService } from '../../services/financeService';
import { storageService } from '../../services/storageService';
import {
  parseExcelStatement,
  parsePdfStatement,
  parseTextBankStatement,
  getSamplePresetStatement,
  downloadBankStatementExcelTemplate,
  ParsedStatementResult,
  ParseProgressInfo
} from '../../utils/bankStatementParser';

interface BankStatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: FinanceTransaction[];
  currentUser?: any;
  onImportSuccess: (statement: BankStatementImport) => void;
  onLogAudit?: (audit: AuditTrailItem) => void;
}

type UploadTab = 'pdf' | 'excel' | 'text';

const getPopularBanks = () => {
  const comp = storageService.getCompanyProfile();
  const compName = comp.name || 'PT PERUSAHAAN';
  if (comp.bankAccounts && comp.bankAccounts.length > 0) {
    return comp.bankAccounts.map((b) => ({
      name: `Bank ${b.bankName}${b.coaAccountName ? ` (${b.coaAccountName})` : b.branch ? ` (${b.branch})` : ''}`,
      code: b.bankName.toUpperCase(),
      accNo: b.accountNumber,
      holder: b.accountHolder || compName
    }));
  }
  return [
    { name: 'Bank BNI', code: 'BNI', accNo: '1177888008', holder: compName },
    { name: 'Bank BCA (Bank Central Asia)', code: 'BCA', accNo: '123-456-7890', holder: compName },
    { name: 'Bank Mandiri (Persero)', code: 'MANDIRI', accNo: '987-654-3210', holder: compName },
    { name: 'Bank BRI', code: 'BRI', accNo: '888-999-000', holder: compName },
    { name: 'Bank Syariah Indonesia (BSI)', code: 'BSI', accNo: '777-666-555', holder: compName },
    { name: 'Bank CIMB Niaga', code: 'CIMB', accNo: '555-444-333', holder: compName },
    { name: 'Bank Permata', code: 'PERMATA', accNo: '333-222-111', holder: compName },
    { name: 'Bank Danamon', code: 'DANAMON', accNo: '222-111-000', holder: compName }
  ];
};

export const BankStatementUploadModal: React.FC<BankStatementUploadModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currentUser,
  onImportSuccess,
  onLogAudit
}) => {
  const POPULAR_BANKS = useMemo(() => getPopularBanks(), []);
  const initialBank = POPULAR_BANKS[0] || { name: 'Bank BCA', code: 'BCA', accNo: '1234567890', holder: storageService.getCompanyProfile().name };
  const [activeTab, setActiveTab] = useState<UploadTab>('pdf');
  const [bankName, setBankName] = useState<string>(initialBank.name);
  const [accountNumber, setAccountNumber] = useState<string>(initialBank.accNo);
  const [accountHolder, setAccountHolder] = useState<string>(initialBank.holder);
  const [periodMonth, setPeriodMonth] = useState<string>('2026-08');

  // File and Parsing State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<ParseProgressInfo | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Preview State (Step 2)
  const [previewResult, setPreviewResult] = useState<ParsedStatementResult | null>(null);
  const [editableItems, setEditableItems] = useState<BankStatementItem[]>([]);
  const [isShowingFormatGuide, setIsShowingFormatGuide] = useState<boolean>(false);

  // Search & Pagination in Preview
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CR' | 'DB'>('ALL');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Auto-Match Settings (Activated by Default)
  const [isAutoMatchEnabled, setIsAutoMatchEnabled] = useState<boolean>(true);
  const [autoMatchThreshold, setAutoMatchThreshold] = useState<number>(70);
  const [autoMatchToleranceDays, setAutoMatchToleranceDays] = useState<number>(5);
  const [autoSyncBukuKas, setAutoSyncBukuKas] = useState<boolean>(true);
  const [isShowingAutoMatchConfig, setIsShowingAutoMatchConfig] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Bank Selection Change
  const handleBankChange = (selected: string) => {
    setBankName(selected);
    const matched = POPULAR_BANKS.find((b) => b.name === selected);
    if (matched) {
      setAccountNumber(matched.accNo);
      setAccountHolder(matched.holder);
    }
  };

  // Handle Preset Loading (e.g. BNI screenshot demo)
  const handleLoadPreset = (key: 'BNI' | 'BCA' | 'MANDIRI' | 'BRI') => {
    setIsLoading(true);
    setParseError(null);
    setProgressInfo({
      stage: 'reading',
      currentPage: 1,
      totalPages: 1,
      extractedCount: 0,
      message: `Memuat contoh preset e-Statement ${key}...`
    });

    setTimeout(() => {
      const preset = getSamplePresetStatement(key);
      setBankName(preset.bankName);
      setAccountNumber(preset.accountNumber);
      setAccountHolder(preset.accountHolder);
      setPeriodMonth(preset.periodMonth);
      setPreviewResult(preset);
      setEditableItems(preset.items);
      setIsLoading(false);
      setProgressInfo(null);
    }, 250);
  };

  // Handle File Selection & Parse with Progress
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setParseError(null);
    setProgressInfo({
      stage: 'reading',
      currentPage: 1,
      totalPages: 1,
      extractedCount: 0,
      message: `Mempersiapkan pembacaan file ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`
    });

    try {
      let result: ParsedStatementResult;
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (fileExt === 'pdf') {
        setActiveTab('pdf');
        result = await parsePdfStatement(file, bankName, accountNumber, (p) => setProgressInfo(p));
      } else if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
        setActiveTab('excel');
        result = await parseExcelStatement(file, bankName, accountNumber, (p) => setProgressInfo(p));
      } else {
        throw new Error('Format file tidak didukung. Mohon upload file .pdf, .xlsx, .xls, atau .csv');
      }

      if (result.items.length === 0) {
        throw new Error(
          'Tidak ada data mutasi yang berhasil dibaca. Pastikan format tabel rekening koran memiliki kolom tanggal, keterangan, dan nominal.'
        );
      }

      // Auto update bank info if detected
      if (result.bankName) setBankName(result.bankName);
      if (result.accountNumber) setAccountNumber(result.accountNumber);
      if (result.accountHolder) setAccountHolder(result.accountHolder);
      if (result.periodMonth) setPeriodMonth(result.periodMonth);

      setPreviewResult(result);
      setEditableItems(result.items);
      setCurrentPage(1);
      setSelectedItemIds(new Set());
    } catch (err: any) {
      console.error('Parsing error:', err);
      setParseError(err.message || 'Gagal memproses file rekening koran.');
    } finally {
      setIsLoading(false);
      setProgressInfo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Parse Raw Text
  const handleParseText = () => {
    if (!rawText.trim()) {
      setParseError('Mohon masukkan teks mutasi bank terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setParseError(null);

    try {
      const result = parseTextBankStatement(rawText, bankName);
      if (result.items.length === 0) {
        throw new Error('Format teks tidak dikenali. Pastikan terdapat tanggal, keterangan, dan nominal.');
      }
      setPreviewResult(result);
      setEditableItems(result.items);
      setCurrentPage(1);
      setSelectedItemIds(new Set());
    } catch (err: any) {
      setParseError(err.message || 'Gagal membaca teks mutasi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a row from preview
  const handleRemovePreviewItem = (id: string) => {
    setEditableItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Bulk Delete Selected
  const handleBulkDeleteSelected = () => {
    if (selectedItemIds.size === 0) return;
    setEditableItems((prev) => prev.filter((item) => !selectedItemIds.has(item.id)));
    setSelectedItemIds(new Set());
  };

  // Bulk Toggle Type (CR <-> DB)
  const handleBulkToggleType = () => {
    if (selectedItemIds.size === 0) return;
    setEditableItems((prev) =>
      prev.map((item) => {
        if (selectedItemIds.has(item.id)) {
          const nextType = item.type === 'CR' ? 'DB' : 'CR';
          return {
            ...item,
            type: nextType,
            suggestedAccountCode: nextType === 'CR' ? '4110' : '5120'
          };
        }
        return item;
      })
    );
  };

  // Toggle Item Type (DB <-> CR)
  const handleToggleType = (id: string) => {
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextType = item.type === 'CR' ? 'DB' : 'CR';
          return {
            ...item,
            type: nextType,
            suggestedAccountCode: nextType === 'CR' ? '4110' : '5120'
          };
        }
        return item;
      })
    );
  };

  // Computed Items with Real-time Auto-Match
  const processedItems = useMemo(() => {
    if (!isAutoMatchEnabled) {
      return editableItems;
    }
    return financeService.autoMatchBankStatements(editableItems, transactions, {
      minConfidence: autoMatchThreshold,
      toleranceDays: autoMatchToleranceDays
    });
  }, [editableItems, transactions, isAutoMatchEnabled, autoMatchThreshold, autoMatchToleranceDays]);

  // Calculate live preview metrics
  const previewStats = useMemo(() => {
    const totalCount = processedItems.length;
    const totalCredit = processedItems
      .filter((i) => i.type === 'CR')
      .reduce((sum, i) => sum + i.amount, 0);
    const totalDebit = processedItems
      .filter((i) => i.type === 'DB')
      .reduce((sum, i) => sum + i.amount, 0);
    const netFlow = totalCredit - totalDebit;
    const endingBal = previewResult?.endingBalance || processedItems[processedItems.length - 1]?.balance || 0;

    const matchedCount = processedItems.filter((i) => i.matchStatus === 'MATCHED' || i.matchStatus === 'MANUAL_MATCHED').length;
    const unmatchedCount = totalCount - matchedCount;
    const matchPct = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

    return { totalCount, totalCredit, totalDebit, netFlow, endingBal, matchedCount, unmatchedCount, matchPct };
  }, [processedItems, previewResult]);

  // Filtered Items for Preview Table
  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date.includes(searchQuery) ||
        (item.referenceNumber && item.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.matchedTransactionCode && item.matchedTransactionCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.amount.toString().includes(searchQuery);

      return matchesType && matchesSearch;
    });
  }, [processedItems, typeFilter, searchQuery]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    if (pageSize === -1) return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredItems.length / pageSize));

  // Selection handlers
  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every((it) => selectedItemIds.has(it.id));

  const handleToggleSelectAllPage = () => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedItems.forEach((it) => next.delete(it.id));
      } else {
        paginatedItems.forEach((it) => next.add(it.id));
      }
      return next;
    });
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Finalize Import & Run Auto-matching
  const handleCommitImport = () => {
    if (processedItems.length === 0) {
      alert('Tidak ada transaksi untuk diimport.');
      return;
    }

    const matchedCount = previewStats.matchedCount;
    const unmatchedCount = previewStats.unmatchedCount;

    const filePrefix = activeTab === 'pdf' ? 'PDF_Statement' : activeTab === 'excel' ? 'Excel_Statement' : 'Text_Import';
    const finalFileName =
      previewResult?.fileName || `${filePrefix}_${bankName.split(' ')[0]}_${periodMonth}.csv`;

    const newImport: BankStatementImport = {
      id: `import-${Date.now()}`,
      bankName,
      accountNumber,
      accountHolder: accountHolder || storageService.getCompanyProfile().name || 'Perusahaan',
      periodMonth,
      fileName: finalFileName,
      uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      totalTransactions: processedItems.length,
      totalCredit: previewStats.totalCredit,
      totalDebit: previewStats.totalDebit,
      matchedCount,
      unmatchedCount,
      items: processedItems
    };

    onImportSuccess(newImport);

    if (onLogAudit) {
      onLogAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Finance Admin',
        userRole: currentUser?.role || 'Admin Operasional',
        actionType: 'IMPORT_STATEMENT',
        module: 'Rekonsiliasi Bank',
        recordId: newImport.id,
        recordCode: newImport.fileName,
        description: `Import e-Statement ${bankName} (${accountNumber}) - ${processedItems.length} transaksi (${matchedCount} auto-matched, ${previewStats.matchPct}% match rate)`,
        amount: previewStats.totalCredit + previewStats.totalDebit
      });
    }

    onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewResult(null);
    setEditableItems([]);
    setRawText('');
    setParseError(null);
    setProgressInfo(null);
    setSelectedItemIds(new Set());
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 max-w-5xl w-full space-y-5 shadow-2xl animate-in zoom-in-95 text-slate-100 max-h-[94vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-900/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  Import & Parsing Rekening Koran
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
                  <InfinityIcon className="w-3 h-3 text-blue-400 inline" />
                  <span>Unlimited High-Speed Parser</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Membaca file e-Statement PDF / Excel tanpa batas ukuran file & jumlah baris transaksi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsShowingFormatGuide(!isShowingFormatGuide)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Panduan format file bank"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Panduan Format</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* GUIDE COLLAPSIBLE */}
        {isShowingFormatGuide && (
          <div className="p-4 bg-slate-950/90 rounded-2xl border border-amber-500/30 text-xs text-slate-300 space-y-2 flex-shrink-0 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-amber-300">
              <span className="flex items-center space-x-1.5">
                <Info className="w-4 h-4" />
                <span>Format e-Statement Bank yang Didukung Tanpa Batasan</span>
              </span>
              <button
                onClick={() => downloadBankStatementExcelTemplate(bankName)}
                className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template Excel (.xlsx)</span>
              </button>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Sistem parser cerdas membaca format rekening koran dari bank manapun secara akurat:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>1. Dokumen PDF e-Statement (BNI Direct, BCA, Mandiri Kopra, BRI)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung multi-halaman tanpa batas, deskripsi panjang multi-baris, kode jurnal/referensi, debet/kredit terpisah, dan saldo berjalan.
                </p>
              </div>
              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>2. File Spreadsheet Excel / CSV (.xlsx, .xls, .csv)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung puluhan ribu baris data dengan auto-mapping kolom (Tanggal, Keterangan, Debet, Kredit, Saldo).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SCROLLABLE MAIN BODY */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* STEP 1: BANK INFORMATION & UPLOAD CONFIGURATION */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>1. Data Rekening & Bank Tujuan</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-medium">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Auto-Detect dari Dokumen Aktif</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Nama Bank */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Nama Bank *
                </label>
                <select
                  value={bankName}
                  onChange={(e) => handleBankChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* No Rekening */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Nomor Rekening Bank *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1177888008"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500 pl-8"
                  />
                  <CreditCard className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                </div>
              </div>

              {/* Pemilik Rekening */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Nama Pemilik Rekening
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: JOERIZ TALENTA INDONESIA PT"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 pl-8"
                  />
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                </div>
              </div>

              {/* Periode Bulan */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Periode Laporan
                </label>
                <div className="relative">
                  <input
                    type="month"
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: CHOOSE INPUT METHOD & UPLOAD */}
          {!previewResult ? (
            <div className="space-y-4">
              {/* METHOD TABS */}
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('pdf')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'pdf'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30 border border-rose-500'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-rose-300" />
                  <span>Upload PDF e-Statement (.pdf)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('excel')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'excel'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 border border-emerald-500'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>Upload Excel / CSV (.xlsx / .csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'text'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 border border-blue-500'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4 text-blue-300" />
                  <span>Tempel Teks e-Banking</span>
                </button>
              </div>

              {/* TAB 1 & 2: FILE UPLOAD DRAG & DROP ZONE */}
              {(activeTab === 'pdf' || activeTab === 'excel') && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeTab === 'pdf' ? '.pdf' : '.xlsx,.xls,.csv'}
                    onChange={handleFileChange}
                    className="hidden"
                    id="bank-file-upload-input"
                  />

                  <label
                    htmlFor="bank-file-upload-input"
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 hover:bg-slate-950/90 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group text-center space-y-3"
                  >
                    <div className="p-4 rounded-2xl bg-slate-800 group-hover:bg-blue-500/20 text-slate-400 group-hover:text-blue-400 border border-slate-700 group-hover:border-blue-500/40 transition-all">
                      {activeTab === 'pdf' ? (
                        <FileText className="w-9 h-9 text-rose-400" />
                      ) : (
                        <FileSpreadsheet className="w-9 h-9 text-emerald-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white group-hover:text-blue-400 flex items-center justify-center space-x-2">
                        <span>
                          {activeTab === 'pdf'
                            ? 'Upload File Rekening Koran PDF (Unlimited Page)'
                            : 'Upload File Spreadsheet Mutasi (.xlsx, .csv)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-lg">
                        {activeTab === 'pdf'
                          ? 'Mendukung e-Statement resmi BNI Direct, BCA, Mandiri, BRI. Tidak ada batasan ukuran file maupun jumlah halaman.'
                          : 'Mendukung file Excel mutasi bank dengan puluhan ribu baris. Kolom otomatis diselaraskan.'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all">
                        Pilih Dokumen Bank
                      </span>
                      <span className="text-[11px] text-slate-500">atau drag & drop file ke sini</span>
                    </div>
                  </label>

                  {/* LOADING & PROGRESS BAR */}
                  {isLoading && progressInfo && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-blue-500/40 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                        <span className="flex items-center space-x-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          <span>{progressInfo.message}</span>
                        </span>
                        {progressInfo.totalPages > 1 && (
                          <span className="font-mono">
                            {Math.round((progressInfo.currentPage / progressInfo.totalPages) * 100)}%
                          </span>
                        )}
                      </div>
                      {progressInfo.totalPages > 1 && (
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round((progressInfo.currentPage / progressInfo.totalPages) * 100)}%`
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TEXT COPY-PASTE */}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">
                      Tempel Teks Mutasi e-Banking (Copy-Paste) *
                    </label>
                  </div>

                  <textarea
                    rows={7}
                    placeholder={`Contoh format baris mutasi:\n27/08/2026 00.00.00\tBY TRX ATM PRIMA\t6,500.00\tDB\t401,309,630.00\n27/08/2026 13.12.48\tTRF/PAY/TOP-UP ECHANNEL | BNI DIRECT\t3,300,000.00\tDB\t398,009,630.00\n28/08/2026 10.00.00\tPEMINDAHAN DARI PT GRAND INDONESIA\t145,000,000.00\tCR\t543,009,630.00`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 leading-relaxed"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParseText}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 cursor-pointer flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview & Validasi Data Mutasi →</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: LIVE PREVIEW & VERIFICATION TABLE */
            <div className="space-y-4 animate-in fade-in">
              {/* PREVIEW HEADER & SUMMARY CARDS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Preview Data Hasil Ekstraksi Rekening Koran
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {previewResult.fileName} • {bankName} ({accountNumber})
                    {previewResult.totalPages && previewResult.totalPages > 1 && ` • ${previewResult.totalPages} Halaman PDF`}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti Dokumen</span>
                  </button>
                </div>
              </div>

              {/* KPI STATS CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">TOTAL MUTASI TERBACA</span>
                  <div className="text-lg font-mono font-extrabold text-white mt-0.5">
                    {previewStats.totalCount.toLocaleString()}{' '}
                    <span className="text-xs text-slate-500 font-normal">Baris</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-900/30">
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                    <ArrowDownRight className="w-3 h-3" />
                    <span>UANG MASUK (CR)</span>
                  </span>
                  <div className="text-sm font-mono font-extrabold text-emerald-400 mt-0.5">
                    {financeService.formatRupiah(previewStats.totalCredit)}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-rose-900/30">
                  <span className="text-[10px] text-rose-400 font-bold flex items-center space-x-1">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>UANG KELUAR (DB)</span>
                  </span>
                  <div className="text-sm font-mono font-extrabold text-rose-400 mt-0.5">
                    {financeService.formatRupiah(previewStats.totalDebit)}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-blue-900/30">
                  <span className="text-[10px] text-blue-400 font-bold block">MUTASI BERSIH (NET)</span>
                  <div
                    className={`text-sm font-mono font-extrabold mt-0.5 ${
                      previewStats.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {previewStats.netFlow >= 0 ? '+' : ''}
                    {financeService.formatRupiah(previewStats.netFlow)}
                  </div>
                </div>
              </div>

              {/* AUTO-MATCH OTOMATIS MASAL BANNER & CONTROLS */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-extrabold text-emerald-950">
                          Auto-Match Otomatis Masal
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold border border-emerald-300">
                          {isAutoMatchEnabled ? '⚡ AKTIF' : 'NONAKTIF'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Pencocokan multi-faktor cerdas (Nominal, Arah DB/CR, Toleransi Tanggal & Kata Kunci Keterangan)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsShowingAutoMatchConfig(!isShowingAutoMatchConfig)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
                    >
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isShowingAutoMatchConfig ? 'Tutup Pengaturan' : 'Pengaturan Match'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAutoMatchEnabled(!isAutoMatchEnabled)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isAutoMatchEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isAutoMatchEnabled ? 'Auto-Match Aktif' : 'Aktifkan'}
                    </button>
                  </div>
                </div>

                {/* Auto Match Results Banner */}
                {isAutoMatchEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/60">
                    <div className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-xs">
                        <span className="text-slate-500 block text-[10px] font-bold">COCOK OTOMATIS:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {previewStats.matchedCount} dari {previewStats.totalCount} mutasi ({previewStats.matchPct}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="text-xs">
                        <span className="text-slate-500 block text-[10px] font-bold">BELUM DI BUKU KAS:</span>
                        <span className="font-bold text-amber-700 font-mono">
                          {previewStats.unmatchedCount} mutasi
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="text-xs">
                        <span className="text-slate-500 block text-[10px] font-bold">STATUS INTEGRASI:</span>
                        <span className="font-bold text-blue-700">
                          {autoSyncBukuKas ? 'Sinkron 2-Arah Aktif' : 'Hanya Rekening Koran'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Auto-Match Config Panel */}
                {isShowingAutoMatchConfig && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                          Ambang Batas Skor Kecocokan:
                        </label>
                        <select
                          value={autoMatchThreshold}
                          onChange={(e) => setAutoMatchThreshold(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value={60}>60% (Fleksibel - Saran Lebih Luas)</option>
                          <option value={70}>70% (Standar Rekomendasi)</option>
                          <option value={85}>85% (Ketat - Akurasi Tinggi)</option>
                          <option value={95}>95% (Hampir Sempurna)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                          Toleransi Selisih Tanggal:
                        </label>
                        <select
                          value={autoMatchToleranceDays}
                          onChange={(e) => setAutoMatchToleranceDays(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value={0}>0 Hari (Tanggal Harus Sama Persis)</option>
                          <option value={3}>± 3 Hari (Standar Kliring Bank)</option>
                          <option value={5}>± 5 Hari (Rekomendasi Mutasi Akhir Pekan)</option>
                          <option value={7}>± 7 Hari (Toleransi Luas 1 Minggu)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-center">
                        <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoSyncBukuKas}
                            onChange={(e) => setAutoSyncBukuKas(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-semibold">Otomatis Perbarui Rekonsiliasi Buku Kas</span>
                        </label>
                        <span className="text-[10px] text-slate-500 ml-6 mt-0.5">
                          Tandai status transaksi kas terkait sebagai 'Sudah Direkonsiliasi'
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RECONCILIATION SUMMARY VALIDATION BANNER */}
              {(previewResult.startingBalance !== undefined || previewResult.endingBalance !== undefined) && (
                <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Ringkasan Saldo Rekening Koran:</span>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {previewResult.periodLabel && <span>Periode: {previewResult.periodLabel} • </span>}
                        {previewResult.startingBalance !== undefined && (
                          <span>Saldo Awal: <strong className="text-slate-900 font-mono">{financeService.formatRupiah(previewResult.startingBalance)}</strong></span>
                        )}
                        {previewResult.endingBalance !== undefined && (
                          <span> • Saldo Akhir: <strong className="text-emerald-800 font-mono font-bold">{financeService.formatRupiah(previewResult.endingBalance)}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ekstraksi Lengkap & Akurat</span>
                    </span>
                  </div>
                </div>
              )}

              {/* SEARCH, FILTER & BULK ACTIONS BAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="text"
                      placeholder="Cari transaksi / keterangan / no jurnal..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white pl-8 focus:outline-none focus:border-blue-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>

                  {/* Filter Type */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        typeFilter === 'ALL'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter('CR');
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        typeFilter === 'CR'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      CR (Masuk)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter('DB');
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        typeFilter === 'DB'
                          ? 'bg-rose-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      DB (Keluar)
                    </button>
                  </div>
                </div>

                {/* Bulk Actions & Page Size */}
                <div className="flex items-center space-x-2">
                  {selectedItemIds.size > 0 && (
                    <div className="flex items-center space-x-1.5 animate-in fade-in">
                      <span className="text-[11px] text-blue-400 font-mono font-bold">
                        {selectedItemIds.size} dipilih
                      </span>
                      <button
                        type="button"
                        onClick={handleBulkToggleType}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                        title="Ubah tipe CR / DB item terpilih"
                      >
                        Ubah Tipe
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDeleteSelected}
                        className="px-2 py-1 rounded-lg bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                        title="Hapus item terpilih"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}

                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value={25}>25 baris/hal</option>
                    <option value={50}>50 baris/hal</option>
                    <option value={100}>100 baris/hal</option>
                    <option value={250}>250 baris/hal</option>
                    <option value={-1}>Tampilkan Semua</option>
                  </select>
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/90 text-slate-400 font-bold sticky top-0 border-b border-slate-800 z-10 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAllPage}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isAllPageSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 w-28">Tanggal</th>
                        <th className="py-2.5 px-3">Uraian / Deskripsi Mutasi</th>
                        <th className="py-2.5 px-3 w-24 text-center">Jenis</th>
                        <th className="py-2.5 px-3 w-32 text-right">Nominal</th>
                        <th className="py-2.5 px-3 w-36 text-center">Status Auto-Match</th>
                        <th className="py-2.5 px-3 w-28 text-right">Saldo</th>
                        <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-[11px]">
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            Tidak ada data mutasi yang cocok dengan pencarian atau filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((item, idx) => {
                          const globalIdx = (currentPage - 1) * (pageSize === -1 ? 0 : pageSize) + idx + 1;
                          const isSelected = selectedItemIds.has(item.id);
                          const isMatched = item.matchStatus === 'MATCHED' || item.matchStatus === 'MANUAL_MATCHED';

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-blue-950/30' : isMatched ? 'bg-emerald-950/10 hover:bg-emerald-950/20' : 'hover:bg-slate-900/60'
                              }`}
                            >
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectItem(item.id)}
                                  className="text-slate-400 hover:text-white cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-700" />
                                  )}
                                </button>
                              </td>
                              <td className="py-2 px-3 text-center text-slate-500 font-mono">
                                {globalIdx}
                              </td>
                              <td className="py-2 px-3 text-slate-300 font-mono font-medium whitespace-nowrap">
                                {item.date}
                              </td>
                              <td className="py-2 px-3 text-white font-medium">
                                <div className="line-clamp-2" title={item.description}>
                                  {item.description}
                                </div>
                                {item.referenceNumber && (
                                  <span className="text-[10px] text-blue-400 font-mono block">
                                    Ref/Journal: {item.referenceNumber}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleType(item.id)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer border transition-all ${
                                    item.type === 'CR'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30'
                                  }`}
                                  title="Klik untuk ubah jenis Debit/Kredit"
                                >
                                  {item.type === 'CR' ? 'CR (Masuk)' : 'DB (Keluar)'}
                                </button>
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                                  item.type === 'CR' ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {financeService.formatRupiah(item.amount)}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {isMatched ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>Matched ({item.confidenceScore || 100}%)</span>
                                    </span>
                                    {item.matchedTransactionCode && (
                                      <span className="text-[9px] font-mono text-emerald-400/90 font-semibold mt-0.5">
                                        {item.matchedTransactionCode}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] font-medium border border-amber-500/20">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                    <span>Belum di Kas</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                                {item.balance ? financeService.formatRupiah(item.balance) : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePreviewItem(item.id)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                                  title="Hapus baris ini dari preview"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
                    <div>
                      Menampilkan {Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)} -{' '}
                      {Math.min(filteredItems.length, currentPage * pageSize)} dari {filteredItems.length} transaksi
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-mono font-bold text-white">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PARSE ERROR NOTIFICATION */}
          {parseError && (
            <div className="p-4 bg-rose-950/60 rounded-2xl border border-rose-800/80 text-xs text-rose-300 space-y-3 animate-in fade-in">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-100 text-sm">Gagal Membaca File Rekening Koran</div>
                  <p className="mt-1 text-xs text-rose-300/90 leading-relaxed">{parseError}</p>
                </div>
              </div>

              {/* ACTION RECOVERY BUTTONS */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-900/40">
                <button
                  type="button"
                  onClick={() => downloadBankStatementExcelTemplate(bankName)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-300 border border-emerald-600/40 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Format Template Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setParseError(null);
                    handleLoadPreset(bankName.includes('BCA') ? 'BCA' : bankName.includes('MANDIRI') ? 'MANDIRI' : 'BNI');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-700/40 hover:bg-blue-700/60 text-blue-300 border border-blue-600/40 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Muat Contoh Data e-Statement ({bankName})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('text');
                    setParseError(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tempel Teks e-Banking Manual</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 flex-shrink-0">
          <div className="text-xs text-slate-400 hidden sm:block">
            {previewResult ? (
              <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{editableItems.length.toLocaleString()} transaksi siap diimpor & dicocokkan otomatis</span>
              </span>
            ) : (
              <span>Pilih file PDF atau Excel mutasi bank untuk memulai</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Batal
            </button>

            {previewResult ? (
              <button
                type="button"
                onClick={handleCommitImport}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:via-teal-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  Proses e-Statement ({processedItems.length}) & Auto-Match ({previewStats.matchedCount} Cocok)
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
