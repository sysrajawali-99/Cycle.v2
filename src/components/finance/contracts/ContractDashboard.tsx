import React from 'react';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { ClientContract } from '../../../types/finance';
import { formatCurrency } from '../../../utils/formatters';

interface ContractDashboardProps {
  contracts: ClientContract[];
  onFilterExpiring: () => void;
  isFilteringExpiring: boolean;
}

export const ContractDashboard: React.FC<ContractDashboardProps> = ({
  contracts,
  onFilterExpiring,
  isFilteringExpiring
}) => {
  const today = new Date();

  // 1. Total Kontrak Aktif
  const activeContracts = contracts.filter((c) => c.status === 'Aktif');
  
  // 2. Total Nilai Kontrak Bulanan (dari semua kontrak aktif)
  const totalMonthlyValue = activeContracts.reduce((sum, c) => sum + (c.monthlyContractValue || 0), 0);

  // 3. Kontrak yang akan berakhir dalam 60 hari
  const expiringContracts = contracts.filter((c) => {
    if (!c.endDate) return false;
    const end = new Date(c.endDate);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 60;
  });

  // Kontrak yang sudah expired/berakhir
  const expiredContracts = contracts.filter((c) => {
    if (!c.endDate) return false;
    const end = new Date(c.endDate);
    return end < today || c.status === 'Berakhir';
  });

  return (
    <div className="space-y-3 mb-6">
      {/* Small Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kontrak Aktif */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kontrak Aktif</p>
            <h3 className="text-xl font-bold text-slate-900">{activeContracts.length} <span className="text-xs font-normal text-slate-400">Gedung / Klien</span></h3>
          </div>
        </div>

        {/* Total Nilai Bulanan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Nilai Bulanan</p>
            <h3 className="text-lg font-bold text-slate-900">{formatCurrency(totalMonthlyValue)}</h3>
          </div>
        </div>

        {/* Kontrak Berakhir < 60 Hari (Interactive Alert) */}
        <div
          onClick={onFilterExpiring}
          className={`p-4 rounded-xl border shadow-sm flex items-center space-x-3.5 cursor-pointer transition-all ${
            isFilteringExpiring
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/50'
              : expiringContracts.length > 0
              ? 'bg-amber-50/80 border-amber-300 hover:bg-amber-100/80'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-11 h-11 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Akan Berakhir (&le; 60 Hari)</p>
              {expiringContracts.length > 0 && (
                <span className="animate-pulse w-2 h-2 rounded-full bg-amber-500"></span>
              )}
            </div>
            <h3 className="text-lg font-bold text-amber-950 flex items-center gap-1.5">
              {expiringContracts.length} <span className="text-xs font-medium text-amber-700">Kontrak</span>
            </h3>
          </div>
        </div>

        {/* Total Kontrak Terdaftar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Portofolio</p>
            <h3 className="text-xl font-bold text-slate-900">{contracts.length} <span className="text-xs font-normal text-slate-400">Kontrak ({expiredContracts.length} selesai)</span></h3>
          </div>
        </div>
      </div>

      {/* Peringatan Berwarna jika ada kontrak akan berakhir <= 60 hari */}
      {expiringContracts.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 border border-amber-300 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed flex-1">
            <p className="font-bold mb-0.5">
              Peringatan Kadaluarsa Kontrak: Terdeteksi {expiringContracts.length} kontrak klien yang akan berakhir dalam 60 hari ke depan!
            </p>
            <p className="text-amber-800">
              Klien terkait: {expiringContracts.map((c) => `${c.clientName} (s/d ${c.endDate})`).join(', ')}. Harap segera koordinasikan dengan Account Manager / Direksi untuk pengajuan addendum perpanjangan masa kontrak.
            </p>
          </div>
          <button
            onClick={onFilterExpiring}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer self-center"
          >
            {isFilteringExpiring ? 'Tampilkan Semua' : 'Filter Kontrak Ini'}
          </button>
        </div>
      )}
    </div>
  );
};
