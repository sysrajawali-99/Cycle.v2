import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  Users,
  Search,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  CalendarRange,
  Clock,
  ArrowRight,
  Check
} from 'lucide-react';
import {
  Project,
  Employee,
  TimesheetMonthRecord,
  ProjectStock,
  InventoryItem,
  UserRole,
  AttendanceStatus
} from '../../types';
import {
  formatCurrency,
  getMonthName,
  getDaysInMonth,
  downloadCSV
} from '../../utils/formatters';
import {
  generateTimesheetPDF,
  generateIndividualPayslipPDF
} from '../../utils/pdfExport';
import { storageService, TimesheetCutoffSettings } from '../../services/storageService';
import { OfficialLetterhead } from '../common/OfficialLetterhead';
import { calculatePayrollSummary } from '../../utils/payrollCalculator';
import { notifyRealtimeChange } from '../common/RealtimeToast';

interface ReportingCenterProps {
  projects: Project[];
  employees: Employee[];
  timesheets: TimesheetMonthRecord[];
  projectStocks: ProjectStock[];
  inventoryItems: InventoryItem[];
  selectedProjectId: string;
  userRole: UserRole;
}

export const ReportingCenter: React.FC<ReportingCenterProps> = ({
  projects = [],
  employees = [],
  timesheets = [],
  projectStocks = [],
  inventoryItems = [],
  selectedProjectId = 'ALL',
  userRole
}) => {
  // Shared Cut-off Settings (Sinkronisasi dengan Eagle Timesheet)
  const initialCutoff = useMemo(() => storageService.getTimesheetCutoffSettings(), []);
  const [isCutoffMode, setIsCutoffMode] = useState<boolean>(initialCutoff.isCutoffMode);

  // Tanggal Buka Buku (Mulai)
  const [startDay, setStartDay] = useState<number>(initialCutoff.startDay);
  const [startMonth, setStartMonth] = useState<number>(initialCutoff.startMonth);
  const [startYear, setStartYear] = useState<number>(initialCutoff.startYear);

  // Tanggal Tutup Buku (Selesai)
  const [endDay, setEndDay] = useState<number>(initialCutoff.endDay);
  const [endMonth, setEndMonth] = useState<number>(initialCutoff.endMonth);
  const [endYear, setEndYear] = useState<number>(initialCutoff.endYear);

  // Calendar Month (untuk mode non-cut-off)
  const [reportMonth, setReportMonth] = useState<number>(initialCutoff.calendarMonth);
  const [reportYear, setReportYear] = useState<number>(initialCutoff.calendarYear);

  const [filterProject, setFilterProject] = useState<string>(selectedProjectId);
  const [searchQuery, setSearchQuery] = useState('');

  // Sinkronisasi filter lokasi proyek dari navigasi global
  useEffect(() => {
    setFilterProject(selectedProjectId);
  }, [selectedProjectId]);

  // Selected Employee for Slip Modal
  const [slipEmployee, setSlipEmployee] = useState<{
    employee: Employee;
    timesheet: TimesheetMonthRecord;
    hadirCount: number;
    alpaCount: number;
    izinCount: number;
    offCount?: number;
    grossPay: number;
    netPay: number;
    deductionAmount: number;
    deductionReason: string;
    bonusAmount: number;
  } | null>(null);

  // Sinkronisasi otomatis dari Eagle Timesheet saat tanggal cut-off berubah
  useEffect(() => {
    const handleCutoffUpdate = (e: any) => {
      const s = e.detail;
      if (!s) return;
      setIsCutoffMode(s.isCutoffMode);
      setStartDay(s.startDay);
      setStartMonth(s.startMonth);
      setStartYear(s.startYear);
      setEndDay(s.endDay);
      setEndMonth(s.endMonth);
      setEndYear(s.endYear);
      if (s.calendarMonth) setReportMonth(s.calendarMonth);
      if (s.calendarYear) setReportYear(s.calendarYear);
    };

    window.addEventListener('timesheet_cutoff_updated', handleCutoffUpdate);
    return () => {
      window.removeEventListener('timesheet_cutoff_updated', handleCutoffUpdate);
    };
  }, []);

  // Update dan simpan pengaturan cut-off secara tersinkronisasi
  const handleUpdateCutoffSettings = (newSettings: Partial<TimesheetCutoffSettings>) => {
    const nextSettings: TimesheetCutoffSettings = {
      isCutoffMode: newSettings.isCutoffMode !== undefined ? newSettings.isCutoffMode : isCutoffMode,
      startDay: newSettings.startDay !== undefined ? newSettings.startDay : startDay,
      startMonth: newSettings.startMonth !== undefined ? newSettings.startMonth : startMonth,
      startYear: newSettings.startYear !== undefined ? newSettings.startYear : startYear,
      endDay: newSettings.endDay !== undefined ? newSettings.endDay : endDay,
      endMonth: newSettings.endMonth !== undefined ? newSettings.endMonth : endMonth,
      endYear: newSettings.endYear !== undefined ? newSettings.endYear : endYear,
      calendarMonth: newSettings.calendarMonth !== undefined ? newSettings.calendarMonth : reportMonth,
      calendarYear: newSettings.calendarYear !== undefined ? newSettings.calendarYear : reportYear
    };

    setIsCutoffMode(nextSettings.isCutoffMode);
    setStartDay(nextSettings.startDay);
    setStartMonth(nextSettings.startMonth);
    setStartYear(nextSettings.startYear);
    setEndDay(nextSettings.endDay);
    setEndMonth(nextSettings.endMonth);
    setEndYear(nextSettings.endYear);
    setReportMonth(nextSettings.calendarMonth);
    setReportYear(nextSettings.calendarYear);

    storageService.saveTimesheetCutoffSettings(nextSettings);
  };

  // Helper sinkronisasi manual dari Eagle Timesheet
  const handleManualSyncFromEagle = () => {
    const s = storageService.getTimesheetCutoffSettings();
    setIsCutoffMode(s.isCutoffMode);
    setStartDay(s.startDay);
    setStartMonth(s.startMonth);
    setStartYear(s.startYear);
    setEndDay(s.endDay);
    setEndMonth(s.endMonth);
    setEndYear(s.endYear);
    setReportMonth(s.calendarMonth);
    setReportYear(s.calendarYear);
  };

  // Preset Periode Cepat
  const applyPreset21to20 = () => {
    handleUpdateCutoffSettings({
      isCutoffMode: true,
      startDay: 21,
      startMonth: 8,
      startYear: 2026,
      endDay: 20,
      endMonth: 9,
      endYear: 2026
    });
  };

  const applyPreset26to25 = () => {
    handleUpdateCutoffSettings({
      isCutoffMode: true,
      startDay: 26,
      startMonth: 7,
      startYear: 2026,
      endDay: 25,
      endMonth: 8,
      endYear: 2026
    });
  };

  const applyPresetFullMonth = () => {
    const daysInM = getDaysInMonth(reportYear, reportMonth);
    handleUpdateCutoffSettings({
      isCutoffMode: false,
      startDay: 1,
      startMonth: reportMonth,
      startYear: reportYear,
      endDay: daysInM,
      endMonth: reportMonth,
      endYear: reportYear
    });
  };

  // Format Helpers
  const pad2 = (n: number) => String(n).padStart(2, '0');

  // Pengaturan cut-off aktif untuk kalkulasi payroll
  const currentCutoffSettings: TimesheetCutoffSettings = useMemo(() => ({
    isCutoffMode,
    startDay,
    startMonth,
    startYear,
    endDay,
    endMonth,
    endYear,
    calendarMonth: reportMonth,
    calendarYear: reportYear
  }), [isCutoffMode, startDay, startMonth, startYear, endDay, endMonth, endYear, reportMonth, reportYear]);

  // Kalkulasi Payroll tersentralisasi & real-time (identik 100% dengan Dashboard)
  const payrollSummary = useMemo(() => {
    return calculatePayrollSummary(
      employees,
      timesheets,
      currentCutoffSettings,
      filterProject,
      searchQuery
    );
  }, [employees, timesheets, currentCutoffSettings, filterProject, searchQuery]);

  const {
    activePeriodDays,
    periodLabel,
    payrollRows,
    totalPayroll,
    totalDeductions,
    totalHadirDays
  } = payrollSummary;

  // Export Payroll Recap CSV
  const handleExportPayrollCSV = () => {
    const headers = [
      'NIK',
      'Nama Karyawan',
      'Jabatan',
      'Lokasi Proyek',
      'Shift',
      'Bank & No Rekening',
      'Rate Harian (Rp)',
      'Total Hadir',
      'Total Alpa',
      'Total Izin',
      'Gaji Kotor (Rp)',
      'Potongan (Rp)',
      'Alasan Potongan',
      'Insentif / Lembur (Rp)',
      'Gaji Bersih / Take Home Pay (Rp)',
      'Periode Cut-Off Timesheet',
      'Total Hari Aktif Periode'
    ];

    const rows: (string | number)[][] = [headers];

    payrollRows.forEach((r) => {
      const proj = projects.find((p) => p.id === r.employee.projectId);
      rows.push([
        r.employee.nik,
        r.employee.name,
        r.employee.position,
        proj?.name || '-',
        r.employee.shift,
        `${r.employee.bankName} - ${r.employee.bankAccount}`,
        r.employee.dailyRate,
        r.hadirCount,
        r.alpaCount,
        r.izinCount,
        r.grossPay,
        r.deductionAmount,
        r.deductionReason,
        r.bonusAmount,
        r.netPay,
        periodLabel,
        activePeriodDays.length
      ]);
    });

    const filename = isCutoffMode
      ? `Rekap_Payroll_Cutoff_${pad2(startDay)}${pad2(startMonth)}${startYear}_sd_${pad2(endDay)}${pad2(endMonth)}${endYear}.csv`
      : `Rekap_Payroll_Rajawali_${getMonthName(reportMonth)}_${reportYear}.csv`;
    downloadCSV(filename, rows);
    notifyRealtimeChange({
      module: 'reports',
      title: 'Rekap CSV Berhasil Diunduh',
      message: `File rekapitulasi payroll (${payrollRows.length} personil) berhasil diekspor.`,
      type: 'success'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Rekap Laporan & Payroll Slip Center
              </h1>
              <p className="text-xs text-slate-400">
                Pencetakan slip gaji, rekap cut-off kehadiran, dan transparansi transfer payroll outsourcing.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Direct Download Payroll PDF */}
            <button
              id="download-payroll-pdf-btn"
              onClick={() => {
                generateTimesheetPDF({
                  projects,
                  employees,
                  timesheets,
                  selectedProjectId: filterProject,
                  month: reportMonth,
                  year: reportYear,
                  customPeriodLabel: `PERIODE: ${periodLabel} (Cut-off Eagle Timesheet)`,
                  customDays: activePeriodDays.map((p) => ({
                    day: p.day,
                    month: p.month,
                    year: p.year,
                    label: p.shortLabel
                  }))
                });
                notifyRealtimeChange({
                  module: 'reports',
                  title: 'Rekap PDF Berhasil Dibuat',
                  message: `Dokumen PDF Rekapitulasi Periode ${periodLabel} berhasil diunduh.`,
                  type: 'success'
                });
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition cursor-pointer"
              title="Download dokumen rekapitulasi payroll lengkap sebagai file PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Rekap</span>
            </button>

            {/* Export / Download as CSV */}
            <button
              id="download-as-csv-btn"
              data-testid="download-as-csv-btn"
              onClick={handleExportPayrollCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-750 hover:bg-emerald-650 text-white font-bold text-xs rounded-xl border border-emerald-600/50 shadow-md shadow-emerald-950/40 transition cursor-pointer"
              title="Unduh Rekap Format Spreadsheet CSV yang kompatibel langsung dengan Excel & Google Sheets"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Download as CSV</span>
            </button>
          </div>
        </div>

        {/* Section: Kontrol Periode Buka & Tutup Buku (Tersinkronisasi dengan Eagle Timesheet) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <CalendarRange className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="text-xs font-bold text-white">
                    Sinkronisasi Periode Eagle Timesheet
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {isCutoffMode ? 'Mode Buka-Tutup Buku (Cut-Off)' : 'Mode 1 Bulan Penuh'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {activePeriodDays.length} Hari Kerja Aktif
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Periode hitung presensi dan slip gaji otomatis mengikuti tanggal buka dan tutup buku pada Eagle Timesheet.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              <button
                onClick={handleManualSyncFromEagle}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer shadow-xs"
                title="Ambil tanggal buka & tutup buku terkini dari Eagle Timesheet"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkronkan dari Timesheet</span>
              </button>

              <button
                onClick={() => handleUpdateCutoffSettings({ isCutoffMode: !isCutoffMode })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${
                  isCutoffMode
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                }`}
              >
                {isCutoffMode ? '✓ Cut-off Buka-Tutup Aktif' : 'Beralih ke Cut-off Buka-Tutup'}
              </button>
            </div>
          </div>

          {/* Selector Tanggal Buka & Tutup Buku */}
          {isCutoffMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/70">
              {/* Tanggal Buka Buku */}
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wide">
                    🟢 Tanggal Buka Buku:
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs">
                  <select
                    value={startDay}
                    onChange={(e) =>
                      handleUpdateCutoffSettings({ startDay: Number(e.target.value), isCutoffMode: true })
                    }
                    className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {pad2(d)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={startMonth}
                    onChange={(e) =>
                      handleUpdateCutoffSettings({ startMonth: Number(e.target.value), isCutoffMode: true })
                    }
                    className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {getMonthName(m)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={startYear}
                    onChange={(e) =>
                      handleUpdateCutoffSettings({ startYear: Number(e.target.value), isCutoffMode: true })
                    }
                    className="w-16 bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tanggal Tutup Buku */}
              <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span className="text-[11px] font-black text-rose-400 uppercase tracking-wide">
                    🔴 Tanggal Tutup Buku:
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs">
                  <select
                    value={endDay}
                    onChange={(e) =>
                      handleUpdateCutoffSettings({ endDay: Number(e.target.value), isCutoffMode: true })
                    }
                    className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs font-bold focus:border-rose-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {pad2(d)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={endMonth}
                    onChange={(e) =>
                      handleUpdateCutoffSettings({ endMonth: Number(e.target.value), isCutoffMode: true })
                    }
                    className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs font-bold focus:border-rose-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {getMonthName(m)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) =>
                      handleUpdateCutoffSettings({ endYear: Number(e.target.value), isCutoffMode: true })
                    }
                    className="w-16 bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-bold">Pilih Bulan & Tahun Kalender:</span>
              <div className="flex items-center space-x-2">
                <select
                  value={reportMonth}
                  onChange={(e) =>
                    handleUpdateCutoffSettings({ calendarMonth: Number(e.target.value), isCutoffMode: false })
                  }
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={reportYear}
                  onChange={(e) =>
                    handleUpdateCutoffSettings({ calendarYear: Number(e.target.value), isCutoffMode: false })
                  }
                  className="w-20 bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Presets Cepat Periode */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Preset Cepat:</span>
              <button
                onClick={applyPreset21to20}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[11px] transition cursor-pointer"
              >
                ⚡ Cut-Off 21 - 20 (21-08-2026 s/d 20-09-2026)
              </button>
              <button
                onClick={applyPreset26to25}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
              >
                ⚡ Cut-Off 26 - 25 (26-07-2026 s/d 25-08-2026)
              </button>
              <button
                onClick={applyPresetFullMonth}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
              >
                📅 1 Bulan Penuh (1 - 31)
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              Periode Aktif:{' '}
              <strong className="text-amber-400 font-mono font-bold">{periodLabel}</strong> (
              {activePeriodDays.length} Hari Kerja)
            </div>
          </div>
        </div>

        {/* Filters Search & Project */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              id="payroll-search-input"
              type="text"
              placeholder="Cari nama karyawan / NIK / posisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-medium"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="payroll-project-filter"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer font-medium"
            >
              <option value="ALL">Semua Lokasi Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <span className="text-xs text-slate-400">Total Pengeluaran Payroll</span>
          <div className="text-2xl font-black text-amber-400">
            {formatCurrency(totalPayroll)}
          </div>
          <p className="text-[10px] text-slate-500">{payrollRows.length} Personil Penerima Gaji</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <span className="text-xs text-slate-400">Akumulasi Hari Kerja Hadir</span>
          <div className="text-2xl font-black text-emerald-400">
            {totalHadirDays} <span className="text-sm font-normal text-slate-400">Hari</span>
          </div>
          <p className="text-[10px] text-slate-500">Tercatat di Eagle Timesheet</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <span className="text-xs text-slate-400">Total Potongan Kedisiplinan</span>
          <div className="text-2xl font-black text-rose-400">
            {formatCurrency(totalDeductions)}
          </div>
          <p className="text-[10px] text-slate-500">Denda pelanggaran seragam / terlambat</p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Karyawan & NIK</th>
                <th className="p-3.5">Lokasi & Posisi</th>
                <th className="p-3.5 text-right">Rate / Hari</th>
                <th className="p-3.5 text-center">Hadir</th>
                <th className="p-3.5 text-center">Alpa</th>
                <th className="p-3.5 text-right">Gaji Kotor</th>
                <th className="p-3.5 text-right">Potongan</th>
                <th className="p-3.5 text-right">Gaji Bersih</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {payrollRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    Tidak ada data payroll yang sesuai.
                  </td>
                </tr>
              ) : (
                payrollRows.map((row) => {
                  const proj = projects.find((p) => p.id === row.employee.projectId);
                  return (
                    <tr key={row.employee.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{row.employee.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{row.employee.nik}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-300 font-medium">{proj?.name || '-'}</div>
                        <div className="text-[11px] text-amber-400">{row.employee.position}</div>
                      </td>

                      <td className="p-3.5 text-right font-medium text-slate-300">
                        {formatCurrency(row.employee.dailyRate)}
                      </td>

                      <td className="p-3.5 text-center font-bold text-emerald-400">
                        {row.hadirCount}
                      </td>

                      <td className="p-3.5 text-center font-bold text-rose-400">
                        {row.alpaCount}
                      </td>

                      <td className="p-3.5 text-right font-medium text-slate-300">
                        {formatCurrency(row.grossPay)}
                      </td>

                      <td className="p-3.5 text-right font-semibold text-rose-400">
                        {row.timesheet.deductionAmount > 0
                          ? `- ${formatCurrency(row.timesheet.deductionAmount)}`
                          : 'Rp 0'}
                      </td>

                      <td className="p-3.5 text-right font-black text-amber-400 text-sm">
                        {formatCurrency(row.netPay)}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            id={`print-slip-btn-${row.employee.id}`}
                            onClick={() => setSlipEmployee(row)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-[11px] rounded-lg transition-colors border border-slate-700 cursor-pointer"
                            title="Buka Pratinjau Slip Gaji"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <button
                            id={`direct-download-slip-btn-${row.employee.id}`}
                            onClick={() => {
                              const empProj = projects.find((p) => p.id === row.employee.projectId);
                              generateIndividualPayslipPDF({
                                employee: row.employee,
                                timesheet: row.timesheet,
                                project: empProj,
                                month: reportMonth,
                                year: reportYear,
                                customPeriodLabel: `PERIODE: ${periodLabel}`,
                                customStats: {
                                  hadir: row.hadirCount,
                                  alpa: row.alpaCount,
                                  izin: row.izinCount,
                                  off: row.offCount,
                                  deductionAmount: row.deductionAmount,
                                  deductionReason: row.deductionReason,
                                  bonusAmount: row.bonusAmount,
                                  grossPay: row.grossPay,
                                  netPay: row.netPay
                                }
                              });
                            }}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-bold text-[11px] rounded-lg transition-colors border border-emerald-700/50 cursor-pointer"
                            title="Download langsung file PDF Slip Gaji Karyawan"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                            <span>PDF</span>
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

      {/* Slip Gaji Modal / Print Preview */}
      {slipEmployee && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header Controls (Hidden when printing) */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Pratinjau & Cetak Slip Gaji</h3>
                  <p className="text-[11px] text-slate-400">Slip penghasilan resmi personil cleaning service</p>
                </div>
              </div>
              <button
                onClick={() => setSlipEmployee(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Printable Slip Paper Area (Pure White Background, Full Color High-Contrast) */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex justify-center">
              <div
                id="printable-payslip-sheet"
                className="bg-white text-slate-950 w-full p-6 rounded-2xl shadow-xl space-y-4 border border-slate-200 text-xs font-sans"
              >
                {/* Kop Slip Resmi Sesuai Master Identitas & Legalitas */}
                {(() => {
                  const comp = storageService.getCompanyProfile();
                  return (
                    <div className="space-y-3 border-b-2 border-slate-900 pb-3">
                      <OfficialLetterhead
                        company={comp}
                        departmentSubtitle="Divisi Operasional & Manajemen Keuangan Personil (Payroll)"
                        showLegal={true}
                        showBankInfo={false}
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span className="font-mono text-[10.5px] font-semibold">
                          DOKUMEN RESMI PENGGAJIAN • KODE: <strong className="text-slate-800">{slipEmployee.employee.nik}</strong>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-300 uppercase">
                            SLIP GAJI RESMI
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 font-mono">
                            {periodLabel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Employee Info Header */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2 bg-amber-50/80 p-2 rounded-lg border border-amber-200 flex items-center justify-between text-[11px]">
                    <span className="text-amber-950 font-bold">Periode Cut-Off (Buka & Tutup Buku):</span>
                    <span className="font-bold font-mono text-amber-900">
                      {periodLabel} ({activePeriodDays.length} Hari Kerja)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Nama Personil:</span>
                    <div className="font-bold text-slate-900 text-sm">{slipEmployee.employee.name}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">NIK / Kode:</span>
                    <div className="font-bold text-slate-900 font-mono">{slipEmployee.employee.nik}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Posisi / Jabatan:</span>
                    <div className="text-slate-800 font-medium">{slipEmployee.employee.position}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Lokasi Penempatan:</span>
                    <div className="text-slate-800 font-medium truncate">
                      {projects.find((p) => p.id === slipEmployee.employee.projectId)?.name || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Shift Kerja:</span>
                    <div className="text-slate-800">{slipEmployee.employee.shift}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Rekening Payroll:</span>
                    <div className="text-slate-800 font-mono text-[11px]">
                      {slipEmployee.employee.bankName} - {slipEmployee.employee.bankAccount || '-'}
                    </div>
                  </div>
                </div>

                {/* Presensi Summary Badges */}
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg">
                    <span className="text-emerald-700 font-bold block">HADIR</span>
                    <span className="text-xs font-black text-emerald-900">{slipEmployee.hadirCount} Hari</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-1.5 rounded-lg">
                    <span className="text-rose-700 font-bold block">ALPA</span>
                    <span className="text-xs font-black text-rose-900">{slipEmployee.alpaCount} Hari</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-1.5 rounded-lg">
                    <span className="text-amber-700 font-bold block">IZIN</span>
                    <span className="text-xs font-black text-amber-900">{slipEmployee.izinCount} Hari</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 p-1.5 rounded-lg">
                    <span className="text-slate-600 font-bold block">RATE / HARI</span>
                    <span className="text-xs font-black text-slate-900 font-mono">{formatCurrency(slipEmployee.employee.dailyRate)}</span>
                  </div>
                </div>

                {/* Calculations Breakdown */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                  <div className="font-bold text-slate-900 text-xs pb-1 border-b border-slate-200 flex justify-between">
                    <span>Rincian Pendapatan (Penghasilan):</span>
                    <span>Jumlah (Rp)</span>
                  </div>
                  <div className="flex justify-between text-slate-800">
                    <span>
                      Gaji Pokok ({slipEmployee.hadirCount} hari x {formatCurrency(slipEmployee.employee.dailyRate)}):
                    </span>
                    <span className="font-semibold text-slate-950 font-mono">
                      {formatCurrency(slipEmployee.hadirCount * slipEmployee.employee.dailyRate)}
                    </span>
                  </div>
                  {slipEmployee.timesheet.bonusAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Insentif / Tambahan Lembur:</span>
                      <span className="font-semibold font-mono">
                        +{formatCurrency(slipEmployee.timesheet.bonusAmount)}
                      </span>
                    </div>
                  )}

                  <div className="font-bold text-slate-900 text-xs pt-2 pb-1 border-b border-slate-200">
                    Rincian Potongan:
                  </div>
                  {slipEmployee.timesheet.deductionAmount > 0 ? (
                    <div className="flex justify-between text-rose-700">
                      <span>
                        Potongan Denda / Absensi ({slipEmployee.timesheet.deductionReason || 'Disiplin'}):
                      </span>
                      <span className="font-semibold font-mono">
                        -{formatCurrency(slipEmployee.timesheet.deductionAmount)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">Tidak ada potongan denda</div>
                  )}

                  {/* Net Total Take Home Pay */}
                  <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span className="font-black text-slate-950 text-xs sm:text-sm">TOTAL GAJI BERSIH (TAKE HOME PAY):</span>
                    <span className="text-base font-black text-slate-950 font-mono">
                      {formatCurrency(slipEmployee.netPay)}
                    </span>
                  </div>
                </div>

                {/* Signatures & Footer Note */}
                {(() => {
                  const comp = storageService.getCompanyProfile();
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4 pt-3 text-center text-slate-600 text-[10px]">
                        <div className="space-y-8">
                          <div>
                            <p>Penerima,</p>
                            <p className="font-bold text-slate-900">{slipEmployee.employee.name}</p>
                          </div>
                          <div className="border-b border-slate-400 w-28 mx-auto"></div>
                          <p>( Karyawan Bersangkutan )</p>
                        </div>
                        <div className="space-y-8">
                          <div>
                            <p>{comp.financeManagerTitle || 'Petugas Payroll / HRD,'}</p>
                            <p className="font-bold text-slate-900">{comp.name}</p>
                          </div>
                          <div className="border-b border-slate-400 w-28 mx-auto"></div>
                          <p>( {comp.financeManagerName || 'Finance & HR Dept'} )</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400">
                        {comp.letterheadFooterNote || `Dokumen ini sah dan diterbitkan secara digital oleh Sistem Payroll ${comp.name}.`}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-2.5 no-print">
              <button
                onClick={() => setSlipEmployee(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>

              {/* Direct PDF Download */}
              <button
                id="download-single-slip-pdf-btn"
                onClick={() => {
                  const empProj = projects.find((p) => p.id === slipEmployee.employee.projectId);
                  generateIndividualPayslipPDF({
                    employee: slipEmployee.employee,
                    timesheet: slipEmployee.timesheet,
                    project: empProj,
                    month: reportMonth,
                    year: reportYear,
                    customPeriodLabel: `PERIODE: ${periodLabel}`,
                    customStats: {
                      hadir: slipEmployee.hadirCount,
                      alpa: slipEmployee.alpaCount,
                      izin: slipEmployee.izinCount,
                      off: slipEmployee.offCount,
                      deductionAmount: slipEmployee.deductionAmount,
                      deductionReason: slipEmployee.deductionReason,
                      bonusAmount: slipEmployee.bonusAmount,
                      grossPay: slipEmployee.grossPay,
                      netPay: slipEmployee.netPay
                    }
                  });
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Slip</span>
              </button>

              {/* Browser Print */}
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-600 flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cetak (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
