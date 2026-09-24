import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  HelpCircle,
  Download,
  Filter,
  Search,
  DollarSign,
  Layers,
  Sparkles,
  Info,
  Edit3,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Printer,
  Smartphone,
  Table,
  UserCheck,
  Calendar as CalendarIcon,
  Clock,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import {
  Project,
  Employee,
  TimesheetMonthRecord,
  AttendanceStatus,
  UserRole,
  CompanyProfile
} from '../../types';
import { storageService } from '../../services/storageService';
import {
  formatCurrency,
  getDaysInMonth,
  getDayName,
  isWeekend,
  getMonthName,
  downloadCSV
} from '../../utils/formatters';
import { generateTimesheetPDF } from '../../utils/pdfExport';
import { OfficialLetterhead } from '../common/OfficialLetterhead';

export interface PeriodDay {
  day: number;
  month: number;
  year: number;
  dateKey: string;      // YYYY-MM-DD
  dmy: string;          // DD-MM-YYYY
  shortLabel: string;   // D/M
  dayName: string;      // Jum, Sab, etc.
  isWeekend: boolean;
}

interface EagleTimesheetProps {
  projects: Project[];
  employees: Employee[];
  timesheets: TimesheetMonthRecord[];
  selectedProjectId: string;
  onUpdateTimesheets: (updated: TimesheetMonthRecord[]) => void;
  userRole: UserRole;
}

