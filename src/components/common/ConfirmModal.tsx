import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Hapus Data',
  cancelText = 'Batal',
  confirmVariant = 'danger',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getButtonStyles = () => {
    switch (confirmVariant) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40';
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40';
      case 'danger':
      default:
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40';
    }
  };

  return (
    <div
      id="custom-confirm-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all"
      onClick={onCancel}
    >
      <div
        id="custom-confirm-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Top Corner */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start space-x-3.5 pt-1">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {confirmVariant === 'danger' ? (
              <Trash2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{title}</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
          <button
            id="modal-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            id="modal-confirm-btn"
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center space-x-1.5 ${getButtonStyles()}`}
          >
            {confirmVariant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
