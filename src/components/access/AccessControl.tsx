import React, { useState } from 'react';
import {
  ShieldCheck,
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Building2,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  KeyRound,
  Check,
  X,
  LayoutDashboard,
  CalendarCheck2,
  UserCheck,
  PackageCheck,
  KanbanSquare,
  Megaphone,
  BookOpen,
  FileSpreadsheet,
  FileCheck,
  Edit3,
  AlertCircle,
  Search,
  Filter,
  Grid,
  Table as TableIcon,
  Layers,
  MapPin,
  Mail,
  Eye,
  Key,
  Wallet,
  ArrowDownUp,
  Briefcase,
  TrendingDown,
  TrendingUp,
  Receipt,
  Scale,
  PieChart,
  FileText
} from 'lucide-react';
import { UserAccount, AppView, Project, UserRole } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

interface AccessControlProps {
  users: UserAccount[];
  projects: Project[];
  currentUser: UserAccount;
  onUpdateUsers: (updatedUsers: UserAccount[]) => void;
  onResetUsersToDefault: () => void;
}

export type MenuCategory = 
  | 'Dashboard & Umum'
  | 'Human Resource Management (HRM)'
  | 'Operations Management (OM)'
  | 'Divisi Finance & Accounting'
  | 'Pengaturan Sistem & HQ';

const AVAILABLE_MENUS: {
  id: AppView;
  label: string;
  category: MenuCategory;
  description: string;
  icon: React.ReactNode;
}[] = [
  // 1. Dashboard & Umum
  {
    id: 'dashboard',
    label: 'Dashboard Utama',
    category: 'Dashboard & Umum',
    description: 'Ringkasan KPI, absensi harian, dan ringkasan stok operasional',
    icon: <LayoutDashboard className="w-4 h-4 text-amber-400" />
  },
  // 2. Human Resource Management (HRM)
  {
    id: 'timesheet',
    label: 'Eagle Timesheet',
    category: 'Human Resource Management (HRM)',
    description: 'Matriks kehadiran 1-31 hari, lembur, dan potongan absen',
    icon: <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
  },
  {
    id: 'employees',
    label: 'Data Karyawan & Lokasi',
    category: 'Human Resource Management (HRM)',
    description: 'Database personil cleaner, penempatan shift, dan riwayat mutasi',
    icon: <UserCheck className="w-4 h-4 text-blue-400" />
  },
  {
    id: 'sops',
    label: 'SOP & Dokumen K3',
    category: 'Human Resource Management (HRM)',
    description: 'Standar Operasional Prosedur, MSDS chemical, dan panduan K3',
    icon: <BookOpen className="w-4 h-4 text-indigo-400" />
  },
  {
    id: 'reports',
    label: 'Pusat Laporan & Payroll',
    category: 'Human Resource Management (HRM)',
    description: 'Rekapitulasi payroll bulanan, ekspor Excel, dan cetak slip gaji',
    icon: <FileSpreadsheet className="w-4 h-4 text-amber-500" />
  },
  // 3. Operations Management (OM)
  {
    id: 'project_settings',
    label: 'Pengaturan Lokasi',
    category: 'Operations Management (OM)',
    description: 'Spesifikasi gedung, manpower, lift, toilet & jenis lantai',
    icon: <Building2 className="w-4 h-4 text-amber-400" />
  },
  {
    id: 'inventory',
    label: 'Smart Inventory',
    category: 'Operations Management (OM)',
    description: 'Monitoring stok chemical, material request, log pemakaian & restock',
    icon: <PackageCheck className="w-4 h-4 text-purple-400" />
  },
  {
    id: 'tasks',
    label: 'Rajawali Boards',
    category: 'Operations Management (OM)',
    description: 'Kanban tugas harian, checklist area foto bukti, dan audit QC',
    icon: <KanbanSquare className="w-4 h-4 text-teal-400" />
  },
  // 4. Divisi Finance & Accounting
  {
    id: 'finance_client_contracts_invoices',
    label: 'Kontrak & Invoice Klien',
    category: 'Divisi Finance & Accounting',
    description: 'Manajemen kontrak klien, pembuatan invoice bulanan, pajak, dan analisis margin profitabilitas',
    icon: <FileText className="w-4 h-4 text-amber-500" />
  },
  {
    id: 'finance_cash_journal',
    label: 'Buku Kas & Jurnal Umum',
    category: 'Divisi Finance & Accounting',
    description: 'Pencatatan Uang Masuk/Keluar COA, Jurnal Umum & Buku Besar',
    icon: <Wallet className="w-4 h-4 text-emerald-400" />
  },
  {
    id: 'finance_debts_receivables',
    label: 'Pencatatan Hutang & Piutang',
    category: 'Divisi Finance & Accounting',
    description: 'Hutang vendor, piutang tagihan invoice klien & analisa aging',
    icon: <ArrowDownUp className="w-4 h-4 text-rose-400" />
  },
  {
    id: 'finance_investments',
    label: 'Pencatatan Investasi & Bagi Hasil',
    category: 'Divisi Finance & Accounting',
    description: '12 baris jadwal dividen investor, pengembalian pokok & reminder',
    icon: <Briefcase className="w-4 h-4 text-purple-400" />
  },
  {
    id: 'finance_outflow_forecast',
    label: 'Forecast Rencana Pengeluaran',
    category: 'Divisi Finance & Accounting',
    description: 'Proyeksi arus kas keluar (Gaji Manpower + Hutang + Bagi Hasil)',
    icon: <TrendingDown className="w-4 h-4 text-amber-400" />
  },
  {
    id: 'finance_profit_loss',
    label: 'Laba Rugi (Profit & Loss)',
    category: 'Divisi Finance & Accounting',
    description: 'Laporan Laba Rugi komprehensif & analisa profitabilitas margin per site',
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />
  },
  {
    id: 'finance_bank_reconcile',
    label: 'Rekening Koran & Rekonsiliasi',
    category: 'Divisi Finance & Accounting',
    description: 'Upload e-Statement bank, auto-matching dan verifikasi mutasi rekening',
    icon: <Receipt className="w-4 h-4 text-cyan-400" />
  },
  {
    id: 'finance_statements',
    label: 'Laporan Keuangan (SAK)',
    category: 'Divisi Finance & Accounting',
    description: 'Neraca Keuangan, Arus Kas & Perubahan Modal Standar Akuntansi',
    icon: <Scale className="w-4 h-4 text-blue-400" />
  },
  {
    id: 'finance_analytics_audit',
    label: 'Analisa Biaya & Tutup Buku',
    category: 'Divisi Finance & Accounting',
    description: 'Breakdown Cost Center, Jejak Audit Sistem, dan Kunci Periode Akuntansi',
    icon: <PieChart className="w-4 h-4 text-purple-400" />
  },
  // 5. Pengaturan Sistem & HQ
  {
    id: 'blast',
    label: 'Eagle Blast',
    category: 'Pengaturan Sistem & HQ',
    description: 'Pemberitahuan resmi manajemen, memo K3, dan briefing operasional',
    icon: <Megaphone className="w-4 h-4 text-rose-400" />
  },
  {
    id: 'company_settings',
    label: 'Pengaturan Perusahaan',
    category: 'Pengaturan Sistem & HQ',
    description: 'Identitas HQ, logo perusahaan, legalitas NIB/NPWP & kop surat resmi',
    icon: <Building2 className="w-4 h-4 text-amber-400" />
  },
  {
    id: 'access_control',
    label: 'Hak Akses Pengguna',
    category: 'Pengaturan Sistem & HQ',
    description: 'Kelola otorisasi user, PIN keamanan, dan matriks izin menu & sub-menu',
    icon: <ShieldCheck className="w-4 h-4 text-amber-400" />
  }
];

const MENU_CATEGORIES: MenuCategory[] = [
  'Dashboard & Umum',
  'Human Resource Management (HRM)',
  'Operations Management (OM)',
  'Divisi Finance & Accounting',
  'Pengaturan Sistem & HQ'
];

