import { AppView } from './index';

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export type AccountCategory = 
  | 'Kas & Bank'
  | 'Piutang Usaha'
  | 'Persediaan & Logistik'
  | 'Biaya Dibayar di Muka'
  | 'Aset Tetap'
  | 'Akumulasi Penyusutan'
  | 'Utang Usaha / Supplier'
  | 'Utang Gaji & Operasional'
  | 'Utang Pajak'
  | 'Utang Jangka Panjang'
  | 'Modal Saham'
  | 'Laba Ditahan'
  | 'Pendapatan Jasa Kontrak'
  | 'Pendapatan Jasa Khusus'
  | 'Pendapatan Non-Operasional'
  | 'HPP - Tenaga Kerja Langsung'
  | 'HPP - Chemical & Perlengkapan'
  | 'Beban Gaji Staf & Manajemen'
  | 'Beban Operasional Gedung'
  | 'Beban Pemeliharaan & Mesin'
  | 'Beban Pemasaran & Representasi'
  | 'Beban Umum & Administrasi'
  | 'Beban Penyusutan Aset'
  | 'Beban Pajak & Bunga Bank';

export interface ChartOfAccount {
  code: string;
  name: string;
  type: AccountType;
  category: AccountCategory | string;
  normalBalance: 'Debit' | 'Credit';
  initialBalance: number;
  currentBalance: number;
  description: string;
  isActive: boolean;
  isSystem?: boolean;
  isSubAccount?: boolean;
  parentCode?: string;
  parentName?: string;
  level?: number; // 1 = Akun Induk / Header, 2 = Akun Standar / Sub-Akun Level 1, 3 = Sub-Akun Level 2
}

export type TransactionType = 'IN' | 'OUT' | 'JOURNAL' | 'ADJUSTMENT';

export type PaymentMethod = 
  | 'Bank BCA (123-456-7890)'
  | 'Bank Mandiri (987-654-3210)'
  | 'Bank BNI (555-444-333)'
  | 'Bank BRI (888-999-000)'
  | 'Kas Tunai / Petty Cash HQ'
  | 'Kas Operasional Lapangan';

export type DivisionType = 
  | 'Cleaning Service'
  | 'Gondola & Facade'
  | 'Gardening & Landscape'
  | 'Sanitation & Pest Control'
  | 'Logistik & Chemical'
  | 'HQ Management & Operasional';

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  notes?: string;
}

export interface FinanceTransaction {
  id: string;
  code: string; // e.g. BKM-2026-08-001 or BKK-2026-08-001 or JU-2026-08-001
  date: string; // YYYY-MM-DD
  type: TransactionType; // IN (Uang Masuk), OUT (Uang Keluar), JOURNAL (Jurnal Umum), ADJUSTMENT (Jurnal Penyesuaian)
  title: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  primaryAccountCode: string; // Akun Kas/Bank atau Akun Utama
  contraAccountCode: string; // Akun Lawan (Pendapatan/Beban/Utang/Piutang)
  journalEntries: JournalEntryLine[];
  projectId: string; // 'ALL' or specific projectId (Cost Center)
  projectName?: string;
  division: DivisionType;
  currency: 'IDR' | 'USD' | 'SGD';
  exchangeRate: number; // to IDR
  referenceNumber?: string; // No Kuitansi / Invoice / Faktur
  payeeOrPayer?: string; // Dari Siapa / Kepada Siapa
  attachmentName?: string;
  isReconciled: boolean;
  bankStatementItemId?: string;
  isAdjusting: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type ReconcileStatus = 'MATCHED' | 'UNMATCHED' | 'MANUAL_MATCHED' | 'IGNORED';

export interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  type: 'CR' | 'DB'; // CR = Uang Masuk, DB = Uang Keluar
  amount: number;
  balance?: number;
  referenceNumber?: string;
  matchStatus: ReconcileStatus;
  matchedTransactionId?: string;
  matchedTransactionCode?: string;
  suggestedAccountCode?: string;
  confidenceScore?: number; // 0 - 100
  notes?: string;
}

export interface BankStatementImport {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  periodMonth: string; // e.g. 2026-08
  fileName: string;
  uploadDate: string;
  totalTransactions: number;
  totalCredit: number; // Masuk
  totalDebit: number; // Keluar
  matchedCount: number;
  unmatchedCount: number;
  items: BankStatementItem[];
}

export interface PeriodClosing {
  id: string;
  periodYear?: number;
  periodMonth: string | number;
  periodLabel?: string;
  closedAt: string;
  closedBy: string;
  status?: 'CLOSED' | 'OPEN';
  isLocked?: boolean;
  netProfitTransferred?: number;
  netProfit?: number;
  totalRevenue: number;
  totalExpense?: number;
  totalExpenses?: number;
  notes: string;
}

