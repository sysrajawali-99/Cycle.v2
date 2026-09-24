import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Receipt, Building2, Calculator, Percent } from 'lucide-react';
import { ClientInvoice, ClientContract, InvoiceExtraItem, InvoiceStatus } from '../../../types/finance';
import { UserAccount, CompanyProfile } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: ClientInvoice) => void;
  invoiceToEdit: ClientInvoice | null;
  contracts: ClientContract[];
  existingInvoicesCount: number;
  currentUser?: UserAccount | null;
  companyProfile?: CompanyProfile;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  invoiceToEdit,
  contracts,
  existingInvoicesCount,
  currentUser,
  companyProfile
}) => {
  const [selectedContractId, setSelectedContractId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [baseMonthlyAmount, setBaseMonthlyAmount] = useState<number>(0);
  const [extraItems, setExtraItems] = useState<InvoiceExtraItem[]>([]);
  const [isPpnEnabled, setIsPpnEnabled] = useState(true);
  const [ppnRatePercent, setPpnRatePercent] = useState<number>(11);
  const [isPph23Enabled, setIsPph23Enabled] = useState(true);
  const [pph23RatePercent, setPph23RatePercent] = useState<number>(2);
  const [status, setStatus] = useState<InvoiceStatus>('Draft');
  const [notes, setNotes] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');

  // Selected contract object
  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  useEffect(() => {
    if (invoiceToEdit) {
      setSelectedContractId(invoiceToEdit.contractId);
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setBillingPeriod(invoiceToEdit.billingPeriod);
      setIssueDate(invoiceToEdit.issueDate);
      setDueDate(invoiceToEdit.dueDate);
      setBaseMonthlyAmount(invoiceToEdit.baseMonthlyAmount);
      setExtraItems(invoiceToEdit.extraItems || []);
      setIsPpnEnabled(invoiceToEdit.isPpnEnabled);
      setPpnRatePercent(invoiceToEdit.ppnRatePercent ?? 11);
      setIsPph23Enabled(invoiceToEdit.isPph23Enabled);
      setPph23RatePercent(invoiceToEdit.pph23RatePercent ?? 2);
      setStatus(invoiceToEdit.status);
      setNotes(invoiceToEdit.notes || '');
      setBankAccountId(invoiceToEdit.bankAccountId || '');
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const sequence = String(existingInvoicesCount + 1).padStart(3, '0');
      
      setInvoiceNumber(`INV/${year}/${monthStr}/${sequence}`);
      
      // Billing period label e.g. "September 2026"
      const periodLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      setBillingPeriod(periodLabel);

      const issue = now.toISOString().split('T')[0];
      setIssueDate(issue);

      const defaultContract = contracts[0];
      if (defaultContract) {
        setSelectedContractId(defaultContract.id);
        setBaseMonthlyAmount(defaultContract.monthlyContractValue || 0);
        const term = defaultContract.paymentTermDays || 30;
        const due = new Date(Date.now() + term * 86400000).toISOString().split('T')[0];
        setDueDate(due);
      } else {
        setSelectedContractId('');
        setBaseMonthlyAmount(0);
        setDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      }

      setExtraItems([]);
      setIsPpnEnabled(true);
      setPpnRatePercent(11);
      setIsPph23Enabled(true);
      setPph23RatePercent(2);
      setStatus('Draft');
      setNotes('');

      const primaryBank = companyProfile?.bankAccounts?.find((b) => b.isPrimary) || companyProfile?.bankAccounts?.[0];
      setBankAccountId(primaryBank?.id || '');
    }
  }, [invoiceToEdit, isOpen, contracts, existingInvoicesCount, companyProfile]);

  const handleContractSelect = (cid: string) => {
    setSelectedContractId(cid);
    const c = contracts.find((item) => item.id === cid);
    if (c) {
      setBaseMonthlyAmount(c.monthlyContractValue || 0);
      const term = c.paymentTermDays || 30;
      const baseDate = issueDate ? new Date(issueDate) : new Date();
      const due = new Date(baseDate.getTime() + term * 86400000).toISOString().split('T')[0];
      setDueDate(due);
    }
  };

  const handleAddExtraItem = () => {
    setExtraItems([
      ...extraItems,
      {
        id: `ext-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 1500000,
        subtotal: 1500000
      }
    ]);
  };

  const handleRemoveExtraItem = (id: string) => {
    setExtraItems(extraItems.filter((e) => e.id !== id));
  };

  const handleUpdateExtraItem = (id: string, field: keyof InvoiceExtraItem, val: any) => {
    setExtraItems(
      extraItems.map((e) => {
        if (e.id === id) {
          const updated = { ...e, [field]: val };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.subtotal = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
          }
          return updated;
        }
        return e;
      })
    );
  };

  // Calculations
  const subtotalExtra = extraItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const subtotalBeforeTax = Number(baseMonthlyAmount) + subtotalExtra;
  
  const ppnAmount = isPpnEnabled ? Math.round(subtotalBeforeTax * ((Number(ppnRatePercent) || 0) / 100)) : 0;
  const pph23Amount = isPph23Enabled ? Math.round(subtotalBeforeTax * ((Number(pph23RatePercent) || 0) / 100)) : 0;
  
  // Total Net Tagihan yang ditagihkan & dibayar oleh klien (Subtotal + PPN - PPh 23 dipotong klien)
  const totalAmount = subtotalBeforeTax + ppnAmount - pph23Amount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      alert('Nomor invoice wajib diisi.');
      return;
    }
    if (!selectedContract) {
      alert('Pilih kontrak acuan terlebih dahulu.');
      return;
    }
    if (totalAmount <= 0) {
      alert('Total tagihan invoice harus lebih besar dari 0.');
      return;
    }

    const previousPaid = invoiceToEdit?.paidAmount || 0;
    const remainingAmount = Math.max(0, totalAmount - previousPaid);
    
    // Auto status adjust if paid
    let finalStatus: InvoiceStatus = status;
    if (previousPaid >= totalAmount) {
      finalStatus = 'Lunas';
    } else if (previousPaid > 0) {
      finalStatus = 'Dibayar Sebagian';
    }

    const payload: ClientInvoice = {
      id: invoiceToEdit ? invoiceToEdit.id : `cinv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim(),
      contractId: selectedContract.id,
      contractNumber: selectedContract.contractNumber,
      clientName: selectedContract.clientName,
      clientAddress: selectedContract.clientAddress,
      clientTaxId: selectedContract.clientTaxId,
      projectId: selectedContract.projectId,
      projectName: selectedContract.projectName,
      billingPeriod: billingPeriod.trim(),
      issueDate,
      dueDate,
      baseMonthlyAmount: Number(baseMonthlyAmount),
      extraItems,
      subtotalExtra,
      subtotalBeforeTax,
      isPpnEnabled,
      ppnRatePercent: Number(ppnRatePercent),
      ppnAmount,
      isPph23Enabled,
      pph23RatePercent: Number(pph23RatePercent),
      pph23Amount,
      totalAmount,
      paidAmount: previousPaid,
      remainingAmount,
      status: finalStatus,
      notes: notes.trim(),
      bankAccountId,
      receivableRecordId: invoiceToEdit?.receivableRecordId,
      payments: invoiceToEdit?.payments || [],
      createdAt: invoiceToEdit ? invoiceToEdit.createdAt : new Date().toISOString(),
      createdBy: invoiceToEdit?.createdBy || currentUser?.name || 'Finance Lead',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Finance Lead'
    };

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {invoiceToEdit ? 'Edit Invoice Tagihan' : 'Buat Invoice Bulanan dari Kontrak'}
              </h3>
              <p className="text-xs text-slate-500">
                Format nomor otomatis, pekerjaan ekstra, serta kalkulasi PPN & PPh 23
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
          {/* Row 1: Kontrak Acuan & Nomor Invoice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Kontrak Klien <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedContractId}
                onChange={(e) => handleContractSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Kontrak Acuan --</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName} ({c.contractNumber}) - {c.projectName}
                  </option>
                ))}
              </select>
              {selectedContract && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  Klien: {selectedContract.clientName} • Nilai Pokok: {formatCurrency(selectedContract.monthlyContractValue)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Invoice Resmi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV/TAHUN/BULAN/URUT"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Format standar: INV/TAHUN/BULAN/URUT</p>
            </div>
          </div>

          {/* Row 2: Periode Tagihan, Tanggal Terbit, Jatuh Tempo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Periode Tagihan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                placeholder="e.g. September 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Invoice (Terbit)
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Jatuh Tempo
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Row 3: Biaya Pokok Bulanan */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Nilai Tagihan Kontrak Pokok (Bulanan)
              </p>
              <p className="text-[11px] text-slate-500">
                Nilai retensi / jasa cleaning bulanan sesuai kontrak
              </p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="number"
                min={0}
                required
                value={baseMonthlyAmount || ''}
                onChange={(e) => setBaseMonthlyAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 text-right bg-white focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 text-right mt-0.5">
                {formatCurrency(baseMonthlyAmount)}
              </p>
            </div>
          </div>

          {/* Section: Pekerjaan Ekstra (Special Cleaning, Poles Lantai, dll) */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Baris Pekerjaan Ekstra (Special Cleaning, Poles, dll)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Item pekerjaan tambahan di luar lingkup bulanan rutin
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddExtraItem}
                className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Pekerjaan Ekstra
              </button>
            </div>

            {extraItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Tidak ada baris pekerjaan ekstra. Klik tombol di atas untuk menambahkan special cleaning atau poles lantai.
              </p>
            ) : (
              <div className="space-y-2">
                {extraItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                  >
                    <div className="flex-1 w-full sm:w-auto">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateExtraItem(item.id, 'description', e.target.value)}
                        placeholder="Deskripsi Pekerjaan (e.g. Poles Marmer Kristalisasi Lobby)"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-semibold bg-white"
                      />
                    </div>

                    <div className="w-full sm:w-20">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleUpdateExtraItem(item.id, 'quantity', Number(e.target.value))}
                        placeholder="Qty"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-center font-bold bg-white"
                      />
                    </div>

                    <div className="w-full sm:w-36">
                      <input
                        type="number"
                        min={0}
                        value={item.unitPrice || ''}
                        onChange={(e) => handleUpdateExtraItem(item.id, 'unitPrice', Number(e.target.value))}
                        placeholder="Harga Satuan"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-right font-medium bg-white"
                      />
                    </div>

                    <div className="w-full sm:w-36 text-right font-bold text-xs text-slate-800 pr-1">
                      {formatCurrency(item.subtotal)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveExtraItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Pengaturan Pajak (PPN 11% & PPh 23 2%) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pengaturan Pajak (PPN & PPh 23)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PPN Switch */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={isPpnEnabled}
                      onChange={(e) => setIsPpnEnabled(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>PPN (Pajak Pertambahan Nilai)</span>
                  </label>
                  {isPpnEnabled && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Aktif (+{ppnRatePercent}%)
                    </span>
                  )}
                </div>
                {isPpnEnabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-600">Tarif:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ppnRatePercent}
                      onChange={(e) => setPpnRatePercent(Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                    />
                    <span className="text-xs text-slate-500">% =</span>
                    <span className="text-xs font-bold text-slate-800">{formatCurrency(ppnAmount)}</span>
                  </div>
                )}
              </div>

              {/* PPh 23 Switch */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={isPph23Enabled}
                      onChange={(e) => setIsPph23Enabled(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>PPh 23 (Dipotong Klien)</span>
                  </label>
                  {isPph23Enabled && (
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Dipotong (-{pph23RatePercent}%)
                    </span>
                  )}
                </div>
                {isPph23Enabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-600">Tarif:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={pph23RatePercent}
                      onChange={(e) => setPph23RatePercent(Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                    />
                    <span className="text-xs text-slate-500">% =</span>
                    <span className="text-xs font-bold text-rose-700">-{formatCurrency(pph23Amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown Summary Box */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal Jasa Pokok & Ekstra:</span>
                <span className="font-semibold">{formatCurrency(subtotalBeforeTax)}</span>
              </div>
              {isPpnEnabled && (
                <div className="flex justify-between text-emerald-700">
                  <span>(+) PPN {ppnRatePercent}%:</span>
                  <span className="font-semibold">+{formatCurrency(ppnAmount)}</span>
                </div>
              )}
              {isPph23Enabled && (
                <div className="flex justify-between text-rose-700">
                  <span>(-) PPh Pasal 23 ({pph23RatePercent}% dipotong klien):</span>
                  <span className="font-semibold">-{formatCurrency(pph23Amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-extrabold text-slate-900">
                <span>Total Tagihan Bersih (Piutang Klien):</span>
                <span className="text-emerald-700 text-base">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Row 4: Status & Rekening Tujuan Transfer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Invoice
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Draft">Draft (Internal)</option>
                <option value="Terkirim">Terkirim (Otomatis Masuk Piutang)</option>
                <option value="Dibayar Sebagian">Dibayar Sebagian</option>
                <option value="Lunas">Lunas</option>
                <option value="Jatuh Tempo">Jatuh Tempo</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Status "Terkirim" otomatis mencatat piutang di modul Pencatatan Hutang & Piutang untuk analisa aging.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rekening Bank Penerimaan (Kop Dokumen)
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Rekening Utama Perusahaan --</option>
                {(companyProfile?.bankAccounts || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountNumber} ({b.accountHolder})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Catatan Tambahan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Instruksi Pembayaran di Invoice
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruksi transfer, contact person finance, atau keterangan pembayaran"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
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
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition"
            >
              {invoiceToEdit ? 'Simpan Invoice' : 'Terbitkan Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
