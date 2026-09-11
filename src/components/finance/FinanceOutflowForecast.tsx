import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  Briefcase,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ArrowDownRight,
  Download,
  Printer,
  ChevronRight,
  ChevronDown,
  PieChart,
  BarChart3,
  ShieldAlert,
  HelpCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  DebtRecord,
  InvestmentRecord,
  ChartOfAccount,
  FinanceTransaction,
  OutflowForecastItem
} from '../../types/finance';
import {
  Project,
  Employee,
  TimesheetMonthRecord,
  UserAccount
} from '../../types';
import { formatCurrency, downloadCSV } from '../../utils/formatters';

interface FinanceOutflowForecastProps {
  employees: Employee[];
  timesheets: TimesheetMonthRecord[];
  debts: DebtRecord[];
  investments: InvestmentRecord[];
  accounts: ChartOfAccount[];
  projects: Project[];
  currentUser?: UserAccount | null;
  onNavigateView?: (view: string) => void;
}

export const FinanceOutflowForecast: React.FC<FinanceOutflowForecastProps> = ({
  employees = [],
  timesheets = [],
  debts = [],
  investments = [],
  accounts = [],
  projects = [],
  currentUser,
  onNavigateView
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August (1-12)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [viewCategory, setViewCategory] = useState<'ALL' | 'PAYROLL' | 'DEBT' | 'INVESTMENT' | 'OPERATIONAL'>('ALL');
  const [expandedProjectPayroll, setExpandedProjectPayroll] = useState<string | null>(null);
  const [includeOperationalEstimate, setIncludeOperationalEstimate] = useState<boolean>(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const targetMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // 1. HITUNG SALDO KAS & BANK AKTIF SAAT INI
  const currentCashAndBank = useMemo(() => {
    const cashAccounts = accounts.filter(
      (a) => a.code.startsWith('111') || a.code.startsWith('112') || a.category === 'Kas & Bank'
    );
    return cashAccounts.reduce((sum, a) => sum + (a.currentBalance || a.initialBalance || 0), 0);
  }, [accounts]);

  // 2. HITUNG RENCANA PENGELUARAN GAJI MANPOWER
  // Terhubung langsung ke Eagle Timesheet Matriks Kehadiran 1-31 Hari
  // JIKA MATRIKS KEHADIRAN KOSONG PADA BULAN TERPILIH, NILAI GAJI OTOMATIS 0 (TIDAK ADA ASUMSI DEFAULT)
  const payrollForecast = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.status !== 'Resign');
    
    // Kelompokkan per Proyek / Site
    const projectBreakdown: Record<string, {
      projectId: string;
      projectName: string;
      manpowerCount: number;
      baseSalary: number;
      bonusIncentive: number;
      deductions: number;
      netPayroll: number;
      totalHadirDays: number;
      details: Array<{
        employee: Employee;
        netPay: number;
        hadirCount: number;
        bonus: number;
        deduction: number;
        hasTimesheet: boolean;
      }>;
    }> = {};

    activeEmployees.forEach((emp) => {
      if (selectedProjectFilter !== 'ALL' && emp.projectId !== selectedProjectFilter) return;

      const prj = projects.find((p) => p.id === emp.projectId);
      const prjName = prj?.name || 'Site Operasional';

      // Cari rekap absensi / timesheet matriks kehadiran 1-31 hari untuk bulan & tahun terpilih
      const ts = timesheets.find(
        (t) => t.employeeId === emp.id && t.month === selectedMonth && t.year === selectedYear
      );

      let hadirCount = 0;
      let bonus = 0;
      let deduction = 0;
      let hasTimesheet = false;

      if (ts && ts.days) {
        hasTimesheet = true;
        let actualHadir = 0;
        Object.values(ts.days).forEach((st) => {
          if (st === 'H') actualHadir++;
        });
        hadirCount = actualHadir;
        bonus = ts.bonusAmount || 0;
        deduction = ts.deductionAmount || 0;
      }

      // JIKA DATA KEHADIRAN KOSONG (0 HARI) DAN TIDAK ADA BONUS/LEMBUR, NILAI GAJI = 0
      if (hadirCount === 0 && bonus === 0) {
        return; // Tidak ada rencana pengeluaran gaji untuk personil ini pada periode terpilih
      }

      if (!projectBreakdown[emp.projectId]) {
        projectBreakdown[emp.projectId] = {
          projectId: emp.projectId,
          projectName: prjName,
          manpowerCount: 0,
          baseSalary: 0,
          bonusIncentive: 0,
          deductions: 0,
          netPayroll: 0,
          totalHadirDays: 0,
          details: []
        };
      }

      const gross = (hadirCount * (emp.dailyRate || 0)) + bonus;
      const net = Math.max(0, gross - deduction);

      projectBreakdown[emp.projectId].manpowerCount += 1;
      projectBreakdown[emp.projectId].totalHadirDays += hadirCount;
      projectBreakdown[emp.projectId].baseSalary += hadirCount * (emp.dailyRate || 0);
      projectBreakdown[emp.projectId].bonusIncentive += bonus;
      projectBreakdown[emp.projectId].deductions += deduction;
      projectBreakdown[emp.projectId].netPayroll += net;
      projectBreakdown[emp.projectId].details.push({
        employee: emp,
        netPay: net,
        hadirCount,
        bonus,
        deduction,
        hasTimesheet
      });
    });

    const list = Object.values(projectBreakdown);
    const totalPayroll = list.reduce((sum, p) => sum + p.netPayroll, 0);
    const totalManpower = list.reduce((sum, p) => sum + p.manpowerCount, 0);
    const totalHadirAllSites = list.reduce((sum, p) => sum + p.totalHadirDays, 0);

    return {
      list,
      totalPayroll,
      totalManpower,
      totalHadirAllSites
    };
  }, [employees, timesheets, projects, selectedMonth, selectedYear, selectedProjectFilter]);

  // 3. HITUNG RENCANA PENGELUARAN HUTANG (DARI DATA PENCATATAN HUTANG USAHA SESUAI PERIODE)
  // Menghitung hutang yang jatuh tempo pada bulan berjalan atau sudah overdue
  const debtForecast = useMemo(() => {
    const list: Array<{
      debt: DebtRecord;
      dueCategory: 'THIS_MONTH' | 'OVERDUE' | 'UPCOMING';
      amountToPay: number;
    }> = [];

    debts.forEach((d) => {
      if (selectedProjectFilter !== 'ALL' && d.projectId !== selectedProjectFilter && d.projectId !== 'ALL') {
        return;
      }
      if (d.remainingAmount <= 0) return;

      // PENTING: Pisahkan hutang yang berasal dari jadwal bagi hasil investasi (HUT-INV-)
      // agar tidak terhitung ganda (double-counting) dengan menu Rencana Bagi Hasil Investor
      if (d.id.startsWith('HUT-INV-') || d.category === 'Bagi Hasil Investasi') {
        return;
      }

      const isThisMonth = d.dueDate.startsWith(targetMonthStr);
      const isOverdue = d.status === 'OVERDUE' || (new Date(d.dueDate) < new Date(`${targetMonthStr}-01`));

      if (isThisMonth || isOverdue) {
        list.push({
          debt: d,
          dueCategory: isOverdue ? 'OVERDUE' : 'THIS_MONTH',
          amountToPay: d.remainingAmount
        });
      }
    });

    const totalDebt = list.reduce((sum, item) => sum + item.amountToPay, 0);
    return {
      list,
      totalDebt
    };
  }, [debts, targetMonthStr, selectedProjectFilter]);

  // 4. HITUNG RENCANA PENGELUARAN BAGI HASIL INVESTOR (DARI JADWAL BULANAN SETIAP INVESTOR)
  const investmentForecast = useMemo(() => {
    const list: Array<{
      investment: InvestmentRecord;
      schedule: any;
      payoutAmount: number;
    }> = [];

    investments.forEach((inv) => {
      if (selectedProjectFilter !== 'ALL' && inv.projectId !== selectedProjectFilter && inv.projectId !== 'ALL') {
        return;
      }

      (inv.schedules || []).forEach((sch) => {
        // Jatuh tempo pada bulan terpilih dan belum direalisasikan
        if (sch.dueDate.startsWith(targetMonthStr) && sch.status !== 'DI Realisasikan') {
          list.push({
            investment: inv,
            schedule: sch,
            payoutAmount: sch.totalPayout || sch.profitAmount || 0
          });
        }
      });
    });

    const totalInvestmentPayout = list.reduce((sum, item) => sum + item.payoutAmount, 0);
    return {
      list,
      totalInvestmentPayout
    };
  }, [investments, targetMonthStr, selectedProjectFilter]);

  // 5. ESTIMASI BEBAN OPERASIONAL RUTIN (OPSIONAL)
  // Sesuai aturan sistem: jika data kosong pada menu hutang, gaji, dan investor, forecast otomatis kosong (Rp 0).
  const estimatedOperational = useMemo(() => {
    if (!includeOperationalEstimate) return 0;
    if (selectedProjectFilter === 'ALL') {
      return 35000000;
    }
    return 12000000;
  }, [includeOperationalEstimate, selectedProjectFilter]);

  // GRAND TOTAL FORECAST
  const grandTotalForecast = useMemo(() => {
    const coreOutflow =
      payrollForecast.totalPayroll +
      debtForecast.totalDebt +
      investmentForecast.totalInvestmentPayout;

    // Jika data pada ketiga menu (gaji, hutang, investor) kosong, maka forecast otomatis Rp 0
    if (coreOutflow === 0) {
      return 0;
    }

    return coreOutflow + (includeOperationalEstimate ? estimatedOperational : 0);
  }, [payrollForecast, debtForecast, investmentForecast, estimatedOperational, includeOperationalEstimate]);

  // CASH BUFFER & LIQUIDITY ANALYSIS
  const liquidityStatus = useMemo(() => {
    const surplusDeficit = currentCashAndBank - grandTotalForecast;
    const coverageRatio = grandTotalForecast > 0 ? (currentCashAndBank / grandTotalForecast) * 100 : 100;
    const isSafe = surplusDeficit >= 0;

    return {
      surplusDeficit,
      coverageRatio,
      isSafe
    };
  }, [currentCashAndBank, grandTotalForecast]);

  // TIMELINE SCHEDULE PER MINGGU (WEEKS 1 - 4)
  const weeklyForecast = useMemo(() => {
    let week1 = 0; // Tgl 1 - 7: Pinjaman Bank, Sewa Kantor
    let week2 = 0; // Tgl 8 - 14: Tagihan Vendor Chemical Awal
    let week3 = 0; // Tgl 15 - 21: Supplier Seragam & APD
    let week4 = 0; // Tgl 22 - 31: PAYROLL MANPOWER & Bagi Hasil Investor

    // Manpower Payroll usually on 25th (Week 4)
    week4 += payrollForecast.totalPayroll;

    // Debts distributed by dueDate
    debtForecast.list.forEach((item) => {
      const day = parseInt(item.debt.dueDate.split('-')[2] || '15', 10);
      if (item.dueCategory === 'OVERDUE' || day <= 7) week1 += item.amountToPay;
      else if (day <= 14) week2 += item.amountToPay;
      else if (day <= 21) week3 += item.amountToPay;
      else week4 += item.amountToPay;
    });

    // Investments distributed by profitSharingDay
    investmentForecast.list.forEach((item) => {
      const day = item.investment.profitSharingDay || 25;
      if (day <= 7) week1 += item.payoutAmount;
      else if (day <= 14) week2 += item.payoutAmount;
      else if (day <= 21) week3 += item.payoutAmount;
      else week4 += item.payoutAmount;
    });

    // Operational distributed evenly if enabled
    if (estimatedOperational > 0) {
      week1 += estimatedOperational * 0.25;
      week2 += estimatedOperational * 0.25;
      week3 += estimatedOperational * 0.25;
      week4 += estimatedOperational * 0.25;
    }

    return {
      week1,
      week2,
      week3,
      week4
    };
  }, [payrollForecast, debtForecast, investmentForecast, estimatedOperational]);

  // Export CSV
  const handleExportCSV = () => {
    const exportData: any[] = [];

    // Gaji Manpower
    payrollForecast.list.forEach((prj) => {
      exportData.push({
        'Kategori Pengeluaran': 'Gaji Manpower Lapangan (Payroll)',
        'Deskripsi / Subyek': `Rekap Gaji ${prj.projectName}`,
        'Alokasi Proyek': prj.projectName,
        'Jumlah Personil': prj.manpowerCount,
        'Estimasi Tanggal': `${targetMonthStr}-25`,
        'Estimasi Nominal (Rp)': prj.netPayroll,
        'Catatan': `Tersinkron dari Eagle Timesheet (${prj.totalHadirDays} hari hadir)`
      });
    });

    // Hutang Usaha
    debtForecast.list.forEach((item) => {
      exportData.push({
        'Kategori Pengeluaran': 'Kewajiban Hutang Vendor & Cicilan',
        'Deskripsi / Subyek': `${item.debt.creditorName} (${item.debt.invoiceNumber})`,
        'Alokasi Proyek': item.debt.projectName || 'Semua Site',
        'Jumlah Personil': '-',
        'Estimasi Tanggal': item.debt.dueDate,
        'Estimasi Nominal (Rp)': item.amountToPay,
        'Catatan': `Status: ${item.dueCategory === 'OVERDUE' ? 'Jatuh Tempo (Overdue)' : 'Bulan Berjalan'}`
      });
    });

    // Bagi Hasil Investor
    investmentForecast.list.forEach((item) => {
      exportData.push({
        'Kategori Pengeluaran': 'Bagi Hasil Mitra Investor',
        'Deskripsi / Subyek': `${item.investment.investorName} (${item.schedule.monthLabel})`,
        'Alokasi Proyek': item.investment.projectName || 'Semua Site',
        'Jumlah Personil': '-',
        'Estimasi Tanggal': item.schedule.dueDate,
        'Estimasi Nominal (Rp)': item.payoutAmount,
        'Catatan': `Bagi hasil ${item.investment.profitSharingPercent}% ke rek ${item.investment.bankName}`
      });
    });

    if (estimatedOperational > 0) {
      exportData.push({
        'Kategori Pengeluaran': 'Beban Operasional Rutin HQ',
        'Deskripsi / Subyek': 'Estimasi Chemical, Listrik & Perawatan',
        'Alokasi Proyek': selectedProjectFilter === 'ALL' ? 'Semua Site' : 'Site Terpilih',
        'Jumlah Personil': '-',
        'Estimasi Tanggal': `${targetMonthStr}-15`,
        'Estimasi Nominal (Rp)': estimatedOperational,
        'Catatan': 'Estimasi baseline operasional rutin'
      });
    }

    if (exportData.length === 0) {
      alert('Tidak ada data forecast pengeluaran untuk diekspor pada periode ini.');
      return;
    }

    downloadCSV(exportData, `Forecast_Rencana_Pengeluaran_${targetMonthStr}`);
  };

  const isDataCompletelyEmpty =
    payrollForecast.totalPayroll === 0 &&
    debtForecast.totalDebt === 0 &&
    investmentForecast.totalInvestmentPayout === 0 &&
    !includeOperationalEstimate;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Cash Outflow Projection Engine
            </span>
            <span className="text-xs text-slate-400">Integrasi Gaji Manpower, Hutang & Bagi Hasil</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-400" />
            Forecast Rencana Pengeluaran Kas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Proyeksi kebutuhan dana terintegrasi periode{' '}
            <strong className="text-white">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </strong>{' '}
            berdasarkan data absensi gaji manpower, jadwal hutang vendor, dan komitmen bagi hasil investor.
          </p>
        </div>

        {/* Action Buttons & Period Pickers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {monthNames.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m} {selectedYear}
              </option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Semua Site & HQ</option>
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

      {/* Synchronization Engine Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center space-x-2.5">
          <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </span>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>Sinkronisasi Otomatis Matriks 1-31 Hari, Hutang Usaha & Bagi Hasil</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                REALTIME
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Gaji terhitung otomatis dari matriks absensi Eagle Timesheet ({payrollForecast.totalHadirAllSites} hari hadir tercatat) • {debtForecast.list.length} hutang jatuh tempo periode {monthNames[selectedMonth - 1]} • {investmentForecast.list.length} jadwal bagi hasil investor.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIncludeOperationalEstimate(!includeOperationalEstimate)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              includeOperationalEstimate
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {includeOperationalEstimate ? '✓ Estimasi Ops Rutin Aktif' : '+ Estimasi Ops Rutin'}
          </button>
        </div>
      </div>

      {/* Empty State Banner when Data is Empty */}
      {isDataCompletelyEmpty && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <TrendingDown className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Data Rencana Pengeluaran Kosong (Rp 0)
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Tidak ada rencana pengeluaran untuk periode <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> pada {selectedProjectFilter === 'ALL' ? 'semua lokasi' : 'lokasi terpilih'}.
              Sesuai aturan sistem: jika data pada menu hutang, matriks kehadiran gaji (1-31 hari), dan bagi hasil investor kosong, maka nilai forecast otomatis bernilai <strong>Rp 0</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {onNavigateView && (
              <>
                <button
                  onClick={() => onNavigateView('timesheet')}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Isi Matriks Eagle Timesheet</span>
                </button>
                <button
                  onClick={() => onNavigateView('finance_debts_receivables')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-rose-400" />
                  <span>Input Hutang Vendor</span>
                </button>
                <button
                  onClick={() => onNavigateView('finance_investments')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  <span>Kelola Jadwal Investor</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Rencana Pengeluaran */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Rencana Pengeluaran</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-400 mt-1">
            {formatCurrency(grandTotalForecast)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Periode Proyeksi:</span>
            <span className="font-bold text-white">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
        </div>

        {/* Beban Gaji Manpower */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Rencana Gaji Manpower</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-cyan-400 mt-1">
            {formatCurrency(payrollForecast.totalPayroll)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Karyawan Lapangan:</span>
            <span className="font-bold text-white">{payrollForecast.totalManpower} Personil</span>
          </div>
        </div>

        {/* Pembayaran Hutang Vendor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Rencana Bayar Hutang</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-400 mt-1">
            {formatCurrency(debtForecast.totalDebt)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Jatuh Tempo Bulan Ini:</span>
            <span className="font-bold text-amber-300">{debtForecast.list.length} Tagihan Vendor</span>
          </div>
        </div>

        {/* Bagi Hasil & Operasional */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Bagi Hasil & Operasional</span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-400 mt-1">
            {formatCurrency(investmentForecast.totalInvestmentPayout + estimatedOperational)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
            <span>Bagi Hasil Investor:</span>
            <span className="font-bold text-purple-300">
              {formatCurrency(investmentForecast.totalInvestmentPayout)}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Buffer & Liquidity Health Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          liquidityStatus.isSafe
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/30'
            : 'bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 border-rose-500/40'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-xl ${
              liquidityStatus.isSafe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {liquidityStatus.isSafe ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-white">
                Analisa Likuiditas Kas & Runway: {liquidityStatus.isSafe ? 'SURPLUS / AMAN' : 'DEFISIT / PERLU PERHATIAN'}
              </h3>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  liquidityStatus.isSafe
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                Coverage: {liquidityStatus.coverageRatio.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Posisi Kas & Bank saat ini sebesar <strong className="text-white">{formatCurrency(currentCashAndBank)}</strong> vs total rencana pengeluaran <strong className="text-white">{formatCurrency(grandTotalForecast)}</strong>.
            </p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <div className="text-[11px] text-slate-400">Net Surplus / (Kekurangan Dana):</div>
          <div
            className={`text-lg sm:text-xl font-black ${
              liquidityStatus.isSafe ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {liquidityStatus.surplusDeficit >= 0 ? '+' : ''}
            {formatCurrency(liquidityStatus.surplusDeficit)}
          </div>
        </div>
      </div>

      {/* TIMELINE PENGELUARAN MINGGUAN (WEEKS 1 - 4) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Distribusi Jadwal Pengeluaran Kas Mingguan (Weekly Cash Burn)
          </h3>
          <span className="text-[11px] text-slate-400">Puncak pengeluaran di Minggu ke-4 (Payroll Tgl 25)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Week 1 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Minggu 1 (Tgl 1 - 7)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {((weeklyForecast.week1 / (grandTotalForecast || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-base font-black text-rose-300">{formatCurrency(weeklyForecast.week1)}</div>
            <div className="text-[10px] text-slate-400">
              Angsuran KMK Mandiri & Operasional Awal
            </div>
          </div>

          {/* Week 2 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Minggu 2 (Tgl 8 - 14)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {((weeklyForecast.week2 / (grandTotalForecast || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-base font-black text-amber-300">{formatCurrency(weeklyForecast.week2)}</div>
            <div className="text-[10px] text-slate-400">
              Tagihan Vendor Chemical & Bagi Hasil BNI
            </div>
          </div>

          {/* Week 3 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Minggu 3 (Tgl 15 - 21)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {((weeklyForecast.week3 / (grandTotalForecast || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-base font-black text-cyan-300">{formatCurrency(weeklyForecast.week3)}</div>
            <div className="text-[10px] text-slate-400">
              Vendor Seragam & Logistik Gudang
            </div>
          </div>

          {/* Week 4 */}
          <div className="bg-slate-800/80 border border-rose-500/40 rounded-xl p-3.5 space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-rose-300">Minggu 4 (Tgl 22 - 31) 🔥</span>
              <span className="text-[10px] text-rose-300 font-mono font-bold">
                {((weeklyForecast.week4 / (grandTotalForecast || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-base font-black text-rose-400">{formatCurrency(weeklyForecast.week4)}</div>
            <div className="text-[10px] text-slate-300 font-medium">
              Gaji 60+ Manpower Lapangan & Bagi Hasil BCA/MDR
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED TABS & BREAKDOWN TABLES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Category Filters */}
        <div className="p-3 bg-slate-800/70 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewCategory === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Semua Rencana ({payrollForecast.list.length + debtForecast.list.length + investmentForecast.list.length + 1})
            </button>

            <button
              onClick={() => setViewCategory('PAYROLL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewCategory === 'PAYROLL'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Gaji Manpower ({payrollForecast.list.length} Site)
            </button>

            <button
              onClick={() => setViewCategory('DEBT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewCategory === 'DEBT'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Hutang Vendor ({debtForecast.list.length})
            </button>

            <button
              onClick={() => setViewCategory('INVESTMENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewCategory === 'INVESTMENT'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Bagi Hasil ({investmentForecast.list.length})
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Total Item Proyeksi: <strong>{formatCurrency(grandTotalForecast)}</strong>
          </div>
        </div>

        {/* TABEL RINCIAN PENGELUARAN */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Subyek / Uraian Rencana</th>
                <th className="py-3 px-3">Alokasi Site Proyek</th>
                <th className="py-3 px-3">Estimasi Tanggal</th>
                <th className="py-3 px-3 text-right">Estimasi Kebutuhan Kas</th>
                <th className="py-3 px-3 text-center">Porsi (%)</th>
                <th className="py-3 px-3">Catatan / Sumber Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {/* 1. GAJI MANPOWER */}
              {(viewCategory === 'ALL' || viewCategory === 'PAYROLL') &&
                payrollForecast.list.map((prj, i) => (
                  <tr key={`pr-${i}`} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-cyan-300">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Gaji Manpower</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      <div>Gaji Bulanan {prj.projectName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {prj.manpowerCount} Personil (Hadir x Daily Rate + Lembur)
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{prj.projectName}</td>
                    <td className="py-3 px-3 font-mono text-cyan-300">
                      {targetMonthStr}-25 (Payroll Day)
                    </td>
                    <td className="py-3 px-3 text-right font-black text-cyan-400">
                      {formatCurrency(prj.netPayroll)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {((prj.netPayroll / (grandTotalForecast || 1)) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      Data rekap absensi & master manpower HRD
                    </td>
                  </tr>
                ))}

              {/* 2. HUTANG VENDOR */}
              {(viewCategory === 'ALL' || viewCategory === 'DEBT') &&
                debtForecast.list.map((item, i) => (
                  <tr key={`debt-${i}`} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-rose-300">
                      <div className="flex items-center space-x-1">
                        <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                        <span>Hutang Vendor</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      <div>{item.debt.creditorName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.debt.category} • No. {item.debt.invoiceNumber}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{item.debt.projectName || 'Semua Site'}</td>
                    <td className="py-3 px-3 font-mono text-rose-300">
                      {item.debt.dueDate}
                      {item.dueCategory === 'OVERDUE' && (
                        <span className="ml-1 text-[9px] text-rose-400 font-bold bg-rose-500/20 px-1 py-0.5 rounded">
                          OVERDUE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-400">
                      {formatCurrency(item.amountToPay)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {((item.amountToPay / (grandTotalForecast || 1)) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      Pencatatan Hutang Usaha ({item.debt.code})
                    </td>
                  </tr>
                ))}

              {/* 3. BAGI HASIL INVESTOR */}
              {(viewCategory === 'ALL' || viewCategory === 'INVESTMENT') &&
                investmentForecast.list.map((item, i) => (
                  <tr key={`inv-${i}`} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-purple-300">
                      <div className="flex items-center space-x-1">
                        <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                        <span>Bagi Hasil Mitra</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      <div>{item.investment.investorName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.schedule.monthLabel} ({item.investment.profitSharingPercent}% / bulan)
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{item.investment.projectName || 'Proyek'}</td>
                    <td className="py-3 px-3 font-mono text-purple-300">{item.schedule.dueDate}</td>
                    <td className="py-3 px-3 text-right font-black text-purple-400">
                      {formatCurrency(item.payoutAmount)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {((item.payoutAmount / (grandTotalForecast || 1)) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      Rek. {item.investment.bankName} - {item.investment.bankAccountNumber}
                    </td>
                  </tr>
                ))}

              {/* 4. OPERASIONAL RUTIN */}
              {(viewCategory === 'ALL' || viewCategory === 'OPERATIONAL') && (
                <tr className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-semibold text-amber-300">
                    <div className="flex items-center space-x-1">
                      <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Operasional Rutin</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">
                    <div>Chemical, Listrik HQ, APD & Maintenance</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Beban operasional rutin berulang bulanan
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {selectedProjectFilter === 'ALL' ? 'Semua Site' : 'Site Terpilih'}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-300">{targetMonthStr}-15</td>
                  <td className="py-3 px-3 text-right font-black text-amber-400">
                    {formatCurrency(estimatedOperational)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-400">
                    {((estimatedOperational / (grandTotalForecast || 1)) * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    Baseline historis beban bulanan
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800/90 font-bold text-white border-t-2 border-slate-700">
                <td colSpan={4} className="py-3.5 px-3 text-right uppercase tracking-wider text-xs">
                  Grand Total Rencana Pengeluaran ({monthNames[selectedMonth - 1]} {selectedYear}):
                </td>
                <td className="py-3.5 px-3 text-right text-base font-black text-rose-400">
                  {formatCurrency(grandTotalForecast)}
                </td>
                <td className="py-3.5 px-3 text-center font-mono text-xs">100.0%</td>
                <td className="py-3.5 px-3 text-[11px] text-slate-400">Kebutuhan kas terverifikasi</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