export const AccessControl: React.FC<AccessControlProps> = ({
  users,
  projects,
  currentUser,
  onUpdateUsers,
  onResetUsersToDefault
}) => {
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Deletion and reset modals
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [alertModalMsg, setAlertModalMsg] = useState<string | null>(null);

  // Search, Filter, and Tab states for enhanced UX and layout readability
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'matrix' | 'cards' | 'list'>('matrix');
  const [editModalTab, setEditModalTab] = useState<'profile' | 'menus' | 'permissions'>('profile');
  const [addModalTab, setAddModalTab] = useState<'profile' | 'menus' | 'permissions'>('profile');

  // New user form state
  const [newUserForm, setNewUserForm] = useState<{
    username: string;
    name: string;
    email: string;
    role: UserRole;
    password: string;
    securityPin: string;
    assignedProjectId: string;
    isLocationLocked: boolean;
    allowedViews: AppView[];
    canDeleteTasks: boolean;
    canDeleteSops: boolean;
    canApproveMaterialRequests: boolean;
    canReviseMaterialRequests: boolean;
  }>({
    username: '',
    name: '',
    email: '',
    role: 'Admin Lokasi 1',
    password: 'password123',
    securityPin: '123456',
    assignedProjectId: projects[0]?.id || 'proj-1',
    isLocationLocked: true,
    allowedViews: [
      'dashboard',
      'project_settings',
      'timesheet',
      'employees',
      'inventory',
      'tasks',
      'blast',
      'sops',
      'reports'
    ],
    canDeleteTasks: false,
    canDeleteSops: false,
    canApproveMaterialRequests: false,
    canReviseMaterialRequests: false
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle SOP Delete Permission directly in matrix
  const handleToggleDeleteSop = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'Super Admin (HQ)') {
      showToast('Super Admin selalu memiliki hak izin hapus dokumen.');
      return;
    }
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const nextVal = !u.canDeleteSops;
      return { ...u, canDeleteSops: nextVal };
    });
    onUpdateUsers(updated);
    showToast(`Izin hapus SOP untuk ${target?.name || 'pengguna'} berhasil diperbarui.`);
  };

  // Toggle Task Delete Permission directly in matrix
  const handleToggleDeleteTask = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'Super Admin (HQ)') {
      showToast('Super Admin selalu memiliki hak izin hapus tugas.');
      return;
    }
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const nextVal = !u.canDeleteTasks;
      return { ...u, canDeleteTasks: nextVal };
    });
    onUpdateUsers(updated);
    showToast(`Izin hapus tugas Rajawali Board untuk ${target?.name || 'pengguna'} berhasil diperbarui.`);
  };

  // Toggle Material Request Approval Permission directly in matrix
  const handleToggleApproveMaterialRequest = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'Super Admin (HQ)') {
      showToast('Super Admin selalu memiliki hak otorisasi Approval Material Request.');
      return;
    }
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const nextVal = !u.canApproveMaterialRequests;
      return { ...u, canApproveMaterialRequests: nextVal };
    });
    onUpdateUsers(updated);
    showToast(`Hak approval Material Request untuk ${target?.name || 'pengguna'} berhasil diperbarui.`);
  };

  // Toggle Material Request Revision Permission directly in matrix
  const handleToggleReviseMaterialRequest = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'Super Admin (HQ)') {
      showToast('Super Admin selalu memiliki hak otorisasi Revisi Material Request.');
      return;
    }
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const nextVal = !u.canReviseMaterialRequests;
      return { ...u, canReviseMaterialRequests: nextVal };
    });
    onUpdateUsers(updated);
    showToast(`Hak revisi kuota Material Request untuk ${target?.name || 'pengguna'} berhasil diperbarui.`);
  };

  // Toggle specific menu permission for a user directly in the matrix
  const handleToggleMenu = (userId: string, menuId: AppView) => {
    const updated = users.map((u) => {
      if (u.id !== userId) return u;

      // Super admin always retains access_control
      let newViews = [...u.allowedViews];
      if (newViews.includes(menuId)) {
        newViews = newViews.filter((v) => v !== menuId);
      } else {
        newViews.push(menuId);
      }

      if (u.role === 'Super Admin (HQ)' && !newViews.includes('access_control')) {
        newViews.push('access_control');
      }

      return {
        ...u,
        allowedViews: newViews
      };
    });

    onUpdateUsers(updated);
    showToast(`Hak akses menu diperbarui secara otomatis.`);
  };

  // Grant All Menus for a user
  const handleGrantAllMenus = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const isTargetSuperAdmin = targetUser?.role === 'Super Admin (HQ)' || targetUser?.id === 'user-superadmin';

    const allViews: AppView[] = AVAILABLE_MENUS
      .filter((m) => m.id !== 'access_control' || isTargetSuperAdmin)
      .map((m) => m.id);

    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      return { ...u, allowedViews: allViews };
    });

    onUpdateUsers(updated);
    showToast(`Semua ${allViews.length} menu dan sub-menu telah diberikan kepada ${targetUser?.name || 'pengguna'}.`);
  };

  // Revoke optional menus (leave dashboard)
  const handleSetMinimalMenus = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const minimalViews: AppView[] = ['dashboard'];
    if (targetUser?.role === 'Super Admin (HQ)') {
      minimalViews.push('access_control');
    }

    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      return { ...u, allowedViews: minimalViews };
    });

    onUpdateUsers(updated);
    showToast(`Hak akses diatur ke tingkat minimal (Dashboard).`);
  };

  // Toggle user active status
  const handleToggleUserStatus = (userId: string) => {
    if (userId === currentUser.id) {
      alert('Anda tidak dapat menonaktifkan akun Anda sendiri saat sedang masuk.');
      return;
    }

    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const nextStatus = u.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
      return { ...u, status: nextStatus as 'Aktif' | 'Nonaktif' };
    });

    onUpdateUsers(updated);
    showToast(`Status pengguna berhasil diubah.`);
  };

  // Save changes from Edit User Modal
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    const updated = users.map((u) => {
      if (u.id !== selectedUserForEdit.id) return u;
      return selectedUserForEdit;
    });

    onUpdateUsers(updated);
    setSelectedUserForEdit(null);
    showToast(`Data dan konfigurasi akun ${selectedUserForEdit.name} berhasil disimpan.`);
  };

  // Create new user account
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.name.trim()) {
      alert('Mohon lengkapi username dan nama pengguna.');
      return;
    }

    // check if username already exists
    const exists = users.some(
      (u) => u.username.toLowerCase() === newUserForm.username.trim().toLowerCase()
    );
    if (exists) {
      alert('Username sudah digunakan oleh akun lain. Gunakan username unik.');
      return;
    }

    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      username: newUserForm.username.trim(),
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim() || `${newUserForm.username.trim()}@rajawali.co.id`,
      role: newUserForm.role,
      password: newUserForm.password || 'password123',
      securityPin: newUserForm.securityPin || '123456',
      avatar: newUserForm.role === 'Super Admin (HQ)' ? '👑' : newUserForm.role === 'Admin Operasional' ? '🏢' : '📍',
      assignedProjectId: newUserForm.assignedProjectId,
      isLocationLocked: newUserForm.isLocationLocked,
      allowedViews: newUserForm.allowedViews,
      canDeleteTasks: newUserForm.role === 'Super Admin (HQ)' ? true : newUserForm.canDeleteTasks,
      canDeleteSops: newUserForm.role === 'Super Admin (HQ)' ? true : newUserForm.canDeleteSops,
      canApproveMaterialRequests: newUserForm.role === 'Super Admin (HQ)' ? true : newUserForm.canApproveMaterialRequests,
      canReviseMaterialRequests: newUserForm.role === 'Super Admin (HQ)' ? true : newUserForm.canReviseMaterialRequests,
      status: 'Aktif'
    };

    onUpdateUsers([...users, newUser]);
    setIsAddUserModalOpen(false);
    setNewUserForm({
      username: '',
      name: '',
      email: '',
      role: 'Admin Lokasi 1',
      password: 'password123',
      securityPin: '123456',
      assignedProjectId: projects[0]?.id || 'proj-1',
      isLocationLocked: true,
      allowedViews: ['dashboard', 'timesheet', 'employees', 'inventory', 'tasks', 'blast', 'sops', 'reports'],
      canDeleteTasks: false,
      canDeleteSops: false,
      canApproveMaterialRequests: false,
      canReviseMaterialRequests: false
    });
    showToast(`Akun pengguna baru ${newUser.name} berhasil dibuat.`);
  };

  // Delete user (cannot delete self or primary superadmin)
  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      setAlertModalMsg('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    if (userId === 'user-superadmin') {
      setAlertModalMsg('Akun Super Admin Utama tidak boleh dihapus demi keamanan sistem.');
      return;
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setUserToDelete(target);
  };

  const confirmExecuteDeleteUser = () => {
    if (!userToDelete) return;
    const targetId = userToDelete.id;
    const updated = users.filter((u) => u.id !== targetId);
    onUpdateUsers(updated);
    showToast(`Pengguna ${userToDelete.name} berhasil dihapus.`);
    setUserToDelete(null);
  };

  const confirmExecuteResetDefault = () => {
    onResetUsersToDefault();
    showToast('Hak akses dan akun berhasil direset ke bawaan.');
    setIsResetConfirmOpen(false);
  };

  // Filter users based on search term, role, status, and location
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const assignedProj = projects.find((p) => p.id === u.assignedProjectId);
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchUser = (u.username || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchRole = (u.role || '').toLowerCase().includes(q);
      const matchProj =
        (assignedProj?.name || '').toLowerCase().includes(q) ||
        (assignedProj?.code || '').toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchEmail && !matchRole && !matchProj) return false;
    }
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (locationFilter !== 'ALL') {
      if (locationFilter === 'HQ' && u.isLocationLocked) return false;
      if (locationFilter !== 'HQ' && (!u.isLocationLocked || u.assignedProjectId !== locationFilter)) {
        return false;
      }
    }
    return true;
  });

  const isFiltered = searchQuery.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL' || locationFilter !== 'ALL';
  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setLocationFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-sm font-semibold animate-fade-in border border-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Hak Akses & Manajemen Pengguna
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Khusus Super Admin
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-3xl">
              Sebagai <strong className="text-white">Super Admin (HQ)</strong>, Anda memiliki kendali penuh untuk
              menentukan modul/menu apa saja yang dapat diakses oleh masing-masing user serta membatasi cakupan visibilitas
              lokasi (Semua Lokasi vs Terkunci pada Site tertentu).
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              id="reset-users-default-btn"
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Default</span>
            </button>

            <button
              id="add-new-user-btn"
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Akun Baru</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Total Akun Sistem</span>
            <div className="text-xl font-extrabold text-white">{users.length} Akun</div>
            <span className="text-[11px] text-emerald-400">{users.filter((u) => u.status === 'Aktif').length} Aktif</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Super Admin HQ</span>
            <div className="text-xl font-extrabold text-amber-400">
              {users.filter((u) => u.role === 'Super Admin (HQ)').length} User
            </div>
            <span className="text-[11px] text-slate-400">Akses Penuh Semua Lokasi</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Admin Lokasi (Site Locked)</span>
            <div className="text-xl font-extrabold text-emerald-400">
              {users.filter((u) => u.isLocationLocked).length} User
            </div>
            <span className="text-[11px] text-slate-400">Terkunci pada 1 Site</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Total Modul Sistem</span>
            <div className="text-xl font-extrabold text-blue-400">{AVAILABLE_MENUS.length} Modul</div>
            <span className="text-[11px] text-slate-400">Dapat diatur per user</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: View Modes & Search/Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* View Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Matriks Hak Akses</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Kartu Pengguna</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Tabel Detail Akun</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama lengkap, username, email, peran, atau lokasi..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Filter:</span>
            </span>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Peran (Role)</option>
              <option value="Super Admin (HQ)">Super Admin (HQ)</option>
              <option value="Admin Operasional">Admin Operasional</option>
              <option value="Admin Lokasi 1">Admin Lokasi 1</option>
              <option value="Admin Lokasi 2">Admin Lokasi 2</option>
              <option value="Supervisor Lapangan">Supervisor Lapangan</option>
            </select>

            {/* Location Scope Filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Cakupan Lokasi</option>
              <option value="HQ">Semua Lokasi (HQ Global)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Site: {p.name} ({p.code})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Nonaktif">Status: Nonaktif</option>
            </select>

            {/* Clear Filter Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Menampilkan <strong className="text-white">{filteredUsers.length}</strong> dari {users.length} akun pengguna
          </div>
        </div>
      </div>

      {/* Empty State when no users match search */}
      {filteredUsers.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 text-2xl">
            🔍
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Tidak Ada Pengguna yang Cocok</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Tidak ditemukan data akun yang cocok dengan kata kunci pencarian atau kombinasi filter yang Anda pilih.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            Bersihkan Filter Pencarian
          </button>
        </div>
      )}

      {/* TAB 1: Matriks Hak Akses (Matrix View with Sticky Fixed Column) */}
      {activeTab === 'matrix' && filteredUsers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Matriks Hak Akses Menu & Visibilitas Lokasi</span>
              </h2>
              <p className="text-xs text-slate-400">
                Kolom identitas pengguna terkunci di sebelah kiri saat Anda menggulir tabel ke kanan. Klik kotak centang untuk langsung mengubah izin.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="inline-flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                <Check className="w-3 h-3" /> <span>Diberikan</span>
              </span>
              <span className="inline-flex items-center space-x-1 bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                <X className="w-3 h-3" /> <span>Dibatasi</span>
              </span>
            </div>
          </div>

          {/* Matrix Table with Sticky Column */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl relative max-w-full">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider text-[11px] font-bold sticky top-0 z-30">
                <tr className="border-b border-slate-800">
                  {/* Sticky Column Header */}
                  <th className="sticky left-0 z-40 bg-slate-950 py-3.5 px-4 min-w-[280px] sm:min-w-[320px] border-r border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.6)]">
                    Pengguna & Identitas Akun
                  </th>
                  <th className="py-3.5 px-3 min-w-[190px]">Cakupan Lokasi</th>
                  {AVAILABLE_MENUS.map((menu) => (
                    <th key={menu.id} className="py-3.5 px-2.5 text-center min-w-[100px]" title={menu.description}>
                      <div className="flex flex-col items-center justify-center space-y-1">
                        {menu.icon}
                        <span className="text-[10px] normal-case truncate max-w-[90px] font-semibold">
                          {menu.label}
                        </span>
                      </div>
                    </th>
                  ))}
                  {/* Dedicated Permission Columns */}
                  <th className="py-3.5 px-2 text-center min-w-[100px] bg-indigo-950/30 border-l border-r border-indigo-900/30" title="Izin menghapus dokumen SOP di Pusat SOP">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Trash2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] normal-case text-indigo-300 font-bold">Hapus SOP</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center min-w-[100px] bg-teal-950/30 border-r border-teal-900/30" title="Izin menghapus tugas area di Rajawali Boards">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Trash2 className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-[10px] normal-case text-teal-300 font-bold">Hapus Tugas</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center min-w-[110px] bg-amber-950/30 border-r border-amber-900/30" title="Izin Otorisasi Approval / Reject Permintaan Barang (Material Request)">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] normal-case text-amber-300 font-bold">Approval Mat-Req</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-2 text-center min-w-[110px] bg-sky-950/30 border-r border-sky-900/30" title="Izin Melakukan Revisi / Penyesuaian Qty Permintaan Barang">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[10px] normal-case text-sky-300 font-bold">Revisi Mat-Req</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[120px]">Aksi Akun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                {filteredUsers.map((u) => {
                  const assignedProj = projects.find((p) => p.id === u.assignedProjectId);
                  const isSuperAdmin = u.role === 'Super Admin (HQ)';
                  const canDelSop = isSuperAdmin || Boolean(u.canDeleteSops);
                  const canDelTask = isSuperAdmin || Boolean(u.canDeleteTasks);
                  const canApproveMR = isSuperAdmin || Boolean(u.canApproveMaterialRequests);
                  const canReviseMR = isSuperAdmin || Boolean(u.canReviseMaterialRequests);

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* User Info Column (Sticky Freeze Column - Always Visible) */}
                      <td className="sticky left-0 z-20 bg-slate-900/95 backdrop-blur py-3.5 px-4 min-w-[280px] sm:min-w-[320px] border-r border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.6)]">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0 mt-0.5">
                            {u.avatar || '👤'}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="font-bold text-white text-sm leading-snug break-words">
                                {u.name}
                              </span>
                              {u.id === currentUser.id && (
                                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30 whitespace-nowrap">
                                  Sesi Anda
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border whitespace-nowrap ${
                                  u.status === 'Aktif'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {u.status}
                              </span>
                            </div>

                            <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-400">
                              <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-semibold">
                                @{u.username}
                              </span>
                              {u.email && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 text-[10px] break-all">{u.email}</span>
                                </>
                              )}
                            </div>

                            <div className="pt-0.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isSuperAdmin
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : u.role === 'Admin Operasional'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : u.role === 'Supervisor Lapangan'
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {u.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location Scope Column */}
                      <td className="py-3.5 px-3 min-w-[190px]">
                        {u.isLocationLocked ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold">
                              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="break-words font-medium">
                                {assignedProj ? assignedProj.name : 'Lokasi Terkunci'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {assignedProj ? `Kode: ${assignedProj.code}` : 'Hanya 1 lokasi khusus'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="inline-flex items-center space-x-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold">
                              <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="font-medium">🌐 Semua Lokasi (HQ)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              Akses semua gedung proyek
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Menu Toggles Columns */}
                      {AVAILABLE_MENUS.map((menu) => {
                        const hasAccess = u.allowedViews.includes(menu.id);

                        return (
                          <td key={menu.id} className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleMenu(u.id, menu.id)}
                              title={`Klik untuk ${hasAccess ? 'Mencabut' : 'Memberikan'} akses ke menu ${menu.label}`}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                                hasAccess
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40'
                                  : 'bg-slate-800/80 text-slate-500 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40'
                              }`}
                            >
                              {hasAccess ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        );
                      })}

                      {/* Toggle: Izin Hapus SOP */}
                      <td className="py-3 px-2 text-center bg-indigo-950/20 border-l border-r border-indigo-900/30">
                        <button
                          type="button"
                          onClick={() => handleToggleDeleteSop(u.id)}
                          disabled={isSuperAdmin}
                          title={
                            isSuperAdmin
                              ? 'Super Admin selalu memiliki izin hapus dokumen SOP'
                              : `Klik untuk ${canDelSop ? 'Mencabut' : 'Memberikan'} izin hapus dokumen SOP`
                          }
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            canDelSop
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-rose-500/20 hover:text-rose-400'
                              : 'bg-slate-800/80 text-slate-500 border border-slate-700 hover:bg-indigo-500/20 hover:text-indigo-300'
                          } ${isSuperAdmin ? 'opacity-80 cursor-default' : ''}`}
                        >
                          {canDelSop ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Toggle: Izin Hapus Tugas */}
                      <td className="py-3 px-2 text-center bg-teal-950/20 border-r border-teal-900/30">
                        <button
                          type="button"
                          onClick={() => handleToggleDeleteTask(u.id)}
                          disabled={isSuperAdmin}
                          title={
                            isSuperAdmin
                              ? 'Super Admin selalu memiliki izin hapus tugas Rajawali Board'
                              : `Klik untuk ${canDelTask ? 'Mencabut' : 'Memberikan'} izin hapus tugas Rajawali Board`
                          }
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            canDelTask
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 hover:bg-rose-500/20 hover:text-rose-400'
                              : 'bg-slate-800/80 text-slate-500 border border-slate-700 hover:bg-teal-500/20 hover:text-teal-300'
                          } ${isSuperAdmin ? 'opacity-80 cursor-default' : ''}`}
                        >
                          {canDelTask ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Toggle: Izin Approval Material Request */}
                      <td className="py-3 px-2 text-center bg-amber-950/20 border-r border-amber-900/30">
                        <button
                          type="button"
                          onClick={() => handleToggleApproveMaterialRequest(u.id)}
                          disabled={isSuperAdmin}
                          title={
                            isSuperAdmin
                              ? 'Super Admin selalu memiliki hak otorisasi Approval Material Request'
                              : `Klik untuk ${canApproveMR ? 'Mencabut' : 'Memberikan'} izin approval permintaan barang`
                          }
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            canApproveMR
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-rose-500/20 hover:text-rose-400'
                              : 'bg-slate-800/80 text-slate-500 border border-slate-700 hover:bg-amber-500/20 hover:text-amber-300'
                          } ${isSuperAdmin ? 'opacity-80 cursor-default' : ''}`}
                        >
                          {canApproveMR ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Toggle: Izin Revisi Material Request */}
                      <td className="py-3 px-2 text-center bg-sky-950/20 border-r border-sky-900/30">
                        <button
                          type="button"
                          onClick={() => handleToggleReviseMaterialRequest(u.id)}
                          disabled={isSuperAdmin}
                          title={
                            isSuperAdmin
                              ? 'Super Admin selalu memiliki hak otorisasi Revisi Qty Material Request'
                              : `Klik untuk ${canReviseMR ? 'Mencabut' : 'Memberikan'} izin revisi kuota permintaan barang`
                          }
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            canReviseMR
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 hover:bg-rose-500/20 hover:text-rose-400'
                              : 'bg-slate-800/80 text-slate-500 border border-slate-700 hover:bg-sky-500/20 hover:text-sky-300'
                          } ${isSuperAdmin ? 'opacity-80 cursor-default' : ''}`}
                        >
                          {canReviseMR ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Action Column */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForEdit(u)}
                            title="Edit Pengaturan Lengkap Akun"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.id)}
                            title={u.status === 'Aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.status === 'Aktif'
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-rose-500/20 hover:text-rose-400'
                                : 'bg-rose-500/20 text-rose-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                            }`}
                          >
                            {u.status === 'Aktif' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          </button>
                          {u.id !== currentUser.id && u.id !== 'user-superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              title="Hapus Akun"
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Info Footer */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Perubahan pada matriks hak akses akan langsung diterapkan pada navigasi bilah samping (Sidebar) dan menu pengguna secara realtime.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Kartu Pengguna Lengkap (Spacious Card View - No Text Truncation) */}
      {activeTab === 'cards' && filteredUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredUsers.map((u) => {
            const assignedProj = projects.find((p) => p.id === u.assignedProjectId);
            const isSuperAdmin = u.role === 'Super Admin (HQ)';

            return (
              <div
                key={u.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-4">
                  {/* Top Header with Avatar & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
                        {u.avatar || '👤'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              u.status === 'Aktif'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {u.status}
                          </span>
                          {u.id === currentUser.id && (
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                              Sesi Anda
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-amber-400 text-xs font-semibold block mt-1">
                          @{u.username}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(u.id)}
                      title={u.status === 'Aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                        u.status === 'Aktif'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-400'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-400'
                      }`}
                    >
                      {u.status === 'Aktif' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Full User Name (No Truncate) & Email */}
                  <div className="pt-1">
                    <h3 className="font-bold text-white text-base leading-snug break-words">
                      {u.name}
                    </h3>
                    {u.email && (
                      <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-1 break-all">
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{u.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Metadata Rows */}
                  <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">Peran / Role:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                          isSuperAdmin
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : u.role === 'Admin Operasional'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : u.role === 'Supervisor Lapangan'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 font-medium shrink-0">Visibilitas:</span>
                      <div className="text-right">
                        {u.isLocationLocked ? (
                          <span className="font-semibold text-emerald-300 break-words block">
                            📍 {assignedProj ? assignedProj.name : 'Lokasi Terkunci'}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-300">🌐 Semua Lokasi (HQ)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 font-medium">PIN Keamanan:</span>
                      <span className="font-mono text-slate-300 flex items-center space-x-1">
                        <Key className="w-3 h-3 text-rose-400" />
                        <span>{u.securityPin ? '6-Digit Terpasang' : 'Belum Diatur'}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 font-medium">Modul Aktif:</span>
                      <span className="font-bold text-emerald-400">
                        {u.allowedViews.length} dari {AVAILABLE_MENUS.length} Modul
                      </span>
                    </div>
                  </div>

                  {/* Modules Pill Tags Preview */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 block">Modul yang Diberikan:</span>
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_MENUS.filter((m) => u.allowedViews.includes(m.id)).map((menu) => (
                        <span
                          key={menu.id}
                          className="inline-flex items-center space-x-1 bg-slate-800 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-700"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{menu.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleGrantAllMenus(u.id)}
                    className="flex-1 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold text-center transition-colors cursor-pointer"
                  >
                    Beri Semua Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserForEdit(u)}
                    className="py-2 px-3.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  {u.id !== currentUser.id && u.id !== 'user-superadmin' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
                      title="Hapus Akun Pengguna"
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: Tabel Detail Akun (Comprehensive Data Table View) */}
      {activeTab === 'list' && filteredUsers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <TableIcon className="w-5 h-5 text-amber-400" />
              <span>Daftar Detail Semua Akun Pengguna</span>
            </h2>
            <p className="text-xs text-slate-400">
              Menampilkan informasi komprehensif profil pengguna, hak otorisasi audit, cakupan lokasi gedung, dan status akun secara terbuka tanpa terpotong.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider text-[11px] font-bold">
                <tr className="border-b border-slate-800">
                  <th className="py-3.5 px-4 min-w-[260px]">Nama Lengkap & User</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Peran (Role)</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Cakupan Lokasi</th>
                  <th className="py-3.5 px-3 min-w-[170px]">Hak Otorisasi Khusus</th>
                  <th className="py-3.5 px-3 min-w-[130px] text-center">Menu Aktif</th>
                  <th className="py-3.5 px-3 min-w-[120px] text-center">Keamanan PIN</th>
                  <th className="py-3.5 px-3 min-w-[110px] text-center">Status</th>
                  <th className="py-3.5 px-4 min-w-[120px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                {filteredUsers.map((u) => {
                  const assignedProj = projects.find((p) => p.id === u.assignedProjectId);
                  const isSuperAdmin = u.role === 'Super Admin (HQ)';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                            {u.avatar || '👤'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="font-bold text-white text-sm break-words">{u.name}</span>
                              {u.id === currentUser.id && (
                                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono text-amber-400">
                              @{u.username}
                            </div>
                            {u.email && (
                              <div className="text-[10px] text-slate-500 break-all">{u.email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isSuperAdmin
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : u.role === 'Admin Operasional'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : u.role === 'Supervisor Lapangan'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Location Scope */}
                      <td className="py-3.5 px-3">
                        {u.isLocationLocked ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-medium">
                              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="break-words font-semibold">
                                {assignedProj ? assignedProj.name : 'Lokasi Terkunci'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {assignedProj ? `Kode: ${assignedProj.code} • ${assignedProj.type}` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-medium">
                            <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>🌐 Semua Lokasi (HQ Global)</span>
                          </div>
                        )}
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col space-y-1 text-[11px]">
                          <span
                            className={
                              isSuperAdmin || u.canDeleteSops
                                ? 'text-indigo-400 font-semibold'
                                : 'text-slate-500 line-through'
                            }
                          >
                            • Hapus SOP: {isSuperAdmin || u.canDeleteSops ? 'Ya' : 'Tidak'}
                          </span>
                          <span
                            className={
                              isSuperAdmin || u.canDeleteTasks
                                ? 'text-teal-400 font-semibold'
                                : 'text-slate-500 line-through'
                            }
                          >
                            • Hapus Tugas: {isSuperAdmin || u.canDeleteTasks ? 'Ya' : 'Tidak'}
                          </span>
                          <span
                            className={
                              isSuperAdmin || u.canApproveMaterialRequests
                                ? 'text-amber-400 font-semibold'
                                : 'text-slate-500 line-through'
                            }
                          >
                            • Approval Mat-Req: {isSuperAdmin || u.canApproveMaterialRequests ? 'Ya' : 'Tidak'}
                          </span>
                          <span
                            className={
                              isSuperAdmin || u.canReviseMaterialRequests
                                ? 'text-sky-400 font-semibold'
                                : 'text-slate-500 line-through'
                            }
                          >
                            • Revisi Mat-Req: {isSuperAdmin || u.canReviseMaterialRequests ? 'Ya' : 'Tidak'}
                          </span>
                        </div>
                      </td>

                      {/* Active Menus */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                          {u.allowedViews.length} / {AVAILABLE_MENUS.length}
                        </span>
                      </td>

                      {/* Security PIN */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center space-x-1 text-slate-300 font-mono text-xs">
                          <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                          <span>{u.securityPin ? 'Aktif' : 'N/A'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u.id)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                            u.status === 'Aktif'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'Aktif' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span>{u.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForEdit(u)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGrantAllMenus(u.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Beri Semua Hak Akses Menu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          {u.id !== currentUser.id && u.id !== 'user-superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
                              title="Hapus Akun Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Edit User Settings & Permissions */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto p-3 sm:p-5 md:p-6 flex justify-center items-start sm:items-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden my-auto animate-scale-up">
            {/* STICKY MODAL HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>Edit Pengguna:</span>
                    <span className="text-amber-300 font-semibold">{selectedUserForEdit.name}</span>
                    <span className="text-xs font-mono text-slate-400 font-normal">(@{selectedUserForEdit.username})</span>
                  </h3>
                  <p className="text-xs text-slate-400">Atur profil, kata sandi, visibilitas lokasi gedung, dan hak akses menu.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STICKY TAB NAVIGATOR */}
            <div className="flex items-center px-4 sm:px-6 pt-2.5 pb-2 bg-slate-950/70 border-b border-slate-800 shrink-0 gap-1.5 sm:gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setEditModalTab('profile')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  editModalTab === 'profile'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>1. Profil & Keamanan</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab('menus')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  editModalTab === 'menus'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2. Lokasi & Menu ({selectedUserForEdit.allowedViews.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab('permissions')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  editModalTab === 'permissions'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>3. Otorisasi Khusus</span>
              </button>
            </div>

            {/* FORM CONTAINER WITH SCROLLABLE CONTENT */}
            <form onSubmit={handleSaveEditUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {/* TAB 1: Profil & Keamanan */}
                {editModalTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          required
                          value={selectedUserForEdit.name}
                          onChange={(e) =>
                            setSelectedUserForEdit({ ...selectedUserForEdit, name: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Username (Login ID)</label>
                        <input
                          type="text"
                          required
                          value={selectedUserForEdit.username}
                          onChange={(e) =>
                            setSelectedUserForEdit({ ...selectedUserForEdit, username: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Peran</label>
                        <select
                          value={selectedUserForEdit.role}
                          onChange={(e) =>
                            setSelectedUserForEdit({
                              ...selectedUserForEdit,
                              role: e.target.value as UserRole
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        >
                          <option value="Super Admin (HQ)">Super Admin (HQ)</option>
                          <option value="Admin Operasional">Admin Operasional</option>
                          <option value="Admin Lokasi 1">Admin Lokasi 1</option>
                          <option value="Admin Lokasi 2">Admin Lokasi 2</option>
                          <option value="Supervisor Lapangan">Supervisor Lapangan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Kata Sandi (Password)</label>
                        <input
                          type="text"
                          value={selectedUserForEdit.password || ''}
                          onChange={(e) =>
                            setSelectedUserForEdit({ ...selectedUserForEdit, password: e.target.value })
                          }
                          placeholder="password123"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Email Staf (Opsional)</label>
                        <input
                          type="email"
                          value={selectedUserForEdit.email || ''}
                          onChange={(e) =>
                            setSelectedUserForEdit({ ...selectedUserForEdit, email: e.target.value })
                          }
                          placeholder="staf@rajawalicyber.id"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Status Akun</label>
                        <select
                          value={selectedUserForEdit.status || 'Aktif'}
                          onChange={(e) =>
                            setSelectedUserForEdit({
                              ...selectedUserForEdit,
                              status: e.target.value as 'Aktif' | 'Nonaktif'
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        >
                          <option value="Aktif">🟢 Aktif (Bisa Login)</option>
                          <option value="Nonaktif">🔴 Nonaktif (Login Dibekukan)</option>
                        </select>
                      </div>
                    </div>

                    {/* Avatar Icon Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Avatar / Ikon Profil</label>
                      <div className="flex items-center space-x-2">
                        {['👤', '👷', '👨‍💼', '👩‍💼', '🧑‍💻', '⚡', '🏢', '🛡️'].map((av) => (
                          <button
                            key={av}
                            type="button"
                            onClick={() => setSelectedUserForEdit({ ...selectedUserForEdit, avatar: av })}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-all cursor-pointer ${
                              (selectedUserForEdit.avatar || '👤') === av
                                ? 'bg-amber-500/20 border-amber-500 scale-110 shadow-md shadow-amber-500/20'
                                : 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* PIN Keamanan */}
                    <div className="bg-rose-950/20 border border-rose-900/40 p-3.5 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                        <span>PIN Keamanan Penghapusan Data (Security PIN - 6 Digit)</span>
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={selectedUserForEdit.securityPin || ''}
                        onChange={(e) =>
                          setSelectedUserForEdit({ ...selectedUserForEdit, securityPin: e.target.value.replace(/\D/g, '').slice(0, 6) })
                        }
                        placeholder="123456"
                        className="w-full bg-slate-950 border border-rose-900/50 rounded-xl px-3 py-2 text-xs font-mono tracking-widest text-rose-300 outline-none focus:border-rose-500"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        Diperlukan saat staf menghapus Transaksi Kas/Bank atau Akun COA untuk integritas Audit Trail.
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB 2: Visibilitas Lokasi & Menu */}
                {editModalTab === 'menus' && (
                  <div className="space-y-4">
                    {/* Location Scope Settings */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                      <span className="text-xs font-bold text-amber-400 block">Pengaturan Visibilitas Lokasi Gedung</span>
                      
                      <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUserForEdit.isLocationLocked}
                          onChange={(e) =>
                            setSelectedUserForEdit({
                              ...selectedUserForEdit,
                              isLocationLocked: e.target.checked
                            })
                          }
                          className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                        />
                        <span>Kunci Pengguna pada 1 Lokasi Khusus (Tidak bisa lihat lokasi lain)</span>
                      </label>

                      {selectedUserForEdit.isLocationLocked && (
                        <div className="pt-1">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Pilih Lokasi yang Ditugaskan:
                          </label>
                          <select
                            value={selectedUserForEdit.assignedProjectId}
                            onChange={(e) =>
                              setSelectedUserForEdit({
                                ...selectedUserForEdit,
                                assignedProjectId: e.target.value
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                          >
                            {projects.map((proj) => (
                              <option key={proj.id} value={proj.id}>
                                📍 {proj.name} ({proj.code}) - {proj.type}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Menu Permissions Checklist */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-200">
                          Hak Akses Menu Sistem ({selectedUserForEdit.allowedViews.length} Terpilih):
                        </label>
                        <div className="flex items-center space-x-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedUserForEdit({
                                ...selectedUserForEdit,
                                allowedViews: AVAILABLE_MENUS.map((m) => m.id)
                              })
                            }
                            className="text-amber-400 hover:underline cursor-pointer font-semibold"
                          >
                            Pilih Semua
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedUserForEdit({
                                ...selectedUserForEdit,
                                allowedViews: ['dashboard']
                              })
                            }
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Hanya Dashboard
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {MENU_CATEGORIES.map((cat) => {
                          const categoryMenus = AVAILABLE_MENUS.filter((m) => m.category === cat);
                          const selectedCount = categoryMenus.filter((m) => selectedUserForEdit.allowedViews.includes(m.id)).length;

                          return (
                            <div key={cat} className="space-y-2 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                              <div className="flex items-center justify-between flex-wrap gap-1 pb-2 border-b border-slate-800/80">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-200">{cat}</span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                      selectedCount > 0
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                    }`}
                                  >
                                    {selectedCount}/{categoryMenus.length} Terpilih
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const catIds = categoryMenus.map((m) => m.id);
                                      const merged = Array.from(new Set([...selectedUserForEdit.allowedViews, ...catIds]));
                                      setSelectedUserForEdit({
                                        ...selectedUserForEdit,
                                        allowedViews: merged
                                      });
                                    }}
                                    className="text-amber-400 hover:underline cursor-pointer font-semibold"
                                  >
                                    Pilih Kategori Ini
                                  </button>
                                  <span className="text-slate-600">•</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const catIdSet = new Set(categoryMenus.map((m) => m.id));
                                      const filtered = selectedUserForEdit.allowedViews.filter((v) => !catIdSet.has(v));
                                      setSelectedUserForEdit({
                                        ...selectedUserForEdit,
                                        allowedViews: filtered
                                      });
                                    }}
                                    className="text-slate-400 hover:underline cursor-pointer"
                                  >
                                    Batalkan Kategori
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {categoryMenus.map((menu) => {
                                  const isChecked = selectedUserForEdit.allowedViews.includes(menu.id);

                                  return (
                                    <label
                                      key={menu.id}
                                      className={`flex items-start space-x-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                        isChecked
                                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let next = [...selectedUserForEdit.allowedViews];
                                          if (e.target.checked) {
                                            next.push(menu.id);
                                          } else {
                                            next = next.filter((v) => v !== menu.id);
                                          }
                                          setSelectedUserForEdit({
                                            ...selectedUserForEdit,
                                            allowedViews: next
                                          });
                                        }}
                                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-1.5">
                                          {menu.icon}
                                          <span className="font-bold text-slate-200">{menu.label}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                                          {menu.description}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Otorisasi Khusus */}
                {editModalTab === 'permissions' && (
                  <div className="space-y-4">
                    {/* Special Permissions: Deletion of SOP & Tasks */}
                    <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-rose-400">
                          <Trash2 className="w-4 h-4" />
                          <span>Izin Khusus Penghapusan Data (Otorisasi Super Admin)</span>
                        </div>
                        {selectedUserForEdit.role === 'Super Admin (HQ)' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                            Super Admin (Semua Izin Aktif)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Pengguna dengan izin ini dapat menghapus data penting. Berikan izin hanya kepada personil yang terpercaya.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedUserForEdit.canDeleteSops || selectedUserForEdit.role === 'Super Admin (HQ)'
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={selectedUserForEdit.role === 'Super Admin (HQ)'}
                            checked={Boolean(selectedUserForEdit.canDeleteSops) || selectedUserForEdit.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setSelectedUserForEdit({
                                ...selectedUserForEdit,
                                canDeleteSops: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                          />
                          <div>
                            <span className="font-bold text-indigo-300 block">Izin Hapus Dokumen SOP</span>
                            <span className="text-[10px] text-slate-400">Pusat SOP & Panduan Standar Mutu</span>
                          </div>
                        </label>

                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedUserForEdit.canDeleteTasks || selectedUserForEdit.role === 'Super Admin (HQ)'
                              ? 'bg-teal-500/10 border-teal-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={selectedUserForEdit.role === 'Super Admin (HQ)'}
                            checked={Boolean(selectedUserForEdit.canDeleteTasks) || selectedUserForEdit.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setSelectedUserForEdit({
                                ...selectedUserForEdit,
                                canDeleteTasks: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-400"
                          />
                          <div>
                            <span className="font-bold text-teal-300 block">Izin Hapus Tugas Area</span>
                            <span className="text-[10px] text-slate-400">Rajawali Boards / Cleaning Area</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Special Permissions: Material Request Approval & Revision */}
                    <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                          <FileCheck className="w-4 h-4" />
                          <span>Otorisasi Material Request (Permintaan Barang Stok Proyek)</span>
                        </div>
                        {selectedUserForEdit.role === 'Super Admin (HQ)' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                            Super Admin (Hak Penuh)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Tentukan apakah staf ini berwenang menyetujui (Approve), menolak (Reject), atau merevisi kuota Qty barang pada pengajuan stok lokasi proyek.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedUserForEdit.canApproveMaterialRequests || selectedUserForEdit.role === 'Super Admin (HQ)'
                              ? 'bg-amber-500/10 border-amber-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={selectedUserForEdit.role === 'Super Admin (HQ)'}
                            checked={Boolean(selectedUserForEdit.canApproveMaterialRequests) || selectedUserForEdit.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setSelectedUserForEdit({
                                ...selectedUserForEdit,
                                canApproveMaterialRequests: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                          />
                          <div>
                            <span className="font-bold text-amber-300 block">Izin Approval / Reject</span>
                            <span className="text-[10px] text-slate-400">Bisa approve / reject pengajuan barang stok</span>
                          </div>
                        </label>

                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedUserForEdit.canReviseMaterialRequests || selectedUserForEdit.role === 'Super Admin (HQ)'
                              ? 'bg-sky-500/10 border-sky-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={selectedUserForEdit.role === 'Super Admin (HQ)'}
                            checked={Boolean(selectedUserForEdit.canReviseMaterialRequests) || selectedUserForEdit.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setSelectedUserForEdit({
                                ...selectedUserForEdit,
                                canReviseMaterialRequests: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400"
                          />
                          <div>
                            <span className="font-bold text-sky-300 block">Izin Revisi Qty Barang</span>
                            <span className="text-[10px] text-slate-400">Bisa menyesuaikan kuota qty item diajukan</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY MODAL FOOTER */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  {editModalTab !== 'profile' && (
                    <button
                      type="button"
                      onClick={() => setEditModalTab(editModalTab === 'permissions' ? 'menus' : 'profile')}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      ← Kembali
                    </button>
                  )}
                  {editModalTab !== 'permissions' && (
                    <button
                      type="button"
                      onClick={() => setEditModalTab(editModalTab === 'profile' ? 'menus' : 'permissions')}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    >
                      {editModalTab === 'profile' ? 'Lokasi & Menu →' : 'Otorisasi Khusus →'}
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForEdit(null)}
                    className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer whitespace-nowrap"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New User Account */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto p-3 sm:p-5 md:p-6 flex justify-center items-start sm:items-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden my-auto animate-scale-up">
            {/* STICKY MODAL HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white">Tambah Akun Pengguna Baru</h3>
                  <p className="text-xs text-slate-400">Buat akun untuk admin site baru atau staf operasional.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STICKY TAB NAVIGATOR */}
            <div className="flex items-center px-4 sm:px-6 pt-2.5 pb-2 bg-slate-950/70 border-b border-slate-800 shrink-0 gap-1.5 sm:gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setAddModalTab('profile')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  addModalTab === 'profile'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>1. Profil & Akun</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('menus')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  addModalTab === 'menus'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2. Lokasi & Menu ({newUserForm.allowedViews.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('permissions')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  addModalTab === 'permissions'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>3. Otorisasi Khusus</span>
              </button>
            </div>

            {/* FORM CONTAINER WITH SCROLLABLE CONTENT */}
            <form onSubmit={handleCreateUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {/* TAB 1: Profil & Akun */}
                {addModalTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Staf</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Dedi Kurniawan"
                          value={newUserForm.name}
                          onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Username Login</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: admin.lokasi3"
                          value={newUserForm.username}
                          onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Peran</label>
                        <select
                          value={newUserForm.role}
                          onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        >
                          <option value="Admin Lokasi 1">Admin Lokasi 1</option>
                          <option value="Admin Lokasi 2">Admin Lokasi 2</option>
                          <option value="Admin Operasional">Admin Operasional</option>
                          <option value="Supervisor Lapangan">Supervisor Lapangan</option>
                          <option value="Super Admin (HQ)">Super Admin (HQ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                        <input
                          type="text"
                          required
                          placeholder="password123"
                          value={newUserForm.password}
                          onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Email Staf (Opsional)</label>
                        <input
                          type="email"
                          placeholder="staf@rajawalicyber.id"
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Status Akun</label>
                        <select
                          value={newUserForm.status}
                          onChange={(e) => setNewUserForm({ ...newUserForm, status: e.target.value as 'Aktif' | 'Nonaktif' })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                        >
                          <option value="Aktif">🟢 Aktif (Bisa Login)</option>
                          <option value="Nonaktif">🔴 Nonaktif (Login Dibekukan)</option>
                        </select>
                      </div>
                    </div>

                    {/* Avatar Icon Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Avatar / Ikon Profil</label>
                      <div className="flex items-center space-x-2">
                        {['👤', '👷', '👨‍💼', '👩‍💼', '🧑‍💻', '⚡', '🏢', '🛡️'].map((av) => (
                          <button
                            key={av}
                            type="button"
                            onClick={() => setNewUserForm({ ...newUserForm, avatar: av })}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-all cursor-pointer ${
                              newUserForm.avatar === av
                                ? 'bg-amber-500/20 border-amber-500 scale-110 shadow-md shadow-amber-500/20'
                                : 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Setup PIN Keamanan */}
                    <div className="bg-rose-950/20 border border-rose-900/40 p-3.5 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                        <span>Setup PIN Keamanan Penghapusan Data (Security PIN - 6 Digit)</span>
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newUserForm.securityPin}
                        onChange={(e) =>
                          setNewUserForm({ ...newUserForm, securityPin: e.target.value.replace(/\D/g, '').slice(0, 6) })
                        }
                        placeholder="123456"
                        className="w-full bg-slate-950 border border-rose-900/50 rounded-xl px-3 py-2 text-xs font-mono tracking-widest text-rose-300 outline-none focus:border-rose-500"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        PIN default awal adalah 123456. User wajib memasukkan PIN ini saat melakukan penghapusan data penting.
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB 2: Visibilitas Lokasi & Menu */}
                {addModalTab === 'menus' && (
                  <div className="space-y-4">
                    {/* Location Scope Settings */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                      <span className="text-xs font-bold text-amber-400 block">Pengaturan Visibilitas Lokasi Gedung</span>
                      
                      <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUserForm.isLocationLocked}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              isLocationLocked: e.target.checked
                            })
                          }
                          className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                        />
                        <span>Kunci Pengguna pada 1 Lokasi Khusus (Tidak bisa lihat lokasi lain)</span>
                      </label>

                      {newUserForm.isLocationLocked && (
                        <div className="pt-1">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Pilih Lokasi yang Ditugaskan:
                          </label>
                          <select
                            value={newUserForm.assignedProjectId}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                assignedProjectId: e.target.value
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                          >
                            {projects.map((proj) => (
                              <option key={proj.id} value={proj.id}>
                                📍 {proj.name} ({proj.code}) - {proj.type}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Menu Permissions Checklist */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-200">
                          Hak Akses Menu Sistem ({newUserForm.allowedViews.length} Terpilih):
                        </label>
                        <div className="flex items-center space-x-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setNewUserForm({
                                ...newUserForm,
                                allowedViews: AVAILABLE_MENUS.map((m) => m.id)
                              })
                            }
                            className="text-amber-400 hover:underline cursor-pointer font-semibold"
                          >
                            Pilih Semua
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewUserForm({
                                ...newUserForm,
                                allowedViews: ['dashboard']
                              })
                            }
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Hanya Dashboard
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {MENU_CATEGORIES.map((cat) => {
                          const categoryMenus = AVAILABLE_MENUS.filter((m) => m.category === cat);
                          const selectedCount = categoryMenus.filter((m) => newUserForm.allowedViews.includes(m.id)).length;

                          return (
                            <div key={cat} className="space-y-2 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                              <div className="flex items-center justify-between flex-wrap gap-1 pb-2 border-b border-slate-800/80">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-200">{cat}</span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                      selectedCount > 0
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                    }`}
                                  >
                                    {selectedCount}/{categoryMenus.length} Terpilih
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const catIds = categoryMenus.map((m) => m.id);
                                      const merged = Array.from(new Set([...newUserForm.allowedViews, ...catIds]));
                                      setNewUserForm({
                                        ...newUserForm,
                                        allowedViews: merged
                                      });
                                    }}
                                    className="text-amber-400 hover:underline cursor-pointer font-semibold"
                                  >
                                    Pilih Kategori Ini
                                  </button>
                                  <span className="text-slate-600">•</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const catIdSet = new Set(categoryMenus.map((m) => m.id));
                                      const filtered = newUserForm.allowedViews.filter((v) => !catIdSet.has(v));
                                      setNewUserForm({
                                        ...newUserForm,
                                        allowedViews: filtered
                                      });
                                    }}
                                    className="text-slate-400 hover:underline cursor-pointer"
                                  >
                                    Batalkan Kategori
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {categoryMenus.map((menu) => {
                                  const isChecked = newUserForm.allowedViews.includes(menu.id);

                                  return (
                                    <label
                                      key={menu.id}
                                      className={`flex items-start space-x-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                        isChecked
                                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let next = [...newUserForm.allowedViews];
                                          if (e.target.checked) {
                                            next.push(menu.id);
                                          } else {
                                            next = next.filter((v) => v !== menu.id);
                                          }
                                          setNewUserForm({
                                            ...newUserForm,
                                            allowedViews: next
                                          });
                                        }}
                                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-1.5">
                                          {menu.icon}
                                          <span className="font-bold text-slate-200">{menu.label}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                                          {menu.description}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Otorisasi Khusus */}
                {addModalTab === 'permissions' && (
                  <div className="space-y-4">
                    {/* Special Permissions for New User: Delete SOP & Tasks */}
                    <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-rose-400">
                          <Trash2 className="w-4 h-4" />
                          <span>Izin Khusus Penghapusan Data (Otorisasi Super Admin)</span>
                        </div>
                        {newUserForm.role === 'Super Admin (HQ)' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                            Super Admin (Otomatis Aktif)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Pilih apakah staf ini diizinkan menghapus data dokumen SOP atau tugas di sistem:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            newUserForm.canDeleteSops || newUserForm.role === 'Super Admin (HQ)'
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={newUserForm.role === 'Super Admin (HQ)'}
                            checked={newUserForm.canDeleteSops || newUserForm.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                canDeleteSops: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                          />
                          <div>
                            <span className="font-bold text-indigo-300 block">Izin Hapus Dokumen SOP</span>
                            <span className="text-[10px] text-slate-400">Pusat SOP & Panduan Standar Mutu</span>
                          </div>
                        </label>

                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            newUserForm.canDeleteTasks || newUserForm.role === 'Super Admin (HQ)'
                              ? 'bg-teal-500/10 border-teal-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={newUserForm.role === 'Super Admin (HQ)'}
                            checked={newUserForm.canDeleteTasks || newUserForm.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                canDeleteTasks: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-400"
                          />
                          <div>
                            <span className="font-bold text-teal-300 block">Izin Hapus Tugas Area</span>
                            <span className="text-[10px] text-slate-400">Rajawali Boards / Cleaning Area</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Special Permissions for New User: Material Request Approval & Revision */}
                    <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                          <FileCheck className="w-4 h-4" />
                          <span>Otorisasi Material Request (Permintaan Barang Stok Proyek)</span>
                        </div>
                        {newUserForm.role === 'Super Admin (HQ)' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                            Super Admin (Otomatis Aktif)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Tentukan apakah staf ini berwenang menyetujui (Approve), menolak (Reject), atau merevisi kuota Qty barang pada pengajuan stok lokasi proyek.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            newUserForm.canApproveMaterialRequests || newUserForm.role === 'Super Admin (HQ)'
                              ? 'bg-amber-500/10 border-amber-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={newUserForm.role === 'Super Admin (HQ)'}
                            checked={newUserForm.canApproveMaterialRequests || newUserForm.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                canApproveMaterialRequests: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
                          />
                          <div>
                            <span className="font-bold text-amber-300 block">Izin Approval / Reject</span>
                            <span className="text-[10px] text-slate-400">Bisa approve / reject pengajuan barang stok</span>
                          </div>
                        </label>

                        <label
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            newUserForm.canReviseMaterialRequests || newUserForm.role === 'Super Admin (HQ)'
                              ? 'bg-sky-500/10 border-sky-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={newUserForm.role === 'Super Admin (HQ)'}
                            checked={newUserForm.canReviseMaterialRequests || newUserForm.role === 'Super Admin (HQ)'}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                canReviseMaterialRequests: e.target.checked
                              })
                            }
                            className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400"
                          />
                          <div>
                            <span className="font-bold text-sky-300 block">Izin Revisi Qty Barang</span>
                            <span className="text-[10px] text-slate-400">Bisa menyesuaikan kuota qty item diajukan</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY MODAL FOOTER */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  {addModalTab !== 'profile' && (
                    <button
                      type="button"
                      onClick={() => setAddModalTab(addModalTab === 'permissions' ? 'menus' : 'profile')}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      ← Kembali
                    </button>
                  )}
                  {addModalTab !== 'permissions' && (
                    <button
                      type="button"
                      onClick={() => setAddModalTab(addModalTab === 'profile' ? 'menus' : 'permissions')}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    >
                      {addModalTab === 'profile' ? 'Lokasi & Menu →' : 'Otorisasi Khusus →'}
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer whitespace-nowrap"
                  >
                    Buat Akun
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE USER MODAL */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun pengguna "${userToDelete?.name}" (@${userToDelete?.username})? Pengguna tidak akan dapat login lagi ke sistem.`}
        confirmText="Ya, Hapus Pengguna"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmExecuteDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      {/* CONFIRM RESET DEFAULT MODAL */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset Akun & Hak Akses ke Bawaan"
        message="Kembalikan semua daftar akun dan hak akses menu ke pengaturan bawaan pabrik? Seluruh perubahan konfigurasi kustom akan direset."
        confirmText="Ya, Reset Bawaan"
        cancelText="Batal"
        confirmVariant="warning"
        onConfirm={confirmExecuteResetDefault}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* SYSTEM ALERT MODAL */}
      <ConfirmModal
        isOpen={Boolean(alertModalMsg)}
        title="Peringatan Keamanan Sistem"
        message={alertModalMsg || ''}
        confirmText="Mengerti"
        cancelText="Tutup"
        confirmVariant="primary"
        onConfirm={() => setAlertModalMsg(null)}
        onCancel={() => setAlertModalMsg(null)}
      />
    </div>
  );
};
