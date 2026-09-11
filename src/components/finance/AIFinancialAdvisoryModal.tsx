import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  Building2,
  RefreshCw,
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  HelpCircle,
  BarChart3,
  Lock,
  ChevronRight,
  Printer
} from 'lucide-react';
import { ChartOfAccount, FinanceTransaction, TrialBalanceSummary, AIFinancialInsight } from '../../types';
import { aiFinanceService, AICostAnalysisResult, AIClosingAuditResult } from '../../services/aiFinanceService';
import { financeService } from '../../services/financeService';

interface AIFinancialAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccount[];
  transactions: FinanceTransaction[];
  trialBalance: TrialBalanceSummary;
  totalIncome: number;
  totalExpense: number;
  totalCash: number;
  currentPeriod?: string;
  initialTab?: 'INSIGHTS' | 'COST_ANALYSIS' | 'CLOSING_AUDIT';
}

export const AIFinancialAdvisoryModal: React.FC<AIFinancialAdvisoryModalProps> = ({
  isOpen,
  onClose,
  accounts,
  transactions,
  trialBalance,
  totalIncome,
  totalExpense,
  totalCash,
  currentPeriod = 'Agustus 2026',
  initialTab = 'INSIGHTS'
}) => {
  const [activeTab, setActiveTab] = useState<'INSIGHTS' | 'COST_ANALYSIS' | 'CLOSING_AUDIT'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIFinancialInsight | null>(null);
  const [costAnalysis, setCostAnalysis] = useState<AICostAnalysisResult | null>(null);
  const [closingAudit, setClosingAudit] = useState<AIClosingAuditResult | null>(null);
  const [promptQuery, setPromptQuery] = useState('');

  // Fetch all insights
  const fetchAllAIAdvisory = async () => {
    setIsLoading(true);
    try {
      const [insightsRes, costRes, closingRes] = await Promise.all([
        aiFinanceService.getFinancialInsights(accounts, transactions, totalIncome, totalExpense, totalCash, promptQuery),
        aiFinanceService.getCostCenterAnalysis(accounts, transactions, currentPeriod),
        aiFinanceService.getClosingAuditAdvisory(
          currentPeriod,
          trialBalance,
          0,
          transactions.filter((t) => !t.isReconciled).length,
          totalIncome,
          totalExpense
        )
      ]);

      if (insightsRes.data) setInsights(insightsRes.data);
      if (costRes.data) setCostAnalysis(costRes.data);
      if (closingRes.data) setClosingAudit(closingRes.data);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (!insights || !costAnalysis || !closingAudit) {
        fetchAllAIAdvisory();
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const netProfit = totalIncome - totalExpense;
  const marginPct = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  AI Financial Expert Advisory & Insight
                </h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                  Gemini Flash AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Saran strategis akuntansi, analisa anomali beban operasional & kesiapan audit tutup buku
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAllAIAdvisory}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center space-x-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Refresh Analisis AI"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-5 pt-3 border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('INSIGHTS')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'INSIGHTS'
                ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Kesehatan & Rekomendasi Finansial</span>
          </button>

          <button
            onClick={() => setActiveTab('COST_ANALYSIS')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'COST_ANALYSIS'
                ? 'border-blue-500 text-blue-300 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analisa Biaya & Anomali Beban</span>
          </button>

          <button
            onClick={() => setActiveTab('CLOSING_AUDIT')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CLOSING_AUDIT'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Kesiapan Audit Tutup Buku</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Memproses Data Keuangan dengan AI...</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Menganalisis bagan akun, pola jurnal pengeluaran, rasio likuiditas, dan struktur neraca saldo SAK.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: INSIGHTS & HEALTH SCORE */}
              {activeTab === 'INSIGHTS' && insights && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Top Summary Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center space-x-3.5">
                      <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                        <span className="text-2xl font-black">{insights.healthScore}</span>
                        <span className="text-[10px] block text-purple-300 text-center font-bold">/ 100</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-semibold">Skor Kesehatan Keuangan</span>
                        <span
                          className={`text-sm font-bold inline-block mt-0.5 px-2 py-0.5 rounded text-xs ${
                            insights.healthStatus === 'SEHAT'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : insights.healthStatus === 'WASPADA'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          STATUS: {insights.healthStatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                      <span className="text-[11px] text-slate-400 block font-semibold">Net Profit Margin</span>
                      <div className="text-lg font-bold text-white mt-1 flex items-center space-x-2">
                        <span>{marginPct.toFixed(1)}%</span>
                        <span className="text-xs text-emerald-400 font-normal">
                          (Rp {netProfit.toLocaleString('id-ID')})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Pendapatan: Rp {totalIncome.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                      <span className="text-[11px] text-slate-400 block font-semibold">Estimasi Runway Kas</span>
                      <div className="text-lg font-bold text-cyan-400 mt-1">
                        {insights.cashFlowForecast.runwayMonths} Bulan
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Saldo Kas/Bank: Rp {totalCash.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary Card */}
                  <div className="bg-purple-950/20 border border-purple-900/40 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Ringkasan Eksekutif dari Penasehat Keuangan AI</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{insights.summary}</p>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Rekomendasi Strategis & Penghematan Biaya</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {insights.recommendations.map((rec, idx) => (
                        <div
                          key={rec.id || idx}
                          className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2.5 flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {rec.category}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  rec.impact === 'HIGH'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                Dampak {rec.impact}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-white">{rec.title}</h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{rec.actionPlan}</p>
                          </div>

                          {rec.estimatedSavings > 0 && (
                            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-400 font-semibold">
                              Potensi Efisiensi: ~Rp {Math.round(rec.estimatedSavings).toLocaleString('id-ID')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {insights.riskFactors && insights.riskFactors.length > 0 && (
                    <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Faktor Risiko Operasional & Kas yang Perlu Dimonitor</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {insights.riskFactors.map((risk, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: COST ANALYSIS & ANOMALIES */}
              {activeTab === 'COST_ANALYSIS' && costAnalysis && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Strategic Summary */}
                  <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-blue-300 text-xs font-bold">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <span>Analisa Efisiensi Beban & Cost Center ({costAnalysis.period})</span>
                      </div>
                      <span className="text-xs font-bold text-blue-400">
                        Skor Efisiensi Biaya: {costAnalysis.overallEfficiencyScore}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{costAnalysis.strategicSummary}</p>
                  </div>

                  {/* Cost Center Anomalies */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Deteksi Anomali & Lonjakan Beban per Unit Operasional</span>
                    </h4>

                    <div className="space-y-2.5">
                      {costAnalysis.costAnomalies.map((ano, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  ano.severity === 'CRITICAL'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {ano.severity}
                              </span>
                              <span className="text-xs font-bold text-white">{ano.costCenterName}</span>
                              <span className="text-xs text-slate-400">• {ano.accountCategory}</span>
                            </div>
                            <span className="text-xs font-bold text-rose-400">
                              Varians: +{ano.variancePercentage}% di atas baseline
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">{ano.description}</p>

                          <div className="bg-slate-900 p-2.5 rounded-lg text-[11px] text-emerald-300 border border-slate-800 flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Solusi AI:</strong> {ano.recommendation}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Benchmarks */}
                  {costAnalysis.benchmarks && costAnalysis.benchmarks.length > 0 && (
                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-200">
                        Tolok Ukur Rasio Biaya Industri Cleaning & Facility Services (Benchmark)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {costAnalysis.benchmarks.map((bm, idx) => (
                          <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-[10px] text-slate-400 block truncate">{bm.metric}</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{bm.current}</span>
                              <span className="text-[10px] text-slate-400">Ideal: {bm.ideal}</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 block font-semibold">{bm.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CLOSING AUDIT */}
              {activeTab === 'CLOSING_AUDIT' && closingAudit && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Readiness Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      closingAudit.readinessStatus === 'SIAP_TUTUP_BUKU'
                        ? 'bg-emerald-950/20 border-emerald-900/40'
                        : 'bg-amber-950/20 border-amber-900/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-xl ${
                          closingAudit.readinessStatus === 'SIAP_TUTUP_BUKU'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">
                            Status Audit: {closingAudit.readinessStatus.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs bg-slate-900 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                            Skor Kesiapan: {closingAudit.readinessScore}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {closingAudit.expertAdvisory}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-200">
                      Checklist Verifikasi Pra-Tutup Buku (Akuntan Publik Standard)
                    </h4>

                    <div className="space-y-2">
                      {closingAudit.closingChecklist.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center space-x-2.5">
                            {item.status === 'COMPLETED' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : item.status === 'PENDING' ? (
                              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                            )}
                            <div>
                              <span className="text-xs font-bold text-white block">{item.task}</span>
                              <span className="text-[11px] text-slate-400">{item.note}</span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Retained Earnings Transfer */}
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">
                      Rekomendasi Jurnal Penutup (Closing Entries)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">
                          Laba Bersih Sebelum Penutupan
                        </span>
                        <span className="text-base font-bold text-emerald-400 mt-1 block">
                          Rp {closingAudit.estimatedNetIncomeBeforeClosing.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">
                          Alokasi ke Akun Laba Ditahan (Retained Earnings)
                        </span>
                        <span className="text-base font-bold text-cyan-400 mt-1 block">
                          Rp {closingAudit.suggestedRetainedEarningsTransfer.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 italic pt-1">{closingAudit.auditNotes}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Model didukung Google Gemini AI terintegrasi dengan Standar Akuntansi Keuangan (SAK)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekomendasi</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-purple-900/30 cursor-pointer"
            >
              Tutup Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
