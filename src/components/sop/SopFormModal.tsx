import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Wrench,
  Sparkles,
  ShieldCheck,
  ListOrdered,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { SopDocument, SopEquipmentItem, SopChemicalItem } from '../../types';

interface SopFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sop: SopDocument) => void;
  initialSop?: SopDocument | null;
}

const CATEGORY_OPTIONS = [
  'Sanitasi & Restroom',
  'Floor Care & Kristalisasi',
  'High Level & Kaca',
  'K3 & Safety',
  'Housekeeping Umum',
  'Disinfeksi & Hygiene',
  'Fasilitas Publik & Outdoor'
];

export const SopFormModal: React.FC<SopFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSop
}) => {
  const isEditing = Boolean(initialSop && initialSop.id);

  // Form States
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [version, setVersion] = useState('v1.0');
  const [objective, setObjective] = useState('');
  const [author, setAuthor] = useState('');

  // 1. Peralatan Kerja: Nama Alat, Qty, Satuan
  const [equipmentList, setEquipmentList] = useState<SopEquipmentItem[]>([
    { name: '', qty: 1, unit: 'Unit' }
  ]);

  // 2. Chemical & Takaran Rasio: Nama Chemical, Takaran, Satuan
  const [chemicalList, setChemicalList] = useState<SopChemicalItem[]>([
    { name: '', dosage: '', unit: 'ml/L' }
  ]);

  // 3. Tahapan Prosedur Kerja Standar (SOP): Urutan 1, 2, ...
  const [steps, setSteps] = useState<string[]>(['']);

  // 4. APD & Alat Keselamatan (K3)
  const [requiredPPE, setRequiredPPE] = useState<string[]>(['']);

  // 5. Perawatan Peralatan
  const [equipmentMaintenance, setEquipmentMaintenance] = useState<string[]>(['']);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate when initialSop changes
  useEffect(() => {
    if (isOpen) {
      if (initialSop) {
        setTitle(initialSop.title || '');
        setCode(initialSop.code || `SOP-RC-${Math.floor(100 + Math.random() * 900)}`);
        setCategory(initialSop.category || CATEGORY_OPTIONS[0]);
        setVersion(initialSop.version || 'v1.0');
        setObjective(initialSop.objective || initialSop.description || '');
        setAuthor(initialSop.author || 'Operational QA & QC');

        // Equipment list
        if (initialSop.equipmentList && initialSop.equipmentList.length > 0) {
          setEquipmentList(initialSop.equipmentList.map(eq => ({ ...eq })));
        } else {
          setEquipmentList([{ name: '', qty: 1, unit: 'Unit' }]);
        }

        // Chemical list
        if (initialSop.chemicalList && initialSop.chemicalList.length > 0) {
          setChemicalList(initialSop.chemicalList.map(ch => ({ ...ch })));
        } else if (initialSop.requiredChemicals || initialSop.chemicalsUsed) {
          const list = initialSop.requiredChemicals || initialSop.chemicalsUsed || [];
          setChemicalList(
            list.length > 0
              ? list.map(c => ({ name: c, dosage: 'Sesuai Takaran', unit: 'ml/L' }))
              : [{ name: '', dosage: '', unit: 'ml/L' }]
          );
        } else {
          setChemicalList([{ name: '', dosage: '', unit: 'ml/L' }]);
        }

        // Steps (Tahapan SOP)
        if (initialSop.steps && initialSop.steps.length > 0) {
          setSteps([...initialSop.steps]);
        } else {
          setSteps(['']);
        }

        // APD / Safety
        const ppe = initialSop.requiredPPE || initialSop.safetyEquipment || [];
        if (ppe.length > 0) {
          setRequiredPPE([...ppe]);
        } else {
          setRequiredPPE(['']);
        }

        // Equipment maintenance
        if (initialSop.equipmentMaintenance && initialSop.equipmentMaintenance.length > 0) {
          setEquipmentMaintenance([...initialSop.equipmentMaintenance]);
        } else {
          setEquipmentMaintenance(['']);
        }
      } else {
        // Reset to default new form
        const randCode = `SOP-RC-${Math.floor(100 + Math.random() * 900)}`;
        setTitle('');
        setCode(randCode);
        setCategory(CATEGORY_OPTIONS[0]);
        setVersion('v1.0');
        setObjective('');
        setAuthor('Operational QA & QC');
        setEquipmentList([
          { name: '', qty: 1, unit: 'Unit' }
        ]);
        setChemicalList([
          { name: '', dosage: '', unit: 'ml/L' }
        ]);
        setSteps(['']);
        setRequiredPPE(['']);
        setEquipmentMaintenance(['']);
      }
      setErrorMessage(null);
    }
  }, [isOpen, initialSop]);

  if (!isOpen) return null;

  // Row operations for Equipment
  const handleAddEquipment = () => {
    setEquipmentList(prev => [...prev, { name: '', qty: 1, unit: 'Unit' }]);
  };

  const handleUpdateEquipment = (index: number, field: keyof SopEquipmentItem, value: any) => {
    setEquipmentList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteEquipment = (index: number) => {
    if (equipmentList.length <= 1) {
      setEquipmentList([{ name: '', qty: 1, unit: 'Unit' }]);
      return;
    }
    setEquipmentList(prev => prev.filter((_, i) => i !== index));
  };

  // Row operations for Chemicals
  const handleAddChemical = () => {
    setChemicalList(prev => [...prev, { name: '', dosage: '', unit: 'ml/L' }]);
  };

  const handleUpdateChemical = (index: number, field: keyof SopChemicalItem, value: any) => {
    setChemicalList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteChemical = (index: number) => {
    if (chemicalList.length <= 1) {
      setChemicalList([{ name: '', dosage: '', unit: 'ml/L' }]);
      return;
    }
    setChemicalList(prev => prev.filter((_, i) => i !== index));
  };

  // Row operations for Steps (Tahapan SOP)
  const handleAddStep = () => {
    setSteps(prev => [...prev, '']);
  };

  const handleUpdateStep = (index: number, value: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleDeleteStep = (index: number) => {
    if (steps.length <= 1) {
      setSteps(['']);
      return;
    }
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    setSteps(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  // Row operations for APD
  const handleAddPPE = () => {
    setRequiredPPE(prev => [...prev, '']);
  };

  const handleUpdatePPE = (index: number, value: string) => {
    setRequiredPPE(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleDeletePPE = (index: number) => {
    if (requiredPPE.length <= 1) {
      setRequiredPPE(['']);
      return;
    }
    setRequiredPPE(prev => prev.filter((_, i) => i !== index));
  };

  // Row operations for Perawatan Peralatan
  const handleAddMaintenance = () => {
    setEquipmentMaintenance(prev => [...prev, '']);
  };

  const handleUpdateMaintenance = (index: number, value: string) => {
    setEquipmentMaintenance(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleDeleteMaintenance = (index: number) => {
    if (equipmentMaintenance.length <= 1) {
      setEquipmentMaintenance(['']);
      return;
    }
    setEquipmentMaintenance(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Nama SOP wajib diisi!');
      return;
    }

    if (!objective.trim()) {
      setErrorMessage('Tujuan Pekerjaan wajib diisi!');
      return;
    }

    // Filter non-empty items
    const cleanEquipment = equipmentList.filter(eq => eq.name.trim() !== '');
    const cleanChemicals = chemicalList.filter(ch => ch.name.trim() !== '');
    const cleanSteps = steps.filter(st => st.trim() !== '');
    const cleanPPE = requiredPPE.filter(p => p.trim() !== '');
    const cleanMaintenance = equipmentMaintenance.filter(m => m.trim() !== '');

    if (cleanSteps.length === 0) {
      setErrorMessage('Minimal 1 tahapan prosedur kerja standar (SOP) wajib diisi!');
      return;
    }

    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const sopPayload: SopDocument = {
      id: initialSop?.id || `sop-${Date.now()}`,
      code: code.trim() || `SOP-RC-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      category: category,
      version: version.trim() || 'v1.0',
      objective: objective.trim(),
      description: objective.trim(), // keep compatible with existing
      equipmentList: cleanEquipment,
      chemicalList: cleanChemicals,
      steps: cleanSteps,
      requiredPPE: cleanPPE,
      safetyEquipment: cleanPPE,
      equipmentMaintenance: cleanMaintenance,
      chemicalsUsed: cleanChemicals.map(c => `${c.name} (${c.dosage} ${c.unit})`.trim()),
      requiredChemicals: cleanChemicals.map(c => `${c.name} (${c.dosage} ${c.unit})`.trim()),
      lastUpdated: formattedDate,
      author: author.trim() || 'Operational QA & QC'
    };

    onSave(sopPayload);
    onClose();
  };

  return (
    <div
      id="sop-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="sop-form-modal-card"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {isEditing ? 'Update SOP & Standar Mutu' : 'Tambah SOP & Standar Mutu Baru'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isEditing
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isEditing ? 'Mode Update' : 'Form Baru'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lengkapi formulir standar operasional, alat kerja, chemical, tahapan urutan, APD K3, dan perawatan peralatan.
              </p>
            </div>
          </div>
          <button
            id="close-sop-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2.5 text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Informasi Dasar (Nama SOP, Kategori, Versi, Tujuan) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>1. Identitas & Tujuan SOP</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Nama SOP */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-slate-300 font-semibold text-xs">
                  Nama SOP <span className="text-rose-400">*</span>
                </label>
                <input
                  id="sop-title-input"
                  type="text"
                  required
                  placeholder="Contoh: SOP Pembersihan Kaca Luar Gedung / Facade Cleaning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold text-xs">
                  Kategori Standar
                </label>
                <select
                  id="sop-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kode SOP */}
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold text-xs">
                  Kode Dokumen
                </label>
                <input
                  id="sop-code-input"
                  type="text"
                  placeholder="Contoh: SOP-RC-FACADE-04"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Versi */}
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold text-xs">
                  Versi Dokumen
                </label>
                <input
                  id="sop-version-input"
                  type="text"
                  placeholder="v1.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Penulis / Penyusun */}
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold text-xs">
                  Penyusun / QA Author
                </label>
                <input
                  id="sop-author-input"
                  type="text"
                  placeholder="Operational QA & QC Rajawali"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Tujuan Pekerjaan */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold text-xs">
                Tujuan Pekerjaan <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="sop-objective-input"
                rows={2}
                required
                placeholder="Tuliskan tujuan spesifik pekerjaan ini, hasil akhir yang diharapkan, dan standar kualitas kebersihan..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Peralatan Kerja (Nama Alat, Qty, Satuan) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-2">
                <Wrench className="w-4 h-4" />
                <span>2. Peralatan Kerja</span>
              </h3>
              <button
                id="add-equipment-row-btn"
                type="button"
                onClick={handleAddEquipment}
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Alat</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Cantumkan seluruh alat kebersihan, mesin, kain, dan perlengkapan penunjang beserta jumlah dan satuannya.
            </p>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 px-2 pb-1 border-b border-slate-800/80">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-6">Nama Alat Kerja</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2">Satuan</div>
                <div className="col-span-1 text-center">Aksi</div>
              </div>

              {equipmentList.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                  <div className="col-span-1 text-center font-mono font-bold text-slate-500">
                    {idx + 1}
                  </div>
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="Contoh: Window Squeegee 35cm / Double Bucket"
                      value={item.name}
                      onChange={(e) => handleUpdateEquipment(idx, 'name', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleUpdateEquipment(idx, 'qty', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-center text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Unit/Pcs/Set"
                      value={item.unit}
                      onChange={(e) => handleUpdateEquipment(idx, 'unit', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteEquipment(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                      title="Hapus Baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Chemical & Takaran Rasio */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>3. Chemical & Takaran Rasio</span>
              </h3>
              <button
                id="add-chemical-row-btn"
                type="button"
                onClick={handleAddChemical}
                className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Chemical</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Tentukan jenis chemical pembersih beserta takaran rasio pencampuran dengan air yang aman dan teruji.
            </p>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 px-2 pb-1 border-b border-slate-800/80">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">Nama Chemical</div>
                <div className="col-span-3">Takaran / Rasio</div>
                <div className="col-span-2">Satuan</div>
                <div className="col-span-1 text-center">Aksi</div>
              </div>

              {chemicalList.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                  <div className="col-span-1 text-center font-mono font-bold text-slate-500">
                    {idx + 1}
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Contoh: Glass Cleaner / Karbol Pine / Neutral Cleaner"
                      value={item.name}
                      onChange={(e) => handleUpdateChemical(idx, 'name', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Contoh: 1 : 20 / 20ml / Siap Pakai"
                      value={item.dosage}
                      onChange={(e) => handleUpdateChemical(idx, 'dosage', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="ml/L / 5L / Sprayer"
                      value={item.unit}
                      onChange={(e) => handleUpdateChemical(idx, 'unit', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteChemical(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                      title="Hapus Baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Tahapan Prosedur Kerja Standar (SOP) (Urutan 1, 2, ...) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-2">
                <ListOrdered className="w-4 h-4" />
                <span>4. Tahapan Prosedur Kerja Standar (SOP)</span>
              </h3>
              <button
                id="add-step-row-btn"
                type="button"
                onClick={handleAddStep}
                className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Prosedur</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Urutan instruksi langkah demi langkah yang wajib dieksekusi secara kronologis oleh petugas lapangan.
            </p>

            <div className="space-y-2.5">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 group"
                >
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs shadow-sm mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      placeholder={`Langkah ke-${idx + 1}: Tuliskan detail instruksi kerja...`}
                      value={step}
                      onChange={(e) => handleUpdateStep(idx, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed text-xs"
                    />
                  </div>
                  <div className="flex flex-col space-y-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-30 rounded transition cursor-pointer"
                      title="Geser Naik"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'down')}
                      disabled={idx === steps.length - 1}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-30 rounded transition cursor-pointer"
                      title="Geser Turun"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStep(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                      title="Hapus Langkah"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: APD & Alat Keselamatan (K3) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4" />
                <span>5. APD & Alat Keselamatan (K3)</span>
              </h3>
              <button
                id="add-ppe-row-btn"
                type="button"
                onClick={handleAddPPE}
                className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris APD</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Alat pelindung diri wajib (sarung tangan, masker, sepatu safety, kacamata goggle, full body harness, dll).
            </p>

            <div className="space-y-2">
              {requiredPPE.map((ppe, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                  <span className="w-5 text-center font-mono font-bold text-emerald-500 text-[11px]">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder="Contoh: Sarung Tangan Karet (Rubber Gloves) / Safety Helmet / Masker Karbon"
                    value={ppe}
                    onChange={(e) => handleUpdatePPE(idx, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePPE(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                    title="Hapus APD"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Perawatan Peralatan */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
                <Wrench className="w-4 h-4" />
                <span>6. Perawatan Peralatan</span>
              </h3>
              <button
                id="add-maintenance-row-btn"
                type="button"
                onClick={handleAddMaintenance}
                className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Perawatan</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Instruksi pencucian, pengeringan, pembersihan filter, dan penyimpanan peralatan kerja setelah selesai digunakan.
            </p>

            <div className="space-y-2">
              {equipmentMaintenance.map((maint, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                  <span className="w-5 text-center font-mono font-bold text-indigo-400 text-[11px]">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder="Contoh: Cuci bersih kain microfiber dan jemur di ruang berventilasi / Keringkan karet squeegee"
                    value={maint}
                    onChange={(e) => handleUpdateMaintenance(idx, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteMaintenance(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                    title="Hapus Baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer Actions (Tombol Simpan & Tombol Update) */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Dokumen tersimpan otomatis ke database pusat operasional.</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              id="cancel-sop-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Batal
            </button>

            {isEditing ? (
              <button
                id="btn-update-sop"
                type="button"
                onClick={handleSubmit}
                className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Update SOP</span>
              </button>
            ) : (
              <button
                id="btn-save-sop"
                type="button"
                onClick={handleSubmit}
                className="flex items-center space-x-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan SOP</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
