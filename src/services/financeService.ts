import {
  ChartOfAccount,
  FinanceTransaction,
  BankStatementItem,
  CostCenterReport,
  FinancialRatios,
  PeriodClosing,
  AuditTrailItem,
  ProfitLossStatement,
  BalanceSheetStatement,
  CashFlowStatement,
  EquityStatement,
  StatementAccountItem
} from '../types/finance';
import { Project } from '../types';
import { storageService } from './storageService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface GeneralLedgerEntry {
  transactionId: string;
  transactionCode: string;
  date: string;
  description: string;
  referenceNumber?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  projectName?: string;
}

export interface GeneralLedgerAccount {
  account: ChartOfAccount;
  initialBalance: number;
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
  entries: GeneralLedgerEntry[];
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  type: string;
  category: string;
  debitBalance: number;
  creditBalance: number;
}

export type { ProfitLossStatement, BalanceSheetStatement, CashFlowStatement, EquityStatement };

export const financeService = {
  // Format currency helper
  formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // 0. SINKRONISASI SALDO AKUN COA & LEDGER BERDASARKAN SELURUH TRANSAKSI (MUTASI BANK MATCH & MANUAL)
  recalculateAccountBalances(
    accounts: ChartOfAccount[],
    transactions: FinanceTransaction[] = []
  ): ChartOfAccount[] {
    const debitMap = new Map<string, number>();
    const creditMap = new Map<string, number>();

    const safeTrxs = Array.isArray(transactions) ? transactions : [];
    safeTrxs.forEach((trx) => {
      (trx.journalEntries || []).forEach((je) => {
        if (je.accountCode) {
          debitMap.set(je.accountCode, (debitMap.get(je.accountCode) || 0) + (je.debit || 0));
          creditMap.set(je.accountCode, (creditMap.get(je.accountCode) || 0) + (je.credit || 0));
        }
      });
    });

    const safeAccounts = Array.isArray(accounts) ? accounts : [];
    return safeAccounts.map((acc) => {
      const totalDebits = debitMap.get(acc.code) || 0;
      const totalCredits = creditMap.get(acc.code) || 0;
      const initial = acc.initialBalance || 0;

      let currentBalance = initial;
      if (
        acc.normalBalance === 'Debit' ||
        acc.type === 'Asset' ||
        acc.type === 'Expense' ||
        String(acc.type).toUpperCase() === 'ASSET' ||
        String(acc.type).toUpperCase() === 'EXPENSE'
      ) {
        currentBalance = initial + totalDebits - totalCredits;
      } else {
        currentBalance = initial + totalCredits - totalDebits;
      }

      return {
        ...acc,
        balance: currentBalance,
        currentBalance
      };
    });
  },

  // 1. GENERATE BUKU BESAR (GENERAL LEDGER)
  generateGeneralLedger(
    accounts: ChartOfAccount[],
    transactions: FinanceTransaction[] = [],
    startDate?: string,
    endDate?: string,
    projectId?: string
  ): GeneralLedgerAccount[] {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeAccounts = Array.isArray(accounts) ? accounts : [];

    const filteredTrx = safeTransactions.filter((t) => {
      if (!t) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      if (projectId && projectId !== 'ALL' && t.projectId !== projectId && t.projectId !== 'ALL') {
        return false;
      }
      return true;
    });

    return safeAccounts.map((acc) => {
      const entries: GeneralLedgerEntry[] = [];
      let runningBalance = acc.initialBalance || 0;
      let totalDebit = 0;
      let totalCredit = 0;

      filteredTrx.forEach((t) => {
        // Look for matching journal lines
        const lines = (t.journalEntries || []).filter((j) => j.accountCode === acc.code);
        lines.forEach((l) => {
          totalDebit += l.debit;
          totalCredit += l.credit;

          if (acc.normalBalance === 'Debit') {
            runningBalance += l.debit - l.credit;
          } else {
            runningBalance += l.credit - l.debit;
          }

          entries.push({
            transactionId: t.id,
            transactionCode: t.code,
            date: t.date,
            description: l.notes || t.title,
            referenceNumber: t.referenceNumber,
            debit: l.debit,
            credit: l.credit,
            runningBalance,
            projectName: t.projectName
          });
        });
      });

      return {
        account: acc,
        initialBalance: acc.initialBalance || 0,
        totalDebit,
        totalCredit,
        endingBalance: runningBalance,
        entries
      };
    });
  },

  // 2. GENERATE NERACA SALDO (TRIAL BALANCE)
  generateTrialBalance(
    accounts: ChartOfAccount[],
    transactions: FinanceTransaction[] = [],
    asOfDate?: string
  ): { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; isBalanced: boolean } {
    const ledgers = this.generateGeneralLedger(
      accounts,
      transactions,
      undefined,
      asOfDate
    );

    let totalDebit = 0;
    let totalCredit = 0;

    const rows: TrialBalanceRow[] = ledgers.map((l) => {
      let debitBalance = 0;
      let creditBalance = 0;

      if (l.account.normalBalance === 'Debit') {
        if (l.endingBalance >= 0) {
          debitBalance = l.endingBalance;
        } else {
          creditBalance = Math.abs(l.endingBalance);
        }
      } else {
        if (l.endingBalance >= 0) {
          creditBalance = l.endingBalance;
        } else {
          debitBalance = Math.abs(l.endingBalance);
        }
      }

      totalDebit += debitBalance;
      totalCredit += creditBalance;

      return {
        accountCode: l.account.code,
        accountName: l.account.name,
        type: l.account.type,
        category: l.account.category,
        debitBalance,
        creditBalance
      };
    });

    const isBalanced = Math.abs(totalDebit - totalCredit) < 100;

    return { rows, totalDebit, totalCredit, isBalanced };
  },

  // 3. GENERATE LAPORAN LABA RUGI (PROFIT & LOSS)
  generateProfitLoss(
    accounts: ChartOfAccount[],
    transactions: FinanceTransaction[],
    startDate?: string,
    endDate?: string,
    projectId?: string
  ): ProfitLossStatement {
    const ledgers = this.generateGeneralLedger(
      accounts,
      transactions,
      startDate,
      endDate,
      projectId
    );

    const getAccountSum = (prefix: string) => {
      return ledgers
        .filter((l) => l.account.code.startsWith(prefix))
        .map((l) => ({
          code: l.account.code,
          name: l.account.name,
          amount: Math.max(0, l.endingBalance)
        }))
        .filter((item) => item.amount > 0);
    };

    // Revenue (41xx, 42xx)
    const revenueAccounts = getAccountSum('41').map((a) => ({
      code: a.code,
      accountCode: a.code,
      name: a.name,
      accountName: a.name,
      amount: a.amount
    }));
    const totalRevenue = revenueAccounts.reduce((sum, item) => sum + item.amount, 0);

    // COGS (51xx)
    const cogsAccounts = getAccountSum('51').map((a) => ({
      code: a.code,
      accountCode: a.code,
      name: a.name,
      accountName: a.name,
      amount: a.amount
    }));
    const totalCogs = cogsAccounts.reduce((sum, item) => sum + item.amount, 0);

    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // OPEX (61xx kecuali 6170)
    const opexAccounts = ledgers
      .filter((l) => l.account.code.startsWith('61') && l.account.code !== '6170')
      .map((l) => ({
        code: l.account.code,
        accountCode: l.account.code,
        name: l.account.name,
        accountName: l.account.name,
        amount: Math.max(0, l.endingBalance)
      }))
      .filter((item) => item.amount > 0);
    const totalOpex = opexAccounts.reduce((sum, item) => sum + item.amount, 0);

    const operatingIncome = grossProfit - totalOpex;
    const operatingMarginPct = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

    // Other Income (42xx) & Other Expenses (6170)
    const otherIncomeAccounts = getAccountSum('42').map((a) => ({
      code: a.code,
      accountCode: a.code,
      name: a.name,
      accountName: a.name,
      amount: a.amount
    }));
    const totalOtherIncome = otherIncomeAccounts.reduce((sum, item) => sum + item.amount, 0);

    const otherExpenseAccounts = ledgers
      .filter((l) => l.account.code === '6170')
      .map((l) => ({
        code: l.account.code,
        accountCode: l.account.code,
        name: l.account.name,
        accountName: l.account.name,
        amount: Math.max(0, l.endingBalance)
      }))
      .filter((item) => item.amount > 0);
    const totalOtherExpense = otherExpenseAccounts.reduce((sum, item) => sum + item.amount, 0);

    const netProfit = operatingIncome + totalOtherIncome - totalOtherExpense;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const periodLabel = startDate && endDate 
      ? `${startDate} s/d ${endDate}` 
      : 'Periode Berjalan (YTD 2026)';

    return {
      periodLabel,
      revenueAccounts,
      revenues: revenueAccounts,
      totalRevenue,
      cogsAccounts,
      cogs: cogsAccounts,
      totalCogs,
      totalCOGS: totalCogs,
      grossProfit,
      grossMarginPct,
      grossProfitMargin: grossMarginPct,
      opexAccounts,
      operationalExpenses: opexAccounts,
      expenses: opexAccounts,
      totalOpex,
      totalExpenses: totalOpex,
      operatingIncome,
      operatingProfit: operatingIncome,
      operatingMarginPct,
      otherIncomeAccounts,
      otherIncomes: otherIncomeAccounts,
      totalOtherIncome,
      otherExpenseAccounts,
      otherExpenses: otherExpenseAccounts,
      totalOtherExpense,
      netProfit,
      netMarginPct,
      netProfitMargin: netMarginPct
    };
  },

  generateProfitLossStatement(
    accounts: ChartOfAccount[],
    transactions: FinanceTransaction[],
    startDate?: string,
    endDate?: string,
    projectId?: string
  ): ProfitLossStatement {
    return this.generateProfitLoss(accounts, transactions, startDate, endDate, projectId);
  },

  // 4. GENERATE NERACA (BALANCE SHEET)
  generateBalanceSheet(
    accounts: ChartOfAccount[],
    transactions: FinanceTransaction[],
    asOfDate?: string
  ): BalanceSheetStatement {
    const ledgers = this.generateGeneralLedger(
      accounts,
      transactions,
      undefined,
      asOfDate
    );

    // Current Assets (11xx)
    const currentAssets = ledgers
      .filter((l) => l.account.code.startsWith('11'))
      .map((l) => ({
        code: l.account.code,
        accountCode: l.account.code,
        name: l.account.name,
        accountName: l.account.name,
        amount: l.endingBalance
      }));
    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0);

    // Fixed Assets (12xx)
    const fixedAssets = ledgers
      .filter((l) => l.account.code.startsWith('12'))
      .map((l) => {
        // Kontra akun akumulasi penyusutan mengurangi total aset
        const isContra = l.account.normalBalance === 'Credit';
        return {
          code: l.account.code,
          accountCode: l.account.code,
          name: l.account.name,
          accountName: l.account.name,
          amount: isContra ? -Math.abs(l.endingBalance) : l.endingBalance
        };
      });
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    // Current Liabilities (21xx)
    const currentLiabilities = ledgers
      .filter((l) => l.account.code.startsWith('21'))
      .map((l) => ({
        code: l.account.code,
        accountCode: l.account.code,
        name: l.account.name,
        accountName: l.account.name,
        amount: l.endingBalance
      }));
    const totalCurrentLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);

    // Long Term Liabilities (22xx)
    const longTermLiabilities = ledgers
      .filter((l) => l.account.code.startsWith('22'))
      .map((l) => ({
        code: l.account.code,
        accountCode: l.account.code,
        name: l.account.name,
        accountName: l.account.name,
        amount: l.endingBalance
      }));
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, l) => sum + l.amount, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    // Equity (31xx, 32xx)
    const equityAccounts = ledgers
      .filter((l) => l.account.code.startsWith('3'))
      .map((l) => ({
        code: l.account.code,
        accountCode: l.account.code,
        name: l.account.name,
        accountName: l.account.name,
        amount: l.endingBalance
      }));
    const baseEquity = equityAccounts.reduce((sum, e) => sum + e.amount, 0);

    // Current period net profit
    const pl = this.generateProfitLoss(accounts, transactions, undefined, asOfDate);
    const currentPeriodNetProfit = pl.netProfit;

    const totalEquity = baseEquity + currentPeriodNetProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    const variance = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = variance < 100;

    return {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      currentAssets,
      totalCurrentAssets,
      fixedAssets,
      totalFixedAssets,
      totalAssets,
      currentLiabilities,
      totalCurrentLiabilities,
      longTermLiabilities,
      totalLongTermLiabilities,
      totalLiabilities,
      equityAccounts,
      equityItems: equityAccounts,
      currentPeriodNetProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      variance
    };
  },

  // 5. GENERATE LAPORAN ARUS KAS (CASH FLOW STATEMENT)
  generateCashFlow(
    accounts: ChartOfAccount[],
    transactions: FinanceTransaction[],
    startDate?: string,
    endDate?: string
  ): CashFlowStatement {
    const cashAccounts = ['1110', '1120', '1121', '1130'];
    const filtered = transactions.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });

    const operatingInflows: { description: string; amount: number }[] = [];
    const operatingOutflows: { description: string; amount: number }[] = [];
    const investingInflows: { description: string; amount: number }[] = [];
    const investingOutflows: { description: string; amount: number }[] = [];
    const financingInflows: { description: string; amount: number }[] = [];
    const financingOutflows: { description: string; amount: number }[] = [];

    filtered.forEach((t) => {
      // Check if transaction affects cash
      const hasCashLine = t.journalEntries.some((j) => cashAccounts.includes(j.accountCode));
      if (!hasCashLine) return;

      if (t.type === 'IN') {
        if (t.contraAccountCode.startsWith('4')) {
          operatingInflows.push({ description: `${t.code} - ${t.title}`, amount: t.amount });
        } else if (t.contraAccountCode.startsWith('12')) {
          investingInflows.push({ description: `${t.code} - Penjualan Aset (${t.title})`, amount: t.amount });
        } else if (t.contraAccountCode.startsWith('22') || t.contraAccountCode.startsWith('3')) {
          financingInflows.push({ description: `${t.code} - Penerimaan Modal/Pinjaman`, amount: t.amount });
        } else {
          operatingInflows.push({ description: `${t.code} - ${t.title}`, amount: t.amount });
        }
      } else if (t.type === 'OUT') {
        if (t.contraAccountCode.startsWith('5') || t.contraAccountCode.startsWith('6')) {
          operatingOutflows.push({ description: `${t.code} - ${t.title}`, amount: t.amount });
        } else if (t.contraAccountCode.startsWith('12')) {
          investingOutflows.push({ description: `${t.code} - Pengadaan Mesin & Aset`, amount: t.amount });
        } else if (t.contraAccountCode.startsWith('22') || t.contraAccountCode.startsWith('3')) {
          financingOutflows.push({ description: `${t.code} - Pembayaran Pokok Utang/Prive`, amount: t.amount });
        } else {
          operatingOutflows.push({ description: `${t.code} - ${t.title}`, amount: t.amount });
        }
      }
    });

    const totalOperatingInflows = operatingInflows.reduce((s, i) => s + i.amount, 0);
    const totalOperatingOutflows = operatingOutflows.reduce((s, i) => s + i.amount, 0);
    const netOperatingCashFlow = totalOperatingInflows - totalOperatingOutflows;

    const totalInvestingInflows = investingInflows.reduce((s, i) => s + i.amount, 0);
    const totalInvestingOutflows = investingOutflows.reduce((s, i) => s + i.amount, 0);
    const netInvestingCashFlow = totalInvestingInflows - totalInvestingOutflows;

    const totalFinancingInflows = financingInflows.reduce((s, i) => s + i.amount, 0);
    const totalFinancingOutflows = financingOutflows.reduce((s, i) => s + i.amount, 0);
    const netFinancingCashFlow = totalFinancingInflows - totalFinancingOutflows;

    const netCashChange = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;
    
    // Initial cash across accounts
    const beginningCash = accounts
      .filter((a) => cashAccounts.includes(a.code))
      .reduce((sum, a) => sum + (a.initialBalance || 0), 0);
    const endingCash = beginningCash + netCashChange;

    const operatingActivities = [
      ...operatingInflows.map((i) => ({ accountName: i.description, description: i.description, amount: i.amount })),
      ...operatingOutflows.map((o) => ({ accountName: o.description, description: o.description, amount: -o.amount }))
    ];
    const investingActivities = [
      ...investingInflows.map((i) => ({ accountName: i.description, description: i.description, amount: i.amount })),
      ...investingOutflows.map((o) => ({ accountName: o.description, description: o.description, amount: -o.amount }))
    ];
    const financingActivities = [
      ...financingInflows.map((i) => ({ accountName: i.description, description: i.description, amount: i.amount })),
      ...financingOutflows.map((o) => ({ accountName: o.description, description: o.description, amount: -o.amount }))
    ];

    return {
      periodLabel: startDate && endDate ? `${startDate} s/d ${endDate}` : 'Periode Berjalan 2026',
      operatingActivities,
      operatingInflows,
      totalOperatingInflows,
      operatingOutflows,
      totalOperatingOutflows,
      netOperatingCashFlow,
      netCashFromOperating: netOperatingCashFlow,
      investingActivities,
      investingInflows,
      investingOutflows,
      netInvestingCashFlow,
      netCashFromInvesting: netInvestingCashFlow,
      financingActivities,
      financingInflows,
      financingOutflows,
      netFinancingCashFlow,
      netCashFromFinancing: netFinancingCashFlow,
      netCashChange,
      netCashIncrease: netCashChange,
      beginningCash,
      endingCash
    };
  },

  // 6. GENERATE LAPORAN PERUBAHAN EKUITAS
  generateEquityStatement(
    accounts: ChartOfAccount[],
    transactionsOrNetProfit: FinanceTransaction[] | number,
    startDate?: string,
    endDate?: string
  ): EquityStatement {
    const capitalAccount = accounts.find((a) => a.code === '3110');
    const retainedAccount = accounts.find((a) => a.code === '3210');

    const beginningShareCapital = capitalAccount?.initialBalance || 500000000;
    const beginningRetainedEarnings = retainedAccount?.initialBalance || 331500000;

    let currentNetProfit = 0;
    if (typeof transactionsOrNetProfit === 'number') {
      currentNetProfit = transactionsOrNetProfit;
    } else if (Array.isArray(transactionsOrNetProfit)) {
      const pl = this.generateProfitLoss(accounts, transactionsOrNetProfit, startDate, endDate);
      currentNetProfit = pl.netProfit;
    }

    const capitalAdditions = 0;
    const dividendsPaid = 0;

    const endingShareCapital = beginningShareCapital + capitalAdditions;
    const endingRetainedEarnings = beginningRetainedEarnings + currentNetProfit - dividendsPaid;

    const totalBeginningEquity = beginningShareCapital + beginningRetainedEarnings;
    const totalEndingEquity = endingShareCapital + endingRetainedEarnings;

    return {
      periodLabel: startDate && endDate ? `${startDate} s/d ${endDate}` : 'Tahun Berjalan 2026',
      beginningEquity: totalBeginningEquity,
      beginningShareCapital,
      additionalCapital: capitalAdditions,
      capitalAdditions,
      endingShareCapital,
      beginningRetainedEarnings,
      currentNetProfit,
      netProfitPeriod: currentNetProfit,
      dividendsPaid,
      drawingsOrDividends: dividendsPaid,
      adjustments: 0,
      endingRetainedEarnings,
      totalBeginningEquity,
      totalEndingEquity,
      endingEquity: totalEndingEquity
    };
  },

  // 7. FINANCIAL RATIOS & ANALYTICS
  calculateFinancialRatios(
    arg1: any,
    arg2?: any,
    arg3?: any,
    arg4?: any
  ): FinancialRatios {
    let bs: BalanceSheetStatement;
    let pl: ProfitLossStatement;

    if (arg3 && arg4 && typeof arg3 === 'object' && typeof arg4 === 'object') {
      pl = arg3;
      bs = arg4;
    } else if (arg1 && arg2 && !Array.isArray(arg1) && !Array.isArray(arg2) && typeof arg1 === 'object' && typeof arg2 === 'object') {
      pl = arg1;
      bs = arg2;
    } else if (Array.isArray(arg1) && Array.isArray(arg2)) {
      bs = this.generateBalanceSheet(arg1, arg2);
      pl = this.generateProfitLoss(arg1, arg2);
    } else {
      // Fallback empty
      return {
        currentRatio: 0,
        quickRatio: 0,
        cashRatio: 0,
        grossProfitMargin: 0,
        operatingProfitMargin: 0,
        netProfitMargin: 0,
        returnOnAssets: 0,
        returnOnEquity: 0,
        debtToEquityRatio: 0,
        debtToAssetRatio: 0,
        workingCapital: 0,
        monthlyBurnRate: 0,
        cashRunwayMonths: 0
      };
    }

    const cashAccounts = ['1110', '1120', '1121', '1130'];
    const currentAssetsList = bs?.currentAssets || [];
    const totalCash = currentAssetsList
      .filter((a) => cashAccounts.includes(a.code || a.accountCode))
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    const accountsReceivable = currentAssetsList
      .filter((a) => (a.code || a.accountCode) === '1140')
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    const currentLiabilities = Math.max(1, bs?.totalCurrentLiabilities || 0);
    const currentAssets = bs?.totalCurrentAssets || 0;
    const totalRevenue = Math.max(1, pl?.totalRevenue || 0);
    const totalEquity = Math.max(1, bs?.totalEquity || 0);
    const totalAssets = Math.max(1, bs?.totalAssets || 0);

    const currentRatio = currentAssets / currentLiabilities;
    const quickRatio = (totalCash + accountsReceivable) / currentLiabilities;
    const cashRatio = totalCash / currentLiabilities;
    const grossProfitMargin = ((pl?.grossProfit || 0) / totalRevenue) * 100;
    const operatingProfitMargin = ((pl?.operatingIncome || 0) / totalRevenue) * 100;
    const netProfitMargin = ((pl?.netProfit || 0) / totalRevenue) * 100;
    const returnOnAssets = ((pl?.netProfit || 0) / totalAssets) * 100;
    const returnOnEquity = ((pl?.netProfit || 0) / totalEquity) * 100;
    const debtToEquityRatio = (bs?.totalLiabilities || 0) / totalEquity;
    const debtToAssetRatio = (bs?.totalLiabilities || 0) / totalAssets;
    const workingCapital = currentAssets - currentLiabilities;

    // Monthly burn rate (HPP + OPEX / count of months approx 1)
    const monthlyBurnRate = (pl?.totalCogs || pl?.totalCOGS || 0) + (pl?.totalOpex || pl?.totalExpenses || 0);
    const cashRunwayMonths = monthlyBurnRate > 0 ? totalCash / (monthlyBurnRate / 2) : 12;

    return {
      currentRatio: isNaN(currentRatio) ? 0 : currentRatio,
      quickRatio: isNaN(quickRatio) ? 0 : quickRatio,
      cashRatio: isNaN(cashRatio) ? 0 : cashRatio,
      grossProfitMargin: isNaN(grossProfitMargin) ? 0 : grossProfitMargin,
      operatingProfitMargin: isNaN(operatingProfitMargin) ? 0 : operatingProfitMargin,
      netProfitMargin: isNaN(netProfitMargin) ? 0 : netProfitMargin,
      returnOnAssets: isNaN(returnOnAssets) ? 0 : returnOnAssets,
      returnOnEquity: isNaN(returnOnEquity) ? 0 : returnOnEquity,
      debtToEquityRatio: isNaN(debtToEquityRatio) ? 0 : debtToEquityRatio,
      debtToAssetRatio: isNaN(debtToAssetRatio) ? 0 : debtToAssetRatio,
      workingCapital: isNaN(workingCapital) ? 0 : workingCapital,
      monthlyBurnRate: isNaN(monthlyBurnRate) ? 0 : monthlyBurnRate,
      cashRunwayMonths: isNaN(cashRunwayMonths) ? 0 : cashRunwayMonths
    };
  },

  // 8. COST CENTER REPORT PER PROYEK / LOKASI
  generateCostCenterReports(
    projects: Project[],
    transactions: FinanceTransaction[]
  ): CostCenterReport[] {
    return projects.map((p) => {
      const pTrx = transactions.filter((t) => t.projectId === p.id);

      let revenue = 0;
      let cogsLabor = 0;
      let cogsChemical = 0;
      let cogsOther = 0;
      let directOpex = 0;

      pTrx.forEach((t) => {
        if (t.type === 'IN') {
          revenue += t.amount;
        } else if (t.type === 'OUT') {
          if (t.contraAccountCode === '5110') {
            cogsLabor += t.amount;
          } else if (t.contraAccountCode === '5120') {
            cogsChemical += t.amount;
          } else if (t.contraAccountCode.startsWith('51')) {
            cogsOther += t.amount;
          } else if (t.contraAccountCode.startsWith('61')) {
            directOpex += t.amount;
          }
        }
      });

      // Default baseline if no direct records
      if (revenue === 0) {
        revenue = (p.manpowerCount || p.activeCleanersCount || 10) * 8500000;
        cogsLabor = (p.manpowerCount || p.activeCleanersCount || 10) * 5200000;
        cogsChemical = revenue * 0.08;
      }

      const totalCogs = cogsLabor + cogsChemical + cogsOther;
      const grossProfit = revenue - totalCogs;
      const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netContribution = grossProfit - directOpex;
      const netContributionPct = revenue > 0 ? (netContribution / revenue) * 100 : 0;

      const cleanerCount = p.manpowerCount || p.activeCleanersCount || 1;
      const costPerCleaner = cleanerCount > 0 ? totalCogs / cleanerCount : 0;

      return {
        projectId: p.id,
        projectName: p.name,
        revenue,
        cogsLabor,
        cogsChemical,
        cogsOther,
        totalCogs,
        grossProfit,
        grossMarginPct,
        directOpex,
        netContribution,
        netContributionPct,
        cleanerCount,
        costPerCleaner
      };
    });
  },

  // 9. SMART BANK STATEMENT PARSER & AUTO-RECONCILER
  parseStatementRawText(rawText: string, bankName: string = 'BCA'): BankStatementItem[] {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const items: BankStatementItem[] = [];

    lines.forEach((line, index) => {
      // Basic CSV or Tab delimiter detection
      const parts = line.includes('\t') ? line.split('\t') : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length >= 3) {
        const dateStr = parts[0]?.replace(/"/g, '').trim();
        const desc = parts[1]?.replace(/"/g, '').trim();
        const rawAmount = parts[2]?.replace(/"/g, '').replace(/[^\d.-]/g, '').trim();
        const numAmount = Math.abs(parseFloat(rawAmount) || 0);

        if (numAmount > 0) {
          const isDb = line.toUpperCase().includes('DB') || line.toUpperCase().includes('DEBIT') || rawAmount.startsWith('-');
          const type: 'CR' | 'DB' = isDb ? 'DB' : 'CR';

          items.push({
            id: `stmt-parsed-${Date.now()}-${index}`,
            date: dateStr || new Date().toISOString().split('T')[0],
            description: desc || `Mutasi ${bankName} #${index + 1}`,
            type,
            amount: numAmount,
            matchStatus: 'UNMATCHED',
            suggestedAccountCode: type === 'CR' ? '4110' : '5120',
            confidenceScore: 70
          });
        }
      }
    });

    return items;
  },

  // Auto-matching algorithm between Bank Items and Internal Transactions with smart multi-factor matching
  autoMatchBankStatements(
    bankItems: BankStatementItem[],
    transactions: FinanceTransaction[],
    options?: {
      minConfidence?: number;
      toleranceDays?: number;
      exactAmountTolerance?: number;
      forceRematch?: boolean;
    }
  ): BankStatementItem[] {
    const minConfidence = options?.minConfidence ?? 70;
    const toleranceDays = options?.toleranceDays ?? 5;
    const amountTolerance = options?.exactAmountTolerance ?? 1;
    const forceRematch = options?.forceRematch ?? false;

    // Track assigned transactions to prevent duplicate matching
    const usedTransactionIds = new Set<string>();

    // If transactions already reconciled to an existing bank item, mark them used unless forceRematch
    if (!forceRematch) {
      bankItems.forEach((item) => {
        if (item.matchStatus === 'MATCHED' && item.matchedTransactionId) {
          usedTransactionIds.add(item.matchedTransactionId);
        }
      });
    }

    return bankItems.map((item) => {
      if (!forceRematch && item.matchStatus === 'MATCHED' && item.matchedTransactionId) {
        return item;
      }

      // Find candidate matches in transactions
      let bestScore = 0;
      let matchedTrx: FinanceTransaction | null = null;

      // Filter available candidates
      const candidates = transactions.filter(
        (t) => forceRematch || !usedTransactionIds.has(t.id) || t.bankStatementItemId === item.id
      );

      candidates.forEach((t) => {
        let score = 0;

        // 1. Amount matching (up to 50 pts)
        const diffAmount = Math.abs(t.amount - item.amount);
        if (diffAmount <= amountTolerance) {
          score += 50;
        } else if (diffAmount <= 1000) {
          score += 35;
        } else if (diffAmount / Math.max(t.amount, item.amount) < 0.01) {
          // Less than 1% variance (e.g., admin fee deducted)
          score += 25;
        } else {
          // If amounts don't match closely, skip candidate
          return;
        }

        // 2. Direction match (20 pts)
        const isDirectionMatch =
          (item.type === 'CR' && t.type === 'IN') ||
          (item.type === 'DB' && t.type === 'OUT');
        if (isDirectionMatch) {
          score += 20;
        } else {
          // Wrong direction reduces candidate score drastically
          score -= 30;
        }

        // 3. Date proximity (up to 20 pts)
        if (t.date === item.date) {
          score += 20;
        } else {
          try {
            const tTime = new Date(t.date).getTime();
            const iTime = new Date(item.date).getTime();
            const diffDays = Math.abs((tTime - iTime) / (1000 * 3600 * 24));
            if (diffDays <= 1) {
              score += 15;
            } else if (diffDays <= toleranceDays) {
              score += 10;
            } else if (diffDays <= toleranceDays + 3) {
              score += 5;
            }
          } catch {
            // fallback
          }
        }

        // 4. Description & reference similarity (up to 20 pts)
        const tSearchText = `${t.title} ${t.description} ${t.referenceNumber || ''} ${t.payeeOrPayer || ''} ${t.projectName || ''}`.toLowerCase();
        const bSearchText = `${item.description} ${item.referenceNumber || ''}`.toLowerCase();

        // Exact reference match
        if (t.referenceNumber && t.referenceNumber.length >= 4 && bSearchText.includes(t.referenceNumber.toLowerCase())) {
          score += 20;
        } else if (t.code && bSearchText.includes(t.code.toLowerCase())) {
          score += 20;
        } else if (t.payeeOrPayer && t.payeeOrPayer.length >= 3 && bSearchText.includes(t.payeeOrPayer.toLowerCase())) {
          score += 15;
        } else {
          // Check common significant keywords
          const keywords = tSearchText.split(/\s+/).filter((k) => k.length >= 4 && !['biaya', 'bank', 'transfer', 'pt', 'cv'].includes(k));
          let keywordHits = 0;
          keywords.forEach((kw) => {
            if (bSearchText.includes(kw)) keywordHits++;
          });
          if (keywordHits >= 2) score += 15;
          else if (keywordHits === 1) score += 8;
        }

        if (score > bestScore) {
          bestScore = score;
          matchedTrx = t;
        }
      });

      if (bestScore >= minConfidence && matchedTrx) {
        usedTransactionIds.add((matchedTrx as FinanceTransaction).id);
        return {
          ...item,
          matchStatus: 'MATCHED',
          matchedTransactionId: (matchedTrx as FinanceTransaction).id,
          matchedTransactionCode: (matchedTrx as FinanceTransaction).code,
          confidenceScore: Math.min(100, bestScore),
          notes: `Cocok otomatis dengan ${(matchedTrx as FinanceTransaction).code} (${Math.min(100, bestScore)}% confidence)`
        };
      }

      return {
        ...item,
        confidenceScore: Math.min(100, bestScore)
      };
    });
  },

  // 10. PERIOD CLOSING VALIDATION
  isDateInClosedPeriod(dateStr: string, closings: PeriodClosing[]): boolean {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    return closings.some(
      (c) => c.status === 'CLOSED' && c.periodYear === year && c.periodMonth === month
    );
  },

  // 11. EXPORT TO EXCEL
  exportProfitLossToExcel(pl: ProfitLossStatement, companyName: string = 'PT Rajawali Sukses Mandiri') {
    const data = [
      [companyName],
      ['LAPORAN LABA RUGI (PROFIT & LOSS STATEMENT)'],
      [`Periode: ${pl.periodLabel}`],
      [''],
      ['KODE AKUN', 'NAMA AKUN / KATEGORI', 'NOMINAL (RP)'],
      ['4100', 'PENDAPATAN USAHA (REVENUE)', ''],
      ...pl.revenueAccounts.map((a) => [a.code, `  ${a.name}`, a.amount]),
      ['', 'TOTAL PENDAPATAN', pl.totalRevenue],
      [''],
      ['5100', 'BEBAN POKOK PENDAPATAN (HPP / COGS)', ''],
      ...pl.cogsAccounts.map((a) => [a.code, `  ${a.name}`, a.amount]),
      ['', 'TOTAL BEBAN POKOK PENDAPATAN', pl.totalCogs],
      [''],
      ['', 'LABA KOTOR (GROSS PROFIT)', pl.grossProfit],
      ['', `GROSS PROFIT MARGIN (%)`, `${pl.grossMarginPct.toFixed(2)}%`],
      [''],
      ['6100', 'BEBAN OPERASIONAL (OPEX)', ''],
      ...pl.opexAccounts.map((a) => [a.code, `  ${a.name}`, a.amount]),
      ['', 'TOTAL BEBAN OPERASIONAL', pl.totalOpex],
      [''],
      ['', 'LABA USAHA (OPERATING INCOME)', pl.operatingIncome],
      ['', 'PENDAPATAN LAIN-LAIN', pl.totalOtherIncome],
      ['', 'BEBAN LAIN-LAIN / PAJAK & BUNGA', pl.totalOtherExpense],
      [''],
      ['', 'LABA BERSIH TAHUN BERJALAN (NET PROFIT)', pl.netProfit],
      ['', 'NET PROFIT MARGIN (%)', `${pl.netMarginPct.toFixed(2)}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laba_Rugi');
    XLSX.writeFile(wb, `Laporan_Laba_Rugi_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  exportBalanceSheetToExcel(bs: BalanceSheetStatement, companyName: string = 'PT Rajawali Sukses Mandiri') {
    const data = [
      [companyName],
      ['LAPORAN POSISI KEUANGAN (NERACA / BALANCE SHEET)'],
      [`Per Tanggal: ${bs.asOfDate}`],
      [''],
      ['KODE', 'ASET', 'JUMLAH (RP)', '', 'KODE', 'LIABILITAS & EKUITAS', 'JUMLAH (RP)'],
      ['1100', 'Aset Lancar', '', '', '2100', 'Liabilitas Jangka Pendek', ''],
      ...bs.currentAssets.map((a) => [a.code, `  ${a.name}`, a.amount, '', '', '', '']),
      ['', 'Total Aset Lancar', bs.totalCurrentAssets, '', '', 'Total Liabilitas Lancar', bs.totalCurrentLiabilities],
      [''],
      ['1200', 'Aset Tetap', '', '', '2200', 'Liabilitas Jangka Panjang', ''],
      ...bs.fixedAssets.map((a) => [a.code, `  ${a.name}`, a.amount, '', '', '', '']),
      ['', 'Total Aset Tetap', bs.totalFixedAssets, '', '', 'Total Liabilitas Jangka Panjang', bs.totalLongTermLiabilities],
      [''],
      ['', 'TOTAL ASET', bs.totalAssets, '', '', 'TOTAL LIABILITAS', bs.totalLiabilities],
      ['', '', '', '', '3000', 'EKUITAS', ''],
      ...bs.equityAccounts.map((e) => ['', '', '', '', e.code, `  ${e.name}`, e.amount]),
      ['', '', '', '', '', '  Laba Bersih Periode Berjalan', bs.currentPeriodNetProfit],
      ['', '', '', '', '', 'TOTAL EKUITAS', bs.totalEquity],
      [''],
      ['', 'TOTAL ASET', bs.totalAssets, '', '', 'TOTAL LIABILITAS & EKUITAS', bs.totalLiabilitiesAndEquity],
      ['', 'STATUS NERACA', bs.isBalanced ? 'SEIMBANG (BALANCED)' : 'SELISIH (UNBALANCED)', '', '', 'SELISIH', bs.variance]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Neraca');
    XLSX.writeFile(wb, `Laporan_Neraca_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  // 12. EXPORT TO PDF (Standard Official Letterhead)
  exportFinancialStatementPDF(
    title: string,
    period: string,
    headers: string[],
    rows: (string | number)[][],
    summaryRows?: (string | number)[][]
  ) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Header Kop Perusahaan
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PT RAJAWALI SUKSES MANDIRI', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text('Integrated Facility Management & Cleaning Services | Finance Division', 14, 17);
    doc.text('Gedung Cyber 2 Tower Lt. 18, Jl. HR Rasuna Said Blok X-5, Jakarta Selatan', 14, 22);

    // Title section
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title.toUpperCase(), 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode Laporan : ${period}`, 14, 44);
    doc.text(`Dicetak Pada     : ${new Date().toLocaleString('id-ID')}`, 14, 49);

    // Render AutoTable
    autoTable(doc, {
      startY: 54,
      head: [headers],
      body: rows as any,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      styles: {
        cellPadding: 2.5
      }
    });

    // Footer signature
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    if (finalY < 240) {
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Disiapkan Oleh,', 20, finalY + 15);
      doc.text('Finance & Accounting Officer', 20, finalY + 32);

      doc.text('Disetujui Oleh,', 140, finalY + 15);
      doc.text('Direktur Keuangan / Super Admin', 140, finalY + 32);
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // Export Financial Report to Excel Spreadsheet (.xlsx)
  exportFinancialStatementExcel(title: string, data: any[]): void {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  // Export processed data to CSV format directly compatible with Excel or Google Sheets
  exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
    const processCell = (cell: string | number | null | undefined): string => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(processCell).join(','),
      ...rows.map((row) => row.map(processCell).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', cleanFilename.replace(/\s+/g, '_'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Helper to export array of objects to CSV
  exportJSONToCSV(filename: string, data: Record<string, any>[]): void {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((item) => headers.map((header) => item[header]));
    this.exportToCSV(filename, headers, rows);
  }
};
