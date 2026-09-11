import {
  ChartOfAccount,
  FinanceTransaction,
  BankStatementImport,
  PeriodClosing,
  AuditTrailItem,
  CurrencyRate,
  DebtRecord,
  ReceivableRecord,
  InvestmentRecord,
  InvestmentScheduleRow,
  ProfitSharingStatus
} from '../types/finance';

export const INITIAL_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // 1000 - ASET LANCAR
  {
    code: '1110',
    name: 'Kas Besar (Cash on Hand HQ)',
    type: 'Asset',
    category: 'Kas & Bank',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Kas fisik di brankas kantor pusat Rajawali',
    isActive: true,
    isSystem: true
  },
  {
    code: '1120',
    name: 'Bank BCA - Rek Operasional (123-456-7890)',
    type: 'Asset',
    category: 'Kas & Bank',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Rekening utama penerimaan pembayaran klien & payroll BCA',
    isActive: true,
    isSystem: true
  },
  {
    code: '1121',
    name: 'Bank Mandiri - Rek Payroll (987-654-3210)',
    type: 'Asset',
    category: 'Kas & Bank',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Rekening operasional penggajian dan vendor procurement Mandiri',
    isActive: true,
    isSystem: true
  },
  {
    code: '1122',
    name: 'Bank BNI - Rek Giro Operasional (1177888008)',
    type: 'Asset',
    category: 'Kas & Bank',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Rekening e-Statement BNI Direct PT Joeriz Talenta Indonesia / Rajawali',
    isActive: true,
    isSystem: true
  },
  {
    code: '1130',
    name: 'Kas Kecil (Petty Cash Operasional Site)',
    type: 'Asset',
    category: 'Kas & Bank',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Dana petty cash untuk kebutuhan darurat supervisor lapangan',
    isActive: true,
    isSystem: true
  },
  {
    code: '1140',
    name: 'Piutang Usaha - Klien Project',
    type: 'Asset',
    category: 'Piutang Usaha',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Tagihan termin invoice jasa cleaning yang belum jatuh tempo',
    isActive: true,
    isSystem: true
  },
  {
    code: '1150',
    name: 'Persediaan Chemical & Cleaning Supplies',
    type: 'Asset',
    category: 'Persediaan & Logistik',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Stok chemical MPC, Floor Polish, Sanitizer, Pad di gudang logistik',
    isActive: true,
    isSystem: true
  },
  {
    code: '1160',
    name: 'Biaya Dibayar di Muka (Asuransi & Sewa)',
    type: 'Asset',
    category: 'Biaya Dibayar di Muka',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Asuransi BPJS TK & sewa warehouse dibayar dimuka',
    isActive: true
  },

  // 1200 - ASET TETAP
  {
    code: '1210',
    name: 'Peralatan & Mesin Cleaning (Scrubber/Polisher/Gondola)',
    type: 'Asset',
    category: 'Aset Tetap',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Mesin Ride-on Scrubber, Auto Floor Polisher, High Pressure Washer, Gondola Set',
    isActive: true
  },
  {
    code: '1220',
    name: 'Kendaraan Operasional & Delivery',
    type: 'Asset',
    category: 'Aset Tetap',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Mobil Box Logistik Chemical & Motor Operasional Supervisor',
    isActive: true
  },
  {
    code: '1290',
    name: 'Akumulasi Penyusutan Aset Tetap',
    type: 'Asset',
    category: 'Akumulasi Penyusutan',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Kontra akun penyusutan mesin dan kendaraan operasional',
    isActive: true
  },

  // 2000 - LIABILITAS (UTANG)
  {
    code: '2110',
    name: 'Utang Usaha - Supplier Chemical & Mesin',
    type: 'Liability',
    category: 'Utang Usaha / Supplier',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Kewajiban pembayaran faktur vendor chemical & consumables',
    isActive: true,
    isSystem: true
  },
  {
    code: '2120',
    name: 'Utang Gaji & Upah Tenaga Kerja',
    type: 'Liability',
    category: 'Utang Gaji & Operasional',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Akrual payroll bulanan tenaga kebersihan dan staf',
    isActive: true,
    isSystem: true
  },
  {
    code: '2130',
    name: 'Utang Pajak (PPh 21 / PPh 23 / PPN)',
    type: 'Liability',
    category: 'Utang Pajak',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Pajak penghasilan karyawan & PPh jasa yang belum disetor',
    isActive: true
  },
  {
    code: '2210',
    name: 'Utang Bank Jangka Panjang (Kredit Investasi Mesin)',
    type: 'Liability',
    category: 'Utang Jangka Panjang',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Fasilitas pinjaman modal investasi pengadaan mesin dari bank',
    isActive: true
  },

  // 3000 - EKUITAS (MODAL)
  {
    code: '3110',
    name: 'Modal Saham Disetor',
    type: 'Equity',
    category: 'Modal Saham',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Modal awal pendirian PT Rajawali Sukses Mandiri',
    isActive: true,
    isSystem: true
  },
  {
    code: '3210',
    name: 'Laba Ditahan (Retained Earnings)',
    type: 'Equity',
    category: 'Laba Ditahan',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Akumulasi laba bersih dari tahun-tahun buku sebelumnya',
    isActive: true,
    isSystem: true
  },

  // 4000 - PENDAPATAN (REVENUE)
  {
    code: '4110',
    name: 'Pendapatan Jasa Kontrak Cleaning Service',
    type: 'Revenue',
    category: 'Pendapatan Jasa Kontrak',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Penerimaan kontrak bulanan rutin dari Mall, RS, Apartemen & Gedung',
    isActive: true,
    isSystem: true
  },
  {
    code: '4120',
    name: 'Pendapatan Jasa Khusus (Deep Cleaning, Poles & Facade)',
    type: 'Revenue',
    category: 'Pendapatan Jasa Khusus',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Pekerjaan berkala kristalisasi marmer, cuci karpet & gondola kaca',
    isActive: true
  },
  {
    code: '4210',
    name: 'Pendapatan Lain-lain & Jasa Giro Bank',
    type: 'Revenue',
    category: 'Pendapatan Non-Operasional',
    normalBalance: 'Credit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Pendapatan bunga tabungan, selisih kurs, dan penjualan barang bekas',
    isActive: true
  },

  // 5000 - BEBAN POKOK PENDAPATAN (HPP)
  {
    code: '5110',
    name: 'HPP - Gaji & Upah Tenaga Kebersihan (Cleaners)',
    type: 'Expense',
    category: 'HPP - Tenaga Kerja Langsung',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Gaji pokok, tunjangan hadir, dan uang lembur cleaner & leader lapangan',
    isActive: true,
    isSystem: true
  },
  {
    code: '5120',
    name: 'HPP - Pemakaian Chemical, Disinfektan & Consumables',
    type: 'Expense',
    category: 'HPP - Chemical & Perlengkapan',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Biaya chemical pembersih, tissue, garbage bag, mop head, pad scrubbing',
    isActive: true,
    isSystem: true
  },
  {
    code: '5130',
    name: 'HPP - Seragam, Sepatu Safety & APD K3',
    type: 'Expense',
    category: 'HPP - Chemical & Perlengkapan',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Pengadaan seragam kerja, sarung tangan nitril, helm safety & harness',
    isActive: true
  },

  // 6000 - BEBAN OPERASIONAL (OPEX)
  {
    code: '6110',
    name: 'Beban Gaji Staf Manajemen & Operasional HQ',
    type: 'Expense',
    category: 'Beban Gaji Staf & Manajemen',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Gaji manager operasional, finance, HRD, dan admin pusat',
    isActive: true
  },
  {
    code: '6120',
    name: 'Beban Sewa Kantor & Utilitas (Listrik/Air/Internet)',
    type: 'Expense',
    category: 'Beban Operasional Gedung',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Sewa kantor pusat, tagihan listrik, internet fiber, PDAM',
    isActive: true
  },
  {
    code: '6130',
    name: 'Beban Pemeliharaan & Servis Mesin Scrubber/Polisher',
    type: 'Expense',
    category: 'Beban Pemeliharaan & Mesin',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Penggantian sparepart vacuum motor, baterai scrubber, squeegee blade',
    isActive: true
  },
  {
    code: '6140',
    name: 'Beban Transportasi, BBM & Distribusi Logistik',
    type: 'Expense',
    category: 'Beban Umum & Administrasi',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'BBM mobil box pengiriman chemical ke project dan tol',
    isActive: true
  },
  {
    code: '6150',
    name: 'Beban Administrasi, ATK & Keperluan Kantor',
    type: 'Expense',
    category: 'Beban Umum & Administrasi',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Kertas print, binder laporan klien, materai, software tools',
    isActive: true
  },
  {
    code: '6160',
    name: 'Beban Penyusutan Aset Tetap',
    type: 'Expense',
    category: 'Beban Penyusutan Aset',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Alokasi penyusutan mesin dan kendaraan per bulan berjalan',
    isActive: true
  },
  {
    code: '6170',
    name: 'Beban Administrasi Bank & Pajak Bunga',
    type: 'Expense',
    category: 'Beban Pajak & Bunga Bank',
    normalBalance: 'Debit',
    initialBalance: 0,
    currentBalance: 0,
    description: 'Biaya admin transfer payroll bank, kliring, dan pajak bunga',
    isActive: true
  }
];

