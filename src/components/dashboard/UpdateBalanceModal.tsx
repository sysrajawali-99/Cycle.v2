import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  Landmark,
  Banknote,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  PlusCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  Check,
  AlertCircle
} from 'lucide-react';
import { ChartOfAccount, FinanceTransaction, AuditTrailItem, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { storageService } from '../../services/storageService';

interface UpdateBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccount[];
  onUpdateAccounts?: (updated: ChartOfAccount[]) => void;
  onAddFinanceTransaction?: (trx: FinanceTransaction) => void;
  initialSelectedAccountCode?: string;
  userRole?: UserRole;
  userName?: string;
}

export const UpdateBalanceModal: React.FC<UpdateBalanceModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  onUpdateAccounts,
  onAddFinanceTransaction,
  initialSelectedAccountCode,
  userRole = 'Super Admin (HQ)',
  userName = 'Admin'
}) => {
  // Filter only Kas & Bank accounts (rekening pemasukan / kas & bank)
  const cashAndBankAccounts = accounts.filter(
    (acc) => acc.category === 'Kas & Bank' && acc.isActive
  );

  const [activeMode, setActiveMode] = useState<'single' | 'batch' | 'income_trx' | 'zero_all'>('single');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>(
    initialSelectedAccountCode || cashAndBankAccounts[0]?.code || '1120'
  );
  
  // Single mode state
  const [newBalanceInput, setNewBalanceInput] = useState<string>('0');
  const [updateNotes, setUpdateNotes] = useState<string>('Penyesuaian saldo riil rekening e-banking');

  // Batch mode state: map of accountCode -> balance
  const [batchBalances, setBatchBalances] = useState<Record<string, number>>({});

  // Income Trx mode state
  const [incomeAmount, setIncomeAmount] = useState<string>('10000000');
  const [incomeContraAccount, setIncomeContraAccount] = useState<string>('4110'); // Pendapatan Jasa Kontrak
  const [incomeTitle, setIncomeTitle] = useState<string>('Setoran Penerimaan Kontrak Klien');
  const [incomeRefNo, setIncomeRefNo] = useState<string>(`BKM-${Date.now().toString().slice(-6)}`);

  // Success / alert state
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Synchronize when modal opens or initialSelectedAccountCode changes
  useEffect(() => {
    if (isOpen) {
      const targetCode = initialSelectedAccountCode || cashAndBankAccounts[0]?.code || '1120';
      setSelectedAccountCode(targetCode);
      const targetAcc = accounts.find((a) => a.code === targetCode);
      setNewBalanceInput(targetAcc ? (targetAcc.currentBalance || 0).toString() : '0');

      // Init batch map
      const initialMap: Record<string, number> = {};
      cashAndBankAccounts.forEach((acc) => {
        initialMap[acc.code] = acc.currentBalance || 0;
      });
      setBatchBalances(initialMap);

      setSaveSuccess(false);
      setSuccessMessage('');
    }
  }, [isOpen, initialSelectedAccountCode, accounts]);

  // When selected account changes in single mode
  const handleAccountSelectChange = (code: string) => {
    setSelectedAccountCode(code);
    const target = accounts.find((a) => a.code === code);
    if (target) {
      setNewBalanceInput((target.currentBalance || 0).toString());
    }
  };

  if (!isOpen) return null;

  const selectedAccount = accounts.find((a) => a.code === selectedAccountCode) || cashAndBankAccounts[0];
  const currentBalanceNum = selectedAccount ? (selectedAccount.currentBalance || 0) : 0;
  const parsedNewBalance = parseFloat(newBalanceInput) || 0;
  const balanceDiff = parsedNewBalance - currentBalanceNum;

  // Handle Single Account Balance Update
  const handleSaveSingleBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const targetAmount = Math.max(0, parsedNewBalance);
    const updatedAccounts = accounts.map((acc) => {
      if (acc.code === selectedAccount.code) {
        return {
          ...acc,
          initialBalance: targetAmount,
          currentBalance: targetAmount
        };
      }
      return acc;
    });

    // Save to storage and invoke handler
    storageService.saveChartOfAccounts(updatedAccounts);
    if (onUpdateAccounts) {
      onUpdateAccounts(updatedAccounts);
    }

    // Add audit log
    const audit: AuditTrailItem = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName,
      userRole,
      actionType: 'UPDATE',
      module: 'Master Akun COA',
      recordId: selectedAccount.code,
      recordCode: selectedAccount.code,
      description: `Update saldo rekening ${selectedAccount.name} (${selectedAccount.code}) menjadi ${formatCurrency(targetAmount)}. Selisih: ${formatCurrency(balanceDiff)}. Catatan: ${updateNotes}`,
      amount: targetAmount
    };
    storageService.saveAuditTrails([audit, ...storageService.getAuditTrails()]);

    setSuccessMessage(`Saldo ${selectedAccount.name} berhasil diperbarui menjadi ${formatCurrency(targetAmount)}`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  // Handle Batch Balances Update (All Bank & Cash Accounts)
  const handleSaveBatchBalances = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAccounts = accounts.map((acc) => {
      if (acc.category === 'Kas & Bank' && batchBalances[acc.code] !== undefined) {
        const amt = Math.max(0, Number(batchBalances[acc.code]) || 0);
        return {
          ...acc,
          initialBalance: amt,
          currentBalance: amt
        };
      }
      return acc;
    });

    storageService.saveChartOfAccounts(updatedAccounts);
    if (onUpdateAccounts) {
      onUpdateAccounts(updatedAccounts);
    }

    const audit: AuditTrailItem = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName,
      userRole,
      actionType: 'UPDATE',
      module: 'Master Akun COA',
      recordId: 'BATCH_KAS_BANK',
      description: `Update serentak seluruh saldo rekening pemasukan dan kas & bank.`
    };
    storageService.saveAuditTrails([audit, ...storageService.getAuditTrails()]);

    setSuccessMessage('Seluruh saldo rekening pemasukan dan kas & bank berhasil disinkronkan!');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  // Handle Income Transaction Recording
  const handleSaveIncomeTrx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    const amountNum = parseFloat(incomeAmount) || 0;
    if (amountNum <= 0) return;

    const contraAcc = accounts.find((a) => a.code === incomeContraAccount);
    const newTrx: FinanceTransaction = {
      id: `trx-${Date.now()}`,
      code: `BKM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      type: 'IN',
      title: incomeTitle,
      description: `Penerimaan dana via ${selectedAccount.name}. Ref: ${incomeRefNo}`,
      amount: amountNum,
      paymentMethod: (selectedAccount.name as any) || 'Bank BCA (123-456-7890)',
      primaryAccountCode: selectedAccount.code,
      contraAccountCode: incomeContraAccount,
      referenceNumber: incomeRefNo,
      projectId: 'ALL',
      division: 'Cleaning Service',
      currency: 'IDR',
      exchangeRate: 1,
      isReconciled: false,
      isAdjusting: false,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      journalEntries: [
        {
          id: `j-${Date.now()}-1`,
          accountCode: selectedAccount.code,
          accountName: selectedAccount.name,
          debit: amountNum,
          credit: 0,
          notes: `Kas/Bank masuk ${selectedAccount.name}`
        },
        {
          id: `j-${Date.now()}-2`,
          accountCode: incomeContraAccount,
          accountName: contraAcc?.name || 'Pendapatan Jasa',
          debit: 0,
          credit: amountNum,
          notes: `Lawan akun penerimaan`
        }
      ]
    };

    // Update account current balance
    const updatedAccounts = accounts.map((acc) => {
      if (acc.code === selectedAccount.code) {
        return {
          ...acc,
          currentBalance: (acc.currentBalance || 0) + amountNum
        };
      }
      if (acc.code === incomeContraAccount) {
        return {
          ...acc,
          currentBalance: (acc.currentBalance || 0) + amountNum
        };
      }
      return acc;
    });

    storageService.saveChartOfAccounts(updatedAccounts);
    if (onUpdateAccounts) {
      onUpdateAccounts(updatedAccounts);
    }

    if (onAddFinanceTransaction) {
      onAddFinanceTransaction(newTrx);
    } else {
      const existing = storageService.getFinanceTransactions();
      storageService.saveFinanceTransactions([newTrx, ...existing]);
    }

    const audit: AuditTrailItem = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName,
      userRole,
      actionType: 'CREATE',
      module: 'Uang Masuk',
      recordId: newTrx.code,
      recordCode: newTrx.code,
      description: `Setoran kas masuk ${formatCurrency(amountNum)} ke rekening ${selectedAccount.name}. Sumber: ${contraAcc?.name}`,
      amount: amountNum
    };
    storageService.saveAuditTrails([audit, ...storageService.getAuditTrails()]);

    setSuccessMessage(`Setoran kas ${formatCurrency(amountNum)} ke ${selectedAccount.name} berhasil dicatat & saldo bertambah!`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  // Handle Reset All COA Balances to Rp 0 (Clean State)
  const handleResetAllCoaToZero = () => {
    if (!window.confirm('Apakah Anda yakin ingin MENGOSONGKAN (Rp 0) SEMUA SALDO pada seluruh akun COA agar dapat memulai dari kondisi kosong?')) {
      return;
    }

    const zeroed = storageService.resetCoaBalancesToZero();
    if (onUpdateAccounts) {
      onUpdateAccounts(zeroed);
    }

    const audit: AuditTrailItem = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userName,
      userRole,
      actionType: 'UPDATE',
      module: 'Master Akun COA',
      recordId: 'COA_ZERO_ALL',
      description: `Pengosongan nilai rupiah seluruh akun COA (Kondisi Awal Bersih / Nol).`
    };
    storageService.saveAuditTrails([audit, ...storageService.getAuditTrails()]);

    setSuccessMessage('Semua saldo akun COA telah berhasil dikosongkan (Rp 0)!');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/30 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shadow-inner">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg">Update Saldo Rekening Pemasukan</h3>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Dashboard Center
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sesuaikan saldo awal, saldo e-banking, atau catat setoran kas masuk
              </p>
            </div>
          </div>
          <button
            id="close-update-balance-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 border-b border-slate-800/80 bg-slate-950/40 flex space-x-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveMode('single')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeMode === 'single'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Update Per Rekening</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('batch')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeMode === 'batch'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Update Semua Sekaligus</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('income_trx')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeMode === 'income_trx'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Setoran Pemasukan Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('zero_all')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeMode === 'zero_all'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-rose-400'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nol-kan Semua Saldo COA</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE 1: SINGLE ACCOUNT BALANCE UPDATE */}
          {activeMode === 'single' && (
            <form onSubmit={handleSaveSingleBalance} className="space-y-4">
              {/* Account Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Pilih Rekening Pemasukan / Kas & Bank</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cashAndBankAccounts.map((acc) => {
                    const isSelected = selectedAccountCode === acc.code;
                    return (
                      <button
                        key={acc.code}
                        type="button"
                        onClick={() => handleAccountSelectChange(acc.code)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {acc.code}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{acc.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Saldo: <span className="font-semibold text-slate-200">{formatCurrency(acc.currentBalance || 0)}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saldo Saat Ini vs Saldo Baru */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Rekening Terpilih:</span>
                  <span className="font-bold text-white">{selectedAccount?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Saldo Buku Saat Ini:</span>
                  <span className="font-mono font-bold text-slate-200">{formatCurrency(currentBalanceNum)}</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-amber-400 flex items-center justify-between">
                    <span>Input Saldo Baru (Rp)</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Sesuai Saldo Mutasi e-Banking / Kas Fisik
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400 font-bold text-sm">
                      Rp
                    </div>
                    <input
                      id="input-new-balance-amount"
                      type="number"
                      min="0"
                      step="1"
                      value={newBalanceInput}
                      onChange={(e) => setNewBalanceInput(e.target.value)}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-white font-mono font-bold text-lg outline-none"
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 mr-1">Shortcut:</span>
                  <button
                    type="button"
                    onClick={() => setNewBalanceInput('0')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    Reset (Rp 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBalanceInput((parsedNewBalance + 5000000).toString())}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    +5 Jt
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBalanceInput((parsedNewBalance + 25000000).toString())}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    +25 Jt
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBalanceInput((parsedNewBalance + 50000000).toString())}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    +50 Jt
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBalanceInput((parsedNewBalance + 100000000).toString())}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    +100 Jt
                  </button>
                </div>

                {/* Balance Delta Preview */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Selisih Penyesuaian Saldo:</span>
                  <span
                    className={`font-mono font-bold ${
                      balanceDiff > 0
                        ? 'text-emerald-400'
                        : balanceDiff < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {balanceDiff > 0 ? `+${formatCurrency(balanceDiff)}` : formatCurrency(balanceDiff)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Catatan / Alasan Penyesuaian</label>
                <input
                  type="text"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Contoh: Rekonsiliasi saldo awal rekening koran per 1 September 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-update-single-balance"
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Saldo</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: BATCH UPDATE ALL ACCOUNTS */}
          {activeMode === 'batch' && (
            <form onSubmit={handleSaveBatchBalances} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Update langsung seluruh rekening penerimaan kas & bank Anda dalam satu tabel. Ideal untuk input saldo awal buku baru atau rekonsiliasi bulanan.
                </span>
              </div>

              <div className="space-y-2.5">
                {cashAndBankAccounts.map((acc) => {
                  const val = batchBalances[acc.code] !== undefined ? batchBalances[acc.code] : (acc.currentBalance || 0);
                  return (
                    <div
                      key={acc.code}
                      className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {acc.code}
                          </span>
                          <span className="font-bold text-white text-xs">{acc.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{acc.description}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="relative w-44">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                            Rp
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={val}
                            onChange={(e) =>
                              setBatchBalances({
                                ...batchBalances,
                                [acc.code]: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full pl-8 pr-2.5 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl text-white font-mono font-bold text-xs text-right outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBatchBalances({
                              ...batchBalances,
                              [acc.code]: 0
                            })
                          }
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          title="Nol-kan saldo akun ini"
                        >
                          Rp 0
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Total Likuiditas Seluruh Kas & Bank:</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  {formatCurrency(
                    Object.values(batchBalances)
                      .map((v) => Number(v) || 0)
                      .reduce((sum, v) => sum + v, 0)
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-update-batch-balances"
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Seluruh Saldo Kas & Bank</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: RECORD INCOME DEPOSIT */}
          {activeMode === 'income_trx' && (
            <form onSubmit={handleSaveIncomeTrx} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Rekening Tujuan Penerimaan Dana</label>
                <select
                  value={selectedAccountCode}
                  onChange={(e) => setSelectedAccountCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                >
                  {cashAndBankAccounts.map((acc) => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name} (Saldo: {formatCurrency(acc.currentBalance || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-400">Nominal Setoran Pemasukan (Rp)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400 font-bold text-xs">
                      Rp
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white focus:border-amber-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Lawan Akun / Sumber Pemasukan</label>
                  <select
                    value={incomeContraAccount}
                    onChange={(e) => setIncomeContraAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                  >
                    {accounts
                      .filter((a) => a.type === 'Revenue' || a.type === 'Equity' || a.category === 'Piutang Usaha')
                      .map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} - {a.name} ({a.category})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Judul / Keterangan Transaksi</label>
                  <input
                    type="text"
                    value={incomeTitle}
                    onChange={(e) => setIncomeTitle(e.target.value)}
                    placeholder="Contoh: Penerimaan Kontrak Cleaning Mall"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">No. Referensi / Bukti Transfer</label>
                  <input
                    type="text"
                    value={incomeRefNo}
                    onChange={(e) => setIncomeRefNo(e.target.value)}
                    placeholder="Ref: BKM-00123"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-record-income-trx"
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Catat Pemasukan & Update Saldo</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: ZERO ALL COA BALANCES (START CLEAN) */}
          {activeMode === 'zero_all' && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Nol-kan Semua Nilai Rupiah di Chart of Accounts (COA)</span>
                </div>
                <p className="leading-relaxed text-slate-300">
                  Tindakan ini akan mereset <strong>seluruh saldo awal (*initial balance*)</strong> dan <strong>saldo terkini (*current balance*)</strong> dari semua akun (Aset, Liabilitas, Ekuitas, Pendapatan, dan Beban) menjadi <strong>Rp 0</strong>.
                </p>
                <p className="text-slate-400 text-[11px]">
                  Struktur kode dan nama akun baku tetap dipertahankan, sehingga Anda dapat langsung memasukkan saldo awal riil perusahaan tanpa data dummy.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="font-bold text-slate-200">Daftar Akun yang Akan Di-nolkan ({accounts.length} Akun):</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                  {accounts.map((a) => (
                    <div key={a.code} className="p-2 bg-slate-900 rounded-lg text-[11px] border border-slate-800">
                      <span className="font-mono text-amber-400 font-bold">{a.code}</span>
                      <div className="text-slate-300 truncate">{a.name}</div>
                      <div className="text-[10px] text-slate-500">Saldo sekarang: {formatCurrency(a.currentBalance || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="confirm-zero-all-coa-btn"
                  type="button"
                  onClick={handleResetAllCoaToZero}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Kosongkan Semua Nilai Rupiah COA (Rp 0)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
