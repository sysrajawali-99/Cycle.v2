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
  ChevronDown,
  TrendingDown,
  Layers,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
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
  const currentNow = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (Array.isArray(transactions) && transactions.length > 0) {
      const dates = transactions.map((t) => t.date).filter(Boolean).sort();
      const latest = dates[dates.length - 1];
      if (latest) {
        const parts = latest.split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 12) return m;
        }
      }
    }
    return currentNow.getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (Array.isArray(transactions) && transactions.length > 0) {
      const dates = transactions.map((t) => t.date).filter(Boolean).sort();
      const latest = dates[dates.length - 1];
      if (latest) {
        const parts = latest.split('-');
        if (parts.length >= 1) {
          const y = parseInt(parts[0], 10);
          if (y > 2000) return y;
        }
      }
    }
    return currentNow.getFullYear();
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [dateRangeType, setDateRangeType] = useState<'MONTH' | 'YTD' | 'ALL' | 'CUSTOM'>('MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>(() => `${currentNow.getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

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
    } else if (dateRangeType === 'ALL') {
      return {
        startDate: undefined,
        endDate: undefined,
        periodTitle: 'Semua Periode Transaksi (Akumulatif)'
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
      selectedProjectId,
      projects
    );
  }, [accounts, transactions, startDate, endDate, selectedProjectId, projects]);

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
        prj.id,
        projects
      );

      // Find all transactions specifically matching this site project
      const matchingTrx = (transactions || []).filter((t) => {
        if (!t) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        const isMatched =
          t.projectId === prj.id ||
          (t.projectName && t.projectName === prj.name) ||
          t.projectId === prj.name ||
          t.projectId === prj.code ||
          (t.projectName && t.projectName.trim().toLowerCase() === prj.name.trim().toLowerCase() && t.projectId !== 'ALL');
        return isMatched;
      });

      // Sum direct contract revenues from Cash In (BKM / Uang Masuk)
      const directCashIn = matchingTrx
        .filter((t) => t.type === 'IN')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Sum direct costs from Cash Out (BKK / Uang Keluar)
      const directCashOut = matchingTrx
        .filter((t) => t.type === 'OUT')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Effective revenue: synchronized with transactions in Kas & Bank
      const effectiveRevenue = Math.max(stmt.totalRevenue, directCashIn);
      // Effective COGS (Beban Langsung HPP): synchronized with transactions in Kas & Bank
      const effectiveCogs = Math.max(stmt.totalCogs, directCashOut);

      const grossProfit = effectiveRevenue - effectiveCogs;
      const netProfit = grossProfit;
      const margin = effectiveRevenue > 0 ? (netProfit / effectiveRevenue) * 100 : 0;

      const cashInTransactions = matchingTrx.filter((t) => t.type === 'IN');
      const cashOutTransactions = matchingTrx.filter((t) => t.type === 'OUT');

      return {
        project: prj,
        revenue: effectiveRevenue,
        cogs: effectiveCogs,
        grossProfit,
        netProfit,
        margin,
        transactionCount: matchingTrx.length,
        cashInCount: cashInTransactions.length,
        cashOutCount: cashOutTransactions.length,
        cashInAmount: directCashIn,
        cashOutAmount: directCashOut,
        transactions: matchingTrx
      };
    });
  }, [projects, accounts, transactions, startDate, endDate]);

  const totalBreakdownRevenue = useMemo(
    () => projectBreakdown.reduce((sum, p) => sum + p.revenue, 0),
    [projectBreakdown]
  );
  const totalBreakdownCogs = useMemo(
    () => projectBreakdown.reduce((sum, p) => sum + p.cogs, 0),
    [projectBreakdown]
  );
  const totalBreakdownGrossProfit = useMemo(
    () => projectBreakdown.reduce((sum, p) => sum + p.grossProfit, 0),
    [projectBreakdown]
  );
  const totalBreakdownNetProfit = useMemo(
    () => projectBreakdown.reduce((sum, p) => sum + p.netProfit, 0),
    [projectBreakdown]
  );
  const overallBreakdownMargin =
    totalBreakdownRevenue > 0 ? (totalBreakdownNetProfit / totalBreakdownRevenue) * 100 : 0;

  // Visual Chart State & Data (Recharts)
  const [chartFilter, setChartFilter] = useState<'ACTIVE_ONLY' | 'ALL'>('ACTIVE_ONLY');
  const [chartType, setChartType] = useState<'GROUPED' | 'STACKED'>('GROUPED');

  const chartData = useMemo(() => {
    const raw = projectBreakdown.map((item) => ({
      id: item.project.id,
      name: item.project.name,
      code: item.project.code || '',
      displayName:
        item.project.name.length > 20
          ? `${item.project.name.slice(0, 18)}...`
          : item.project.name,
      revenue: item.revenue,
      cogs: item.cogs,
      grossProfit: Math.max(0, item.grossProfit),
      margin: item.margin,
      hasActivity: item.revenue > 0 || item.cogs > 0 || item.transactionCount > 0
    }));

    if (chartFilter === 'ACTIVE_ONLY') {
      const active = raw.filter((d) => d.hasActivity);
      return active.length > 0 ? active : raw;
    }
    return raw;
  }, [projectBreakdown, chartFilter]);

  const activeProjectsCount = useMemo(() => {
    return projectBreakdown.filter(
      (p) => p.revenue > 0 || p.cogs > 0 || p.transactionCount > 0
    ).length;
  }, [projectBreakdown]);

  const formatCompactIDR = (val: number) => {
    if (Math.abs(val) >= 1_000_000_000) {
      return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
    }
    if (Math.abs(val) >= 1_000_000) {
      return `Rp ${(val / 1_000_000).toFixed(0)}Jt`;
    }
    if (Math.abs(val) >= 1_000) {
      return `Rp ${(val / 1_000).toFixed(0)}Rb`;
    }
    return `Rp ${val}`;
  };

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2.5 min-w-[240px]">
          <div className="border-b border-slate-800 pb-2">
            <div className="font-bold text-white text-sm">{data.name}</div>
            {data.code && (
              <div className="text-[10px] text-slate-400 font-mono">Kode Site: {data.code}</div>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-cyan-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block"></span>
                Pendapatan Kontrak:
              </span>
              <span className="font-mono font-bold">{formatCurrency(data.revenue)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
                Beban Langsung (HPP):
              </span>
              <span className="font-mono font-bold">{formatCurrency(data.cogs)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-200 border-t border-slate-800/80 pt-1.5">
              <span className="font-semibold">Laba Kotor:</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrency(data.grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Net Profit Margin:</span>
              <span className={`font-mono font-bold ${data.margin >= 20 ? 'text-emerald-400' : data.margin > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {data.margin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
                dateRangeType === 'MONTH' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setDateRangeType('YTD')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                dateRangeType === 'YTD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              YTD {selectedYear}
            </button>
            <button
              onClick={() => setDateRangeType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                dateRangeType === 'ALL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setDateRangeType('CUSTOM')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                dateRangeType === 'CUSTOM' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kustom
            </button>
          </div>

          {dateRangeType === 'MONTH' && (
            <div className="flex items-center space-x-1">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
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

      {/* VISUALIZATION SECTION: REVENUE VS HPP COMPARISON (RECHARTS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Visual Analytics
              </span>
              <span className="text-xs text-slate-400">Komparasi Performa Site Proyek</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Komparasi Pendapatan Kontrak vs Beban Langsung (HPP) per Proyek
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Grafik komparatif realisasi Pendapatan Kontrak (Uang Masuk) dan Beban Langsung HPP (Uang Keluar) per site proyek untuk analisa visual margin keuntungan.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setChartType('GROUPED')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  chartType === 'GROUPED'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setChartType('STACKED')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  chartType === 'STACKED'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Struktur Laba
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setChartFilter('ACTIVE_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  chartFilter === 'ACTIVE_ONLY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Site Aktif ({activeProjectsCount})
              </button>
              <button
                type="button"
                onClick={() => setChartFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  chartFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua Site ({projects.length})
              </button>
            </div>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Total Pendapatan Terpilih</div>
            <div className="text-sm sm:text-base font-bold text-cyan-400 font-mono mt-0.5">
              {formatCurrency(chartData.reduce((s, d) => s + d.revenue, 0))}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Total HPP Terpilih</div>
            <div className="text-sm sm:text-base font-bold text-rose-400 font-mono mt-0.5">
              {formatCurrency(chartData.reduce((s, d) => s + d.cogs, 0))}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Total Laba Kotor Terpilih</div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">
              {formatCurrency(chartData.reduce((s, d) => s + (d.revenue - d.cogs), 0))}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Rata-rata Margin Site</div>
            <div className="text-sm sm:text-base font-bold text-amber-400 font-mono mt-0.5">
              {(() => {
                const totRev = chartData.reduce((s, d) => s + d.revenue, 0);
                const totNet = chartData.reduce((s, d) => s + (d.revenue - d.cogs), 0);
                return totRev > 0 ? `${((totNet / totRev) * 100).toFixed(1)}%` : '0.0%';
              })()}
            </div>
          </div>
        </div>

        {/* Recharts BarChart */}
        <div className="w-full h-80 sm:h-96 pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Tidak ada data proyek untuk periode yang dipilih
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
                <XAxis
                  dataKey="displayName"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={formatCompactIDR}
                />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.25)' }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                />
                {chartType === 'GROUPED' ? (
                  <>
                    <Bar
                      dataKey="revenue"
                      name="Pendapatan Kontrak (Revenue)"
                      fill="#06b6d4"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="cogs"
                      name="Beban Langsung (HPP)"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="cogs"
                      name="Beban Langsung (HPP)"
                      stackId="profitStack"
                      fill="#f43f5e"
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="grossProfit"
                      name="Laba Kotor (Gross Profit)"
                      stackId="profitStack"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* PER-PROJECT PROFITABILITY BREAKDOWN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Analisa Profitabilitas Margin per Site Proyek
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Nilai Pendapatan Kontrak disinkronkan secara presisi dengan Nominal (Rp) pada Pencatatan Kas & Jurnal Umum / Transaksi Kas & Bank untuk masing-masing Cost Center (Lokasi).
            </p>
          </div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium self-start sm:self-auto">
            {periodTitle}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px] border-b border-slate-700">
                <th className="py-2.5 px-3">Nama Site Proyek</th>
                <th className="py-2.5 px-3">PIC Supervisor / Klien</th>
                <th className="py-2.5 px-3 text-right">Pendapatan Kontrak</th>
                <th className="py-2.5 px-3 text-right">Beban Langsung (HPP)</th>
                <th className="py-2.5 px-3 text-right">Laba Kotor</th>
                <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                <th className="py-2.5 px-3 text-center">Net Margin</th>
                <th className="py-2.5 px-2 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {projectBreakdown.map((item) => {
                const isExpanded = expandedProjectId === item.project.id;
                const hasTransactions = item.transactionCount > 0;

                return (
                  <React.Fragment key={item.project.id}>
                    <tr
                      onClick={() => hasTransactions && setExpandedProjectId(isExpanded ? null : item.project.id)}
                      className={`transition-colors ${
                        hasTransactions ? 'cursor-pointer hover:bg-slate-800/50' : 'hover:bg-slate-800/20'
                      } ${isExpanded ? 'bg-slate-800/60' : ''}`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{item.project.name}</span>
                          {item.project.code && (
                            <span className="text-[10px] px-1.5 py-0.2 font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {item.project.code}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {item.project.address || 'Alamat Belum Terdata'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div className="font-medium text-slate-200">
                          {item.project.siteSupervisor || item.project.clientName || '-'}
                        </div>
                        {item.project.clientName && item.project.siteSupervisor && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            Klien: {item.project.clientName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-cyan-300 font-bold font-mono">
                          {formatCurrency(item.revenue)}
                        </div>
                        {item.cashInCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-medium mt-0.5">
                            {item.cashInCount} Uang Masuk
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-rose-300 font-medium font-mono">
                          {formatCurrency(item.cogs)}
                        </div>
                        {item.cashOutCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-400 border border-rose-800/50 font-medium mt-0.5">
                            {item.cashOutCount} Uang Keluar
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-200 font-bold font-mono">
                        {formatCurrency(item.grossProfit)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400">
                        {formatCurrency(item.netProfit)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${
                            item.margin >= 20
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.margin >= 10
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.margin > 0
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {item.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400">
                        {hasTransactions ? (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-cyan-400 mx-auto" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 mx-auto" />
                          )
                        ) : null}
                      </td>
                    </tr>

                    {/* Expandable Detail View showing verified Kas & Bank transactions */}
                    {isExpanded && item.transactions && (
                      <tr className="bg-slate-950/70 border-y border-slate-800">
                        <td colSpan={8} className="p-3 pl-6">
                          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-800">
                              <span className="flex items-center gap-1.5 text-cyan-300 text-[11px] font-bold">
                                <span>Rincian Transaksi Kas & Jurnal Terpaut:</span>
                                <span className="text-white font-mono">{item.project.name}</span>
                              </span>
                              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">
                                  Pendapatan Kontrak (Uang Masuk): +{formatCurrency(item.cashInAmount)} ({item.cashInCount})
                                </span>
                                <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-medium">
                                  Beban Langsung HPP (Uang Keluar): -{formatCurrency(item.cashOutAmount)} ({item.cashOutCount})
                                </span>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] text-left">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[9px]">
                                    <th className="py-1 px-2">No. Voucher</th>
                                    <th className="py-1 px-2">Tanggal</th>
                                    <th className="py-1 px-2">Kategori / Akun COA</th>
                                    <th className="py-1 px-2">Keterangan / Uraian</th>
                                    <th className="py-1 px-2">Metode / Akun</th>
                                    <th className="py-1 px-2">No. Referensi / Inv</th>
                                    <th className="py-1 px-2 text-right">Nominal (Rp)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                                  {item.transactions.map((trx) => (
                                    <tr key={trx.id} className="hover:bg-slate-800/30">
                                      <td className="py-1.5 px-2 font-mono font-bold text-cyan-300">{trx.code}</td>
                                      <td className="py-1.5 px-2 font-mono text-slate-300">{trx.date}</td>
                                      <td className="py-1.5 px-2">
                                        {trx.type === 'IN' ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Uang Masuk (Pendapatan)
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                            Uang Keluar (HPP)
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-2 font-medium text-white">{trx.title}</td>
                                      <td className="py-1.5 px-2 text-slate-400">{trx.paymentMethod || trx.primaryAccountCode}</td>
                                      <td className="py-1.5 px-2 font-mono text-slate-400">{trx.referenceNumber || '-'}</td>
                                      <td className={`py-1.5 px-2 text-right font-mono font-bold ${trx.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {trx.type === 'IN' ? '+' : '-'}{formatCurrency(trx.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800/90 font-bold text-slate-200 border-t-2 border-slate-700">
                <td className="py-3 px-3 uppercase text-[11px] font-black text-white" colSpan={2}>
                  Total Konsolidasi Seluruh Site
                </td>
                <td className="py-3 px-3 text-right font-black font-mono text-cyan-300">
                  {formatCurrency(totalBreakdownRevenue)}
                </td>
                <td className="py-3 px-3 text-right font-black font-mono text-rose-300">
                  {formatCurrency(totalBreakdownCogs)}
                </td>
                <td className="py-3 px-3 text-right font-black font-mono text-slate-100">
                  {formatCurrency(totalBreakdownGrossProfit)}
                </td>
                <td className="py-3 px-3 text-right font-black font-mono text-emerald-400">
                  {formatCurrency(totalBreakdownNetProfit)}
                </td>
                <td className="py-3 px-3 text-center font-black">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {overallBreakdownMargin.toFixed(1)}%
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
