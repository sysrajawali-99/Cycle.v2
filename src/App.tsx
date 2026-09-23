/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Project,
  Employee,
  TimesheetMonthRecord,
  InventoryItem,
  ProjectStock,
  InventoryLog,
  CleaningTask,
  MutationHistory,
  BlastAnnouncement,
  SopItem,
  SopDocument,
  AppView,
  UserAccount,
  ChartOfAccount,
  FinanceTransaction,
  BankStatementImport,
  PeriodClosing,
  AuditTrailItem,
  CompanyProfile,
  MaterialRequest
} from './types';
import {
  DebtRecord,
  ReceivableRecord,
  InvestmentRecord
} from './types/finance';
import { storageService } from './services/storageService';
import { financeService } from './services/financeService';
import { vpsSyncService } from './services/vpsSyncService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { EagleTimesheet } from './components/timesheet/EagleTimesheet';
import { EmployeeManagement } from './components/employees/EmployeeManagement';
import { SmartInventory } from './components/inventory/SmartInventory';
import { RajawaliBoard } from './components/tasks/RajawaliBoard';
import { EagleBlast } from './components/blast/EagleBlast';
import { SopLibrary } from './components/sop/SopLibrary';
import { ReportingCenter } from './components/reports/ReportingCenter';
import { AccessControl } from './components/access/AccessControl';
import { CompanySettings } from './components/company/CompanySettings';
import { ProjectLocationSettings } from './components/projects/ProjectLocationSettings';
import { LoginPage } from './components/auth/LoginPage';
import { FinanceCashJournal } from './components/finance/FinanceCashJournal';
import { FinanceDebtsReceivables } from './components/finance/FinanceDebtsReceivables';
import { FinanceInvestments } from './components/finance/FinanceInvestments';
import { FinanceOutflowForecast } from './components/finance/FinanceOutflowForecast';
import { FinanceProfitLoss } from './components/finance/FinanceProfitLoss';
import { FinanceBankReconcile } from './components/finance/FinanceBankReconcile';
import { FinanceStatements } from './components/finance/FinanceStatements';
import { FinanceAnalyticsAudit } from './components/finance/FinanceAnalyticsAudit';
import { INITIAL_USERS } from './data/initialData';

