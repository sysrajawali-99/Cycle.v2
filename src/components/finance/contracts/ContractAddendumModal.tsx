import React, { useState } from 'react';
import { X, History, Plus, FileText, ArrowRight } from 'lucide-react';
import { ClientContract, ContractAddendum } from '../../../types/finance';
import { formatCurrency, formatDateDDMMYYYY } from '../../../utils/formatters';
import { UserAccount } from '../../../types';

interface ContractAddendumModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ClientContract | null;
  onAddAddendum: (contractId: string, addendum: ContractAddendum) => void;
  currentUser?: UserAccount | null;
}

export const ContractAddendumModal: React.FC<ContractAddendumModalProps> = ({
  isOpen,
  onClose,
  contract,
  onAddAddendum,
  currentUser
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [newMonthlyValue, setNewMonthlyValue] = useState<number>(contract?.monthlyContractValue || 0);
  const [notes, setNotes] = useState('');

  if (!isOpen || !contract) return null;

  const previousMonthlyValue = contract.monthlyContractValue;
  const differenceAmount = newMonthlyValue - previousMonthlyValue;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Alasan addendum wajib diisi.');
      return;
    }
    if (newMonthlyValue <= 0) {
      alert('Nilai kontrak baru harus lebih besar dari 0.');
      return;
    }

    const newAdd: ContractAddendum = {
      id: `add-${Date.now()}`,
      date,
      reason: reason.trim(),
      previousMonthlyValue,
      newMonthlyValue: Number(newMonthlyValue),
      differenceAmount,
      notes: notes.trim(),
      recordedBy: currentUser?.name || 'Finance Lead'
    };

    onAddAddendum(contract.id, newAdd);
    setShowAddForm(false);
    setReason('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Riwayat Addendum Kontrak</h3>
              <p className="text-xs text-slate-500">
                {contract.contractNumber} • {contract.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Header Contract Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500 font-medium">Nilai Kontrak Bulanan Saat Ini:</p>
              <h4 className="text-base font-black text-slate-900">{formatCurrency(contract.monthlyContractValue)}</h4>
            </div>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setNewMonthlyValue(contract.monthlyContractValue);
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> {showAddForm ? 'Batal Tambah' : 'Tambah Addendum Baru'}
            </button>
          </div>

          {/* Form Create Addendum */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-4 bg-amber-50/60 border border-amber-300 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Formulir Perubahan / Addendum Kontrak
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Berlaku Addendum
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Kontrak Bulanan Baru (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newMonthlyValue || ''}
                    onChange={(e) => setNewMonthlyValue(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-900 bg-white"
                  />
                  <p className="text-[10px] text-amber-800 mt-0.5">
                    Selisih: {differenceAmount >= 0 ? `+${formatCurrency(differenceAmount)}` : formatCurrency(differenceAmount)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Perubahan / Addendum <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Penambahan 2 personil cleaner & penyesuaian UMR regional"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan persetujuan manajemen atau nomor surat resmi"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md"
                >
                  Simpan Addendum
                </button>
              </div>
            </form>
          )}

          {/* Addendum List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Riwayat Addendum ({contract.addendumHistory?.length || 0})
            </h4>

            {(!contract.addendumHistory || contract.addendumHistory.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Belum ada riwayat addendum untuk kontrak ini. Nilai dan klausul masih mengacu pada kontrak asli.
              </p>
            ) : (
              <div className="space-y-2.5">
                {contract.addendumHistory.map((add, idx) => (
                  <div
                    key={add.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        {formatDateDDMMYYYY(add.date)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Oleh: {add.recordedBy || 'Finance Lead'}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-800">{add.reason}</p>

                    <div className="flex items-center gap-2 text-[11.5px] bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500">{formatCurrency(add.previousMonthlyValue)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-emerald-700">{formatCurrency(add.newMonthlyValue)}</span>
                      <span className="ml-auto font-bold text-amber-700">
                        ({add.differenceAmount >= 0 ? `+${formatCurrency(add.differenceAmount)}` : formatCurrency(add.differenceAmount)})
                      </span>
                    </div>

                    {add.notes && (
                      <p className="text-[11px] text-slate-500 italic">Catatan: {add.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
