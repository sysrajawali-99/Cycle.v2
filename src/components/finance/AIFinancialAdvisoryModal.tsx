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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header */}
        <div className="p-5 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 border border-purple-200">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-purple-950 tracking-tight">
                  AI Financial Expert Advisory & Insight
                </h3>
                <span className="text-[10px] bg-purple-100 text-purple-900 font-black px-2 py-0.5 rounded-full border border-purple-300">
                  Gemini Flash AI
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Saran strategis akuntansi, analisa anomali beban operasional & kesiapan audit tutup buku
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAllAIAdvisory}
              disabled={isLoading}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200 transition-colors cursor-pointer shadow-xs"
              title="Refresh Analisis AI"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-5 pt-3 border-b border-slate-200 bg-slate-50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('INSIGHTS')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'INSIGHTS'
                ? 'border-purple-600 text-purple-900 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Kesehatan & Rekomendasi Finansial</span>
          </button>

          <button
            onClick={() => setActiveTab('COST_ANALYSIS')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'COST_ANALYSIS'
                ? 'border-blue-600 text-blue-900 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analisa Biaya & Anomali Beban</span>
          </button>

          <button
            onClick={() => setActiveTab('CLOSING_AUDIT')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CLOSING_AUDIT'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Kesiapan Audit Tutup Buku</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-white custom-scrollbar">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Memproses Data Keuangan dengan AI...</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
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
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center space-x-3.5 shadow-xs">
                      <div className="p-3 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 shrink-0 text-center min-w-[60px]">
                        <span className="text-2xl font-black">{insights.healthScore}</span>
                        <span className="text-[10px] block text-purple-800 text-center font-bold">/ 100</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block font-bold">Skor Kesehatan Keuangan</span>
                        <span
                          className={`text-sm font-bold inline-block mt-0.5 px-2 py-0.5 rounded text-xs ${
                            insights.healthStatus === 'SEHAT'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : insights.healthStatus === 'WASPADA'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          STATUS: {insights.healthStatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs">
                      <span className="text-[11px] text-slate-500 block font-bold">Net Profit Margin</span>
                      <div className="text-lg font-black text-slate-900 mt-1 flex items-center space-x-2">
                        <span>{marginPct.toFixed(1)}%</span>
                        <span className="text-xs text-emerald-700 font-bold">
                          (Rp {netProfit.toLocaleString('id-ID')})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Pendapatan: Rp {totalIncome.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs">
                      <span className="text-[11px] text-slate-500 block font-bold">Estimasi Runway Kas</span>
                      <div className="text-lg font-black text-blue-700 mt-1">
                        {insights.cashFlowForecast.runwayMonths} Bulan
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Saldo Kas/Bank: Rp {totalCash.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary Card */}
                  <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center space-x-2 text-purple-950 text-xs font-black">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Ringkasan Eksekutif dari Penasehat Keuangan AI</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{insights.summary}</p>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Rekomendasi Strategis & Penghematan Biaya</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {insights.recommendations.map((rec, idx) => (
                        <div
                          key={rec.id || idx}
                          className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 flex flex-col justify-between shadow-xs"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {rec.category}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  rec.impact === 'HIGH'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                Dampak {rec.impact}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-900">{rec.title}</h5>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{rec.actionPlan}</p>
                          </div>

                          {rec.estimatedSavings > 0 && (
                            <div className="pt-2 border-t border-slate-200 text-[11px] text-emerald-700 font-bold">
                              Potensi Efisiensi: ~Rp {Math.round(rec.estimatedSavings).toLocaleString('id-ID')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {insights.riskFactors && insights.riskFactors.length > 0 && (
                    <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center space-x-2 text-amber-950 text-xs font-black">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Faktor Risiko Operasional & Kas yang Perlu Dimonitor</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
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
                  <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-blue-950 text-xs font-black">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span>Analisa Efisiensi Beban & Cost Center ({costAnalysis.period})</span>
                      </div>
                      <span className="text-xs font-bold text-blue-800">
                        Skor Efisiensi Biaya: {costAnalysis.overallEfficiencyScore}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{costAnalysis.strategicSummary}</p>
                  </div>

                  {/* Cost Center Anomalies */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Deteksi Anomali & Lonjakan Beban per Unit Operasional</span>
                    </h4>

                    <div className="space-y-2.5">
                      {costAnalysis.costAnomalies.map((ano, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  ano.severity === 'CRITICAL'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {ano.severity}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{ano.costCenterName}</span>
                              <span className="text-xs text-slate-500">• {ano.accountCategory}</span>
                            </div>
                            <span className="text-xs font-bold text-rose-700">
                              Varians: +{ano.variancePercentage}% di atas baseline
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed">{ano.description}</p>

                          <div className="bg-emerald-50 p-2.5 rounded-lg text-[11px] text-emerald-950 border border-emerald-200 flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
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
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-800">
                        Tolok Ukur Rasio Biaya Industri Cleaning & Facility Services (Benchmark)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {costAnalysis.benchmarks.map((bm, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-xs">
                            <span className="text-[10px] text-slate-500 block truncate font-bold">{bm.metric}</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{bm.current}</span>
                              <span className="text-[10px] text-slate-500">Ideal: {bm.ideal}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 block font-bold">{bm.status}</span>
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
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                      closingAudit.readinessStatus === 'SIAP_TUTUP_BUKU'
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-xl ${
                          closingAudit.readinessStatus === 'SIAP_TUTUP_BUKU'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900">
                            Status Audit: {closingAudit.readinessStatus.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold shadow-xs">
                            Skor Kesiapan: {closingAudit.readinessScore}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {closingAudit.expertAdvisory}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">
                      Checklist Verifikasi Pra-Tutup Buku (Akuntan Publik Standard)
                    </h4>

                    <div className="space-y-2">
                      {closingAudit.closingChecklist.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            {item.status === 'COMPLETED' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : item.status === 'PENDING' ? (
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                            )}
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{item.task}</span>
                              <span className="text-[11px] text-slate-500">{item.note}</span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Retained Earnings Transfer */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-800">
                      Rekomendasi Jurnal Penutup (Closing Entries)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-500 text-[11px] block font-bold">
                          Laba Bersih Sebelum Penutupan
                        </span>
                        <span className="text-base font-black text-emerald-700 mt-1 block">
                          Rp {closingAudit.estimatedNetIncomeBeforeClosing.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-500 text-[11px] block font-bold">
                          Alokasi ke Akun Laba Ditahan (Retained Earnings)
                        </span>
                        <span className="text-base font-black text-blue-700 mt-1 block">
                          Rp {closingAudit.suggestedRetainedEarningsTransfer.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 italic pt-1">{closingAudit.auditNotes}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Model didukung Google Gemini AI terintegrasi dengan Standar Akuntansi Keuangan (SAK)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekomendasi</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              Tutup Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
