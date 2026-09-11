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
            className={`bg-slate-900 border rounded-2xl p-5 shadow-lg space-y-3 transition-all ${
              blast.pinned
                ? 'border-amber-500/50 bg-gradient-to-r from-slate-900 to-amber-950/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                {blast.pinned && (
                  <span className="flex items-center space-x-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    <Pin className="w-3 h-3" />
                    <span>DISEMATKAN (PINNED)</span>
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    blast.category === 'PENTING'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : blast.category === 'AUDIT'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {blast.category}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>{blast.author}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{blast.date}</span>
                </span>

                {userRole === 'Super Admin (HQ)' && onUpdateBlasts && (
                  <button
                    type="button"
                    onClick={() => setBlastToDelete(blast)}
                    title="Hapus Pengumuman"
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-base font-bold text-white leading-snug">{blast.title}</h3>

            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {blast.content}
            </p>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Buat Eagle Blast Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlast} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul Pengumuman:</label>
                <input
                  id="blast-title-input"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Jadwal Pelatihan Kristalisasi Marmer Periode September"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori:</label>
                  <select
                    id="blast-category-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
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
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <label htmlFor="blast-pinned-check" className="text-slate-300 font-semibold cursor-pointer">
                    Sematkan di Atas (Pin)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Isi Lengkap Pesan:</label>
                <textarea
                  id="blast-content-input"
                  rows={5}
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Tuliskan detail instruksi, tanggal berlaku, dan pihak terkait..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="save-blast-submit"
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20"
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
