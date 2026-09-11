import React, { useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Gauge,
  Zap,
  Target,
  Users,
  Building2,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import { CleaningTask, Project, Employee } from '../../types';

interface TaskKPIViewProps {
  tasks: CleaningTask[];
  projects: Project[];
  employees: Employee[];
  selectedProjectId: string;
}

export const TaskKPIView: React.FC<TaskKPIViewProps> = ({
  tasks,
  projects,
  employees,
  selectedProjectId
}) => {
  // Filter tasks based on selected project
  const relevantTasks = useMemo(() => {
    if (selectedProjectId === 'ALL') return tasks;
    return tasks.filter((t) => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = relevantTasks.length;
    const todoCount = relevantTasks.filter((t) => t.status === 'todo').length;
    const inProgressCount = relevantTasks.filter((t) => t.status === 'in_progress').length;
    const reviewCount = relevantTasks.filter((t) => t.status === 'review').length;
    const doneCount = relevantTasks.filter((t) => t.status === 'done').length;

    // QC Decisions counts (among tasks that have been reviewed or are in review/done)
    const sesuaiCount = relevantTasks.filter((t) => t.qcStatus === 'Sesuai' || (t.status === 'done' && t.qcStatus !== 'Maksimalkan' && t.qcStatus !== 'Ulangi')).length;
    const maksimalkanCount = relevantTasks.filter((t) => t.qcStatus === 'Maksimalkan').length;
    const ulangiCount = relevantTasks.reduce((acc, t) => acc + (t.repeatCount || (t.qcStatus === 'Ulangi' ? 1 : 0)), 0);

    const totalQCAudits = sesuaiCount + maksimalkanCount + ulangiCount;
    const ketepatanRate = totalQCAudits > 0 ? Math.round((sesuaiCount / totalQCAudits) * 100) : (doneCount > 0 ? 100 : 0);

    // Speed metrics (Duration in minutes)
    const completedTasksWithDuration = relevantTasks.filter(
      (t) => t.status === 'done' && (t.durationMinutes !== undefined || t.submittedAt)
    );

    let avgDuration = 85; // default benchmark minutes
    if (completedTasksWithDuration.length > 0) {
      const sum = completedTasksWithDuration.reduce((acc, t) => {
        if (t.durationMinutes) return acc + t.durationMinutes;
        return acc + 60; // fallback standard 1 hour
      }, 0);
      avgDuration = Math.round(sum / completedTasksWithDuration.length);
    }

    // On-time vs Overdue rate
    const onTimeCount = relevantTasks.filter((t) => t.status === 'done' && !t.isOverdue).length;
    const onTimeRate = doneCount > 0 ? Math.round((onTimeCount / doneCount) * 100) : 100;

    // Speed Bracket Distribution
    let bracketFast = 0;   // < 45m
    let bracketNormal = 0; // 45 - 90m
    let bracketMedium = 0; // 90 - 150m
    let bracketSlow = 0;   // > 150m

    relevantTasks.forEach((t) => {
      const dur = t.durationMinutes || 60;
      if (dur <= 45) bracketFast++;
      else if (dur <= 90) bracketNormal++;
      else if (dur <= 150) bracketMedium++;
      else bracketSlow++;
    });

    return {
      total,
      todoCount,
      inProgressCount,
      reviewCount,
      doneCount,
      sesuaiCount,
      maksimalkanCount,
      ulangiCount,
      totalQCAudits,
      ketepatanRate,
      avgDuration,
      onTimeRate,
      speedBrackets: {
        fast: bracketFast,
        normal: bracketNormal,
        medium: bracketMedium,
        slow: bracketSlow
      }
    };
  }, [relevantTasks]);

  // Team Leader Performance Summary
  const leaderPerformance = useMemo(() => {
    const leaderMap: Record<
      string,
      {
        name: string;
        totalAssigned: number;
        doneCount: number;
        sesuaiCount: number;
        maksimalkanCount: number;
        ulangiCount: number;
        totalMinutes: number;
        countWithDuration: number;
      }
    > = {};

    relevantTasks.forEach((t) => {
      const leaderName =
        t.assignedLeaderName ||
        (t.assignedEmployees && t.assignedEmployees[0]) ||
        'Team Leader Standby';

      if (!leaderMap[leaderName]) {
        leaderMap[leaderName] = {
          name: leaderName,
          totalAssigned: 0,
          doneCount: 0,
          sesuaiCount: 0,
          maksimalkanCount: 0,
          ulangiCount: 0,
          totalMinutes: 0,
          countWithDuration: 0
        };
      }

      leaderMap[leaderName].totalAssigned++;
      if (t.status === 'done') leaderMap[leaderName].doneCount++;
      if (t.qcStatus === 'Sesuai' || t.status === 'done') leaderMap[leaderName].sesuaiCount++;
      if (t.qcStatus === 'Maksimalkan') leaderMap[leaderName].maksimalkanCount++;
      if (t.repeatCount || t.qcStatus === 'Ulangi') {
        leaderMap[leaderName].ulangiCount += (t.repeatCount || 1);
      }

      if (t.durationMinutes) {
        leaderMap[leaderName].totalMinutes += t.durationMinutes;
        leaderMap[leaderName].countWithDuration++;
      }
    });

    return Object.values(leaderMap).map((item) => {
      const totalAudits = item.sesuaiCount + item.maksimalkanCount + item.ulangiCount;
      const accuracyRate = totalAudits > 0 ? Math.round((item.sesuaiCount / totalAudits) * 100) : 100;
      const avgSpeed =
        item.countWithDuration > 0
          ? Math.round(item.totalMinutes / item.countWithDuration)
          : 75;

      return {
        ...item,
        accuracyRate,
        avgSpeed
      };
    });
  }, [relevantTasks]);

  const activeProjectObj = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-5">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Ketepatan / QC Accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Ketepatan Kualitas (QC)</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.ketepatanRate}%
            </span>
            <span className="text-[11px] font-bold text-emerald-400">Tingkat Kesesuaian</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.ketepatanRate}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            {metrics.sesuaiCount} tugas dinilai Sesuai dari {metrics.totalQCAudits || metrics.doneCount} audit.
          </p>
        </div>

        {/* KPI 2: Kecepatan / Avg Speed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Kecepatan Rata-Rata</span>
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.avgDuration}
            </span>
            <span className="text-xs font-semibold text-slate-300">Menit / Area</span>
          </div>
          <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Target standar: &lt; 90 Menit</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Durasi dari tugas didelegasikan hingga upload bukti & audit selesai.
          </p>
        </div>

        {/* KPI 3: On-Time Completion Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Ketepatan Waktu Target</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.onTimeRate}%
            </span>
            <span className="text-[11px] font-bold text-blue-400">On-Time</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.onTimeRate}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Penyelesaian sebelum batas jam target shift operasional.
          </p>
        </div>

        {/* KPI 4: Total Volume & Completion */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Penyelesaian Tugas</span>
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.doneCount}
            </span>
            <span className="text-xs text-slate-400">/ {metrics.total} Total Tugas</span>
          </div>
          <div className="mt-2 flex items-center space-x-2 text-[10px] text-slate-400">
            <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded border border-purple-800">
              {metrics.reviewCount} Menunggu Audit
            </span>
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800">
              {metrics.inProgressCount} Dikerjakan
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Semua tugas harian terpantau di Rajawali Board.
          </p>
        </div>
      </div>

      {/* Main Diagrams Row: Ketepatan Diagram & Kecepatan Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DIAGRAM 1: DIAGRAM KETEPATAN KUALITAS (QC ACCURACY) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Diagram Ketepatan Kualitas (Audit QC)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Proporsi keputusan penilaian: Sesuai, Maksimalkan, dan Ulangi.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Pass Rate {metrics.ketepatanRate}%
            </span>
          </div>

          {/* Simple Clean Visual Donut / Bar Chart Representation */}
          <div className="space-y-3 pt-2">
            {/* Visual Multi-Segment Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                <span>Distribusi Hasil Penilaian QC:</span>
                <span>Total: {metrics.totalQCAudits || metrics.doneCount} Hasil Audit</span>
              </div>
              <div className="w-full h-4 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800">
                <div
                  style={{
                    width: `${
                      metrics.totalQCAudits > 0
                        ? (metrics.sesuaiCount / metrics.totalQCAudits) * 100
                        : 75
                    }%`
                  }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title="Sesuai"
                />
                <div
                  style={{
                    width: `${
                      metrics.totalQCAudits > 0
                        ? (metrics.maksimalkanCount / metrics.totalQCAudits) * 100
                        : 20
                    }%`
                  }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title="Maksimalkan"
                />
                <div
                  style={{
                    width: `${
                      metrics.totalQCAudits > 0
                        ? (metrics.ulangiCount / metrics.totalQCAudits) * 100
                        : 5
                    }%`
                  }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title="Ulangi"
                />
              </div>
            </div>

            {/* Detailed 3 Choice Metric Breakdown Cards */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {/* Sesuai */}
              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 text-center space-y-1">
                <div className="flex items-center justify-center space-x-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-bold text-xs">Sesuai</span>
                </div>
                <div className="text-xl font-black text-white">{metrics.sesuaiCount}</div>
                <p className="text-[10px] text-slate-400">
                  {metrics.totalQCAudits > 0
                    ? Math.round((metrics.sesuaiCount / metrics.totalQCAudits) * 100)
                    : 100}
                  % Lolos Selesai
                </p>
              </div>

              {/* Maksimalkan */}
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
                <div className="flex items-center justify-center space-x-1 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-bold text-xs">Maksimalkan</span>
                </div>
                <div className="text-xl font-black text-white">{metrics.maksimalkanCount}</div>
                <p className="text-[10px] text-slate-400">
                  {metrics.totalQCAudits > 0
                    ? Math.round((metrics.maksimalkanCount / metrics.totalQCAudits) * 100)
                    : 0}
                  % Revisi Minor
                </p>
              </div>

              {/* Ulangi */}
              <div className="bg-slate-950 border border-rose-500/30 rounded-xl p-3 text-center space-y-1">
                <div className="flex items-center justify-center space-x-1 text-rose-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="font-bold text-xs">Ulangi</span>
                </div>
                <div className="text-xl font-black text-white">{metrics.ulangiCount}</div>
                <p className="text-[10px] text-slate-400">
                  {metrics.totalQCAudits > 0
                    ? Math.round((metrics.ulangiCount / metrics.totalQCAudits) * 100)
                    : 0}
                  % Reset Foto
                </p>
              </div>
            </div>

            {/* Quality Note */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2 text-[11px] text-slate-300">
              <span className="text-emerald-400 font-bold">✓ Kriteria Mutu:</span>
              <span className="text-slate-400">
                Pekerjaan yang dinilai <b>"Sesuai"</b> menandakan area 100% higienis, cermin bebas noda air, lantai kering, dan perlengkapan toilet telah terisi lengkap.
              </span>
            </div>
          </div>
        </div>

        {/* DIAGRAM 2: DIAGRAM KECEPATAN PENYELESAIAN (TURNAROUND SPEED) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Diagram Kecepatan Penyelesaian Tugas
                </h3>
                <p className="text-[11px] text-slate-400">
                  Distribusi durasi pengerjaan dari delegasi hingga disetujui.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Rata-rata: {metrics.avgDuration} Mnt
            </span>
          </div>

          {/* Speed Distribution Bars */}
          <div className="space-y-2.5 pt-1">
            {/* Fast: < 45m */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span className="flex items-center space-x-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Cepat (&lt; 45 Menit) - Efisiensi Tinggi</span>
                </span>
                <span className="font-bold text-emerald-400">{metrics.speedBrackets.fast} Tugas</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      metrics.total > 0 ? (metrics.speedBrackets.fast / metrics.total) * 100 : 35
                    }%`
                  }}
                />
              </div>
            </div>

            {/* Normal: 45 - 90m */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span className="flex items-center space-x-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Standar Optimal (45 - 90 Menit)</span>
                </span>
                <span className="font-bold text-blue-400">{metrics.speedBrackets.normal} Tugas</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      metrics.total > 0 ? (metrics.speedBrackets.normal / metrics.total) * 100 : 45
                    }%`
                  }}
                />
              </div>
            </div>

            {/* Medium: 90 - 150m */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span className="flex items-center space-x-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Pengerjaan Intensif (90 - 150 Menit)</span>
                </span>
                <span className="font-bold text-amber-400">{metrics.speedBrackets.medium} Tugas</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      metrics.total > 0 ? (metrics.speedBrackets.medium / metrics.total) * 100 : 15
                    }%`
                  }}
                />
              </div>
            </div>

            {/* Slow: > 150m */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span className="flex items-center space-x-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Deep Cleaning / Lebih Lama (&gt; 150 Menit)</span>
                </span>
                <span className="font-bold text-rose-400">{metrics.speedBrackets.slow} Tugas</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      metrics.total > 0 ? (metrics.speedBrackets.slow / metrics.total) * 100 : 5
                    }%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Speed Note */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2 text-[11px] text-slate-300">
            <span className="text-amber-400 font-bold">⚡ Kecepatan Respon:</span>
            <span className="text-slate-400">
              Team Leader yang menyelesaikan tugas tepat waktu & cepat membantu menjaga kesiapan fasilitas sebelum jam kunjungan puncak tenant.
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table: Performa Team Leader / Supervisor */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Leaderboard & Rekapitulasi Performa Team Leader
              </h3>
              <p className="text-[11px] text-slate-400">
                Evaluasi ketepatan kualitas QC, kecepatan pengerjaan, dan efektivitas tim per area.
              </p>
            </div>
          </div>

          <span className="text-xs text-slate-400 font-medium self-start sm:self-auto">
            Lokasi: <span className="text-white font-bold">{activeProjectObj ? activeProjectObj.name : 'Semua Lokasi'}</span>
          </span>
        </div>

        {/* Table of Leaders */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Team Leader / Penerima</th>
                <th className="py-2.5 px-3 font-semibold text-center">Total Ditugaskan</th>
                <th className="py-2.5 px-3 font-semibold text-center">Selesai (Done)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Ketepatan QC (% Sesuai)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Rata-Rata Kecepatan</th>
                <th className="py-2.5 px-3 font-semibold text-center">Revisi / Ulangi</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status Performa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaderPerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 text-xs italic">
                    Belum ada riwayat penugasan pada lokasi ini
                  </td>
                </tr>
              ) : (
                leaderPerformance.map((lead, idx) => {
                  const isTop = idx === 0 && lead.accuracyRate >= 90;
                  return (
                    <tr key={lead.name} className="hover:bg-slate-950/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{lead.name}</span>
                            <span className="text-[10px] text-slate-400">Area Operasional</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-slate-300">
                        {lead.totalAssigned}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-400">
                        {lead.doneCount}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <span
                            className={`font-extrabold text-xs ${
                              lead.accuracyRate >= 90
                                ? 'text-emerald-400'
                                : lead.accuracyRate >= 75
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {lead.accuracyRate}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {lead.avgSpeed} Mnt
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1 text-[11px]">
                          {lead.maksimalkanCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/30">
                              {lead.maksimalkanCount} Maks
                            </span>
                          )}
                          {lead.ulangiCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-300 rounded border border-rose-500/30">
                              {lead.ulangiCount} Ulang
                            </span>
                          )}
                          {lead.maksimalkanCount === 0 && lead.ulangiCount === 0 && (
                            <span className="text-slate-500">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {lead.accuracyRate >= 90 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sangat Baik</span>
                          </span>
                        ) : lead.accuracyRate >= 75 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Cukup Baik</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            <RotateCcw className="w-3 h-3" />
                            <span>Perlu Perhatian</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
