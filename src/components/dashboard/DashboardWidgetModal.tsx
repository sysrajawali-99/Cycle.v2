import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  Eye,
  EyeOff,
  BellRing,
  Users,
  CalendarCheck2,
  Package,
  CreditCard,
  Landmark,
  BarChart3,
  KanbanSquare,
  Megaphone
} from 'lucide-react';
import { DashboardWidgetId, DashboardWidgetsState } from '../../types';

interface DashboardWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidgetsState;
  onSave: (updated: DashboardWidgetsState) => void;
  onReset: () => void;
}

interface WidgetItemMeta {
  id: DashboardWidgetId;
  label: string;
  category: 'Header & Notifikasi' | 'Statistik Kunci' | 'Keuangan & Likuiditas' | 'Analisis Komparatif' | 'Operasional & Tugas';
  description: string;
  icon: React.ElementType;
  badge?: string;
}

const WIDGET_ITEMS: WidgetItemMeta[] = [
  {
    id: 'banner',
    label: 'Banner Sambutan & Info Lokasi',
    category: 'Header & Notifikasi',
    description: 'Header utama berisi nama perusahaan, tagline, ringkasan lokasi terpilih, tombol cepatTimesheet dan spesifikasi gedung.',
    icon: Sparkles
  },
  {
    id: 'critical_alerts',
    label: 'Pusat Notifikasi & Peringatan Stok / Approval',
    category: 'Header & Notifikasi',
    description: 'Kartu peringatan otomatis untuk bahan kimia/alat berstatus stok kritis dan daftar pengajuan Material Request yang menunggu persetujuan.',
    icon: BellRing,
    badge: 'Real-time'
  },
  {
    id: 'stat_employees',
    label: 'Kartu Metrik: Personil Aktif',
    category: 'Statistik Kunci',
    description: 'Total cleaner aktif yang bertugas beserta shift dan tautan cepat ke database karyawan.',
    icon: Users
  },
  {
    id: 'stat_attendance',
    label: 'Kartu Metrik: Kehadiran Hari Ini',
    category: 'Statistik Kunci',
    description: 'Persentase presensi kehadiran harian real-time, rincian Alpa & Izin, serta navigasi ke Timesheet.',
    icon: CalendarCheck2
  },
  {
    id: 'stat_inventory',
    label: 'Kartu Metrik: Status Stok Chemical & Alat',
    category: 'Statistik Kunci',
    description: 'Indikator stok gudang, jumlah item kritis, total master katalog dan navigasi ke Smart Inventory.',
    icon: Package
  },
  {
    id: 'stat_payroll',
    label: 'Kartu Metrik: Estimasi Payroll Berjalan',
    category: 'Statistik Kunci',
    description: 'Estimasi nilai pengeluaran gaji cut-off berjalan terhitung otomatis dari kehadiran hari kerja.',
    icon: CreditCard
  },
  {
    id: 'liquidity_accounts',
    label: 'Pusat Saldo Rekening Pemasukan & Kas/Bank',
    category: 'Keuangan & Likuiditas',
    description: 'Pemantauan saldo rekening bank (BCA, Mandiri, BNI), kas besar/lapangan, tombol update saldo cepat dan setoran pemasukan.',
    icon: Landmark,
    badge: 'Likuiditas'
  },
  {
    id: 'comparative_payroll',
    label: 'Diagram MoM: Komparasi Pengeluaran Gaji',
    category: 'Analisis Komparatif',
    description: 'Grafik komparasi bulan sebelumnya vs bulan berjalan, delta selisih, dan visualisasi bar chart per lokasi proyek.',
    icon: BarChart3
  },
  {
    id: 'comparative_manpower',
    label: 'Diagram Kuota: Target Manpower vs Aktual',
    category: 'Analisis Komparatif',
    description: 'Perbandingan kuota kebutuhan kontrak dari Pengaturan Lokasi vs jumlah personil riil yang teralokasi di database.',
    icon: BarChart3
  },
  {
    id: 'tasks_board',
    label: 'Monitoring Checklist Kebersihan (Rajawali Boards)',
    category: 'Operasional & Tugas',
    description: 'Progress pengerjaan checklist zona kerja, status tugas (Selesai, Audit QC, Sedang Dikerjakan) dan nama petugas.',
    icon: KanbanSquare
  },
  {
    id: 'blasts_announcements',
    label: 'Eagle Blast: Pengumuman & Kebijakan Pusat',
    category: 'Operasional & Tugas',
    description: 'Pengumuman resmi penting, SOP kilat, dan instruksi langsung dari manajemen pusat HQ.',
    icon: Megaphone
  }
];

