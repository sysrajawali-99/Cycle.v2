export type AttendanceStatus = 'H' | 'A' | 'I' | 'O' | '';

export type EmployeePosition = 
  | 'Cleaner'
  | 'Team Leader'
  | 'Floor Specialist'
  | 'Gardener'
  | 'Gondola / Facade Cleaner'
  | 'Supervisor'
  | (string & {});

export type ShiftType = 
  | 'Pagi (06:00 - 14:00)'
  | 'Siang (14:00 - 22:00)'
  | 'Malam (22:00 - 06:00)'
  | 'General (08:00 - 17:00)';

export type EmployeeStatus = 'Aktif' | 'Mutasi' | 'Cuti' | 'Resign';

export type FloorType = 'Marmer' | 'Granit' | 'Kramik' | 'Kayu' | 'Concrete';

export interface Project {
  id: string;
  code: string;
  name: string;
  type: 'Mall' | 'Rumah Sakit' | 'Perkantoran' | 'Apartemen' | 'Pabrik / Industri' | 'Hotel' | 'Universitas' | 'Lainnya';
  address: string;
  siteSupervisor: string;
  phone: string;
  activeCleanersCount: number;

  // Spesifikasi Detail Lokasi Proyek
  manpowerCount?: number;             // b. Jumlah Manpower
  floorCount?: number;                // c. Jumlah Lantai
  passengerLiftCount?: number;        // d. Jumlah Lift Penumpang
  serviceLiftCount?: number;          // e. Jumlah Lift Service
  escalatorCount?: number;            // f. Jumlah Eskalator
  travelatorCount?: number;           // g. Jumlah Travalator
  lobbyCount?: number;                // h. Jumlah Lobby
  basementParkingCount?: number;      // i. Jumlah Parkir Basement
  upperParkingCount?: number;         // j. Jumlah Lantai Parkir Atas
  totalToiletCount?: number;          // k. Jumlah Keseluruhan Toilet
  cubicleCount?: number;              // l. Jumlah Kubikal
  urinalCount?: number;               // m. Jumlah Urinal
  washbasinCount?: number;            // n. Jumlah Washtafel
  toiletPointsPerFloorPW?: string;    // o. Jumlah Titik Toilet Per lantai P/W

  // Jenis Lantai (Pilihan Multi-select)
  floorTypes?: FloorType[];           // Marmer, Granit, Kramik, Kayu, Concrete

  // Metadata Pendukung
  clientName?: string;
  operationalHours?: string;
  totalAreaM2?: number;
  notes?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  nik: string;
  name: string;
  phone: string;
  position: EmployeePosition;
  projectId: string;
  shift: ShiftType;
  dailyRate: number; // Rupiah per hari hadir
  status: EmployeeStatus;
  joinDate: string;
  uniformSize: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  bankName: string;
  bankAccount: string;
}

export interface TimesheetMonthRecord {
  id: string;
  employeeId: string;
  projectId: string;
  month: number; // 1 - 12
  year: number;  // e.g. 2026
  days: Record<number, AttendanceStatus>; // 1 -> 'H', 2 -> 'A', etc.
  deductionAmount: number; // Nilai potongan dalam rupiah
  deductionReason: string; // Catatan alasan potongan
  bonusAmount: number;     // Insentif / tambahan lembur
  notes: string;
}

export interface MutationHistory {
  id: string;
  employeeId: string;
  employeeName: string;
  nik: string;
  fromProjectId: string;
  fromProjectName: string;
  toProjectId: string;
  toProjectName: string;
  effectiveDate: string;
  reason: string;
  adminName: string;
  createdAt: string;
}

export type InventoryCategory = 'Chemical' | 'Equipment' | 'Consumable' | 'Safety / APD';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: InventoryCategory;
  unit: string; // e.g. 'Jerigen 5L', 'Botol 1L', 'Pcs', 'Roll', 'Unit'
  minStock: number; // Minimal threshold
  description: string;
  unitPrice: number;
  totalQty?: number;
}

export interface ProjectStock {
  id: string;
  projectId: string;
  itemId: string;
  currentStock: number;
  lastUpdated: string;
}

export interface InventoryLog {
  id: string;
  projectId: string;
  itemId: string;
  type: 'IN' | 'OUT'; // IN: Barang Masuk/Restock, OUT: Pemakaian Harian
  quantity: number;
  previousStock: number;
  newStock: number;
  date: string;
  pic: string;
  notes: string;
}

// =============================================================================
// MATERIAL REQUEST (PERMINTAAN BARANG STOK LOKASI PROYEK)
// =============================================================================
export type MaterialRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISED';
export type MaterialRequestPriority = 'Normal' | 'Urgent' | 'Kritis';

export interface MaterialRequestItem {
  id: string;
  itemId: string; // ID dari Katalog Master Chemical, Alat & APD
  itemCode: string;
  itemName: string;
  category: InventoryCategory;
  unit: string;
  currentStockAtProject?: number; // Informasi stok terkini di lokasi proyek saat pengajuan
  requestedQty: number; // Qty yang diminta
  approvedQty?: number; // Qty yang disetujui / direvisi oleh approver
  unitPrice?: number;
  notes?: string;
}

