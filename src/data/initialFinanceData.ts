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
