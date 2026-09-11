import React, { useState, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  Eye,
  Layers,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';
import { CleaningTask, TaskChecklistItem } from '../../types';

interface TaskPhotoUploadModalProps {
  task: CleaningTask;
  initialChecklistId?: string; // Optional focus item
  onClose: () => void;
  onSubmit: (taskId: string, updatedChecklist: TaskChecklistItem[], notes: string) => void;
  onSaveDraft?: (taskId: string, updatedChecklist: TaskChecklistItem[], notes: string) => void;
  onOpenPhotoViewer?: (photoUrl: string, title: string) => void;
}

export const TaskPhotoUploadModal: React.FC<TaskPhotoUploadModalProps> = ({
  task,
  initialChecklistId,
  onClose,
  onSubmit,
  onSaveDraft,
  onOpenPhotoViewer
}) => {
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(
    task.checklist.map((c) => ({ ...c }))
  );
  const [notes, setNotes] = useState<string>(task.evidenceNotes || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track which checklist item is triggering the file input
  const [activeItemForUpload, setActiveItemForUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalItems = checklist.length;
  const uploadedCount = checklist.filter((c) => Boolean(c.photo)).length;
  const isAllUploaded = totalItems > 0 && uploadedCount === totalItems;
  const completionPercentage = totalItems > 0 ? Math.round((uploadedCount / totalItems) * 100) : 100;

  const triggerUploadForItem = (itemId: string) => {
    setActiveItemForUpload(itemId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap pilih file berupa gambar / foto (JPG, PNG, WEBP).');
      return;
    }

    if (!activeItemForUpload) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const photoDataUrl = e.target.result as string;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

        setChecklist((prev) =>
          prev.map((item) => {
            if (item.id === activeItemForUpload) {
              return {
                ...item,
                photo: photoDataUrl,
                done: true, // Automatically marked done when photo is uploaded
                photoUploadedAt: now
              };
            }
            return item;
          })
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            photo: undefined,
            photoUploadedAt: undefined
          };
        }
        return item;
      })
    );
  };

  const handleToggleDone = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            done: !item.done
          };
        }
        return item;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAllUploaded) {
      const missingCount = totalItems - uploadedCount;
      setErrorMessage(
        `Wajib melampirkan 1 foto untuk setiap item checklist! Masih ada ${missingCount} item yang belum memiliki foto bukti.`
      );
      return;
    }

    onSubmit(task.id, checklist, notes);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Upload Foto Bukti Per Item Checklist (1 Checklist = 1 Foto)
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-sm">{task.areaName}</p>
            </div>
          </div>
          <button
            id="close-photo-upload-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Global File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChange(e.target.files[0]);
            }
          }}
        />

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Progress & Requirement Banner */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-300">Status Kelengkapan Foto:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isAllUploaded
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {uploadedCount} dari {totalItems} Foto Terupload ({completionPercentage}%)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                1 Checklist = 1 Foto
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isAllUploaded ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <p className="text-[10.5px] text-slate-400">
              {isAllUploaded ? (
                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Semua foto checklist lengkap ({totalItems}/{totalItems}). Siap dikirim ke Supervisor untuk Audit QC.</span>
                </span>
              ) : (
                <span className="text-amber-400/90 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Jika terdapat {totalItems} list checklist, maka wajib mengunggah {totalItems} foto (upload tepat di bawah masing-masing item).
                  </span>
                </span>
              )}
            </p>
          </div>

          {/* Checklist Items with Photo Upload directly below each item */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-semibold px-1">
              <span>Daftar Item Checklist & Foto Bukti:</span>
              <span className="text-[11px] text-slate-400">Klik tombol kamera untuk upload</span>
            </div>

            {checklist.map((item, index) => {
              const hasPhoto = Boolean(item.photo);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    hasPhoto
                      ? 'bg-slate-950/90 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Item Row: Checkbox, Number, and Text */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleDone(item.id)}
                        className="mt-0.5 text-slate-400 hover:text-amber-400 cursor-pointer shrink-0"
                      >
                        {item.done ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[10px] text-slate-500">#{index + 1}</span>
                          <span
                            className={`font-semibold text-xs leading-snug ${
                              item.done ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {hasPhoto ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Foto Ada</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-md text-[10px] font-semibold flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Foto Wajib</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PHOTO UPLOAD SECTION DIRECTLY BELOW CHECKLIST ITEM */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    {hasPhoto ? (
                      /* Display Attached Photo Preview */
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <div className="flex items-center space-x-3">
                          <div
                            onClick={() =>
                              onOpenPhotoViewer &&
                              onOpenPhotoViewer(
                                item.photo!,
                                `Item #${index + 1}: ${item.text}`
                              )
                            }
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0 cursor-pointer group"
                          >
                            <img
                              src={item.photo}
                              alt={item.text}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>

                          <div>
                            <span className="font-bold text-white text-[11px] block">
                              Foto Bukti Item #{index + 1}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium block">
                              ✓ Terlampir & Terverifikasi
                            </span>
                            {item.photoUploadedAt && (
                              <span className="text-[9.5px] text-slate-500 font-mono">
                                Diunggah: {item.photoUploadedAt}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons for attached photo */}
                        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                          {onOpenPhotoViewer && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenPhotoViewer(
                                  item.photo!,
                                  `Item #${index + 1}: ${item.text}`
                                )
                              }
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Zoom</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => triggerUploadForItem(item.id)}
                            className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Ganti Foto</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(item.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition cursor-pointer"
                            title="Hapus foto item ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty State: Upload Button Box directly beneath checklist item */
                      <div
                        onClick={() => triggerUploadForItem(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setActiveItemForUpload(item.id);
                            handleFileChange(e.dataTransfer.files[0]);
                          }
                        }}
                        className="border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-900/60 hover:bg-slate-900 rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-2.5 text-left">
                          <div className="p-2 bg-slate-800 group-hover:bg-amber-500/10 rounded-lg border border-slate-700 group-hover:border-amber-500/30 text-slate-400 group-hover:text-amber-400 transition">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-[11px]">
                              Upload Foto Bukti untuk Item #{index + 1}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Klik untuk ambil foto kamera / pilih galeri (1 checklist = 1 foto)
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1.5 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg shadow transition">
                          + Ambil Foto
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center space-x-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Notes by Team Leader */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Catatan Keseluruhan Penyelesaian Tugas (Opsional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Seluruh checklist kebersihan telah diselesaikan dengan bukti foto lengkap sesuai standar operasional..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400">
              Kelengkapan: <span className="font-bold text-white">{uploadedCount}/{totalItems} Foto</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>

              {onSaveDraft && (
                <button
                  type="button"
                  id="save-draft-photo-progress-btn"
                  onClick={() => onSaveDraft(task.id, checklist, notes)}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Simpan Progres
                </button>
              )}

              <button
                id="submit-photo-to-qc-btn"
                type="submit"
                disabled={!isAllUploaded}
                className="flex items-center space-x-1.5 px-4.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAllUploaded
                    ? 'Kirim ke Audit QC (Semua Foto Lengkap)'
                    : `Lengkapi Foto (${uploadedCount}/${totalItems})`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