export interface AuditTrailItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'RECONCILE' | 'CLOSE_PERIOD' | 'REOPEN_PERIOD' | 'IMPORT_STATEMENT';
  module: 'Uang Masuk' | 'Uang Keluar' | 'Jurnal Umum' | 'Jurnal Penyesuaian' | 'Rekonsiliasi Bank' | 'Tutup Buku' | 'Master Akun COA' | 'Investasi & Bagi Hasil' | 'Utang Piutang' | 'Arus Kas' | string;
  recordId: string;
  recordCode?: string;
  description: string;
  amount?: number;
  ipAddress?: string;
}

export interface CostCenterReport {
  projectId: string;
  projectName: string;
  revenue: number;
  cogsLabor: number;
  cogsChemical: number;
  cogsOther: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  directOpex: number;
  netContribution: number;
  netContributionPct: number;
  cleanerCount: number;
  costPerCleaner: number;
}

export interface FinancialRatios {
  currentRatio: number; // Aset Lancar / Liabilitas Lancar
  quickRatio: number; // (Kas + Piutang) / Liabilitas Lancar
  cashRatio: number; // Kas & Bank / Liabilitas Lancar
  grossProfitMargin: number; // (Laba Kotor / Pendapatan) * 100
  operatingProfitMargin: number; // (Laba Usaha / Pendapatan) * 100
  netProfitMargin: number; // (Laba Bersih / Pendapatan) * 100
  returnOnAssets: number; // (Laba Bersih / Total Aset) * 100
  returnOnEquity: number; // (Laba Bersih / Total Ekuitas) * 100
  debtToEquityRatio: number; // Total Liabilitas / Total Ekuitas
  debtToAssetRatio: number; // Total Liabilitas / Total Aset
  workingCapital: number; // Aset Lancar - Liabilitas Lancar
  monthlyBurnRate: number; // Rata-rata beban operasional bulanan
  cashRunwayMonths: number; // Total Kas / Monthly Burn Rate
}

export type FinancialRatio = FinancialRatios;

export interface StatementAccountItem {
  code: string;
  accountCode: string;
  name: string;
  accountName: string;
  amount: number;
}

export interface ProfitLossStatement {
  periodLabel: string;
  revenueAccounts: StatementAccountItem[];
  revenues: StatementAccountItem[];
  totalRevenue: number;
  cogsAccounts: StatementAccountItem[];
  cogs: StatementAccountItem[];
  totalCogs: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPct: number;
  grossProfitMargin: number;
  opexAccounts: StatementAccountItem[];
  operationalExpenses: StatementAccountItem[];
  expenses?: StatementAccountItem[];
  totalOpex: number;
  totalExpenses: number;
  operatingIncome: number;
  operatingProfit?: number;
  operatingMarginPct: number;
  otherIncomeAccounts: StatementAccountItem[];
  otherIncomes?: StatementAccountItem[];
  totalOtherIncome: number;
  otherExpenseAccounts: StatementAccountItem[];
  otherExpenses?: StatementAccountItem[];
  totalOtherExpense: number;
  netProfit: number;
  netMarginPct: number;
  netProfitMargin: number;
}

export interface BalanceSheetStatement {
  asOfDate: string;
  currentAssets: StatementAccountItem[];
  totalCurrentAssets: number;
  fixedAssets: StatementAccountItem[];
  totalFixedAssets: number;
  totalAssets: number;
  currentLiabilities: StatementAccountItem[];
  totalCurrentLiabilities: number;
  longTermLiabilities: StatementAccountItem[];
  totalLongTermLiabilities: number;
  totalLiabilities: number;
  equityAccounts: StatementAccountItem[];
  equityItems: StatementAccountItem[];
  currentPeriodNetProfit: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  variance: number;
}

export interface CashFlowActivityItem {
  accountName: string;
  description: string;
  amount: number;
}

export interface CashFlowStatement {
  periodLabel: string;
  operatingActivities: CashFlowActivityItem[];
  operatingInflows: { description: string; amount: number }[];
  totalOperatingInflows: number;
  operatingOutflows: { description: string; amount: number }[];
  totalOperatingOutflows: number;
  netOperatingCashFlow: number;
  netCashFromOperating: number;

  investingActivities: CashFlowActivityItem[];
  investingInflows: { description: string; amount: number }[];
  investingOutflows: { description: string; amount: number }[];
  netInvestingCashFlow: number;
  netCashFromInvesting: number;

