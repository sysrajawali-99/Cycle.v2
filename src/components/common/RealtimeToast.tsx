import React, { useEffect, useState } from 'react';
import {
  Boxes,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X,
  Radio,
  Clock
} from 'lucide-react';

export type ToastModule = 'inventory' | 'reports';

export interface RealtimeToastItem {
  id: string;
  module: ToastModule;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'update';
  timestamp?: string;
  isRealtimeSync?: boolean;
}

// Global Custom Event Dispatcher for Toast
export const notifyRealtimeChange = (toast: Omit<RealtimeToastItem, 'id' | 'timestamp'>) => {
  try {
    const event = new CustomEvent<RealtimeToastItem>('rajawali_toast_notification', {
      detail: {
        ...toast,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
    });
    window.dispatchEvent(event);
  } catch (err) {
    console.warn('[Toast] Failed to dispatch toast notification:', err);
  }
};

export const RealtimeToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<RealtimeToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<RealtimeToastItem>;
      if (!customEvent.detail) return;

      const newToast = customEvent.detail;
      setToasts((prev) => {
        // Prevent duplicate messages in quick succession (within 1 second)
        const isDuplicate = prev.some(
          (t) => t.module === newToast.module && t.message === newToast.message
        );
        if (isDuplicate) return prev;

        // Keep maximum 3 toasts visible at once
        const updated = [...prev, newToast].slice(-3);
        return updated;
      });

      // Auto-dismiss after 3.8 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3800);
    };

    window.addEventListener('rajawali_toast_notification', handleToastEvent);
    return () => {
      window.removeEventListener('rajawali_toast_notification', handleToastEvent);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none transition-all duration-300"
    >
      {toasts.map((toast) => {
        const isInventory = toast.module === 'inventory';
        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border transition-all duration-300 transform translate-y-0 opacity-100 flex items-start space-x-3 ${
              isInventory
                ? 'border-emerald-500/50 shadow-emerald-500/10'
                : 'border-blue-500/50 shadow-blue-500/10'
            }`}
          >
            {/* Module Icon */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                isInventory
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {isInventory ? (
                <Boxes className="w-5 h-5 animate-pulse" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 animate-pulse" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center space-x-2 mb-0.5">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isInventory
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {isInventory ? 'Inventory' : 'Rekap Laporan'}
                </span>

                {/* Real-time Badge */}
                <span className="flex items-center space-x-1 text-[10px] text-amber-400 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>{toast.isRealtimeSync ? 'Sync Server' : 'Real-time'}</span>
                </span>

                {toast.timestamp && (
                  <span className="text-[10px] text-slate-400 ml-auto shrink-0 flex items-center space-x-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{toast.timestamp}</span>
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-slate-100 leading-tight truncate">
                {toast.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug break-words">
                {toast.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => handleDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
