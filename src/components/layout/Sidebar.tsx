import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck2,
  Users,
  Package,
  KanbanSquare,
  Megaphone,
  BookOpen,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  X,
  RotateCcw,
  Lock,
  Cloud,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Layers,
  DollarSign,
  Wallet,
  Receipt,
  FileCheck,
  PieChart,
  Scale,
  ArrowDownUp,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Trash2,
  Send,
  FileText
} from 'lucide-react';
import { AppView, UserAccount } from '../../types';

interface SidebarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  onResetData?: () => void;
  currentUser?: UserAccount;
  lowStockCount?: number;
  activeTasksCount?: number;
  unreadBlastCount?: number;
  onOpenDriveSync?: () => void;
}

interface MenuItemConfig {
  id: AppView;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpen,
  onCloseMobile,
  onResetData,
  currentUser,
  lowStockCount = 0,
  activeTasksCount = 0,
  unreadBlastCount = 0,
  onOpenDriveSync
}) => {
  // Strict allowed views check: Super Admin gets full access; other users strictly get only selected menus
  const isViewAllowed = (viewId: AppView) => {
    if (currentUser?.role === 'Super Admin (HQ)') {
      return true;
    }
    const allowed = currentUser?.allowedViews ?? [];
    if (viewId === 'sops' || viewId === 'sop') {
      return allowed.includes('sops') || allowed.includes('sop' as any);
    }
    return allowed.includes(viewId);
  };

  // HRM submenus
  const hrmMenuItems: MenuItemConfig[] = [
    {
      id: 'timesheet',
      label: 'Eagle Timesheet',
      description: 'Matriks Kehadiran 1-31 Hari',
      icon: <CalendarCheck2 className="w-4 h-4" />,
      badge: 31,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    },
    {
      id: 'employees',
      label: 'Data Karyawan & Lokasi',
      description: 'Penempatan & Riwayat Mutasi',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'sops',
      label: 'SOP & Dokumen K3',
      description: 'Standar Pembersihan & MSDS',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      id: 'reports',
      label: 'Pusat Laporan & Payroll',
      description: 'Ekspor Excel & Slip Gaji',
      icon: <FileSpreadsheet className="w-4 h-4" />
    }
  ];

  // OM submenus
  const omMenuItems: MenuItemConfig[] = [
    {
      id: 'project_settings',
      label: 'Pengaturan Lokasi',
      description: 'Spesifikasi Gedung & Lantai',
      icon: <Building2 className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'inventory',
      label: 'Smart Inventory',
      description: 'Update Stok & Chemical Kritis',
      icon: <Package className="w-4 h-4" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
    },
    {
      id: 'tasks',
      label: 'Rajawali Boards',
      description: 'Papan Monitoring Kebersihan',
      icon: <KanbanSquare className="w-4 h-4" />,
      badge: activeTasksCount > 0 ? activeTasksCount : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    }
  ];

  // Finance & Accounting Submenus
  const financeMenuItems: MenuItemConfig[] = [
    {
      id: 'finance_client_contracts_invoices',
      label: 'Kontrak & Invoice Klien',
      description: 'Kontrak, Invoice, Pajak & Margin',
      icon: <FileText className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'finance_cash_journal',
      label: 'Buku Kas & Jurnal Umum',
      description: 'Uang Masuk/Keluar COA & Ledger',
      icon: <Wallet className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'finance_debts_receivables',
      label: 'Pencatatan Hutang & Piutang',
      description: 'Hutang Vendor, Piutang Klien & Aging',
      icon: <ArrowDownUp className="w-4 h-4 text-rose-400" />
    },
    {
      id: 'finance_investments',
      label: 'Pencatatan Investasi & Bagi Hasil',
      description: '12 Baris Jadwal, Investor & Reminder',
      icon: <Briefcase className="w-4 h-4 text-purple-400" />
    },
    {
      id: 'finance_outflow_forecast',
      label: 'Forecast Rencana Pengeluaran',
      description: 'Gaji Manpower + Hutang + Bagi Hasil',
      icon: <TrendingDown className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'finance_profit_loss',
      label: 'Laba Rugi (Profit & Loss)',
      description: 'Laporan Laba Rugi Komprehensif',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'finance_bank_reconcile',
      label: 'Rekening Koran & Rekonsiliasi',
      description: 'Upload e-Statement & Auto-Match',
      icon: <Receipt className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'finance_statements',
      label: 'Laporan Keuangan (SAK)',
      description: 'Neraca, Arus Kas & Perubahan Modal',
      icon: <Scale className="w-4 h-4 text-blue-400" />
    },
    {
      id: 'finance_analytics_audit',
      label: 'Analisa Biaya & Tutup Buku',
      description: 'Cost Center, Audit Trail & Closing',
      icon: <PieChart className="w-4 h-4 text-purple-400" />
    }
  ];

  const visibleHrmItems = hrmMenuItems.filter((item) => isViewAllowed(item.id));
  const visibleOmItems = omMenuItems.filter((item) => isViewAllowed(item.id));
  const visibleFinanceItems = financeMenuItems.filter((item) => isViewAllowed(item.id));

  const isCurrentInHrm = visibleHrmItems.some(
    (item) => currentView === item.id || (item.id === 'sops' && currentView === 'sop')
  );
  const isCurrentInOm = visibleOmItems.some((item) => currentView === item.id);
  const isCurrentInFinance = visibleFinanceItems.some((item) => currentView === item.id);

  // Accordion state
  const [isHrmOpen, setIsHrmOpen] = useState<boolean>(true);
  const [isOmOpen, setIsOmOpen] = useState<boolean>(true);
  const [isFinanceOpen, setIsFinanceOpen] = useState<boolean>(true);

  // Auto-expand group when user navigates to a submenu inside that group
  useEffect(() => {
    if (isCurrentInHrm) {
      setIsHrmOpen(true);
    }
    if (isCurrentInOm) {
      setIsOmOpen(true);
    }
    if (isCurrentInFinance) {
      setIsFinanceOpen(true);
    }
  }, [currentView, isCurrentInHrm, isCurrentInOm, isCurrentInFinance]);

  // Dashboard item
  const dashboardItem: MenuItemConfig = {
    id: 'dashboard',
    label: 'Dashboard Utama',
    description: 'Ringkasan & KPI Operasional',
    icon: <LayoutDashboard className="w-5 h-5" />
  };

  // Other remaining items
  const otherMenuItems: MenuItemConfig[] = [
    {
      id: 'blast',
      label: 'Eagle Blast',
      description: 'Pengumuman Resmi Manajemen',
      icon: <Megaphone className="w-5 h-5" />,
      badge: unreadBlastCount > 0 ? unreadBlastCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    {
      id: 'company_settings',
      label: 'Pengaturan Perusahaan',
      description: 'Logo, Kop Surat & Profil HQ',
      icon: <Building2 className="w-5 h-5 text-amber-400" />,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    {
      id: 'access_control',
      label: 'Hak Akses Pengguna',
      description: 'Kelola Izin Menu & User',
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    }
  ];

  const visibleOtherItems = otherMenuItems.filter((item) => isViewAllowed(item.id));

  // Count total accessible items
  const totalAccessibleCount =
    (isViewAllowed('dashboard') ? 1 : 0) +
    visibleHrmItems.length +
    visibleOmItems.length +
    visibleFinanceItems.length +
    visibleOtherItems.length;

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        id="app-sidebar"
        className={`fixed lg:sticky top-0 lg:top-14 z-40 lg:z-20 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen lg:h-[calc(100vh-3.5rem)] transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile & Tablet Header Inside Drawer */}
        <div className="p-3 border-b border-slate-200 lg:hidden flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🦅</span>
            <span className="font-extrabold text-slate-900 text-sm">RAJAWALI CYCLE</span>
          </div>
          <button
            id="close-sidebar-mobile-btn"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Info Capsule inside sidebar */}
        {currentUser && (
          <div className="p-3 m-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-base shrink-0">
                {currentUser.avatar || '👤'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-xs truncate">{currentUser.name}</div>
                <div className="text-[10px] text-amber-700 truncate font-semibold">{currentUser.role}</div>
              </div>
            </div>
            {currentUser.isLocationLocked && (
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center space-x-1.5 text-[10px] text-emerald-700 font-medium">
                <Lock className="w-3 h-3 shrink-0" />
                <span className="truncate">Visibilitas Terkunci per Lokasi</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <div className="p-3 space-y-1.5 flex-1">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Menu Sistem</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
              {totalAccessibleCount} Menu
            </span>
          </div>

          {/* 1. Dashboard Utama */}
          {isViewAllowed('dashboard') && (
            <button
              id="sidebar-nav-dashboard"
              onClick={() => {
                onSelectView('dashboard');
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group min-h-[44px] cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-[#ffedd5] text-[#431407] font-extrabold border border-[#fdba74] shadow-xs'
                  : 'text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 border border-transparent hover:text-[#431407]'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    currentView === 'dashboard'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-xs border border-amber-400/60'
                      : 'text-slate-400 group-hover:text-amber-600 group-hover:bg-[#ffedd5]/60'
                  }`}
                >
                  {dashboardItem.icon}
                </div>
                <div className="truncate">
                  <div className={`text-sm font-extrabold leading-tight truncate ${
                    currentView === 'dashboard' ? 'text-black opacity-100' : 'text-slate-900 font-bold'
                  }`}>
                    {dashboardItem.label}
                  </div>
                  <div className={`text-[11px] truncate ${
                    currentView === 'dashboard' ? 'text-[#431407] font-semibold opacity-100' : 'text-slate-500 font-medium'
                  }`}>
                    {dashboardItem.description}
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* 2. Group: Human Resource Management (HRM) */}
          {visibleHrmItems.length > 0 && (
            <div className="space-y-1 pt-1">
              {/* Group Toggle Header */}
              <button
                type="button"
                id="sidebar-group-hrm"
                onClick={() => setIsHrmOpen(!isHrmOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                  isCurrentInHrm
                    ? 'bg-blue-50 text-blue-950 border border-blue-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:text-[#431407] border border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isCurrentInHrm
                        ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30'
                        : 'bg-slate-200 text-blue-700 group-hover:bg-blue-100'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold tracking-tight text-slate-900 flex items-center space-x-1.5">
                      <span>Human Resource Management (HRM)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-medium">
                      Timesheet, Karyawan, SOP & Payroll
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    {visibleHrmItems.length}
                  </span>
                  {isHrmOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform" />
                  )}
                </div>
              </button>

              {/* Sub-menu items for HRM */}
              {isHrmOpen && (
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-blue-400 ml-3.5 space-y-0.5 animate-in fade-in duration-200">
                  {visibleHrmItems.map((item) => {
                    const isActive =
                      currentView === item.id || (item.id === 'sops' && currentView === 'sop');
                    return (
                      <button
                        key={item.id}
                        id={`sidebar-nav-${item.id}`}
                        onClick={() => {
                          onSelectView(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all group min-h-[38px] cursor-pointer ${
                          isActive
                            ? 'bg-[#ffedd5] text-[#431407] font-extrabold border border-[#fdba74] shadow-xs'
                            : 'text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 border border-transparent hover:text-black'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`p-1 rounded-md shrink-0 transition-colors ${
                              isActive
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-xs border border-amber-400/60'
                                : 'text-slate-400 group-hover:text-amber-600 group-hover:bg-[#ffedd5]/60'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="truncate">
                            <div className={`text-xs leading-tight truncate ${
                              isActive ? 'text-black font-extrabold opacity-100' : 'text-slate-900 font-bold'
                            }`}>
                              {item.label}
                            </div>
                            <div className={`text-[10px] truncate ${
                              isActive ? 'text-[#431407] font-semibold opacity-100' : 'text-slate-500 font-medium'
                            }`}>
                              {item.description}
                            </div>
                          </div>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Group: Operations Management (OM) */}
          {visibleOmItems.length > 0 && (
            <div className="space-y-1 pt-1">
              {/* Group Toggle Header */}
              <button
                type="button"
                id="sidebar-group-om"
                onClick={() => setIsOmOpen(!isOmOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                  isCurrentInOm
                    ? 'bg-amber-50 text-amber-950 border border-amber-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:text-[#431407] border border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isCurrentInOm
                        ? 'bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/30'
                        : 'bg-slate-200 text-amber-700 group-hover:bg-amber-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold tracking-tight text-slate-900 flex items-center space-x-1.5">
                      <span>Operations Management (OM)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-medium">
                      Lokasi, Inventory & Monitoring Board
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {visibleOmItems.length}
                  </span>
                  {isOmOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform" />
                  )}
                </div>
              </button>

              {/* Sub-menu items for OM */}
              {isOmOpen && (
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-amber-400 ml-3.5 space-y-0.5 animate-in fade-in duration-200">
                  {visibleOmItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`sidebar-nav-${item.id}`}
                        onClick={() => {
                          onSelectView(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all group min-h-[38px] cursor-pointer ${
                          isActive
                            ? 'bg-[#ffedd5] text-[#431407] font-extrabold border border-[#fdba74] shadow-xs'
                            : 'text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 border border-transparent hover:text-black'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`p-1 rounded-md shrink-0 transition-colors ${
                              isActive
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-xs border border-amber-400/60'
                                : 'text-slate-400 group-hover:text-amber-600 group-hover:bg-[#ffedd5]/60'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="truncate">
                            <div className={`text-xs leading-tight truncate ${
                              isActive ? 'text-black font-extrabold opacity-100' : 'text-slate-900 font-bold'
                            }`}>
                              {item.label}
                            </div>
                            <div className={`text-[10px] truncate ${
                              isActive ? 'text-[#431407] font-semibold opacity-100' : 'text-slate-500 font-medium'
                            }`}>
                              {item.description}
                            </div>
                          </div>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Group: Divisi Finance & Accounting */}
          {visibleFinanceItems.length > 0 && (
            <div className="space-y-1 pt-1">
              {/* Group Toggle Header */}
              <button
                type="button"
                id="sidebar-group-finance"
                onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                  isCurrentInFinance
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:text-[#431407] border border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isCurrentInFinance
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                        : 'bg-slate-200 text-emerald-700 group-hover:bg-emerald-100'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold tracking-tight text-slate-900 flex items-center space-x-1.5">
                      <span>Divisi Finance & Accounting</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-medium">
                      Kas COA, Rekening Koran & Laporan SAK
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {visibleFinanceItems.length}
                  </span>
                  {isFinanceOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform" />
                  )}
                </div>
              </button>

              {/* Sub-menu items for Finance */}
              {isFinanceOpen && (
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-emerald-400 ml-3.5 space-y-0.5 animate-in fade-in duration-200">
                  {visibleFinanceItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`sidebar-nav-${item.id}`}
                        onClick={() => {
                          onSelectView(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all group min-h-[38px] cursor-pointer ${
                          isActive
                            ? 'bg-[#ffedd5] text-[#431407] font-extrabold border border-[#fdba74] shadow-xs'
                            : 'text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 border border-transparent hover:text-black'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`p-1 rounded-md shrink-0 transition-colors ${
                              isActive
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-xs border border-amber-400/60'
                                : 'text-slate-400 group-hover:text-amber-600 group-hover:bg-[#ffedd5]/60'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="truncate">
                            <div className={`text-xs leading-tight truncate ${
                              isActive ? 'text-black font-extrabold opacity-100' : 'text-slate-900 font-bold'
                            }`}>
                              {item.label}
                            </div>
                            <div className={`text-[10px] truncate ${
                              isActive ? 'text-[#431407] font-semibold opacity-100' : 'text-slate-500 font-medium'
                            }`}>
                              {item.description}
                            </div>
                          </div>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Other Remaining Menus (Eagle Blast, Hak Akses Pengguna) */}
          {visibleOtherItems.length > 0 && (
            <div className="space-y-1 pt-1.5 border-t border-slate-200">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Lainnya & Administrasi
              </div>
              {visibleOtherItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => {
                      onSelectView(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group min-h-[44px] cursor-pointer ${
                      isActive
                        ? 'bg-[#ffedd5] text-[#431407] font-extrabold border border-[#fdba74] shadow-xs'
                        : 'text-slate-700 hover:bg-[#fff7ed] active:bg-[#fff7ed] hover:border-orange-200/80 border border-transparent hover:text-black'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 [&>svg]:text-slate-950 [&>svg]:stroke-[2.5px] shadow-xs border border-amber-400/60'
                            : 'text-slate-400 group-hover:text-amber-600 group-hover:bg-[#ffedd5]/60'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="truncate">
                        <div className={`text-sm leading-tight truncate ${
                          isActive ? 'text-black font-extrabold opacity-100' : 'text-slate-900 font-bold'
                        }`}>
                          {item.label}
                        </div>
                        <div className={`text-[11px] truncate ${
                          isActive ? 'text-[#431407] font-semibold opacity-100' : 'text-slate-500 font-medium'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state when no menu is permitted by Super Admin */}
          {totalAccessibleCount === 0 && (
            <div className="p-4 text-center space-y-2.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl my-4 mx-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">Akses Menu Dibatasi</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Super Admin belum memberikan hak akses menu untuk akun Anda. Silakan hubungi Super Admin untuk mengaktifkan menu yang diperlukan.
              </p>
            </div>
          )}
        </div>

        {/* Footer Info Box */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 m-2 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-xs text-amber-700 font-semibold">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Sistem Terintegrasi Lapangan</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Role-Based Access Control aktif. Hak akses dikelola oleh Super Admin HQ.
          </p>

          {onOpenDriveSync && (
            <button
              id="sidebar-gdrive-sync-btn"
              type="button"
              onClick={() => {
                onOpenDriveSync();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 cursor-pointer shadow-xs transition-all group"
            >
              <Cloud className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Google Drive Cloud Sync</span>
            </button>
          )}

          {onResetData && (
            <button
              id="sidebar-reset-btn"
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin mengosongkan seluruh data operasional sistem (0 Proyek, 0 Karyawan, 0 Stok, 0 Keuangan)?')) {
                  onResetData();
                  onCloseMobile();
                }
              }}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-[11px] rounded-lg border border-slate-200 cursor-pointer"
              title="Kosongkan seluruh data operasional sistem"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span>Kosongkan Data Sistem</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

