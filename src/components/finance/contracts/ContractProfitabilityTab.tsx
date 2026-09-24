import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { ClientContract, ContractProfitabilityRow } from '../../../types/finance';
import { Employee, InventoryItem, InventoryLog, Project, TimesheetMonthRecord } from '../../../types';
import { formatCurrency, downloadCSV } from '../../../utils/formatters';

interface ContractProfitabilityTabProps {
  contracts: ClientContract[];
  projects: Project[];
  employees: Employee[];
  inventoryItems: InventoryItem[];
  inventoryLogs: InventoryLog[];
  timesheets: TimesheetMonthRecord[];
}

export const ContractProfitabilityTab: React.FC<ContractProfitabilityTabProps> = ({
  contracts,
  projects,
  employees,
  inventoryItems,
  inventoryLogs,
  timesheets
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Aktif' | 'Akan Berakhir' | 'Berakhir'>('ALL');

  // Compute item price map
  const itemPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryItems.forEach((item) => {
      map.set(item.id, Number(item.unitPrice) || 0);
    });
    return map;
  }, [inventoryItems]);

  // Build profitability rows
  const profitabilityRows: ContractProfitabilityRow[] = useMemo(() => {
    return contracts.map((contract) => {
      const prj = projects.find((p) => p.id === contract.projectId);
      const projectName = prj?.name || contract.projectName || 'Proyek';

      // 1. Manpower Cost at this location
      // Active employees placed at this project
      const siteEmployees = employees.filter(
        (e) => e.projectId === contract.projectId && e.status === 'Aktif'
      );
      
      let manpowerCost = 0;
      if (siteEmployees.length > 0) {
        manpowerCost = siteEmployees.reduce((sum, emp) => {
          // Standard monthly rate: 25 days * dailyRate
          const rate = Number(emp.dailyRate) || 128000;
          return sum + rate * 25;
        }, 0);
      } else {
        // Fallback to contract manpower allocation if no individual employee records yet
        manpowerCost = (contract.manpowerAllocations || []).reduce((sum, alloc) => {
          const rate = Number(alloc.monthlyRatePerPerson) || 3200000;
          return sum + (Number(alloc.count) || 0) * rate;
        }, 0);
      }

      // 2. Inventory / Chemical Cost at this location
      // Sum of outgoing stock usage logs in this project
      const siteLogs = inventoryLogs.filter(
        (log) => log.projectId === contract.projectId && log.type === 'OUT'
      );

      let inventoryChemicalCost = 0;
      if (siteLogs.length > 0) {
        inventoryChemicalCost = siteLogs.reduce((sum, log) => {
          const price = itemPriceMap.get(log.itemId) || 35000;
          return sum + (Number(log.quantity) || 0) * price;
        }, 0);
      } else {
        // Fallback realistic estimated standard chemical allocation (~5% of revenue)
        inventoryChemicalCost = Math.round(contract.monthlyContractValue * 0.05);
      }

      const totalCost = manpowerCost + inventoryChemicalCost;
      const grossMarginAmount = contract.monthlyContractValue - totalCost;
      const grossMarginPercentage =
        contract.monthlyContractValue > 0
          ? (grossMarginAmount / contract.monthlyContractValue) * 100
          : 0;

      return {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        clientName: contract.clientName,
        projectId: contract.projectId,
        projectName,
        monthlyRevenue: contract.monthlyContractValue,
        manpowerCost,
        manpowerCount: siteEmployees.length || contract.manpowerAllocations.reduce((s, a) => s + a.count, 0),
        inventoryChemicalCost,
        totalCost,
        grossMarginAmount,
        grossMarginPercentage,
        status: contract.status
      };
    });
  }, [contracts, projects, employees, inventoryLogs, itemPriceMap]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return profitabilityRows.filter((row) => {
      const matchSearch =
        row.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || row.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [profitabilityRows, searchQuery, statusFilter]);

  // Aggregate Totals
  const totalRevenue = filteredRows.reduce((sum, r) => sum + r.monthlyRevenue, 0);
  const totalManpowerCost = filteredRows.reduce((sum, r) => sum + r.manpowerCost, 0);
  const totalChemicalCost = filteredRows.reduce((sum, r) => sum + r.inventoryChemicalCost, 0);
  const totalGrossMargin = filteredRows.reduce((sum, r) => sum + r.grossMarginAmount, 0);
  const averageMarginPct = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;

  const handleExportCSV = () => {
    const headers = [
      'No. Kontrak',
      'Nama Klien',
      'Lokasi Proyek',
      'Pendapatan Bulanan (Rp)',
      'Biaya Manpower (Rp)',
      'Manpower (Orang)',
      'Biaya Chemical/Inventory (Rp)',
      'Total Beban (Rp)',
      'Margin Kotor (Rp)',
      'Margin (%)',
      'Status Kontrak'
    ];

    const data = filteredRows.map((r) => [
      r.contractNumber,
      r.clientName,
      r.projectName,
      r.monthlyRevenue,
      r.manpowerCost,
      r.manpowerCount,
      r.inventoryChemicalCost,
      r.totalCost,
      r.grossMarginAmount,
      r.grossMarginPercentage.toFixed(1) + '%',
      r.status
    ]);

    downloadCSV([headers, ...data], `Profitabilitas_Kontrak_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pendapatan</p>
          <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">{formatCurrency(totalRevenue)}</h3>
          <p className="text-[10.5px] text-slate-400 mt-0.5">{filteredRows.length} Kontrak Terfilter</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Beban Manpower</p>
          <h3 className="text-base sm:text-lg font-black text-rose-700 mt-1">{formatCurrency(totalManpowerCost)}</h3>
          <p className="text-[10.5px] text-slate-500 mt-0.5">Gaji personil cleaner di site</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Beban Chemical & Logistik</p>
          <h3 className="text-base sm:text-lg font-black text-amber-700 mt-1">{formatCurrency(totalChemicalCost)}</h3>
          <p className="text-[10.5px] text-slate-500 mt-0.5">Pemakaian chemical & alat</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Margin Kotor (Laba)</p>
          <h3 className="text-base sm:text-lg font-black text-emerald-700 mt-1">{formatCurrency(totalGrossMargin)}</h3>
          <p className="text-[10.5px] text-emerald-600 font-semibold mt-0.5">Pendapatan - Beban Langsung</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Rata-rata Margin %</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <h3 className="text-xl font-black text-indigo-900">{averageMarginPct.toFixed(1)}%</h3>
            <span className="text-[10.5px] font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> Sehat
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Target minimum: 20%</p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama klien, no. kontrak, atau lokasi..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 shrink-0"
          >
            <option value="ALL">Semua Status</option>
            <option value="Aktif">Aktif Saja</option>
            <option value="Akan Berakhir">Akan Berakhir</option>
            <option value="Berakhir">Berakhir</option>
          </select>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Ekspor Analisis CSV
        </button>
      </div>

      {/* Profitability Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10.5px] font-bold">
              <tr>
                <th className="py-3 px-4">Kontrak & Klien</th>
                <th className="py-3 px-4">Lokasi Proyek</th>
                <th className="py-3 px-4 text-right">Pendapatan Bulanan</th>
                <th className="py-3 px-4 text-right">Biaya Manpower</th>
                <th className="py-3 px-4 text-right">Biaya Chemical</th>
                <th className="py-3 px-4 text-right">Total Beban</th>
                <th className="py-3 px-4 text-right">Margin (Rp)</th>
                <th className="py-3 px-4 text-center">Margin (%)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    Tidak ada data kontrak yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isHighMargin = row.grossMarginPercentage >= 25;
                  const isModerateMargin = row.grossMarginPercentage >= 10 && row.grossMarginPercentage < 25;

                  return (
                    <tr key={row.contractId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{row.clientName}</p>
                        <p className="text-[10.5px] font-mono text-slate-500">{row.contractNumber}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{row.projectName}</span>
                        <p className="text-[10px] text-slate-500">{row.manpowerCount} personil</p>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(row.monthlyRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-700 font-semibold">
                        -{formatCurrency(row.manpowerCost)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-700 font-semibold">
                        -{formatCurrency(row.inventoryChemicalCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        {formatCurrency(row.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        <span className={row.grossMarginAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatCurrency(row.grossMarginAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isHighMargin
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isModerateMargin
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {row.grossMarginPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            row.status === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.status === 'Akan Berakhir'
                              ? 'bg-amber-50 text-amber-700 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
