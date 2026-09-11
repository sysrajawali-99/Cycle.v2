import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X,
  Clock,
  User,
  ShieldCheck,
  Image as ImageIcon,
  CheckSquare,
  Eye,
  Camera,
  Info
} from 'lucide-react';
import { CleaningTask, QCStatus, TaskChecklistItem } from '../../types';

interface TaskQCModalProps {
  task: CleaningTask;
  reviewerName: string;
  onClose: () => void;
  onDecision: (
    taskId: string,
    decision: 'Sesuai' | 'Maksimalkan' | 'Ulangi',
    feedback: string,
    updatedChecklist?: TaskChecklistItem[]
  ) => void;
  onOpenPhotoViewer?: (photoUrl: string, title: string) => void;
}

export const TaskQCModal: React.FC<TaskQCModalProps> = ({
  task,
  reviewerName,
  onClose,
  onDecision,
  onOpenPhotoViewer
}) => {
  // Local state for each checklist item's evaluation
  const [itemsChecklist, setItemsChecklist] = useState<TaskChecklistItem[]>(() =>
    task.checklist.map((c) => ({
      ...c,
      itemQC: c.itemQC || 'Sesuai'
    }))
  );

  const [selectedDecision, setSelectedDecision] = useState<'Sesuai' | 'Maksimalkan' | 'Ulangi'>('Sesuai');
  const [feedback, setFeedback] = useState<string>(task.qcFeedback || '');

  const totalItems = itemsChecklist.length;
  const itemsWithPhotos = itemsChecklist.filter((c) => Boolean(c.photo)).length;

  // Handle individual item QC rating click under photo
  const handleItemRatingChange = (itemId: string, rating: 'Sesuai' | 'Maksimalkan' | 'Ulangi') => {
    const updated = itemsChecklist.map((c) => (c.id === itemId ? { ...c, itemQC: rating } : c));
    setItemsChecklist(updated);

    // Auto-suggest overall decision based on item ratings:
    // If any item is 'Ulangi', overall defaults to 'Ulangi'
    // Else if any item is 'Maksimalkan', overall defaults to 'Maksimalkan'
    // Else all 'Sesuai', overall defaults to 'Sesuai'
    const hasUlangi = updated.some((c) => c.itemQC === 'Ulangi');
    const hasMaksimalkan = updated.some((c) => c.itemQC === 'Maksimalkan');

    if (hasUlangi) {
      setSelectedDecision('Ulangi');
    } else if (hasMaksimalkan) {
      setSelectedDecision('Maksimalkan');
    } else {
      setSelectedDecision('Sesuai');
    }
  };

  const handleApplyDecision = () => {
    onDecision(task.id, selectedDecision, feedback, itemsChecklist);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Inspeksi & Audit QC Kebersihan</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-sm">{task.areaName}</p>
            </div>
          </div>
          <button
            id="close-qc-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-500 block">Penerima Tugas:</span>
              <span className="font-bold text-white truncate block">
                {task.assignedLeaderName || task.assignedEmployees.join(', ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Pemberi Tugas:</span>
              <span className="font-semibold text-amber-400 truncate block">{reviewerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Target Waktu:</span>
              <span className="font-mono text-slate-300">
                {task.targetCompletionTime || 'Sesuai Shift'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Pengulangan:</span>
              <span className="font-semibold text-slate-300">
                {task.repeatCount ? `${task.repeatCount}x Diulang` : '0x (Pertama)'}
              </span>
            </div>
          </div>

          {/* Workflow Guide Notice */}
          <div className="p-2.5 bg-purple-950/20 border border-purple-500/30 rounded-xl text-[11px] text-purple-200 space-y-1">
            <div className="font-bold flex items-center space-x-1.5 text-purple-300">
              <Info className="w-3.5 h-3.5" />
              <span>Aturan Penilaian Audit QC:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-purple-300/90">
              <li>
                <b>Sesuai:</b> Tugas & foto berpindah ke kolom <b>Selesai</b>.
              </li>
              <li>
                <b>Maksimalkan:</b> Tugas & foto berpindah kembali ke kolom <b>Sedang Dikerjakan</b> untuk disempurnakan.
              </li>
              <li>
                <b>Ulangi:</b> Tugas berpindah kembali ke <b>List Tugas</b> dan <b>menghapus semua foto yang telah diupload</b>.
              </li>
            </ul>
          </div>

          {/* Checklist & Photos Audit List (1 Checklist = 1 Photo Inspection + Rating per item) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-semibold px-1">
              <div className="flex items-center space-x-2">
                <span>Pemeriksaan & Penilaian Foto per Item Checklist:</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                  {itemsWithPhotos}/{totalItems} Foto Tersedia
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Klik foto untuk perbesar (zoom)</span>
            </div>

            <div className="space-y-3.5">
              {itemsChecklist.map((item, index) => {
                const photoSrc = item.photo || task.evidencePhoto;
                const currentItemQC = item.itemQC || 'Sesuai';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 shadow-sm"
                  >
                    {/* Item Title & Check status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2 flex-1">
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[10px] text-slate-500">#{index + 1}</span>
                            <span className="font-semibold text-white text-xs leading-snug">
                              {item.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {photoSrc ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold shrink-0">
                          Foto Terverifikasi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded text-[10px] font-semibold shrink-0">
                          Foto Belum Diunggah
                        </span>
                      )}
                    </div>

                    {/* Photo attached directly beneath this checklist item */}
                    {photoSrc ? (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                        <div
                          onClick={() =>
                            onOpenPhotoViewer &&
                            onOpenPhotoViewer(
                              photoSrc,
                              `Audit Foto #${index + 1}: ${item.text} (${task.areaName})`
                            )
                          }
                          className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer group h-44 flex items-center justify-center shadow-md"
                        >
                          <img
                            src={photoSrc}
                            alt={item.text}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 bg-black/75 backdrop-blur-sm rounded-lg text-white font-semibold text-xs flex items-center space-x-1.5 shadow">
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Klik untuk Perbesar (Zoom)</span>
                            </span>
                          </div>
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9.5px] text-amber-300 font-bold flex items-center space-x-1">
                            <Camera className="w-3 h-3" />
                            <span>Foto Bukti #{index + 1}</span>
                          </div>
                        </div>

                        {/* PENILAIAN MASING-MASING ITEM DI BAWAH GAMBAR FOTO */}
                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-400 font-medium">
                              Penilaian Item #{index + 1} di bawah foto:
                            </span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                currentItemQC === 'Sesuai'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : currentItemQC === 'Maksimalkan'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              Status: {currentItemQC}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {/* Sesuai Button */}
                            <button
                              type="button"
                              onClick={() => handleItemRatingChange(item.id, 'Sesuai')}
                              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer ${
                                currentItemQC === 'Sesuai'
                                  ? 'bg-emerald-600 text-white shadow ring-1 ring-emerald-400'
                                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Sesuai</span>
                            </button>

                            {/* Maksimalkan Button */}
                            <button
                              type="button"
                              onClick={() => handleItemRatingChange(item.id, 'Maksimalkan')}
                              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer ${
                                currentItemQC === 'Maksimalkan'
                                  ? 'bg-amber-600 text-white shadow ring-1 ring-amber-400'
                                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Maksimalkan</span>
                            </button>

                            {/* Ulangi Button */}
                            <button
                              type="button"
                              onClick={() => handleItemRatingChange(item.id, 'Ulangi')}
                              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer ${
                                currentItemQC === 'Ulangi'
                                  ? 'bg-rose-600 text-white shadow ring-1 ring-rose-400'
                                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3 text-rose-400" />
                              <span>Ulangi</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 flex items-center space-x-2 text-[10.5px]">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Item checklist ini belum memiliki foto bukti terlampir.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes from Team Leader */}
          {task.evidenceNotes && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold block">
                Catatan Penyelesaian dari Team Leader:
              </span>
              <p className="text-xs text-slate-200 italic">"{task.evidenceNotes}"</p>
            </div>
          )}

          {/* Overall 3 Decision Choices */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-slate-200 font-bold text-xs">
              Keputusan Akhir Penilaian Audit QC Tugas:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Choice 1: Sesuai */}
              <button
                type="button"
                id="qc-decision-sesuai-btn"
                onClick={() => setSelectedDecision('Sesuai')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1.5 cursor-pointer ${
                  selectedDecision === 'Sesuai'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sesuai</span>
                  </span>
                  {selectedDecision === 'Sesuai' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Pindah ke <b>Selesai</b>. Tugas & foto dinyatakan bersih sesuai SOP.
                </p>
              </button>

              {/* Choice 2: Maksimalkan */}
              <button
                type="button"
                id="qc-decision-maksimalkan-btn"
                onClick={() => setSelectedDecision('Maksimalkan')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1.5 cursor-pointer ${
                  selectedDecision === 'Maksimalkan'
                    ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-400 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Maksimalkan</span>
                  </span>
                  {selectedDecision === 'Maksimalkan' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Pindah ke <b>Sedang Dikerjakan</b>. Foto tetap tersimpan untuk disempurnakan.
                </p>
              </button>

              {/* Choice 3: Ulangi */}
              <button
                type="button"
                id="qc-decision-ulangi-btn"
                onClick={() => setSelectedDecision('Ulangi')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1.5 cursor-pointer ${
                  selectedDecision === 'Ulangi'
                    ? 'bg-rose-950/40 border-rose-500 text-white shadow-lg shadow-rose-950/40 ring-1 ring-rose-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-400 flex items-center space-x-1">
                    <RotateCcw className="w-4 h-4" />
                    <span>Ulangi</span>
                  </span>
                  {selectedDecision === 'Ulangi' && (
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Pindah ke <b>List Tugas</b> & <b>foto terhapus</b> untuk diulang dari awal.
                </p>
              </button>
            </div>
          </div>

          {/* Action Impact Highlight */}
          <div
            className={`p-3 rounded-xl border text-[11px] ${
              selectedDecision === 'Sesuai'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : selectedDecision === 'Maksimalkan'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {selectedDecision === 'Sesuai' && (
              <p>
                ✓ <b>Konsekuensi Sesuai:</b> List tugas beserta seluruh foto bukti akan berpindah ke kolom <b>Selesai (Done)</b>.
              </p>
            )}
            {selectedDecision === 'Maksimalkan' && (
              <p>
                ⚠️ <b>Konsekuensi Maksimalkan:</b> List tugas beserta foto akan berpindah/tetap berada di kolom <b>Sedang Dikerjakan</b> agar Team Leader menyempurnakan area yang belum maksimal.
              </p>
            )}
            {selectedDecision === 'Ulangi' && (
              <p>
                🔄 <b>Konsekuensi Ulangi:</b> List tugas akan berpindah <b>KEMBALI KE LIST TUGAS</b> dan <b>SEMUA FOTO YANG TELAH DIUPLOAD AKAN DIHAPUS</b> agar tugas diulang dari awal.
              </p>
            )}
          </div>

          {/* Feedback Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Catatan / Evaluasi Supervisor untuk Team Leader:
            </label>
            <textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                selectedDecision === 'Sesuai'
                  ? 'Contoh: Pekerjaan sangat rapi, seluruh foto checklist sesuai SOP.'
                  : selectedDecision === 'Maksimalkan'
                  ? 'Contoh: Masih ada noda air di wastafel pada foto #2, tolong dimaksimalkan.'
                  : 'Contoh: Lantai masih kotor berdebu. Wajib diulang dari awal dan foto ulang.'
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              id="submit-qc-decision-btn"
              type="button"
              onClick={handleApplyDecision}
              className={`px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center space-x-1.5 ${
                selectedDecision === 'Sesuai'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : selectedDecision === 'Maksimalkan'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              {selectedDecision === 'Sesuai' && <CheckCircle2 className="w-4 h-4" />}
              {selectedDecision === 'Maksimalkan' && <AlertTriangle className="w-4 h-4" />}
              {selectedDecision === 'Ulangi' && <RotateCcw className="w-4 h-4" />}
              <span>Terapkan Keputusan: {selectedDecision}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