export const EagleTimesheet: React.FC<EagleTimesheetProps> = ({
  projects = [],
  employees = [],
  timesheets = [],
  selectedProjectId = 'ALL',
  onUpdateTimesheets,
  userRole
}) => {
  // Shared Cut-off Settings (Sinkronisasi dengan Rekap Laporan & Payroll Slip Center)
  const initialCutoff = useMemo(() => storageService.getTimesheetCutoffSettings(), []);

  // Mode Periode: Buka-Tutup Buku (Cut-off) atau Standar Kalender (1-31)
  const [isCutoffMode, setIsCutoffMode] = useState<boolean>(initialCutoff.isCutoffMode);

  // Filter Tanggal Buka Timesheet (dd - mm - yyyy): Default 21 - 8 - 2026
  const [startDay, setStartDay] = useState<number>(initialCutoff.startDay);
  const [startMonth, setStartMonth] = useState<number>(initialCutoff.startMonth);
  const [startYear, setStartYear] = useState<number>(initialCutoff.startYear);

  // Filter Tanggal Tutup Timesheet (dd - mm - yyyy): Default 20 - 9 - 2026
  const [endDay, setEndDay] = useState<number>(initialCutoff.endDay);
  const [endMonth, setEndMonth] = useState<number>(initialCutoff.endMonth);
  const [endYear, setEndYear] = useState<number>(initialCutoff.endYear);

  // Calendar month state (digunakan saat navigasi bulan atau non-cutoff mode)
  const [currentMonth, setCurrentMonth] = useState<number>(initialCutoff.calendarMonth);
  const [currentYear, setCurrentYear] = useState<number>(initialCutoff.calendarYear);

  // Sync cut-off settings to storageService for real-time connection with Payroll Slip Center
  useEffect(() => {
    storageService.saveTimesheetCutoffSettings({
      isCutoffMode,
      startDay,
      startMonth,
      startYear,
      endDay,
      endMonth,
      endYear,
      calendarMonth: currentMonth,
      calendarYear: currentYear
    });
  }, [isCutoffMode, startDay, startMonth, startYear, endDay, endMonth, endYear, currentMonth, currentYear]);

  // Listen to external cut-off updates from ReportingCenter
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
      if (s.calendarMonth) setCurrentMonth(s.calendarMonth);
      if (s.calendarYear) setCurrentYear(s.calendarYear);
    };

    window.addEventListener('timesheet_cutoff_updated', handleCutoffUpdate);
    return () => {
      window.removeEventListener('timesheet_cutoff_updated', handleCutoffUpdate);
    };
  }, []);

  // Mobile / View Mode: 'daily' (Mobile-Friendly Roll-Call) or 'matrix' (Grid Table)
  const [viewMode, setViewMode] = useState<'daily' | 'matrix'>('daily');
  const [activeDailyDateKey, setActiveDailyDateKey] = useState<string>('2026-08-25');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [selectedDayToBulkKey, setSelectedDayToBulkKey] = useState<string>('');

  // Deduction Modal State
  const [editingDeduction, setEditingDeduction] = useState<{
    employee: Employee;
    targetMonth: number;
    targetYear: number;
    amount: number;
    reason: string;
    bonus: number;
  } | null>(null);

  // PDF Export / Print Modal State
  const [showPDFModal, setShowPDFModal] = useState<boolean>(false);
  const [pdfSelectedProjectId, setPdfSelectedProjectId] = useState<string>(selectedProjectId || 'ALL');

  // Status legend modal or tooltip
  const [showLegend, setShowLegend] = useState(false);

  // Helper format 2-digit padding
  const pad2 = (n: number) => String(n).padStart(2, '0');

  // Helper format dd-mm-yyyy
  const formatDMY = (d: number, m: number, y: number) => `${pad2(d)} - ${pad2(m)} - ${y}`;

  // Generate daftar hari lengkap dalam periode aktif (Cut-off range atau 1 Bulan Penuh)
  const activePeriodDays: PeriodDay[] = useMemo(() => {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    if (!isCutoffMode) {
      const daysInM = getDaysInMonth(currentYear, currentMonth);
      return Array.from({ length: daysInM }, (_, i) => {
        const d = i + 1;
        const dt = new Date(currentYear, currentMonth - 1, d);
        const dayOfWeek = dt.getDay();
        return {
          day: d,
          month: currentMonth,
          year: currentYear,
          dateKey: `${currentYear}-${pad2(currentMonth)}-${pad2(d)}`,
          dmy: `${pad2(d)} - ${pad2(currentMonth)} - ${currentYear}`,
          shortLabel: String(d),
          dayName: dayNames[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
      });
    }

    // Cut-off Mode: Dari (startDay, startMonth, startYear) sampai (endDay, endMonth, endYear)
    const list: PeriodDay[] = [];
    const startDt = new Date(startYear, startMonth - 1, startDay);
    const endDt = new Date(endYear, endMonth - 1, endDay);

    let cur = startDt <= endDt ? new Date(startDt) : new Date(endDt);
    const target = startDt <= endDt ? new Date(endDt) : new Date(startDt);

    let safetyCount = 0;
    while (cur <= target && safetyCount < 95) {
      safetyCount++;
      const d = cur.getDate();
      const m = cur.getMonth() + 1;
      const y = cur.getFullYear();
      const dayOfWeek = cur.getDay();

      list.push({
        day: d,
        month: m,
        year: y,
        dateKey: `${y}-${pad2(m)}-${pad2(d)}`,
        dmy: `${pad2(d)} - ${pad2(m)} - ${y}`,
        shortLabel: `${d}/${m}`,
        dayName: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });

      cur.setDate(cur.getDate() + 1);
    }

    return list;
  }, [isCutoffMode, currentMonth, currentYear, startDay, startMonth, startYear, endDay, endMonth, endYear]);

  // Object hari yang sedang aktif pada Absensi Harian (Mobile Roll-Call)
  const activeDayObj: PeriodDay = useMemo(() => {
    if (activePeriodDays.length === 0) {
      return {
        day: 25,
        month: 8,
        year: 2026,
        dateKey: '2026-08-25',
        dmy: '25 - 08 - 2026',
        shortLabel: '25/8',
        dayName: 'Sel',
        isWeekend: false
      };
    }
    const found = activePeriodDays.find((p) => p.dateKey === activeDailyDateKey);
    return found || activePeriodDays[0];
  }, [activePeriodDays, activeDailyDateKey]);

  // Sync default bulk day ke hari pertama atau active day
  const effectiveBulkDayKey = selectedDayToBulkKey || activeDayObj.dateKey;

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (emp.status === 'Resign') return false;
      if (selectedProjectId !== 'ALL' && emp.projectId !== selectedProjectId) return false;
      if (filterShift !== 'ALL' && !emp.shift.includes(filterShift)) return false;
      if (filterPosition !== 'ALL' && emp.position !== filterPosition) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.nik.toLowerCase().includes(q) ||
          emp.position.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, selectedProjectId, filterShift, filterPosition, searchQuery]);

  // Helper untuk membaca / membuat TimesheetMonthRecord pada bulan & tahun tertentu
  const getRecordForEmployeeMonth = (employeeId: string, month: number, year: number): TimesheetMonthRecord => {
    const existing = timesheets.find(
      (ts) => ts.employeeId === employeeId && ts.month === month && ts.year === year
    );
    if (existing) return existing;

    const emp = employees.find((e) => e.id === employeeId);
    return {
      id: `ts-${employeeId}-${year}-${month}`,
      employeeId,
      projectId: emp?.projectId || '',
      month,
      year,
      days: {},
      deductionAmount: 0,
      deductionReason: '',
      bonusAmount: 0,
      notes: ''
    };
  };

  // Helper membaca status presensi karyawan pada hari, bulan, dan tahun tertentu
  const getStatusForEmployeeDate = (
    employeeId: string,
    day: number,
    month: number,
    year: number
  ): AttendanceStatus | '' => {
    const rec = timesheets.find(
      (ts) => ts.employeeId === employeeId && ts.month === month && ts.year === year
    );
    return rec?.days[day] || '';
  };

  // Set status presensi langsung (untuk tombol touch mobile Hadir, Alpa, Izin, Off)
  const handleSetStatusDirect = (
    employeeId: string,
    day: number,
    month: number,
    year: number,
    newStatus: AttendanceStatus | ''
  ) => {
    const currentRecord = getRecordForEmployeeMonth(employeeId, month, year);
    const existingStatus = currentRecord.days[day] || '';
    const finalStatus = existingStatus === newStatus ? '' : newStatus;

    const newDays = { ...currentRecord.days };
    if (finalStatus === '') {
      delete newDays[day];
    } else {
      newDays[day] = finalStatus as AttendanceStatus;
    }

    const updatedRecord: TimesheetMonthRecord = {
      ...currentRecord,
      days: newDays
    };

    const nextTimesheets = [...timesheets];
    const existingIdx = nextTimesheets.findIndex(
      (ts) => ts.employeeId === employeeId && ts.month === month && ts.year === year
    );

    if (existingIdx >= 0) {
      nextTimesheets[existingIdx] = updatedRecord;
    } else {
      nextTimesheets.push(updatedRecord);
    }

    onUpdateTimesheets(nextTimesheets);
  };

  // Siklus status presensi saat klik sel: '' -> 'H' -> 'A' -> 'I' -> 'O' -> ''
  const handleCellClick = (employeeId: string, day: number, month: number, year: number) => {
    const currentRecord = getRecordForEmployeeMonth(employeeId, month, year);
    const currentStatus = currentRecord.days[day] || '';

    let nextStatus: AttendanceStatus = 'H';
    if (currentStatus === '') nextStatus = 'H';
    else if (currentStatus === 'H') nextStatus = 'A';
    else if (currentStatus === 'A') nextStatus = 'I';
    else if (currentStatus === 'I') nextStatus = 'O';
    else if (currentStatus === 'O') nextStatus = '';

    const newDays = { ...currentRecord.days };
    if (nextStatus === '') {
      delete newDays[day];
    } else {
      newDays[day] = nextStatus;
    }

    const updatedRecord: TimesheetMonthRecord = {
      ...currentRecord,
      days: newDays
    };

    const nextTimesheets = [...timesheets];
    const existingIdx = nextTimesheets.findIndex(
      (ts) => ts.employeeId === employeeId && ts.month === month && ts.year === year
    );

    if (existingIdx >= 0) {
      nextTimesheets[existingIdx] = updatedRecord;
    } else {
      nextTimesheets.push(updatedRecord);
    }

    onUpdateTimesheets(nextTimesheets);
  };

  // Bulk action: Hadirkan semua personil aktif untuk tanggal tertentu
  const handleBulkMarkPresent = (day: number, month: number, year: number) => {
    const nextTimesheets = [...timesheets];

    filteredEmployees.forEach((emp) => {
      const rec = getRecordForEmployeeMonth(emp.id, month, year);
      const updatedRec: TimesheetMonthRecord = {
        ...rec,
        days: {
          ...rec.days,
          [day]: 'H'
        }
      };

      const existingIdx = nextTimesheets.findIndex(
        (ts) => ts.employeeId === emp.id && ts.month === month && ts.year === year
      );

      if (existingIdx >= 0) {
        nextTimesheets[existingIdx] = updatedRec;
      } else {
        nextTimesheets.push(updatedRec);
      }
    });

    onUpdateTimesheets(nextTimesheets);
  };

  // Bulk action: Kosongkan presensi tanggal tertentu
  const handleBulkClearDay = (day: number, month: number, year: number) => {
    const nextTimesheets = [...timesheets];

    filteredEmployees.forEach((emp) => {
      const rec = getRecordForEmployeeMonth(emp.id, month, year);
      const newDays = { ...rec.days };
      delete newDays[day];

      const updatedRec: TimesheetMonthRecord = {
        ...rec,
        days: newDays
      };

      const existingIdx = nextTimesheets.findIndex(
        (ts) => ts.employeeId === emp.id && ts.month === month && ts.year === year
      );

      if (existingIdx >= 0) {
        nextTimesheets[existingIdx] = updatedRec;
      } else {
        nextTimesheets.push(updatedRec);
      }
    });

    onUpdateTimesheets(nextTimesheets);
  };

  // Perhitungan statistik baris (Hadir, Alpha, Izin, Potongan, Gaji Bersih) mengikuti tanggal yang dipilih
  const calculateRowStats = (employee: Employee) => {
    let hadir = 0;
    let alpa = 0;
    let izin = 0;
    let off = 0;

    // Hitung presensi tepat di dalam rentang tanggal aktif
    activePeriodDays.forEach((pDay) => {
      const st = getStatusForEmployeeDate(employee.id, pDay.day, pDay.month, pDay.year);
      if (st === 'H') hadir++;
      else if (st === 'A') alpa++;
      else if (st === 'I') izin++;
      else if (st === 'O') off++;
    });

    // Kumpulkan bulan-bulan unik dalam rentang periode untuk agregasi potongan & bonus
    const distinctMonths = new Set<string>();
    activePeriodDays.forEach((pDay) => {
      distinctMonths.add(`${pDay.year}-${pDay.month}`);
    });

    let deduction = 0;
    let bonus = 0;
    const deductionReasons: string[] = [];

    distinctMonths.forEach((key) => {
      const [y, m] = key.split('-').map(Number);
      const rec = timesheets.find(
        (ts) => ts.employeeId === employee.id && ts.month === m && ts.year === y
      );
      if (rec) {
        if (rec.deductionAmount) deduction += rec.deductionAmount;
        if (rec.bonusAmount) bonus += rec.bonusAmount;
        if (rec.deductionReason) deductionReasons.push(rec.deductionReason);
      }
    });

    const grossPay = hadir * employee.dailyRate + bonus;
    const netPay = Math.max(0, grossPay - deduction);

    return {
      hadir,
      alpa,
      izin,
      off,
      grossPay,
      deduction,
      bonus,
      deductionReason: deductionReasons.join('; '),
      netPay
    };
  };

  // Statistik untuk hari aktif di mode Absensi Harian (Mobile Roll-Call)
  const dailyStats = useMemo(() => {
    let hadir = 0;
    let alpa = 0;
    let izin = 0;
    let off = 0;
    let unrecorded = 0;

    filteredEmployees.forEach((emp) => {
      const st = getStatusForEmployeeDate(emp.id, activeDayObj.day, activeDayObj.month, activeDayObj.year);
      if (st === 'H') hadir++;
      else if (st === 'A') alpa++;
      else if (st === 'I') izin++;
      else if (st === 'O') off++;
      else unrecorded++;
    });

    return { hadir, alpa, izin, off, unrecorded, total: filteredEmployees.length };
  }, [filteredEmployees, timesheets, activeDayObj]);

  // Ringkasan konsolidasi KPI finansial & kehadiran untuk seluruh karyawan dalam periode terpilih
  const summary = useMemo(() => {
    let totalPayrollAll = 0;
    let totalDeductionsAll = 0;
    let totalBonusAll = 0;
    let totalHadirAll = 0;
    let totalAlpaAll = 0;
    let totalIzinAll = 0;

    filteredEmployees.forEach((emp) => {
      const stats = calculateRowStats(emp);
      totalPayrollAll += stats.netPay;
      totalDeductionsAll += stats.deduction;
      totalBonusAll += stats.bonus;
      totalHadirAll += stats.hadir;
      totalAlpaAll += stats.alpa;
      totalIzinAll += stats.izin;
    });

    return {
      totalEmployees: filteredEmployees.length,
      totalPayrollAll,
      totalDeductionsAll,
      totalBonusAll,
      totalHadirAll,
      totalAlpaAll,
      totalIzinAll
    };
  }, [filteredEmployees, timesheets, activePeriodDays]);

  // Navigasi hari pada Absensi Harian (Kemarin & Besok)
  const handlePrevDay = () => {
    const currentIndex = activePeriodDays.findIndex((p) => p.dateKey === activeDayObj.dateKey);
    if (currentIndex > 0) {
      setActiveDailyDateKey(activePeriodDays[currentIndex - 1].dateKey);
    }
  };

  const handleNextDay = () => {
    const currentIndex = activePeriodDays.findIndex((p) => p.dateKey === activeDayObj.dateKey);
    if (currentIndex >= 0 && currentIndex < activePeriodDays.length - 1) {
      setActiveDailyDateKey(activePeriodDays[currentIndex + 1].dateKey);
    }
  };

  // Navigasi Bulan Cepat
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
      if (isCutoffMode) {
        setStartMonth(11);
        setStartYear(currentYear - 1);
        setEndMonth(12);
        setEndYear(currentYear - 1);
      }
    } else {
      const newM = currentMonth - 1;
      setCurrentMonth(newM);
      if (isCutoffMode) {
        const prevM = newM === 1 ? 12 : newM - 1;
        const prevY = newM === 1 ? currentYear - 1 : currentYear;
        setStartMonth(prevM);
        setStartYear(prevY);
        setEndMonth(newM);
        setEndYear(currentYear);
      }
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
      if (isCutoffMode) {
        setStartMonth(12);
        setStartYear(currentYear);
        setEndMonth(1);
        setEndYear(currentYear + 1);
      }
    } else {
      const newM = currentMonth + 1;
      setCurrentMonth(newM);
      if (isCutoffMode) {
        setStartMonth(currentMonth);
        setStartYear(currentYear);
        setEndMonth(newM);
        setEndYear(currentYear);
      }
    }
  };

  // Simpan potongan / denda & lembur
  const handleSaveDeduction = () => {
    if (!editingDeduction) return;

    const { employee, targetMonth, targetYear, amount, reason, bonus } = editingDeduction;
    const currentRec = getRecordForEmployeeMonth(employee.id, targetMonth, targetYear);

    const updatedRec: TimesheetMonthRecord = {
      ...currentRec,
      deductionAmount: Number(amount) || 0,
      deductionReason: reason,
      bonusAmount: Number(bonus) || 0
    };

    const nextTimesheets = [...timesheets];
    const existingIdx = nextTimesheets.findIndex(
      (ts) => ts.employeeId === employee.id && ts.month === targetMonth && ts.year === targetYear
    );

    if (existingIdx >= 0) {
      nextTimesheets[existingIdx] = updatedRec;
    } else {
      nextTimesheets.push(updatedRec);
    }

    onUpdateTimesheets(nextTimesheets);
    setEditingDeduction(null);
  };

  // Tombol Pintas Preset Cut-Off Periode
  const applyPreset21to20 = () => {
    setIsCutoffMode(true);
    setStartDay(21);
    setStartMonth(8);
    setStartYear(2026);
    setEndDay(20);
    setEndMonth(9);
    setEndYear(2026);
    setActiveDailyDateKey('2026-08-21');
  };

  const applyPreset26to25 = () => {
    setIsCutoffMode(true);
    setStartDay(26);
    setStartMonth(7);
    setStartYear(2026);
    setEndDay(25);
    setEndMonth(8);
    setEndYear(2026);
    setActiveDailyDateKey('2026-07-26');
  };

  const applyPresetFullMonth = () => {
    setIsCutoffMode(true);
    const lastDay = getDaysInMonth(currentYear, currentMonth);
    setStartDay(1);
    setStartMonth(currentMonth);
    setStartYear(currentYear);
    setEndDay(lastDay);
    setEndMonth(currentMonth);
    setEndYear(currentYear);
    setActiveDailyDateKey(`${currentYear}-${pad2(currentMonth)}-01`);
  };

  // Export CSV sesuai rentang tanggal yang dipilih
  const handleExportCSV = () => {
    const headers = [
      'NIK',
      'Nama Karyawan',
      'Posisi',
      'Lokasi Proyek',
      'Shift',
      'Rate Harian (Rp)',
      ...activePeriodDays.map((d) => `Tgl ${d.dmy}`),
      'Total Hadir',
      'Total Alpa',
      'Total Izin',
      'Potongan (Rp)',
      'Alasan Potongan',
      'Insentif / Lembur (Rp)',
      'Gaji Bersih / Take Home Pay (Rp)'
    ];

    const rows: (string | number)[][] = [headers];

    filteredEmployees.forEach((emp) => {
      const stats = calculateRowStats(emp);
      const proj = projects.find((p) => p.id === emp.projectId);

      const dayCells = activePeriodDays.map((pDay) => {
        const st = getStatusForEmployeeDate(emp.id, pDay.day, pDay.month, pDay.year);
        return st || '-';
      });

      rows.push([
        emp.nik,
        emp.name,
        emp.position,
        proj?.name || '-',
        emp.shift,
        emp.dailyRate,
        ...dayCells,
        stats.hadir,
        stats.alpa,
        stats.izin,
        stats.deduction,
        stats.deductionReason || '',
        stats.bonus,
        stats.netPay
      ]);
    });

    const startStr = `${startDay}-${startMonth}-${startYear}`;
    const endStr = `${endDay}-${endMonth}-${endYear}`;
    const filename = `Timesheet_Rajawali_CutOff_${startStr}_sd_${endStr}.csv`;
    downloadCSV(filename, rows);
  };

  return (
    <div className="space-y-4">
      {/* Header & Main Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xl space-y-4">
        {/* Top Header: Title & Quick Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <CalendarCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Eagle Timesheet Matrix
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {summary.totalEmployees} Personil
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30 hidden sm:inline-block">
                  {activePeriodDays.length} Hari Aktif
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Sistem absensi harian dan perhitungan payroll terintegrasi dengan filter buka & tutup buku.
              </p>
            </div>
          </div>

          {/* View Mode Toggle, Month Quick Selector & Export Buttons */}
          <div className="flex items-center flex-wrap gap-2 justify-between lg:justify-end">
            {/* View Mode Toggle: Absensi Harian vs Matriks 31 Hari */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                id="view-mode-daily-btn"
                onClick={() => setViewMode('daily')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'daily'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Absensi Harian</span>
              </button>
              <button
                id="view-mode-matrix-btn"
                onClick={() => setViewMode('matrix')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'matrix'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Matriks Grid</span>
              </button>
            </div>

            {/* Quick Month Navigator */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                id="prev-month-btn"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2.5 py-1 font-bold text-xs sm:text-sm text-amber-300 min-w-[110px] text-center">
                {getMonthName(currentMonth)} {currentYear}
              </div>
              <button
                id="next-month-btn"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Export CSV */}
            <button
              id="export-timesheet-csv-btn"
              onClick={handleExportCSV}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              title="Unduh Rekap Format CSV Periode Ini"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Export CSV</span>
            </button>

            {/* Download PDF Button */}
            <button
              id="open-pdf-report-btn"
              onClick={() => {
                setPdfSelectedProjectId(selectedProjectId !== 'ALL' ? selectedProjectId : 'ALL');
                setShowPDFModal(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
              title="Download Rekap Payroll PDF Resmi Standar A4"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FITUR BARU: PILIHAN FILTER TANGGAL, BULAN & TAHUN BUKA & TUTUP BUKU       */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/90 border-2 border-amber-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3">
          {/* Card Header & Badge Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CalendarRange className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-white">
                Periode Buka & Tutup Buku Timesheet (Cut-Off Payroll)
              </span>
            </div>

            {/* Active Period Badge Format: dd-mm-yyyy sampai dd-mm-yyyy */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-400 hidden md:inline">
                Periode Terpilih:
              </span>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 font-black text-xs">
                <span>Buka: {formatDMY(startDay, startMonth, startYear)}</span>
                <span className="text-slate-400">s/d</span>
                <span>Tutup: {formatDMY(endDay, endMonth, endYear)}</span>
              </div>
            </div>
          </div>

          {/* Form Filter Dua Panel: Buka (Start) & Tutup (End) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Panel 1: Buka Timesheet (Tanggal Mulai) */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    🟢 Buka Timesheet (Tanggal Mulai)
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-emerald-300 border border-emerald-500/20">
                  {formatDMY(startDay, startMonth, startYear)}
                </span>
              </div>

              {/* Tiga Selector Manual: Hari, Bulan, Tahun + Datepicker Kalender */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs">
                {/* Hari (dd) */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Hari (dd):
                  </label>
                  <select
                    id="timesheet-start-day"
                    value={startDay}
                    onChange={(e) => {
                      setStartDay(Number(e.target.value));
                      setIsCutoffMode(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d} className="bg-slate-900">
                        {pad2(d)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bulan (mm) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Bulan (mm):
                  </label>
                  <select
                    id="timesheet-start-month"
                    value={startMonth}
                    onChange={(e) => {
                      setStartMonth(Number(e.target.value));
                      setIsCutoffMode(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m} className="bg-slate-900">
                        {pad2(m)} - {getMonthName(m)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tahun (yyyy) */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Tahun (yyyy):
                  </label>
                  <select
                    id="timesheet-start-year"
                    value={startYear}
                    onChange={(e) => {
                      setStartYear(Number(e.target.value));
                      setIsCutoffMode(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y} className="bg-slate-900">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Input Kalender Langsung */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800/60">
                <span>Pilih via Kalender:</span>
                <input
                  id="timesheet-start-date-picker"
                  type="date"
                  value={`${startYear}-${pad2(startMonth)}-${pad2(startDay)}`}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setStartYear(y);
                    setStartMonth(m);
                    setStartDay(d);
                    setIsCutoffMode(true);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Panel 2: Tutup Timesheet (Tanggal Selesai) */}
            <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                  <span className="text-xs font-black text-rose-400 uppercase tracking-wide">
                    🔴 Tutup Timesheet (Tanggal Selesai)
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-rose-300 border border-rose-500/20">
                  {formatDMY(endDay, endMonth, endYear)}
                </span>
              </div>

              {/* Tiga Selector Manual: Hari, Bulan, Tahun + Datepicker Kalender */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs">
                {/* Hari (dd) */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Hari (dd):
                  </label>
                  <select
                    id="timesheet-end-day"
                    value={endDay}
                    onChange={(e) => {
                      setEndDay(Number(e.target.value));
                      setIsCutoffMode(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-bold focus:border-rose-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d} className="bg-slate-900">
                        {pad2(d)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bulan (mm) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Bulan (mm):
                  </label>
                  <select
                    id="timesheet-end-month"
                    value={endMonth}
                    onChange={(e) => {
                      setEndMonth(Number(e.target.value));
                      setIsCutoffMode(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-bold focus:border-rose-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m} className="bg-slate-900">
                        {pad2(m)} - {getMonthName(m)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tahun (yyyy) */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Tahun (yyyy):
                  </label>
                  <select
                    id="timesheet-end-year"
                    value={endYear}
                    onChange={(e) => {
                      setEndYear(Number(e.target.value));
                      setIsCutoffMode(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-bold focus:border-rose-500 focus:outline-none cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y} className="bg-slate-900">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Input Kalender Langsung */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800/60">
                <span>Pilih via Kalender:</span>
                <input
                  id="timesheet-end-date-picker"
                  type="date"
                  value={`${endYear}-${pad2(endMonth)}-${pad2(endDay)}`}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setEndYear(y);
                    setEndMonth(m);
                    setEndDay(d);
                    setIsCutoffMode(true);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-rose-300 font-mono focus:outline-none focus:border-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Preset Periode Cepat & Keterangan Otomatisasi */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Preset Cepat:</span>
              <button
                id="preset-cutoff-21-20-btn"
                onClick={applyPreset21to20}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[11px] transition cursor-pointer"
                title="Sesuai Permintaan: Buka 21-8-2026 sampai 20-9-2026"
              >
                ⚡ Cut-Off 21 - 20 (21-08-2026 s/d 20-09-2026)
              </button>

              <button
                id="preset-cutoff-26-25-btn"
                onClick={applyPreset26to25}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
              >
                ⚡ Cut-Off 26 - 25 (26-07-2026 s/d 25-08-2026)
              </button>

              <button
                id="preset-full-month-btn"
                onClick={applyPresetFullMonth}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
              >
                📅 1 Bulan Kalender (1 - 31)
              </button>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                ✓ Otomatis Aktif
              </span>
              <span>Kolom Hadir, Alpa, Izin, Potongan & Gaji Bersih mengikuti tanggal ini</span>
            </div>
          </div>
        </div>

        {/* Legend Drawer Trigger */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300">Status Presensi:</span>
            <span className="text-emerald-400 font-bold">H: Hadir</span> • 
            <span className="text-rose-400 font-bold">A: Alpa</span> • 
            <span className="text-amber-400 font-bold">I: Izin</span> • 
            <span className="text-slate-400 font-bold">OFF: Libur</span>
          </div>
          <button
            id="show-legend-btn"
            onClick={() => setShowLegend(!showLegend)}
            className="text-amber-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Panduan & Legend</span>
          </button>
        </div>

        {/* Legend Drawer (Toggleable) */}
        {showLegend && (
          <div className="mt-2 pt-2 border-t border-slate-800 bg-slate-950/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  ✓
                </span>
                <span className="text-slate-300"><b>Hadir (H)</b>: Gaji Penuh Sesuai Rate Harian</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  ✗
                </span>
                <span className="text-slate-300"><b>Alpa (A)</b>: Mangkir / Tanpa Keterangan</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm">
                  !
                </span>
                <span className="text-slate-300"><b>Izin (I)</b>: Sakit / Izin Dinas</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs shadow-sm">
                  OFF
                </span>
                <span className="text-slate-300"><b>Off (O)</b>: Jadwal Roster Libur</span>
              </div>
            </div>
            <button
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Tutup ✕
            </button>
          </div>
        )}
      </div>

      {/* Filters Bar: Search, Shift, Position, and Summary KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            id="timesheet-search-input"
            type="text"
            placeholder="Cari nama karyawan / NIK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        {/* Filter Shift */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">Shift:</span>
          <select
            id="timesheet-filter-shift"
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900">Semua Shift</option>
            <option value="Pagi" className="bg-slate-900">Pagi (06:00 - 14:00)</option>
            <option value="Siang" className="bg-slate-900">Siang (14:00 - 22:00)</option>
            <option value="Malam" className="bg-slate-900">Malam (22:00 - 06:00)</option>
            <option value="General" className="bg-slate-900">General (08:00 - 17:00)</option>
          </select>
        </div>

        {/* Filter Position */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">Posisi:</span>
          <select
            id="timesheet-filter-position"
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900">Semua Posisi</option>
            <option value="Cleaner" className="bg-slate-900">Cleaner</option>
            <option value="Team Leader" className="bg-slate-900">Team Leader</option>
            <option value="Floor Specialist" className="bg-slate-900">Floor Specialist</option>
            <option value="Gardener" className="bg-slate-900">Gardener</option>
            <option value="Gondola / Facade Cleaner" className="bg-slate-900">Gondola Cleaner</option>
          </select>
        </div>

        {/* Quick KPI Badge: Total Personil & Total Payroll Periode */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400">Total Personil:</span>{' '}
            <span className="font-bold text-white">{summary.totalEmployees} Org</span>
          </div>
          <div className="text-xs">
            <span className="text-slate-400">Payroll Periode:</span>{' '}
            <span className="font-bold text-amber-400">{formatCurrency(summary.totalPayrollAll)}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MOBILE DAILY ROLL-CALL VIEW (Absensi Harian)                       */}
      {/* ========================================================================= */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Day Date Navigation Strip */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <button
                id="daily-prev-day-btn"
                onClick={handlePrevDay}
                disabled={activePeriodDays.findIndex((p) => p.dateKey === activeDayObj.dateKey) <= 0}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden xs:inline">Kemarin</span>
              </button>

              {/* Centered Big Date */}
              <div className="text-center">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  {activeDayObj.dayName} • {getMonthName(activeDayObj.month)} {activeDayObj.year}
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-white">
                  Tanggal {activeDayObj.day} ({formatDMY(activeDayObj.day, activeDayObj.month, activeDayObj.year)})
                </div>
              </div>

              <button
                id="daily-next-day-btn"
                onClick={handleNextDay}
                disabled={
                  activePeriodDays.findIndex((p) => p.dateKey === activeDayObj.dateKey) >=
                  activePeriodDays.length - 1
                }
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <span className="hidden xs:inline">Besok</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal Scrollable Day Pills: Menampilkan seluruh tanggal dalam periode terpilih */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
              {activePeriodDays.map((pDay) => {
                const isSelected = activeDayObj.dateKey === pDay.dateKey;
                return (
                  <button
                    key={pDay.dateKey}
                    id={`day-pill-${pDay.dateKey}`}
                    onClick={() => setActiveDailyDateKey(pDay.dateKey)}
                    className={`flex flex-col items-center justify-center min-w-[48px] py-1.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-105 ring-2 ring-amber-400'
                        : pDay.isWeekend
                        ? 'bg-slate-950/80 text-amber-400/80 hover:bg-slate-800 border border-amber-500/20'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] uppercase leading-none opacity-80">{pDay.dayName}</span>
                    <span className="text-sm font-bold mt-0.5">{pDay.day}</span>
                    <span className="text-[8px] opacity-70">/{pDay.month}</span>
                  </button>
                );
              })}
            </div>

            {/* Daily KPI Counters & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2.5 py-1 rounded-lg">
                  ✓ {dailyStats.hadir} Hadir
                </span>
                <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold px-2.5 py-1 rounded-lg">
                  ✗ {dailyStats.alpa} Alpa
                </span>
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-2.5 py-1 rounded-lg">
                  ! {dailyStats.izin} Izin
                </span>
                <span className="bg-slate-800 text-slate-300 font-semibold px-2.5 py-1 rounded-lg">
                  OFF {dailyStats.off}
                </span>
                {dailyStats.unrecorded > 0 && (
                  <span className="bg-slate-950 text-slate-500 text-[11px] px-2 py-1 rounded-lg">
                    {dailyStats.unrecorded} Belum Diisi
                  </span>
                )}
              </div>

              {/* Bulk Quick Action on Mobile */}
              <div className="flex items-center space-x-1.5">
                <button
                  id="mobile-bulk-mark-present-btn"
                  onClick={() => handleBulkMarkPresent(activeDayObj.day, activeDayObj.month, activeDayObj.year)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Hadirkan Semua</span>
                </button>
                <button
                  id="mobile-bulk-clear-day-btn"
                  onClick={() => handleBulkClearDay(activeDayObj.day, activeDayObj.month, activeDayObj.year)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>
          </div>

          {/* Personnel List (Mobile Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                Tidak ada personil yang sesuai dengan pencarian atau filter shift/posisi.
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const stats = calculateRowStats(emp);
                const currentStatus = getStatusForEmployeeDate(
                  emp.id,
                  activeDayObj.day,
                  activeDayObj.month,
                  activeDayObj.year
                );
                const proj = projects.find((p) => p.id === emp.projectId);

                return (
                  <div
                    key={emp.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-lg space-y-3 hover:border-slate-700 transition-all"
                  >
                    {/* Person Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm sm:text-base text-white truncate">
                          {emp.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 flex-wrap">
                          <span className="font-mono text-amber-400 font-bold">{emp.nik}</span>
                          <span>•</span>
                          <span className="text-slate-300 font-medium">{emp.position}</span>
                          <span>•</span>
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                            {emp.shift}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          📍 {proj?.name || '-'}
                        </div>
                      </div>

                      {/* Period Accumulation Badge */}
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400">Total Hadir Periode:</div>
                        <div className="text-sm font-black text-emerald-400">
                          {stats.hadir} <span className="text-[10px] font-normal text-slate-400">Hari</span>
                        </div>
                        <div className="text-[11px] font-bold text-amber-400">
                          {formatCurrency(stats.netPay)}
                        </div>
                      </div>
                    </div>

                    {/* Touch Attendance Action Buttons (H, A, I, O) */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {/* Hadir Button */}
                      <button
                        id={`btn-hadir-${emp.id}-${activeDayObj.dateKey}`}
                        onClick={() =>
                          handleSetStatusDirect(emp.id, activeDayObj.day, activeDayObj.month, activeDayObj.year, 'H')
                        }
                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] active:scale-95 cursor-pointer ${
                          currentStatus === 'H'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-950/80 text-emerald-400/80 border-emerald-500/30 hover:bg-emerald-950/40'
                        }`}
                      >
                        <span className="text-sm">✓</span>
                        <span className="text-[10px] mt-0.5">Hadir</span>
                      </button>

                      {/* Alpa Button */}
                      <button
                        id={`btn-alpa-${emp.id}-${activeDayObj.dateKey}`}
                        onClick={() =>
                          handleSetStatusDirect(emp.id, activeDayObj.day, activeDayObj.month, activeDayObj.year, 'A')
                        }
                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] active:scale-95 cursor-pointer ${
                          currentStatus === 'A'
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                            : 'bg-slate-950/80 text-rose-400/80 border-rose-500/30 hover:bg-rose-950/40'
                        }`}
                      >
                        <span className="text-sm">✗</span>
                        <span className="text-[10px] mt-0.5">Alpa</span>
                      </button>

                      {/* Izin Button */}
                      <button
                        id={`btn-izin-${emp.id}-${activeDayObj.dateKey}`}
                        onClick={() =>
                          handleSetStatusDirect(emp.id, activeDayObj.day, activeDayObj.month, activeDayObj.year, 'I')
                        }
                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] active:scale-95 cursor-pointer ${
                          currentStatus === 'I'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 font-black'
                            : 'bg-slate-950/80 text-amber-400/80 border-amber-500/30 hover:bg-amber-950/40'
                        }`}
                      >
                        <span className="text-sm">!</span>
                        <span className="text-[10px] mt-0.5">Izin</span>
                      </button>

                      {/* Off Button */}
                      <button
                        id={`btn-off-${emp.id}-${activeDayObj.dateKey}`}
                        onClick={() =>
                          handleSetStatusDirect(emp.id, activeDayObj.day, activeDayObj.month, activeDayObj.year, 'O')
                        }
                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] active:scale-95 cursor-pointer ${
                          currentStatus === 'O'
                            ? 'bg-slate-700 text-white border-slate-500 shadow-md'
                            : 'bg-slate-950/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-[11px] font-mono">OFF</span>
                        <span className="text-[10px] mt-0.5">Libur</span>
                      </button>
                    </div>

                    {/* Bottom Metadata & Edit Deduction Button */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <div>
                        Rate: <span className="text-slate-200 font-semibold">{formatCurrency(emp.dailyRate)}</span>/hr
                      </div>

                      <button
                        id={`edit-deduction-btn-${emp.id}`}
                        onClick={() =>
                          setEditingDeduction({
                            employee: emp,
                            targetMonth: endMonth,
                            targetYear: endYear,
                            amount: stats.deduction,
                            reason: stats.deductionReason,
                            bonus: stats.bonus
                          })
                        }
                        className="flex items-center space-x-1 text-amber-400 hover:underline font-semibold cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>
                          {stats.deduction > 0 || stats.bonus > 0
                            ? 'Edit Denda/Bonus'
                            : '+ Potongan/Lembur'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FULL MATRIX TABLE (GRID SESUAI PERIODE TANGGAL TERPILIH)          */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-0">
          {/* Top Quick Bulk Bar for Grid View */}
          <div className="bg-slate-950 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">Aksi Cepat Tanggal:</span>
              <select
                value={effectiveBulkDayKey}
                onChange={(e) => setSelectedDayToBulkKey(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
              >
                {activePeriodDays.map((pDay) => (
                  <option key={pDay.dateKey} value={pDay.dateKey}>
                    Tgl {pDay.day} ({pDay.dmy}) - {pDay.dayName}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  const targetDay = activePeriodDays.find((p) => p.dateKey === effectiveBulkDayKey);
                  if (targetDay) {
                    handleBulkMarkPresent(targetDay.day, targetDay.month, targetDay.year);
                  }
                }}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-xs transition cursor-pointer"
              >
                ✓ Hadirkan Semua
              </button>

              <button
                onClick={() => {
                  const targetDay = activePeriodDays.find((p) => p.dateKey === effectiveBulkDayKey);
                  if (targetDay) {
                    handleBulkClearDay(targetDay.day, targetDay.month, targetDay.year);
                  }
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
              >
                Kosongkan
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              Periode: <strong className="text-white">{formatDMY(startDay, startMonth, startYear)}</strong> s/d{' '}
              <strong className="text-white">{formatDMY(endDay, endMonth, endYear)}</strong> ({activePeriodDays.length} Hari)
            </div>
          </div>

          <div className="overflow-x-auto max-h-[620px] relative scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full text-left border-collapse">
              {/* Table Header with Sticky Columns */}
              <thead className="bg-slate-950 text-slate-300 text-xs uppercase font-bold sticky top-0 z-20 shadow-md">
                <tr>
                  {/* Sticky Left: No, Name & Position */}
                  <th className="p-2 sm:p-3 w-8 sm:w-10 text-center sticky left-0 z-30 bg-slate-950 border-r border-slate-800">
                    #
                  </th>
                  <th className="p-2 sm:p-3 min-w-[160px] sm:min-w-[200px] sticky left-8 sm:left-10 z-30 bg-slate-950 border-r border-slate-800 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                    Nama & Posisi
                  </th>
                  <th className="p-3 min-w-[140px] border-r border-slate-800 hidden sm:table-cell">
                    Project & Shift
                  </th>
                  <th className="p-3 min-w-[95px] text-right border-r border-slate-800 hidden md:table-cell">
                    Rate / Hari
                  </th>

                  {/* Kolom Tanggal Dinamis Sesuai Periode Terpilih */}
                  {activePeriodDays.map((pDay) => {
                    const isHighlighted = effectiveBulkDayKey === pDay.dateKey;
                    return (
                      <th
                        key={pDay.dateKey}
                        onClick={() => setSelectedDayToBulkKey(pDay.dateKey)}
                        title={`Klik untuk pilih Tgl ${pDay.dmy} (${pDay.dayName})`}
                        className={`p-1.5 text-center min-w-[34px] max-w-[34px] border-r border-slate-800/80 cursor-pointer transition-colors ${
                          pDay.isWeekend ? 'bg-amber-950/30 text-amber-400' : 'text-slate-300'
                        } ${isHighlighted ? 'ring-2 ring-amber-500 bg-amber-500/20' : 'hover:bg-slate-800'}`}
                      >
                        <div className="text-[11px] font-extrabold">{pDay.day}</div>
                        <div className="text-[8px] font-normal text-slate-400 leading-tight">
                          {pDay.dayName}
                        </div>
                        <div className="text-[7px] text-slate-500 font-mono">
                          /{pDay.month}
                        </div>
                      </th>
                    );
                  })}

                  {/* Summary & Financial Calculation Columns (Mengikuti Periode Tanggal Terpilih) */}
                  <th className="p-3 text-center min-w-[60px] bg-slate-950 border-l border-slate-800 text-emerald-400">
                    Hadir
                  </th>
                  <th className="p-3 text-center min-w-[50px] bg-slate-950 border-r border-slate-800 text-rose-400">
                    Alpha
                  </th>
                  <th className="p-3 text-center min-w-[50px] bg-slate-950 border-r border-slate-800 text-amber-400">
                    Izin
                  </th>
                  <th className="p-3 min-w-[130px] bg-slate-950 border-r border-slate-800 text-right text-rose-300 hidden sm:table-cell">
                    Potongan (Rp)
                  </th>
                  <th className="p-3 min-w-[150px] bg-slate-950 text-right text-amber-400 sticky right-0 z-30 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                    Gaji Bersih
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={activePeriodDays.length + 9} className="p-12 text-center text-slate-500">
                      <p className="text-base font-semibold text-slate-400">Tidak ada data karyawan yang cocok.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => {
                    const stats = calculateRowStats(emp);
                    const proj = projects.find((p) => p.id === emp.projectId);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors group">
                        {/* Number */}
                        <td className="p-2 sm:p-3 text-center font-mono text-slate-500 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800 border-r border-slate-800">
                          {index + 1}
                        </td>

                        {/* Sticky Name & Info */}
                        <td className="p-2 sm:p-3 sticky left-8 sm:left-10 z-10 bg-slate-900 group-hover:bg-slate-800 border-r border-slate-800 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                          <div className="font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1 truncate">
                            <span className="font-mono text-amber-400">{emp.nik}</span>
                            <span>•</span>
                            <span className="truncate">{emp.position}</span>
                          </div>
                        </td>

                        {/* Project & Shift */}
                        <td className="p-3 border-r border-slate-800/60 hidden sm:table-cell">
                          <div className="text-slate-300 font-medium truncate max-w-[130px]">
                            {proj?.name || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400">{emp.shift}</div>
                        </td>

                        {/* Rate / Hari */}
                        <td className="p-3 text-right font-medium text-slate-300 border-r border-slate-800/60 hidden md:table-cell">
                          {formatCurrency(emp.dailyRate)}
                        </td>

                        {/* Presensi Tanggal Periode Terpilih */}
                        {activePeriodDays.map((pDay) => {
                          const status = getStatusForEmployeeDate(emp.id, pDay.day, pDay.month, pDay.year);

                          return (
                            <td
                              key={pDay.dateKey}
                              id={`cell-${emp.id}-${pDay.dateKey}`}
                              onClick={() => handleCellClick(emp.id, pDay.day, pDay.month, pDay.year)}
                              title={`Klik untuk ubah kehadiran ${emp.name} (Tgl ${pDay.dmy})`}
                              className={`p-1 text-center border-r border-slate-800/50 cursor-pointer select-none transition-all ${
                                pDay.isWeekend ? 'bg-amber-950/10' : ''
                              } hover:bg-amber-500/20 active:scale-95`}
                            >
                              <div
                                className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                                  status === 'H'
                                    ? 'bg-emerald-500 text-white font-extrabold shadow-emerald-500/30'
                                    : status === 'A'
                                    ? 'bg-rose-500 text-white font-extrabold shadow-rose-500/30'
                                    : status === 'I'
                                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-amber-500/30'
                                    : status === 'O'
                                    ? 'bg-slate-800 text-slate-400 font-mono text-[10px]'
                                    : 'text-slate-700 hover:text-slate-400'
                                }`}
                              >
                                {status === 'H' && '✓'}
                                {status === 'A' && '✗'}
                                {status === 'I' && '!'}
                                {status === 'O' && 'OFF'}
                                {status === '' && '·'}
                              </div>
                            </td>
                          );
                        })}

                        {/* Kolom Hadir */}
                        <td className="p-3 text-center font-bold text-emerald-400 bg-slate-950/40 border-l border-slate-800">
                          {stats.hadir}
                        </td>

                        {/* Kolom Alpha */}
                        <td className="p-3 text-center font-bold text-rose-400 bg-slate-950/40 border-r border-slate-800">
                          {stats.alpa}
                        </td>

                        {/* Kolom Izin */}
                        <td className="p-3 text-center font-bold text-amber-400 bg-slate-950/40 border-r border-slate-800">
                          {stats.izin}
                        </td>

                        {/* Kolom Potongan & Tombol Edit */}
                        <td className="p-3 text-right bg-slate-950/40 border-r border-slate-800 hidden sm:table-cell">
                          <button
                            id={`matrix-edit-deduction-btn-${emp.id}`}
                            onClick={() =>
                              setEditingDeduction({
                                employee: emp,
                                targetMonth: endMonth,
                                targetYear: endYear,
                                amount: stats.deduction,
                                reason: stats.deductionReason,
                                bonus: stats.bonus
                              })
                            }
                            className="text-right hover:text-amber-400 transition-colors w-full group/btn cursor-pointer"
                          >
                            <div className="font-semibold text-rose-400">
                              {stats.deduction > 0 ? `- ${formatCurrency(stats.deduction)}` : 'Rp 0'}
                            </div>
                            {stats.bonus > 0 && (
                              <div className="text-[10px] text-emerald-400 font-medium">
                                + {formatCurrency(stats.bonus)} (Bonus)
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 group-hover/btn:text-amber-400">
                              {stats.deductionReason ? `(${stats.deductionReason})` : 'Edit Potongan'}
                            </div>
                          </button>
                        </td>

                        {/* Kolom Gaji Bersih */}
                        <td className="p-3 text-right font-black text-amber-400 sticky right-0 z-10 bg-slate-900 group-hover:bg-slate-800 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                          <div className="text-sm">{formatCurrency(stats.netPay)}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {stats.hadir} x {formatCurrency(emp.dailyRate)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Footer Row */}
              <tfoot className="bg-slate-950 text-slate-200 font-black border-t-2 border-slate-700 sticky bottom-0 z-20 text-xs">
                <tr>
                  <td colSpan={4} className="p-3 text-right uppercase border-r border-slate-800">
                    TOTAL KONSOLIDASI PERIODE:
                  </td>
                  <td
                    colSpan={activePeriodDays.length}
                    className="p-3 text-center text-slate-400 border-r border-slate-800 text-[11px]"
                  >
                    {activePeriodDays.length} Hari ({formatDMY(startDay, startMonth, startYear)} s/d {formatDMY(endDay, endMonth, endYear)})
                  </td>
                  <td className="p-3 text-center font-black text-emerald-400 bg-emerald-950/40 border-r border-slate-800">
                    {summary.totalHadirAll}
                  </td>
                  <td className="p-3 text-center font-black text-rose-400 bg-rose-950/40 border-r border-slate-800">
                    {summary.totalAlpaAll}
                  </td>
                  <td className="p-3 text-center font-black text-amber-400 bg-amber-950/40 border-r border-slate-800">
                    {summary.totalIzinAll}
                  </td>
                  <td className="p-3 text-right font-black text-rose-300 bg-slate-950 border-r border-slate-800 hidden sm:table-cell">
                    {formatCurrency(summary.totalDeductionsAll)}
                  </td>
                  <td className="p-3 text-right font-black text-amber-400 bg-amber-950/60 sticky right-0 z-30 shadow-[-4px_0_10px_rgba(0,0,0,0.5)] text-sm">
                    {formatCurrency(summary.totalPayrollAll)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDUCTION / BONUS MODAL FORM                                              */}
      {/* ========================================================================= */}
      {editingDeduction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Atur Potongan Denda & Lembur</h3>
                <p className="text-xs text-slate-400">
                  {editingDeduction.employee.name} ({editingDeduction.employee.nik}) • Periode {formatDMY(startDay, startMonth, startYear)} s/d {formatDMY(endDay, endMonth, endYear)}
                </p>
              </div>
              <button
                onClick={() => setEditingDeduction(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Daily Rate Info */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400">Rate Gaji Pokok Harian:</span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(editingDeduction.employee.dailyRate)} / hari
                </span>
              </div>

              {/* Deduction Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-rose-300 mb-1">
                  Nominal Potongan Denda / Pelanggaran (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500">Rp</span>
                  <input
                    id="deduction-amount-input"
                    type="number"
                    min="0"
                    step="5000"
                    value={editingDeduction.amount}
                    onChange={(e) =>
                      setEditingDeduction({
                        ...editingDeduction,
                        amount: Number(e.target.value)
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm font-bold text-rose-300 focus:outline-none focus:border-rose-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Deduction Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alasan / Keterangan Potongan:
                </label>
                <textarea
                  id="deduction-reason-input"
                  rows={2}
                  value={editingDeduction.reason}
                  onChange={(e) =>
                    setEditingDeduction({
                      ...editingDeduction,
                      reason: e.target.value
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  placeholder="Contoh: Terlambat hadir, atribut seragam tidak lengkap..."
                />
              </div>

              {/* Bonus / Lembur Amount */}
              <div>
                <label className="block text-xs font-semibold text-emerald-300 mb-1">
                  Insentif / Tambahan Lembur (Opsional - Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500">Rp</span>
                  <input
                    id="bonus-amount-input"
                    type="number"
                    min="0"
                    step="10000"
                    value={editingDeduction.bonus}
                    onChange={(e) =>
                      setEditingDeduction({
                        ...editingDeduction,
                        bonus: Number(e.target.value)
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingDeduction(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                id="save-deduction-btn"
                onClick={handleSaveDeduction}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-colors cursor-pointer"
              >
                Simpan Potongan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAVE / PRINT PDF MODAL & OFFICIAL DOCUMENT PREVIEW                        */}
      {/* ========================================================================= */}
      {showPDFModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
            {/* Top Control Bar */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Download PDF Laporan Payroll (Ukuran A4 Landscape)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Standar Cetak Resmi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Periode: <strong>{formatDMY(startDay, startMonth, startYear)}</strong> s/d <strong>{formatDMY(endDay, endMonth, endYear)}</strong> ({activePeriodDays.length} Hari Aktif).
                  </p>
                </div>
              </div>

              {/* Controls: Location Filter + Direct PDF Download + Close */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 font-semibold">Lokasi:</span>
                  <select
                    id="pdf-location-selector"
                    value={pdfSelectedProjectId}
                    onChange={(e) => setPdfSelectedProjectId(e.target.value)}
                    className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      Semua Lokasi Proyek (Konsolidasi)
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* DIRECT DOWNLOAD PDF */}
                <button
                  id="direct-download-pdf-btn"
                  onClick={() => {
                    const startStr = `${startDay}-${startMonth}-${startYear}`;
                    const endStr = `${endDay}-${endMonth}-${endYear}`;
                    generateTimesheetPDF({
                      projects,
                      employees,
                      timesheets,
                      selectedProjectId: pdfSelectedProjectId,
                      month: currentMonth,
                      year: currentYear,
                      customPeriodLabel: `PERIODE: ${startStr} s/d ${endStr}`,
                      customDays: activePeriodDays.map((p) => ({
                        day: p.day,
                        month: p.month,
                        year: p.year,
                        label: p.shortLabel
                      }))
                    });
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 transition cursor-pointer"
                  title="Download langsung berkas PDF A4 ke perangkat"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Langsung (A4)</span>
                </button>

                <button
                  id="close-pdf-modal-btn"
                  onClick={() => setShowPDFModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Document Content Area */}
            <div className="overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center">
              {(() => {
                const pdfEmployees = employees.filter((emp) => {
                  if (emp.status === 'Resign') return false;
                  if (pdfSelectedProjectId !== 'ALL' && emp.projectId !== pdfSelectedProjectId) return false;
                  return true;
                });

                const pdfProjName =
                  pdfSelectedProjectId === 'ALL'
                    ? 'Semua Lokasi Proyek (Konsolidasi Multi-Site)'
                    : projects.find((p) => p.id === pdfSelectedProjectId)?.name || 'Lokasi Proyek';

                const pdfProjCode =
                  pdfSelectedProjectId === 'ALL'
                    ? 'ALL-SITES'
                    : projects.find((p) => p.id === pdfSelectedProjectId)?.code || '';

                // Calculate grand totals for print view
                let totalHadirSum = 0;
                let totalAlpaSum = 0;
                let totalIzinSum = 0;
                let totalDeductionSum = 0;
                let totalGrossSum = 0;
                let totalNetSum = 0;

                const rowsData = pdfEmployees.map((emp, index) => {
                  const stats = calculateRowStats(emp);

                  totalHadirSum += stats.hadir;
                  totalAlpaSum += stats.alpa;
                  totalIzinSum += stats.izin;
                  totalDeductionSum += stats.deduction;
                  totalGrossSum += stats.grossPay;
                  totalNetSum += stats.netPay;

                  const empProj = projects.find((p) => p.id === emp.projectId);

                  return {
                    index: index + 1,
                    emp,
                    stats,
                    empProj
                  };
                });

                const comp = storageService.getCompanyProfile();

                return (
                  <div
                    id="printable-payroll-sheet"
                    className="bg-white text-slate-950 w-full max-w-6xl p-6 sm:p-8 rounded-xl shadow-2xl space-y-5 text-xs font-sans"
                  >
                    {/* Kop Surat Resmi */}
                    <div className="border-b-2 border-slate-900 pb-3 space-y-2">
                      <OfficialLetterhead
                        profile={comp}
                        documentTitle="REKAPITULASI TIMESHEET & PENGGAJIAN (PAYROLL)"
                        documentNumber={`PAY-${startYear}${pad2(startMonth)}-${pdfProjCode || 'CS'}`}
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span className="font-mono text-[11px] font-semibold">
                          KODE DOKUMEN: <strong className="text-slate-800">DOC-{startYear}{pad2(startMonth)}-{pdfProjCode}</strong>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 uppercase">
                            OFFICIAL PAYROLL REPORT
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Judul Laporan */}
                    <div className="text-center space-y-1">
                      <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                        REKAPITULASI TIMESHEET & PAYROLL CLEANING SERVICE
                      </h2>
                      <p className="text-xs text-slate-600 font-medium">
                        Laporan Akumulasi Kehadiran Harian & Perhitungan Gaji Bersih Periode Cut-Off: {formatDMY(startDay, startMonth, startYear)} s/d {formatDMY(endDay, endMonth, endYear)}
                      </p>
                    </div>

                    {/* Metadata Box */}
                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="border-r border-slate-200 pr-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Periode Penggajian</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {formatDMY(startDay, startMonth, startYear)} s/d {formatDMY(endDay, endMonth, endYear)}
                        </span>
                      </div>

                      <div className="border-r border-slate-200 pr-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Lokasi Proyek</span>
                        <span className="font-bold text-slate-900 text-xs truncate block" title={pdfProjName}>
                          {pdfProjName}
                        </span>
                      </div>

                      <div className="border-r border-slate-200 pr-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Personil</span>
                        <span className="font-black text-emerald-700 text-xs sm:text-sm">
                          {pdfEmployees.length} Personil Aktif
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Nilai Payroll</span>
                        <span className="font-black text-slate-900 text-xs sm:text-sm font-mono">
                          {formatCurrency(totalNetSum)}
                        </span>
                      </div>
                    </div>

                    {/* Summary Chip */}
                    <div className="flex items-center justify-between text-[11px] bg-slate-100 px-3 py-1.5 rounded border border-slate-200 font-medium text-slate-700">
                      <span>
                        Akumulasi: <strong>{totalHadirSum}</strong> Hadir •{' '}
                        <strong>{totalAlpaSum}</strong> Alpa •{' '}
                        <strong>{totalIzinSum}</strong> Izin
                      </span>
                      <span>
                        Total Potongan / Denda:{' '}
                        <strong className="text-rose-700 font-mono">
                          {formatCurrency(totalDeductionSum)}
                        </strong>
                      </span>
                    </div>

                    {/* Table Data */}
                    <div className="border border-slate-300 rounded-lg overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-800 text-white font-bold border-b border-slate-900">
                            <th className="py-2 px-1.5 text-center w-6 border-r border-slate-700">#</th>
                            <th className="py-2 px-2 border-r border-slate-700 min-w-[140px]">
                              Nama & Posisi
                            </th>
                            <th className="py-2 px-2 border-r border-slate-700 min-w-[110px]">
                              Project & Shift
                            </th>
                            <th className="py-2 px-2 text-right border-r border-slate-700 min-w-[70px]">
                              Rate / Hari
                            </th>

                            {/* Date Columns Sesuai Periode Terpilih */}
                            {activePeriodDays.map((pDay) => (
                              <th
                                key={pDay.dateKey}
                                className={`py-1 px-0.5 text-center w-5 border-r border-slate-700 text-[9px] ${
                                  pDay.isWeekend ? 'bg-slate-700 text-amber-300' : 'text-white'
                                }`}
                                title={`Tgl ${pDay.dmy}`}
                              >
                                {pDay.day}
                              </th>
                            ))}

                            <th className="py-2 px-1.5 text-center border-r border-slate-700 bg-emerald-900 text-emerald-100 w-8">
                              H
                            </th>
                            <th className="py-2 px-1.5 text-center border-r border-slate-700 bg-rose-900 text-rose-100 w-8">
                              A
                            </th>
                            <th className="py-2 px-1.5 text-center border-r border-slate-700 bg-amber-900 text-amber-100 w-8">
                              I
                            </th>
                            <th className="py-2 px-2 text-right border-r border-slate-700 bg-slate-900 text-rose-300 min-w-[75px]">
                              Potongan (Rp)
                            </th>
                            <th className="py-2 px-2 text-right bg-slate-950 text-amber-300 min-w-[85px] font-black">
                              Gaji Bersih
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                          {rowsData.length === 0 ? (
                            <tr>
                              <td colSpan={activePeriodDays.length + 9} className="py-8 text-center text-slate-400 font-semibold">
                                Tidak ada data personil pada lokasi ini.
                              </td>
                            </tr>
                          ) : (
                            rowsData.map((row) => (
                              <tr key={row.emp.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-1.5 px-1 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                                  {row.index}
                                </td>
                                <td className="py-1.5 px-2 border-r border-slate-200">
                                  <div className="font-bold text-slate-900 leading-tight">
                                    {row.emp.name}
                                  </div>
                                  <div className="text-[9px] text-slate-500 flex items-center space-x-1">
                                    <span>{row.emp.position}</span>
                                    <span>•</span>
                                    <span className="font-mono">{row.emp.nik}</span>
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 border-r border-slate-200">
                                  <div className="font-semibold text-slate-800 truncate max-w-[105px]">
                                    {row.empProj?.name || '-'}
                                  </div>
                                  <div className="text-[9px] text-slate-500 truncate max-w-[105px]">
                                    {row.emp.shift.split(' ')[0]}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-700 border-r border-slate-200">
                                  {formatCurrency(row.emp.dailyRate)}
                                </td>

                                {/* Period Day Cells */}
                                {activePeriodDays.map((pDay) => {
                                  const status = getStatusForEmployeeDate(row.emp.id, pDay.day, pDay.month, pDay.year);

                                  let cellBg = '';
                                  let textColor = 'text-slate-700';
                                  let displayTxt: string = status;

                                  if (status === 'H') {
                                    cellBg = 'bg-emerald-50 text-emerald-800 font-bold';
                                  } else if (status === 'A') {
                                    cellBg = 'bg-rose-100 text-rose-800 font-black';
                                  } else if (status === 'I') {
                                    cellBg = 'bg-amber-100 text-amber-800 font-bold';
                                  } else if (status === 'O') {
                                    cellBg = 'bg-slate-100 text-slate-400';
                                    displayTxt = 'OFF';
                                  } else if (pDay.isWeekend) {
                                    cellBg = 'bg-amber-50/50';
                                  }

                                  return (
                                    <td
                                      key={pDay.dateKey}
                                      className={`py-1 px-0.5 text-center text-[9px] border-r border-slate-200 ${cellBg} ${textColor}`}
                                    >
                                      {displayTxt || '-'}
                                    </td>
                                  );
                                })}

                                <td className="py-1.5 px-1.5 text-center font-bold text-emerald-800 bg-emerald-50/50 border-r border-slate-200">
                                  {row.stats.hadir}
                                </td>
                                <td className="py-1.5 px-1.5 text-center font-bold text-rose-800 bg-rose-50/50 border-r border-slate-200">
                                  {row.stats.alpa}
                                </td>
                                <td className="py-1.5 px-1.5 text-center font-bold text-amber-800 bg-amber-50/50 border-r border-slate-200">
                                  {row.stats.izin}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-rose-700 border-r border-slate-200">
                                  {row.stats.deduction > 0 ? formatCurrency(row.stats.deduction) : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-black text-slate-900 bg-slate-50">
                                  {formatCurrency(row.stats.netPay)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>

                        {/* Footer Summary Row */}
                        <tfoot className="bg-slate-100 font-black border-t-2 border-slate-800 text-slate-900">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider border-r border-slate-300">
                              TOTAL REKAPITULASI (KONSOLIDASI):
                            </td>
                            <td
                              colSpan={activePeriodDays.length}
                              className="py-2.5 px-1 text-center text-slate-500 border-r border-slate-300 text-[9px]"
                            >
                              {activePeriodDays.length} Hari Periode
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-emerald-800 bg-emerald-100 border-r border-slate-300">
                              {totalHadirSum}
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-rose-800 bg-rose-100 border-r border-slate-300">
                              {totalAlpaSum}
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-amber-800 bg-amber-100 border-r border-slate-300">
                              {totalIzinSum}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-rose-800 bg-rose-50 border-r border-slate-300">
                              {formatCurrency(totalDeductionSum)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-950 bg-amber-200 text-xs font-black">
                              {formatCurrency(totalNetSum)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Lembar Tanda Tangan & Pengesahan Resmi (3 Pihak) */}
                    <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs page-break-inside-avoid">
                      <div className="space-y-12">
                        <div>
                          <p className="text-slate-500 font-medium">Dibuat & Diverifikasi Oleh,</p>
                          <p className="font-bold text-slate-800">Site Supervisor / Admin Project</p>
                        </div>
                        <div className="border-b border-slate-400 w-36 mx-auto"></div>
                        <p className="text-[11px] text-slate-600 font-semibold">( ............................................ )</p>
                      </div>

                      <div className="space-y-12">
                        <div>
                          <p className="text-slate-500 font-medium">Diperiksa Oleh,</p>
                          <p className="font-bold text-slate-800">{comp.financeManagerTitle || 'Finance & Payroll Officer'}</p>
                        </div>
                        <div className="border-b border-slate-400 w-36 mx-auto"></div>
                        <p className="text-[11px] text-slate-600 font-semibold">
                          ( {comp.financeManagerName || 'Finance & HR Dept'} )
                        </p>
                      </div>

                      <div className="space-y-12">
                        <div>
                          <p className="text-slate-500 font-medium">Disetujui Oleh,</p>
                          <p className="font-bold text-slate-800">{comp.directorTitle || 'Operations Director / Management'}</p>
                        </div>
                        <div className="border-b border-slate-400 w-36 mx-auto"></div>
                        <p className="text-[11px] text-slate-600 font-semibold">
                          ( {comp.directorName || 'Management'} )
                        </p>
                      </div>
                    </div>

                    {/* Footer Footnote */}
                    <div className="text-[9px] text-slate-500 text-center border-t border-slate-200 pt-2 flex items-center justify-between">
                      <span>{comp.letterheadFooterNote || `Dokumen ini sah dan diterbitkan secara digital oleh ${comp.name}.`}</span>
                      <span>Halaman 1 dari 1</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