export const INITIAL_FINANCE_TRANSACTIONS: FinanceTransaction[] = [
  // 1. Penerimaan Pembayaran Kontrak Mall Gandaria City (BKM)
  {
    id: 'trx-001',
    code: 'BKM-2026-08-001',
    date: '2026-08-05',
    type: 'IN',
    title: 'Pembayaran Kontrak Cleaning Agustus 2026 - Mall Gandaria City',
    description: 'Pelunasan invoice INV-MGC/2026/08 untuk jasa kebersihan 14 manpower & mesin',
    amount: 115000000,
    paymentMethod: 'Bank BCA (123-456-7890)',
    primaryAccountCode: '1120',
    contraAccountCode: '4110',
    journalEntries: [
      { id: 'j-001-1', accountCode: '1120', accountName: 'Bank BCA - Rek Operasional (123-456-7890)', debit: 115000000, credit: 0, notes: 'Kas masuk rekening BCA' },
      { id: 'j-001-2', accountCode: '4110', accountName: 'Pendapatan Jasa Kontrak Cleaning Service', debit: 0, credit: 115000000, notes: 'Pengakuan pendapatan kontrak MGC' }
    ],
    projectId: 'proj-1',
    projectName: 'Mall Gandaria City',
    division: 'Cleaning Service',
    currency: 'IDR',
    exchangeRate: 1,
    referenceNumber: 'INV-MGC/2026/08',
    payeeOrPayer: 'PT Pakuwon Jati Tbk (Finance Dept)',
    isReconciled: true,
    bankStatementItemId: 'stmt-001',
    isAdjusting: false,
    createdAt: '2026-08-05 10:15',
    createdBy: 'Finance Admin HQ'
  },

  // 2. Pembayaran Kontrak RS Medika Utama (BKM)
  {
    id: 'trx-002',
    code: 'BKM-2026-08-002',
    date: '2026-08-08',
    type: 'IN',
    title: 'Pembayaran Invoice Termin 1 - RS Medika Utama',
    description: 'Jasa sanitasi rumah sakit, pembersihan ICU & rawat inap 18 personil',
    amount: 148000000,
    paymentMethod: 'Bank Mandiri (987-654-3210)',
    primaryAccountCode: '1121',
    contraAccountCode: '4110',
    journalEntries: [
      { id: 'j-002-1', accountCode: '1121', accountName: 'Bank Mandiri - Rek Payroll (987-654-3210)', debit: 148000000, credit: 0, notes: 'Kas masuk rekening Mandiri' },
      { id: 'j-002-2', accountCode: '4110', accountName: 'Pendapatan Jasa Kontrak Cleaning Service', debit: 0, credit: 148000000, notes: 'Pendapatan RS Medika Utama' }
    ],
    projectId: 'proj-2',
    projectName: 'RS Medika Utama',
    division: 'Sanitation & Pest Control',
    currency: 'IDR',
    exchangeRate: 1,
    referenceNumber: 'INV-RSM/2026/08',
    payeeOrPayer: 'Bagian Keuangan RS Medika',
    isReconciled: true,
    bankStatementItemId: 'stmt-002',
    isAdjusting: false,
    createdAt: '2026-08-08 14:20',
    createdBy: 'Finance Admin HQ'
  },

  // 3. Pendapatan Khusus Poles Marmer & Kristalisasi Gedung Sudirman
  {
    id: 'trx-003',
    code: 'BKM-2026-08-003',
    date: '2026-08-12',
    type: 'IN',
    title: 'Penerimaan Pekerjaan Deep Cleaning & Poles Marmer Lobby',
    description: 'Proyek khusus kristalisasi lantai marmer 1.200 m2 Menara Sudirman Tower',
    amount: 35000000,
    paymentMethod: 'Bank BCA (123-456-7890)',
    primaryAccountCode: '1120',
    contraAccountCode: '4120',
    journalEntries: [
      { id: 'j-003-1', accountCode: '1120', accountName: 'Bank BCA - Rek Operasional (123-456-7890)', debit: 35000000, credit: 0, notes: 'Kas masuk BCA' },
      { id: 'j-003-2', accountCode: '4120', accountName: 'Pendapatan Jasa Khusus (Deep Cleaning, Poles & Facade)', debit: 0, credit: 35000000, notes: 'Pendapatan Poles Marmer' }
    ],
    projectId: 'proj-3',
    projectName: 'Menara Sudirman Tower',
    division: 'Cleaning Service',
    currency: 'IDR',
    exchangeRate: 1,
    referenceNumber: 'WO-POLISH-2026-08',
    payeeOrPayer: 'Building Management Menara Sudirman',
    isReconciled: true,
    bankStatementItemId: 'stmt-003',
    isAdjusting: false,
    createdAt: '2026-08-12 11:00',
    createdBy: 'Finance Admin HQ'
  },

  // 4. Pembayaran Gaji Karyawan Lapangan (BKK)
  {
    id: 'trx-004',
    code: 'BKK-2026-08-001',
    date: '2026-08-15',
    type: 'OUT',
    title: 'Disbursement Payroll Gaji Bersih Cleaners Periode 1-15 Agustus',
    description: 'Pembayaran upah kehadiran dan lembur 48 tenaga kebersihan seluruh site',
    amount: 92500000,
    paymentMethod: 'Bank Mandiri (987-654-3210)',
    primaryAccountCode: '1121',
    contraAccountCode: '5110',
    journalEntries: [
      { id: 'j-004-1', accountCode: '5110', accountName: 'HPP - Gaji & Upah Tenaga Kebersihan (Cleaners)', debit: 92500000, credit: 0, notes: 'Beban gaji langsung lapangan' },
      { id: 'j-004-2', accountCode: '1121', accountName: 'Bank Mandiri - Rek Payroll (987-654-3210)', debit: 0, credit: 92500000, notes: 'Transfer batch payroll Mandiri' }
    ],
    projectId: 'ALL',
    projectName: 'Seluruh Lokasi Project (HQ Batch)',
    division: 'Cleaning Service',
    currency: 'IDR',
    exchangeRate: 1,
    referenceNumber: 'PAYROLL-AUG-P1',
    payeeOrPayer: 'Seluruh Personil Kebersihan',
    isReconciled: true,
    bankStatementItemId: 'stmt-004',
    isAdjusting: false,
    createdAt: '2026-08-15 09:30',
    createdBy: 'Finance Admin HQ'
  },

  // 5. Pembelian Bulk Chemical & Consumables Vendor PT Chemco Prima (BKK)
  {
    id: 'trx-005',
    code: 'BKK-2026-08-002',
    date: '2026-08-18',
    type: 'OUT',
    title: 'Pembelian Chemical Karbol, MPC & Disinfektan RS',
    description: 'Pengadaan 40 jerigen Karbol Pinus, 30 galon MPC, 20 botol Marble Crystalizer Powder',
    amount: 24500000,
    paymentMethod: 'Bank BCA (123-456-7890)',
    primaryAccountCode: '1120',
    contraAccountCode: '5120',
    journalEntries: [
      { id: 'j-005-1', accountCode: '5120', accountName: 'HPP - Pemakaian Chemical, Disinfektan & Consumables', debit: 24500000, credit: 0, notes: 'Pembelian chemical stok operasional' },
      { id: 'j-005-2', accountCode: '1120', accountName: 'Bank BCA - Rek Operasional (123-456-7890)', debit: 0, credit: 24500000, notes: 'Pembayaran via transfer BCA' }
    ],
    projectId: 'proj-2',
    projectName: 'RS Medika Utama',
    division: 'Logistik & Chemical',
    currency: 'IDR',
    exchangeRate: 1,
    referenceNumber: 'PO-CHEM-8842',
    payeeOrPayer: 'PT Chemco Prima Industri',
    isReconciled: true,
    bankStatementItemId: 'stmt-005',
    isAdjusting: false,
    createdAt: '2026-08-18 15:45',
    createdBy: 'Logistik & Procurement'
  },

  // 6. Penggantian Sparepart & Servis Mesin Scrubber Ride-On
  {
    id: 'trx-006',
    code: 'BKK-2026-08-003',
    date: '2026-08-20',
    type: 'OUT',
    title: 'Servis Berkala & Ganti Squeegee Blade Mesin Scrubber',
    description: 'Maintenance mesin Ride-on Scrubber lantai Mall Gandaria City',
    amount: 4800000,
    paymentMethod: 'Kas Tunai / Petty Cash HQ',
    primaryAccountCode: '1130',
    contraAccountCode: '6130',
    journalEntries: [
      { id: 'j-006-1', accountCode: '6130', accountName: 'Beban Pemeliharaan & Servis Mesin Scrubber/Polisher', debit: 4800000, credit: 0, notes: 'Biaya servis mesin scrubber' },
      { id: 'j-006-2', accountCode: '1130', accountName: 'Kas Kecil (Petty Cash Operasional Site)', debit: 0, credit: 4800000, notes: 'Pengeluaran petty cash operasional' }
    ],
    projectId: 'proj-1',
    projectName: 'Mall Gandaria City',
    division: 'Cleaning Service',
    currency: 'IDR',
    exchangeRate: 1,
    referenceNumber: 'KUITANSI-TECH-091',
    payeeOrPayer: 'CV Teknik Sentosa Mesin',
    isReconciled: false,
    isAdjusting: false,
    createdAt: '2026-08-20 16:10',
    createdBy: 'Supervisor Hendra Gunawan'
  },

  // 7. Jurnal Penyesuaian Penyusutan Mesin Bulanan (AJE)
  {
    id: 'trx-007',
    code: 'AJE-2026-08-001',
    date: '2026-08-28',
    type: 'ADJUSTMENT',
    title: 'Jurnal Penyesuaian Penyusutan Mesin & Kendaraan Agustus 2026',
    description: 'Penyusutan garis lurus peralatan mesin cleaning Rp 4.500.000 dan mobil box Rp 2.500.000',
    amount: 7000000,
    paymentMethod: 'Kas Tunai / Petty Cash HQ',
    primaryAccountCode: '6160',
    contraAccountCode: '1290',
    journalEntries: [
      { id: 'j-007-1', accountCode: '6160', accountName: 'Beban Penyusutan Aset Tetap', debit: 7000000, credit: 0, notes: 'Alokasi beban penyusutan Agustus' },
      { id: 'j-007-2', accountCode: '1290', accountName: 'Akumulasi Penyusutan Aset Tetap', debit: 0, credit: 7000000, notes: 'Penambahan akumulasi penyusutan' }
    ],
    projectId: 'ALL',
    projectName: 'Seluruh Lokasi Project (HQ Batch)',
    division: 'HQ Management & Operasional',
    currency: 'IDR',
    exchangeRate: 1,
    referenceNumber: 'MEMO-DEPR-2026-08',
    payeeOrPayer: 'Internal Accounting',
    isReconciled: true,
    isAdjusting: true,
    createdAt: '2026-08-28 17:00',
    createdBy: 'Senior Accountant'
  }
];

