import React, { useMemo, useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck2,
  Package,
  KanbanSquare,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  Megaphone,
  CreditCard,
  Building,
  Wallet,
  Landmark,
  Banknote,
  Pencil,
  PlusCircle,
  RotateCcw,
  FileText,
  Coins,
  ArrowUpRight,
  BellRing,
  FileCheck2,
  SlidersHorizontal
} from 'lucide-react';
import {
  Project,
  Employee,
  TimesheetMonthRecord,
  ProjectStock,
  InventoryItem,
  CleaningTask,
  BlastAnnouncement,
  AppView,
  UserRole,
  CompanyProfile,
  ChartOfAccount,
  FinanceTransaction,
  UserAccount,
  MaterialRequest,
  DashboardWidgetsState
} from '../../types';
import { formatCurrency, formatNumber, getMonthName } from '../../utils/formatters';
import { ComparativeCharts } from './ComparativeCharts';
import { storageService, TimesheetCutoffSettings } from '../../services/storageService';
import { calculatePayrollSummary } from '../../utils/payrollCalculator';
import { UpdateBalanceModal } from './UpdateBalanceModal';
import { DashboardWidgetModal } from './DashboardWidgetModal';

interface DashboardOverviewProps {
  projects: Project[];
  employees: Employee[];
  timesheets: TimesheetMonthRecord[];
  projectStocks: ProjectStock[];
  inventoryItems: InventoryItem[];
  tasks: CleaningTask[];
  blasts: BlastAnnouncement[];
  selectedProjectId: string;
  onNavigate: (view: AppView) => void;
  userRole: UserRole;
  accounts?: ChartOfAccount[];
  onUpdateAccounts?: (updated: ChartOfAccount[]) => void;
  onAddFinanceTransaction?: (trx: FinanceTransaction) => void;
  currentUser?: UserAccount | null;
  materialRequests?: MaterialRequest[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  projects = [],
  employees = [],
  timesheets: propTimesheets = [],
  projectStocks = [],
  inventoryItems = [],
  tasks = [],
  blasts = [],
  selectedProjectId = 'ALL',
  onNavigate,
  userRole,
  accounts: propAccounts,
  onUpdateAccounts,
  onAddFinanceTransaction,
  currentUser,
  materialRequests: propMaterialRequests
}) => {
  const currentMonth = 8; // August 2026
  const currentYear = 2026;
  const todayDateNumber = 25; // August 25

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => storageService.getCompanyProfile());
  const [internalAccounts, setInternalAccounts] = useState<ChartOfAccount[]>(() =>
    propAccounts && propAccounts.length > 0 ? propAccounts : storageService.getChartOfAccounts()
  );

  // Real-time synchronization dengan Rekap Laporan & Payroll Slip Center
  const [cutoffSettings, setCutoffSettings] = useState<TimesheetCutoffSettings>(() =>
    storageService.getTimesheetCutoffSettings()
  );
  const [internalTimesheets, setInternalTimesheets] = useState<TimesheetMonthRecord[]>(() =>
    propTimesheets && propTimesheets.length > 0 ? propTimesheets : storageService.getTimesheets()
  );

  useEffect(() => {
    if (propTimesheets && propTimesheets.length > 0) {
      setInternalTimesheets(propTimesheets);
    }
  }, [propTimesheets]);

  const activeTimesheets = propTimesheets && propTimesheets.length > 0 ? propTimesheets : internalTimesheets;

  // Directly derive active accounts: prefer props if provided, otherwise fallback to internal state
  const activeAccounts = propAccounts && propAccounts.length > 0 ? propAccounts : internalAccounts;

  // Update Balance Modal State
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState<boolean>(false);
  const [selectedAccCodeForModal, setSelectedAccCodeForModal] = useState<string>('1120');

  // Dashboard Widget Customization Modal & State
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState<boolean>(false);
  const [widgetSettings, setWidgetSettings] = useState<DashboardWidgetsState>(() =>
    storageService.getDashboardWidgets()
  );

  useEffect(() => {
    const handleProfileUpdate = () => {
      setCompanyProfile(storageService.getCompanyProfile());
    };
    const handleCoaUpdate = () => {
      setInternalAccounts(storageService.getChartOfAccounts());
    };
    const handleWidgetsUpdate = (e: any) => {
      if (e.detail) {
        setWidgetSettings(e.detail);
      } else {
        setWidgetSettings(storageService.getDashboardWidgets());
      }
    };
    const handleCutoffUpdate = (e?: any) => {
      const s = e?.detail || storageService.getTimesheetCutoffSettings();
      if (s) {
        setCutoffSettings({ ...s });
      }
    };
    const handleTimesheetsUpdate = (e?: any) => {
      if (!e || e.detail?.key === 'timesheets' || e.type === 'rajawali_timesheets_updated' || e.type === 'app_data_reset') {
        const fresh = storageService.getTimesheets();
        setInternalTimesheets(fresh);
      }
    };

    window.addEventListener('company_profile_updated', handleProfileUpdate);
    window.addEventListener('chart_of_accounts_updated', handleCoaUpdate);
    window.addEventListener('dashboard_widgets_updated', handleWidgetsUpdate as EventListener);
    window.addEventListener('timesheet_cutoff_updated', handleCutoffUpdate);
    window.addEventListener('rajawali_data_synced', handleTimesheetsUpdate);
    window.addEventListener('rajawali_timesheets_updated', handleTimesheetsUpdate);
    window.addEventListener('app_data_reset', handleTimesheetsUpdate);
    window.addEventListener('app_data_reset', handleCutoffUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('storage', handleCoaUpdate);
    window.addEventListener('storage', handleWidgetsUpdate as EventListener);
    window.addEventListener('storage', handleCutoffUpdate);
    window.addEventListener('storage', handleTimesheetsUpdate);
    return () => {
      window.removeEventListener('company_profile_updated', handleProfileUpdate);
      window.removeEventListener('chart_of_accounts_updated', handleCoaUpdate);
      window.removeEventListener('dashboard_widgets_updated', handleWidgetsUpdate as EventListener);
      window.removeEventListener('timesheet_cutoff_updated', handleCutoffUpdate);
      window.removeEventListener('rajawali_data_synced', handleTimesheetsUpdate);
      window.removeEventListener('rajawali_timesheets_updated', handleTimesheetsUpdate);
      window.removeEventListener('app_data_reset', handleTimesheetsUpdate);
      window.removeEventListener('app_data_reset', handleCutoffUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('storage', handleCoaUpdate);
      window.removeEventListener('storage', handleWidgetsUpdate as EventListener);
      window.removeEventListener('storage', handleCutoffUpdate);
      window.removeEventListener('storage', handleTimesheetsUpdate);
    };
  }, []);

  const handleSaveWidgets = (updated: DashboardWidgetsState) => {
    setWidgetSettings(updated);
    storageService.saveDashboardWidgets(updated);
  };

  const handleResetWidgets = () => {
    const reset = storageService.resetDashboardWidgets();
    setWidgetSettings(reset);
  };

  // Filter accounts for Kas & Bank (Rekening Pemasukan & Likuiditas)
  const cashAndBankAccounts = useMemo(() => {
    return activeAccounts.filter((acc) => acc.category === 'Kas & Bank' && acc.isActive);
  }, [activeAccounts]);

  // Total Liquid Cash & Bank Balance
  const totalLiquidBalance = useMemo(() => {
    return cashAndBankAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  }, [cashAndBankAccounts]);

  const handleOpenBalanceModal = (accountCode?: string) => {
    if (accountCode) {
      setSelectedAccCodeForModal(accountCode);
    } else {
      setSelectedAccCodeForModal(cashAndBankAccounts[0]?.code || '1120');
    }
    setIsBalanceModalOpen(true);
  };

  const handleAccountsUpdated = (updated: ChartOfAccount[]) => {
    setInternalAccounts(updated);
    if (onUpdateAccounts) {
      onUpdateAccounts(updated);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (e.status === 'Resign') return false;
      if (selectedProjectId !== 'ALL' && e.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [employees, selectedProjectId]);

  // Today's attendance stats
  const todayAttendance = useMemo(() => {
    let present = 0;
    let alpa = 0;
    let izin = 0;
    let off = 0;
    let unrecorded = 0;

    filteredEmployees.forEach((emp) => {
      const rec = activeTimesheets.find(
        (ts) =>
          ts.employeeId === emp.id &&
          ts.month === currentMonth &&
          ts.year === currentYear
      );
      const st = rec?.days[todayDateNumber] || '';
      if (st === 'H') present++;
      else if (st === 'A') alpa++;
      else if (st === 'I') izin++;
      else if (st === 'O') off++;
      else unrecorded++;
    });

    const total = filteredEmployees.length || 1;
    const rate = Math.round((present / total) * 100);

    return { present, alpa, izin, off, unrecorded, rate };
  }, [filteredEmployees, activeTimesheets]);

  // Critical stock items in projectStocks
  const criticalStockList = useMemo(() => {
    const list: Array<{
      stock: ProjectStock;
      item: InventoryItem;
      project: Project | undefined;
    }> = [];

    projectStocks.forEach((ps) => {
      if (selectedProjectId !== 'ALL' && ps.projectId !== selectedProjectId) return;
      const item = inventoryItems.find((i) => i.id === ps.itemId);
      const minStock = item ? item.minStock : 2;
      if (ps.currentStock <= minStock) {
        list.push({
          stock: ps,
          item: item || {
            id: ps.itemId,
            code: 'LOC-ITEM',
            name: (ps as any).itemName || 'Barang Lokasi',
            category: 'Chemical',
            unit: 'Unit',
            minStock: 2,
            description: '',
            unitPrice: 0
          },
          project: projects.find((p) => p.id === ps.projectId)
        });
      }
    });

    return list;
  }, [projectStocks, inventoryItems, selectedProjectId, projects]);

  // Pending Material Requests
  const effectiveMaterialRequests = useMemo(() => {
    return propMaterialRequests && propMaterialRequests.length > 0
      ? propMaterialRequests
      : storageService.getMaterialRequests();
  }, [propMaterialRequests]);

  const pendingMaterialRequests = useMemo(() => {
    return effectiveMaterialRequests.filter((mr) => {
      if (mr.status !== 'PENDING') return false;
      if (selectedProjectId !== 'ALL' && mr.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [effectiveMaterialRequests, selectedProjectId]);

  // Backward compatibility count
  const criticalStocks = criticalStockList;

  // Total payroll estimation calculated in real-time identical to Rekap Laporan & Payroll Slip Center
  const payrollSummary = useMemo(() => {
    return calculatePayrollSummary(
      employees,
      activeTimesheets,
      cutoffSettings,
      selectedProjectId
    );
  }, [employees, activeTimesheets, cutoffSettings, selectedProjectId]);

  const totalPayrollEst = payrollSummary.totalPayroll;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProjectId !== 'ALL' && t.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [tasks, selectedProjectId]);

  const activeProjectObj = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-5">
      {/* Top Banner (Widget: banner) */}
      {widgetSettings.banner ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-amber-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              {companyProfile.logoUrl ? (
                <img
                  src={companyProfile.logoUrl}
                  alt={companyProfile.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-contain bg-slate-50 p-1.5 border border-slate-200 shadow-sm shrink-0 mt-0.5 sm:mt-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-sm shrink-0 mt-0.5 sm:mt-0">
                  {companyProfile.name?.charAt(0) || 'R'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start sm:items-center space-x-1.5 text-amber-700 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
                  <span className="break-words leading-tight">{companyProfile.tagline || 'Command Center Outsourcing Cleaning Service'}</span>
                </div>
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-950 tracking-tight leading-snug sm:leading-tight break-words">
                  {companyProfile.name} Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-slate-800 font-semibold sm:font-bold mt-1.5 max-w-3xl leading-relaxed break-words">
                  {selectedProjectId === 'ALL'
                    ? `Pengawasan terpusat ${projects.length} Lokasi Proyek • ${filteredEmployees.length} Petugas Kebersihan Aktif • Cut-off ${getMonthName(currentMonth)} ${currentYear}`
                    : `Lokasi: ${activeProjectObj?.name} (${activeProjectObj?.address}) • Spv: ${activeProjectObj?.siteSupervisor}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 w-full md:w-auto">
              <button
                id="dash-custom-widgets-btn"
                onClick={() => setIsWidgetModalOpen(true)}
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all cursor-pointer"
                title="Atur modul dan widget yang tampil di Dashboard"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-800 shrink-0" />
                <span className="whitespace-nowrap">Atur Widget</span>
              </button>

              <button
                id="dash-quick-project-settings-btn"
                onClick={() => onNavigate('project_settings')}
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-slate-800 shrink-0" />
                <span className="whitespace-nowrap">Spesifikasi Lokasi</span>
              </button>

              <button
                id="dash-quick-timesheet-btn"
                onClick={() => onNavigate('timesheet')}
                className="col-span-2 sm:col-span-1 flex items-center justify-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <CalendarCheck2 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Buka Timesheet</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Minimalist header bar when banner is hidden, preserving access to widget customizer */
        <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm">
          <div className="flex items-center space-x-2 text-xs text-slate-800">
            <span className="font-extrabold text-slate-950">{companyProfile.name}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-700 font-semibold">
              {selectedProjectId === 'ALL' ? 'Semua Lokasi' : activeProjectObj?.name}
            </span>
          </div>
          <button
            id="dash-custom-widgets-compact-btn"
            onClick={() => setIsWidgetModalOpen(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-800" />
            <span>Atur Widget</span>
          </button>
        </div>
      )}

      {/* Real-time Notifications & Critical Alerts (Widget: critical_alerts) */}
      {widgetSettings.critical_alerts && (criticalStockList.length > 0 || pendingMaterialRequests.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span>Pusat Notifikasi & Peringatan Real-Time Operasional</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {criticalStockList.length} Stok Kritis • {pendingMaterialRequests.length} Permintaan Butuh Approval
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Critical Stock Alert Card */}
            {criticalStockList.length > 0 ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg border border-rose-200">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black text-rose-950">
                        Peringatan Stok Level Kritis ({criticalStockList.length} Item)
                      </h4>
                    </div>
                    <span className="text-[10px] uppercase font-black bg-rose-200/80 text-rose-900 px-2.5 py-0.5 rounded-full border border-rose-300">
                      Restock Diperlukan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-800 font-medium">
                    Stok barang berikut telah mencapai atau berada di bawah batas minimum aman operasional:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {criticalStockList.slice(0, 4).map(({ stock, item, project }) => (
                      <span
                        key={stock.id}
                        className="inline-flex items-center space-x-1.5 bg-white border border-rose-200 text-slate-900 text-[11px] px-2.5 py-1 rounded-lg shadow-2xs font-semibold"
                      >
                        <b className="text-rose-700 font-bold">{item.name}</b>
                        <span className="text-slate-600 font-mono text-[10px]">({stock.currentStock}/{item.minStock} {item.unit})</span>
                        {project && (
                          <span className="text-slate-800 text-[10px] font-bold">• {project.name}</span>
                        )}
                      </span>
                    ))}
                    {criticalStockList.length > 4 && (
                      <span className="text-[11px] text-slate-700 self-center font-bold">
                        +{criticalStockList.length - 4} barang lainnya
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-semibold">Peringatan otomatis berdasar stok fisik lokasi</span>
                  <button
                    id="dash-review-critical-stock-btn"
                    onClick={() => onNavigate('inventory')}
                    className="flex items-center space-x-1.5 text-xs font-bold text-rose-800 hover:text-white bg-rose-100 hover:bg-rose-600 px-3 py-1.5 rounded-lg border border-rose-300 transition cursor-pointer"
                  >
                    <span>Periksa Stok di Lokasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 text-xs text-slate-700 font-medium shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Seluruh stok barang di lokasi dalam kondisi aman dan memenuhi batas minimum.</span>
              </div>
            )}

            {/* Pending Material Request Alert Card */}
            {pendingMaterialRequests.length > 0 ? (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black text-amber-950">
                        Permintaan Material Menunggu Approval ({pendingMaterialRequests.length} Pengajuan)
                      </h4>
                    </div>
                    <span className="text-[10px] uppercase font-black bg-amber-200/80 text-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300">
                      Perlu Disetujui
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-800 font-medium">
                    Terdapat permintaan material dan kebutuhan chemical dari supervisor site yang belum disetujui:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pendingMaterialRequests.slice(0, 3).map((mr) => (
                      <span
                        key={mr.id}
                        className="inline-flex items-center space-x-1.5 bg-white border border-amber-200 text-slate-900 text-[11px] px-2.5 py-1 rounded-lg shadow-2xs font-semibold"
                      >
                        <b className="text-slate-950 font-mono text-[10px] font-bold">{mr.requestNumber}</b>
                        <span className="text-slate-900 font-bold">{mr.projectName}</span>
                        <span className="text-slate-600 text-[10px]">({mr.items.length} item)</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                          mr.priority === 'Kritis' ? 'bg-rose-100 text-rose-800 border border-rose-200' : mr.priority === 'Urgent' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {mr.priority}
                        </span>
                      </span>
                    ))}
                    {pendingMaterialRequests.length > 3 && (
                      <span className="text-[11px] text-slate-700 self-center font-bold">
                        +{pendingMaterialRequests.length - 3} permintaan lainnya
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-semibold">Pengajuan dari SPV Site via Form Material Request</span>
                  <button
                    id="dash-review-material-requests-btn"
                    onClick={() => onNavigate('inventory')}
                    className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 hover:text-white bg-amber-100 hover:bg-amber-600 px-3 py-1.5 rounded-lg border border-amber-300 transition cursor-pointer"
                  >
                    <span>Proses Approval Material</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 text-xs text-slate-700 font-medium shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Tidak ada permintaan material yang tertunda (seluruh pengajuan telah diproses).</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      {(widgetSettings.stat_employees || widgetSettings.stat_attendance || widgetSettings.stat_inventory || widgetSettings.stat_payroll) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Personil */}
          {widgetSettings.stat_employees && (
            <div
              onClick={() => onNavigate('employees')}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
                <span>Personil Aktif</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-950 mt-2">
                {filteredEmployees.length}{' '}
                <span className="text-xs font-bold text-slate-500">Cleaner</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Shift Terbagi 4 Waktu</span>
                <span className="text-blue-600 font-bold flex items-center space-x-0.5">
                  <span>Detail</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}

          {/* Kehadiran Hari Ini */}
          {widgetSettings.stat_attendance && (
            <div
              onClick={() => onNavigate('timesheet')}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
                <span>Kehadiran Hari Ini (Tgl {todayDateNumber})</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {todayAttendance.rate}%{' '}
                <span className="text-xs font-bold text-slate-500">
                  ({todayAttendance.present}/{filteredEmployees.length} Hadir)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>
                  Alpa: <b className="text-rose-700 font-black">{todayAttendance.alpa}</b> • Izin:{' '}
                  <b className="text-slate-950 font-black">{todayAttendance.izin}</b>
                </span>
                <span className="text-emerald-700 font-bold flex items-center space-x-0.5">
                  <span>Ceklis</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}

          {/* Stok Kritis Alert */}
          {widgetSettings.stat_inventory && (
            <div
              onClick={() => onNavigate('inventory')}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
                <span>Stok Chemical & Alat</span>
                <div
                  className={`p-2 rounded-xl transition-colors ${
                    criticalStocks.length > 0
                      ? 'bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-950 mt-2">
                {criticalStocks.length > 0 ? (
                  <span className="text-rose-700">{criticalStocks.length} Kritis</span>
                ) : (
                  <span className="text-emerald-700">Aman</span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>{inventoryItems.length} Master Item</span>
                <span className="text-slate-800 font-bold flex items-center space-x-0.5">
                  <span>Kelola</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}

          {/* Estimasi Payroll (Periode) - Real-time sync dengan Rekap Laporan & Payroll Slip Center */}
          {widgetSettings.stat_payroll && (
            <div
              onClick={() => onNavigate('reports')}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-sm transition-all cursor-pointer group"
              title="Klik untuk membuka Rekap Laporan & Payroll Slip Center"
            >
              <div className="flex items-center justify-between text-slate-600 text-xs font-bold gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="truncate">Estimasi Payroll (Periode)</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    {payrollSummary.isCutoffMode ? 'Cut-Off' : 'Kalender'}
                  </span>
                </div>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1 truncate" title={payrollSummary.periodLabel}>
                Periode: <strong className="text-slate-800 font-bold">{payrollSummary.periodLabelShort}</strong> ({payrollSummary.activePeriodDays.length} Hari)
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-950 mt-1.5 break-words">
                {formatCurrency(payrollSummary.totalPayroll)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span className="truncate">{payrollSummary.personnelCount} Personil Penerima</span>
                <span className="text-blue-600 font-bold flex items-center space-x-0.5 shrink-0 group-hover:text-blue-700">
                  <span>Payroll Slip</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PUSAT SALDO REKENING PEMASUKAN & KAS/BANK (LIQUIDITY MANAGEMENT CENTER - Widget: liquidity_accounts) */}
      {widgetSettings.liquidity_accounts && (
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-slate-950 text-base sm:text-lg">Saldo Rekening Pemasukan & Kas/Bank</h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Real-time COA
                </span>
              </div>
              <p className="text-xs text-slate-800 font-bold mt-0.5">
                Pusat kontrol likuiditas kas operasional, rekening bank penerimaan klien & payroll
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="dash-update-balance-main-btn"
              onClick={() => handleOpenBalanceModal()}
              className="flex items-center space-x-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Update Saldo</span>
            </button>

            <button
              id="dash-quick-income-trx-btn"
              onClick={() => {
                setSelectedAccCodeForModal('1120');
                setIsBalanceModalOpen(true);
              }}
              className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Setoran Pemasukan</span>
            </button>

            <button
              id="dash-view-finance-btn"
              onClick={() => onNavigate('finance')}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-700" />
              <span>Buku Kas</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Liquidity & Individual Accounts Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {cashAndBankAccounts.map((acc) => {
            const isBca = acc.code === '1120';
            const isMandiri = acc.code === '1121';
            const isBni = acc.code === '1122';
            const isKasBesar = acc.code === '1110';
            const isKasKecil = acc.code === '1130';

            const badgeColor = isBca
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isMandiri
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : isBni
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : isKasBesar
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-purple-50 text-purple-700 border-purple-200';

            return (
              <div
                key={acc.code}
                className="bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-2xl transition-all flex flex-col justify-between group shadow-sm hover:shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {acc.code}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold truncate">
                      {isBca ? 'Penerimaan Klien' : isMandiri ? 'Payroll & Vendor' : isBni ? 'Giro Operasional' : isKasBesar ? 'Kas Brankas' : 'Kas Lapangan'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-950 text-xs line-clamp-1">
                    {acc.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium line-clamp-1 mt-0.5">
                    {acc.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Saldo Terkini</div>
                    <div className="font-mono font-black text-sm text-slate-950">
                      {formatCurrency(acc.currentBalance || 0)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenBalanceModal(acc.code)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 rounded-lg transition-colors cursor-pointer"
                    title={`Ubah saldo ${acc.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Total Liquidity Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
          <div className="flex items-center space-x-2 text-slate-900">
            <Coins className="w-4 h-4 text-slate-800 shrink-0" />
            <span className="font-bold text-slate-900 text-xs sm:text-sm">
              Total Dana Kas & Bank Siap Pakai ({cashAndBankAccounts.length} Rekening Pemasukan):
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-base sm:text-lg font-black text-slate-950 font-mono tracking-tight">
              {formatCurrency(totalLiquidBalance)}
            </span>
            <button
              onClick={() => handleOpenBalanceModal()}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Sinkronkan Saldo ➔
            </button>
          </div>
        </div>
      </div>
      )}

      {/* EXECUTIVE COMPARATIVE ANALYTICS (Payroll MoM & Manpower Quota vs Actual) */}
      {(widgetSettings.comparative_payroll || widgetSettings.comparative_manpower) && (
        <ComparativeCharts
          projects={projects}
          employees={employees}
          timesheets={activeTimesheets}
          currentMonth={currentMonth}
          currentYear={currentYear}
          selectedProjectId={selectedProjectId}
          showPayrollChart={widgetSettings.comparative_payroll}
          showManpowerChart={widgetSettings.comparative_manpower}
        />
      )}

      {/* Main Grid: Live Tasks & Latest Blasts (Widgets: tasks_board & blasts_announcements) */}
      {(widgetSettings.tasks_board || widgetSettings.blasts_announcements) && (
        <div className={`grid grid-cols-1 ${widgetSettings.tasks_board && widgetSettings.blasts_announcements ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-5`}>
          {/* Cleaning Tasks Progress */}
          {widgetSettings.tasks_board && (
            <div className={`${widgetSettings.blasts_announcements ? 'lg:col-span-2' : 'col-span-1'} bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <KanbanSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 text-sm">Monitoring Area Kebersihan (Rajawali Boards)</h3>
                    <p className="text-xs text-slate-600">Status pengerjaan checklist zona publik dan sanitasi</p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold"
                >
                  Lihat Board Penuh ➔
                </button>
              </div>

              <div className="space-y-2.5">
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center text-slate-600 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4">
                    Belum ada tugas kebersihan harian yang dibuat. Klik menu "Rajawali Boards" untuk menambahkan tugas baru.
                  </div>
                ) : (
                  filteredTasks.slice(0, 4).map((task) => {
                    const doneCount = task.checklist.filter((c) => c.done).length;
                    const totalCount = task.checklist.length;
                    const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                    return (
                      <div
                        key={task.id}
                        className="bg-slate-50 border border-slate-200 hover:border-slate-300 p-3.5 rounded-xl transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-950 text-xs">{task.areaName}</h4>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-600 mt-0.5">
                              <span className="text-slate-800 font-medium">Petugas: {task.assignedEmployees.join(', ')}</span>
                              <span>•</span>
                              <span className="text-slate-500 font-semibold">{task.shift}</span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              task.status === 'done'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : task.status === 'review'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : task.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {task.status === 'done'
                              ? 'Selesai'
                              : task.status === 'review'
                              ? 'Audit QC'
                              : task.status === 'in_progress'
                              ? 'Sedang Dikerjakan'
                              : 'Jadwal'}
                          </span>
                        </div>

                        {/* Checklist progress bar */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-600 mb-1 font-medium">
                            <span>Checklist Pengerjaan ({doneCount}/{totalCount} item)</span>
                            <span className="font-bold text-slate-900">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Announcements (1 col) */}
          {widgetSettings.blasts_announcements && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950 text-sm">Eagle Blast Pusat</h3>
                      <p className="text-xs text-slate-600">Instruksi & kebijakan manajemen</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {blasts.slice(0, 3).map((blast) => (
                    <div
                      key={blast.id}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            blast.category === 'PENTING'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {blast.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">{blast.date}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{blast.title}</h4>
                      <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">{blast.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigate('blast')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors"
              >
                Buka Semua Pengumuman ➔
              </button>
            </div>
          )}
        </div>
      )}

      {/* Update Balance Modal */}
      <UpdateBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        accounts={activeAccounts}
        onUpdateAccounts={handleAccountsUpdated}
        onAddFinanceTransaction={onAddFinanceTransaction}
        initialSelectedAccountCode={selectedAccCodeForModal}
        userRole={userRole}
        userName={currentUser?.name || 'Admin'}
      />

      {/* Dashboard Widget Customization Modal */}
      <DashboardWidgetModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        widgets={widgetSettings}
        onSave={handleSaveWidgets}
        onReset={handleResetWidgets}
      />
    </div>
  );
};
