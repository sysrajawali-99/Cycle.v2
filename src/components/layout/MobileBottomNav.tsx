import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  Users,
  Package,
  KanbanSquare,
  MoreHorizontal,
  Megaphone,
  BookOpen,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  RotateCcw,
  X,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Lock,
  LogOut,
  Briefcase,
  Layers,
  Sun,
  Moon,
  Monitor,
  Trash2
} from 'lucide-react';
import { AppView, Project, UserAccount } from '../../types';
import { themeService, ThemeMode } from '../../services/themeService';

interface MobileBottomNavProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  projects?: Project[];
  selectedProjectId?: string;
  onSelectProject?: (id: string) => void;
  currentUser?: UserAccount;
  onLogout?: () => void;
  onResetData?: () => void;
  lowStockCount?: number;
  activeTasksCount?: number;
  unreadBlastCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  projects = [],
  selectedProjectId = 'ALL',
  onSelectProject,
  currentUser,
  onLogout,
  onResetData,
  lowStockCount = 0,
  activeTasksCount = 0,
  unreadBlastCount = 0
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isHrmSheetOpen, setIsHrmSheetOpen] = useState(true);
  const [isOmSheetOpen, setIsOmSheetOpen] = useState(true);
  const [isFinanceSheetOpen, setIsFinanceSheetOpen] = useState(true);
  const [themePref, setThemePref] = useState<ThemeMode>(() => themeService.getThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => themeService.getResolvedTheme());

  React.useEffect(() => {
    const handleThemeChange = () => {
      setThemePref(themeService.getThemePreference());
      setResolvedTheme(themeService.getResolvedTheme());
    };
    window.addEventListener('theme_changed', handleThemeChange);
    return () => window.removeEventListener('theme_changed', handleThemeChange);
  }, []);

  const currentProject = (projects || []).find((p) => p.id === selectedProjectId);

  const allowedViews = currentUser?.allowedViews || [
    'dashboard',
    'project_settings',
    'timesheet',
    'employees',
    'inventory',
    'tasks',
    'blast',
    'sops',
    'reports',
    'finance_cash_journal',
    'finance_debts_receivables',
    'finance_investments',
    'finance_outflow_forecast',
    'finance_profit_loss',
    'finance_bank_reconcile',
    'finance_statements',
    'finance_analytics_audit'
  ];

  const isViewAllowed = (viewId: AppView) => {
    if (viewId === 'company_settings' || viewId === 'access_control') {
      return currentUser?.role === 'Super Admin (HQ)' || allowedViews.includes(viewId as any);
    }
    return allowedViews.includes(viewId) || (viewId === 'sops' && allowedViews.includes('sop' as any));
  };

  // Quick bottom bar candidate items
  const candidateMainItems: {
    id: AppView;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Beranda',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'timesheet',
      label: 'Timesheet',
      icon: <CalendarCheck2 className="w-5 h-5" />
    },
    {
      id: 'employees',
      label: 'Karyawan',
      icon: <Users className="w-5 h-5" />
    },
    {
      id: 'inventory',
      label: 'Stok',
      icon: <Package className="w-5 h-5" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'tasks',
      label: 'Tugas',
      icon: <KanbanSquare className="w-5 h-5" />,
      badge: activeTasksCount > 0 ? activeTasksCount : undefined,
      badgeColor: 'bg-blue-500 text-white'
    }
  ];

  const filteredMainItems = candidateMainItems.filter((item) =>
    allowedViews.includes(item.id)
  );

  // Grouped Menu Lists for the "More" Action Sheet
  const hrmSheetItems = [
    {
      id: 'timesheet' as AppView,
      label: 'Eagle Timesheet',
      description: 'Matriks kehadiran 1-31 & lembur',
      icon: <CalendarCheck2 className="w-4 h-4 text-emerald-400" />,
      badge: 31
    },
    {
      id: 'employees' as AppView,
      label: 'Data Karyawan & Lokasi',
      description: 'Database personil & riwayat mutasi',
      icon: <Users className="w-4 h-4 text-blue-400" />
    },
    {
      id: 'sops' as AppView,
      label: 'SOP & Dokumen K3',
      description: 'Standar mutu pembersihan & APD',
      icon: <BookOpen className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'reports' as AppView,
      label: 'Pusat Laporan & Payroll',
      description: 'Cetak slip gaji & ekspor rekapitulasi data',
      icon: <FileSpreadsheet className="w-4 h-4 text-blue-400" />
    }
  ].filter((item) => isViewAllowed(item.id));

  const omSheetItems = [
    {
      id: 'project_settings' as AppView,
      label: 'Pengaturan Lokasi',
      description: 'Spesifikasi gedung, manpower, lift & lantai',
      icon: <Building2 className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'inventory' as AppView,
      label: 'Smart Inventory',
      description: 'Update stok & chemical kritis',
      icon: <Package className="w-4 h-4 text-purple-400" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined
    },
    {
      id: 'tasks' as AppView,
      label: 'Rajawali Boards',
      description: 'Papan monitoring & QC kebersihan',
      icon: <KanbanSquare className="w-4 h-4 text-teal-400" />,
      badge: activeTasksCount > 0 ? activeTasksCount : undefined
    }
  ].filter((item) => isViewAllowed(item.id));

  const financeSheetItems = [
    {
      id: 'finance_cash_journal' as AppView,
      label: 'Buku Kas & Jurnal Umum',
      description: 'Uang masuk/keluar, jurnal & buku besar',
      icon: <Layers className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'finance_debts_receivables' as AppView,
      label: 'Pencatatan Hutang & Piutang',
      description: 'Hutang vendor, piutang klien & aging',
      icon: <FileSpreadsheet className="w-4 h-4 text-rose-400" />
    },
    {
      id: 'finance_investments' as AppView,
      label: 'Pencatatan Investasi & Bagi Hasil',
      description: '12 baris jadwal, investor & reminder',
      icon: <Briefcase className="w-4 h-4 text-purple-400" />
    },
    {
      id: 'finance_outflow_forecast' as AppView,
      label: 'Forecast Rencana Pengeluaran',
      description: 'Gaji manpower + hutang + bagi hasil',
      icon: <Layers className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'finance_profit_loss' as AppView,
      label: 'Laba Rugi (Profit & Loss)',
      description: 'Laporan laba rugi komprehensif',
      icon: <BookOpen className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'finance_bank_reconcile' as AppView,
      label: 'Rekening Koran & Rekonsiliasi',
      description: 'Upload e-Statement & auto-matching',
      icon: <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'finance_statements' as AppView,
      label: 'Laporan Keuangan (SAK)',
      description: 'Neraca, arus kas & permodalan',
      icon: <BookOpen className="w-4 h-4 text-blue-400" />
    },
    {
      id: 'finance_analytics_audit' as AppView,
      label: 'Analisa Biaya & Tutup Buku',
      description: 'Cost center, jejak audit & kunci periode',
      icon: <ShieldCheck className="w-4 h-4 text-purple-400" />
    }
  ].filter((item) => isViewAllowed(item.id));

  const otherSheetItems = [
    {
      id: 'blast' as AppView,
      label: 'Eagle Blast',
      description: 'Memo resmi manajemen & pengumuman K3',
      icon: <Megaphone className="w-4 h-4 text-amber-400" />,
      badge: unreadBlastCount > 0 ? unreadBlastCount : undefined
    },
    {
      id: 'company_settings' as AppView,
      label: 'Pengaturan Perusahaan',
      description: 'Logo, Kop Surat & Profil HQ',
      icon: <Building2 className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'access_control' as AppView,
      label: 'Hak Akses Pengguna',
      description: 'Kelola izin menu & visibilitas user',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />
    }
  ].filter((item) => isViewAllowed(item.id));

  const handleSelectNav = (view: AppView) => {
    onSelectView(view);
    setIsMoreMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Mobile Phones (iOS / Android) */}
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-1 sm:px-2 py-1 md:hidden shadow-[0_-8px_20px_rgba(0,0,0,0.6)] pb-safe"
      >
        <div className="flex items-center justify-between max-w-lg mx-auto w-full gap-0.5">
          {filteredMainItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleSelectNav(item.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-0.5 sm:px-1.5 rounded-xl transition-all duration-150 flex-1 min-w-0 max-w-[76px] min-h-[46px] touch-manipulation active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Active Indicator Pill */}
                {isActive && (
                  <span className="absolute -top-1 w-6 h-1 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                )}

                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && (
                    <span
                      className={`absolute -top-1.5 -right-2 text-[8px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-slate-950 ${
                        item.badgeColor || 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] mt-0.5 leading-tight tracking-tight truncate w-full text-center block ${
                  isActive ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-black dark:text-slate-400 font-semibold'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Menu Trigger */}
          <button
            id="mobile-nav-more-btn"
            onClick={() => setIsMoreMenuOpen(true)}
            className={`relative flex flex-col items-center justify-center py-1 px-0.5 sm:px-1.5 rounded-xl transition-all duration-150 flex-1 min-w-0 max-w-[76px] min-h-[46px] touch-manipulation active:scale-95 cursor-pointer ${
              isMoreMenuOpen || ['project_settings', 'blast', 'sops', 'sop', 'reports', 'access_control'].includes(currentView)
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-black dark:text-slate-400 hover:text-black dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MoreHorizontal className="w-5 h-5" />
              {unreadBlastCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-slate-950" />
              )}
            </div>
            <span className={`text-[9px] sm:text-[10px] mt-0.5 leading-tight tracking-tight truncate w-full text-center block ${
              isMoreMenuOpen || ['project_settings', 'blast', 'sops', 'sop', 'reports', 'access_control'].includes(currentView)
                ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                : 'text-black dark:text-slate-400 font-semibold'
            }`}>
              Menu Lain
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer Action Sheet */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm md:hidden animate-fade-in">
          {/* Backdrop Tap to close */}
          <div
            className="flex-1 w-full"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          {/* Sheet Body */}
          <div id="mobile-more-sheet" className="bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700/80 rounded-t-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto pb-safe shadow-2xl animate-slide-up">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1 opacity-75" />

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-black dark:text-white text-base">Struktur Menu Lengkap</h3>
                  <p className="text-[11px] text-black dark:text-slate-400 font-medium">
                    {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Portal Operasional'}
                  </p>
                </div>
              </div>
              <button
                id="close-more-sheet-btn"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Site & Scope Context on Mobile */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-black dark:text-slate-400 font-bold uppercase tracking-wider">
                  Visibilitas Lokasi
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 truncate max-w-[180px]">
                  {currentUser?.isLocationLocked ? '📍 Terkunci' : '🌐 Semua Lokasi'}
                </span>
              </div>

              {currentUser?.isLocationLocked ? (
                <div className="flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-black dark:text-emerald-200">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold truncate text-black dark:text-emerald-200">
                    {currentProject ? currentProject.name : 'Lokasi Terkunci'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
                  <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <select
                    id="mobile-sheet-project-select"
                    value={selectedProjectId}
                    onChange={(e) => onSelectProject?.(e.target.value)}
                    className="bg-transparent text-xs text-black dark:text-white w-full focus:outline-none cursor-pointer py-1 font-semibold"
                  >
                    <option value="ALL" className="bg-white dark:bg-slate-900 text-black dark:text-white">
                      🌐 Semua Lokasi Proyek (HQ All Sites)
                    </option>
                    {(projects || []).map((proj) => (
                      <option key={proj.id} value={proj.id} className="bg-white dark:bg-slate-900 text-black dark:text-white">
                        📍 {proj.name} ({proj.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Group 1: Human Resource Management (HRM) */}
            {hrmSheetItems.length > 0 && (
              <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsHrmSheetOpen(!isHrmSheetOpen)}
                  className="w-full flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-950/30 border-b border-slate-200 dark:border-slate-800/80 text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-black dark:text-white">Human Resource Management (HRM)</div>
                      <div className="text-[10px] text-black dark:text-slate-400 font-medium">Timesheet, Karyawan, SOP & Payroll</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-black dark:text-slate-400">
                    <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-bold">
                      {hrmSheetItems.length} Submenu
                    </span>
                    {isHrmSheetOpen ? <ChevronDown className="w-4 h-4 text-black dark:text-slate-400" /> : <ChevronRight className="w-4 h-4 text-black dark:text-slate-400" />}
                  </div>
                </button>

                {isHrmSheetOpen && (
                  <div className="p-2 space-y-1.5">
                    {hrmSheetItems.map((item) => {
                      const isActive =
                        currentView === item.id || (item.id === 'sops' && currentView === 'sop');
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectNav(item.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            isActive
                              ? 'bg-[#ffedd5] dark:bg-amber-500/20 border-[#fdba74] dark:border-amber-500/40 text-black dark:text-amber-100 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-black dark:text-slate-300 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                              isActive
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-sm border border-amber-400/60'
                                : 'bg-slate-200 dark:bg-slate-950 text-slate-500 dark:text-slate-400'
                            }`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs truncate ${
                                isActive ? 'text-black dark:text-amber-100 font-extrabold opacity-100' : 'text-black dark:text-white font-bold'
                              }`}>
                                {item.label}
                              </div>
                              <div className={`text-[10px] truncate ${
                                isActive ? 'text-black dark:text-amber-300 font-semibold opacity-100' : 'text-black dark:text-slate-400 font-medium'
                              }`}>
                                {item.description}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-black dark:text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Group 2: Operations Management (OM) */}
            {omSheetItems.length > 0 && (
              <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsOmSheetOpen(!isOmSheetOpen)}
                  className="w-full flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/30 border-b border-slate-200 dark:border-slate-800/80 text-left cursor-pointer hover:bg-[#fff7ed] active:bg-[#fff7ed]"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-black dark:text-white">Operations Management (OM)</div>
                      <div className="text-[10px] text-black dark:text-slate-400 font-medium">Lokasi, Smart Inventory & Rajawali Boards</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-black dark:text-slate-400">
                    <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                      {omSheetItems.length} Submenu
                    </span>
                    {isOmSheetOpen ? <ChevronDown className="w-4 h-4 text-black dark:text-slate-400" /> : <ChevronRight className="w-4 h-4 text-black dark:text-slate-400" />}
                  </div>
                </button>

                {isOmSheetOpen && (
                  <div className="p-2 space-y-1.5">
                    {omSheetItems.map((item) => {
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectNav(item.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            isActive
                              ? 'bg-[#ffedd5] dark:bg-amber-500/20 border-[#fdba74] dark:border-amber-500/40 text-black dark:text-amber-100 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-black dark:text-slate-300 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                              isActive
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-sm border border-amber-400/60'
                                : 'bg-slate-200 dark:bg-slate-950 text-slate-500 dark:text-slate-400'
                            }`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs truncate ${
                                isActive ? 'text-black dark:text-amber-100 font-extrabold opacity-100' : 'text-black dark:text-white font-bold'
                              }`}>
                                {item.label}
                              </div>
                              <div className={`text-[10px] truncate ${
                                isActive ? 'text-black dark:text-amber-300 font-semibold opacity-100' : 'text-black dark:text-slate-400 font-medium'
                              }`}>
                                {item.description}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-black dark:text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Group 3: Divisi Finance & Accounting */}
            {financeSheetItems.length > 0 && (
              <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsFinanceSheetOpen(!isFinanceSheetOpen)}
                  className="w-full flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border-b border-slate-200 dark:border-slate-800/80 text-left cursor-pointer hover:bg-[#fff7ed] active:bg-[#fff7ed]"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-black dark:text-white">Divisi Finance & Accounting</div>
                      <div className="text-[10px] text-black dark:text-slate-400 font-medium">Kas COA, Rekening Koran & Laporan SAK</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-black dark:text-slate-400">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                      {financeSheetItems.length} Submenu
                    </span>
                    {isFinanceSheetOpen ? <ChevronDown className="w-4 h-4 text-black dark:text-slate-400" /> : <ChevronRight className="w-4 h-4 text-black dark:text-slate-400" />}
                  </div>
                </button>

                {isFinanceSheetOpen && (
                  <div className="p-2 space-y-1.5">
                    {financeSheetItems.map((item) => {
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectNav(item.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            isActive
                              ? 'bg-[#ffedd5] dark:bg-amber-500/20 border-[#fdba74] dark:border-amber-500/40 text-black dark:text-amber-100 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-black dark:text-slate-300 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                              isActive
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-sm border border-amber-400/60'
                                : 'bg-slate-200 dark:bg-slate-950 text-slate-500 dark:text-slate-400'
                            }`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs truncate ${
                                isActive ? 'text-black dark:text-amber-100 font-extrabold opacity-100' : 'text-black dark:text-white font-bold'
                              }`}>
                                {item.label}
                              </div>
                              <div className={`text-[10px] truncate ${
                                isActive ? 'text-black dark:text-amber-300 font-semibold opacity-100' : 'text-black dark:text-slate-400 font-medium'
                              }`}>
                                {item.description}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-black dark:text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Remaining items */}
            {otherSheetItems.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-black dark:text-slate-400 uppercase tracking-wider px-1">
                  Menu Lainnya
                </span>
                {otherSheetItems.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectNav(item.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#ffedd5] dark:bg-amber-500/20 border-[#fdba74] dark:border-amber-500/40 text-black dark:text-amber-100 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-black dark:text-slate-200 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-xl border shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-sm border border-amber-400/60'
                            : 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                        }`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs truncate ${
                            isActive ? 'text-black dark:text-amber-100 font-extrabold opacity-100' : 'text-black dark:text-white font-bold'
                          }`}>
                            {item.label}
                          </div>
                          <div className={`text-[11px] truncate ${
                            isActive ? 'text-black dark:text-amber-300 font-semibold opacity-100' : 'text-black dark:text-slate-400 font-medium'
                          }`}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        {item.badge !== undefined && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-black dark:text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Theme Selector for Mobile */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-black dark:text-slate-300">Tema Tampilan</span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase">
                  {resolvedTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => themeService.setTheme('dark')}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    themePref === 'dark'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Gelap</span>
                </button>
                <button
                  type="button"
                  onClick={() => themeService.setTheme('light')}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    themePref === 'light'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Terang</span>
                </button>
                <button
                  type="button"
                  onClick={() => themeService.setTheme('system')}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    themePref === 'system'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Otomatis</span>
                </button>
              </div>
            </div>

            {/* Logout and Reset Action */}
            <div className="pt-1 space-y-2">
              {onLogout && (
                <button
                  id="mobile-sheet-logout-btn"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-300 dark:border-rose-500/30 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              )}

              {onResetData && (
                <button
                  id="mobile-sheet-reset-btn"
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin mengosongkan seluruh data operasional sistem (0 Proyek, 0 Karyawan, 0 Stok, 0 Keuangan)?')) {
                      onResetData();
                      setIsMoreMenuOpen(false);
                    }
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Kosongkan Data Sistem</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

