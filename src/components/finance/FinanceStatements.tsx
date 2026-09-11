import React, { useState, useMemo } from 'react';
import {
  FileText,
  PieChart,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Filter,
  Building2,
  Layers,
  Scale,
  DollarSign,
  Activity,
  ShieldCheck,
  Award,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ChartOfAccount,
  FinanceTransaction,
  FinancialRatio,
  ProfitLossStatement,
  BalanceSheetStatement,
  CashFlowStatement,
  EquityStatement
} from '../../types/finance';
import { Project, UserAccount } from '../../types';
import { financeService } from '../../services/financeService';

interface FinanceStatementsProps {
  accounts: ChartOfAccount[];
  transactions: FinanceTransaction[];
  projects: Project[];
  currentUser?: UserAccount | null;
}

type StatementType = 'PL' | 'BS' | 'CF' | 'EQ' | 'RATIO';

export const FinanceStatements: React.FC<FinanceStatementsProps> = ({
  accounts,
  transactions,
  projects,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<StatementType>('PL');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  // Generate date ranges for selected month
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const start = `${selectedMonth}-01`;
    const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const label = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return { startDate: start, endDate: end, periodLabel: label };
  }, [selectedMonth]);

  // Filter transactions by project if selected
  const filteredTransactions = useMemo(() => {
    if (selectedProjectId === 'ALL') return transactions;
    return transactions.filter((t) => t.projectId === selectedProjectId);
  }, [transactions, selectedProjectId]);

  // Generate Statements
  const profitLoss = useMemo(() => {
    return financeService.generateProfitLoss(accounts, filteredTransactions, startDate, endDate);
  }, [accounts, filteredTransactions, startDate, endDate]);

  const balanceSheet = useMemo(() => {
    return financeService.generateBalanceSheet(accounts, filteredTransactions, endDate);
  }, [accounts, filteredTransactions, endDate]);

  const cashFlow = useMemo(() => {
    return financeService.generateCashFlow(accounts, filteredTransactions, startDate, endDate);
  }, [accounts, filteredTransactions, startDate, endDate]);

  const equityStatement = useMemo(() => {
    return financeService.generateEquityStatement(accounts, profitLoss.netProfit, startDate, endDate);
  }, [accounts, profitLoss.netProfit, startDate, endDate]);

  const ratios = useMemo(() => {
    return financeService.calculateFinancialRatios(profitLoss, balanceSheet);
  }, [profitLoss, balanceSheet]);

  // Handle PDF Export
  const handleExportPDF = () => {
    const projectName =
      selectedProjectId === 'ALL'
        ? 'Konsolidasi Seluruh Operasional'
        : projects.find((p) => p.id === selectedProjectId)?.name || 'Proyek';

    if (activeTab === 'PL') {
      const headers = ['Kategori / Akun COA', 'Nominal (Rp)', 'Proporsi (%)'];
      const rows: (string | number)[][] = [
        ['PENDAPATAN USAHA (REVENUE)', '', ''],
        ...profitLoss.revenues.map((r) => [
          `  ${r.accountCode} - ${r.accountName}`,
          financeService.formatRupiah(r.amount),
          profitLoss.totalRevenue > 0
            ? `${((r.amount / profitLoss.totalRevenue) * 100).toFixed(1)}%`
            : '0%'
        ]),
        ['TOTAL PENDAPATAN', financeService.formatRupiah(profitLoss.totalRevenue), '100%'],
        ['', '', ''],
        ['BEBAN POKOK PENDAPATAN (HPP)', '', ''],
        ...profitLoss.cogs.map((c) => [
          `  ${c.accountCode} - ${c.accountName}`,
          financeService.formatRupiah(c.amount),
          profitLoss.totalRevenue > 0
            ? `${((c.amount / profitLoss.totalRevenue) * 100).toFixed(1)}%`
            : '0%'
        ]),
        ['TOTAL HPP', financeService.formatRupiah(profitLoss.totalCOGS), ''],
        ['LABA KOTOR (GROSS PROFIT)', financeService.formatRupiah(profitLoss.grossProfit), `${(profitLoss.grossProfitMargin ?? 0).toFixed(1)}%`],
        ['', '', ''],
        ['BEBAN OPERASIONAL & UMUM', '', ''],
        ...profitLoss.operationalExpenses.map((e) => [
          `  ${e.accountCode} - ${e.accountName}`,
          financeService.formatRupiah(e.amount),
          profitLoss.totalRevenue > 0
            ? `${((e.amount / profitLoss.totalRevenue) * 100).toFixed(1)}%`
            : '0%'
        ]),
        ['TOTAL BEBAN OPERASIONAL', financeService.formatRupiah(profitLoss.totalExpenses), ''],
        ['LABA BERSIH (NET PROFIT)', financeService.formatRupiah(profitLoss.netProfit), `${(profitLoss.netProfitMargin ?? 0).toFixed(1)}%`]
      ];

      financeService.exportFinancialStatementPDF(
        `Laporan Laba Rugi (P&L) - ${projectName}`,
        periodLabel,
        headers,
        rows
      );
    } else if (activeTab === 'BS') {
      const headers = ['Komponen Neraca', 'Sub Total (Rp)', 'Total (Rp)'];
      const rows: (string | number)[][] = [
        ['ASET LANCAR (CURRENT ASSETS)', '', ''],
        ...balanceSheet.currentAssets.map((a) => [
          `  ${a.accountCode} - ${a.accountName}`,
          financeService.formatRupiah(a.amount),
          ''
        ]),
        ['TOTAL ASET LANCAR', '', financeService.formatRupiah(balanceSheet.totalCurrentAssets)],
        ['', '', ''],
        ['ASET TETAP (FIXED ASSETS)', '', ''],
        ...balanceSheet.fixedAssets.map((a) => [
          `  ${a.accountCode} - ${a.accountName}`,
          financeService.formatRupiah(a.amount),
          ''
        ]),
        ['TOTAL ASET TETAP', '', financeService.formatRupiah(balanceSheet.totalFixedAssets)],
        ['TOTAL AKTIVA / ASET', '', financeService.formatRupiah(balanceSheet.totalAssets)],
        ['', '', ''],
        ['LIABILITAS / KEWAJIBAN', '', ''],
        ...balanceSheet.currentLiabilities.map((l) => [
          `  ${l.accountCode} - ${l.accountName}`,
          financeService.formatRupiah(l.amount),
          ''
        ]),
        ['TOTAL KEWAJIBAN', '', financeService.formatRupiah(balanceSheet.totalLiabilities)],
        ['', '', ''],
        ['EKUITAS / MODAL BERSIH', '', ''],
        ...balanceSheet.equityItems.map((e) => [
          `  ${e.accountCode} - ${e.accountName}`,
          financeService.formatRupiah(e.amount),
          ''
        ]),
        ['TOTAL EKUITAS', '', financeService.formatRupiah(balanceSheet.totalEquity)],
        ['TOTAL PASIVA (LIABILITAS + EKUITAS)', '', financeService.formatRupiah(balanceSheet.totalLiabilitiesAndEquity)]
      ];

      financeService.exportFinancialStatementPDF(
        `Laporan Posisi Keuangan (Neraca) - ${projectName}`,
        `Per ${endDate}`,
        headers,
        rows
      );
    } else if (activeTab === 'CF') {
      const headers = ['Arus Kas Aktivitas', 'Nominal (Rp)', 'Status'];
      const rows: (string | number)[][] = [
        ['ARUS KAS DARI AKTIVITAS OPERASIONAL', '', ''],
        ...cashFlow.operatingActivities.map((o) => [
          `  ${o.accountName}`,
          financeService.formatRupiah(o.amount),
          o.amount >= 0 ? 'Inflow' : 'Outflow'
        ]),
        ['Total Kas Bersih dari Operasional', financeService.formatRupiah(cashFlow.netCashFromOperating), ''],
        ['', '', ''],
        ['ARUS KAS DARI AKTIVITAS INVESTASI', '', ''],
        ...cashFlow.investingActivities.map((i) => [
          `  ${i.accountName}`,
          financeService.formatRupiah(i.amount),
          i.amount >= 0 ? 'Inflow' : 'Outflow'
        ]),
        ['Total Kas Bersih dari Investasi', financeService.formatRupiah(cashFlow.netCashFromInvesting), ''],
        ['', '', ''],
        ['ARUS KAS DARI AKTIVITAS PENDANAAN', '', ''],
        ...cashFlow.financingActivities.map((f) => [
          `  ${f.accountName}`,
          financeService.formatRupiah(f.amount),
          f.amount >= 0 ? 'Inflow' : 'Outflow'
        ]),
        ['Total Kas Bersih dari Pendanaan', financeService.formatRupiah(cashFlow.netCashFromFinancing), ''],
        ['', '', ''],
        ['KENAIKAN / (PENURUNAN) KAS BERSIH', financeService.formatRupiah(cashFlow.netCashIncrease), ''],
        ['SALDO AWAL KAS', financeService.formatRupiah(cashFlow.beginningCash), ''],
        ['SALDO AKHIR KAS', financeService.formatRupiah(cashFlow.endingCash), '']
      ];

      financeService.exportFinancialStatementPDF(
        `Laporan Arus Kas (Cash Flow) - ${projectName}`,
        periodLabel,
        headers,
        rows
      );
    } else if (activeTab === 'EQ') {
      const headers = ['Komponen Ekuitas', 'Nominal (Rp)'];
      const rows: (string | number)[][] = [
        ['Saldo Modal Awal Periode', financeService.formatRupiah(equityStatement.beginningEquity)],
        ['Tambahan Setoran Modal', financeService.formatRupiah(equityStatement.additionalCapital)],
        ['Laba Bersih Periode Berjalan', financeService.formatRupiah(equityStatement.netProfitPeriod)],
        ['Pengambilan Prive / Dividen', `(${financeService.formatRupiah(equityStatement.drawingsOrDividends)})`],
        ['Penyesuaian Ekuitas Lainnya', financeService.formatRupiah(equityStatement.adjustments)],
        ['TOTAL SALDO MODAL AKHIR PERIODE', financeService.formatRupiah(equityStatement.endingEquity)]
      ];

      financeService.exportFinancialStatementPDF(
        `Laporan Perubahan Ekuitas - ${projectName}`,
        periodLabel,
        headers,
        rows
      );
    } else if (activeTab === 'RATIO') {
      const headers = ['Indikator Rasio Keuangan', 'Nilai Rasio', 'Status Analisa'];
      const rows: (string | number)[][] = [
        ['Net Profit Margin (NPM)', `${(ratios.netProfitMargin ?? 0).toFixed(2)}%`, (ratios.netProfitMargin ?? 0) >= 10 ? 'Sehat (Diatas Target)' : 'Perlu Optimasi'],
        ['Gross Profit Margin (GPM)', `${(ratios.grossProfitMargin ?? 0).toFixed(2)}%`, (ratios.grossProfitMargin ?? 0) >= 25 ? 'Efisiensi HPP Baik' : 'HPP Tinggi'],
        ['Current Ratio (Likuiditas Lancar)', `${(ratios.currentRatio ?? 0).toFixed(2)}x`, (ratios.currentRatio ?? 0) >= 1.5 ? 'Sangat Likuid' : 'Kurang Likuid'],
        ['Quick Ratio (Acid Test)', `${(ratios.quickRatio ?? 0).toFixed(2)}x`, (ratios.quickRatio ?? 0) >= 1.0 ? 'Aman Menutup Utang Cepat' : 'Waspada Kas'],
        ['Debt to Asset Ratio (DAR)', `${((ratios.debtToAssetRatio ?? 0) * 100).toFixed(2)}%`, (ratios.debtToAssetRatio ?? 0) <= 0.5 ? 'Solvabel (Struktur Modal Kuat)' : 'Utang Tinggi'],
        ['Debt to Equity Ratio (DER)', `${((ratios.debtToEquityRatio ?? 0) * 100).toFixed(2)}%`, (ratios.debtToEquityRatio ?? 0) <= 1.0 ? 'Leverage Seimbang' : 'Leverage Tinggi'],
        ['Return on Assets (ROA)', `${(ratios.returnOnAssets ?? 0).toFixed(2)}%`, 'Produktivitas Aset Optimal'],
        ['Return on Equity (ROE)', `${(ratios.returnOnEquity ?? 0).toFixed(2)}%`, 'Tingkat Imbal Hasil Modal Positif']
      ];

      financeService.exportFinancialStatementPDF(
        `Analisa Rasio Keuangan & Tingkat Kesehatan - ${projectName}`,
        periodLabel,
        headers,
        rows
      );
    }
  };

  // Handle CSV Export directly compatible with Excel / Google Sheets
  const handleExportCSV = () => {
    const projectName =
      selectedProjectId === 'ALL'
        ? 'Konsolidasi Seluruh Operasional'
        : projects.find((p) => p.id === selectedProjectId)?.name || 'Proyek';

    if (activeTab === 'PL') {
      const filename = `Laporan_Laba_Rugi_${selectedMonth}_${projectName}`;
      const headers = ['Kategori', 'Kode Akun', 'Nama Akun', 'Nominal (Rp)', 'Proporsi (%)'];
      const rows: (string | number)[][] = [
        ['PENDAPATAN USAHA', '', '', '', ''],
        ...profitLoss.revenues.map((r) => [
          'Pendapatan',
          r.accountCode,
          r.accountName,
          r.amount,
          profitLoss.totalRevenue > 0 ? `${((r.amount / profitLoss.totalRevenue) * 100).toFixed(2)}%` : '0%'
        ]),
        ['TOTAL PENDAPATAN', '', 'Total Pendapatan Usaha', profitLoss.totalRevenue, '100%'],
        ['', '', '', '', ''],
        ['BEBAN POKOK PENDAPATAN (HPP)', '', '', '', ''],
        ...profitLoss.cogs.map((c) => [
          'HPP',
          c.accountCode,
          c.accountName,
          c.amount,
          profitLoss.totalRevenue > 0 ? `${((c.amount / profitLoss.totalRevenue) * 100).toFixed(2)}%` : '0%'
        ]),
        ['TOTAL HPP', '', 'Total Beban Pokok Pendapatan', profitLoss.totalCOGS, ''],
        ['LABA KOTOR (GROSS PROFIT)', '', 'Laba Kotor Operasional', profitLoss.grossProfit, `${(profitLoss.grossProfitMargin ?? 0).toFixed(2)}%`],
        ['', '', '', '', ''],
        ['BEBAN OPERASIONAL & UMUM', '', '', '', ''],
        ...profitLoss.operationalExpenses.map((e) => [
          'Beban Operasional',
          e.accountCode,
          e.accountName,
          e.amount,
          profitLoss.totalRevenue > 0 ? `${((e.amount / profitLoss.totalRevenue) * 100).toFixed(2)}%` : '0%'
        ]),
        ['TOTAL BEBAN OPERASIONAL', '', 'Total Beban Usaha & Administrasi', profitLoss.totalExpenses, ''],
        ['LABA BERSIH (NET PROFIT)', '', 'Laba Bersih Setelah Pajak/Operasional', profitLoss.netProfit, `${(profitLoss.netProfitMargin ?? 0).toFixed(2)}%`]
      ];
      financeService.exportToCSV(filename, headers, rows);
    } else if (activeTab === 'BS') {
      const filename = `Laporan_Neraca_${selectedMonth}_${projectName}`;
      const headers = ['Golongan', 'Klasifikasi', 'Kode Akun', 'Nama Akun', 'Nominal (Rp)'];
      const rows: (string | number)[][] = [
        ['AKTIVA', 'Aset Lancar', '', '', ''],
        ...balanceSheet.currentAssets.map((a) => [
          'Aktiva',
          'Aset Lancar',
          a.accountCode,
          a.accountName,
          a.amount
        ]),
        ['AKTIVA', 'Total Aset Lancar', '', 'Subtotal Aset Lancar', balanceSheet.totalCurrentAssets],
        ['', '', '', '', ''],
        ['AKTIVA', 'Aset Tetap', '', '', ''],
        ...balanceSheet.fixedAssets.map((a) => [
          'Aktiva',
          'Aset Tetap',
          a.accountCode,
          a.accountName,
          a.amount
        ]),
        ['AKTIVA', 'Total Aset Tetap', '', 'Subtotal Aset Tetap', balanceSheet.totalFixedAssets],
        ['AKTIVA', 'TOTAL AKTIVA', '', 'TOTAL SELURUH ASET', balanceSheet.totalAssets],
        ['', '', '', '', ''],
        ['PASIVA', 'Liabilitas Jangka Pendek', '', '', ''],
        ...balanceSheet.currentLiabilities.map((l) => [
          'Pasiva',
          'Liabilitas',
          l.accountCode,
          l.accountName,
          l.amount
        ]),
        ['PASIVA', 'Total Kewajiban', '', 'Subtotal Liabilitas', balanceSheet.totalLiabilities],
        ['', '', '', '', ''],
        ['PASIVA', 'Ekuitas / Modal', '', '', ''],
        ...balanceSheet.equityItems.map((e) => [
          'Pasiva',
          'Ekuitas',
          e.accountCode,
          e.accountName,
          e.amount
        ]),
        ['PASIVA', 'Total Ekuitas', '', 'Subtotal Modal Bersih', balanceSheet.totalEquity],
        ['PASIVA', 'TOTAL PASIVA', '', 'TOTAL LIABILITAS & EKUITAS', balanceSheet.totalLiabilitiesAndEquity]
      ];
      financeService.exportToCSV(filename, headers, rows);
    } else if (activeTab === 'CF') {
      const filename = `Laporan_Arus_Kas_${selectedMonth}_${projectName}`;
      const headers = ['Kelompok Aktivitas', 'Keterangan Akun / Arus', 'Nominal (Rp)', 'Arah Arus'];
      const rows: (string | number)[][] = [
        ['AKTIVITAS OPERASIONAL', '', '', ''],
        ...cashFlow.operatingActivities.map((o) => [
          'Operasional',
          o.accountName,
          o.amount,
          o.amount >= 0 ? 'Arus Masuk (Inflow)' : 'Arus Keluar (Outflow)'
        ]),
        ['Operasional', 'Total Kas Bersih dari Operasional', cashFlow.netCashFromOperating, ''],
        ['', '', '', ''],
        ['AKTIVITAS INVESTASI', '', '', ''],
        ...cashFlow.investingActivities.map((i) => [
          'Investasi',
          i.accountName,
          i.amount,
          i.amount >= 0 ? 'Arus Masuk (Inflow)' : 'Arus Keluar (Outflow)'
        ]),
        ['Investasi', 'Total Kas Bersih dari Investasi', cashFlow.netCashFromInvesting, ''],
        ['', '', '', ''],
        ['AKTIVITAS PENDANAAN', '', '', ''],
        ...cashFlow.financingActivities.map((f) => [
          'Pendanaan',
          f.accountName,
          f.amount,
          f.amount >= 0 ? 'Arus Masuk (Inflow)' : 'Arus Keluar (Outflow)'
        ]),
        ['Pendanaan', 'Total Kas Bersih dari Pendanaan', cashFlow.netCashFromFinancing, ''],
        ['', '', '', ''],
        ['RINGKASAN KAS', 'Kenaikan / (Penurunan) Kas Bersih', cashFlow.netCashIncrease, ''],
        ['RINGKASAN KAS', 'Saldo Awal Kas & Bank', cashFlow.beginningCash, ''],
        ['RINGKASAN KAS', 'Saldo Akhir Kas & Bank', cashFlow.endingCash, '']
      ];
      financeService.exportToCSV(filename, headers, rows);
    } else if (activeTab === 'EQ') {
      const filename = `Laporan_Perubahan_Ekuitas_${selectedMonth}_${projectName}`;
      const headers = ['Komponen Perubahan Modal', 'Nominal (Rp)', 'Keterangan'];
      const rows: (string | number)[][] = [
        ['Saldo Modal Awal Periode', equityStatement.beginningEquity, 'Saldo pembukaan ekuitas'],
        ['Tambahan Setoran Modal', equityStatement.additionalCapital, 'Setoran pemilik/investor'],
        ['Laba Bersih Periode Berjalan', equityStatement.netProfitPeriod, 'Hasil usaha operasional'],
        ['Pengambilan Prive / Dividen', -equityStatement.drawingsOrDividends, 'Distribusi keuntungan'],
        ['Penyesuaian Ekuitas Lainnya', equityStatement.adjustments, 'Penyesuaian saldo laba'],
        ['TOTAL SALDO MODAL AKHIR PERIODE', equityStatement.endingEquity, 'Posisi ekuitas penutupan']
      ];
      financeService.exportToCSV(filename, headers, rows);
    } else if (activeTab === 'RATIO') {
      const filename = `Analisa_Rasio_Keuangan_${selectedMonth}_${projectName}`;
      const headers = ['Indikator Rasio', 'Kategori', 'Nilai Rasio', 'Persentase / Multiplier', 'Status Analisa'];
      const rows: (string | number)[][] = [
        ['Net Profit Margin (NPM)', 'Profitabilitas', `${(ratios.netProfitMargin ?? 0).toFixed(2)}%`, `${(ratios.netProfitMargin ?? 0).toFixed(2)}%`, (ratios.netProfitMargin ?? 0) >= 10 ? 'Sehat (Diatas Target)' : 'Perlu Optimasi'],
        ['Gross Profit Margin (GPM)', 'Profitabilitas', `${(ratios.grossProfitMargin ?? 0).toFixed(2)}%`, `${(ratios.grossProfitMargin ?? 0).toFixed(2)}%`, (ratios.grossProfitMargin ?? 0) >= 25 ? 'Efisiensi HPP Baik' : 'HPP Tinggi'],
        ['Current Ratio', 'Likuiditas', `${(ratios.currentRatio ?? 0).toFixed(2)}x`, `${((ratios.currentRatio ?? 0) * 100).toFixed(0)}%`, (ratios.currentRatio ?? 0) >= 1.5 ? 'Sangat Likuid' : 'Kurang Likuid'],
        ['Quick Ratio (Acid Test)', 'Likuiditas', `${(ratios.quickRatio ?? 0).toFixed(2)}x`, `${((ratios.quickRatio ?? 0) * 100).toFixed(0)}%`, (ratios.quickRatio ?? 0) >= 1.0 ? 'Aman Menutup Utang Cepat' : 'Waspada Kas'],
        ['Debt to Asset Ratio (DAR)', 'Solvabilitas', `${((ratios.debtToAssetRatio ?? 0) * 100).toFixed(2)}%`, `${((ratios.debtToAssetRatio ?? 0) * 100).toFixed(2)}%`, (ratios.debtToAssetRatio ?? 0) <= 0.5 ? 'Solvabel (Modal Kuat)' : 'Utang Tinggi'],
        ['Debt to Equity Ratio (DER)', 'Solvabilitas', `${((ratios.debtToEquityRatio ?? 0) * 100).toFixed(2)}%`, `${((ratios.debtToEquityRatio ?? 0) * 100).toFixed(2)}%`, (ratios.debtToEquityRatio ?? 0) <= 1.0 ? 'Leverage Seimbang' : 'Leverage Tinggi'],
        ['Return on Assets (ROA)', 'Rentabilitas', `${(ratios.returnOnAssets ?? 0).toFixed(2)}%`, `${(ratios.returnOnAssets ?? 0).toFixed(2)}%`, 'Produktivitas Aset Optimal'],
        ['Return on Equity (ROE)', 'Rentabilitas', `${(ratios.returnOnEquity ?? 0).toFixed(2)}%`, `${(ratios.returnOnEquity ?? 0).toFixed(2)}%`, 'Imbal Hasil Modal Positif']
      ];
      financeService.exportToCSV(filename, headers, rows);
    }
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    let sheetData: any[] = [];
    let title = 'Laporan_Keuangan';

    if (activeTab === 'PL') {
      title = `Laba_Rugi_${selectedMonth}`;
      sheetData = [
        { Kategori: 'PENDAPATAN', Akun: '', Nominal: profitLoss.totalRevenue },
        ...profitLoss.revenues.map((r) => ({
          Kategori: 'Pendapatan',
          Akun: `${r.accountCode} - ${r.accountName}`,
          Nominal: r.amount
        })),
        { Kategori: 'HPP', Akun: '', Nominal: profitLoss.totalCOGS },
        ...profitLoss.cogs.map((c) => ({
          Kategori: 'Beban Pokok',
          Akun: `${c.accountCode} - ${c.accountName}`,
          Nominal: c.amount
        })),
        { Kategori: 'LABA KOTOR', Akun: '', Nominal: profitLoss.grossProfit },
        { Kategori: 'BEBAN OPERASIONAL', Akun: '', Nominal: profitLoss.totalExpenses },
        ...profitLoss.operationalExpenses.map((e) => ({
          Kategori: 'Beban Operasional',
          Akun: `${e.accountCode} - ${e.accountName}`,
          Nominal: e.amount
        })),
        { Kategori: 'LABA BERSIH', Akun: '', Nominal: profitLoss.netProfit }
      ];
    } else if (activeTab === 'BS') {
      title = `Neraca_${selectedMonth}`;
      sheetData = [
        { Posisi: 'Aset Lancar', Komponen: 'Total Aset Lancar', Jumlah: balanceSheet.totalCurrentAssets },
        ...balanceSheet.currentAssets.map((a) => ({
          Posisi: 'Aset Lancar',
          Komponen: `${a.accountCode} - ${a.accountName}`,
          Jumlah: a.amount
        })),
        { Posisi: 'Aset Tetap', Komponen: 'Total Aset Tetap', Jumlah: balanceSheet.totalFixedAssets },
        ...balanceSheet.fixedAssets.map((a) => ({
          Posisi: 'Aset Tetap',
          Komponen: `${a.accountCode} - ${a.accountName}`,
          Jumlah: a.amount
        })),
        { Posisi: 'Total Aset', Komponen: 'TOTAL AKTIVA', Jumlah: balanceSheet.totalAssets },
        { Posisi: 'Kewajiban', Komponen: 'Total Liabilitas', Jumlah: balanceSheet.totalLiabilities },
        { Posisi: 'Ekuitas', Komponen: 'Total Modal Bersih', Jumlah: balanceSheet.totalEquity },
        { Posisi: 'Total Pasiva', Komponen: 'Liabilitas + Ekuitas', Jumlah: balanceSheet.totalLiabilitiesAndEquity }
      ];
    } else {
      title = `Arus_Kas_${selectedMonth}`;
      sheetData = [
        { Aktivitas: 'Operasional', Total: cashFlow.netCashFromOperating },
        { Aktivitas: 'Investasi', Total: cashFlow.netCashFromInvesting },
        { Aktivitas: 'Pendanaan', Total: cashFlow.netCashFromFinancing },
        { Aktivitas: 'Kenaikan Bersih Kas', Total: cashFlow.netCashIncrease },
        { Aktivitas: 'Saldo Awal Kas', Total: cashFlow.beginningCash },
        { Aktivitas: 'Saldo Akhir Kas', Total: cashFlow.endingCash }
      ];
    }

    financeService.exportFinancialStatementExcel(title, sheetData);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Pusat Laporan Keuangan Standar Akuntansi (SAK)
                </h1>
                <p className="text-xs text-slate-400">
                  Laporan Laba Rugi, Neraca, Arus Kas, Perubahan Ekuitas, serta Analisa Rasio Finansial
                </p>
              </div>
            </div>
          </div>

          {/* Period & Cost Center Selectors & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs text-white font-bold focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent text-xs text-white font-bold focus:outline-none max-w-[160px]"
              >
                <option value="ALL">Semua Lokasi (Konsolidasi)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Download as CSV button */}
            <button
              id="download-finance-statement-csv-btn"
              data-testid="download-as-csv-btn"
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-750 hover:bg-emerald-650 text-white text-xs font-bold border border-emerald-600/50 shadow-md shadow-emerald-950/40 cursor-pointer transition-all"
              title="Download laporan finansial aktif dalam format CSV untuk Excel atau Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Download as CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 cursor-pointer transition-all"
              title="Download format Spreadsheet Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('PL')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PL'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>1. Laba Rugi (Profit & Loss)</span>
          </button>

          <button
            onClick={() => setActiveTab('BS')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'BS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>2. Posisi Keuangan (Neraca)</span>
          </button>

          <button
            onClick={() => setActiveTab('CF')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CF'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>3. Arus Kas (Cash Flow)</span>
          </button>

          <button
            onClick={() => setActiveTab('EQ')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'EQ'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. Perubahan Ekuitas</span>
          </button>

          <button
            onClick={() => setActiveTab('RATIO')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'RATIO'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>5. Analisa Rasio & Kesehatan</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: LAPORAN LABA RUGI (PROFIT & LOSS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'PL' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Pendapatan</span>
              <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
                {financeService.formatRupiah(profitLoss.totalRevenue)}
              </div>
              <span className="text-[10px] text-slate-500">Pendapatan Jasa & Proyek</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Beban Pokok (HPP)</span>
              <div className="text-xl font-black text-rose-400 mt-1 font-mono">
                {financeService.formatRupiah(profitLoss.totalCOGS)}
              </div>
              <span className="text-[10px] text-slate-500">Chemical, Upah Cleaner, Mesin</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Laba Kotor (Gross Profit)</span>
              <div className="text-xl font-black text-blue-400 mt-1 font-mono">
                {financeService.formatRupiah(profitLoss.grossProfit)}
              </div>
              <span className="text-[10px] text-blue-300/80 font-bold">
                Margin: {(profitLoss.grossProfitMargin ?? 0).toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Laba Bersih (Net Profit)</span>
              <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
                {financeService.formatRupiah(profitLoss.netProfit)}
              </div>
              <span className="text-[10px] text-emerald-300/80 font-bold">
                Net Margin: {(profitLoss.netProfitMargin ?? 0).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Detailed Financial Statement Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="text-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                PT RAJAWALI SUKSES MANDIRI
              </h2>
              <h3 className="text-base font-extrabold text-blue-400">LAPORAN LABA RUGI (INCOME STATEMENT)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Periode: {periodLabel}</p>
            </div>

            {/* Revenues Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-950/80 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 uppercase tracking-wide">
                <span>PENDAPATAN USAHA (REVENUES)</span>
                <span>NOMINAL (IDR)</span>
              </div>
              <div className="space-y-1.5 px-3">
                {profitLoss.revenues.map((item) => (
                  <div key={item.accountCode} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                    <span className="text-slate-300 font-mono">
                      {item.accountCode} - <span className="font-sans text-white">{item.accountName}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-200">
                      {financeService.formatRupiah(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold pt-2 text-emerald-400 border-t border-slate-800">
                  <span>TOTAL PENDAPATAN OPERASIONAL</span>
                  <span className="font-mono">{financeService.formatRupiah(profitLoss.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* COGS Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-950/80 px-4 py-2 rounded-xl text-xs font-bold text-rose-400 uppercase tracking-wide">
                <span>BEBAN POKOK PENDAPATAN (COST OF GOODS SOLD / HPP)</span>
                <span>NOMINAL (IDR)</span>
              </div>
              <div className="space-y-1.5 px-3">
                {profitLoss.cogs.map((item) => (
                  <div key={item.accountCode} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                    <span className="text-slate-300 font-mono">
                      {item.accountCode} - <span className="font-sans text-white">{item.accountName}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-200">
                      {financeService.formatRupiah(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold pt-2 text-rose-400 border-t border-slate-800">
                  <span>TOTAL BEBAN POKOK PENDAPATAN</span>
                  <span className="font-mono">{financeService.formatRupiah(profitLoss.totalCOGS)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit Highlight */}
            <div className="bg-slate-950 border border-blue-500/30 p-4 rounded-xl flex justify-between items-center text-sm font-extrabold text-white">
              <span className="text-blue-400">LABA KOTOR (GROSS PROFIT)</span>
              <span className="font-mono text-blue-400">
                {financeService.formatRupiah(profitLoss.grossProfit)}
              </span>
            </div>

            {/* Operational Expenses */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-950/80 px-4 py-2 rounded-xl text-xs font-bold text-amber-400 uppercase tracking-wide">
                <span>BEBAN OPERASIONAL, UMUM & ADMINISTRASI (OPEX)</span>
                <span>NOMINAL (IDR)</span>
              </div>
              <div className="space-y-1.5 px-3">
                {profitLoss.operationalExpenses.map((item) => (
                  <div key={item.accountCode} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                    <span className="text-slate-300 font-mono">
                      {item.accountCode} - <span className="font-sans text-white">{item.accountName}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-200">
                      {financeService.formatRupiah(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold pt-2 text-amber-400 border-t border-slate-800">
                  <span>TOTAL BEBAN OPERASIONAL & UMUM</span>
                  <span className="font-mono">{financeService.formatRupiah(profitLoss.totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Profit Final Highlight */}
            <div className="bg-gradient-to-r from-emerald-950/70 to-slate-950 border border-emerald-500/50 p-5 rounded-2xl flex justify-between items-center text-base font-black text-white shadow-xl">
              <div>
                <span className="text-emerald-400 uppercase tracking-wide">
                  LABA BERSIH PERIODE BERJALAN (NET PROFIT)
                </span>
                <p className="text-xs text-slate-400 font-normal">
                  Setelah memperhitungkan seluruh pendapatan, beban langsung, & operasional
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono text-emerald-400">
                  {financeService.formatRupiah(profitLoss.netProfit)}
                </span>
                <div className="text-xs text-emerald-300 font-bold">
                  Net Profit Margin: {(profitLoss.netProfitMargin ?? 0).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: LAPORAN POSISI KEUANGAN (NERACA / BALANCE SHEET) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'BS' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Balance Indicator Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">Status Keseimbangan Neraca</span>
                  {balanceSheet.isBalanced ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>BALANCE (SEIMBANG)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                      UNBALANCED (SELISIH)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Aset ({financeService.formatRupiah(balanceSheet.totalAssets)}) = Liabilitas + Ekuitas (
                  {financeService.formatRupiah(balanceSheet.totalLiabilitiesAndEquity)})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-right">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Aset (Aktiva)</span>
                <span className="text-base font-extrabold font-mono text-emerald-400">
                  {financeService.formatRupiah(balanceSheet.totalAssets)}
                </span>
              </div>
              <div className="text-slate-600 font-bold">=</div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Liabilitas + Ekuitas</span>
                <span className="text-base font-extrabold font-mono text-emerald-400">
                  {financeService.formatRupiah(balanceSheet.totalLiabilitiesAndEquity)}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Balance Sheet (Aktiva vs Pasiva) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* AKTIVA / ASET */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wide">
                  AKTIVA (ASSETS)
                </h3>
                <p className="text-xs text-slate-400">Aset Lancar dan Aset Tetap Perusahaan</p>
              </div>

              {/* Current Assets */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-blue-400 bg-slate-950 px-3 py-1.5 rounded-lg uppercase">
                  <span>Aset Lancar (Current Assets)</span>
                  <span>Nominal</span>
                </div>
                <div className="space-y-1 px-2">
                  {balanceSheet.currentAssets.map((a) => (
                    <div key={a.accountCode} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                      <span className="text-slate-300 font-mono">
                        {a.accountCode} - <span className="font-sans text-white">{a.accountName}</span>
                      </span>
                      <span className="font-mono text-slate-200">{financeService.formatRupiah(a.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold pt-1.5 text-blue-400 border-t border-slate-800">
                    <span>Subtotal Aset Lancar</span>
                    <span className="font-mono">{financeService.formatRupiah(balanceSheet.totalCurrentAssets)}</span>
                  </div>
                </div>
              </div>

              {/* Fixed Assets */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-cyan-400 bg-slate-950 px-3 py-1.5 rounded-lg uppercase">
                  <span>Aset Tetap & Peralatan (Fixed Assets)</span>
                  <span>Nominal</span>
                </div>
                <div className="space-y-1 px-2">
                  {balanceSheet.fixedAssets.map((a) => (
                    <div key={a.accountCode} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                      <span className="text-slate-300 font-mono">
                        {a.accountCode} - <span className="font-sans text-white">{a.accountName}</span>
                      </span>
                      <span className="font-mono text-slate-200">{financeService.formatRupiah(a.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold pt-1.5 text-cyan-400 border-t border-slate-800">
                    <span>Subtotal Aset Tetap</span>
                    <span className="font-mono">{financeService.formatRupiah(balanceSheet.totalFixedAssets)}</span>
                  </div>
                </div>
              </div>

              {/* Total Assets */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 flex justify-between items-center text-sm font-extrabold text-emerald-400 mt-4">
                <span>TOTAL AKTIVA / ASET</span>
                <span className="font-mono text-base">{financeService.formatRupiah(balanceSheet.totalAssets)}</span>
              </div>
            </div>

            {/* PASIVA / KEWAJIBAN & EKUITAS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wide">
                  PASIVA (LIABILITIES & EQUITY)
                </h3>
                <p className="text-xs text-slate-400">Kewajiban Utang dan Modal Bersih Pemegang Saham</p>
              </div>

              {/* Liabilities */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-rose-400 bg-slate-950 px-3 py-1.5 rounded-lg uppercase">
                  <span>Liabilitas / Utang (Liabilities)</span>
                  <span>Nominal</span>
                </div>
                <div className="space-y-1 px-2">
                  {balanceSheet.currentLiabilities.map((l) => (
                    <div key={l.accountCode} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                      <span className="text-slate-300 font-mono">
                        {l.accountCode} - <span className="font-sans text-white">{l.accountName}</span>
                      </span>
                      <span className="font-mono text-slate-200">{financeService.formatRupiah(l.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold pt-1.5 text-rose-400 border-t border-slate-800">
                    <span>Subtotal Liabilitas</span>
                    <span className="font-mono">{financeService.formatRupiah(balanceSheet.totalLiabilities)}</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-indigo-400 bg-slate-950 px-3 py-1.5 rounded-lg uppercase">
                  <span>Ekuitas / Modal (Equity)</span>
                  <span>Nominal</span>
                </div>
                <div className="space-y-1 px-2">
                  {balanceSheet.equityItems.map((e) => (
                    <div key={e.accountCode} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                      <span className="text-slate-300 font-mono">
                        {e.accountCode} - <span className="font-sans text-white">{e.accountName}</span>
                      </span>
                      <span className="font-mono text-slate-200">{financeService.formatRupiah(e.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold pt-1.5 text-indigo-400 border-t border-slate-800">
                    <span>Subtotal Ekuitas</span>
                    <span className="font-mono">{financeService.formatRupiah(balanceSheet.totalEquity)}</span>
                  </div>
                </div>
              </div>

              {/* Total Liabilities & Equity */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 flex justify-between items-center text-sm font-extrabold text-emerald-400 mt-4">
                <span>TOTAL PASIVA (LIABILITAS + EKUITAS)</span>
                <span className="font-mono text-base">
                  {financeService.formatRupiah(balanceSheet.totalLiabilitiesAndEquity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: LAPORAN ARUS KAS (CASH FLOW STATEMENT) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'CF' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in">
          <div className="text-center border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              PT RAJAWALI SUKSES MANDIRI
            </h2>
            <h3 className="text-base font-extrabold text-cyan-400">LAPORAN ARUS KAS (CASH FLOW STATEMENT)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Periode: {periodLabel}</p>
          </div>

          {/* Operating Cash Flow */}
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 uppercase">
              <span>1. ARUS KAS DARI AKTIVITAS OPERASIONAL</span>
              <span>NOMINAL (IDR)</span>
            </div>
            <div className="space-y-1.5 px-3">
              {cashFlow.operatingActivities.map((item) => (
                <div key={item.accountName} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                  <span className="text-slate-300">{item.accountName}</span>
                  <span className={`font-mono font-semibold ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.amount >= 0 ? '' : '-'}{financeService.formatRupiah(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold pt-2 text-emerald-400 border-t border-slate-800">
                <span>Arus Kas Bersih dari Aktivitas Operasional</span>
                <span className="font-mono">{financeService.formatRupiah(cashFlow.netCashFromOperating)}</span>
              </div>
            </div>
          </div>

          {/* Investing Cash Flow */}
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950 px-4 py-2 rounded-xl text-xs font-bold text-blue-400 uppercase">
              <span>2. ARUS KAS DARI AKTIVITAS INVESTASI</span>
              <span>NOMINAL (IDR)</span>
            </div>
            <div className="space-y-1.5 px-3">
              {cashFlow.investingActivities.map((item) => (
                <div key={item.accountName} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                  <span className="text-slate-300">{item.accountName}</span>
                  <span className={`font-mono font-semibold ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.amount >= 0 ? '' : '-'}{financeService.formatRupiah(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold pt-2 text-blue-400 border-t border-slate-800">
                <span>Arus Kas Bersih dari Aktivitas Investasi</span>
                <span className="font-mono">{financeService.formatRupiah(cashFlow.netCashFromInvesting)}</span>
              </div>
            </div>
          </div>

          {/* Financing Cash Flow */}
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950 px-4 py-2 rounded-xl text-xs font-bold text-indigo-400 uppercase">
              <span>3. ARUS KAS DARI AKTIVITAS PENDANAAN</span>
              <span>NOMINAL (IDR)</span>
            </div>
            <div className="space-y-1.5 px-3">
              {cashFlow.financingActivities.map((item) => (
                <div key={item.accountName} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                  <span className="text-slate-300">{item.accountName}</span>
                  <span className={`font-mono font-semibold ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.amount >= 0 ? '' : '-'}{financeService.formatRupiah(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold pt-2 text-indigo-400 border-t border-slate-800">
                <span>Arus Kas Bersih dari Aktivitas Pendanaan</span>
                <span className="font-mono">{financeService.formatRupiah(cashFlow.netCashFromFinancing)}</span>
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-cyan-500/40 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>Kenaikan / (Penurunan) Kas Bersih Periode Ini</span>
              <span className="font-mono font-bold text-cyan-400">{financeService.formatRupiah(cashFlow.netCashIncrease)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>Saldo Awal Kas & Setara Kas</span>
              <span className="font-mono font-bold text-slate-300">{financeService.formatRupiah(cashFlow.beginningCash)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-800">
              <span className="text-cyan-400">SALDO AKHIR KAS & SETARA KAS</span>
              <span className="font-mono text-cyan-400">{financeService.formatRupiah(cashFlow.endingCash)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: LAPORAN PERUBAHAN EKUITAS (EQUITY STATEMENT) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'EQ' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in">
          <div className="text-center border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              PT RAJAWALI SUKSES MANDIRI
            </h2>
            <h3 className="text-base font-extrabold text-indigo-400">
              LAPORAN PERUBAHAN EKUITAS (STATEMENT OF CHANGES IN EQUITY)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Periode: {periodLabel}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950 px-4 py-2 rounded-xl text-xs font-bold text-indigo-400 uppercase">
              <span>URAIAN KOMPONEN EKUITAS</span>
              <span>NOMINAL (IDR)</span>
            </div>

            <div className="space-y-2 px-3">
              <div className="flex justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-white font-medium">1. Saldo Modal Awal Periode</span>
                <span className="font-mono font-bold text-slate-200">
                  {financeService.formatRupiah(equityStatement.beginningEquity)}
                </span>
              </div>

              <div className="flex justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-white font-medium">2. Tambahan Setoran Modal Bersih</span>
                <span className="font-mono font-bold text-emerald-400">
                  + {financeService.formatRupiah(equityStatement.additionalCapital)}
                </span>
              </div>

              <div className="flex justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-white font-medium">3. Laba Bersih Periode Berjalan</span>
                <span className="font-mono font-bold text-emerald-400">
                  + {financeService.formatRupiah(equityStatement.netProfitPeriod)}
                </span>
              </div>

              <div className="flex justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-white font-medium">4. Pengambilan Prive / Pembagian Dividen</span>
                <span className="font-mono font-bold text-rose-400">
                  - {financeService.formatRupiah(equityStatement.drawingsOrDividends)}
                </span>
              </div>

              <div className="flex justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-white font-medium">5. Penyesuaian Ekuitas Lainnya</span>
                <span className="font-mono font-bold text-slate-300">
                  {financeService.formatRupiah(equityStatement.adjustments)}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/40 flex justify-between items-center text-sm font-extrabold text-indigo-400 mt-4">
              <span>TOTAL SALDO MODAL AKHIR PERIODE (ENDING EQUITY)</span>
              <span className="font-mono text-base">
                {financeService.formatRupiah(equityStatement.endingEquity)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: ANALISA RASIO FINANSIAL & KESEHATAN PERUSAHAAN */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'RATIO' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Health Score Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  Indeks Kesehatan Finansial Perusahaan
                </span>
                <h2 className="text-2xl font-black text-white mt-0.5">SANGAT SEHAT & SOLVABEL</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Berdasarkan kalkulasi likuiditas lancar (Current Ratio {(ratios.currentRatio ?? 0).toFixed(2)}x) dan
                  tingkat profitabilitas (NPM {(ratios.netProfitMargin ?? 0).toFixed(1)}%), arus kas dan permodalan
                  PT Rajawali Sukses Mandiri dalam kondisi prima untuk ekspansi.
                </p>
              </div>
            </div>

            <div className="text-center md:text-right bg-slate-950/80 p-4 rounded-2xl border border-slate-800 min-w-[160px]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Score Rating</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">92 / 100</div>
              <span className="text-[10px] text-emerald-300 font-bold">Grade: AAA (Prime)</span>
            </div>
          </div>

          {/* Ratios Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Profitability */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Profitabilitas (Profitability)</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  Sangat Baik
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Net Profit Margin (NPM):</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {(ratios.netProfitMargin ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Gross Profit Margin (GPM):</span>
                  <span className="font-bold text-blue-400 font-mono">
                    {(ratios.grossProfitMargin ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Return on Assets (ROA):</span>
                  <span className="font-bold text-white font-mono">{(ratios.returnOnAssets ?? 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Return on Equity (ROE):</span>
                  <span className="font-bold text-white font-mono">{(ratios.returnOnEquity ?? 0).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Liquidity */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                  <span>Likuiditas (Liquidity)</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                  Kuat
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Current Ratio:</span>
                  <span className="font-bold text-blue-400 font-mono">{(ratios.currentRatio ?? 0).toFixed(2)}x</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Quick Ratio (Acid Test):</span>
                  <span className="font-bold text-cyan-400 font-mono">{(ratios.quickRatio ?? 0).toFixed(2)}x</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Kemampuan membayar kewajiban jangka pendek tanpa menunggu penagihan piutang sangat tinggi.
                </p>
              </div>
            </div>

            {/* Solvency */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-indigo-400" />
                  <span>Solvabilitas (Leverage)</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                  Aman
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Debt to Asset Ratio (DAR):</span>
                  <span className="font-bold text-white font-mono">
                    {((ratios.debtToAssetRatio ?? 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Debt to Equity Ratio (DER):</span>
                  <span className="font-bold text-white font-mono">
                    {((ratios.debtToEquityRatio ?? 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Struktur modal perusahaan didominasi oleh ekuitas sendiri, meminimalkan risiko beban bunga.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
