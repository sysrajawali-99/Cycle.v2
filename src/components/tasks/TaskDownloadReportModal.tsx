import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Calendar,
  Building2,
  Clock,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  Image as ImageIcon,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { CleaningTask, Project } from '../../types';
import { formatDateDDMMYYYY, formatDateTimeStamp } from '../../utils/formatters';
import { generateCompletedTasksPDF } from '../../utils/pdfExport';

interface TaskDownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: CleaningTask[];
  projects: Project[];
  initialProjectId?: string;
  initialTask?: CleaningTask | null;
}

export const TaskDownloadReportModal: React.FC<TaskDownloadReportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  initialProjectId = 'ALL',
  initialTask = null
}) => {
  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTask?.id || 'ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const printTimestampStr = formatDateTimeStamp(new Date());

  // Filter tasks that are in 'done' status
  const allDoneTasks = tasks.filter((t) => t.status === 'done');

  const filteredCompletedTasks = allDoneTasks.filter((t) => {
    if (selectedTaskId !== 'ALL' && t.id !== selectedTaskId) return false;
    if (selectedProjectId !== 'ALL' && t.projectId !== selectedProjectId) return false;
    if (selectedShift !== 'ALL' && t.shift !== selectedShift) return false;
    if (selectedDate) {
      const taskDate = (t.completedAt || t.submittedAt || t.createdAt || '').substring(0, 10);
      if (taskDate && taskDate !== selectedDate) return false;
    }
    return true;
  });

  const currentProjectName =
    selectedProjectId === 'ALL'
      ? 'Konsolidasi Semua Lokasi Proyek'
      : projects.find((p) => p.id === selectedProjectId)?.name || 'Lokasi Proyek';

  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      generateCompletedTasksPDF({
        tasks: filteredCompletedTasks,
        projects,
        selectedProjectId,
        selectedDate,
        selectedShift,
        reportTitle:
          selectedTaskId !== 'ALL'
            ? `LAPORAN TUGAS SELESAI AREA: ${filteredCompletedTasks[0]?.areaName || ''}`
            : 'LAPORAN REKAPITULASI PENYELESAIAN TUGAS AREA CLEANING'
      });
    } catch (err) {
      console.error('Failed to export tasks PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      id="task-download-report-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Download Laporan Tugas Selesai (Area Cleaning)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  {filteredCompletedTasks.length} Tugas Selesai
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Data resmi: dd/mm/yyyy • Pemberi Tugas • Penerima Tugas • Shift • List Checklist & Foto Disampingnya • Keterangan & Timestamp Cetak.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="print-report-btn"
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Cetak via browser print"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              id="download-pdf-btn"
              type="button"
              onClick={handleDownloadPDF}
              disabled={filteredCompletedTasks.length === 0 || isExporting}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Memproses...' : 'Unduh PDF (A4)'}</span>
            </button>
            <button
              id="close-download-modal-btn"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Site Selector */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Lokasi Proyek:</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Lokasi Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Shift Operasional:</span>
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Shift</option>
              <option value="Pagi">Shift 1 (Pagi 06:00 - 14:00)</option>
              <option value="Siang">Shift 2 (Siang 14:00 - 22:00)</option>
              <option value="Malam">Shift 3 (Malam 22:00 - 06:00)</option>
              <option value="General">Shift General (08:00 - 17:00)</option>
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tanggal Pengerjaan (Filter):</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            />
          </div>

          {/* Specific Task Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span>Pilihan Tugas Selesai:</span>
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Tugas Selesai ({allDoneTasks.length})</option>
              {allDoneTasks.map((t, idx) => (
                <option key={t.id} value={t.id}>
                  #{idx + 1} {t.areaName} ({t.shift})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal Scrollable Content (A4 Document Layout Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950/40">
          {filteredCompletedTasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">
                Tidak ada data tugas selesai yang cocok dengan filter
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pastikan tugas di kolom <b>Sedang Dikerjakan</b> telah diceklist, foto bukti diupload, dan telah disetujui (Sesuai) oleh Supervisor pada tahap Audit QC.
              </p>
            </div>
          ) : (
            <div
              id="printable-cleaning-report"
              className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 border border-slate-200"
            >
              {/* Document Header */}
              <div className="border-b-2 border-amber-500 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                      PT RAJAWALI PRIMA SERVICE
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-300">
                      OFFICIAL CLEANING REPORT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Commercial Cleaning & Facility Management • Sistem Rajawali Boards
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Menara Rajawali Lt. 12, Mega Kuningan, Jakarta Selatan • Telp: (021) 5299-8800
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">
                    LAPORAN PENYELESAIAN TUGAS
                  </div>
                  <div>Lokasi: <span className="font-semibold text-slate-800">{currentProjectName}</span></div>
                  <div>Total Selesai: <span className="font-bold text-emerald-600">{filteredCompletedTasks.length} Tugas (100% QC)</span></div>
                </div>
              </div>

              {/* List of Completed Task Cards */}
              <div className="space-y-6">
                {filteredCompletedTasks.map((task, index) => {
                  const dateFormatted = formatDateDDMMYYYY(
                    task.completedAt || task.submittedAt || task.createdAt || new Date()
                  );
                  const assigner = task.assignedBy || 'Supervisor Lapangan';
                  const assignee =
                    task.assignedLeaderName ||
                    (task.assignedEmployees && task.assignedEmployees.length > 0
                      ? task.assignedEmployees.join(', ')
                      : 'Team Leader');
                  const shift = task.shift || 'Shift 1 (Pagi)';
                  const notes = task.notes || '-';
                  const qcNote = task.qcFeedback || 'Pekerjaan sangat rapi dan memenuhi SOP 100%.';
                  const reviewer = task.qcReviewedBy || 'Supervisor Lapangan';

                  return (
                    <div
                      key={task.id}
                      className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 page-break-inside-avoid"
                    >
                      {/* Task Info Bar: Tanggal - Pemberi Tugas - Penerima Tugas - Shift */}
                      <div className="bg-slate-900 text-white p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-amber-400">
                              #{index + 1}. Area: {task.areaName}
                            </span>
                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                              {task.frequency || 'Harian'}
                            </span>
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                              ✓ Selesai
                            </span>
                          </div>

                          {/* Explicit required metadata fields */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px] text-slate-300 font-medium">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Tanggal (dd/mm/yyyy):</span>
                              <span className="font-bold text-white">{dateFormatted}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Pemberi Tugas:</span>
                              <span className="font-bold text-white">{assigner}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Penerima Tugas:</span>
                              <span className="font-bold text-white">{assignee}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Shift:</span>
                              <span className="font-bold text-amber-300">{shift}</span>
                            </div>
                          </div>
                        </div>

                        {task.durationMinutes && (
                          <div className="text-right text-[11px] bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 shrink-0">
                            <span className="text-slate-400 block text-[10px]">Durasi:</span>
                            <span className="font-bold text-emerald-400 font-mono">
                              ⏱ {task.durationMinutes} Menit
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Main Body: List Tugas Selesai Beserta Foto Disamping Nya */}
                      <div className="p-4 space-y-3">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5 pb-1 border-b border-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Rincian List Tugas Selesai & Foto Bukti Disamping Nya:</span>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {task.checklist.map((cItem, cIdx) => {
                            const photoSrc = cItem.photo || task.evidencePhoto;

                            return (
                              <div
                                key={cItem.id || cIdx}
                                className="py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                              >
                                {/* Left Side: List Tugas Checklist */}
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-start space-x-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300">
                                      ✓
                                    </span>
                                    <div>
                                      <div className="text-xs font-bold text-slate-900">
                                        Item #{cIdx + 1}: {cItem.text}
                                      </div>
                                      <div className="text-[11px] text-slate-600 flex items-center space-x-2 mt-0.5">
                                        <span className="text-emerald-700 font-semibold">
                                          Status: 100% Selesai
                                        </span>
                                        <span>•</span>
                                        <span>Penilaian: <b>{cItem.itemQC || 'Sesuai'}</b></span>
                                      </div>
                                      {cItem.photoUploadedAt && (
                                        <div className="text-[10px] text-slate-400">
                                          Waktu Upload: {cItem.photoUploadedAt}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Foto Disamping Nya */}
                                <div className="w-full md:w-64 shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                                  {photoSrc ? (
                                    <>
                                      <img
                                        src={photoSrc}
                                        alt={`Bukti ${cItem.text}`}
                                        className="w-20 h-16 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="text-[11px] text-slate-600 space-y-0.5">
                                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                                          <ImageIcon className="w-3 h-3 text-blue-600" />
                                          <span>Foto Bukti #{cIdx + 1}</span>
                                        </div>
                                        <div className="text-[10px] text-emerald-600 font-semibold">
                                          ✓ Terverifikasi QC
                                        </div>
                                        <div className="text-[9.5px] text-slate-400">
                                          Resolusi Valid
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full py-3 text-center text-[10px] text-slate-400 italic">
                                      Foto bukti terverifikasi sistem
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Keterangan & Catatan QC Box */}
                        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs space-y-1 mt-2">
                          <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Keterangan & Catatan Evaluasi:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
                            <div>
                              <span className="font-semibold text-slate-900 block">Catatan / Instruksi Kerja:</span>
                              <span className="text-slate-600">{notes}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                Hasil Evaluasi QC ({reviewer}):
                              </span>
                              <span className="text-slate-600">{qcNote}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Signatures Block */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-xs text-slate-700 page-break-inside-avoid">
                <div className="space-y-12">
                  <p className="font-semibold">Pemberi Tugas</p>
                  <div>
                    <p className="font-bold text-slate-900">Supervisor Lapangan</p>
                    <p className="text-[10px] text-slate-500">PT Rajawali Prima Service</p>
                  </div>
                </div>
                <div className="space-y-12">
                  <p className="font-semibold">Penerima Tugas</p>
                  <div>
                    <p className="font-bold text-slate-900">Team Leader / Petugas</p>
                    <p className="text-[10px] text-slate-500">Pelaksana Operasional</p>
                  </div>
                </div>
                <div className="space-y-12">
                  <p className="font-semibold">Disetujui & Diverifikasi</p>
                  <div>
                    <p className="font-bold text-slate-900">Operations Manager</p>
                    <p className="text-[10px] text-slate-500">Head of Facility Management</p>
                  </div>
                </div>
              </div>

              {/* Time Stamp Cetak di Bawah Nya */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10.5px] text-slate-500">
                <div className="font-bold text-slate-800">
                  Time stamp cetak: {printTimestampStr}
                </div>
                <div>
                  PT Rajawali Prima Service • Dokumen Resmi Rajawali Boards (Area Cleaning Management)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Total {filteredCompletedTasks.length} tugas siap diekspor ke PDF resmi ukuran A4.
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={filteredCompletedTasks.length === 0 || isExporting}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Memproses...' : 'Unduh Laporan PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
