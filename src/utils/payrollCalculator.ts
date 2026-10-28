import {
  Employee,
  TimesheetMonthRecord,
  AttendanceStatus
} from '../types';
import {
  storageService,
  TimesheetCutoffSettings,
  DEFAULT_CUTOFF_SETTINGS
} from '../services/storageService';
import { getDaysInMonth, getMonthName } from './formatters';

export interface ActivePeriodDay {
  day: number;
  month: number;
  year: number;
  dateKey: string;
  shortLabel: string;
  dayName: string;
}

export interface PayrollRowItem {
  employee: Employee;
  timesheet: TimesheetMonthRecord;
  hadirCount: number;
  alpaCount: number;
  izinCount: number;
  sakitCount: number;
  lemburCount: number;
  lemburHours: number;
  lemburPay: number;
  offCount: number;
  grossPay: number;
  netPay: number;
  deductionAmount: number;
  deductionReason: string;
  bonusAmount: number;
  bonusReason?: string;
  overtimeAmount?: number;
  overtimeReason?: string;
  incentiveAmount?: number;
  incentiveReason?: string;
}

export interface PayrollSummaryResult {
  totalPayroll: number; // Total Pengeluaran Payroll (Take Home Pay / Net Pay)
  totalGrossPay: number;
  totalDeductions: number;
  totalBonus: number;
  totalHadirDays: number;
  totalAlpaDays: number;
  totalIzinDays: number;
  totalSakitDays: number;
  totalLemburDays: number;
  totalLemburHours: number;
  totalLemburPay: number;
  totalOffDays: number;
  personnelCount: number;
  periodLabel: string;
  periodLabelShort: string;
  isCutoffMode: boolean;
  activePeriodDays: ActivePeriodDay[];
  payrollRows: PayrollRowItem[];
}

const pad2 = (n: number): string => String(n).padStart(2, '0');
const formatDMY = (d: number, m: number, y: number): string => `${pad2(d)} - ${pad2(m)} - ${y}`;
const formatDMYShort = (d: number, m: number): string => `${pad2(d)}/${pad2(m)}`;

/**
 * Generate active days list based on cutoff settings
 * (Cut-off Range Buka-Tutup Buku or Calendar Month)
 */
export function getActivePeriodDays(settings: TimesheetCutoffSettings): ActivePeriodDay[] {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  if (!settings.isCutoffMode) {
    const daysInM = getDaysInMonth(settings.calendarYear, settings.calendarMonth);
    return Array.from({ length: daysInM }, (_, i) => {
      const d = i + 1;
      const dt = new Date(settings.calendarYear, settings.calendarMonth - 1, d);
      const dayOfWeek = dt.getDay();
      return {
        day: d,
        month: settings.calendarMonth,
        year: settings.calendarYear,
        dateKey: `${settings.calendarYear}-${pad2(settings.calendarMonth)}-${pad2(d)}`,
        shortLabel: String(d),
        dayName: dayNames[dayOfWeek]
      };
    });
  }

  // Cut-off Mode: Dari (startDay, startMonth, startYear) sampai (endDay, endMonth, endYear)
  const list: ActivePeriodDay[] = [];
  const startDt = new Date(settings.startYear, settings.startMonth - 1, settings.startDay);
  const endDt = new Date(settings.endYear, settings.endMonth - 1, settings.endDay);

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
      shortLabel: `${d}/${m}`,
      dayName: dayNames[dayOfWeek]
    });

    cur.setDate(cur.getDate() + 1);
  }

  return list;
}

/**
 * Helper to get attendance status on specific date
 */
export function getStatusForEmployeeDate(
  timesheets: TimesheetMonthRecord[],
  employeeId: string,
  day: number,
  month: number,
  year: number
): AttendanceStatus | '' {
  const rec = timesheets.find(
    (ts) => ts.employeeId === employeeId && ts.month === month && ts.year === year
  );
  return rec?.days[day] || '';
}

/**
 * Centralized payroll summary calculation identical to "Rekap Laporan & Payroll Slip Center"
 */
