import {
  Project,
  Employee,
  TimesheetMonthRecord,
  MutationHistory,
  InventoryItem,
  ProjectStock,
  InventoryLog,
  MaterialRequest,
  CleaningTask,
  BlastAnnouncement,
  SopDocument,
  UserAccount,
  CompanyProfile
} from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    code: 'MGC-01',
    name: 'Mall Gandaria City',
    type: 'Mall',
    address: 'Jl. Sultan Iskandar Muda, Kebayoran Lama, Jakarta Selatan',
    siteSupervisor: 'Hendra Gunawan',
    phone: '0812-3456-7890',
    activeCleanersCount: 14,
    manpowerCount: 14,
    floorCount: 7,
    passengerLiftCount: 8,
    serviceLiftCount: 4,
    escalatorCount: 16,
    travelatorCount: 4,
    lobbyCount: 3,
    basementParkingCount: 3,
    upperParkingCount: 2,
    totalToiletCount: 24,
    cubicleCount: 72,
    urinalCount: 48,
    washbasinCount: 60,
    toiletPointsPerFloorPW: '4 Pria / 4 Wanita per lantai (Total 8 Titik/Lantai)',
    floorTypes: ['Marmer', 'Granit', 'Kramik'],
    clientName: 'PT Pakuwon Jati Tbk',
    operationalHours: '10:00 - 22:00 WIB (Cleaning 24 Jam)',
    totalAreaM2: 65000,
    notes: 'Prioritas kebersihan area High-Traffic atrium, eskalator, dan toilet pengunjung.',
    updatedAt: '2026-08-26'
  },
  {
    id: 'proj-2',
    code: 'RSM-02',
    name: 'RS Medika Utama',
    type: 'Rumah Sakit',
    address: 'Jl. Kesehatan Raya No. 45, Jakarta Pusat',
    siteSupervisor: 'Bambang Supriyadi',
    phone: '0813-9876-5432',
    activeCleanersCount: 18,
    manpowerCount: 18,
    floorCount: 9,
    passengerLiftCount: 6,
    serviceLiftCount: 3,
    escalatorCount: 2,
    travelatorCount: 0,
    lobbyCount: 2,
    basementParkingCount: 2,
    upperParkingCount: 0,
    totalToiletCount: 36,
    cubicleCount: 84,
    urinalCount: 36,
    washbasinCount: 78,
    toiletPointsPerFloorPW: '2 Pria / 2 Wanita + 1 Khusus per lantai',
    floorTypes: ['Granit', 'Kramik', 'Concrete'],
    clientName: 'Yayasan Medika Sehat Utama',
    operationalHours: '24 Jam Non-Stop (3 Shift Rotasi)',
    totalAreaM2: 42000,
    notes: 'Protokol sterilisasi desinfektan ketat untuk ruang rawat inap dan area IGD.',
    updatedAt: '2026-08-26'
  },
  {
    id: 'proj-3',
    code: 'MBT-03',
    name: 'Menara Bintang Tower',
    type: 'Perkantoran',
    address: 'Jl. Jend. Sudirman Kav. 52-53, SCBD, Jakarta Selatan',
    siteSupervisor: 'Dedi Kurniawan',
    phone: '0857-1122-3344',
    activeCleanersCount: 12,
    manpowerCount: 12,
    floorCount: 28,
    passengerLiftCount: 12,
    serviceLiftCount: 2,
    escalatorCount: 4,
    travelatorCount: 0,
    lobbyCount: 1,
    basementParkingCount: 4,
    upperParkingCount: 0,
    totalToiletCount: 56,
    cubicleCount: 112,
    urinalCount: 84,
    washbasinCount: 112,
    toiletPointsPerFloorPW: '2 Pria / 2 Wanita per lantai perkantoran',
    floorTypes: ['Marmer', 'Granit', 'Kayu', 'Kramik'],
    clientName: 'Bintang Capital Management',
    operationalHours: '07:00 - 19:00 WIB (Deep Cleaning Malam)',
    totalAreaM2: 58000,
    notes: 'Perawatan khusus lantai marmer lobby dan parquet kayu di executive lounge.',
    updatedAt: '2026-08-26'
  },
  {
    id: 'proj-4',
    code: 'SPR-04',
    name: 'Senopati Park Residence',
    type: 'Apartemen',
    address: 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan',
    siteSupervisor: 'Agus Wijaya',
    phone: '0878-5566-7788',
    activeCleanersCount: 10,
    manpowerCount: 10,
    floorCount: 22,
    passengerLiftCount: 4,
    serviceLiftCount: 2,
    escalatorCount: 0,
    travelatorCount: 0,
    lobbyCount: 2,
    basementParkingCount: 3,
    upperParkingCount: 1,
    totalToiletCount: 12,
    cubicleCount: 24,
    urinalCount: 16,
    washbasinCount: 20,
    toiletPointsPerFloorPW: '1 Pria / 1 Wanita di Fasilitas Umum & Lobby',
    floorTypes: ['Marmer', 'Kayu', 'Kramik', 'Granit'],
    clientName: 'Perhimpunan Penghuni Senopati Park',
    operationalHours: '24 Jam Security & General Cleaning',
    totalAreaM2: 36000,
    notes: 'Fokus area koridor residential, pool deck, gym, dan lobby lounge.',
    updatedAt: '2026-08-26'
  },
  {
    id: 'proj-5',
    code: 'KIJ-05',
    name: 'Kawasan Industri Jababeka Plant B',
    type: 'Pabrik / Industri',
    address: 'Kawasan Industri Jababeka V Blok C, Cikarang, Bekasi',
    siteSupervisor: 'Rudi Hartono',
    phone: '0821-4433-2211',
    activeCleanersCount: 16,
    manpowerCount: 16,
    floorCount: 3,
    passengerLiftCount: 2,
    serviceLiftCount: 4,
    escalatorCount: 0,
    travelatorCount: 0,
    lobbyCount: 1,
    basementParkingCount: 0,
    upperParkingCount: 0,
    totalToiletCount: 18,
    cubicleCount: 54,
    urinalCount: 36,
    washbasinCount: 48,
    toiletPointsPerFloorPW: '3 Pria / 3 Wanita per blok produksi',
    floorTypes: ['Concrete', 'Kramik', 'Granit'],
    clientName: 'PT Multi Karya Manufaktur',
    operationalHours: '24 Jam Non-Stop (3 Shift Produksi)',
    totalAreaM2: 78000,
    notes: 'Degreasing lantai concrete pabrik, pembersihan debu industri dan fasilitas locker.',
    updatedAt: '2026-08-26'
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_MUTATIONS: MutationHistory[] = [];

export function generateSeedTimesheets(_employees: Employee[]): TimesheetMonthRecord[] {
  return [];
}

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];