export const INITIAL_BANK_STATEMENTS: BankStatementImport[] = [
  {
    id: 'import-bni-001',
    bankName: 'Bank BNI',
    accountNumber: '1177888008',
    accountHolder: 'JOERIZ TALENTA INDONESIA PT',
    periodMonth: '2026-08',
    fileName: '11778880081084_2_BNI_Statement.pdf',
    uploadDate: '2026-08-29 08:30',
    totalTransactions: 6,
    totalCredit: 145840000,
    totalDebit: 106956500,
    matchedCount: 2,
    unmatchedCount: 4,
    items: [
      {
        id: 'bni-stmt-001',
        date: '2026-08-27',
        description: 'BY TRX ATM PRIMA (Journal: 765822)',
        type: 'DB',
        amount: 6500,
        balance: 401309630,
        referenceNumber: '765822',
        matchStatus: 'UNMATCHED',
        suggestedAccountCode: '6170',
        confidenceScore: 90,
        notes: 'Biaya transaksi ATM Prima / Administrasi'
      },
      {
        id: 'bni-stmt-002',
        date: '2026-08-27',
        description: 'TRF/PAY/TOP-UP ECHANNEL | PEMINDAHAN KE 33501099551504 | 6010047890374683 | BNI DIRECT (Journal: 779356)',
        type: 'DB',
        amount: 3300000,
        balance: 398009630,
        referenceNumber: '779356',
        matchStatus: 'UNMATCHED',
        suggestedAccountCode: '5120',
        confidenceScore: 85,
        notes: 'Transfer operasional via BNI Direct'
      },
      {
        id: 'bni-stmt-003',
        date: '2026-08-28',
        description: 'TRF CR DIRECT PEMINDAHAN DARI 0881920019 | PT GRAND INDONESIA - KONTRAK CLEANING AGUSTUS (Journal: 812901)',
        type: 'CR',
        amount: 145000000,
        balance: 543009630,
        referenceNumber: '812901',
        matchStatus: 'MATCHED',
        matchedTransactionId: 'trx-001',
        matchedTransactionCode: 'BKM-2026-08-001',
        confidenceScore: 95,
        notes: 'Penerimaan invoice kontrak jasa kebersihan'
      },
      {
        id: 'bni-stmt-004',
        date: '2026-08-28',
        description: 'PAYROLL BNI DIRECT | BATCH GAJI CLEANERS TOWER AGUSTUS 2026 (Journal: 819204)',
        type: 'DB',
        amount: 85200000,
        balance: 457809630,
        referenceNumber: '819204',
        matchStatus: 'UNMATCHED',
        suggestedAccountCode: '5110',
        confidenceScore: 95,
        notes: 'Pembayaran payroll tenaga kebersihan'
      },
      {
        id: 'bni-stmt-005',
        date: '2026-08-29',
        description: 'TRF DB PEMINDAHAN KE 0451299102 | PT KLINDO PERKASA - CHEMICAL FLOOR STRIPPER (Journal: 820115)',
        type: 'DB',
        amount: 18450000,
        balance: 439359630,
        referenceNumber: '820115',
        matchStatus: 'MATCHED',
        matchedTransactionId: 'trx-005',
        matchedTransactionCode: 'BKK-2026-08-002',
        confidenceScore: 90,
        notes: 'Pembelian chemical & disinfektan'
      },
      {
        id: 'bni-stmt-006',
        date: '2026-08-29',
        description: 'BUNGA JASA GIRO BNI AGUSTUS 2026 (Journal: 830002)',
        type: 'CR',
        amount: 840000,
        balance: 440199630,
        referenceNumber: '830002',
        matchStatus: 'UNMATCHED',
        suggestedAccountCode: '4210',
        confidenceScore: 90,
        notes: 'Pendapatan bunga giro bank'
      }
    ]
  },
  {
    id: 'import-bca-001',
    bankName: 'BCA (Bank Central Asia)',
    accountNumber: '123-456-7890',
    accountHolder: 'PT RAJAWALI SUKSES MANDIRI',
    periodMonth: '2026-08',
    fileName: 'Rekening_Koran_BCA_Agustus_2026.csv',
    uploadDate: '2026-08-28 16:30',
    totalTransactions: 6,
    totalCredit: 162500000,
    totalDebit: 35700000,
    matchedCount: 4,
    unmatchedCount: 2,
    items: [
      {
        id: 'stmt-001',
        date: '2026-08-05',
        description: 'TRSF CR DR PT PAKUWON JATI - INV MGC AGUSTUS',
        type: 'CR',
        amount: 115000000,
        balance: 465000000,
        referenceNumber: 'BCA-TRF-9021',
        matchStatus: 'MATCHED',
        matchedTransactionId: 'trx-001',
        matchedTransactionCode: 'BKM-2026-08-001',
        confidenceScore: 100,
        notes: 'Otomatis cocok dengan BKM-2026-08-001'
      },
      {
        id: 'stmt-003',
        date: '2026-08-12',
        description: 'TRSF CR MENARA SUDIRMAN - WO POLISH MARMER',
        type: 'CR',
        amount: 35000000,
        balance: 500000000,
        referenceNumber: 'BCA-TRF-9055',
        matchStatus: 'MATCHED',
        matchedTransactionId: 'trx-003',
        matchedTransactionCode: 'BKM-2026-08-003',
        confidenceScore: 98,
        notes: 'Otomatis cocok dengan BKM-2026-08-003'
      },
      {
        id: 'stmt-005',
        date: '2026-08-18',
        description: 'TRSF DB KE PT CHEMCO PRIMA INDUSTRI PO-8842',
        type: 'DB',
        amount: 24500000,
        balance: 475500000,
        referenceNumber: 'BCA-OUT-3310',
        matchStatus: 'MATCHED',
        matchedTransactionId: 'trx-005',
        matchedTransactionCode: 'BKK-2026-08-002',
        confidenceScore: 95,
        notes: 'Otomatis cocok dengan BKK-2026-08-002'
      },
      {
        id: 'stmt-006',
        date: '2026-08-25',
        description: 'BIAYA ADM REK & PAJAK BUNGA BCA',
        type: 'DB',
        amount: 250000,
        balance: 475250000,
        referenceNumber: 'BCA-FEE-08',
        matchStatus: 'UNMATCHED',
        suggestedAccountCode: '6170',
        confidenceScore: 85,
        notes: 'Biaya administrasi bulanan bank - Siap dicatat jadi BKK dengan 1-klik'
      },
      {
        id: 'stmt-007',
        date: '2026-08-26',
        description: 'TRSF CR DR APARTEMEN EMERALD TOWER - DP POLES KACA',
        type: 'CR',
        amount: 12500000,
        balance: 487750000,
        referenceNumber: 'BCA-TRF-9122',
        matchStatus: 'UNMATCHED',
        suggestedAccountCode: '4120',
        confidenceScore: 90,
        notes: 'Penerimaan DP customer baru - Belum ada di jurnal buku kas'
      },
      {
        id: 'stmt-008',
        date: '2026-08-27',
        description: 'TARIK TUNAI ATM OPERASIONAL SPV',
        type: 'DB',
        amount: 10950000,
        balance: 476800000,
        referenceNumber: 'BCA-ATM-8821',
        matchStatus: 'MATCHED',
        matchedTransactionId: 'trx-006',
        matchedTransactionCode: 'BKK-2026-08-003',
        confidenceScore: 78,
        notes: 'Manual match dengan penarikan kas kecil lapangan'
      }
    ]
  }
];