export const DashboardWidgetModal: React.FC<DashboardWidgetModalProps> = ({
  isOpen,
  onClose,
  widgets,
  onSave,
  onReset
}) => {
  const [localWidgets, setLocalWidgets] = useState<DashboardWidgetsState>(widgets);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');

  // Sync state whenever modal opens or parent widgets changes
  React.useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets, isOpen]);

  if (!isOpen) return null;

  const handleToggle = (id: DashboardWidgetId) => {
    setLocalWidgets((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = (visible: boolean) => {
    const updated = { ...localWidgets };
    (Object.keys(updated) as DashboardWidgetId[]).forEach((key) => {
      updated[key] = visible;
    });
    setLocalWidgets(updated);
  };

  const handleApply = () => {
    onSave(localWidgets);
    onClose();
  };

  const handleResetToDefault = () => {
    onReset();
    onClose();
  };

  const categories = ['Semua', 'Header & Notifikasi', 'Statistik Kunci', 'Keuangan & Likuiditas', 'Analisis Komparatif', 'Operasional & Tugas'];

  const filteredWidgets = activeCategory === 'Semua'
    ? WIDGET_ITEMS
    : WIDGET_ITEMS.filter((w) => w.category === activeCategory);

  const totalVisible = Object.values(localWidgets).filter(Boolean).length;
  const totalWidgets = WIDGET_ITEMS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Kustomisasi Widget Dashboard
                </h3>
                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {totalVisible} dari {totalWidgets} Ditampilkan
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilih modul dan komponen yang ingin ditampilkan atau disembunyikan pada layar Command Center Anda.
              </p>
            </div>
          </div>

          <button
            id="close-widget-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Batch Actions & Category Filter */}
        <div className="p-3 sm:px-6 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[11px] font-bold text-slate-300 hover:text-amber-400 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Tampilkan Semua
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-400 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Sembunyikan Semua
            </button>
          </div>
        </div>

        {/* Widgets List Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredWidgets.map((item) => {
              const isChecked = !!localWidgets[item.id];
              const IconComponent = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start space-x-3 group ${
                    isChecked
                      ? 'bg-slate-950 border-amber-500/40 shadow-sm shadow-amber-500/5'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${
                      isChecked
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-amber-500/80 font-semibold block mb-1">
                      {item.category}
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Switch indicator */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        isChecked ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-slate-950 shadow-md transition-transform flex items-center justify-center ${
                          isChecked ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      >
                        {isChecked ? (
                          <Check className="w-2.5 h-2.5 text-amber-400" />
                        ) : (
                          <X className="w-2.5 h-2.5 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalVisible === 0 && (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-2">
              <EyeOff className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-slate-300">Semua Widget Disembunyikan</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Anda telah mematikan seluruh widget. Dashboard akan menampilkan halaman kosong minimalis dengan tombol pengaturan widget.
              </p>
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="mt-2 text-xs font-bold text-amber-400 hover:underline cursor-pointer"
              >
                Aktifkan Semua Widget Kembali
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-amber-400 px-3 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Default Pabrik</span>
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              id="save-widget-settings-btn"
              type="button"
              onClick={handleApply}
              className="flex items-center space-x-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Terapkan ({totalVisible} Aktif)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
