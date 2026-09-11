import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { Project, Employee, TimesheetMonthRecord } from '../../types';
import { formatCurrency, formatNumber, getMonthName } from '../../utils/formatters';

interface ComparativeChartsProps {
  projects: Project[];
  employees: Employee[];
  timesheets: TimesheetMonthRecord[];
  currentMonth?: number; // default 8 (August)
  currentYear?: number;  // default 2026
  selectedProjectId?: string;
  showPayrollChart?: boolean;
  showManpowerChart?: boolean;
}

export const ComparativeCharts: React.FC<ComparativeChartsProps> = ({
  projects = [],
  employees = [],
  timesheets = [],
  currentMonth = 8,
  currentYear = 2026,
  selectedProjectId = 'ALL',
  showPayrollChart = true,
  showManpowerChart = true
}) => {
  // Determine previous month & year
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const prevMonthName = getMonthName(prevMonth);
  const curMonthName = getMonthName(currentMonth);

  // Active employees filter
  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.status !== 'Resign');
  }, [employees]);

  // ----------------------------------------------------
  // 1. PAYROLL COMPARISON COMPUTATION (Prev vs Current)
  // ----------------------------------------------------
  const payrollComparisonData = useMemo(() => {
    // Helper to calculate payroll for a specific month/year
    const calcMonthProjectPayroll = (pId: string, m: number, y: number) => {
      const projEmployees = activeEmployees.filter((e) => pId === 'ALL' || e.projectId === pId);
      let totalNet = 0;
      let totalHadir = 0;
      let totalDeduction = 0;
      let totalBonus = 0;

      projEmployees.forEach((emp) => {
        const rec = timesheets.find(
          (ts) => ts.employeeId === emp.id && ts.month === m && ts.year === y
        );
        if (!rec) return;

        let hadir = 0;
        Object.values(rec.days).forEach((st) => {
          if (st === 'H') hadir++;
        });

        const gross = hadir * emp.dailyRate + (rec.bonusAmount || 0);
        const net = Math.max(0, gross - (rec.deductionAmount || 0));

        totalNet += net;
        totalHadir += hadir;
        totalDeduction += rec.deductionAmount || 0;
        totalBonus += rec.bonusAmount || 0;
      });

      return { totalNet, totalHadir, totalDeduction, totalBonus, headcount: projEmployees.length };
    };

    // Consolidated Totals
    const targetProjId = selectedProjectId;
    const prevOverall = calcMonthProjectPayroll(targetProjId, prevMonth, prevYear);
    const currOverall = calcMonthProjectPayroll(targetProjId, currentMonth, currentYear);

    const diffPayroll = currOverall.totalNet - prevOverall.totalNet;
    const percentChange = prevOverall.totalNet > 0 ? (diffPayroll / prevOverall.totalNet) * 100 : 0;

    // Project breakdown list
    const projectBreakdown = projects.map((p) => {
      const prevP = calcMonthProjectPayroll(p.id, prevMonth, prevYear);
      const currP = calcMonthProjectPayroll(p.id, currentMonth, currentYear);
      const pDiff = currP.totalNet - prevP.totalNet;
      const pPct = prevP.totalNet > 0 ? (pDiff / prevP.totalNet) * 100 : 0;

      return {
        project: p,
        prevPayroll: prevP.totalNet,
        currPayroll: currP.totalNet,
        diff: pDiff,
        pct: pPct,
        prevHadir: prevP.totalHadir,
        currHadir: currP.totalHadir,
        headcount: currP.headcount
      };
    });

    const maxProjectPayroll = Math.max(
      ...projectBreakdown.map((item) => Math.max(item.prevPayroll, item.currPayroll, 1)),
      1000000
    );

    return {
      prevOverall,
      currOverall,
      diffPayroll,
      percentChange,
      projectBreakdown,
      maxProjectPayroll
    };
  }, [projects, activeEmployees, timesheets, selectedProjectId, prevMonth, prevYear, currentMonth, currentYear]);

  // ----------------------------------------------------
  // 2. MANPOWER COMPARISON COMPUTATION (Target vs Actual)
  // ----------------------------------------------------
  const manpowerComparisonData = useMemo(() => {
    let totalTargetQuota = 0;
    let totalActualAssigned = 0;

    const breakdown = projects.map((p) => {
      const targetQuota = p.manpowerCount || p.activeCleanersCount || 10;
      const actualStaff = activeEmployees.filter((e) => e.projectId === p.id);
      const actualCount = actualStaff.length;

      totalTargetQuota += targetQuota;
      totalActualAssigned += actualCount;

      const diff = actualCount - targetQuota;
      const fulfillmentPct = targetQuota > 0 ? Math.round((actualCount / targetQuota) * 100) : 100;

      let status: 'optimal' | 'shortage' | 'excess' = 'optimal';
      if (diff < 0) status = 'shortage';
      else if (diff > 0) status = 'excess';

      return {
        project: p,
        targetQuota,
        actualCount,
        diff,
        fulfillmentPct,
        status,
        supervisor: p.siteSupervisor,
        positionsCount: {
          cleaner: actualStaff.filter((e) => e.position === 'Cleaner').length,
          leader: actualStaff.filter((e) => e.position === 'Team Leader').length,
          specialist: actualStaff.filter((e) => e.position === 'Floor Specialist' || e.position === 'Gondola / Facade Cleaner').length,
          gardener: actualStaff.filter((e) => e.position === 'Gardener').length,
          supervisor: actualStaff.filter((e) => e.position === 'Supervisor').length
        }
      };
    });

    const totalDiff = totalActualAssigned - totalTargetQuota;
    const overallFulfillment = totalTargetQuota > 0 ? Math.round((totalActualAssigned / totalTargetQuota) * 100) : 100;

    const maxQuota = Math.max(
      ...breakdown.map((item) => Math.max(item.targetQuota, item.actualCount, 1)),
      20
    );

    return {
      totalTargetQuota,
      totalActualAssigned,
      totalDiff,
      overallFulfillment,
      breakdown,
      maxQuota
    };
  }, [projects, activeEmployees]);

  if (!showPayrollChart && !showManpowerChart) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* DIAGRAM 1: PERBANDINGAN PENGELUARAN GAJI (BULAN LALU VS BULAN INI) */}
      {/* ---------------------------------------------------- */}
      {showPayrollChart && (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20 font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Diagram Perbandingan Pengeluaran Gaji
                </h3>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  MoM Analysis
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Komparasi realisasi payroll bulan sebelumnya ({prevMonthName} {prevYear}) dengan bulan berjalan ({curMonthName} {currentYear}).
              </p>
            </div>
          </div>

          {/* Quick Indicator Tag */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className="text-slate-400 font-semibold">{prevMonthName}</span>
            </div>
            <span className="text-slate-600">vs</span>
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-amber-300 font-bold">{curMonthName} (Berjalan)</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Box 1: Bulan Sebelumnya */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Gaji Bulan Sebelumnya ({prevMonthName})
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-200">
              {formatCurrency(payrollComparisonData.prevOverall.totalNet)}
            </div>
            <div className="text-[11px] text-slate-500">
              Total {payrollComparisonData.prevOverall.totalHadir} Hari Kerja Hadir
            </div>
          </div>

          {/* Box 2: Bulan Berjalan */}
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider block">
              Gaji Bulan Berjalan ({curMonthName})
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {formatCurrency(payrollComparisonData.currOverall.totalNet)}
            </div>
            <div className="text-[11px] text-slate-400">
              Cut-off berjalan • {payrollComparisonData.currOverall.headcount} Karyawan Aktif
            </div>
          </div>

          {/* Box 3: Selisih & Varians */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Selisih / Fluktuasi Pengeluaran
            </span>
            <div className="flex items-center space-x-2">
              <span className={`text-xl sm:text-2xl font-black ${payrollComparisonData.diffPayroll >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {payrollComparisonData.diffPayroll >= 0 ? '+' : ''}
                {formatCurrency(payrollComparisonData.diffPayroll)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center space-x-0.5 ${
                payrollComparisonData.diffPayroll >= 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {payrollComparisonData.diffPayroll >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{Math.abs(payrollComparisonData.percentChange || 0).toFixed(1)}%</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {payrollComparisonData.diffPayroll >= 0
                ? 'Peningkatan beban lembur / absensi berjalan'
                : 'Efisiensi pengeluaran payroll periode ini'}
            </div>
          </div>
        </div>

        {/* Visual Comparative Bars per Project */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Perbandingan Payroll per Lokasi Gedung / Proyek</span>
            <span>Nilai Gaji Net (Rupiah)</span>
          </div>

          <div className="space-y-4">
            {payrollComparisonData.projectBreakdown.map((item) => {
              const prevWidthPct = Math.min(100, Math.max(8, (item.prevPayroll / payrollComparisonData.maxProjectPayroll) * 100));
              const currWidthPct = Math.min(100, Math.max(8, (item.currPayroll / payrollComparisonData.maxProjectPayroll) * 100));

              return (
                <div key={item.project.id} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs sm:text-sm">
                        {item.project.name}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                        {item.project.code}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-400">Selisih:</span>
                      <span className={`font-bold ${item.diff >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {item.diff >= 0 ? '+' : ''}{formatCurrency(item.diff)} ({(item.pct ?? 0).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Dual Bar Graphic */}
                  <div className="space-y-1.5 pt-1">
                    {/* Bar Bulan Sebelumnya */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="w-20 text-slate-500 font-semibold text-[11px] shrink-0">
                        {prevMonthName}:
                      </span>
                      <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden p-0.5 flex items-center">
                        <div
                          className="bg-slate-600 h-full rounded-full transition-all duration-700 flex items-center justify-end px-2 text-[10px] font-bold text-white"
                          style={{ width: `${prevWidthPct}%` }}
                        >
                          <span className="truncate">{formatCurrency(item.prevPayroll)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bar Bulan Berjalan */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="w-20 text-amber-400 font-bold text-[11px] shrink-0">
                        {curMonthName}:
                      </span>
                      <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden p-0.5 flex items-center">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-700 flex items-center justify-end px-2 text-[10px] font-black text-slate-950 shadow-md shadow-amber-500/20"
                          style={{ width: `${currWidthPct}%` }}
                        >
                          <span className="truncate">{formatCurrency(item.currPayroll)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DIAGRAM 2: PERBANDINGAN JUMLAH PERSONIL (PENGATURAN LOKASI VS AKTUAL DATA KARYAWAN) */}
      {/* ---------------------------------------------------- */}
      {showManpowerChart && (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Diagram Perbandingan Manpower & Alokasi Personil
                </h3>
                <span className="text-[11px] bg-blue-500/20 text-blue-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                  Target vs Aktual
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Membandingkan kuota target manpower dari Pengaturan Lokasi Proyek dengan jumlah personil aktual di Data Karyawan.
              </p>
            </div>
          </div>

          {/* Quick Indicator Tag */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className="text-slate-400 font-semibold">Target Pengaturan</span>
            </div>
            <span className="text-slate-600">vs</span>
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-300 font-bold">Aktual Terisi</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Box 1: Total Kuota Target */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Total Kuota Target (Pengaturan Proyek)
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-200">
              {manpowerComparisonData.totalTargetQuota}{' '}
              <span className="text-xs font-normal text-slate-400">Personil</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Akumulasi 5 Lokasi Proyek Aktif
            </div>
          </div>

          {/* Box 2: Total Aktual Terisi */}
          <div className="bg-slate-950/90 border border-blue-500/30 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider block">
              Total Aktual Personil (Data Karyawan)
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-400">
              {manpowerComparisonData.totalActualAssigned}{' '}
              <span className="text-xs font-normal text-slate-400">Cleaner Aktif</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Terverifikasi di database operasional
            </div>
          </div>

          {/* Box 3: Fulfillment Ratio */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Tingkat Keterisian (Fulfillment Ratio)
            </span>
            <div className="flex items-center space-x-2">
              <span className={`text-xl sm:text-2xl font-black ${
                manpowerComparisonData.overallFulfillment >= 100
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {manpowerComparisonData.overallFulfillment}%
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                manpowerComparisonData.totalDiff === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : manpowerComparisonData.totalDiff > 0
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {manpowerComparisonData.totalDiff === 0
                  ? 'Ideal 100%'
                  : manpowerComparisonData.totalDiff > 0
                  ? `+${manpowerComparisonData.totalDiff} Personil`
                  : `${manpowerComparisonData.totalDiff} Kekurangan`}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {manpowerComparisonData.overallFulfillment >= 100
                ? 'Semua pos kebersihan terpenuhi optimal'
                : 'Perlu penambahan rekrutmen / mutasi karyawan'}
            </div>
          </div>
        </div>

        {/* Breakdown per Project Site */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Komparasi Kuota Target vs Aktual per Gedung</span>
            <span>Rasio & Status Pos</span>
          </div>

          <div className="space-y-4">
            {manpowerComparisonData.breakdown.map((item) => {
              const targetWidthPct = Math.min(100, Math.max(10, (item.targetQuota / manpowerComparisonData.maxQuota) * 100));
              const actualWidthPct = Math.min(100, Math.max(10, (item.actualCount / manpowerComparisonData.maxQuota) * 100));

              return (
                <div
                  key={item.project.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {item.project.name}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                          {item.project.code}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          • Spv: <b className="text-slate-300">{item.supervisor}</b>
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {item.status === 'optimal' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Terpenuhi ({item.actualCount}/{item.targetQuota})</span>
                        </span>
                      )}
                      {item.status === 'shortage' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Kurang {Math.abs(item.diff)} Orang ({item.actualCount}/{item.targetQuota})</span>
                        </span>
                      )}
                      {item.status === 'excess' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold">
                          <Users className="w-3.5 h-3.5" />
                          <span>Lebih +{item.diff} Orang ({item.actualCount}/{item.targetQuota})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dual Bar Graphic for Manpower */}
                  <div className="space-y-1.5 pt-1">
                    {/* Target Bar */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="w-24 text-slate-400 font-semibold text-[11px] shrink-0">
                        Target Kuota:
                      </span>
                      <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden p-0.5 flex items-center">
                        <div
                          className="bg-slate-600 h-full rounded-full transition-all duration-700 flex items-center justify-end px-2 text-[10px] font-bold text-white"
                          style={{ width: `${targetWidthPct}%` }}
                        >
                          <span>{item.targetQuota} Petugas</span>
                        </div>
                      </div>
                    </div>

                    {/* Actual Bar */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="w-24 text-emerald-400 font-bold text-[11px] shrink-0">
                        Aktual Terisi:
                      </span>
                      <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden p-0.5 flex items-center">
                        <div
                          className={`h-full rounded-full transition-all duration-700 flex items-center justify-end px-2 text-[10px] font-black text-slate-950 shadow-md ${
                            item.status === 'optimal'
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-emerald-500/20'
                              : item.status === 'shortage'
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500 shadow-rose-500/20 text-white'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-blue-500/20'
                          }`}
                          style={{ width: `${actualWidthPct}%` }}
                        >
                          <span>{item.actualCount} Petugas ({item.fulfillmentPct}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role composition tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-400 border-t border-slate-800/60">
                    <span className="font-semibold text-slate-300">Komposisi:</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Cleaner: <b className="text-white">{item.positionsCount.cleaner}</b>
                    </span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Leader: <b className="text-white">{item.positionsCount.leader}</b>
                    </span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Floor/Gondola: <b className="text-white">{item.positionsCount.specialist}</b>
                    </span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Gardener: <b className="text-white">{item.positionsCount.gardener}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