export interface MaterialRequest {
  id: string;
  requestCode: string; // e.g. MR-202609-001
  projectId: string; // Lokasi proyek target yang akan distok
  projectName: string;
  requestDate: string; // YYYY-MM-DD
  requiredDate?: string; // Target tanggal dibutuhkan
  requesterId?: string;
  requesterName: string;
  requesterRole: string;
  status: MaterialRequestStatus;
  priority: MaterialRequestPriority;
  purpose: string; // Keperluan / catatan pengajuan stok
  items: MaterialRequestItem[];
  totalItems: number;
  totalEstimatedCost: number;

  // Verifikasi Approval & Revisi
  reviewedById?: string;
  reviewedByName?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  approvalNotes?: string; // Catatan approver / alasan penolakan / alasan penyesuaian qty

  // Sinkronisasi otomatis ke stok proyek (Inbound Restock)
  isAppliedToStock?: boolean;
  appliedAt?: string;
  appliedBy?: string;

  createdAt: string;
  updatedAt?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type QCStatus = 'Pending' | 'Sesuai' | 'Maksimalkan' | 'Ulangi';
export type TaskCategoryType = 'Tugas Tambahan Harian' | 'Daily Routine' | 'Special Request' | 'Deep Cleaning' | 'Audit Finding';

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
  photo?: string; // Data URL or URL foto bukti spesifik per item checklist (1 checklist = 1 foto)
  photoUploadedAt?: string;
  notes?: string;
  itemQC?: 'Sesuai' | 'Maksimalkan' | 'Ulangi';
  itemQCNotes?: string;
}

export interface CleaningTask {
  id: string;
  projectId: string;
  areaName: string;
  taskType?: TaskCategoryType; // default 'Tugas Tambahan Harian'
  frequency: 'Harian' | 'Per-Shift' | 'Mingguan' | 'Deep Cleaning';
  assignedBy?: string; // e.g. 'Hendra Gunawan (Supervisor)'
  assignedByRole?: string; // e.g. 'Supervisor Lapangan' | 'Admin Operasional' | 'Project Manager'
  assignedEmployees: string[]; // Team Leader / Supervisor penerima tugas
  assignedLeaderName?: string; // Primary Team Leader assignee
  shift: ShiftType;
  status: TaskStatus;
  priority: 'Rutin' | 'Sedang' | 'Tinggi' | 'Urgent';
  checklist: TaskChecklistItem[];
  notes: string;
  targetCompletionTime?: string; // e.g. '11:30' or '2026-08-25 11:30'
  createdAt?: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  durationMinutes?: number; // Calculated turnaround time in minutes
  isOverdue?: boolean;

  // Foto Bukti Pekerjaan (hanya di frontend/memori display)
  evidencePhoto?: string; // Data URL string for fallback / primary visual preview
  evidencePhotoBefore?: string; // Optional before photo
  evidenceNotes?: string;

  // QC Audit Review
  qcStatus?: QCStatus;
  qcReviewedBy?: string;
  qcReviewedAt?: string;
  qcFeedback?: string;
  repeatCount?: number; // Hitungan pengulangan jika tugas diminta diulangi

  updatedAt: string;
}

export interface BlastAnnouncement {
  id: string;
  title: string;
  content: string;
  sender?: string;
  senderRole?: string;
  author?: string;
  date: string;
  category: string;
  pinned: boolean;
  targetProjectId?: string; // 'ALL' or specific projectId
}

export interface SopEquipmentItem {
  id?: string;
  name: string;
  qty: number | string;
  unit: string;
}

export interface SopChemicalItem {
  id?: string;
  name: string;
  dosage: string;
  unit: string;
}

export interface SopDocument {
  id: string;
  code?: string;
  title: string;
  category: string;
  version: string;
  description?: string;
  objective?: string; // Tujuan Pekerjaan
  equipmentList?: SopEquipmentItem[]; // Peralatan Kerja (Nama Alat, Qty, Satuan)
  chemicalList?: SopChemicalItem[]; // Chemical & Takaran Rasio (Nama Chemical, Takaran, Satuan)
  steps: string[]; // Tahapan Prosedur Kerja Standar (SOP) (1, 2, 3...)
  requiredPPE?: string[]; // APD & Alat Keselamatan (K3)
  safetyEquipment?: string[]; // APD alias
  equipmentMaintenance?: string[]; // Perawatan Peralatan
  chemicalsUsed?: string[]; // Chemical alias
  requiredChemicals?: string[]; // Chemical alias
  lastUpdated: string;
  author?: string;
}

export * from './finance';

export type SopItem = SopDocument;

export type AppView = 
  | 'dashboard'
  | 'project_settings'
  | 'timesheet'
  | 'employees'
  | 'inventory'
  | 'tasks'
  | 'blast'
  | 'sops'
  | 'sop'
  | 'reports'
  | 'finance'
  | 'finance_cash_journal'
  | 'finance_debts_receivables'
  | 'finance_investments'
  | 'finance_outflow_forecast'
  | 'finance_profit_loss'
  | 'finance_statements'
  | 'finance_bank_reconcile'
  | 'finance_analytics_audit'
  | 'access_control'
  | 'company_settings';

