import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  Calendar,
  User,
  Search,
  Tag,
  AlertCircle,
  Sparkles,
  Share2,
  Trash2
} from 'lucide-react';
import { BlastAnnouncement, UserRole } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

interface EagleBlastProps {
  blasts: BlastAnnouncement[];
  onAddBlast: (blast: BlastAnnouncement) => void;
  onUpdateBlasts?: (blasts: BlastAnnouncement[]) => void;
  userRole: UserRole;
}

export const EagleBlast: React.FC<EagleBlastProps> = ({
  blasts,
  onAddBlast,
  onUpdateBlasts,
  userRole
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [blastToDelete, setBlastToDelete] = useState<BlastAnnouncement | null>(null);

  const [form, setForm] = useState<{
    title: string;
    content: string;
    category: 'PENTING' | 'INFO' | 'SOP' | 'EVENT' | 'AUDIT';
    pinned: boolean;
  }>({
    title: '',
    content: '',
    category: 'INFO',
    pinned: false
  });

  const filteredBlasts = blasts
    .filter((b) => {
      if (categoryFilter !== 'ALL' && b.category !== categoryFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.content.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const handleSaveBlast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    const newBlast: BlastAnnouncement = {
      id: `blast-${Date.now()}`,
      title: form.title,
      content: form.content,
      category: form.category,
      author: `${userRole} (Pusat)`,
      date: new Date().toISOString().split('T')[0],
      pinned: form.pinned
    };

    onAddBlast(newBlast);
    setShowAddModal(false);
  };

  const confirmExecuteDeleteBlast = () => {
    if (!blastToDelete || !onUpdateBlasts) return;
    const updated = blasts.filter((b) => b.id !== blastToDelete.id);
    onUpdateBlasts(updated);
    setBlastToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Eagle Blast (Pusat Pengumuman & Edaran)
              </h1>
              <p className="text-xs text-slate-400">
                Penyebaran instruksi seragam, kebijakan K3, regulasi lembur, dan memo operasional dari Head Office.
              </p>
            </div>
          </div>

          <button
            id="create-blast-btn"
            onClick={() => {
              setForm({
                title: '',
                content: '',
                category: 'INFO',
                pinned: false
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengumuman Baru</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              id="blast-search-input"
              type="text"
              placeholder="Cari pengumuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
            <Tag className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="blast-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="PENTING">PENTING</option>
              <option value="INFO">INFO</option>
              <option value="SOP">SOP</option>
              <option value="EVENT">EVENT</option>
              <option value="AUDIT">AUDIT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filteredBlasts.map((blast) => (
          <div
            key={blast.id}
            className={`border rounded-2xl p-5 shadow-xs space-y-3 transition-all ${
              blast.pinned
                ? 'border-amber-400 bg-amber-50/70'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                {blast.pinned && (
                  <span className="flex items-center space-x-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    <Pin className="w-3 h-3 text-amber-600" />
                    <span>DISEMATKAN (PINNED)</span>
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    blast.category === 'PENTING'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : blast.category === 'AUDIT'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}
                >
                  {blast.category}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold text-slate-700">{blast.author}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{blast.date}</span>
                </span>

                {userRole === 'Super Admin (HQ)' && onUpdateBlasts && (
                  <button
                    type="button"
                    onClick={() => setBlastToDelete(blast)}
                    title="Hapus Pengumuman"
                    className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-snug">{blast.title}</h3>

            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {blast.content}
            </p>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Buat Eagle Blast Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlast} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Judul Pengumuman:</label>
                <input
                  id="blast-title-input"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Jadwal Pelatihan Kristalisasi Marmer Periode September"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kategori:</label>
                  <select
                    id="blast-category-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
                  >
                    <option value="INFO">INFO (Informasi Umum)</option>
                    <option value="PENTING">PENTING (Kebijakan / Sanksi)</option>
                    <option value="SOP">SOP (Standar Prosedur)</option>
                    <option value="AUDIT">AUDIT (Pemeriksaan Lokasi)</option>
                    <option value="EVENT">EVENT (Kegiatan)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    id="blast-pinned-check"
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="blast-pinned-check" className="text-slate-700 font-semibold cursor-pointer">
                    Sematkan di Atas (Pin)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Isi Lengkap Pesan:</label>
                <textarea
                  id="blast-content-input"
                  rows={5}
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Tuliskan detail instruksi, tanggal berlaku, dan pihak terkait..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="save-blast-submit"
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Siarkan Blast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE BLAST MODAL */}
      <ConfirmModal
        isOpen={Boolean(blastToDelete)}
        title="Hapus Siaran Pengumuman"
        message={`Apakah Anda yakin ingin menghapus pengumuman "${blastToDelete?.title}"? Pengumuman tidak akan ditampilkan lagi ke seluruh lokasi.`}
        confirmText="Ya, Hapus Pengumuman"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmExecuteDeleteBlast}
        onCancel={() => setBlastToDelete(null)}
      />
    </div>
  );
};