  financingActivities: CashFlowActivityItem[];
  financingInflows: { description: string; amount: number }[];
  financingOutflows: { description: string; amount: number }[];
  netFinancingCashFlow: number;
  netCashFromFinancing: number;

  netCashChange: number;
  netCashIncrease: number;
  beginningCash: number;
  endingCash: number;
}

export interface EquityStatement {
  periodLabel: string;
  beginningEquity: number;
  beginningShareCapital: number;
  additionalCapital: number;
  capitalAdditions: number;
  endingShareCapital: number;
  beginningRetainedEarnings: number;
  currentNetProfit: number;
  netProfitPeriod: number;
  dividendsPaid: number;
  drawingsOrDividends: number;
  adjustments: number;
  endingRetainedEarnings: number;
  totalBeginningEquity: number;
  totalEndingEquity: number;
  endingEquity: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  type: string;
  category: string;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceSummary {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
}

export interface CurrencyRate {
  code: 'IDR' | 'USD' | 'SGD';
  name: string;
  symbol: string;
  rateToIdr: number;
  lastUpdated: string;
}

export interface AICostCenterAnomaly {
  costCenterName: string;
  category?: string;
  accountCategory?: string;
  currentExpense?: number;
  benchmarkPercent?: number;
  actualPercent?: number;
  variancePercentage?: number;
  severity?: 'LOW' | 'MEDIUM' | 'WARNING' | 'CRITICAL';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  recommendation: string;
}

export interface AIFinancialInsight {
  timestamp: string;
  model: string;
  healthScore: number; // 0 - 100
  healthStatus: 'Sangat Sehat' | 'Sehat & Efisien' | 'Perlu Pengawasan' | 'Kritis / Defisit' | 'SEHAT' | 'WASPADA' | 'KRITIS';
  summary?: string;
  executiveSummary?: string;
  strengths?: string[];
  keyRisks?: string[];
  recommendations?: Array<{
    id?: string;
    title: string;
    category?: string;
    impact?: string;
    estimatedSavings?: number;
    actionPlan?: string;
  }>;
  costOptimizationAdvice?: {
    title: string;
    impact: 'Tinggi' | 'Sedang' | 'Rendah';
    potentialSaving: number;
    description: string;
    actionSteps: string[];
  }[];
  costCenterAnomalies?: AICostCenterAnomaly[];
  cashFlowLiquidityAdvice?: {
    cashRunwayMonths: number;
    burnRateMonthly: number;
    liquidityStatus: string;
    advice: string;
  };
  cashFlowForecast?: {
    nextMonthInflowEstimate: number;
    nextMonthOutflowEstimate: number;
    safetyBufferRecommendation: number;
    runwayMonths: string | number;
  };
  costEfficiencyAnalysis?: string;
  riskFactors?: string[];
  taxAndComplianceAdvice?: {
    topic: string;
    regulation: string;
    status: 'Compliant' | 'Warning' | 'Attention Required';
    recommendation: string;
  }[];
  closingReadinessAdvice?: {
    isReadyForClosing: boolean;
    unreconciledItemsCount: number;
    recommendations: string[];
  };
  strategicGoalsNextPeriod?: string[];
}

// ---------------------------------------------------------------------------
// 7. PENCATATAN HUTANG & PIUTANG (ACCOUNTS PAYABLE & RECEIVABLE)
// ---------------------------------------------------------------------------

export type DebtType = 
  | 'HUTANG_VENDOR' 
  | 'HUTANG_OPERASIONAL' 
  | 'HUTANG_LEASING_MESIN' 
  | 'HUTANG_PINJAMAN' 
  | 'HUTANG_LAINNYA';

export type DebtStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface DebtPaymentHistory {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod | string;
  accountCode: string; // Akun Kas/Bank yang digunakan membayar
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  attachmentName?: string;
}

export interface DebtRecord {
  id: string;
  code: string; // e.g. HUT-2026-08-001
  type: DebtType;
  creditorName: string; // Vendor / Supplier / Lembaga
  contactPerson?: string;
  phone?: string;
  invoiceNumber: string; // No Faktur / Tagihan Vendor
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: DebtStatus;
  projectId: string; // 'ALL' or specific projectId
  projectName?: string;
  accountCode: string; // e.g. '2110' - Utang Usaha / Supplier
  category: string;
  notes?: string;
  payments: DebtPaymentHistory[];
  createdAt: string;
  updatedAt?: string;
}

export type ReceivableType = 
  | 'PIUTANG_KONTRAK_JASA' 
  | 'PIUTANG_PROJECT_KHUSUS' 
  | 'PIUTANG_LAINNYA';

export type ReceivableStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface ReceivablePaymentHistory {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod | string;
  accountCode: string; // Akun Kas/Bank tujuan transfer
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  attachmentName?: string;
}

export interface ReceivableRecord {
  id: string;
  code: string; // e.g. PIU-2026-08-001
  type: ReceivableType;
  customerName: string; // Klien / Gedung / Customer
  contactPerson?: string;
  phone?: string;
  invoiceNumber: string; // No Invoice Resmi Rajawali
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  termOfPayment: string; // 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'COD'
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: ReceivableStatus;
  projectId: string; // Proyek / Site terkait
  projectName?: string;
  accountCode: string; // e.g. '1140' - Piutang Usaha
  notes?: string;
  payments: ReceivablePaymentHistory[];
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// 8. PENCATATAN INVESTASI & BAGI HASIL INVESTOR
// ---------------------------------------------------------------------------

export type ProfitSharingStatus = 'Ditunda' | 'DI Realisasikan';

export interface InvestmentScheduleRow {
  id: string;
  monthIndex: number; // Bulan ke- 1, 2, ... 12
  monthLabel: string; // e.g. "Bulan ke-1 (Sep 2026)"
  dueDate: string; // YYYY-MM-DD (Tanggal pemberian bagi hasil)
  profitAmount: number; // Nilai bagi hasil per bulan
  principalReturnAmount?: number; // Pengembalian pokok modal jika ada
  totalPayout: number;
  status: ProfitSharingStatus; // "Ditunda" / "DI Realisasikan"
  realizationDate?: string;
  bankAccountSnapshot?: string;
  bankAccountNumberSnapshot?: string;
  accountHolderSnapshot?: string;
  bankNameSnapshot?: string;
  transferProof?: string;
  notes?: string;
  updatedBy?: string;
}

export interface InvestmentRecord {
  id: string;
  code: string; // e.g. INV-2026-001
  investorName: string;
  investorContact?: string;
  investorEmail?: string;
  investorIdNumber?: string; // KTP / NPWP
  startDate: string; // Tanggal Mulai Investasi
  endDate: string; // Tanggal Berakhir Investasi
  durationMonths: number; // Durasi dalam bulan (e.g. 12 bulan)
  capitalAmount: number; // Modal Kerja / Nilai Pokok Investasi
  allocation: string; // Alokasi investasi / modal kerja (Site, Mesin, Manpower)
  projectId?: string; // 'ALL' or specific projectId
  projectName?: string;
  profitSharingPercent: number; // Nilai Bagi Hasil dalam persen % per bulan (e.g. 1.5%)
  profitSharingDay: number; // Tanggal pemberian bagi hasil tiap bulannya (e.g. tanggal 25)
  monthlyProfitAmount: number; // Nominal bagi hasil per bulan (capitalAmount * profitSharingPercent / 100)
  totalProjectedProfit: number; // Total bagi hasil seluruh periode
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXTENDED' | 'TERMINATED';
  schedules: InvestmentScheduleRow[]; // Otomatis terbentuk n baris (misal 12 baris)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// 9. FORECAST RENCANA PENGELUARAN (CASH OUTFLOW FORECAST)
// ---------------------------------------------------------------------------

export interface SitePayrollProjection {
  projectId: string;
  projectName: string;
  activeHeadcount: number;
  basicSalaryTotal: number;
  allowanceTotal: number;
  overtimeEstimate: number;
  bpjsTotal: number;
  totalPayrollEstimate: number;
}

export interface OutflowForecastItem {
  id: string;
  date: string;
  periodMonth: string; // YYYY-MM
  category: 'PAYROLL_MANPOWER' | 'HUTANG_VENDOR' | 'BAGI_HASIL_INVESTOR' | 'OPERASIONAL_RUTIN' | 'CHEMICAL_LOGISTIK';
  categoryLabel: string;
  title: string;
  recipientOrVendor: string;
  projectId: string;
  projectName: string;
  amount: number;
  dueDate: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  isFixedOrCommitted: boolean;
  notes?: string;
}

export interface OutflowForecastMonthlySummary {
  month: string; // YYYY-MM
  monthLabel: string; // "Agustus 2026"
  payrollTotal: number;
  debtsTotal: number;
  investorProfitTotal: number;
  operationalTotal: number;
  grandTotal: number;
  dailyBreakdown?: Array<{
    date: string;
    dayLabel: string;
    totalAmount: number;
    itemsCount: number;
  }>;
}