export type BankAccountRole =
  | 'Rekening Penerimaan Invoice'
  | 'Rekening Pembayaran Invoice'
  | 'Rekening Operasional'
  | 'Rekening Payroll'
  | 'Rekening Simpanan';

export interface CompanyBankAccount {
  id: string;
  bankName: string;            // e.g. "Bank Central Asia (BCA)"
  accountNumber: string;       // e.g. "541-0988-771"
  accountHolder: string;       // e.g. "PT RAJAWALI CYCLE INDONESIA"
  role: BankAccountRole;       // Peran Bank
  branch?: string;             // Kantor Cabang e.g. "KCU Mega Kuningan"
  swiftCode?: string;          // e.g. "CENAIDJA"
  coaAccountCode?: string;     // Kode Akun COA e.g. "1120"
  coaAccountName?: string;     // Nama Akun / Sub-Akun COA e.g. "Bank BCA - Rek Operasional"
  isPrimary?: boolean;         // Apakah rekening utama pada Kop Surat / Default
  status?: 'Aktif' | 'Nonaktif';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyProfile {
  name: string;                // e.g. "PT RAJAWALI CYCLE INDONESIA"
  brandName: string;           // e.g. "RAJAWALI CYCLE"
  tagline: string;             // e.g. "Integrated Facility Services & Enterprise Management"
  address: string;             // e.g. "Menara Rajawali Lt. 12, Jl. DR. Ide Anak Agung Gde Agung Lot 5.1, Mega Kuningan"
  city: string;                // e.g. "Jakarta Selatan 12950"
  phone: string;               // e.g. "(021) 5299-8800"
  whatsapp: string;            // e.g. "0812-9988-7766"
  email: string;               // e.g. "corporate@rajawalicycle.co.id"
  website: string;             // e.g. "www.rajawalicycle.co.id"
  taxId: string;               // NPWP e.g. "01.890.123.4-012.000"
  businessPermitNo: string;    // NIB e.g. "9120008819231"
  directorName: string;        // e.g. "Wanda I. Zeng, S.E."
  directorTitle: string;       // e.g. "Direktur Utama"
  financeManagerName: string;  // e.g. "Budi Santoso, M.Ak."
  financeManagerTitle: string; // e.g. "Finance & Accounting Lead"
  logoUrl?: string;            // custom base64 or logo URL
  bankName: string;            // Primary/Legacy bank e.g. "Bank Central Asia (BCA)"
  bankAccountNo: string;       // Primary/Legacy e.g. "541-0988-771"
  bankAccountHolder: string;   // Primary/Legacy e.g. "PT RAJAWALI CYCLE INDONESIA"
  bankAccounts?: CompanyBankAccount[]; // Multi-bank accounts dengan peran & koneksi COA
  letterheadFooterNote: string;// e.g. "Dokumen resmi dan sah diterbitkan secara digital oleh Sistem ERP Terpadu."
  updatedAt?: string;
  updatedBy?: string;
}

export type UserRole = 
  | 'Super Admin (HQ)' 
  | 'Admin Operasional' 
  | 'Admin Lokasi 1' 
  | 'Admin Lokasi 2' 
  | 'Finance & Accounting Lead'
  | 'Supervisor Lapangan' 
  | 'Manajemen Pusat';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  assignedProjectId: string; // 'ALL' or specific projectId
  isLocationLocked: boolean; // if true, site selector is fixed and locked
  allowedViews: AppView[];
  status: 'Aktif' | 'Nonaktif';
  phone?: string;
  lastLogin?: string;
  securityPin?: string; // 6-digit PIN untuk otorisasi penghapusan data & verifikasi audit
  canDeleteTasks?: boolean; // Izin Hapus Tugas di Rajawali Board
  canDeleteSops?: boolean; // Izin Hapus Dokumen SOP di Pusat SOP
  canApproveMaterialRequests?: boolean; // Izin Approval Permintaan Barang (Material Request)
  canReviseMaterialRequests?: boolean; // Izin Revisi Qty Permintaan Barang
}

// =============================================================================
// DASHBOARD WIDGET CONFIGURATION & CUSTOMIZATION
// =============================================================================
export type DashboardWidgetId =
  | 'banner'
  | 'critical_alerts'
  | 'stat_employees'
  | 'stat_attendance'
  | 'stat_inventory'
  | 'stat_payroll'
  | 'liquidity_accounts'
  | 'comparative_payroll'
  | 'comparative_manpower'
  | 'tasks_board'
  | 'blasts_announcements';

export interface DashboardWidgetSetting {
  id: DashboardWidgetId;
  label: string;
  description: string;
  category: 'Ringkasan & Metrik' | 'Keuangan & Likuiditas' | 'Analisis Komparatif' | 'Operasional & Tugas';
  visible: boolean;
}

export type DashboardWidgetsState = Record<DashboardWidgetId, boolean>;
