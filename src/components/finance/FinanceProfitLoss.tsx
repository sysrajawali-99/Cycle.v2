import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Building2,
  Download,
  Printer,
  FileSpreadsheet,
  PieChart,
  BarChart3,
  Percent,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ChevronRight,
  TrendingDown,
  Layers
} from 'lucide-react';
import {
  ChartOfAccount,
  FinanceTransaction,
  ProfitLossStatement,
  StatementAccountItem
} from '../../types/finance';
import { Project, UserAccount } from '../../types';
import { financeService } from '../../services/financeService';
import { formatCurrency, downloadCSV } from '../../utils/formatters';

interface FinanceProfitLossProps {
  accounts: ChartOfAccount[];
  transactions: FinanceTransaction[];
  projects: Project[];
  currentUser?: UserAccount | null;
}

export const FinanceProfitLoss: React.FC<FinanceProfitLossProps> = ({
  accounts = [],
  transactions = [],
  projects = [],
  currentUser
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August (1-12)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [dateRangeType, setDateRangeType] = useState<'MONTH' | 'CUSTOM' | 'YTD'>('MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-08-31');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Determine Effective Date Range
  const { startDate, endDate, periodTitle } = useMemo(() => {
    if (dateRangeType === 'MONTH') {
      const y = selectedYear;
      const m = String(selectedMonth).padStart(2, '0');
      const lastDay = new Date(y, selectedMonth, 0).getDate();
      return {
        startDate: `${y}-${m}-01`,
        endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
        periodTitle: `Periode: 1 ${monthNames[selectedMonth - 1]} ${y} s/d ${lastDay} ${monthNames[selectedMonth - 1]} ${y}`
      };
    } else if (dateRangeType === 'YTD') {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        periodTitle: `Year to Date (YTD) Tahun ${selectedYear}`
      };
    } else {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        periodTitle: `Periode: ${customStartDate} s/d ${customEndDate}`
      };
    }
  }, [dateRangeType, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Generate P&L Statement using financeService
  const plStatement = useMemo(() => {
    return financeService.generateProfitLossStatement(
      accounts,
      transactions,
      startDate,
      endDate,
      selectedProjectId
    );
  }, [accounts, transactions, startDate, endDate, selectedProjectId]);

  // Calculate Margins
  const margins = useMemo(() => {
    const rev = plStatement.totalRevenue || 1;
    const grossMargin = (plStatement.grossProfit / rev) * 100;
    const operatingMargin = (plStatement.operatingProfit / rev) * 100;
    const netMargin = (plStatement.netProfit / rev) * 100;

    return {
      grossMargin: isNaN(grossMargin) ? 0 : grossMargin,
      operatingMargin: isNaN(operatingMargin) ? 0 : operatingMargin,
      netMargin: isNaN(netMargin) ? 0 : netMargin
    };
  }, [plStatement]);

  // Per-Project Profitability Breakdown
  const projectBreakdown = useMemo(() => {
    return projects.map((prj) => {
      const stmt = financeService.generateProfitLossStatement(
        accounts,
        transactions,
        startDate,
        endDate,
        prj.id
      );
      const margin = stmt.totalRevenue > 0 ? (stmt.netProfit / stmt.totalRevenue) * 100 : 0;
      return {
        project: prj,
        revenue: stmt.totalRevenue,
        cogs: stmt.totalCogs,
        grossProfit: stmt.grossProfit,
        netProfit: stmt.netProfit,
        margin
      };
    });
  }, [projects, accounts, transactions, startDate, endDate]);

  // Export CSV
  const handleExportCSV = () => {
    const rows: any[] = [];

    // Header Info
    rows.push({ 'KATEGORI / AKUN': 'LAPORAN LABA RUGI KOMPREHENSIF', 'KODE AKUN': '', 'NOMINAL (RP)': '', 'PORSI (% REV)': '' });
    rows.push({ 'KATEGORI / AKUN': periodTitle, 'KODE AKUN': '', 'NOMINAL (RP)': '', 'PORSI (% REV)': '' });
    rows.push({ 'KATEGORI / AKUN': '', 'KODE AKUN': '', 'NOMINAL (RP)': '', 'PORSI (% REV)': '' });

    // Revenue
    rows.push({ 'KATEGORI / AKUN': '1. PENDAPATAN USAHA (REVENUE)', 'KODE AKUN': '', 'NOMINAL (RP)': '', 'PORSI (% REV)': '' });
    (plStatement.revenues || plStatement.revenueAccounts || []).forEach((r) => {
      rows.push({
        'KATEGORI / AKUN': `  ${r.accountName}`,
        'KODE AKUN': r.accountCode,
        'NOMINAL (RP)': r.amount,
        'PORSI (% REV)': `${((r.amount / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%`
      });
    });
    rows.push({ 'KATEGORI / AKUN': 'TOTAL PENDAPATAN USAHA', 'KODE AKUN': '', 'NOMINAL (RP)': plStatement.totalRevenue, 'PORSI (% REV)': '100.0%' });

    // COGS
    rows.push({ 'KATEGORI / AKUN': '2. BEBAN POKOK PENDAPATAN (HPP / DIRECT COSTS)', 'KODE AKUN': '', 'NOMINAL (RP)': '', 'PORSI (% REV)': '' });
    (plStatement.cogs || plStatement.cogsAccounts || []).forEach((c) => {
      rows.push({
        'KATEGORI / AKUN': `  ${c.accountName}`,
        'KODE AKUN': c.accountCode,
        'NOMINAL (RP)': c.amount,
        'PORSI (% REV)': `${((c.amount / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%`
      });
    });
    rows.push({ 'KATEGORI / AKUN': 'TOTAL BEBAN POKOK PENDAPATAN (HPP)', 'KODE AKUN': '', 'NOMINAL (RP)': plStatement.totalCogs, 'PORSI (% REV)': `${((plStatement.totalCogs / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%` });

    // Gross Profit
    rows.push({ 'KATEGORI / AKUN': 'LABA KOTOR (GROSS PROFIT)', 'KODE AKUN': '', 'NOMINAL (RP)': plStatement.grossProfit, 'PORSI (% REV)': `${margins.grossMargin.toFixed(1)}%` });

    // OPEX
    rows.push({ 'KATEGORI / AKUN': '3. BEBAN OPERASIONAL & ADMINISTRASI (OPEX)', 'KODE AKUN': '', 'NOMINAL (RP)': '', 'PORSI (% REV)': '' });
    (plStatement.expenses || plStatement.operationalExpenses || plStatement.opexAccounts || []).forEach((e) => {
      rows.push({
        'KATEGORI / AKUN': `  ${e.accountName}`,
        'KODE AKUN': e.accountCode,
        'NOMINAL (RP)': e.amount,
        'PORSI (% REV)': `${((e.amount / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%`
      });
    });
    rows.push({ 'KATEGORI / AKUN': 'TOTAL BEBAN OPERASIONAL (OPEX)', 'KODE AKUN': '', 'NOMINAL (RP)': plStatement.totalExpenses, 'PORSI (% REV)': `${((plStatement.totalExpenses / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%` });

    // Operating Profit
    rows.push({ 'KATEGORI / AKUN': 'LABA OPERASIONAL (OPERATING INCOME / EBITDA)', 'KODE AKUN': '', 'NOMINAL (RP)': plStatement.operatingProfit || plStatement.operatingIncome || 0, 'PORSI (% REV)': `${margins.operatingMargin.toFixed(1)}%` });

    // Other Income / Expense
    rows.push({ 'KATEGORI / AKUN': '4. PENDAPATAN / (BEBAN) NON-OPERASIONAL', 'KODE AKUN': '', 'NOMINAL (RP)': '', 'PORSI (% REV)': '' });
    (plStatement.otherIncomes || plStatement.otherIncomeAccounts || []).forEach((oi) => {
      rows.push({ 'KATEGORI / AKUN': `  ${oi.accountName}`, 'KODE AKUN': oi.accountCode, 'NOMINAL (RP)': oi.amount, 'PORSI (% REV)': '' });
    });
    (plStatement.otherExpenses || plStatement.otherExpenseAccounts || []).forEach((oe) => {
      rows.push({ 'KATEGORI / AKUN': `  (${oe.accountName})`, 'KODE AKUN': oe.accountCode, 'NOMINAL (RP)': -oe.amount, 'PORSI (% REV)': '' });
    });

    // Net Profit
    rows.push({ 'KATEGORI / AKUN': 'LABA BERSIH PERIODE BERJALAN (NET PROFIT)', 'KODE AKUN': '', 'NOMINAL (RP)': plStatement.netProfit, 'PORSI (% REV)': `${margins.netMargin.toFixed(1)}%` });

    downloadCSV(rows, `Rajawali_Laba_Rugi_${startDate}_${endDate}.csv`);
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Laporan Keuangan Resmi
            </span>
            <span className="text-xs text-slate-400">PSAK & Standar Akuntansi Indonesia</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Laporan Laba Rugi (Profit & Loss)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {periodTitle} • {selectedProjectId === 'ALL' ? 'Konsolidasi Seluruh Site & Kantor Pusat' : projects.find(p => p.id === selectedProjectId)?.name}
          </p>
        </div>

        {/* Action Buttons & Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Period Selector */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 flex items-center space-x-1 text-xs">
            <button
              onClick={() => setDateRangeType('MONTH')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                dateRangeType === 'MONTH' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setDateRangeType('YTD')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                dateRangeType === 'YTD' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              YTD 2026
            </button>
            <button
              onClick={() => setDateRangeType('CUSTOM')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                dateRangeType === 'CUSTOM' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kustom
            </button>
          </div>

          {dateRangeType === 'MONTH' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {monthNames.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m} {selectedYear}
                </option>
              ))}
            </select>
          )}

          {dateRangeType === 'CUSTOM' && (
            <div className="flex items-center space-x-1.5 text-xs text-white">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white"
              />
            </div>
          )}

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Site / Konsolidasi</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pendapatan */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Pendapatan Usaha</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-cyan-400 mt-1">
            {formatCurrency(plStatement.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Kontrak Cleaning & Facade:</span>
            <span className="font-bold text-white">100.0%</span>
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Laba Kotor (Gross Profit)</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(plStatement.grossProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Gross Profit Margin:</span>
            <span className="font-bold text-emerald-300">{margins.grossMargin.toFixed(1)}%</span>
          </div>
        </div>

        {/* Beban Operasional */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Beban Operasional (OPEX)</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-400 mt-1">
            {formatCurrency(plStatement.totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Laba Operasional (EBITDA):</span>
            <span className="font-bold text-slate-200">{formatCurrency(plStatement.operatingProfit)}</span>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Laba Bersih (Net Profit)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(plStatement.netProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Net Profit Margin:</span>
            <span className="font-bold text-emerald-300">{margins.netMargin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* DETAILED STATEMENT STRUCTURE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Rincian Pos Pembukuan Laba Rugi Komprehensif
          </h2>
          <span className="text-xs text-slate-400">Nilai dalam Rupiah (IDR)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
                <th className="py-3 px-4">Pos Akun / Uraian</th>
                <th className="py-3 px-3 font-mono text-center">Kode Akun</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                <th className="py-3 px-4 text-right">Porsi (% Revenue)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {/* 1. PENDAPATAN USAHA */}
              <tr className="bg-slate-800/40 font-bold text-slate-200">
                <td colSpan={4} className="py-2.5 px-4 text-cyan-400 uppercase text-[11px]">
                  1. PENDAPATAN USAHA (REVENUE)
                </td>
              </tr>
              {(plStatement.revenues || plStatement.revenueAccounts || []).map((item, i) => (
                <tr key={`rev-${i}`} className="hover:bg-slate-800/30">
                  <td className="py-2 px-6 text-slate-300 font-medium">{item.accountName}</td>
                  <td className="py-2 px-3 font-mono text-slate-400 text-center">{item.accountCode}</td>
                  <td className="py-2 px-4 text-right font-semibold text-white">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-400">
                    {((item.amount / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800/60 font-bold text-white border-t border-slate-700">
                <td className="py-2.5 px-4 text-slate-200 uppercase">TOTAL PENDAPATAN USAHA</td>
                <td className="py-2.5 px-3 text-center">-</td>
                <td className="py-2.5 px-4 text-right text-cyan-400 font-black text-sm">
                  {formatCurrency(plStatement.totalRevenue)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-cyan-300 font-bold">100.0%</td>
              </tr>

              {/* 2. BEBAN POKOK PENDAPATAN (HPP) */}
              <tr className="bg-slate-800/40 font-bold text-slate-200">
                <td colSpan={4} className="py-2.5 px-4 text-rose-400 uppercase text-[11px]">
                  2. BEBAN POKOK PENDAPATAN / BIAYA LANGSUNG (HPP / COGS)
                </td>
              </tr>
              {(plStatement.cogs || plStatement.cogsAccounts || []).map((item, i) => (
                <tr key={`cogs-${i}`} className="hover:bg-slate-800/30">
                  <td className="py-2 px-6 text-slate-300 font-medium">{item.accountName}</td>
                  <td className="py-2 px-3 font-mono text-slate-400 text-center">{item.accountCode}</td>
                  <td className="py-2 px-4 text-right font-semibold text-rose-300">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-400">
                    {((item.amount / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800/60 font-bold text-white border-t border-slate-700">
                <td className="py-2.5 px-4 text-slate-200 uppercase">TOTAL BEBAN POKOK PENDAPATAN (HPP)</td>
                <td className="py-2.5 px-3 text-center">-</td>
                <td className="py-2.5 px-4 text-right text-rose-400 font-black text-sm">
                  {formatCurrency(plStatement.totalCogs)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-rose-300 font-bold">
                  {((plStatement.totalCogs / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%
                </td>
              </tr>

              {/* 3. LABA KOTOR */}
              <tr className="bg-emerald-950/20 font-black text-emerald-300 border-y-2 border-emerald-500/30 text-xs">
                <td className="py-3 px-4 uppercase">LABA KOTOR (GROSS PROFIT)</td>
                <td className="py-3 px-3 text-center">-</td>
                <td className="py-3 px-4 text-right text-base text-emerald-400">
                  {formatCurrency(plStatement.grossProfit)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-300">
                  {margins.grossMargin.toFixed(1)}%
                </td>
              </tr>

              {/* 4. BEBAN OPERASIONAL (OPEX) */}
              <tr className="bg-slate-800/40 font-bold text-slate-200">
                <td colSpan={4} className="py-2.5 px-4 text-amber-400 uppercase text-[11px]">
                  3. BEBAN OPERASIONAL & ADMINISTRASI KANTOR (OPEX)
                </td>
              </tr>
              {(plStatement.expenses || plStatement.operationalExpenses || plStatement.opexAccounts || []).map((item, i) => (
                <tr key={`exp-${i}`} className="hover:bg-slate-800/30">
                  <td className="py-2 px-6 text-slate-300 font-medium">{item.accountName}</td>
                  <td className="py-2 px-3 font-mono text-slate-400 text-center">{item.accountCode}</td>
                  <td className="py-2 px-4 text-right font-semibold text-amber-300">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-400">
                    {((item.amount / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800/60 font-bold text-white border-t border-slate-700">
                <td className="py-2.5 px-4 text-slate-200 uppercase">TOTAL BEBAN OPERASIONAL (OPEX)</td>
                <td className="py-2.5 px-3 text-center">-</td>
                <td className="py-2.5 px-4 text-right text-amber-400 font-black text-sm">
                  {formatCurrency(plStatement.totalExpenses)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-amber-300 font-bold">
                  {((plStatement.totalExpenses / (plStatement.totalRevenue || 1)) * 100).toFixed(1)}%
                </td>
              </tr>

              {/* 5. LABA OPERASIONAL */}
              <tr className="bg-slate-800/80 font-bold text-white border-y border-slate-700">
                <td className="py-2.5 px-4 text-slate-200 uppercase">
                  LABA OPERASIONAL (OPERATING INCOME / EBITDA)
                </td>
                <td className="py-2.5 px-3 text-center">-</td>
                <td className="py-2.5 px-4 text-right font-black text-white text-sm">
                  {formatCurrency(plStatement.operatingProfit || plStatement.operatingIncome || 0)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-300 font-bold">
                  {margins.operatingMargin.toFixed(1)}%
                </td>
              </tr>

              {/* 6. PENDAPATAN & BEBAN LAIN-LAIN */}
              <tr className="bg-slate-800/40 font-bold text-slate-200">
                <td colSpan={4} className="py-2.5 px-4 text-purple-400 uppercase text-[11px]">
                  4. PENDAPATAN & (BEBAN) NON-OPERASIONAL
                </td>
              </tr>
              {(plStatement.otherIncomes || plStatement.otherIncomeAccounts || []).map((item, i) => (
                <tr key={`oi-${i}`} className="hover:bg-slate-800/30">
                  <td className="py-2 px-6 text-slate-300 font-medium">{item.accountName}</td>
                  <td className="py-2 px-3 font-mono text-slate-400 text-center">{item.accountCode}</td>
                  <td className="py-2 px-4 text-right font-semibold text-emerald-400">
                    +{formatCurrency(item.amount)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-400">-</td>
                </tr>
              ))}
              {(plStatement.otherExpenses || plStatement.otherExpenseAccounts || []).map((item, i) => (
                <tr key={`oe-${i}`} className="hover:bg-slate-800/30">
                  <td className="py-2 px-6 text-slate-300 font-medium">({item.accountName})</td>
                  <td className="py-2 px-3 font-mono text-slate-400 text-center">{item.accountCode}</td>
                  <td className="py-2 px-4 text-right font-semibold text-rose-400">
                    -{formatCurrency(item.amount)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-400">-</td>
                </tr>
              ))}

              {/* 7. LABA BERSIH (NET PROFIT) */}
              <tr className="bg-emerald-950/40 font-black text-emerald-300 border-t-2 border-emerald-500">
                <td className="py-4 px-4 text-sm uppercase">
                  LABA BERSIH TAHUN / PERIODE BERJALAN (NET PROFIT)
                </td>
                <td className="py-4 px-3 text-center">-</td>
                <td className="py-4 px-4 text-right text-lg text-emerald-400 font-black">
                  {formatCurrency(plStatement.netProfit)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-sm font-black text-emerald-300">
                  {margins.netMargin.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PER-PROJECT PROFITABILITY BREAKDOWN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-400" />
          Analisa Profitabilitas Margin per Site Proyek
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px] border-b border-slate-700">
                <th className="py-2.5 px-3">Nama Site Proyek</th>
                <th className="py-2.5 px-3">PIC / Lokasi</th>
                <th className="py-2.5 px-3 text-right">Pendapatan Kontrak</th>
                <th className="py-2.5 px-3 text-right">Beban Langsung (HPP)</th>
                <th className="py-2.5 px-3 text-right">Laba Kotor</th>
                <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                <th className="py-2.5 px-3 text-center">Net Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {projectBreakdown.map((item) => (
                <tr key={item.project.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-semibold text-white">{item.project.name}</td>
                  <td className="py-2.5 px-3 text-slate-400">{item.project.location}</td>
                  <td className="py-2.5 px-3 text-right text-cyan-300 font-medium">
                    {formatCurrency(item.revenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-300 font-medium">
                    {formatCurrency(item.cogs)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-200 font-bold">
                    {formatCurrency(item.grossProfit)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-black">
                    {formatCurrency(item.netProfit)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                        item.margin >= 20
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.margin >= 10
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {item.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
