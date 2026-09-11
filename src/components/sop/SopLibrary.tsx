import React, { useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Wrench,
  Printer,
  Calendar,
  Layers,
  Award,
  BadgeCheck,
  Info,
  FileDown,
  Download
} from 'lucide-react';
import { SopItem, SopDocument, UserAccount } from '../../types';
import { SopFormModal } from './SopFormModal';
import { generateSingleSopPDF, generateSopsCatalogPDF } from '../../utils/pdfExport';
import { ConfirmModal } from '../common/ConfirmModal';

interface SopLibraryProps {
  sops: SopItem[];
  onUpdateSops?: (updated: SopItem[]) => void;
  userRole?: string;
  currentUser?: UserAccount | null;
}

export const SopLibrary: React.FC<SopLibraryProps> = ({
  sops,
  onUpdateSops,
  userRole,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSop, setSelectedSop] = useState<SopItem | null>(sops[0] || null);

  // Permission Check: Only Super Admin or users with canDeleteSops granted by Super Admin
  const isSuperAdmin = userRole === 'Super Admin (HQ)' || currentUser?.role === 'Super Admin (HQ)' || currentUser?.id === 'user-superadmin';
  const canDeleteSop = isSuperAdmin || Boolean(currentUser?.canDeleteSops);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSop, setEditingSop] = useState<SopItem | null>(null);
  const [sopToDelete, setSopToDelete] = useState<SopItem | null>(null);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  // Categories list
  const categoryFilters = [
    'ALL',
    'Sanitasi & Restroom',
    'Floor Care & Kristalisasi',
    'High Level & Kaca',
    'K3 & Safety',
    'Housekeeping Umum',
    'Disinfeksi & Hygiene'
  ];

  const filteredSops = sops.filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchCat = s.category.toLowerCase().includes(q);
      const matchCode = s.code?.toLowerCase().includes(q) || false;
      const matchSteps = s.steps.some((step) => step.toLowerCase().includes(q));
      const matchObj = s.objective?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || false;
      const matchEq = s.equipmentList?.some(e => e.name.toLowerCase().includes(q)) || false;
      const matchChem = s.chemicalList?.some(c => c.name.toLowerCase().includes(q)) || false;
      return matchTitle || matchCat || matchCode || matchSteps || matchObj || matchEq || matchChem;
    }
    return true;
  });

  // Handle Save (Create or Update)
  const handleSaveSop = (savedSop: SopDocument) => {
    let nextList: SopItem[];
    const exists = sops.some(s => s.id === savedSop.id);
    if (exists) {
      nextList = sops.map(s => (s.id === savedSop.id ? savedSop : s));
    } else {
      nextList = [savedSop, ...sops];
    }
    if (onUpdateSops) {
      onUpdateSops(nextList);
    }
    setSelectedSop(savedSop);
  };

  // Handle Delete (Secured by Super Admin / Granted Permission)
  const handleDeleteSop = (sopId: string) => {
    if (!canDeleteSop) {
      setDeniedMessage(
        'Akses Ditolak: Hanya Super Admin (HQ) atau pengguna yang diizinkan Super Admin yang dapat menghapus dokumen SOP ini.'
      );
      return;
    }

    const target = sops.find((s) => s.id === sopId);
    if (!target) return;
    setSopToDelete(target);
  };

  const confirmExecuteDeleteSop = () => {
    if (!sopToDelete) return;
    const targetId = sopToDelete.id;
    const nextList = sops.filter((s) => s.id !== targetId);
    if (onUpdateSops) {
      onUpdateSops(nextList);
    }
    if (selectedSop?.id === targetId) {
      setSelectedSop(nextList[0] || null);
    }
    setSopToDelete(null);
  };

  // Print function
  const handlePrintSop = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Pusat SOP & Panduan Standar Mutu Rajawali
            </h1>
            <p className="text-xs text-slate-400">
              Standar Operasional Prosedur kebersihan internasional, peralatan kerja, takaran chemical, APD K3, dan perawatan peralatan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Download Katalog PDF */}
          <button
            id="download-catalog-pdf-btn"
            type="button"
            onClick={() => generateSopsCatalogPDF(sops, selectedCategory)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl shadow transition cursor-pointer"
            title={`Download Katalog PDF (${selectedCategory === 'ALL' ? 'Semua Kategori' : selectedCategory})`}
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Download Katalog PDF</span>
          </button>

          {/* Tombol Tambah SOP Baru */}
          <button
            id="add-sop-btn"
            type="button"
            onClick={() => {
              setEditingSop(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah SOP Baru</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Sidebar: List & Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="sop-search-input"
                type="text"
                placeholder="Cari nama SOP, alat, chemical, metode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            <div className="flex space-x-1 overflow-x-auto pb-1 text-xs no-scrollbar">
              {categoryFilters.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors text-[11px] ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* SOP list items */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredSops.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Tidak ada SOP yang cocok dengan pencarian.
              </div>
            ) : (
              filteredSops.map((sop) => (
                <div
                  key={sop.id}
                  id={`sop-card-${sop.id}`}
                  onClick={() => setSelectedSop(sop)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                    selectedSop?.id === sop.id
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {sop.category}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sop.code || `v${sop.version}`}
                      </span>

                      {/* Quick Download PDF */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateSingleSopPDF(sop);
                        }}
                        className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition cursor-pointer"
                        title={`Download PDF: ${sop.title}`}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Delete SOP (Gated by permission) */}
                      {canDeleteSop && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSop(sop.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                          title={`Hapus SOP: ${sop.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="font-bold text-white text-xs leading-snug">{sop.title}</h4>
                  <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                    {sop.objective || sop.description || sop.steps[0]}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 font-mono">
                    <span>{sop.steps?.length || 0} Langkah SOP</span>
                    <span>{sop.equipmentList?.length || 0} Alat • {sop.chemicalList?.length || (sop.chemicalsUsed?.length || 0)} Chem</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {selectedSop ? (
            <>
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-800 gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {selectedSop.category}
                    </span>
                    {selectedSop.code && (
                      <span className="text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {selectedSop.code}
                      </span>
                    )}
                    <span className="text-slate-400">Versi {selectedSop.version}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">Update: {selectedSop.lastUpdated}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                    {selectedSop.title}
                  </h2>
                  {selectedSop.author && (
                    <p className="text-[11px] text-slate-400">
                      Penyusun: <span className="text-slate-300 font-medium">{selectedSop.author}</span>
                    </p>
                  )}
                </div>

                {/* Actions (Download PDF, Cetak, Edit SOP & Hapus SOP) */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="download-single-sop-pdf-btn"
                    type="button"
                    onClick={() => generateSingleSopPDF(selectedSop)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
                    title="Download Dokumen SOP Resmi (PDF)"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    id="print-sop-btn"
                    type="button"
                    onClick={handlePrintSop}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                    title="Cetak SOP via Browser"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    id="edit-sop-btn"
                    type="button"
                    onClick={() => {
                      setEditingSop(selectedSop);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit SOP</span>
                  </button>

                  <button
                    id="delete-sop-btn"
                    type="button"
                    onClick={() => handleDeleteSop(selectedSop.id)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      canDeleteSop
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-slate-800/40 text-slate-600 border-slate-800 hover:border-slate-700 hover:text-slate-500'
                    }`}
                    title={
                      canDeleteSop
                        ? 'Hapus Dokumen SOP'
                        : 'Akses Terbatas: Hanya Super Admin (HQ) atau pengguna berizin yang dapat menghapus SOP'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. Tujuan Pekerjaan */}
              <div className="bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-1.5">
                <div className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span className="uppercase tracking-wider">Tujuan Pekerjaan:</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedSop.objective || selectedSop.description || 'Menjaga kebersihan dan higienitas area sesuai standar mutu Rajawali.'}
                </p>
              </div>

              {/* 2 & 3. Peralatan Kerja & Chemical Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 2. Peralatan Kerja */}
                <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-sky-300 flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Wrench className="w-4 h-4 text-sky-400" />
                      <span>Peralatan Kerja:</span>
                    </div>
                    <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                      {selectedSop.equipmentList?.length || 0} Alat
                    </span>
                  </div>

                  {selectedSop.equipmentList && selectedSop.equipmentList.length > 0 ? (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800/80">
                            <th className="pb-1 font-semibold">Nama Alat</th>
                            <th className="pb-1 text-center font-semibold">Qty</th>
                            <th className="pb-1 text-right font-semibold">Satuan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {selectedSop.equipmentList.map((eq, i) => (
                            <tr key={i} className="text-slate-200">
                              <td className="py-1.5 pr-2 font-medium">{eq.name}</td>
                              <td className="py-1.5 text-center font-mono text-sky-300">{eq.qty}</td>
                              <td className="py-1.5 text-right text-slate-400 text-[11px]">{eq.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-3 text-center">
                      Belum ada rincian peralatan khusus yang didaftarkan.
                    </div>
                  )}
                </div>

                {/* 3. Chemical & Takaran Rasio */}
                <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-amber-300 flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Chemical & Takaran Rasio:</span>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                      {selectedSop.chemicalList?.length || (selectedSop.chemicalsUsed?.length || 0)} Chem
                    </span>
                  </div>

                  {selectedSop.chemicalList && selectedSop.chemicalList.length > 0 ? (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800/80">
                            <th className="pb-1 font-semibold">Nama Chemical</th>
                            <th className="pb-1 text-center font-semibold">Takaran</th>
                            <th className="pb-1 text-right font-semibold">Satuan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {selectedSop.chemicalList.map((ch, i) => (
                            <tr key={i} className="text-slate-200">
                              <td className="py-1.5 pr-2 font-medium">{ch.name}</td>
                              <td className="py-1.5 text-center font-mono text-amber-300">{ch.dosage}</td>
                              <td className="py-1.5 text-right text-slate-400 text-[11px]">{ch.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : selectedSop.chemicalsUsed && selectedSop.chemicalsUsed.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSop.chemicalsUsed.map((chem, i) => (
                        <span
                          key={i}
                          className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-medium text-xs"
                        >
                          {chem}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-3 text-center">
                      Tidak memerlukan takaran chemical khusus.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Tahapan Prosedur Kerja Standar (SOP) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Tahapan Prosedur Kerja Standar (SOP):</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Total {selectedSop.steps.length} Langkah
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedSop.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 flex items-start space-x-3.5 text-xs hover:border-slate-700 transition"
                    >
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs shadow-md mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="text-slate-200 leading-relaxed pt-0.5 font-normal">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5 & 6. APD K3 & Perawatan Peralatan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 5. APD & Alat Keselamatan (K3) */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                  <div className="font-bold text-emerald-300 flex items-center space-x-1.5 pb-2 border-b border-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>APD & Alat Keselamatan (K3):</span>
                  </div>
                  <div className="space-y-1.5">
                    {(selectedSop.requiredPPE || selectedSop.safetyEquipment || []).length > 0 ? (
                      (selectedSop.requiredPPE || selectedSop.safetyEquipment || []).map((ppe, i) => (
                        <div key={i} className="flex items-center space-x-2 text-slate-200 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{ppe}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">APD standar operasional umum.</span>
                    )}
                  </div>
                </div>

                {/* 6. Perawatan Peralatan */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                  <div className="font-bold text-indigo-300 flex items-center space-x-1.5 pb-2 border-b border-slate-800">
                    <Wrench className="w-4 h-4 text-indigo-400" />
                    <span>Perawatan Peralatan:</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedSop.equipmentMaintenance && selectedSop.equipmentMaintenance.length > 0 ? (
                      selectedSop.equipmentMaintenance.map((maint, i) => (
                        <div key={i} className="flex items-start space-x-2 text-slate-200 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{maint}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">Cuci, bersihkan, dan simpan peralatan di tempat kering setelah digunakan.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Safety notice */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl flex items-center space-x-3 text-xs text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <b>Komitmen Mutu & K3 Rajawali:</b> Seluruh tahapan wajib dipatuhi tanpa pengecualian demi menjamin keselamatan kerja karyawan serta standar kebersihan mitra gedung.
                </span>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Pilih salah satu SOP di sebelah kiri atau klik tombol "Tambah SOP Baru" untuk membuat dokumen standar baru.
            </div>
          )}
        </div>
      </div>

      {/* FORM MODAL (Create & Update) */}
      <SopFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSop(null);
        }}
        onSave={handleSaveSop}
        initialSop={editingSop}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(sopToDelete)}
        title="Hapus Dokumen Standar Mutu (SOP)"
        message={`Apakah Anda yakin ingin menghapus dokumen SOP "${sopToDelete?.title}" (${sopToDelete?.code || 'SOP-MUTU'})? Seluruh panduan, takaran chemical, dan langkah pengerjaan di SOP ini akan dihapus.`}
        confirmText="Ya, Hapus Dokumen"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmExecuteDeleteSop}
        onCancel={() => setSopToDelete(null)}
      />

      {/* ACCESS DENIED MODAL */}
      <ConfirmModal
        isOpen={Boolean(deniedMessage)}
        title="Akses Ditolak (Izin Khusus)"
        message={deniedMessage || ''}
        confirmText="Mengerti"
        cancelText="Tutup"
        confirmVariant="warning"
        onConfirm={() => setDeniedMessage(null)}
        onCancel={() => setDeniedMessage(null)}
      />
    </div>
  );
};