export const INITIAL_PERIOD_CLOSINGS: PeriodClosing[] = [
  {
    id: 'close-2026-07',
    periodYear: 2026,
    periodMonth: 7,
    periodLabel: 'Juli 2026',
    closedAt: '2026-08-02 18:00',
    closedBy: 'Super Admin (HQ)',
    status: 'CLOSED',
    netProfitTransferred: 58100000,
    totalRevenue: 495000000,
    totalExpense: 436900000,
    notes: 'Tutup buku periode Juli 2026 selesai. Laba ditransfer ke Akun 3210 (Laba Ditahan).'
  }
];

export const INITIAL_AUDIT_TRAILS: AuditTrailItem[] = [
  {
    id: 'aud-001',
    timestamp: '2026-08-28 17:05',
    userName: 'Senior Accountant',
    userRole: 'Super Admin (HQ)',
    actionType: 'CREATE',
    module: 'Jurnal Penyesuaian',
    recordId: 'trx-007',
    recordCode: 'AJE-2026-08-001',
    description: 'Membuat jurnal penyesuaian penyusutan aset mesin & kendaraan Agustus 2026',
    amount: 7000000,
    ipAddress: '192.168.1.45'
  },
  {
    id: 'aud-002',
    timestamp: '2026-08-28 16:35',
    userName: 'Finance Admin HQ',
    userRole: 'Admin Operasional',
    actionType: 'IMPORT_STATEMENT',
    module: 'Rekonsiliasi Bank',
    recordId: 'import-bca-001',
    recordCode: 'Rekening_Koran_BCA_Agustus_2026.csv',
    description: 'Mengunggah mutasi rekening koran BCA bulan Agustus (6 transaksi)',
    amount: 198200000,
    ipAddress: '192.168.1.12'
  },
  {
    id: 'aud-003',
    timestamp: '2026-08-28 16:40',
    userName: 'Finance Admin HQ',
    userRole: 'Admin Operasional',
    actionType: 'RECONCILE',
    module: 'Rekonsiliasi Bank',
    recordId: 'stmt-001',
    recordCode: 'BKM-2026-08-001',
    description: 'Mencocokkan penerimaan transfer PT Pakuwon Jati dengan BKM-2026-08-001',
    amount: 115000000,
    ipAddress: '192.168.1.12'
  },
  {
    id: 'aud-004',
    timestamp: '2026-08-18 15:50',
    userName: 'Logistik & Procurement',
    userRole: 'Admin Operasional',
    actionType: 'CREATE',
    module: 'Uang Keluar',
    recordId: 'trx-005',
    recordCode: 'BKK-2026-08-002',
    description: 'Input pengeluaran pembelian chemical karbol & disinfektan PT Chemco Prima',
    amount: 24500000,
    ipAddress: '192.168.1.28'
  },
  {
    id: 'aud-005',
    timestamp: '2026-08-02 18:00',
    userName: 'Super Admin (HQ)',
    userRole: 'Super Admin (HQ)',
    actionType: 'CLOSE_PERIOD',
    module: 'Tutup Buku',
    recordId: 'close-2026-07',
    recordCode: 'Juli 2026',
    description: 'Mengunci periode pembukuan Juli 2026 dan memindahkan laba bersih ke Laba Ditahan',
    amount: 58100000,
    ipAddress: '192.168.1.5'
  }
];

