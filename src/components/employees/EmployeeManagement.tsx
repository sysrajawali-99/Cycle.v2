import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  ArrowRightLeft,
  Search,
  Filter,
  Building2,
  Phone,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Edit2,
  Trash2,
  Sparkles,
  Upload,
  Download,
  FileSpreadsheet,
  LayoutGrid,
  Table as TableIcon,
  FileCheck2,
  UploadCloud,
  Check,
  AlertTriangle,
  X,
  Info,
  Layers,
  FileText
} from 'lucide-react';
import {
  Project,
  Employee,
  MutationHistory,
  EmployeePosition,
  ShiftType,
  EmployeeStatus,
  UserRole
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  BulkParsedEmployee,
  downloadEmployeeTemplateXLSX,
  downloadEmployeeTemplateCSV,
  exportEmployeesToXLSX,
  parseEmployeeFile
} from '../../utils/employeeExcel';
import { ConfirmModal } from '../common/ConfirmModal';

interface EmployeeManagementProps {
  projects: Project[];
  employees: Employee[];
  mutations: MutationHistory[];
  selectedProjectId: string;
  onUpdateEmployees: (updated: Employee[]) => void;
  onAddMutation: (mutation: MutationHistory) => void;
  userRole: UserRole;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  projects = [],
  employees = [],
  mutations = [],
  selectedProjectId = 'ALL',
  onUpdateEmployees,
  onAddMutation,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'mutations'>('roster');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Default Table/Matriks mode
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>(selectedProjectId);
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [mutatingEmployee, setMutatingEmployee] = useState<Employee | null>(null);