export const INITIAL_PROJECT_STOCKS: ProjectStock[] = [];

export const INITIAL_INVENTORY_LOGS: InventoryLog[] = [];

export const INITIAL_MATERIAL_REQUESTS: MaterialRequest[] = [];

export const INITIAL_TASKS: CleaningTask[] = [];

export const INITIAL_BLASTS: BlastAnnouncement[] = [];

export const INITIAL_SOPS: SopDocument[] = [
  {
    id: 'sop-1',
    code: 'SOP-RC-RESTROOM-01',
    title: 'SOP Pembersihan Standar Toilet Komersial (Restroom Sanitizing)',
    category: 'Restroom Care',
    version: 'v3.2',
    description: 'Prosedur baku pembersihan menyeluruh toilet umum untuk menjamin higienitas, bebas bau, dan kepuasan pengunjung gedung.',
    objective: 'Menjamin seluruh fasilitas toilet bersih, wangi, higienis bebas kuman/bakteri, serta aman digunakan oleh seluruh pengunjung gedung tanpa risiko licin.',
    equipmentList: [
      { name: 'Double Bucket & Wringer Trolley', qty: 1, unit: 'Set' },
      { name: 'Microfiber Mop Set & Handle', qty: 1, unit: 'Set' },
      { name: 'Toilet Bowl Brush (Sikat Kloset)', qty: 2, unit: 'Pcs' },
      { name: 'Kain Microfiber Merah (Kloset/Urinoir)', qty: 3, unit: 'Lembar' },
      { name: 'Kain Microfiber Biru (Wastafel & Cermin)', qty: 3, unit: 'Lembar' },
      { name: 'Kain Microfiber Kuning (Dinding & Partisi)', qty: 2, unit: 'Lembar' },
      { name: 'Warning Sign "Caution Wet Floor"', qty: 2, unit: 'Unit' },
      { name: 'Sprayer Bottle 500ml Bertanda', qty: 3, unit: 'Botol' }
    ],
    chemicalList: [
      { name: 'Karbol Pine Disinfectant', dosage: '1 : 20', unit: 'ml/L Air' },
      { name: 'Neutral Floor Cleaner (Pembersih Lantai)', dosage: '20 ml per 5 Liter', unit: 'ml/5L' },
      { name: 'Glass Cleaner (Pembersih Cermin/Kaca)', dosage: 'Langsung Pakai (RTU)', unit: 'Sprayer' },
      { name: 'Hand Soap Refill Premium', dosage: 'Sesuai Dispenser', unit: 'ml' },
      { name: 'Bowl Cleaner (Asam Lembut)', dosage: '50 ml per mangkuk', unit: 'ml/Kloset' }
    ],
    steps: [
      'Pasang papan peringatan Yellow Caution "Wet Floor" di depan pintu masuk toilet.',
      'Siram kloset dan urinoir dengan air bersih, tuangkan Karbol Disinfectant pada dinding dalam mangkuk kloset dan diamkan 3 menit.',
      'Sikat mangkuk kloset dengan toilet brush dari bagian dalam ke luar, lalu bilas (flush) sampai bersih.',
      'Bersihkan wastafel, kran, dan cermin menggunakan kain Microfiber Biru dan Glass Cleaner.',
      'Lap partisi pintu dan pegangan pintu dengan lap Microfiber Kuning dan disinfektan.',
      'Sapu lantai toilet dari sudut terdalam ke arah pintu keluar.',
      'Mopping lantai menggunakan larutan Neutral Floor Cleaner, pastikan lantai cepat kering.',
      'Cek kelengkapan Tissue, Hand Soap, dan Pengharum Ruangan.',
      'Lepas Caution Sign setelah lantai benar-benar kering dan paraf checklist pintu.'
    ],
    requiredPPE: [
      'Sarung Tangan Karet (Rubber Gloves)',
      'Masker Medis / Karbon 3-Ply',
      'Sepatu Safety Anti-Slip (Rubber Sole)',
      'Apron Plastik Pelindung'
    ],
    safetyEquipment: ['Sarung Tangan Karet (Rubber Gloves)', 'Masker Medis', 'Sepatu Anti-Slip'],
    chemicalsUsed: ['Karbol Pine Disinfectant', 'Neutral Floor Cleaner', 'Glass Cleaner', 'Hand Soap'],
    equipmentMaintenance: [
      'Cuci bersih seluruh kain microfiber sesuai kode warna dan jemur di ruang jemur berventilasi.',
      'Kuras dan bilas ember double bucket, jangan biarkan air kotor mengendap di dalam ember.',
      'Bilas sikat kloset dengan air mengalir dan rendam sebentar dalam larutan disinfektan.',
      'Pastikan botol semprotan terkunci rapat dan dilap kering sebelum disimpan di rak gudang.'
    ],
    lastUpdated: '2026-07-15',
    author: 'Supervisor Restroom QA'
  },
  {
    id: 'sop-2',
    code: 'SOP-RC-FLOOR-02',
    title: 'SOP Kristalisasi & Buffing Lantai Marmer / Granit',
    category: 'Floor Care',
    version: 'v2.1',
    description: 'Prosedur pemulihan kilau alami lantai marmer dan granit gedung menggunakan mesin polisher dan chemical khusus.',
    objective: 'Mengembalikan dan mempertahankan kilau alami lantai marmer/granit gedung komersial hingga mencapai standar kilau minimal 85 Gloss Unit (GU) tanpa merusak pori-pori batu.',
    equipmentList: [
      { name: 'Mesin Polisher Low Speed 175 RPM', qty: 1, unit: 'Unit' },
      { name: 'Pad Drive Holder 16"', qty: 1, unit: 'Pcs' },
      { name: 'White Buffing Pad 16"', qty: 2, unit: 'Pcs' },
      { name: 'Red Scrubbing Pad 16"', qty: 1, unit: 'Pcs' },
      { name: 'Wet & Dry Vacuum Cleaner 30L', qty: 1, unit: 'Unit' },
      { name: 'Kabel Roll 20 Meter Heavy Duty', qty: 1, unit: 'Roll' },
      { name: 'Barricade Cone & Caution Sign', qty: 4, unit: 'Set' }
    ],
    chemicalList: [
      { name: 'Marble Crystallization Compound (K1/K2)', dosage: '20-30 gram per m²', unit: 'gr/m²' },
      { name: 'Neutral Floor Cleaner (Netralisir)', dosage: '1 : 40', unit: 'ml/L Air' },
      { name: 'Wax Strip (Jika perlu stripping)', dosage: '1 : 10', unit: 'ml/L Air' }
    ],
    steps: [
      'Lakukan dry mopping atau vacuuming pada seluruh area yang akan dipoles untuk menghilangkan butiran pasir dan debu tajam.',
      'Pasang barricade cone dan caution sign di sekeliling area kerja.',
      'Pasang White Buffing Pad 16" pada mesin Low Speed Polisher 175 RPM.',
      'Semprotkan Marble Crystallization Powder/Spray secara merata pada luas 2x2 meter.',
      'Jalankan mesin polisher dengan gerakan tumpang tindih (overlapping) ke kiri-kanan secara perlahan hingga lantai mengkilap seperti kaca.',
      'Lakukan dry buffing akhir untuk menghilangkan sisa residu serbuk kristal.',
      'Periksa kilau dengan alat Glossmeter (standar minimal 85 GU).'
    ],
    requiredPPE: [
      'Sepatu Safety Shoes Rubber Sole',
      'Kacamata Pelindung (Goggles)',
      'Earplug (Bila tingkat kebisingan tinggi)',
      'Sarung Tangan Katun Kerja'
    ],
    safetyEquipment: ['Safety Shoes', 'Kacamata Pelindung (Goggles)', 'Earplug (Bila bising)'],
    chemicalsUsed: ['Marble Crystallization Compound', 'Neutral Cleaner'],
    equipmentMaintenance: [
      'Cuci pad buffing dengan air bertekanan hingga residu kristal hilang dan keringkan secara mendatar.',
      'Bersihkan body mesin polisher dan lap kabel listrik sebelum digulung rapi.',
      'Periksa kondisi carbon brush mesin dan baut pengunci pad holder secara berkala.',
      'Simpan mesin di tempat kering dengan posisi tegak terstandar.'
    ],
    lastUpdated: '2026-06-10',
    author: 'Floor Specialist Trainer'
  },
  {
    id: 'sop-3',
    code: 'SOP-RC-K3-03',
    title: 'SOP Keselamatan K3 & Penanganan Bahan Kimia (MSDS)',
    category: 'K3 & Safety',
    version: 'v4.0',
    description: 'Pedoman keselamatan wajib bagi seluruh staf outsourcing dalam mencampur, menyimpan, dan menggunakan bahan kimia pembersih.',
    objective: 'Mencegah kecelakaan kerja, paparan zat berbahaya, iritasi kulit/pernapasan, dan reaksi kimia mematikan selama operasional pembersihan berlangsung.',
    equipmentList: [
      { name: 'Gelas Ukur Kimia Bertingkat 500ml', qty: 2, unit: 'Pcs' },
      { name: 'Corong Plastik Kimia', qty: 2, unit: 'Pcs' },
      { name: 'Botol Pencuci Mata Darurat (Eye Wash)', qty: 1, unit: 'Unit' },
      { name: 'Kotak P3K Lengkap Khusus Kimia', qty: 1, unit: 'Set' },
      { name: 'Rak Jerigen Spill Containment Tray', qty: 1, unit: 'Unit' }
    ],
    chemicalList: [
      { name: 'Seluruh Jenis Chemical Pabrikan', dosage: 'Wajib mengacu tabel MSDS resmi', unit: 'Standar Pabrik' },
      { name: 'Dilarang Mencampur Bleach & Asam', dosage: '0 (DILARANG KERAS)', unit: 'Dilarang' }
    ],
    steps: [
      'Selalu baca label kemasan dan instruksi dosis sebelum menuangkan chemical.',
      'Gunakan gelas ukur resmi, dilarang menakar chemical hanya dengan perkiraan botol.',
      'DILARANG KERAS mencampur cairan pemutih (chlorine) dengan cairan asam (acid/pembersih porselen kuat) karena menghasilkan gas beracun mematikan.',
      'Semua botol dispenser semprotan (sprayer) WAJIB diberi stiker label nama chemical dengan jelas.',
      'Simpan jerigen chemical di ruang gudang yang memiliki sirkulasi udara baik dan terkunci dari akses publik.',
      'Jika terkena percikan mata, segera basuh dengan air mengalir selama 15 menit dan laporkan ke Spv.'
    ],
    requiredPPE: [
      'Chemical Resistant Gloves (Nitrile / Neoprene)',
      'Eye Protection Safety Goggles',
      'Masker Respirator / Karbon Aktif',
      'Celemek / Apron Tahan Kimia',
      'Safety Rubber Boots'
    ],
    safetyEquipment: ['Chemical Resistant Gloves', 'Eye Wash Bottle', 'Masker Karbon'],
    chemicalsUsed: ['Semua Jenis Chemical'],
    equipmentMaintenance: [
      'Bilas gelas ukur dan corong kimia segera setelah digunakan dengan air mengalir.',
      'Periksa tanggal kadaluarsa larutan steril pada botol Eye Wash setiap bulan.',
      'Pastikan kran jerigen tertutup rapat dan tray penampung tumpahan dalam keadaan bersih kering.'
    ],
    lastUpdated: '2026-08-01',
    author: 'HSE Coordinator'
  }
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-superadmin',
    username: 'superadmin',
    name: 'Budi Santoso',
    email: 'superadmin@rajawali.co.id',
    role: 'Super Admin (HQ)',
    password: 'password123',
    avatar: '👑',
    assignedProjectId: 'ALL',
    isLocationLocked: false,
    allowedViews: [
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
      'finance_statements',
      'finance_bank_reconcile',
      'finance_analytics_audit',
      'access_control',
      'company_settings'
    ],
    status: 'Aktif',
    phone: '0811-9988-7766',
    lastLogin: '2026-08-26 15:30',
    securityPin: '123456',
    canDeleteTasks: true,
    canDeleteSops: true,
    canApproveMaterialRequests: true,
    canReviseMaterialRequests: true
  },
  {
    id: 'user-finance',
    username: 'finance',
    name: 'Dewi Lestari, S.Ak',
    email: 'finance@rajawali.co.id',
    role: 'Finance & Accounting Lead',
    password: 'password123',
    avatar: '💼',
    assignedProjectId: 'ALL',
    isLocationLocked: false,
    allowedViews: [
      'dashboard',
      'finance_cash_journal',
      'finance_debts_receivables',
      'finance_investments',
      'finance_outflow_forecast',
      'finance_profit_loss',
      'finance_statements',
      'finance_bank_reconcile',
      'finance_analytics_audit',
      'reports'
    ],
    status: 'Aktif',
    phone: '0813-8899-0011',
    lastLogin: '2026-08-26 14:45',
    securityPin: '123456',
    canApproveMaterialRequests: true,
    canReviseMaterialRequests: true
  },
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Siti Rahmawati',
    email: 'admin@rajawali.co.id',
    role: 'Admin Operasional',
    password: 'password123',
    avatar: '🏢',
    assignedProjectId: 'ALL',
    isLocationLocked: false,
    allowedViews: [
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
      'finance_statements',
      'finance_bank_reconcile',
      'finance_analytics_audit'
    ],
    status: 'Aktif',
    phone: '0812-4455-6677',
    lastLogin: '2026-08-26 14:15',
    securityPin: '123456',
    canReviseMaterialRequests: true
  },
  {
    id: 'user-lokasi1',
    username: 'admin.lokasi1',
    name: 'Hendra Gunawan',
    email: 'admin.lokasi1@rajawali.co.id',
    role: 'Admin Lokasi 1',
    password: 'password123',
    avatar: '📍',
    assignedProjectId: 'proj-1', // Mall Gandaria City
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
    status: 'Aktif',
    phone: '0812-3456-7890',
    lastLogin: '2026-08-26 11:20',
    securityPin: '123456'
  },
  {
    id: 'user-lokasi2',
    username: 'admin.lokasi2',
    name: 'Bambang Supriyadi',
    email: 'admin.lokasi2@rajawali.co.id',
    role: 'Admin Lokasi 2',
    password: 'password123',
    avatar: '🏥',
    assignedProjectId: 'proj-2', // RS Medika Utama
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
    status: 'Aktif',
    phone: '0813-9876-5432',
    lastLogin: '2026-08-26 10:45',
    securityPin: '123456'
  },
  {
    id: 'user-supervisor',
    username: 'supervisor',
    name: 'Agus Kurniawan',
    email: 'supervisor@rajawali.co.id',
    role: 'Supervisor Lapangan',
    password: 'password123',
    avatar: '👷',
    assignedProjectId: 'ALL',
    isLocationLocked: false,
    allowedViews: [
      'dashboard',
      'tasks',
      'timesheet',
      'inventory',
      'sops',
      'blast',
      'reports'
    ],
    status: 'Aktif',
    phone: '0812-9888-1122',
    lastLogin: '2026-08-26 09:15',
    securityPin: '123456',
    canDeleteTasks: true
  },
  {
    id: 'user-director',
    username: 'direksi',
    name: 'Ir. Hendro Prabowo, MBA',
    email: 'direksi@rajawali.co.id',
    role: 'Manajemen Pusat',
    password: 'password123',
    avatar: '👔',
    assignedProjectId: 'ALL',
    isLocationLocked: false,
    allowedViews: [
      'dashboard',
      'finance_statements',
      'finance_analytics_audit',
      'reports',
      'project_settings',
      'blast'
    ],
    status: 'Aktif',
    phone: '0811-2233-4455',
    lastLogin: '2026-08-26 08:30',
    securityPin: '123456'
  }
];

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: 'PT RAJAWALI CYCLE INDONESIA',
  brandName: 'RAJAWALI CYCLE',
  tagline: 'Integrated Facility Services & Enterprise Management',
  address: 'Menara Rajawali Lt. 12, Jl. DR. Ide Anak Agung Gde Agung Lot 5.1, Kawasan Mega Kuningan',
  city: 'Jakarta Selatan 12950, DKI Jakarta',
  phone: '(021) 5299-8800',
  whatsapp: '0812-9988-7766',
  email: 'corporate@rajawalicycle.co.id',
  website: 'www.rajawalicycle.co.id',
  taxId: '01.890.123.4-012.000',
  businessPermitNo: '9120008819231 (NIB)',
  directorName: 'Wanda I. Zeng, S.E.',
  directorTitle: 'Direktur Utama',
  financeManagerName: 'Dewi Lestari, S.Ak',
  financeManagerTitle: 'Finance & Accounting Lead',
  logoUrl: '',
  bankName: 'Bank Central Asia (BCA)',
  bankAccountNo: '541-0988-771',
  bankAccountHolder: 'PT RAJAWALI CYCLE INDONESIA',
  letterheadFooterNote: 'Dokumen ini sah dan diterbitkan secara digital oleh Sistem ERP PT Rajawali Cycle Indonesia. Berlaku secara resmi untuk keperluan operasional dan audit.',
  updatedAt: '2026-08-29 10:00',
  updatedBy: 'Super Admin (HQ)'
};