export default function App() {
  // Auth & Session State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // App navigation & context state
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Core Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetMonthRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [projectStocks, setProjectStocks] = useState<ProjectStock[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [mutations, setMutations] = useState<MutationHistory[]>([]);
  const [blasts, setBlasts] = useState<BlastAnnouncement[]>([]);
  const [sops, setSops] = useState<SopItem[]>([]);

  // Divisi Finance States
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [bankStatements, setBankStatements] = useState<BankStatementImport[]>([]);
  const [periodClosings, setPeriodClosings] = useState<PeriodClosing[]>([]);
  const [auditTrails, setAuditTrails] = useState<AuditTrailItem[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);

  // Company Profile Master State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => storageService.getCompanyProfile());

  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load all state from storage
  const loadAllData = () => {
    const loadedProjects = storageService.getProjects();
    const loadedUsers = storageService.getUsers();
    const activeUser = storageService.getActiveUser();

    setProjects(loadedProjects);
    setUsers(loadedUsers);
    setEmployees(storageService.getEmployees());
    setTimesheets(storageService.getTimesheets());
    setInventoryItems(storageService.getInventoryItems());
    setProjectStocks(storageService.getProjectStocks());
    setInventoryLogs(storageService.getInventoryLogs());
    setMaterialRequests(storageService.getMaterialRequests());
    setTasks(storageService.getTasks());
    setMutations(storageService.getMutations());
    setBlasts(storageService.getBlasts());
    setSops(storageService.getSops());
    setCompanyProfile(storageService.getCompanyProfile());

    // Finance Data Load
    setAccounts(storageService.getChartOfAccounts());
    setFinanceTransactions(storageService.getFinanceTransactions());
    setBankStatements(storageService.getBankStatements());
    setPeriodClosings(storageService.getPeriodClosings());
    setAuditTrails(storageService.getAuditTrails());
    
    // Load Debts, Receivables, Investments
    setDebts(storageService.getDebts());
    setReceivables(storageService.getReceivables());
    setInvestments(storageService.getInvestments());

    if (activeUser) {
      // Find latest updated version of user from users list
      const matched = loadedUsers.find((u) => u.id === activeUser.id) || activeUser;
      setCurrentUser(matched);

      // Enforce location lock if user is locked
      if (matched.isLocationLocked && matched.assignedProjectId !== 'ALL') {
        setSelectedProjectId(matched.assignedProjectId);
      }
    }

    setIsLoaded(true);
  };

  // Safely fallback selectedProjectId to ALL if selected project no longer exists (only once loaded)
  useEffect(() => {
    if (isLoaded && projects.length > 0 && selectedProjectId !== 'ALL' && !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId('ALL');
    }
  }, [isLoaded, projects, selectedProjectId]);

  // Initial Load from storage & listen to real-time sync / reset events
  useEffect(() => {
    // 1. Immediate local memory load
    loadAllData();
    vpsSyncService.init();

    // 2. Immediately retrieve persistent server database (ensures all data persists across AI Studio and GitHub updates)
    vpsSyncService.autoSyncOnStartup().then((synced) => {
      if (synced) {
        loadAllData();
      }
    });

    let reloadTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleDataReload = (e?: any) => {
      // Ignore local user actions since local state is updated directly by handler
      if (e?.detail?.source === 'user_action') {
        return;
      }
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      reloadTimeout = setTimeout(() => {
        loadAllData();
      }, 50);
    };

    window.addEventListener('app_data_reset', handleDataReload);
    window.addEventListener('rajawali_remote_update', handleDataReload);
    window.addEventListener('rajawali_data_synced', handleDataReload);
    window.addEventListener('rajawali_startup_sync_completed', handleDataReload);
    window.addEventListener('storage', handleDataReload);

    return () => {
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      window.removeEventListener('app_data_reset', handleDataReload);
      window.removeEventListener('rajawali_remote_update', handleDataReload);
      window.removeEventListener('rajawali_data_synced', handleDataReload);
      window.removeEventListener('rajawali_startup_sync_completed', handleDataReload);
      window.removeEventListener('storage', handleDataReload);
    };
  }, []);

  // Update handlers with persistent storage
  const handleUpdateProjects = (updated: Project[]) => {
    setProjects(updated);
    storageService.saveProjects(updated);
  };

  const handleUpdateCompanyProfile = (updated: CompanyProfile) => {
    setCompanyProfile(updated);
    storageService.saveCompanyProfile(updated);
  };

  const handleUpdateEmployees = (updated: Employee[]) => {
    setEmployees(updated);
    storageService.saveEmployees(updated);
  };

  const handleUpdateTimesheets = (updated: TimesheetMonthRecord[]) => {
    setTimesheets(updated);
    storageService.saveTimesheets(updated);
  };

  const handleUpdateStocks = (updated: ProjectStock[]) => {
    setProjectStocks(updated);
    storageService.saveProjectStocks(updated);
  };

  const handleAddInventoryLog = (log: InventoryLog) => {
    setInventoryLogs((prev) => {
      const nextLogs = [log, ...prev];
      storageService.saveInventoryLogs(nextLogs);
      return nextLogs;
    });
  };

  const handleAddMasterItem = (item: InventoryItem) => {
    setInventoryItems((prev) => {
      const nextItems = [...prev, item];
      storageService.saveInventoryItems(nextItems);
      return nextItems;
    });
  };

  const handleUpdateInventoryItems = (updatedItems: InventoryItem[]) => {
    setInventoryItems(updatedItems);
    storageService.saveInventoryItems(updatedItems);
  };

  const handleUpdateMaterialRequests = (updated: MaterialRequest[]) => {
    setMaterialRequests(updated);
    storageService.saveMaterialRequests(updated);
  };

  const handleUpdateTasks = (updated: CleaningTask[]) => {
    setTasks(updated);
    storageService.saveTasks(updated);
  };

  const handleAddMutation = (mutation: MutationHistory) => {
    const nextMutations = [mutation, ...mutations];
    setMutations(nextMutations);
    storageService.saveMutations(nextMutations);
  };

  const handleAddBlast = (blast: BlastAnnouncement) => {
    const nextBlasts = [blast, ...blasts];
    setBlasts(nextBlasts);
    storageService.saveBlasts(nextBlasts);
  };

  const handleUpdateBlasts = (updatedBlasts: BlastAnnouncement[]) => {
    setBlasts(updatedBlasts);
    storageService.saveBlasts(updatedBlasts);
  };

  const handleUpdateSops = (updatedSops: SopDocument[]) => {
    setSops(updatedSops);
    storageService.saveSops(updatedSops);
  };

  // Finance Mutation Handlers
  const handleAddFinanceTransaction = (trx: FinanceTransaction) => {
    const updated = [trx, ...financeTransactions];
    setFinanceTransactions(updated);
    storageService.saveFinanceTransactions(updated);
    const updatedAccs = financeService.recalculateAccountBalances(accounts, updated);
    setAccounts(updatedAccs);
    storageService.saveChartOfAccounts(updatedAccs);
  };

  const handleBatchAddFinanceTransactions = (newTrxs: FinanceTransaction[]) => {
    const updated = [...newTrxs, ...financeTransactions];
    setFinanceTransactions(updated);
    storageService.saveFinanceTransactions(updated);
    const updatedAccs = financeService.recalculateAccountBalances(accounts, updated);
    setAccounts(updatedAccs);
    storageService.saveChartOfAccounts(updatedAccs);
  };

  const handleUpdateFinanceTransaction = (trx: FinanceTransaction) => {
    const updated = financeTransactions.map((t) => (t.id === trx.id ? trx : t));
    setFinanceTransactions(updated);
    storageService.saveFinanceTransactions(updated);
    const updatedAccs = financeService.recalculateAccountBalances(accounts, updated);
    setAccounts(updatedAccs);
    storageService.saveChartOfAccounts(updatedAccs);
  };

  const handleBatchUpdateFinanceTransactions = (updatedTrxs: FinanceTransaction[]) => {
    const updateMap = new Map(updatedTrxs.map((t) => [t.id, t]));
    const updated = financeTransactions.map((t) => (updateMap.has(t.id) ? updateMap.get(t.id)! : t));
    setFinanceTransactions(updated);
    storageService.saveFinanceTransactions(updated);
    const updatedAccs = financeService.recalculateAccountBalances(accounts, updated);
    setAccounts(updatedAccs);
    storageService.saveChartOfAccounts(updatedAccs);
  };

  const handleDeleteFinanceTransaction = (trxId: string) => {
    const updated = financeTransactions.filter((t) => t.id !== trxId);
    setFinanceTransactions(updated);
    storageService.saveFinanceTransactions(updated);
    const updatedAccs = financeService.recalculateAccountBalances(accounts, updated);
    setAccounts(updatedAccs);
    storageService.saveChartOfAccounts(updatedAccs);
  };

  const handleBatchDeleteFinanceTransactions = (trxIds: string[]) => {
    const idSet = new Set(trxIds);
    const updated = financeTransactions.filter((t) => !idSet.has(t.id));
    setFinanceTransactions(updated);
    storageService.saveFinanceTransactions(updated);
    const updatedAccs = financeService.recalculateAccountBalances(accounts, updated);
    setAccounts(updatedAccs);
    storageService.saveChartOfAccounts(updatedAccs);
  };

  const handleAddAccount = (account: ChartOfAccount) => {
    const updated = [...accounts, account];
    setAccounts(updated);
    storageService.saveChartOfAccounts(updated);
  };

  const handleUpdateAccounts = (updatedAccounts: ChartOfAccount[]) => {
    setAccounts(updatedAccounts);
    storageService.saveChartOfAccounts(updatedAccounts);
  };

  const handleUpdateAccount = (account: ChartOfAccount) => {
    const updated = accounts.map((a) => (a.code === account.code ? account : a));
    setAccounts(updated);
    storageService.saveChartOfAccounts(updated);
  };

  const handleDeleteAccount = (accountCode: string) => {
    const updated = accounts.filter((a) => a.code !== accountCode);
    setAccounts(updated);
    storageService.saveChartOfAccounts(updated);
  };

  const handleBatchDeleteAccounts = (accountCodes: string[]) => {
    const codeSet = new Set(accountCodes);
    const updated = accounts.filter((a) => !codeSet.has(a.code));
    setAccounts(updated);
    storageService.saveChartOfAccounts(updated);
  };

  const handleUpdateBankStatements = (statements: BankStatementImport[]) => {
    setBankStatements(statements);
    storageService.saveBankStatements(statements);
  };

  const handleAddAuditLog = (audit: AuditTrailItem) => {
    const updated = [audit, ...auditTrails];
    setAuditTrails(updated);
    storageService.saveAuditTrails(updated);
  };

  // Debts, Receivables & Investment Handlers
  const handleAddDebt = (debt: DebtRecord) => {
    const updated = [debt, ...debts];
    setDebts(updated);
    storageService.saveDebts(updated);
  };

  const handleUpdateDebt = (debt: DebtRecord) => {
    const updated = debts.map((d) => (d.id === debt.id ? debt : d));
    setDebts(updated);
    storageService.saveDebts(updated);
  };

  const handleDeleteDebt = (id: string, reason: string, pin: string) => {
    const target = debts.find((d) => d.id === id);
    const updated = debts.filter((d) => d.id !== id);
    setDebts(updated);
    storageService.saveDebts(updated);

    if (target) {
      handleAddAuditLog({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'DELETE',
        module: 'Hutang Usaha',
        recordId: target.id,
        recordCode: target.code,
        description: `Menghapus kewajiban hutang vendor ${target.creditorName} (${target.code}) - Alasan: ${reason}`,
        amount: target.totalAmount
      });
    }
  };

  const handleUpdateDebts = (updatedDebts: DebtRecord[]) => {
    setDebts(updatedDebts);
    storageService.saveDebts(updatedDebts);
  };

  const handleAddReceivable = (rec: ReceivableRecord) => {
    const updated = [rec, ...receivables];
    setReceivables(updated);
    storageService.saveReceivables(updated);
  };

  const handleUpdateReceivable = (rec: ReceivableRecord) => {
    const updated = receivables.map((r) => (r.id === rec.id ? rec : r));
    setReceivables(updated);
    storageService.saveReceivables(updated);
  };

  const handleDeleteReceivable = (id: string, reason: string, pin: string) => {
    const target = receivables.find((r) => r.id === id);
    const updated = receivables.filter((r) => r.id !== id);
    setReceivables(updated);
    storageService.saveReceivables(updated);

    if (target) {
      handleAddAuditLog({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Finance Lead',
        userRole: currentUser?.role || 'Finance',
        actionType: 'DELETE',
        module: 'Piutang Usaha',
        recordId: target.id,
        recordCode: target.code,
        description: `Menghapus piutang tagihan invoice ${target.invoiceNumber} (${target.customerName}) - Alasan: ${reason}`,
        amount: target.totalAmount
      });
    }
  };

  const handleUpdateReceivables = (updatedRecs: ReceivableRecord[]) => {
    setReceivables(updatedRecs);
    storageService.saveReceivables(updatedRecs);
  };

  const handleAddInvestment = (inv: InvestmentRecord) => {
    const updated = [inv, ...investments];
    setInvestments(updated);
    storageService.saveInvestments(updated);
  };

  const handleUpdateInvestment = (inv: InvestmentRecord) => {
    const updated = investments.map((item) => (item.id === inv.id ? inv : item));
    setInvestments(updated);
    storageService.saveInvestments(updated);
  };

  const handleUpdateInvestments = (investmentsList: InvestmentRecord[]) => {
    setInvestments(investmentsList);
    storageService.saveInvestments(investmentsList);
  };

  const handleDeleteInvestment = (id: string, reason: string, pin: string) => {
    const target = investments.find((i) => i.id === id);
    const updated = investments.filter((item) => item.id !== id);
    setInvestments(updated);
    storageService.saveInvestments(updated);

    if (target) {
      handleAddAuditLog({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        userName: currentUser?.name || 'Super Admin (HQ)',
        userRole: currentUser?.role || 'Finance',
        actionType: 'DELETE',
        module: 'Investasi & Bagi Hasil',
        recordId: target.id,
        recordCode: target.code,
        description: `Menghapus kontrak investasi ${target.investorName} (Alasan: ${reason})`,
        amount: target.capitalAmount
      });
    }
  };

  // User Management Handlers
  const handleUpdateUsers = (updatedUsers: UserAccount[]) => {
    setUsers(updatedUsers);
    storageService.saveUsers(updatedUsers);

    // If current logged-in user was updated, update currentUser session
    if (currentUser) {
      const activeUpdated = updatedUsers.find((u) => u.id === currentUser.id);
      if (activeUpdated) {
        setCurrentUser(activeUpdated);
        storageService.saveActiveUser(activeUpdated);

        // Re-enforce location lock
        if (activeUpdated.isLocationLocked && activeUpdated.assignedProjectId !== 'ALL') {
          setSelectedProjectId(activeUpdated.assignedProjectId);
        }

        // If active view is no longer allowed, fall back to dashboard
        if (!activeUpdated.allowedViews.includes(currentView) && currentView !== 'dashboard') {
          setCurrentView('dashboard');
        }
      }
    }
  };

  const handleResetUsersToDefault = () => {
    storageService.saveUsers(INITIAL_USERS);
    setUsers(INITIAL_USERS);
    if (currentUser) {
      const refreshed = INITIAL_USERS.find((u) => u.id === currentUser.id) || INITIAL_USERS[0];
      setCurrentUser(refreshed);
      storageService.saveActiveUser(refreshed);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    storageService.saveActiveUser(user);

    // Update lastLogin in users array
    const updatedUsers = users.map((u) => (u.id === user.id ? user : u));
    setUsers(updatedUsers);
    storageService.saveUsers(updatedUsers);

    // Set site lock based on role/user permissions
    if (user.isLocationLocked && user.assignedProjectId !== 'ALL') {
      setSelectedProjectId(user.assignedProjectId);
    } else {
      setSelectedProjectId('ALL');
    }

    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    storageService.clearActiveUser();
    setCurrentUser(null);
    setSelectedProjectId('ALL');
    setCurrentView('dashboard');
  };

  const handleSwitchUser = (targetUser: UserAccount) => {
    setCurrentUser(targetUser);
    storageService.saveActiveUser(targetUser);
    if (targetUser.isLocationLocked && targetUser.assignedProjectId !== 'ALL') {
      setSelectedProjectId(targetUser.assignedProjectId);
    } else {
      setSelectedProjectId('ALL');
    }
    // Check if current view is allowed for this user
    const allowed = targetUser.allowedViews || [];
    if (currentView !== 'dashboard' && !allowed.includes(currentView)) {
      setCurrentView('dashboard');
    }
  };

  // Project selector change handler (respects location lock)
  const handleSelectProject = (projectId: string) => {
    if (currentUser?.isLocationLocked) {
      // Locked users cannot switch
      return;
    }
    setSelectedProjectId(projectId);
  };

  // Safe navigation view changer that verifies user permissions
  const handleNavigateView = (view: AppView) => {
    if (!currentUser) {
      setCurrentView('dashboard');
      return;
    }

    // Access control view is restricted to Super Admin or users with access_control
    if (view === 'access_control' && currentUser.role !== 'Super Admin (HQ)' && !currentUser.allowedViews?.includes('access_control')) {
      alert('Akses Ditolak: Modul Hak Akses Pengguna hanya dapat diakses oleh Super Admin HQ.');
      return;
    }

    // Company settings is restricted to Super Admin or users with company_settings
    if (view === 'company_settings' && currentUser.role !== 'Super Admin (HQ)' && !currentUser.allowedViews?.includes('company_settings')) {
      alert('Akses Ditolak: Modul Pengaturan Perusahaan hanya dapat diakses oleh Super Admin HQ.');
      return;
    }

    // Check if view is allowed
    const isAllowed =
      (currentUser.allowedViews && currentUser.allowedViews.includes(view)) ||
      (view === 'sop' && currentUser.allowedViews?.includes('sops')) ||
      (view === 'sops' && currentUser.allowedViews?.includes('sop' as any)) ||
      (view === 'access_control' && currentUser.role === 'Super Admin (HQ)') ||
      (view === 'company_settings' && currentUser.role === 'Super Admin (HQ)');

    if (!isAllowed) {
      alert(`Akses Ditolak: Anda tidak memiliki izin untuk membuka menu ${view}. Hubungi Super Admin.`);
      return;
    }

    setCurrentView(view);
  };

  // Reset / Kosongkan Seluruh Data Operasional (Super Admin Quick Reset)
  const handleResetData = () => {
    storageService.clearAllDataToEmpty();
    setSelectedProjectId('ALL');
    loadAllData();
  };

  // Badge counts
  const lowStockCount = useMemo(() => {
    return projectStocks.filter((stock) => {
      const item = inventoryItems.find((i) => i.id === stock.itemId || i.id === (stock as any).inventoryItemId);
      if (!item) return false;
      if (selectedProjectId !== 'ALL' && stock.projectId !== selectedProjectId) return false;
      return stock.currentStock <= item.minStock;
    }).length;
  }, [projectStocks, inventoryItems, selectedProjectId]);

  const activeTasksCount = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProjectId !== 'ALL' && t.projectId !== selectedProjectId) return false;
      return t.status !== 'done';
    }).length;
  }, [tasks, selectedProjectId]);

  const unreadBlastCount = useMemo(() => {
    return blasts.filter((b) => b.pinned).length;
  }, [blasts]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-amber-400 text-sm font-semibold space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl animate-pulse">
          🦅
        </div>
        <div>Memuat Sistem Terpadu Rajawali Cycle...</div>
      </div>
    );
  }

  // Not authenticated: Render Login Page
  if (!currentUser) {
    return <LoginPage users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        currentUser={currentUser}
        users={users}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onResetData={handleResetData}
        lowStockCount={lowStockCount}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentView={currentView}
        onSelectView={handleNavigateView}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Collapsible Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={handleNavigateView}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          onResetData={handleResetData}
          currentUser={currentUser}
          lowStockCount={lowStockCount}
          activeTasksCount={activeTasksCount}
          unreadBlastCount={unreadBlastCount}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 overflow-y-auto p-2.5 sm:p-5 lg:p-6 pb-28 sm:pb-32 md:pb-8 scrollbar-thin transition-colors duration-200 ${
            currentView === 'company_settings'
              ? 'bg-slate-50 text-slate-900 scrollbar-thumb-slate-300'
              : 'bg-slate-950 text-slate-100 scrollbar-thumb-slate-800'
          }`}
        >
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Dashboard Overview */}
            {currentView === 'dashboard' && (
              <DashboardOverview
                projects={projects}
                employees={employees}
                timesheets={timesheets}
                projectStocks={projectStocks}
                inventoryItems={inventoryItems}
                tasks={tasks}
                blasts={blasts}
                selectedProjectId={selectedProjectId}
                onNavigate={handleNavigateView}
                userRole={currentUser.role}
                accounts={accounts}
                onUpdateAccounts={handleUpdateAccounts}
                onAddFinanceTransaction={handleAddFinanceTransaction}
                currentUser={currentUser}
                materialRequests={materialRequests}
              />
            )}

            {/* Pengaturan Lokasi Project (Spesifikasi Gedung & Fasilitas) */}
            {currentView === 'project_settings' && (
              <ProjectLocationSettings
                projects={projects}
                selectedProjectId={selectedProjectId}
                onUpdateProjects={handleUpdateProjects}
                userRole={currentUser.role}
              />
            )}

            {/* Eagle Timesheet Matrix */}
            {currentView === 'timesheet' && (
              <EagleTimesheet
                projects={projects}
                employees={employees}
                timesheets={timesheets}
                selectedProjectId={selectedProjectId}
                onUpdateTimesheets={handleUpdateTimesheets}
                userRole={currentUser.role}
              />
            )}

            {/* Employee Management & Mutations */}
            {currentView === 'employees' && (
              <EmployeeManagement
                projects={projects}
                employees={employees}
                mutations={mutations}
                selectedProjectId={selectedProjectId}
                onUpdateEmployees={handleUpdateEmployees}
                onAddMutation={handleAddMutation}
                userRole={currentUser.role}
              />
            )}

            {/* Smart Inventory & Chemical */}
            {currentView === 'inventory' && (
              <SmartInventory
                projects={projects}
                inventoryItems={inventoryItems}
                projectStocks={projectStocks}
                inventoryLogs={inventoryLogs}
                materialRequests={materialRequests}
                onUpdateMaterialRequests={handleUpdateMaterialRequests}
                currentUser={currentUser}
                users={users}
                onUpdateUsers={handleUpdateUsers}
                companyProfile={companyProfile}
                selectedProjectId={selectedProjectId}
                onUpdateStocks={handleUpdateStocks}
                onAddLog={handleAddInventoryLog}
                onAddMasterItem={handleAddMasterItem}
                onUpdateInventoryItems={handleUpdateInventoryItems}
                userRole={currentUser.role}
              />
            )}

            {/* Rajawali Tasks & Kanban Board */}
            {currentView === 'tasks' && (
              <RajawaliBoard
                projects={projects}
                employees={employees}
                tasks={tasks}
                selectedProjectId={selectedProjectId}
                onUpdateTasks={handleUpdateTasks}
                currentUser={currentUser}
                users={users}
                userRole={currentUser.role}
              />
            )}

            {/* Eagle Blast Announcements */}
            {currentView === 'blast' && (
              <EagleBlast
                blasts={blasts}
                onAddBlast={handleAddBlast}
                onUpdateBlasts={handleUpdateBlasts}
                userRole={currentUser.role}
              />
            )}

            {/* SOP Library & K3 Safety */}
            {(currentView === 'sops' || currentView === 'sop') && (
              <SopLibrary
                sops={sops}
                onUpdateSops={handleUpdateSops}
                userRole={currentUser.role}
                currentUser={currentUser}
              />
            )}

            {/* Reporting Center & Payroll */}
            {currentView === 'reports' && (
              <ReportingCenter
                projects={projects}
                employees={employees}
                timesheets={timesheets}
                projectStocks={projectStocks}
                inventoryItems={inventoryItems}
                selectedProjectId={selectedProjectId}
                userRole={currentUser.role}
              />
            )}

            {/* Divisi Finance: Buku Kas, Jurnal Umum, Ledger, COA */}
            {currentView === 'finance_cash_journal' && (
              <FinanceCashJournal
                accounts={accounts}
                transactions={financeTransactions}
                projects={projects}
                currentUser={currentUser}
                periodClosings={periodClosings}
                companyProfile={companyProfile}
                onAddTransaction={handleAddFinanceTransaction}
                onUpdateTransaction={handleUpdateFinanceTransaction}
                onDeleteTransaction={handleDeleteFinanceTransaction}
                onBatchDeleteTransactions={handleBatchDeleteFinanceTransactions}
                onAddAccount={handleAddAccount}
                onUpdateAccount={handleUpdateAccount}
                onUpdateAccounts={handleUpdateAccounts}
                onDeleteAccount={handleDeleteAccount}
                onBatchDeleteAccounts={handleBatchDeleteAccounts}
                onLogAudit={handleAddAuditLog}
              />
            )}

            {/* Divisi Finance: Pencatatan Hutang & Piutang Usaha */}
            {currentView === 'finance_debts_receivables' && (
              <FinanceDebtsReceivables
                debts={debts}
                receivables={receivables}
                investments={investments}
                accounts={accounts}
                projects={projects}
                currentUser={currentUser}
                companyProfile={companyProfile}
                onAddDebt={handleAddDebt}
                onUpdateDebt={handleUpdateDebt}
                onDeleteDebt={handleDeleteDebt}
                onAddReceivable={handleAddReceivable}
                onUpdateReceivable={handleUpdateReceivable}
                onDeleteReceivable={handleDeleteReceivable}
                onUpdateDebts={handleUpdateDebts}
                onUpdateReceivables={handleUpdateReceivables}
                onUpdateInvestments={handleUpdateInvestments}
                onAddTransaction={handleAddFinanceTransaction}
                onLogAudit={handleAddAuditLog}
              />
            )}

            {/* Divisi Finance: Pencatatan Investasi & Bagi Hasil 12 Baris Jadwal */}
            {currentView === 'finance_investments' && (
              <FinanceInvestments
                investments={investments}
                projects={projects}
                currentUser={currentUser}
                onAddInvestment={handleAddInvestment}
                onUpdateInvestment={handleUpdateInvestment}
                onDeleteInvestment={handleDeleteInvestment}
                onLogAudit={handleAddAuditLog}
              />
            )}

            {/* Divisi Finance: Forecast Rencana Pengeluaran (Gaji Manpower + Hutang + Bagi Hasil) */}
            {currentView === 'finance_outflow_forecast' && (
              <FinanceOutflowForecast
                employees={employees}
                timesheets={timesheets}
                debts={debts}
                investments={investments}
                accounts={accounts}
                projects={projects}
                currentUser={currentUser}
                onNavigateView={handleNavigateView}
              />
            )}

            {/* Divisi Finance: Laporan Laba Rugi (Profit & Loss) */}
            {currentView === 'finance_profit_loss' && (
              <FinanceProfitLoss
                accounts={accounts}
                transactions={financeTransactions}
                projects={projects}
                currentUser={currentUser}
              />
            )}

            {/* Divisi Finance: Upload Rekening Koran & Rekonsiliasi Bank */}
            {currentView === 'finance_bank_reconcile' && (
              <FinanceBankReconcile
                bankStatements={bankStatements}
                transactions={financeTransactions}
                accounts={accounts}
                projects={projects}
                debts={debts}
                receivables={receivables}
                investments={investments}
                currentUser={currentUser}
                onUpdateStatements={handleUpdateBankStatements}
                onAddTransaction={handleAddFinanceTransaction}
                onBatchAddTransactions={handleBatchAddFinanceTransactions}
                onUpdateTransaction={handleUpdateFinanceTransaction}
                onBatchUpdateTransactions={handleBatchUpdateFinanceTransactions}
                onDeleteTransaction={handleDeleteFinanceTransaction}
                onBatchDeleteTransactions={handleBatchDeleteFinanceTransactions}
                onUpdateDebts={handleUpdateDebts}
                onUpdateDebt={handleUpdateDebt}
                onUpdateReceivables={handleUpdateReceivables}
                onUpdateReceivable={handleUpdateReceivable}
                onUpdateInvestments={(investmentsList) => {
                  setInvestments(investmentsList);
                  storageService.saveInvestments(investmentsList);
                }}
                onUpdateInvestment={handleUpdateInvestment}
                onUpdateAccounts={handleUpdateAccounts}
                onLogAudit={handleAddAuditLog}
              />
            )}

            {/* Divisi Finance: Laporan Keuangan Standar Akuntansi (SAK) */}
            {currentView === 'finance_statements' && (
              <FinanceStatements
                accounts={accounts}
                transactions={financeTransactions}
                projects={projects}
                currentUser={currentUser}
              />
            )}

            {/* Divisi Finance: Analisa Biaya, Audit Trail & Tutup Buku */}
            {currentView === 'finance_analytics_audit' && (
              <FinanceAnalyticsAudit
                auditLogs={auditTrails}
                transactions={financeTransactions}
                accounts={accounts}
                projects={projects}
                currentUser={currentUser}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

            {/* Access Control & RBAC Permissions Matrix */}
            {currentView === 'access_control' && (
              <AccessControl
                users={users}
                projects={projects}
                currentUser={currentUser}
                onUpdateUsers={handleUpdateUsers}
                onResetUsersToDefault={handleResetUsersToDefault}
              />
            )}

            {/* Master Pengaturan Perusahaan (Logo, Profil, Legalitas, Kop Surat & Rekening HQ) */}
            {currentView === 'company_settings' && (
              <CompanySettings
                companyProfile={companyProfile}
                onUpdateCompanyProfile={handleUpdateCompanyProfile}
                currentUser={currentUser}
                accounts={accounts}
                onResetAllData={loadAllData}
                onNavigateView={handleNavigateView}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        onSelectView={handleNavigateView}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        currentUser={currentUser}
        onLogout={handleLogout}
        onResetData={handleResetData}
        lowStockCount={lowStockCount}
        activeTasksCount={activeTasksCount}
        unreadBlastCount={unreadBlastCount}
      />
    </div>
  );
}