export const INITIAL_CURRENCY_RATES: CurrencyRate[] = [
  {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    symbol: 'Rp',
    rateToIdr: 1,
    lastUpdated: '2026-08-29 08:00'
  },
  {
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    rateToIdr: 16250,
    lastUpdated: '2026-08-29 08:00'
  },
  {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    rateToIdr: 12200,
    lastUpdated: '2026-08-29 08:00'
  }
];

// ---------------------------------------------------------------------------
// INITIAL DEBTS (PENCATATAN HUTANG USAHA & OPERASIONAL)
// ---------------------------------------------------------------------------
export const INITIAL_DEBTS: DebtRecord[] = [];

// ---------------------------------------------------------------------------
// INITIAL RECEIVABLES (PENCATATAN PIUTANG USAHA & KONTRAK KLIEN)
// ---------------------------------------------------------------------------
export const INITIAL_RECEIVABLES: ReceivableRecord[] = [];

// ---------------------------------------------------------------------------
// HELPER FUNCTION: AUTOMATIC INVESTMENT SCHEDULE GENERATOR (12 BULAN / N-BULAN)
// ---------------------------------------------------------------------------
export function generateInvestmentSchedule(
  startDate: string,
  durationMonths: number,
  capitalAmount: number,
  profitSharingPercent: number,
  profitSharingDay: number,
  bankName: string,
  bankAccountNumber: string,
  bankAccountHolder: string
): InvestmentScheduleRow[] {
  const schedules: InvestmentScheduleRow[] = [];
  const start = new Date(startDate || '2026-01-01');
  const monthlyProfit = (capitalAmount * profitSharingPercent) / 100;

  for (let i = 1; i <= durationMonths; i++) {
    const dueDateObj = new Date(start.getFullYear(), start.getMonth() + i, profitSharingDay);
    const yyyy = dueDateObj.getFullYear();
    const mm = String(dueDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(Math.min(profitSharingDay, 28)).padStart(2, '0');
    const dueDateStr = `${yyyy}-${mm}-${dd}`;

    const monthLabel = dueDateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    const isPast = dueDateObj < new Date('2026-08-20');

    schedules.push({
      id: `sch-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      monthIndex: i,
      monthLabel: `Bulan ke-${i} (${monthLabel})`,
      dueDate: dueDateStr,
      profitAmount: monthlyProfit,
      principalReturnAmount: i === durationMonths ? capitalAmount : 0,
      totalPayout: monthlyProfit + (i === durationMonths ? capitalAmount : 0),
      status: isPast ? ('DI Realisasikan' as ProfitSharingStatus) : ('Ditunda' as ProfitSharingStatus),
      realizationDate: isPast ? dueDateStr : undefined,
      bankNameSnapshot: bankName,
      bankAccountNumberSnapshot: bankAccountNumber,
      accountHolderSnapshot: bankAccountHolder,
      transferProof: isPast ? `TRF-BGI-M${i}-${yyyy}${mm}` : undefined,
      notes: isPast ? `Bagi hasil bulan ke-${i} telah direalisasikan` : `Menunggu jatuh tempo tanggal ${profitSharingDay}`
    });
  }

  return schedules;
}

// ---------------------------------------------------------------------------
// INITIAL INVESTMENTS (PENCATATAN INVESTASI & BAGI HASIL INVESTOR)
// ---------------------------------------------------------------------------
export const INITIAL_INVESTMENTS: InvestmentRecord[] = [
  {
    id: 'inv-001',
    code: 'INV-2026-001',
    investorName: 'H. Gunawan Prasetyo (Mitra Investama Utama)',
    investorContact: '0811-2233-4455',
    investorEmail: 'gunawan.prasetyo@investama.id',
    investorIdNumber: '3174091802750001',
    startDate: '2026-01-15',
    endDate: '2027-01-15',
    durationMonths: 12,
    capitalAmount: 300000000, // Rp 300.000.000
    allocation: 'Pengadaan Mesin Heavy Duty Ride-on Scrubber & Polisher Site Mall Paragon',
    projectId: 'proj-1',
    projectName: 'Mall Gandaria City',
    profitSharingPercent: 1.5, // 1.5% per bulan = Rp 4.500.000 / bln
    profitSharingDay: 25,
    monthlyProfitAmount: 4500000,
    totalProjectedProfit: 54000000,
    bankName: 'Bank BCA',
    bankAccountNumber: '088-291-8841',
    bankAccountHolder: 'H. Gunawan Prasetyo',
    status: 'ACTIVE',
    notes: 'Perjanjian Akta Notaris No. 18/Notaris-JKT/2026 dengan klausul bagi hasil 1.5% per bulan selama 12 bulan.',
    schedules: generateInvestmentSchedule(
      '2026-01-15',
      12,
      300000000,
      1.5,
      25,
      'Bank BCA',
      '088-291-8841',
      'H. Gunawan Prasetyo'
    ),
    createdAt: '2026-01-15 09:00',
    updatedAt: '2026-08-25 10:00'
  },
  {
    id: 'inv-002',
    code: 'INV-2026-002',
    investorName: 'PT Sinergi Ventura Nusantara',
    investorContact: '021-5290-7788',
    investorEmail: 'invest@sinergiventura.co.id',
    investorIdNumber: '01.889.992.4-012.000',
    startDate: '2026-03-01',
    endDate: '2027-03-01',
    durationMonths: 12,
    capitalAmount: 200000000, // Rp 200.000.000
    allocation: 'Modal Kerja Operasional & Penambahan Manpower RS Siloam & IGD Care',
    projectId: 'proj-2',
    projectName: 'RS Medika Utama',
    profitSharingPercent: 1.75, // 1.75% per bulan = Rp 3.500.000 / bln
    profitSharingDay: 28,
    monthlyProfitAmount: 3500000,
    totalProjectedProfit: 42000000,
    bankName: 'Bank Mandiri',
    bankAccountNumber: '137-00-1928374-1',
    bankAccountHolder: 'PT Sinergi Ventura Nusantara',
    status: 'ACTIVE',
    notes: 'Penyertaan modal kerja penunjang penyerapan 20 personil tambahan RS Akreditasi KARS.',
    schedules: generateInvestmentSchedule(
      '2026-03-01',
      12,
      200000000,
      1.75,
      28,
      'Bank Mandiri',
      '137-00-1928374-1',
      'PT Sinergi Ventura Nusantara'
    ),
    createdAt: '2026-03-01 10:00',
    updatedAt: '2026-08-20 11:30'
  },
  {
    id: 'inv-003',
    code: 'INV-2026-003',
    investorName: 'Ibu Dr. Maya Anggraini, Sp.A',
    investorContact: '0812-9988-7711',
    investorEmail: 'maya.anggraini@medika.org',
    investorIdNumber: '3171055508820002',
    startDate: '2026-06-10',
    endDate: '2027-06-10',
    durationMonths: 12,
    capitalAmount: 150000000, // Rp 150.000.000
    allocation: 'Ekspansi Perlengkapan Gondola Facade & K3 Ketinggian Gedung Wisma Rajawali',
    projectId: 'proj-3',
    projectName: 'Menara Bintang Tower',
    profitSharingPercent: 2.0, // 2.0% per bulan = Rp 3.000.000 / bln
    profitSharingDay: 10,
    monthlyProfitAmount: 3000000,
    totalProjectedProfit: 36000000,
    bankName: 'Bank BNI',
    bankAccountNumber: '098-765-4321',
    bankAccountHolder: 'Dr. Maya Anggraini',
    status: 'ACTIVE',
    notes: 'Investasi unit perlengkapan safety rope access and gondola building facade.',
    schedules: generateInvestmentSchedule(
      '2026-06-10',
      12,
      150000000,
      2.0,
      10,
      'Bank BNI',
      '098-765-4321',
      'Dr. Maya Anggraini'
    ),
    createdAt: '2026-06-10 14:00',
    updatedAt: '2026-08-10 16:00'
  }
];