export function calculatePayrollSummary(
  employees: Employee[],
  timesheets: TimesheetMonthRecord[],
  cutoffSettings?: TimesheetCutoffSettings,
  projectId: string = 'ALL',
  searchQuery: string = ''
): PayrollSummaryResult {
  const settings = cutoffSettings || storageService.getTimesheetCutoffSettings() || DEFAULT_CUTOFF_SETTINGS;
  const activePeriodDays = getActivePeriodDays(settings);

  // Period label
  let periodLabel: string;
  let periodLabelShort: string;

  if (settings.isCutoffMode) {
    periodLabel = `${formatDMY(settings.startDay, settings.startMonth, settings.startYear)} s/d ${formatDMY(settings.endDay, settings.endMonth, settings.endYear)}`;
    periodLabelShort = `${formatDMYShort(settings.startDay, settings.startMonth)} - ${formatDMYShort(settings.endDay, settings.endMonth)}`;
  } else {
    periodLabel = `${getMonthName(settings.calendarMonth)} ${settings.calendarYear}`;
    periodLabelShort = `${getMonthName(settings.calendarMonth).slice(0, 3)} ${settings.calendarYear}`;
  }

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    if (emp.status === 'Resign') return false;
    if (projectId !== 'ALL' && emp.projectId !== projectId) return false;
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.nik.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate row for each employee
  const payrollRows: PayrollRowItem[] = filteredEmployees.map((emp) => {
    let hadirCount = 0;
    let alpaCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let lemburCount = 0;
    let lemburHours = 0;
    let lemburPay = 0;
    let offCount = 0;

    // Kehadiran in active period
    activePeriodDays.forEach((pDay) => {
      const st = getStatusForEmployeeDate(timesheets, emp.id, pDay.day, pDay.month, pDay.year);
      if (st === 'H') hadirCount++;
      else if (st === 'A') alpaCount++;
      else if (st === 'I') izinCount++;
      else if (st === 'S') sakitCount++;
      else if (st === 'L') {
        lemburCount++;
        const rec = timesheets.find(
          (ts) => ts.employeeId === emp.id && ts.month === pDay.month && ts.year === pDay.year
        );
        const hrs = rec?.overtimeHours?.[pDay.day] !== undefined ? rec.overtimeHours[pDay.day] : 2;
        lemburHours += hrs;
        // Rumus: (Upah Harian / 8) * Jam Lembur
        lemburPay += Math.round((emp.dailyRate / 8) * hrs);
      }
      else if (st === 'HL' || (st as string) === 'H+L') {
        hadirCount++; // Terhitung sebagai hadir juga
        lemburCount++; // Terhitung sebagai lembur juga
        const rec = timesheets.find(
          (ts) => ts.employeeId === emp.id && ts.month === pDay.month && ts.year === pDay.year
        );
        const hrs = rec?.overtimeHours?.[pDay.day] !== undefined ? rec.overtimeHours[pDay.day] : 2;
        lemburHours += hrs;
        // Rumus: (Upah Harian / 8) * Jam Lembur
        lemburPay += Math.round((emp.dailyRate / 8) * hrs);
      }
      else if (st === 'O' || st === 'OFF') offCount++;
    });

    // Distinct months in active period
    const distinctMonths = new Set<string>();
    activePeriodDays.forEach((pDay) => {
      distinctMonths.add(`${pDay.year}-${pDay.month}`);
    });

    let deductionAmount = 0;
    let bonusAmount = 0;
    let overtimeAmount = 0;
    let incentiveAmount = 0;
    const deductionReasons: string[] = [];
    const bonusReasons: string[] = [];
    const overtimeReasons: string[] = [];
    const incentiveReasons: string[] = [];

    distinctMonths.forEach((key) => {
      const [y, m] = key.split('-').map(Number);
      const rec = timesheets.find(
        (ts) => ts.employeeId === emp.id && ts.month === m && ts.year === y
      );
      if (rec) {
        if (rec.deductionAmount) deductionAmount += rec.deductionAmount;
        if (rec.bonusAmount) bonusAmount += rec.bonusAmount;
        if (rec.overtimeAmount !== undefined && rec.overtimeAmount !== null) overtimeAmount += rec.overtimeAmount;
        if (rec.incentiveAmount !== undefined && rec.incentiveAmount !== null) incentiveAmount += rec.incentiveAmount;
        if (rec.deductionReason) deductionReasons.push(rec.deductionReason);
        if (rec.bonusReason) bonusReasons.push(rec.bonusReason);
        if (rec.overtimeReason) overtimeReasons.push(rec.overtimeReason);
        if (rec.incentiveReason) incentiveReasons.push(rec.incentiveReason);
      }
    });

    const hasOvertime = lemburCount > 0 || lemburHours > 0;
    const effectiveBonus = (overtimeAmount + incentiveAmount) > 0
      ? (overtimeAmount + incentiveAmount)
      : (bonusAmount > 0 ? bonusAmount : (hasOvertime ? lemburPay : 0));

    const effectiveBonusReason = (overtimeAmount + incentiveAmount) > 0
      ? [overtimeReasons.join('; '), incentiveReasons.join('; ')].filter(Boolean).join(' • ')
      : (bonusAmount > 0
          ? (bonusReasons.length > 0 ? bonusReasons.join('; ') : 'Insentif / Tambahan Lembur')
          : (hasOvertime ? (bonusReasons.length > 0 ? bonusReasons.join('; ') : (lemburHours > 0 ? `Lembur ${lemburHours} Jam` : '')) : ''));

    const grossPay = hadirCount * emp.dailyRate + effectiveBonus;
    const netPay = Math.max(0, grossPay - deductionAmount);

    const representativeRec = timesheets.find(
      (ts) => ts.employeeId === emp.id && ts.month === settings.calendarMonth && ts.year === settings.calendarYear
    ) || {
      id: `ts-${emp.id}`,
      employeeId: emp.id,
      projectId: emp.projectId,
      month: settings.calendarMonth,
      year: settings.calendarYear,
      days: {},
      deductionAmount,
      deductionReason: deductionReasons.join('; '),
      bonusAmount: effectiveBonus,
      bonusReason: effectiveBonusReason,
      notes: ''
    };

    return {
      employee: emp,
      timesheet: {
        ...representativeRec,
        deductionAmount,
        deductionReason: deductionReasons.join('; '),
        bonusAmount: effectiveBonus,
        bonusReason: effectiveBonusReason
      },
      hadirCount,
      alpaCount,
      izinCount,
      sakitCount,
      lemburCount,
      lemburHours,
      lemburPay,
      offCount,
      grossPay,
      netPay,
      deductionAmount,
      deductionReason: deductionReasons.join('; '),
      bonusAmount: effectiveBonus,
      bonusReason: effectiveBonusReason
    };
  });

  const totalPayroll = payrollRows.reduce((acc, row) => acc + row.netPay, 0);
  const totalGrossPay = payrollRows.reduce((acc, row) => acc + row.grossPay, 0);
  const totalDeductions = payrollRows.reduce((acc, row) => acc + row.deductionAmount, 0);
  const totalBonus = payrollRows.reduce((acc, row) => acc + row.bonusAmount, 0);
  const totalHadirDays = payrollRows.reduce((acc, row) => acc + row.hadirCount, 0);
  const totalAlpaDays = payrollRows.reduce((acc, row) => acc + row.alpaCount, 0);
  const totalIzinDays = payrollRows.reduce((acc, row) => acc + row.izinCount, 0);
  const totalSakitDays = payrollRows.reduce((acc, row) => acc + row.sakitCount, 0);
  const totalLemburDays = payrollRows.reduce((acc, row) => acc + row.lemburCount, 0);
  const totalLemburHours = payrollRows.reduce((acc, row) => acc + row.lemburHours, 0);
  const totalLemburPay = payrollRows.reduce((acc, row) => acc + row.lemburPay, 0);
  const totalOffDays = payrollRows.reduce((acc, row) => acc + row.offCount, 0);

  return {
    totalPayroll,
    totalGrossPay,
    totalDeductions,
    totalBonus,
    totalHadirDays,
    totalAlpaDays,
    totalIzinDays,
    totalSakitDays,
    totalLemburDays,
    totalLemburHours,
    totalLemburPay,
    totalOffDays,
    personnelCount: filteredEmployees.length,
    periodLabel,
    periodLabelShort,
    isCutoffMode: settings.isCutoffMode,
    activePeriodDays,
    payrollRows
  };
}
