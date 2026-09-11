import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  UserCheck,
  FileText,
  DollarSign
} from 'lucide-react';
import { UserAccount } from '../../types';
import { financeService } from '../../services/financeService';

interface SecurityPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  itemCode?: string;
  itemName?: string;
  itemAmount?: number;
  itemDetails?: string;
  moduleName?: string;
  currentUser?: UserAccount | null;
  users?: UserAccount[];
}

export const SecurityPinModal: React.FC<SecurityPinModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Otorisasi PIN Keamanan Hapus Data',
  itemCode,
  itemName,
  itemAmount,
  itemDetails,
  moduleName = 'Keuangan & Akuntansi',
  currentUser,
  users = []
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setReason('');
      setErrorMessage(null);
      setShowPin(false);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Find authorized superadmin PIN or current user PIN
  const superadminUser = users.find((u) => u.role === 'Super Admin (HQ)');
  const expectedSuperadminPin = superadminUser?.securityPin || '123456';
  const expectedUserPin = currentUser?.securityPin || '123456';

  const handleVerifyAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPin = pin.trim();
    if (!cleanPin) {
      setErrorMessage('Silakan masukkan 6-digit PIN keamanan.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Harap isi alasan penghapusan data untuk pencatatan log audit trail.');
      return;
    }

    setIsVerifying(true);

    // Verify PIN: accepts user's security PIN or Superadmin override PIN (default fallback 123456)
    const isUserPinMatch = cleanPin === expectedUserPin;
    const isSuperadminMatch = cleanPin === expectedSuperadminPin;
    const isUniversalDefault = cleanPin === '123456';

    if (isUserPinMatch || isSuperadminMatch || isUniversalDefault) {
      setTimeout(() => {
        setIsVerifying(false);
        onConfirm(reason.trim());
        onClose();
      }, 300);
    } else {
      setIsVerifying(false);
      setErrorMessage('PIN keamanan salah! Otorisasi ditolak. Hubungi Superadmin HQ jika Anda lupa PIN akun Anda.');
    }
  };

  return (
    <div
      id="security-pin-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="security-pin-modal-card"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-rose-950/40 border-b border-rose-900/40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
              <p className="text-xs text-rose-300/80">
                Akses proteksi Superadmin & kepatuhan audit anti-fraud
              </p>
            </div>
          </div>
          <button
            id="close-pin-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleVerifyAndSubmit} className="p-6 space-y-4">
          {/* Target Item Details Card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-medium">Modul Sistem:</span>
              <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                {moduleName}
              </span>
            </div>

            {itemCode && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Kode / No. Bukti:</span>
                <span className="font-mono font-bold text-white">{itemCode}</span>
              </div>
            )}

            {itemName && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Nama / Deskripsi:</span>
                <span className="font-semibold text-slate-200 text-right max-w-[260px] truncate">
                  {itemName}
                </span>
              </div>
            )}

            {itemAmount !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Nominal Transaksi:</span>
                <span className="font-mono font-bold text-rose-400">
                  {financeService.formatRupiah(itemAmount)}
                </span>
              </div>
            )}

            {itemDetails && (
              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                {itemDetails}
              </div>
            )}
          </div>

          {/* User Session Info */}
          <div className="flex items-center justify-between bg-slate-800/50 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Eksekutor:</span>
              <span className="font-bold text-white">{currentUser?.name || 'User Terautentikasi'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {currentUser?.role || 'Finance'}
            </span>
          </div>

          {/* Reason Input (Required for Audit Trail) */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-1.5">
              Alasan Penghapusan (Wajib untuk Audit Trail) <span className="text-rose-400">*</span>
            </label>
            <input
              id="deletion-reason-input"
              type="text"
              required
              placeholder="Contoh: Koreksi duplikasi voucher / Kesalahan input nominal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {/* PIN Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-200">
                PIN Keamanan Otorisasi (6 Digit) <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Default Superadmin: <span className="font-mono text-amber-300">123456</span>
              </span>
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <KeyRound className="w-4 h-4 text-rose-400" />
              </div>
              <input
                id="security-pin-input"
                type={showPin ? 'text' : 'password'}
                maxLength={6}
                required
                autoFocus
                placeholder="Masukkan 6 digit PIN..."
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm font-mono tracking-widest text-center text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
              />
              <button
                type="button"
                id="toggle-pin-visibility-btn"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2 animate-in shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Audit Notice Warning */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Pemberitahuan Kepatuhan & Jejak Audit:</span>
            </div>
            <p className="leading-relaxed">
              Tindakan penghapusan ini akan dicatat secara permanen di{' '}
              <strong className="text-purple-300">Log Audit Trail Keuangan</strong> beserta identitas akun,
              waktu presisi, nominal voucher, dan alasan penghapusan.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              id="cancel-pin-modal-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="submit-pin-authorize-btn"
              disabled={isVerifying || pin.length < 4}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer ${
                pin.length >= 4 && !isVerifying
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/40'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi PIN...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Otorisasi & Hapus Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
