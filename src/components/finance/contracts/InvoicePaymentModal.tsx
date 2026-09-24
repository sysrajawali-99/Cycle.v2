import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, DollarSign, Wallet } from 'lucide-react';
import { ClientInvoice, InvoicePaymentRecord } from '../../../types/finance';
import { CompanyProfile, UserAccount } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface InvoicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
  onSavePayment: (
    invoiceId: string,
    payment: InvoicePaymentRecord,
    paymentAccountCode: string
  ) => void;
  companyProfile: CompanyProfile;
  currentUser?: UserAccount | null;
}

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSavePayment,
  companyProfile,
  currentUser
}) => {
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('');
  const [payAccountCode, setPayAccountCode] = useState<string>('1120');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  useEffect(() => {
    if (invoice) {
      setPayAmount(invoice.remainingAmount);
      setPayDate(new Date().toISOString().split('T')[0]);
      setPayRef(`TRF-INV-${Date.now().toString().slice(-5)}`);
      setPayNotes(`Penerimaan pelunasan invoice ${invoice.invoiceNumber} (${invoice.clientName})`);

      const defaultBank =
        companyProfile.bankAccounts?.find((b) => b.isPrimary) ||
        companyProfile.bankAccounts?.[0] || {
          bankName: companyProfile.bankName || 'Bank BCA',
          accountNumber: companyProfile.bankAccountNo || '541-0988-771',
          accountHolder: companyProfile.bankAccountHolder || 'PT Rajawali Cycle Indonesia'
        };

      setPayMethod(`${defaultBank.bankName} (${defaultBank.accountNumber})`);
      setPayAccountCode('1120');
    }
  }, [invoice, isOpen, companyProfile]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      alert('Nominal pembayaran harus lebih besar dari 0.');
      return;
    }
    if (payAmount > invoice.remainingAmount) {
      alert(`Nominal pembayaran tidak boleh melebihi sisa piutang invoice (${formatCurrency(invoice.remainingAmount)}).`);
      return;
    }

    const payment: InvoicePaymentRecord = {
      id: `invp-${Date.now()}`,
      date: payDate,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      accountCode: payAccountCode,
      referenceNumber: payRef.trim(),
      notes: payNotes.trim(),
      recordedBy: currentUser?.name || 'Finance Lead'
    };

    onSavePayment(invoice.id, payment, payAccountCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Catat Pembayaran Invoice</h3>
              <p className="text-xs text-slate-500">
                Otomatis mengurangi piutang & membukukan kas masuk (BKM)
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Invoice Summary */}
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1">
            <div className="flex justify-between font-bold text-emerald-950">
              <span>{invoice.invoiceNumber}</span>
              <span>Total: {formatCurrency(invoice.totalAmount)}</span>
            </div>
            <p className="text-emerald-800">{invoice.clientName} • {invoice.projectName}</p>
            <div className="flex justify-between pt-1 border-t border-emerald-200 text-slate-600">
              <span>Sisa Piutang Saat Ini:</span>
              <span className="font-extrabold text-rose-700">{formatCurrency(invoice.remainingAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Pembayaran Diterima (Rp) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={invoice.remainingAmount}
              required
              value={payAmount || ''}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">{formatCurrency(payAmount)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Diterima
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. Bukti / Referensi Transfer
              </label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. TRF-BCA-998811"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rekening Bank Tujuan Transfer (Masuk Kas)
            </label>
            <select
              value={payMethod}
              onChange={(e) => {
                const val = e.target.value;
                setPayMethod(val);
                if (val.includes('Kas Tunai') || val.includes('Petty Cash')) {
                  setPayAccountCode('1110');
                } else {
                  setPayAccountCode('1120');
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              {(companyProfile.bankAccounts || []).map((b) => (
                <option key={b.id} value={`${b.bankName} (${b.accountNumber})`}>
                  {b.bankName} - {b.accountNumber} ({b.accountHolder})
                </option>
              ))}
              <option value="Kas Tunai / Petty Cash HQ">Kas Tunai / Petty Cash HQ (1110)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pembayaran
            </label>
            <textarea
              rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Keterangan tambahan penerimaan invoice"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

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
              Konfirmasi & Masukkan Buku Kas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
