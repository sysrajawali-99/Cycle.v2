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
  ProfitSharingStatus,
  ClientContract,
  ClientInvoice
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

export const INITIAL_FINANCE_TRANSACTIONS: FinanceTransaction[] = [];

export const INITIAL_BANK_STATEMENTS: BankStatementImport[] = [];

export const INITIAL_PERIOD_CLOSINGS: PeriodClosing[] = [];

export const INITIAL_AUDIT_TRAILS: AuditTrailItem[] = [];

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
  bankAccountHolder: string,
  hasSplitProfit: boolean = false,
  secondaryProfitPercent: number = 0,
  secondaryBankName: string = '',
  secondaryBankAccountNumber: string = '',
  secondaryBankAccountHolder: string = ''
): InvestmentScheduleRow[] {
  const schedules: InvestmentScheduleRow[] = [];
  const start = new Date(startDate || '2026-01-01');
  const primaryProfit = (capitalAmount * (profitSharingPercent || 0)) / 100;
  const secondaryProfit = hasSplitProfit ? (capitalAmount * (secondaryProfitPercent || 0)) / 100 : 0;
  const totalCombinedProfit = primaryProfit + secondaryProfit;

  for (let i = 1; i <= durationMonths; i++) {
    const dueDateObj = new Date(start.getFullYear(), start.getMonth() + i, profitSharingDay);
    const yyyy = dueDateObj.getFullYear();
    const mm = String(dueDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(Math.min(profitSharingDay, 28)).padStart(2, '0');
    const dueDateStr = `${yyyy}-${mm}-${dd}`;

    const monthLabel = dueDateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    const isPast = dueDateObj < new Date('2026-08-20');
    const principalReturn = i === durationMonths ? capitalAmount : 0;
    const totalPayout = totalCombinedProfit + principalReturn;

    schedules.push({
      id: `sch-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      monthIndex: i,
      monthLabel: `Bulan ke-${i} (${monthLabel})`,
      dueDate: dueDateStr,
      profitAmount: primaryProfit,
      secondaryProfitAmount: hasSplitProfit ? secondaryProfit : 0,
      totalProfitCombined: totalCombinedProfit,
      principalReturnAmount: principalReturn,
      totalPayout: totalPayout,
      status: isPast ? ('DI Realisasikan' as ProfitSharingStatus) : ('Ditunda' as ProfitSharingStatus),
      realizationDate: isPast ? dueDateStr : undefined,
      bankNameSnapshot: bankName,
      bankAccountNumberSnapshot: bankAccountNumber,
      accountHolderSnapshot: bankAccountHolder,
      secondaryBankNameSnapshot: hasSplitProfit ? secondaryBankName : undefined,
      secondaryAccountNumberSnapshot: hasSplitProfit ? secondaryBankAccountNumber : undefined,
      secondaryAccountHolderSnapshot: hasSplitProfit ? secondaryBankAccountHolder : undefined,
      transferProof: isPast ? `TRF-BGI-M${i}-${yyyy}${mm}` : undefined,
      secondaryTransferProof: isPast && hasSplitProfit ? `TRF-IMB-M${i}-${yyyy}${mm}` : undefined,
      notes: isPast ? `Bagi hasil bulan ke-${i} telah direalisasikan` : `Menunggu jatuh tempo tanggal ${profitSharingDay}`
    });
  }

  return schedules;
}

// ---------------------------------------------------------------------------
// INITIAL INVESTMENTS (PENCATATAN INVESTASI & BAGI HASIL INVESTOR)
// ---------------------------------------------------------------------------
export const INITIAL_INVESTMENTS: InvestmentRecord[] = [];

// ---------------------------------------------------------------------------
// INITIAL CLIENT CONTRACTS & INVOICES (KONTRAK & INVOICE KLIEN)
// ---------------------------------------------------------------------------
export const INITIAL_CLIENT_CONTRACTS: ClientContract[] = [
  {
    id: 'ktr-001',
    contractNumber: 'KTR/RC/2026/01/001',
    clientName: 'PT Pakuwon Jati Tbk - Gandaria City',
    clientAddress: 'Jl. Sultan Iskandar Muda No. 8, Kebayoran Lama, Jakarta Selatan 12240',
    clientTaxId: '01.234.567.8-012.000',
    projectId: 'proj-1',
    projectName: 'Mall Gandaria City',
    manpowerAllocations: [
      { id: 'mpa-1', position: 'Cleaner', count: 18, monthlyRatePerPerson: 3200000 },
      { id: 'mpa-2', position: 'Supervisor', count: 2, monthlyRatePerPerson: 5500000 },
      { id: 'mpa-3', position: 'Team Leader', count: 2, monthlyRatePerPerson: 4200000 }
    ],
    monthlyContractValue: 88500000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    paymentTermDays: 30,
    status: 'Aktif',
    addendumNotes: 'Addendum No. 01/ADD/RC-GC/VI/2026 terkait penambahan area food court & toilet UG.',
    addendumHistory: [
      {
        id: 'add-001',
        date: '2026-06-01',
        reason: 'Penambahan 2 personil cleaner area perluasan Food Society & East Lobby',
        previousMonthlyValue: 80000000,
        newMonthlyValue: 88500000,
        differenceAmount: 8500000,
        notes: 'Disepakati oleh Building Management & Direktur Operasional',
        recordedBy: 'Dewi Lestari, S.Ak'
      }
    ],
    createdAt: '2026-01-05T08:30:00Z',
    createdBy: 'Dewi Lestari, S.Ak'
  },
  {
    id: 'ktr-002',
    contractNumber: 'KTR/RC/2025/11/002',
    clientName: 'PT Medika Utama Husada - RS Medika',
    clientAddress: 'Jl. Margonda Raya No. 100, Beji, Depok, Jawa Barat 16423',
    clientTaxId: '01.345.678.9-412.000',
    projectId: 'proj-2',
    projectName: 'RS Medika Utama',
    manpowerAllocations: [
      { id: 'mpa-4', position: 'Cleaner (Hospital Trained)', count: 14, monthlyRatePerPerson: 3300000 },
      { id: 'mpa-5', position: 'Supervisor', count: 1, monthlyRatePerPerson: 5500000 },
      { id: 'mpa-6', position: 'Team Leader', count: 1, monthlyRatePerPerson: 4300000 }
    ],
    monthlyContractValue: 64000000,
    startDate: '2025-11-01',
    endDate: '2026-10-31', // Berakhir dalam < 60 hari!
    paymentTermDays: 30,
    status: 'Akan Berakhir',
    addendumNotes: 'Draft perpanjangan kontrak tahun 2026-2027 sedang tahap review legal.',
    addendumHistory: [],
    createdAt: '2025-10-25T10:00:00Z',
    createdBy: 'Dewi Lestari, S.Ak'
  },
  {
    id: 'ktr-003',
    contractNumber: 'KTR/RC/2026/03/003',
    clientName: 'Bintang Capital Management',
    clientAddress: 'Gedung Menara Bintang Lt. 8, Jl. H.R. Rasuna Said Kav. C-17, Kuningan, Jakarta Selatan 12940',
    clientTaxId: '02.456.789.0-014.000',
    projectId: 'proj-3',
    projectName: 'Menara Bintang Kuningan',
    manpowerAllocations: [
      { id: 'mpa-7', position: 'Cleaner', count: 12, monthlyRatePerPerson: 3200000 },
      { id: 'mpa-8', position: 'Supervisor', count: 1, monthlyRatePerPerson: 5500000 },
      { id: 'mpa-9', position: 'Floor Specialist', count: 1, monthlyRatePerPerson: 4500000 }
    ],
    monthlyContractValue: 55000000,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    paymentTermDays: 30,
    status: 'Aktif',
    addendumNotes: 'Termasuk paket kristalisasi poles lantai marmer lobby tiap kuartal.',
    addendumHistory: [],
    createdAt: '2026-02-20T11:00:00Z',
    createdBy: 'Dewi Lestari, S.Ak'
  },
  {
    id: 'ktr-004',
    contractNumber: 'KTR/RC/2025/09/004',
    clientName: 'Perhimpunan Penghuni Senopati Park',
    clientAddress: 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan 12190',
    clientTaxId: '03.567.890.1-015.000',
    projectId: 'proj-4',
    projectName: 'Senopati Park Residence',
    manpowerAllocations: [
      { id: 'mpa-10', position: 'Cleaner', count: 10, monthlyRatePerPerson: 3100000 },
      { id: 'mpa-11', position: 'Supervisor', count: 1, monthlyRatePerPerson: 5200000 }
    ],
    monthlyContractValue: 42000000,
    startDate: '2025-09-01',
    endDate: '2026-08-31', // Telah berakhir
    paymentTermDays: 15,
    status: 'Berakhir',
    addendumNotes: 'Kontrak telah selesai per 31 Agustus 2026.',
    addendumHistory: [],
    createdAt: '2025-08-15T14:00:00Z',
    createdBy: 'Dewi Lestari, S.Ak'
  }
];

export const INITIAL_CLIENT_INVOICES: ClientInvoice[] = [
  {
    id: 'cinv-001',
    invoiceNumber: 'INV/2026/08/001',
    contractId: 'ktr-001',
    contractNumber: 'KTR/RC/2026/01/001',
    clientName: 'PT Pakuwon Jati Tbk - Gandaria City',
    clientAddress: 'Jl. Sultan Iskandar Muda No. 8, Kebayoran Lama, Jakarta Selatan 12240',
    clientTaxId: '01.234.567.8-012.000',
    projectId: 'proj-1',
    projectName: 'Mall Gandaria City',
    billingPeriod: 'Agustus 2026',
    issueDate: '2026-08-01',
    dueDate: '2026-08-31',
    baseMonthlyAmount: 88500000,
    extraItems: [
      {
        id: 'ext-1',
        description: 'Special Deep Cleaning Area Skywalk pasca event festival',
        quantity: 1,
        unitPrice: 4500000,
        subtotal: 4500000
      }
    ],
    subtotalExtra: 4500000,
    subtotalBeforeTax: 93000000,
    isPpnEnabled: true,
    ppnRatePercent: 11,
    ppnAmount: 10230000,
    isPph23Enabled: true,
    pph23RatePercent: 2,
    pph23Amount: 1860000,
    totalAmount: 101370000,
    paidAmount: 101370000,
    remainingAmount: 0,
    status: 'Lunas',
    notes: 'Lunas via transfer BCA KCU Mega Kuningan ref TRF-BCA-889921',
    payments: [
      {
        id: 'invp-1',
        date: '2026-08-25',
        amount: 101370000,
        paymentMethod: 'Bank BCA (541-0988-771)',
        accountCode: '1120',
        referenceNumber: 'TRF-BCA-889921',
        notes: 'Pelunasan tagihan invoice Agustus 2026',
        recordedBy: 'Dewi Lestari, S.Ak'
      }
    ],
    createdAt: '2026-08-01T09:00:00Z',
    createdBy: 'Dewi Lestari, S.Ak'
  },
  {
    id: 'cinv-002',
    invoiceNumber: 'INV/2026/09/001',
    contractId: 'ktr-001',
    contractNumber: 'KTR/RC/2026/01/001',
    clientName: 'PT Pakuwon Jati Tbk - Gandaria City',
    clientAddress: 'Jl. Sultan Iskandar Muda No. 8, Kebayoran Lama, Jakarta Selatan 12240',
    clientTaxId: '01.234.567.8-012.000',
    projectId: 'proj-1',
    projectName: 'Mall Gandaria City',
    billingPeriod: 'September 2026',
    issueDate: '2026-09-01',
    dueDate: '2026-09-30',
    baseMonthlyAmount: 88500000,
    extraItems: [],
    subtotalExtra: 0,
    subtotalBeforeTax: 88500000,
    isPpnEnabled: true,
    ppnRatePercent: 11,
    ppnAmount: 9735000,
    isPph23Enabled: true,
    pph23RatePercent: 2,
    pph23Amount: 1770000,
    totalAmount: 96465000,
    paidAmount: 0,
    remainingAmount: 96465000,
    status: 'Terkirim',
    notes: 'Invoice resmi telah dikirim ke Building Management Gandaria City.',
    payments: [],
    createdAt: '2026-09-01T08:30:00Z',
    createdBy: 'Dewi Lestari, S.Ak'
  },
  {
    id: 'cinv-003',
    invoiceNumber: 'INV/2026/09/002',
    contractId: 'ktr-002',
    contractNumber: 'KTR/RC/2025/11/002',
    clientName: 'PT Medika Utama Husada - RS Medika',
    clientAddress: 'Jl. Margonda Raya No. 100, Beji, Depok, Jawa Barat 16423',
    clientTaxId: '01.345.678.9-412.000',
    projectId: 'proj-2',
    projectName: 'RS Medika Utama',
    billingPeriod: 'September 2026',
    issueDate: '2026-09-01',
    dueDate: '2026-09-30',
    baseMonthlyAmount: 64000000,
    extraItems: [
      {
        id: 'ext-2',
        description: 'Fogging Disinfeksi Sterilisasi Kamar Operasi & ICU',
        quantity: 2,
        unitPrice: 2000000,
        subtotal: 4000000
      }
    ],
    subtotalExtra: 4000000,
    subtotalBeforeTax: 68000000,
    isPpnEnabled: true,
    ppnRatePercent: 11,
    ppnAmount: 7480000,
    isPph23Enabled: true,
    pph23RatePercent: 2,
    pph23Amount: 1360000,
    totalAmount: 74120000,
    paidAmount: 0,
    remainingAmount: 74120000,
    status: 'Terkirim',
    notes: 'Invoice periode September 2026 dikirimkan ke bagian Keuangan RS Medika.',
    payments: [],
    createdAt: '2026-09-01T09:15:00Z',
    createdBy: 'Dewi Lestari, S.Ak'
  }
];