  // Bulk Upload State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsedList, setBulkParsedList] = useState<BulkParsedEmployee[]>([]);
  const [bulkImportMode, setBulkImportMode] = useState<'append' | 'replace'>('append');
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    name: string;
    nik: string;
    phone: string;
    position: EmployeePosition;
    projectId: string;
    shift: ShiftType;
    dailyRate: number;
    status: EmployeeStatus;
    joinDate: string;
    uniformSize: 'S' | 'M' | 'L' | 'XL' | 'XXL';
    bankName: string;
    bankAccount: string;
  }>({
    name: '',
    nik: '',
    phone: '',
    position: 'Cleaner',
    projectId: projects[0]?.id || 'proj-1',
    shift: 'Pagi (06:00 - 14:00)',
    dailyRate: 130000,
    status: 'Aktif',
    joinDate: new Date().toISOString().split('T')[0],
    uniformSize: 'L',
    bankName: 'BCA',
    bankAccount: ''
  });

  // Mutation form state
  const [mutationForm, setMutationForm] = useState<{
    targetProjectId: string;
    effectiveDate: string;
    reason: string;
  }>({
    targetProjectId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Delete & Roster replace modal states
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isReplaceRosterConfirmOpen, setIsReplaceRosterConfirmOpen] = useState<boolean>(false);
  const [pendingReplaceEmployees, setPendingReplaceEmployees] = useState<Employee[]>([]);
  const [bulkAlertMsg, setBulkAlertMsg] = useState<string | null>(null);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchProject = filterProject === 'ALL' || emp.projectId === filterProject;
      const matchPosition = filterPosition === 'ALL' || emp.position === filterPosition;
      const matchStatus = filterStatus === 'ALL' || emp.status === filterStatus;

      let matchQuery = true;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        matchQuery =
          emp.name.toLowerCase().includes(q) ||
          emp.nik.toLowerCase().includes(q) ||
          emp.phone.includes(q) ||
          emp.position.toLowerCase().includes(q);
      }
      return matchProject && matchPosition && matchStatus && matchQuery;
    });
  }, [employees, filterProject, filterPosition, filterStatus, searchQuery]);

  // Download Native Excel (.xlsx) Template with separate columns
  const handleDownloadTemplateXLSX = () => {
    downloadEmployeeTemplateXLSX(projects);
  };

  // Download CSV Template with choice of delimiter (; for Excel ID, , for Standard)
  const handleDownloadTemplateCSVDelimited = (delimiter: ';' | ',' = ';') => {
    downloadEmployeeTemplateCSV(projects, delimiter);
  };

  // Export current roster to Excel (.xlsx)
  const handleExportRosterToXLSX = () => {
    exportEmployeesToXLSX(filteredEmployees, projects);
  };

  // Process Excel (.xlsx, .xls) or CSV (.csv, .txt) File with auto-detection
  const handleFileSelected = async (file: File) => {
    setBulkFile(file);
    setBulkUploadError(null);
    setBulkSuccessMsg(null);

    try {
      const parsedResults = await parseEmployeeFile(file, projects);
      setBulkParsedList(parsedResults);
    } catch (err: any) {
      setBulkUploadError(err.message || 'Gagal membaca format file.');
      setBulkParsedList([]);
    }
  };

  // Execute Bulk Import
  const handleExecuteBulkImport = () => {
    const validEmployees = bulkParsedList.filter((item) => item.isValid).map((item) => item.employee);

    if (validEmployees.length === 0) {
      setBulkAlertMsg('Tidak ada data karyawan valid untuk di-import.');
      return;
    }

    if (bulkImportMode === 'replace') {
      setPendingReplaceEmployees(validEmployees);
      setIsReplaceRosterConfirmOpen(true);
    } else {
      // Append mode - avoid exact duplicate NIKs if any
      const existingNiks = new Set(employees.map((e) => e.nik));
      const newEmployeesToAdd = validEmployees.map((ve, idx) => {
        if (existingNiks.has(ve.nik)) {
          return {
            ...ve,
            nik: `${ve.nik}-NEW${idx + 1}`
          };
        }
        return ve;
      });

      onUpdateEmployees([...employees, ...newEmployeesToAdd]);
      setBulkSuccessMsg(`Berhasil menambahkan ${newEmployeesToAdd.length} karyawan ke roster aktif!`);
      setTimeout(() => {
        setShowBulkModal(false);
        setBulkFile(null);
        setBulkParsedList([]);
        setBulkSuccessMsg(null);
      }, 1200);
    }
  };

  const confirmExecuteReplaceRoster = () => {
    if (pendingReplaceEmployees.length === 0) return;
    onUpdateEmployees(pendingReplaceEmployees);
    setBulkSuccessMsg(`Berhasil mengganti seluruh roster dengan ${pendingReplaceEmployees.length} karyawan baru!`);
    setIsReplaceRosterConfirmOpen(false);
    setTimeout(() => {
      setShowBulkModal(false);
      setBulkFile(null);
      setBulkParsedList([]);
      setBulkSuccessMsg(null);
    }, 1200);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      nik: emp.nik,
      phone: emp.phone,
      position: emp.position,
      projectId: emp.projectId,
      shift: emp.shift,
      dailyRate: emp.dailyRate,
      status: emp.status,
      joinDate: emp.joinDate,
      uniformSize: emp.uniformSize,
      bankName: emp.bankName,
      bankAccount: emp.bankAccount
    });
  };

  // Open Mutation Modal
  const handleOpenMutation = (emp: Employee) => {
    setMutatingEmployee(emp);
    const otherProjects = projects.filter((p) => p.id !== emp.projectId);
    setMutationForm({
      targetProjectId: otherProjects[0]?.id || '',
      effectiveDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  // Save new or edited employee
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Nama karyawan wajib diisi!');
      return;
    }

    if (editingEmployee) {
      // Update existing
      const updated = employees.map((emp) => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
            ...formData
          };
        }
        return emp;
      });
      onUpdateEmployees(updated);
      setEditingEmployee(null);
    } else {
      // Add new
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        ...formData,
        nik: formData.nik || `RC-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`
      };
      onUpdateEmployees([newEmp, ...employees]);
      setShowAddModal(false);
    }
  };

  // Execute Staff Mutation (Transfer to new project site)
  const handleExecuteMutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutatingEmployee || !mutationForm.targetProjectId) return;

    const fromProject = projects.find((p) => p.id === mutatingEmployee.projectId);
    const toProject = projects.find((p) => p.id === mutationForm.targetProjectId);

    if (!toProject) return;

    // Create mutation audit record
    const newMutation: MutationHistory = {
      id: `mut-${Date.now()}`,
      employeeId: mutatingEmployee.id,
      employeeName: mutatingEmployee.name,
      nik: mutatingEmployee.nik,
      fromProjectId: mutatingEmployee.projectId,
      fromProjectName: fromProject?.name || 'Unknown',
      toProjectId: toProject.id,
      toProjectName: toProject.name,
      effectiveDate: mutationForm.effectiveDate,
      reason: mutationForm.reason || 'Penugasan operasional proyek',
      adminName: userRole,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    // Update employee's project ID
    const updatedEmployees = employees.map((emp) => {
      if (emp.id === mutatingEmployee.id) {
        return {
          ...emp,
          projectId: toProject.id,
          status: 'Aktif' as EmployeeStatus
        };
      }
      return emp;
    });

    onAddMutation(newMutation);
    onUpdateEmployees(updatedEmployees);
    setMutatingEmployee(null);
  };

  // Open Delete / Resign Modal
  const handleOpenDeleteEmployee = (emp: Employee) => {
    setEmployeeToDelete(emp);
  };

  const handleConfirmResignEmployee = () => {
    if (!employeeToDelete) return;
    const targetId = employeeToDelete.id;
    const updated = employees.map((emp) => {
      if (emp.id === targetId) {
        return { ...emp, status: 'Resign' as EmployeeStatus };
      }
      return emp;
    });
    onUpdateEmployees(updated);
    setEmployeeToDelete(null);
  };

  const handleConfirmPermanentDeleteEmployee = () => {
    if (!employeeToDelete) return;
    const targetId = employeeToDelete.id;
    const updated = employees.filter((emp) => emp.id !== targetId);
    onUpdateEmployees(updated);
    setEmployeeToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Data Karyawan & Penempatan Lokasi
                </h1>
                <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {employees.filter((e) => e.status !== 'Resign').length} Personil Aktif
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola profil personil cleaning service, penetapan shift, rate harian, import CSV massal, dan mutasi antar lokasi.
              </p>
            </div>
          </div>

          {/* Action Buttons: Add employee & Bulk Upload & Download Template & Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Download Template Dropdown / Group */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                id="download-template-excel-btn"
                onClick={handleDownloadTemplateXLSX}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-bold text-xs rounded-lg border border-emerald-500/40 transition cursor-pointer"
                title="Unduh Template Excel (.xlsx) resmi dengan kolom terpisah otomatis"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Template Excel (.xlsx)</span>
              </button>
              <button
                id="download-template-csv-btn"
                onClick={() => handleDownloadTemplateCSVDelimited(';')}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                title="Unduh Template CSV (Titik Koma ';' - Standar Excel Indonesia)"
              >
                <Download className="w-3 h-3 text-slate-400" />
                <span>CSV (;)</span>
              </button>
            </div>

            {/* Export Current Roster */}
            <button
              id="export-roster-excel-btn"
              onClick={handleExportRosterToXLSX}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              title="Export data personil yang sedang ditampilkan ke format Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Roster (.xlsx)</span>
            </button>

            {/* Bulk Upload Modal Opener */}
            <button
              id="bulk-upload-employee-btn"
              onClick={() => {
                setBulkFile(null);
                setBulkParsedList([]);
                setBulkUploadError(null);
                setBulkSuccessMsg(null);
                setShowBulkModal(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white font-bold text-xs rounded-xl border border-blue-500/40 shadow-sm transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Upload Massal (Excel / CSV)</span>
            </button>

            {/* Add Single Employee */}
            <button
              id="add-employee-btn"
              onClick={() => {
                setFormData({
                  name: '',
                  nik: `RC-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`,
                  phone: '',
                  position: 'Cleaner',
                  projectId: filterProject !== 'ALL' ? filterProject : projects[0]?.id || 'proj-1',
                  shift: 'Pagi (06:00 - 14:00)',
                  dailyRate: 130000,
                  status: 'Aktif',
                  joinDate: new Date().toISOString().split('T')[0],
                  uniformSize: 'L',
                  bankName: 'BCA',
                  bankAccount: ''
                });
                setShowAddModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Karyawan</span>
            </button>
          </div>
        </div>

        {/* Tab & View Mode Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800">
          <div className="flex space-x-2">
            <button
              id="tab-roster-btn"
              onClick={() => setActiveTab('roster')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'roster'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Daftar Roster Personil ({employees.filter((e) => e.status !== 'Resign').length})</span>
            </button>
            <button
              id="tab-mutations-btn"
              onClick={() => setActiveTab('mutations')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'mutations'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat Mutasi Lokasi ({mutations.length})</span>
            </button>
          </div>

          {/* View Mode Toggle: Table / Matrix vs Cards */}
          {activeTab === 'roster' && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
              <button
                id="view-table-mode-btn"
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Matriks / Tabel Roster Lengkap"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Mode Matriks / Tabel</span>
              </button>
              <button
                id="view-grid-mode-btn"
                onClick={() => setViewMode('grid')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Kartu Personil"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Mode Kartu</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'roster' ? (
        <>
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="employee-search-input"
                type="text"
                placeholder="Cari nama, NIK, no HP, posisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            {/* Filter Project */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="employee-filter-project"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Semua Lokasi Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Position */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
              <span className="text-xs text-slate-400 shrink-0">Posisi:</span>
              <select
                id="employee-filter-position"
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Semua Posisi</option>
                <option value="Cleaner" className="bg-slate-900">Cleaner</option>
                <option value="Team Leader" className="bg-slate-900">Team Leader</option>
                <option value="Floor Specialist" className="bg-slate-900">Floor Specialist</option>
                <option value="Gardener" className="bg-slate-900">Gardener</option>
                <option value="Gondola / Facade Cleaner" className="bg-slate-900">Gondola Cleaner</option>
                <option value="Supervisor" className="bg-slate-900">Supervisor</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
              <span className="text-xs text-slate-400 shrink-0">Status:</span>
              <select
                id="employee-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Semua Status</option>
                <option value="Aktif" className="bg-slate-900">Aktif</option>
                <option value="Cuti" className="bg-slate-900">Cuti</option>
                <option value="Mutasi" className="bg-slate-900">Mutasi</option>
                <option value="Resign" className="bg-slate-900">Resign / Nonaktif</option>
              </select>
            </div>
          </div>

          {/* VIEW MODE 1: MATRIKS / TABEL VIEW */}
          {viewMode === 'table' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TableIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Matriks Data Roster Personil ({filteredEmployees.length} Data Ditampilkan)
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Total Rate Harian:{' '}
                  <strong className="text-amber-400">
                    {formatCurrency(filteredEmployees.reduce((acc, e) => acc + (e.status === 'Aktif' ? e.dailyRate : 0), 0))} / hari
                  </strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">NIK</th>
                      <th className="py-3 px-3">Nama Karyawan & Status</th>
                      <th className="py-3 px-3">Posisi / Jabatan</th>
                      <th className="py-3 px-3">Lokasi Penempatan</th>
                      <th className="py-3 px-3">Shift Kerja</th>
                      <th className="py-3 px-3 text-right">Rate / Hari</th>
                      <th className="py-3 px-3">Kontak / HP</th>
                      <th className="py-3 px-3 text-center">Tgl Masuk & Seragam</th>
                      <th className="py-3 px-3">Bank & No. Rekening</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-500">
                          <p className="text-sm font-semibold text-slate-400">Karyawan tidak ditemukan.</p>
                          <p className="text-xs mt-1">Ubah kata kunci pencarian atau tambah karyawan baru.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp, index) => {
                        const proj = projects.find((p) => p.id === emp.projectId);
                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            <td className="py-3 px-3 text-center text-slate-500 font-mono font-bold">
                              {index + 1}
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-amber-400">
                              {emp.nik}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-amber-300 shrink-0">
                                  {emp.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-xs">{emp.name}</div>
                                  <span
                                    className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${
                                      emp.status === 'Aktif'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : emp.status === 'Cuti'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        : emp.status === 'Mutasi'
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                        : 'bg-slate-700 text-slate-400 border-slate-600'
                                    }`}
                                  >
                                    {emp.status}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-300">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200">
                                {emp.position}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-1.5 text-slate-200">
                                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="font-semibold truncate max-w-[150px]">{proj?.name || '-'}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{proj?.code || ''}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                                <span>{emp.shift}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-amber-400 font-mono">
                              {formatCurrency(emp.dailyRate)}
                            </td>
                            <td className="py-3 px-3 text-slate-300 font-mono">
                              {emp.phone || '-'}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-400">
                              <div>{emp.joinDate || '-'}</div>
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">
                                Size: {emp.uniformSize}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div className="font-bold text-slate-200">{emp.bankName || '-'}</div>
                              <div className="font-mono text-[10px] text-slate-400">{emp.bankAccount || '-'}</div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  id={`table-mutate-btn-${emp.id}`}
                                  onClick={() => handleOpenMutation(emp)}
                                  title="Pindah / Mutasi Site"
                                  className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 transition cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`table-edit-btn-${emp.id}`}
                                  onClick={() => handleOpenEdit(emp)}
                                  title="Edit Profil"
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`table-delete-btn-${emp.id}`}
                                  onClick={() => handleOpenDeleteEmployee(emp)}
                                  title={emp.status === 'Resign' ? 'Hapus Data Karyawan' : 'Nonaktifkan / Resign / Hapus'}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW MODE 2: EMPLOYEE CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.length === 0 ? (
                <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                  <p className="text-base font-semibold text-slate-400">Karyawan tidak ditemukan.</p>
                  <p className="text-xs">Ubah kriteria pencarian atau tambahkan data karyawan baru.</p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const proj = projects.find((p) => p.id === emp.projectId);
                  return (
                    <div
                      key={emp.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition-all space-y-3 flex flex-col justify-between"
                    >
                      {/* Top: Name, Position, Status */}
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-white text-base leading-snug">{emp.name}</h3>
                            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                              <span className="text-amber-400 font-semibold">{emp.position}</span>
                              <span>•</span>
                              <span className="text-slate-500">{emp.nik}</span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              emp.status === 'Aktif'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : emp.status === 'Cuti'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : emp.status === 'Mutasi'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-slate-700 text-slate-400 border-slate-600'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </div>

                        {/* Detail attributes */}
                        <div className="mt-3 space-y-1.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-500 flex items-center space-x-1">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Lokasi Proyek:</span>
                            </span>
                            <span className="font-semibold text-slate-200 text-right truncate max-w-[150px]">
                              {proj?.name || '-'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-500 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              <span>Shift Kerja:</span>
                            </span>
                            <span className="text-slate-300">{emp.shift}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-500 flex items-center space-x-1">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>No. Kontak:</span>
                            </span>
                            <span className="text-slate-300">{emp.phone}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-500 flex items-center space-x-1">
                              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                              <span>Rate Gaji / Hari:</span>
                            </span>
                            <span className="font-bold text-amber-400">
                              {formatCurrency(emp.dailyRate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: Edit, Mutate, Delete */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          id={`mutate-btn-${emp.id}`}
                          onClick={() => handleOpenMutation(emp)}
                          title="Pindah / Mutasi ke Proyek Lain"
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Pindah Site</span>
                        </button>

                        <button
                          id={`edit-emp-btn-${emp.id}`}
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit Profil Karyawan"
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`delete-emp-btn-${emp.id}`}
                          onClick={() => handleOpenDeleteEmployee(emp)}
                          title={emp.status === 'Resign' ? 'Hapus Data Karyawan' : 'Nonaktifkan / Resign / Hapus'}
                          className="p-2 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      ) : (
        /* Mutations History Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Catatan Audit Mutasi & Rotasi Lapangan</h3>
              <p className="text-xs text-slate-400">
                Log resmi pemindahan karyawan antar lokasi proyek untuk transparansi roaster dan timesheet.
              </p>
            </div>
            <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
              {mutations.length} Mutasi Tercatat
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {mutations.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Belum ada riwayat mutasi karyawan.
              </div>
            ) : (
              mutations.map((mut) => (
                <div key={mut.id} className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{mut.employeeName}</span>
                      <span className="text-slate-500">({mut.nik})</span>
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-500/30">
                        Mutasi Sukses
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-300">
                      <span className="text-rose-400 font-medium">{mut.fromProjectName}</span>
                      <span className="text-amber-400">➔</span>
                      <span className="text-emerald-400 font-bold">{mut.toProjectName}</span>
                    </div>

                    <p className="text-slate-400 italic">"{mut.reason}"</p>
                  </div>

                  <div className="text-right space-y-1 text-slate-400 shrink-0">
                    <div>Tgl Berlaku: <span className="font-semibold text-slate-200">{mut.effectiveDate}</span></div>
                    <div className="text-[11px]">Diproses oleh: <span className="text-amber-400">{mut.adminName}</span></div>
                    <div className="text-[10px] text-slate-500">{mut.createdAt}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL UPLOAD MASSAL KARYAWAN (EXCEL .XLSX / CSV BULK IMPORT) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Massal Data Karyawan (Excel .xlsx / CSV)</h3>
                  <p className="text-xs text-slate-400">
                    Import puluhan data personil, penempatan lokasi gedung, rate harian, dan shift kerja dalam satu file.
                  </p>
                </div>
              </div>
              <button
                id="close-bulk-modal-btn"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setBulkParsedList([]);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Step 1: Download Template Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200 text-xs flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Langkah 1: Unduh Template Resmi (Kolom Terpisah A-L)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Format template telah disetel dengan kolom terpisah presisi dari Kolom A sampai L untuk mencegah data menumpuk dalam 1 kolom di Microsoft Excel / Google Sheets.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      id="modal-download-template-excel-btn"
                      onClick={handleDownloadTemplateXLSX}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer transition"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Unduh Excel (.xlsx) [Rekomendasi]</span>
                    </button>
                    <button
                      id="modal-download-template-csv-semi-btn"
                      onClick={() => handleDownloadTemplateCSVDelimited(';')}
                      className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 shrink-0 cursor-pointer transition"
                      title="Format CSV dengan titik koma (;) standar Microsoft Excel Indonesia"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>CSV (;)</span>
                    </button>
                    <button
                      id="modal-download-template-csv-comma-btn"
                      onClick={() => handleDownloadTemplateCSVDelimited(',')}
                      className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 shrink-0 cursor-pointer transition"
                      title="Format CSV standar koma (,)"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>CSV (,)</span>
                    </button>
                  </div>
                </div>

                {/* Visual Column Mapping Legend */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1.5 flex items-center space-x-1">
                    <Info className="w-3 h-3 text-amber-400" />
                    <span>Struktur 12 Kolom Template:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 text-[10px]">
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">A:</strong> <span className="text-slate-200">Nama Lengkap</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">B:</strong> <span className="text-slate-200">NIK (ID Personil)</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">C:</strong> <span className="text-slate-200">No HP / WA</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">D:</strong> <span className="text-slate-200">Posisi / Jabatan</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">E:</strong> <span className="text-slate-200">Lokasi Proyek</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">F:</strong> <span className="text-slate-200">Shift Kerja</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">G:</strong> <span className="text-slate-200">Rate Harian (Rp)</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">H:</strong> <span className="text-slate-200">Status Keaktifan</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">I:</strong> <span className="text-slate-200">Tgl Bergabung</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">J:</strong> <span className="text-slate-200">Ukuran Seragam</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">K:</strong> <span className="text-slate-200">Nama Bank</span>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <strong className="text-amber-400">L:</strong> <span className="text-slate-200">Nomor Rekening</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: File Upload Dropzone */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold text-xs">
                  Langkah 2: Pilih atau Tarik File (.xlsx / .xls / .csv)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    id="bulk-csv-file-input"
                    type="file"
                    accept=".xlsx, .xls, .csv, text/csv, text/plain, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      {bulkFile ? bulkFile.name : 'Klik untuk memilih file Excel (.xlsx) atau CSV dari perangkat Anda'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Mendukung file Excel asli (.xlsx / .xls) dan file CSV (koma / titik koma / tab). Sistem otomatis memetakan kolom secara akurat.
                    </span>
                  </div>
                  {bulkFile && (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>File terpilih: {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Errors or Success Alert */}
              {bulkUploadError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkUploadError}</span>
                </div>
              )}

              {bulkSuccessMsg && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center space-x-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}

              {/* Step 3: Parsed Data Preview */}
              {bulkParsedList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-white text-xs flex items-center space-x-2">
                      <span>Pratinjau Data ({bulkParsedList.length} Baris Terbaca)</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                        {bulkParsedList.filter((r) => r.isValid).length} Valid
                      </span>
                      {bulkParsedList.some((r) => !r.isValid) && (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px]">
                          {bulkParsedList.filter((r) => !r.isValid).length} Error
                        </span>
                      )}
                    </span>

                    {/* Import Mode: Append vs Replace */}
                    <div className="flex items-center space-x-3 text-[11px] bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={bulkImportMode === 'append'}
                          onChange={() => setBulkImportMode('append')}
                          className="text-amber-500"
                        />
                        <span className="text-slate-300">Tambahkan ke Roster (Append)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={bulkImportMode === 'replace'}
                          onChange={() => setBulkImportMode('replace')}
                          className="text-amber-500"
                        />
                        <span className="text-rose-400">Ganti Seluruh Roster</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-950 text-slate-400 font-bold sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Status</th>
                          <th className="py-2 px-2.5">NIK</th>
                          <th className="py-2 px-2.5">Nama Karyawan</th>
                          <th className="py-2 px-2.5">Posisi</th>
                          <th className="py-2 px-2.5">Lokasi Proyek</th>
                          <th className="py-2 px-2.5">Shift</th>
                          <th className="py-2 px-2.5 text-right">Rate Harian</th>
                          <th className="py-2 px-2.5">Status</th>
                          <th className="py-2 px-2.5">Bank & Rekening</th>
                          <th className="py-2 px-2.5">Catatan Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {bulkParsedList.map((item, idx) => {
                          const proj = projects.find((p) => p.id === item.employee.projectId);
                          return (
                            <tr
                              key={idx}
                              className={item.isValid ? 'hover:bg-slate-800/40' : 'bg-rose-950/20 text-rose-300'}
                            >
                              <td className="py-1.5 px-2.5">
                                {item.isValid ? (
                                  <span className="text-emerald-400 font-bold">✓ OK</span>
                                ) : (
                                  <span className="text-rose-400 font-bold">✗ Error</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-amber-300">{item.employee.nik}</td>
                              <td className="py-1.5 px-2.5 font-bold text-white">{item.employee.name}</td>
                              <td className="py-1.5 px-2.5 text-slate-300">{item.employee.position}</td>
                              <td className="py-1.5 px-2.5 text-slate-300">{proj?.name || item.employee.projectId}</td>
                              <td className="py-1.5 px-2.5 text-slate-400">{item.employee.shift}</td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-amber-400">
                                {formatCurrency(item.employee.dailyRate)}
                              </td>
                              <td className="py-1.5 px-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.employee.status === 'Aktif' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                                }`}>
                                  {item.employee.status}
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-400">
                                {item.employee.bankName} {item.employee.bankAccount ? `(${item.employee.bankAccount})` : '-'}
                              </td>
                              <td className="py-1.5 px-2.5 text-[10px] text-slate-400">
                                {item.errors.length > 0 ? (
                                  <span className="text-rose-400 font-semibold">{item.errors.join(', ')}</span>
                                ) : item.warnings.length > 0 ? (
                                  <span className="text-amber-400">{item.warnings.join(', ')}</span>
                                ) : (
                                  <span className="text-emerald-400">Siap di-import</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <span className="text-[11px] text-slate-400">
                {bulkParsedList.length > 0 ? (
                  <>
                    Total{' '}
                    <strong className="text-amber-400">
                      {bulkParsedList.filter((r) => r.isValid).length}
                    </strong>{' '}
                    karyawan siap di-import
                  </>
                ) : (
                  'Pilih file Excel atau CSV untuk memulai'
                )}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  id="cancel-bulk-modal-btn"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkFile(null);
                    setBulkParsedList([]);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="confirm-execute-bulk-import-btn"
                  disabled={bulkParsedList.filter((r) => r.isValid).length === 0}
                  onClick={handleExecuteBulkImport}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>
                    Import {bulkParsedList.filter((r) => r.isValid).length} Karyawan
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {(showAddModal || editingEmployee) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
                <p className="text-xs text-slate-400">
                  Data akan otomatis muncul di Eagle Timesheet lokasi penempatan.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEmployee(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap:</label>
                  <input
                    id="modal-emp-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Contoh: Muhammad Rizky"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">NIK (Nomor Induk Karyawan):</label>
                  <input
                    id="modal-emp-nik"
                    type="text"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    placeholder="RC-20260101"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Posisi / Jabatan:</label>
                  <select
                    id="modal-emp-position"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value as EmployeePosition })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cleaner">Cleaner (Petugas Kebersihan)</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Floor Specialist">Floor Specialist (Kristalisasi)</option>
                    <option value="Gardener">Gardener (Taman)</option>
                    <option value="Gondola / Facade Cleaner">Gondola Cleaner (Kaca Gedung)</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lokasi Proyek Penempatan:</label>
                  <select
                    id="modal-emp-project"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shift Kerja:</label>
                  <select
                    id="modal-emp-shift"
                    value={formData.shift}
                    onChange={(e) =>
                      setFormData({ ...formData, shift: e.target.value as ShiftType })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Pagi (06:00 - 14:00)">Pagi (06:00 - 14:00)</option>
                    <option value="Siang (14:00 - 22:00)">Siang (14:00 - 22:00)</option>
                    <option value="Malam (22:00 - 06:00)">Malam (22:00 - 06:00)</option>
                    <option value="General (08:00 - 17:00)">General (08:00 - 17:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rate Gaji Harian (Rp):</label>
                  <input
                    id="modal-emp-dailyrate"
                    type="number"
                    min="50000"
                    step="5000"
                    required
                    value={formData.dailyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, dailyRate: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor WhatsApp / HP:</label>
                  <input
                    id="modal-emp-phone"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    placeholder="0812-xxxx-xxxx"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ukuran Seragam:</label>
                  <select
                    id="modal-emp-uniform"
                    value={formData.uniformSize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        uniformSize: e.target.value as 'S' | 'M' | 'L' | 'XL' | 'XXL'
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bank Penggajian:</label>
                  <input
                    id="modal-emp-bankname"
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    placeholder="BCA / Mandiri / BRI"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Rekening Bank:</label>
                  <input
                    id="modal-emp-bankacc"
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Nomor rekening transfer payroll"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="modal-save-emp-btn"
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  {editingEmployee ? 'Simpan Perubahan' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mutation (Transfer Site) Modal */}
      {mutatingEmployee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Mutasi / Pindah Lokasi Proyek</h3>
                <p className="text-xs text-slate-400">
                  {mutatingEmployee.name} ({mutatingEmployee.position})
                </p>
              </div>
              <button
                onClick={() => setMutatingEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteMutation} className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500">Lokasi Asal Saat Ini:</div>
                <div className="font-bold text-amber-400 text-sm">
                  {projects.find((p) => p.id === mutatingEmployee.projectId)?.name}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Pindahkan ke Lokasi Proyek Baru:
                </label>
                <select
                  id="mutation-target-project"
                  required
                  value={mutationForm.targetProjectId}
                  onChange={(e) =>
                    setMutationForm({ ...mutationForm, targetProjectId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
                >
                  {projects
                    .filter((p) => p.id !== mutatingEmployee.projectId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type} - {p.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tanggal Efektif Mulai Bertugas:
                </label>
                <input
                  id="mutation-effective-date"
                  type="date"
                  required
                  value={mutationForm.effectiveDate}
                  onChange={(e) =>
                    setMutationForm({ ...mutationForm, effectiveDate: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alasan Pemindahan / Mutasi:
                </label>
                <textarea
                  id="mutation-reason"
                  rows={2}
                  required
                  value={mutationForm.reason}
                  onChange={(e) =>
                    setMutationForm({ ...mutationForm, reason: e.target.value })
                  }
                  placeholder="Contoh: Penambahan tenaga kerja area lobby, rotasi bulanan..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMutatingEmployee(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="execute-mutation-submit-btn"
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20"
                >
                  Eksekusi Mutasi Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE / RESIGN EMPLOYEE */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Kelola Status / Hapus Karyawan</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih tindakan yang ingin dilakukan untuk <b>{employeeToDelete.name}</b> (NIK: {employeeToDelete.nik}, Jabatan: {employeeToDelete.position}).
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {employeeToDelete.status !== 'Resign' && (
                <button
                  type="button"
                  onClick={handleConfirmResignEmployee}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200">
                      Ubah Status Jadi Resign / Nonaktif
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Karyawan tidak akan aktif di roster penugasan namun riwayatnya tetap tersimpan.
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmPermanentDeleteEmployee}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-left transition cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200">
                    Hapus Data Karyawan Secara Permanen
                  </div>
                  <div className="text-[11px] text-rose-300/70 mt-0.5">
                    Menghapus data karyawan dari database secara permanen.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM BULK REPLACE ROSTER */}
      <ConfirmModal
        isOpen={isReplaceRosterConfirmOpen}
        title="Ganti Seluruh Roster Karyawan"
        message={`PERINGATAN: Mode Ganti Roster akan menghapus ${employees.length} data karyawan yang ada dan menggantikannya dengan ${pendingReplaceEmployees.length} karyawan baru dari file import. Lanjutkan?`}
        confirmText="Ya, Ganti Semua Roster"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmExecuteReplaceRoster}
        onCancel={() => setIsReplaceRosterConfirmOpen(false)}
      />

      {/* BULK ALERT MODAL */}
      <ConfirmModal
        isOpen={Boolean(bulkAlertMsg)}
        title="Informasi Import"
        message={bulkAlertMsg || ''}
        confirmText="Mengerti"
        cancelText="Tutup"
        confirmVariant="primary"
        onConfirm={() => setBulkAlertMsg(null)}
        onCancel={() => setBulkAlertMsg(null)}
      />
    </div>
  );
};
