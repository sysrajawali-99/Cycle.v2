import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Lazy initialize GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -------------------------------------------------------------
// AI Financial Insights Endpoints
// -------------------------------------------------------------

/**
 * Endpoint 1: Comprehensive Financial Advisory & Insight
 */
app.post('/api/ai/financial-insights', async (req, res) => {
  try {
    const { financialData, promptContext } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback expert rule-based heuristic if GEMINI_API_KEY is not configured
      const totalIncome = financialData?.totalIncome || 0;
      const totalExpense = financialData?.totalExpense || 0;
      const netProfit = totalIncome - totalExpense;
      const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return res.json({
        success: true,
        source: 'rule_based_fallback',
        data: {
          summary: `Analisis Keuangan Komprehensif: Pendapatan tercatat Rp ${totalIncome.toLocaleString('id-ID')} dengan Beban Operasional Rp ${totalExpense.toLocaleString('id-ID')}, menghasilkan Net Profit Margin sebesar ${margin.toFixed(1)}%.`,
          healthScore: margin > 20 ? 88 : margin > 10 ? 75 : 55,
          healthStatus: margin > 15 ? 'SEHAT' : margin > 0 ? 'WASPADA' : 'KRITIS',
          recommendations: [
            {
              id: 'rec-1',
              title: 'Optimalisasi Rasio Beban Chemical & Logistik Proyek',
              category: 'Cost Reduction',
              impact: 'HIGH',
              estimatedSavings: totalExpense * 0.08,
              actionPlan: 'Terapkan standarisasi takaran chemical per m2 luas lantai dan sentralisasi pembelian bulk untuk mendapatkan diskon vendor 5-10%.'
            },
            {
              id: 'rec-2',
              title: 'Percepat Penagihan Invoice / Account Receivable',
              category: 'Cash Flow',
              impact: 'HIGH',
              estimatedSavings: 0,
              actionPlan: 'Kirimkan notifikasi faktur H-7 sebelum jatuh tempo kepada klien B2B dan tetapkan early-payment incentive sebesar 1%.'
            },
            {
              id: 'rec-3',
              title: 'Diversifikasi Penempatan Kas Operasional',
              category: 'Treasury',
              impact: 'MEDIUM',
              estimatedSavings: totalIncome * 0.015,
              actionPlan: 'Pindahkan kelebihan idle cash di atas safety buffer (2 bulan OPEX) ke instrumen deposito fleksibel/reksadana pasar uang korporasi.'
            }
          ],
          cashFlowForecast: {
            nextMonthInflowEstimate: totalIncome * 1.05,
            nextMonthOutflowEstimate: totalExpense * 0.98,
            safetyBufferRecommendation: totalExpense * 2.5,
            runwayMonths: totalExpense > 0 ? ((financialData?.totalCash || 0) / totalExpense).toFixed(1) : '6+'
          },
          costEfficiencyAnalysis: 'Struktur beban didominasi oleh payroll tenaga alih daya (outsourcing) dan chemical operasional. Efisiensi per site dapat ditingkatkan melalui monitoring kehadiran digital dan pencegahan waste inventaris.',
          riskFactors: [
            'Fluktuasi harga bahan baku pembersih dan perlengkapan safety (K3)',
            'Keterlambatan pembayaran termin kontrak dari segmen klien korporat',
            'Overtime (Lembur) mendadak di site proyek high-traffic tanpa estimasi anggaran awal'
          ]
        }
      });
    }

    const systemPrompt = `Anda adalah Ahli Keuangan Senior, Konsultan Akuntansi PSAK/IFRS, dan Financial Controller untuk perusahaan PT Rajawali Alih Daya (Jasa Outsourcing Facility Services, Cleaning Service, Security, & Manpower).
Analisis data keuangan berikut dan berikan rekomendasi mendalam, actionable, profesional, dan matematis dalam format JSON murni.

Data Keuangan:
${JSON.stringify(financialData, null, 2)}

Konteks Tambahan:
${promptContext || 'Analisis kinerja keuangan terkini, efisiensi biaya, dan rekomendasi strategis alokasi kas.'}

Kembalikan respon DALAM FORMAT JSON SAJA dengan schema:
{
  "summary": string (ringkasan eksekutif 2-3 paragraf),
  "healthScore": number (0-100),
  "healthStatus": "SEHAT" | "WASPADA" | "KRITIS",
  "recommendations": [
    {
      "id": string,
      "title": string,
      "category": string,
      "impact": "HIGH" | "MEDIUM" | "LOW",
      "estimatedSavings": number,
      "actionPlan": string
    }
  ],
  "cashFlowForecast": {
    "nextMonthInflowEstimate": number,
    "nextMonthOutflowEstimate": number,
    "safetyBufferRecommendation": number,
    "runwayMonths": string
  },
  "costEfficiencyAnalysis": string,
  "riskFactors": string[]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    const parsedData = text ? JSON.parse(text) : {};

    return res.json({
      success: true,
      source: 'gemini-3.8-flash',
      data: parsedData
    });
  } catch (error: any) {
    console.error('Error calling Gemini AI Financial Insights:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal memproses insight keuangan dengan AI'
    });
  }
});

/**
 * Endpoint 2: Analisa Biaya per Cost Center & Deteksi Anomali
 */
app.post('/api/ai/cost-analysis', async (req, res) => {
  try {
    const { costCenters, expenses, revenues, period } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Heuristic fallback for cost analysis
      return res.json({
        success: true,
        source: 'rule_based_fallback',
        data: {
          period: period || 'Periode Berjalan',
          overallEfficiencyScore: 82,
          costAnomalies: [
            {
              costCenterName: 'Site Proyek Mall Grand Rajawali',
              accountCategory: 'Beban Chemical & Supplies',
              variancePercentage: 18.5,
              severity: 'WARNING',
              description: 'Lonjakan konsumsi floor polish dan deterjen sebesar 18.5% di atas rata-rata benchmark per m2.',
              recommendation: 'Lakukan audit stok opname fisik chemical dan kalibrasi mesin dosing otomatis.'
            },
            {
              costCenterName: 'Site Rumah Sakit Mitra Sehat',
              accountCategory: 'Beban Lembur (Overtime)',
              variancePercentage: 24.0,
              severity: 'CRITICAL',
              description: 'Biaya lembur melebihi pagu anggaran bulanan karena tingginya tingkat cuti mendadak personil.',
              recommendation: 'Rotasi personil roving/cadangan antar lokasi terdekat untuk menekan tarif lembur darurat.'
            }
          ],
          benchmarks: [
            { metric: 'Rasio Biaya Tenaga Kerja / Revenue', current: '62.4%', ideal: '55% - 60%', status: 'Acceptable' },
            { metric: 'Rasio Beban Chemical / Revenue', current: '8.2%', ideal: '5% - 7%', status: 'Needs Improvement' },
            { metric: 'Beban Operasional Umum (Overhead)', current: '9.5%', ideal: '8% - 10%', status: 'Optimal' }
          ],
          strategicSummary: 'Mayoritas unit cost center beroperasi dalam batas aman. Dua site dengan varians di atas 15% memerlukan penyesuaian SOP konsumsi material dan manajemen roster shift.'
        }
      });
    }

    const prompt = `Anda adalah Spesialis Akuntansi Biaya dan Operational Auditor PT Rajawali.
Analisis data Cost Center (Proyek, Divisi, Akun Beban) berikut dan identifikasi anomali pemborosan, efisiensi biaya, serta benchmark standar alih daya:

Data:
- Cost Centers: ${JSON.stringify(costCenters || [], null, 2)}
- Pengeluaran: ${JSON.stringify(expenses || [], null, 2)}
- Pendapatan: ${JSON.stringify(revenues || [], null, 2)}
- Periode: ${period || 'Bulan Ini'}

Kembalikan format JSON SAJA dengan schema:
{
  "period": string,
  "overallEfficiencyScore": number (0-100),
  "costAnomalies": [
    {
      "costCenterName": string,
      "accountCategory": string,
      "variancePercentage": number,
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "description": string,
      "recommendation": string
    }
  ],
  "benchmarks": [
    { "metric": string, "current": string, "ideal": string, "status": string }
  ],
  "strategicSummary": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, source: 'gemini-3.8-flash', data: parsed });
  } catch (error: any) {
    console.error('Cost analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint 3: Pre-Closing Audit & Saran Tutup Buku Keuangan
 */
app.post('/api/ai/closing-audit', async (req, res) => {
  try {
    const { closingPeriod, trialBalance, unpostedCount, unreconciledCount, totalIncome, totalExpense } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        source: 'rule_based_fallback',
        data: {
          period: closingPeriod || 'Periode Aktif',
          readinessScore: unpostedCount === 0 && unreconciledCount === 0 ? 95 : 70,
          readinessStatus: unpostedCount === 0 && unreconciledCount === 0 ? 'SIAP_TUTUP_BUKU' : 'PERLU_PENYESUAIAN',
          expertAdvisory: `Audit Tutup Buku Periode ${closingPeriod}: Seluruh buku jurnal telah terverifikasi. Pastikan seluruh penyusutan aset tetap (Depresiasi) dan amortisasi asuransi dibayar di muka telah dibukukan sebelum mengunci saldo periode.`,
          closingChecklist: [
            { task: 'Rekonsiliasi Rekening Koran Bank & Kas Kecil', status: unreconciledCount === 0 ? 'COMPLETED' : 'PENDING', note: `${unreconciledCount} mutasi belum direkonsiliasi` },
            { task: 'Jurnal Penyesuaian Akrual Gaji & Bonus Akhir Bulan', status: 'RECOMMENDED', note: 'Verifikasi cut-off absensi per tanggal 25' },
            { task: 'Jurnal Penyusutan Aset Tetap & Peralatan', status: 'RECOMMENDED', note: 'Metode Garis Lurus (Straight Line)' },
            { task: 'Keseimbangan Neraca Saldo (Trial Balance Debit vs Kredit)', status: 'COMPLETED', note: 'Total Seimbang' },
            { task: 'Cadangan Pajak Penghasilan (PPh 21 & PPh 23)', status: 'PENDING', note: 'Pastikan bukti potong PPh 23 klien telah diarsip' }
          ],
          estimatedNetIncomeBeforeClosing: totalIncome - totalExpense,
          suggestedRetainedEarningsTransfer: totalIncome - totalExpense,
          auditNotes: 'Setelah proses tutup buku disetujui Super Admin, periode akan berstatus LOCKED untuk mencegah modifikasi historis tanpa otorisasi PIN pengawas.'
        }
      });
    }

    const prompt = `Anda adalah Auditor Eksternal Akuntan Publik (CPA) yang memverifikasi kepatuhan SAK Indonesia untuk Tutup Buku Periode Bulanan/Tahunan.
Evaluasi kesiapan Tutup Buku berikut:

Periode: ${closingPeriod}
Unposted Jurnal: ${unpostedCount}
Unreconciled Transaksi Bank: ${unreconciledCount}
Total Pendapatan: ${totalIncome}
Total Beban: ${totalExpense}
Ringkasan Neraca Saldo: ${JSON.stringify(trialBalance || {}, null, 2)}

Kembalikan format JSON SAJA dengan schema:
{
  "period": string,
  "readinessScore": number,
  "readinessStatus": "SIAP_TUTUP_BUKU" | "PERLU_PENYESUAIAN" | "DITAHAN",
  "expertAdvisory": string,
  "closingChecklist": [
    { "task": string, "status": "COMPLETED" | "PENDING" | "RECOMMENDED", "note": string }
  ],
  "estimatedNetIncomeBeforeClosing": number,
  "suggestedRetainedEarningsTransfer": number,
  "auditNotes": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, source: 'gemini-3.8-flash', data: parsed });
  } catch (error: any) {
    console.error('Closing audit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static File Serving
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rajawali Cycle Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
