import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, FileText, Building2, AlertCircle } from 'lucide-react';
import { ClientContract, ContractManpowerAllocation, ContractStatus } from '../../../types/finance';
import { Project, UserAccount } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: ClientContract, addendumReason?: string) => void;
  contractToEdit: ClientContract | null;
  projects: Project[];
  currentUser?: UserAccount | null;
}

const DEFAULT_POSITIONS = [
  'Cleaner',
  'Supervisor',
  'Team Leader',
  'Floor Specialist',
  'Gardener',
  'Gondola / Facade Cleaner'
];

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  onSave,
  contractToEdit,
  projects,
  currentUser
}) => {
  const [contractNumber, setContractNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientTaxId, setClientTaxId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [manpowerAllocations, setManpowerAllocations] = useState<ContractManpowerAllocation[]>([]);
  const [monthlyContractValue, setMonthlyContractValue] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentTermDays, setPaymentTermDays] = useState<number>(30);
  const [status, setStatus] = useState<ContractStatus>('Aktif');
  const [addendumNotes, setAddendumNotes] = useState('');
  
  // Specific for Edit: Addendum trigger
  const [isCreatingAddendum, setIsCreatingAddendum] = useState(false);
  const [addendumReason, setAddendumReason] = useState('');

  useEffect(() => {
    if (contractToEdit) {
      setContractNumber(contractToEdit.contractNumber);
      setClientName(contractToEdit.clientName);
      setClientAddress(contractToEdit.clientAddress);
      setClientTaxId(contractToEdit.clientTaxId);
      setProjectId(contractToEdit.projectId);
      setManpowerAllocations(contractToEdit.manpowerAllocations || []);
      setMonthlyContractValue(contractToEdit.monthlyContractValue);
      setStartDate(contractToEdit.startDate);
      setEndDate(contractToEdit.endDate);
      setPaymentTermDays(contractToEdit.paymentTermDays || 30);
      setStatus(contractToEdit.status);
      setAddendumNotes(contractToEdit.addendumNotes || '');
      setIsCreatingAddendum(false);
      setAddendumReason('');
    } else {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const randomUrut = String(Math.floor(Math.random() * 900) + 100);
      setContractNumber(`KTR/RC/${year}/${month}/${randomUrut}`);
      setClientName('');
      setClientAddress('');
      setClientTaxId('');
      setProjectId(projects[0]?.id || '');
      setManpowerAllocations([
        { id: `mpa-${Date.now()}-1`, position: 'Cleaner', count: 10, monthlyRatePerPerson: 3200000 },
        { id: `mpa-${Date.now()}-2`, position: 'Supervisor', count: 1, monthlyRatePerPerson: 5500000 }
      ]);
      setMonthlyContractValue(37500000);
      const start = new Date().toISOString().split('T')[0];
      setStartDate(start);
      const end = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
      setEndDate(end);
      setPaymentTermDays(30);
      setStatus('Aktif');
      setAddendumNotes('');
      setIsCreatingAddendum(false);
      setAddendumReason('');
    }
  }, [contractToEdit, isOpen, projects]);

  // Autofill client name & address if project selected
  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    const selected = projects.find((p) => p.id === pid);
    if (selected) {
      if (!clientName && selected.clientName) {
        setClientName(selected.clientName);
      }
      if (!clientAddress && selected.address) {
        setClientAddress(selected.address);
      }
    }
  };

  const handleAddManpowerRow = () => {
    setManpowerAllocations([
      ...manpowerAllocations,
      {
        id: `mpa-${Date.now()}`,
        position: 'Cleaner',
        count: 1,
        monthlyRatePerPerson: 3200000
      }
    ]);
  };

  const handleRemoveManpowerRow = (id: string) => {
    setManpowerAllocations(manpowerAllocations.filter((m) => m.id !== id));
  };

  const handleUpdateManpowerRow = (id: string, field: keyof ContractManpowerAllocation, val: any) => {
    setManpowerAllocations(
      manpowerAllocations.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNumber.trim()) {
      alert('Nomor kontrak wajib diisi.');
      return;
    }
    if (!clientName.trim()) {
      alert('Nama klien wajib diisi.');
      return;
    }
    if (!projectId) {
      alert('Pilih lokasi proyek.');
      return;
    }
    if (monthlyContractValue <= 0) {
      alert('Nilai kontrak per bulan harus lebih besar dari 0.');
      return;
    }
    if (isCreatingAddendum && !addendumReason.trim()) {
      alert('Mohon cantumkan alasan addendum kontrak.');
      return;
    }

    const selectedPrj = projects.find((p) => p.id === projectId);

    const payload: ClientContract = {
      id: contractToEdit ? contractToEdit.id : `ktr-${Date.now()}`,
      contractNumber: contractNumber.trim(),
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim(),
      clientTaxId: clientTaxId.trim(),
      projectId,
      projectName: selectedPrj?.name || 'Proyek Terkait',
      manpowerAllocations,
      monthlyContractValue: Number(monthlyContractValue),
      startDate,
      endDate,
      paymentTermDays: Number(paymentTermDays) || 30,
      status,
      addendumNotes: addendumNotes.trim(),
      addendumHistory: contractToEdit?.addendumHistory || [],
      createdAt: contractToEdit ? contractToEdit.createdAt : new Date().toISOString(),
      createdBy: contractToEdit?.createdBy || currentUser?.name || 'Finance Lead',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Finance Lead'
    };

    onSave(payload, isCreatingAddendum ? addendumReason.trim() : undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {contractToEdit ? 'Edit Data Kontrak Klien' : 'Tambah Kontrak Kerjasama Klien'}
              </h3>
              <p className="text-xs text-slate-500">
                Spesifikasi legalitas, nilai bulanan, alokasi manpower, dan addendum
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Nomor Kontrak & Lokasi Proyek */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Kontrak <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="e.g. KTR/RC/2026/01/001"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi / Proyek (dari Pengaturan Lokasi) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">-- Pilih Lokasi Proyek --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) - {p.type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Nama Klien & NPWP Klien */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Klien / Perusahaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. PT Pakuwon Jati Tbk"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NPWP Klien
              </label>
              <input
                type="text"
                value={clientTaxId}
                onChange={(e) => setClientTaxId(e.target.value)}
                placeholder="e.g. 01.234.567.8-012.000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 3: Alamat Klien */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Lengkap Klien
            </label>
            <textarea
              rows={2}
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Alamat kantor / gedung operasional klien"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Row 4: Nilai Kontrak Bulanan, Termin Pembayaran & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nilai Kontrak Bulanan (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={monthlyContractValue || ''}
                onChange={(e) => setMonthlyContractValue(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                {monthlyContractValue > 0 ? formatCurrency(monthlyContractValue) : 'Rp 0'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Termin Pembayaran (Hari)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={paymentTermDays || ''}
                  onChange={(e) => setPaymentTermDays(Number(e.target.value))}
                  placeholder="30"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-600 font-medium">Hari</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">e.g. 15, 30, atau 45 hari</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Status Kontrak
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="Aktif">Aktif</option>
                <option value="Akan Berakhir">Akan Berakhir (&le; 60 hari)</option>
                <option value="Berakhir">Berakhir (Selesai)</option>
              </select>
            </div>
          </div>

          {/* Row 5: Tanggal Mulai & Tanggal Berakhir */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mulai Kontrak
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Berakhir Kontrak
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section: Alokasi Manpower per Posisi */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Alokasi Manpower per Posisi (Cleaner, Supervisor, dll)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total Personil: {manpowerAllocations.reduce((sum, m) => sum + (Number(m.count) || 0), 0)} orang
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddManpowerRow}
                className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Posisi
              </button>
            </div>

            <div className="space-y-2">
              {manpowerAllocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <input
                      type="text"
                      list="positions-list"
                      value={alloc.position}
                      onChange={(e) => handleUpdateManpowerRow(alloc.id, 'position', e.target.value)}
                      placeholder="Posisi Jabatan"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-800"
                    />
                    <datalist id="positions-list">
                      {DEFAULT_POSITIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>

                  <div className="w-full sm:w-32 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={alloc.count}
                      onChange={(e) => handleUpdateManpowerRow(alloc.id, 'count', Number(e.target.value))}
                      placeholder="Jumlah"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-center font-bold"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">Orang</span>
                  </div>

                  <div className="w-full sm:w-44">
                    <input
                      type="number"
                      min={0}
                      value={alloc.monthlyRatePerPerson || ''}
                      onChange={(e) => handleUpdateManpowerRow(alloc.id, 'monthlyRatePerPerson', Number(e.target.value))}
                      placeholder="Rate Satuan (Rp)"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-right font-medium"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveManpowerRow(alloc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Catatan Addendum & Pemicu Riwayat Addendum */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Catatan Addendum & Klausul Khusus
            </label>
            <textarea
              rows={2}
              value={addendumNotes}
              onChange={(e) => setAddendumNotes(e.target.value)}
              placeholder="Nomor addendum, perluasan area gedung, atau catatan revisi kontrak"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            />

            {/* If Editing an existing contract, option to record as addendum */}
            {contractToEdit && (
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCreatingAddendum}
                    onChange={(e) => setIsCreatingAddendum(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-900">
                    Catat perubahan ini ke Riwayat Addendum Kontrak
                  </span>
                </label>

                {isCreatingAddendum && (
                  <div className="mt-2.5 bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-2">
                    <p className="text-[11px] text-amber-800">
                      Nilai Sebelumnya: <strong>{formatCurrency(contractToEdit.monthlyContractValue)}</strong> &rarr; Nilai Baru: <strong>{formatCurrency(monthlyContractValue)}</strong> (Selisih: {formatCurrency(monthlyContractValue - contractToEdit.monthlyContractValue)})
                    </p>
                    <input
                      type="text"
                      required={isCreatingAddendum}
                      value={addendumReason}
                      onChange={(e) => setAddendumReason(e.target.value)}
                      placeholder="Alasan addendum (e.g. Penambahan 2 cleaner area food court & kenaikan UMR)"
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition"
            >
              {contractToEdit ? 'Simpan Perubahan' : 'Terbitkan Kontrak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
