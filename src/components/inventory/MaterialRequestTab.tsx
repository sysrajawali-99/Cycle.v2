import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Edit3,
  Building2,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  User,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Printer,
  X,
  Check,
  Trash2,
  Eye,
  Sliders,
  Sparkles,
  Info,
  DollarSign,
  ArrowDownLeft,
  ChevronDown,
  Download
} from 'lucide-react';
import {
  Project,
  InventoryItem,
  ProjectStock,
  InventoryLog,
  UserAccount,
  UserRole,
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestStatus,
  MaterialRequestPriority,
  CompanyProfile
} from '../../types';
import { formatCurrency, formatNumber, formatDateDDMMYYYY } from '../../utils/formatters';
import { generateMaterialRequestPDF } from '../../utils/pdfExport';
import { OfficialLetterhead } from '../common/OfficialLetterhead';
import { ConfirmModal } from '../common/ConfirmModal';
import { notifyRealtimeChange } from '../common/RealtimeToast';
import { storageService } from '../../services/storageService';

interface MaterialRequestTabProps {
  projects: Project[];
  inventoryItems: InventoryItem[];
  projectStocks: ProjectStock[];
  inventoryLogs: InventoryLog[];
  materialRequests: MaterialRequest[];
  currentUser: UserAccount | null;
  users: UserAccount[];
  companyProfile?: CompanyProfile;
  selectedProjectId: string;
  onUpdateMaterialRequests: (requests: MaterialRequest[]) => void;
  onUpdateStocks: (stocks: ProjectStock[]) => void;
  onAddLog: (log: InventoryLog) => void;
  onUpdateUsers?: (users: UserAccount[]) => void;
}

export const MaterialRequestTab: React.FC<MaterialRequestTabProps> = ({
  projects,
  inventoryItems,
  projectStocks,
  inventoryLogs,
  materialRequests,
  currentUser,
  users,
  companyProfile,
  selectedProjectId,
  onUpdateMaterialRequests,
  onUpdateStocks,
  onAddLog,
  onUpdateUsers
}) => {
  // Filters
  const [projectFilter, setProjectFilter] = useState<string>(
    selectedProjectId !== 'ALL' ? selectedProjectId : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<MaterialRequest | null>(null);
  const [requestForRevision, setRequestForRevision] = useState<MaterialRequest | null>(null);
  const [requestForApproval, setRequestForApproval] = useState<MaterialRequest | null>(null);
  const [requestForReject, setRequestForReject] = useState<MaterialRequest | null>(null);
  const [isApproverConfigModalOpen, setIsApproverConfigModalOpen] = useState(false);

  // Success / notification toast
  const showToast = (msg: string) => {
    notifyRealtimeChange({
      module: 'inventory',
      title: 'Material Request Tracker',
      message: msg,
      type: 'update'
    });
  };

  // Determine current user permissions
  const isSuperAdmin = currentUser?.role === 'Super Admin (HQ)';
  const canApprove = isSuperAdmin || Boolean(currentUser?.canApproveMaterialRequests);
  const canRevise = isSuperAdmin || Boolean(currentUser?.canReviseMaterialRequests);

  // Helper: get current stock for a specific item at a specific project
  const getItemStockAtProject = (itemId: string, projId: string): number => {
    const stock = projectStocks.find((ps) => ps.itemId === itemId && ps.projectId === projId);
    return stock ? stock.currentStock : 0;
  };

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return materialRequests.filter((mr) => {
      // Project filter
      if (projectFilter !== 'ALL' && mr.projectId !== projectFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && mr.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && mr.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCode = mr.requestCode.toLowerCase().includes(query);
        const matchesProject = mr.projectName.toLowerCase().includes(query);
        const matchesRequester = mr.requesterName.toLowerCase().includes(query);
        const matchesPurpose = mr.purpose.toLowerCase().includes(query);
        const matchesItem = mr.items.some(
          (it) => it.itemName.toLowerCase().includes(query) || it.itemCode.toLowerCase().includes(query)
        );
        if (!matchesCode && !matchesProject && !matchesRequester && !matchesPurpose && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [materialRequests, projectFilter, statusFilter, priorityFilter, searchQuery]);

  // Statistics counters
  const stats = useMemo(() => {
    const scoped = projectFilter === 'ALL'
      ? materialRequests
      : materialRequests.filter((r) => r.projectId === projectFilter);

    return {
      total: scoped.length,
      pending: scoped.filter((r) => r.status === 'PENDING').length,
      approved: scoped.filter((r) => r.status === 'APPROVED').length,
      revised: scoped.filter((r) => r.status === 'REVISED').length,
      rejected: scoped.filter((r) => r.status === 'REJECTED').length
    };
  }, [materialRequests, projectFilter]);

  // Handle Apply approved request directly into project stock (Inbound Restock)
  const handleApplyToStock = (req: MaterialRequest) => {
    if (req.isAppliedToStock) {
      showToast('Permintaan barang ini sudah pernah dibukukan ke stok lokasi.');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const dateOnly = nowStr.split(' ')[0];

    // 1. Update Project Stocks
    const nextStocks = [...projectStocks];
    req.items.forEach((item) => {
      const qtyToAdd = item.approvedQty !== undefined ? item.approvedQty : item.requestedQty;
      if (qtyToAdd <= 0) return;

      const existingIdx = nextStocks.findIndex(
        (ps) => ps.itemId === item.itemId && ps.projectId === req.projectId
      );
      const prevStock = existingIdx >= 0 ? nextStocks[existingIdx].currentStock : 0;
      const newStock = prevStock + qtyToAdd;

      if (existingIdx >= 0) {
        nextStocks[existingIdx] = {
          ...nextStocks[existingIdx],
          currentStock: newStock,
          lastUpdated: dateOnly
        };
      } else {
        nextStocks.push({
          id: `stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          projectId: req.projectId,
          itemId: item.itemId,
          currentStock: newStock,
          lastUpdated: dateOnly
        });
      }

      // Add audit inventory log
      const newLog: InventoryLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        projectId: req.projectId,
        itemId: item.itemId,
        type: 'IN',
        quantity: qtyToAdd,
        previousStock: prevStock,
        newStock: newStock,
        date: dateOnly,
        pic: currentUser?.name || 'Logistik / Approver',
        notes: `Inbound Material Request ${req.requestCode} (Tercatat Masuk ke Stok Proyek)`
      };
      onAddLog(newLog);
    });

    onUpdateStocks(nextStocks);

    // 2. Mark request as applied
    const updatedRequests = materialRequests.map((r) => {
      if (r.id !== req.id) return r;
      return {
        ...r,
        isAppliedToStock: true,
        appliedAt: nowStr,
        appliedBy: currentUser?.name || 'Sistem Logistik',
        updatedAt: nowStr
      };
    });

    onUpdateMaterialRequests(updatedRequests);
    showToast(`Barang dari Material Request ${req.requestCode} berhasil dibukukan ke stok fisik lokasi!`);
  };

  // Delete Request State & Handlers
  const [deleteRequestTarget, setDeleteRequestTarget] = useState<MaterialRequest | null>(null);

  const handleDeleteRequest = (reqId: string) => {
    const target = materialRequests.find((r) => r.id === reqId);
    if (!target) return;
    setDeleteRequestTarget(target);
  };

  const confirmDeleteRequest = () => {
    if (!deleteRequestTarget) return;
    const updated = materialRequests.filter((r) => r.id !== deleteRequestTarget.id);
    onUpdateMaterialRequests(updated);
    showToast(`Material Request ${deleteRequestTarget.requestCode} berhasil dihapus.`);
    setDeleteRequestTarget(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner: Feature Description & User Authorization Indicator */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base">Material Request (Permintaan Barang Stok Proyek)</h3>
              <span className="bg-amber-500/10 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-500/30">
                Workflow Otorisasi
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Pengajuan pengadaan barang stok di lokasi proyek diambil langsung dari Katalog Master Chemical, Alat & APD.
              Setiap pengajuan melalui mekanisme verifikasi: <strong>Approval</strong>, <strong>Reject</strong>, <strong>Pending</strong>,
              dan <strong>Revisi Qty</strong> yang hak otorisasi pengelolaannya ditentukan oleh Super Admin.
            </p>
          </div>
        </div>

        {/* User Authorization & Action Button Group */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {/* Authorization status badge for current user */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-3 text-xs">
            <div className="text-[11px] text-slate-400">
              Hak Otorisasi Anda:
            </div>
            <div className="flex items-center space-x-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  canApprove
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
                title={canApprove ? 'Anda berhak menyetujui / menolak permintaan' : 'Anda tidak memiliki hak approval'}
              >
                {canApprove ? '✓ Approval' : '✕ Approval'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  canRevise
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
                title={canRevise ? 'Anda berhak merevisi kuota quantity item' : 'Anda tidak memiliki hak revisi qty'}
              >
                {canRevise ? '✓ Revisi Qty' : '✕ Revisi Qty'}
              </span>
            </div>
          </div>

          {/* Super Admin Quick Approver Configuration Modal Trigger */}
          {isSuperAdmin && onUpdateUsers && (
            <button
              type="button"
              onClick={() => setIsApproverConfigModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Atur pengguna yang berhak melakukan Approval dan Revisi Qty"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Kelola Otorisasi Approver</span>
            </button>
          )}

          {/* New Request Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Material Request</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Requests */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Pengajuan</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Surat Permintaan Barang
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
            <span>Menunggu Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300 mt-2 flex items-center space-x-2">
            <span>{stats.pending}</span>
            {stats.pending > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-amber-300 animate-pulse">
                Butuh Tindakan
              </span>
            )}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1 truncate">
            Status PENDING
          </div>
        </div>

        {/* Approved */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold">
            <span>Disetujui (Approved)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-300 mt-2">
            {stats.approved}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 truncate">
            Disetujui & Siap Restock
          </div>
        </div>

        {/* Revised */}
        <div className="bg-sky-950/20 border border-sky-500/30 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-sky-300 text-xs font-semibold">
            <span>Direvisi (Revised)</span>
            <Edit3 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-300 mt-2">
            {stats.revised}
          </div>
          <div className="text-[11px] text-sky-400/80 mt-1 truncate">
            Qty Disesuaikan Approver
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-rose-950/20 border border-rose-500/30 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-rose-300 text-xs font-semibold">
            <span>Ditolak (Rejected)</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-300 mt-2">
            {stats.rejected}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1 truncate">
            Tidak Disetujui
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Semua Lokasi Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Semua Status</option>
              <option value="PENDING" className="bg-slate-900 text-amber-400">Menunggu (PENDING)</option>
              <option value="APPROVED" className="bg-slate-900 text-emerald-400">Disetujui (APPROVED)</option>
              <option value="REVISED" className="bg-slate-900 text-sky-400">Direvisi (REVISED)</option>
              <option value="REJECTED" className="bg-slate-900 text-rose-400">Ditolak (REJECTED)</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Semua Prioritas</option>
              <option value="Normal" className="bg-slate-900 text-slate-300">Normal</option>
              <option value="Urgent" className="bg-slate-900 text-amber-300">Urgent</option>
              <option value="Kritis" className="bg-slate-900 text-rose-400">Kritis</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px] md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode MR, pemohon, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Requests List Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No. Pengajuan</th>
                <th className="py-3 px-4">Lokasi Proyek</th>
                <th className="py-3 px-4">Pemohon</th>
                <th className="py-3 px-4">Item Barang Diminta</th>
                <th className="py-3 px-3 text-center">Prioritas</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Verifikasi & Catatan</th>
                <th className="py-3 px-4 text-center">Tindakan Otorisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileCheck className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold">Belum ada data Material Request yang cocok.</p>
                      <p className="text-[11px] text-slate-600">
                        Klik tombol <strong>Buat Material Request</strong> untuk membuat permintaan barang stok baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  return (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Code & Dates */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold font-mono text-amber-400 text-xs">
                          {req.requestCode}
                        </div>
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Diajukan: {formatDateDDMMYYYY(req.requestDate)}</span>
                        </div>
                        {req.requiredDate && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Target: {formatDateDDMMYYYY(req.requiredDate)}
                          </div>
                        )}
                      </td>

                      {/* Project Location */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center space-x-1.5 font-semibold text-white">
                          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{req.projectName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 italic line-clamp-2" title={req.purpose}>
                          "{req.purpose}"
                        </div>
                      </td>

                      {/* Requester */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-200">{req.requesterName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{req.requesterRole}</div>
                      </td>

                      {/* Items breakdown */}
                      <td className="py-3.5 px-4 align-top max-w-[280px]">
                        <div className="space-y-1.5">
                          {req.items.map((item, idx) => {
                            const isRevisedItem = item.approvedQty !== undefined && item.approvedQty !== item.requestedQty;
                            return (
                              <div
                                key={item.id || idx}
                                className="bg-slate-950/60 border border-slate-800/80 p-2 rounded-xl text-[11px]"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white truncate max-w-[160px]" title={item.itemName}>
                                    {item.itemName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 uppercase font-mono">
                                    {item.category.substring(0, 8)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1 text-slate-300">
                                  <div className="flex items-center space-x-1">
                                    <span>Diminta:</span>
                                    <span className="font-bold text-amber-300">
                                      {item.requestedQty} {item.unit}
                                    </span>
                                  </div>
                                  {item.approvedQty !== undefined && (
                                    <div className="flex items-center space-x-1">
                                      <span>Disetujui:</span>
                                      <span
                                        className={`font-bold ${
                                          isRevisedItem ? 'text-sky-300 underline decoration-sky-500' : 'text-emerald-300'
                                        }`}
                                      >
                                        {item.approvedQty} {item.unit}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div className="text-[10px] text-slate-400 font-mono text-right pt-0.5">
                            Total: {req.totalItems} macam item • {req.items.reduce((s, i) => s + (i.requestedQty || 0), 0)} unit
                          </div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-3 align-top text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            req.priority === 'Kritis'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : req.priority === 'Urgent'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {req.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 align-top text-center">
                        {req.status === 'PENDING' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>APPROVED</span>
                          </span>
                        )}
                        {req.status === 'REVISED' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            <Edit3 className="w-3 h-3" />
                            <span>REVISED</span>
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <XCircle className="w-3 h-3" />
                            <span>REJECTED</span>
                          </span>
                        )}

                        {/* Inbound stock indicator if approved */}
                        {(req.status === 'APPROVED' || req.status === 'REVISED') && (
                          <div className="mt-2">
                            {req.isAppliedToStock ? (
                              <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                ✓ Masuk Stok Lokasi
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyToStock(req)}
                                title="Klik untuk langsung membukukan barang yang disetujui ke stok lokasi proyek"
                                className="inline-flex items-center space-x-1 text-[9px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <ArrowDownLeft className="w-2.5 h-2.5" />
                                <span>Terapkan ke Stok</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Verification details */}
                      <td className="py-3.5 px-4 align-top">
                        {req.reviewedByName ? (
                          <div className="space-y-1 text-[11px]">
                            <div className="font-semibold text-slate-200">
                              {req.reviewedByName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {req.reviewedByRole} • {req.reviewedAt ? formatDateDDMMYYYY(req.reviewedAt) : ''}
                            </div>
                            {req.approvalNotes && (
                              <div className="text-[11px] text-amber-300/90 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800 italic mt-1">
                                "{req.approvalNotes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Belum diverifikasi
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex flex-col items-center space-y-1.5">
                          {/* Detail & Simpan PDF */}
                          <button
                            type="button"
                            onClick={() => setSelectedRequestForDetail(req)}
                            className="w-full px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                            title="Lihat Rincian & Simpan PDF Surat Permintaan Barang"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Slip & PDF</span>
                          </button>

                          {/* Approval / Reject Buttons (Enabled if user has canApprove or is Super Admin) */}
                          {canApprove && (req.status === 'PENDING' || req.status === 'REVISED') && (
                            <div className="flex items-center space-x-1 w-full">
                              <button
                                type="button"
                                onClick={() => setRequestForApproval(req)}
                                className="flex-1 px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                                title="Setujui (Approve) Permintaan Barang Ini"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRequestForReject(req)}
                                className="flex-1 px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                                title="Tolak (Reject) Permintaan Barang Ini"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}

                          {/* Revision Button (Enabled if user has canRevise or is Super Admin) */}
                          {canRevise && req.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => setRequestForRevision(req)}
                              className="w-full px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                              title="Revisi / Sesuaikan Qty Item yang Disetujui"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Revisi Qty</span>
                            </button>
                          )}

                          {/* Fitur Hapus Pengajuan Material Request */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(req.id)}
                            className="w-full px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                            title="Hapus Pengajuan Material Request Ini"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL: BUAT MATERIAL REQUEST BARU */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <CreateMaterialRequestModal
          projects={projects}
          inventoryItems={inventoryItems}
          projectStocks={projectStocks}
          currentUser={currentUser}
          defaultProjectId={projectFilter !== 'ALL' ? projectFilter : projects[0]?.id || ''}
          existingRequestsCount={materialRequests.length}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(newRequest) => {
            const updated = [newRequest, ...materialRequests];
            onUpdateMaterialRequests(updated);
            setIsCreateModalOpen(false);
            showToast(`Material Request ${newRequest.requestCode} berhasil dibuat dan diajukan.`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL: REVISI JUMLAH / QTY ITEM (OTORISASI SUPER ADMIN / APPROVER) */}
      {/* ========================================================================= */}
      {requestForRevision && (
        <ReviseMaterialRequestModal
          request={requestForRevision}
          currentUser={currentUser}
          onClose={() => setRequestForRevision(null)}
          onSubmit={(revisedRequest) => {
            const updated = materialRequests.map((r) =>
              r.id === revisedRequest.id ? revisedRequest : r
            );
            onUpdateMaterialRequests(updated);
            setRequestForRevision(null);
            showToast(`Material Request ${revisedRequest.requestCode} berhasil direvisi kuota Qty-nya.`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: KONFIRMASI APPROVAL */}
      {/* ========================================================================= */}
      {requestForApproval && (
        <ApproveMaterialRequestModal
          request={requestForApproval}
          currentUser={currentUser}
          onClose={() => setRequestForApproval(null)}
          onConfirm={(notes, applyStockImmediately) => {
            const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
            const updatedItems = requestForApproval.items.map((it) => ({
              ...it,
              approvedQty: it.approvedQty !== undefined ? it.approvedQty : it.requestedQty
            }));

            const approvedRequest: MaterialRequest = {
              ...requestForApproval,
              status: 'APPROVED',
              items: updatedItems,
              reviewedById: currentUser?.id,
              reviewedByName: currentUser?.name || 'Super Admin (HQ)',
              reviewedByRole: currentUser?.role || 'Super Admin (HQ)',
              reviewedAt: nowStr,
              approvalNotes: notes,
              updatedAt: nowStr
            };

            let nextStocks = [...projectStocks];
            if (applyStockImmediately) {
              const dateOnly = nowStr.split(' ')[0];
              updatedItems.forEach((item) => {
                const qtyToAdd = item.approvedQty !== undefined ? item.approvedQty : item.requestedQty;
                if (qtyToAdd <= 0) return;

                const existingIdx = nextStocks.findIndex(
                  (ps) => ps.itemId === item.itemId && ps.projectId === requestForApproval.projectId
                );
                const prevStock = existingIdx >= 0 ? nextStocks[existingIdx].currentStock : 0;
                const newStock = prevStock + qtyToAdd;

                if (existingIdx >= 0) {
                  nextStocks[existingIdx] = {
                    ...nextStocks[existingIdx],
                    currentStock: newStock,
                    lastUpdated: dateOnly
                  };
                } else {
                  nextStocks.push({
                    id: `stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    projectId: requestForApproval.projectId,
                    itemId: item.itemId,
                    currentStock: newStock,
                    lastUpdated: dateOnly
                  });
                }

                // Add log
                onAddLog({
                  id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  projectId: requestForApproval.projectId,
                  itemId: item.itemId,
                  type: 'IN',
                  quantity: qtyToAdd,
                  previousStock: prevStock,
                  newStock: newStock,
                  date: dateOnly,
                  pic: currentUser?.name || 'Approver',
                  notes: `Restock Otomatis Material Request ${requestForApproval.requestCode}`
                });
              });

              approvedRequest.isAppliedToStock = true;
              approvedRequest.appliedAt = nowStr;
              approvedRequest.appliedBy = currentUser?.name || 'Approver';
              onUpdateStocks(nextStocks);
            }

            const updatedRequests = materialRequests.map((r) =>
              r.id === approvedRequest.id ? approvedRequest : r
            );
            onUpdateMaterialRequests(updatedRequests);
            setRequestForApproval(null);
            showToast(
              `Material Request ${approvedRequest.requestCode} telah disetujui (APPROVED)!` +
                (applyStockImmediately ? ' Stok lokasi otomatis diperbarui.' : '')
            );
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: KONFIRMASI REJECT */}
      {/* ========================================================================= */}
      {requestForReject && (
        <RejectMaterialRequestModal
          request={requestForReject}
          currentUser={currentUser}
          onClose={() => setRequestForReject(null)}
          onConfirm={(reason) => {
            const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
            const rejectedRequest: MaterialRequest = {
              ...requestForReject,
              status: 'REJECTED',
              reviewedById: currentUser?.id,
              reviewedByName: currentUser?.name || 'Super Admin (HQ)',
              reviewedByRole: currentUser?.role || 'Super Admin (HQ)',
              reviewedAt: nowStr,
              approvalNotes: reason,
              updatedAt: nowStr
            };

            const updatedRequests = materialRequests.map((r) =>
              r.id === rejectedRequest.id ? rejectedRequest : r
            );
            onUpdateMaterialRequests(updatedRequests);
            setRequestForReject(null);
            showToast(`Material Request ${rejectedRequest.requestCode} telah ditolak (REJECTED).`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: DETAIL & CETAK SLIP PERMINTAAN BARANG */}
      {/* ========================================================================= */}
      {selectedRequestForDetail && (
        <MaterialRequestDetailSlipModal
          request={selectedRequestForDetail}
          companyProfile={companyProfile}
          onClose={() => setSelectedRequestForDetail(null)}
          onDelete={() => {
            const reqId = selectedRequestForDetail.id;
            setSelectedRequestForDetail(null);
            handleDeleteRequest(reqId);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: KELOLA OTORISASI APPROVER (SUPER ADMIN CONFIG) */}
      {/* ========================================================================= */}
      {isApproverConfigModalOpen && isSuperAdmin && onUpdateUsers && (
        <ManageApproversModal
          users={users}
          currentUser={currentUser}
          onClose={() => setIsApproverConfigModalOpen(false)}
          onUpdateUsers={(newUsers) => {
            onUpdateUsers(newUsers);
            showToast('Pengaturan hak otorisasi Approval & Revisi berhasil diperbarui.');
          }}
        />
      )}

      {/* Modal Konfirmasi Hapus Material Request */}
      <ConfirmModal
        isOpen={Boolean(deleteRequestTarget)}
        title="Hapus Material Request"
        message={`Apakah Anda yakin ingin menghapus pengajuan Material Request ${deleteRequestTarget?.requestCode} (${deleteRequestTarget?.projectName})? Data ini akan dihapus secara permanen.`}
        confirmText="Ya, Hapus Pengajuan"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmDeleteRequest}
        onCancel={() => setDeleteRequestTarget(null)}
      />
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: CREATE MATERIAL REQUEST MODAL
// =============================================================================
interface CreateMaterialRequestModalProps {
  projects: Project[];
  inventoryItems: InventoryItem[];
  projectStocks: ProjectStock[];
  currentUser: UserAccount | null;
  defaultProjectId: string;
  existingRequestsCount: number;
  onClose: () => void;
  onSubmit: (req: MaterialRequest) => void;
}

const CreateMaterialRequestModal: React.FC<CreateMaterialRequestModalProps> = ({
  projects,
  inventoryItems,
  projectStocks,
  currentUser,
  defaultProjectId,
  existingRequestsCount,
  onClose,
  onSubmit
}) => {
  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || '');
  const [priority, setPriority] = useState<MaterialRequestPriority>('Normal');
  const [requiredDate, setRequiredDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [purpose, setPurpose] = useState<string>('');

  // Row item form draft
  interface DraftItem {
    tempId: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    category: any;
    unit: string;
    currentStock: number;
    requestedQty: number;
    unitPrice: number;
    notes: string;
  }

  const [items, setItems] = useState<DraftItem[]>(() => {
    const firstItem = inventoryItems[0];
    if (!firstItem) return [];

    const stock = projectStocks.find(
      (ps) => ps.itemId === firstItem.id && ps.projectId === (defaultProjectId || projects[0]?.id || '')
    );

    return [
      {
        tempId: `ditem-${Date.now()}`,
        itemId: firstItem.id,
        itemCode: firstItem.code,
        itemName: firstItem.name,
        category: firstItem.category,
        unit: firstItem.unit,
        currentStock: stock ? stock.currentStock : 0,
        requestedQty: 1,
        unitPrice: firstItem.price || 0,
        notes: ''
      }
    ];
  });

  // When project changes, refresh the currentStock display of existing draft items
  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    setItems((prev) =>
      prev.map((it) => {
        const stock = projectStocks.find(
          (ps) => ps.itemId === it.itemId && ps.projectId === newProjId
        );
        return {
          ...it,
          currentStock: stock ? stock.currentStock : 0
        };
      })
    );
  };

  // Add new item row
  const handleAddItemRow = () => {
    // Pick an item from master that isn't already added, or default to first
    const unusedItem =
      inventoryItems.find((inv) => !items.some((it) => it.itemId === inv.id)) || inventoryItems[0];

    if (!unusedItem) return;

    const stock = projectStocks.find(
      (ps) => ps.itemId === unusedItem.id && ps.projectId === projectId
    );

    setItems((prev) => [
      ...prev,
      {
        tempId: `ditem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        itemId: unusedItem.id,
        itemCode: unusedItem.code,
        itemName: unusedItem.name,
        category: unusedItem.category,
        unit: unusedItem.unit,
        currentStock: stock ? stock.currentStock : 0,
        requestedQty: 1,
        unitPrice: unusedItem.price || 0,
        notes: ''
      }
    ]);
  };

  // Change selected item in a row
  const handleRowItemSelect = (tempId: string, selectedItemId: string) => {
    const found = inventoryItems.find((inv) => inv.id === selectedItemId);
    if (!found) return;

    const stock = projectStocks.find(
      (ps) => ps.itemId === found.id && ps.projectId === projectId
    );

    setItems((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        return {
          ...row,
          itemId: found.id,
          itemCode: found.code,
          itemName: found.name,
          category: found.category,
          unit: found.unit,
          currentStock: stock ? stock.currentStock : 0,
          unitPrice: found.price || 0
        };
      })
    );
  };

  // Update row quantity
  const handleRowQtyChange = (tempId: string, qtyStr: string) => {
    const qty = Math.max(1, parseInt(qtyStr, 10) || 1);
    setItems((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, requestedQty: qty } : row))
    );
  };

  // Update row notes
  const handleRowNotesChange = (tempId: string, val: string) => {
    setItems((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, notes: val } : row))
    );
  };

  // Remove row
  const handleRemoveRow = (tempId: string) => {
    if (items.length <= 1) {
      alert('Permintaan barang harus memiliki minimal 1 item!');
      return;
    }
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  // Calculate totals
  const totalEstimatedCost = useMemo(() => {
    return items.reduce((acc, cur) => acc + (cur.unitPrice || 0) * cur.requestedQty, 0);
  }, [items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      alert('Pilih lokasi proyek target!');
      return;
    }

    if (items.length === 0) {
      alert('Tambahkan minimal 1 item barang yang akan diminta!');
      return;
    }

    const selectedProj = projects.find((p) => p.id === projectId);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const yearMonth = dateStr.replace('-', '').substring(0, 6);
    const requestCode = `MR-${yearMonth}-${String(existingRequestsCount + 1).padStart(3, '0')}`;

    const formattedItems: MaterialRequestItem[] = items.map((it) => ({
      id: `mri-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemId: it.itemId,
      itemCode: it.itemCode,
      itemName: it.itemName,
      category: it.category,
      unit: it.unit,
      currentStockAtProject: it.currentStock,
      requestedQty: it.requestedQty,
      unitPrice: it.unitPrice,
      notes: it.notes.trim() || undefined
    }));

    const newRequest: MaterialRequest = {
      id: `mr-${Date.now()}`,
      requestCode,
      projectId,
      projectName: selectedProj?.name || 'Lokasi Proyek',
      requestDate: dateStr,
      requiredDate: requiredDate || undefined,
      requesterId: currentUser?.id,
      requesterName: currentUser?.name || 'Admin Lokasi',
      requesterRole: currentUser?.role || 'Admin Lapangan',
      status: 'PENDING',
      priority,
      purpose: purpose.trim() || 'Permintaan restock barang operasional lokasi',
      items: formattedItems,
      totalItems: formattedItems.length,
      totalEstimatedCost,
      createdAt: now.toISOString().replace('T', ' ').substring(0, 16)
    };

    onSubmit(newRequest);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        {/* Modal Header */}
        <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Buat Permintaan Barang (Material Request)</h3>
              <p className="text-xs text-slate-400">
                Pengadaan item stok lokasi diambil dari Katalog Master Chemical, Alat & APD
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: Lokasi & Target Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Lokasi Proyek Target */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Lokasi Proyek Target Stok *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={projectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Tanggal Dibutuhkan */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Target Tanggal Dibutuhkan *
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            {/* Tingkat Prioritas */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Tingkat Prioritas *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaterialRequestPriority)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="Normal">Normal (Pengadaan Rutin)</option>
                <option value="Urgent">Urgent (Stok Menipis)</option>
                <option value="Kritis">Kritis (Habis / Emergency)</option>
              </select>
            </div>
          </div>

          {/* Keperluan / Catatan Pengajuan */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Tujuan / Keperluan Permintaan Barang *
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Contoh: Permintaan stok chemical pembersih lantai, handsoap, dan sarung tangan karet untuk operasional minggu depan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              required
            />
          </div>

          {/* Section 2: Items Table (Katalog Master Chemical, Alat & APD) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Daftar Item Barang yang Diajukan ({items.length} item)
                </span>
                <span className="text-[11px] text-slate-400">
                  Pilih item dari Katalog Master. Sistem otomatis memuat nama barang, satuan, dan sisa stok lokasi.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Item</span>
              </button>
            </div>

            {/* Item Rows Container */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {items.map((row, index) => {
                return (
                  <div
                    key={row.tempId}
                    className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3"
                  >
                    {/* Index */}
                    <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>

                    {/* Dropdown Item Selection from Master Catalog */}
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Pilih Master Item Chemical / Alat / APD
                      </label>
                      <select
                        value={row.itemId}
                        onChange={(e) => handleRowItemSelect(row.tempId, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      >
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            [{item.code}] {item.name} ({item.unit}) - {item.category}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                        <span>Kategori: <strong className="text-slate-300">{row.category}</strong></span>
                        <span>•</span>
                        <span>Stok di Proyek Saat Ini: <strong className="text-amber-400">{row.currentStock} {row.unit}</strong></span>
                      </div>
                    </div>

                    {/* Satuan (Auto Displayed) */}
                    <div className="w-24 shrink-0">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Satuan
                      </label>
                      <div className="bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 truncate">
                        {row.unit}
                      </div>
                    </div>

                    {/* Qty Input */}
                    <div className="w-28 shrink-0">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Qty Barang *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={row.requestedQty}
                        onChange={(e) => handleRowQtyChange(row.tempId, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500/50 text-center"
                        required
                      />
                    </div>

                    {/* Notes per item */}
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Catatan Spesifik (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: khusus lantai 3"
                        value={row.notes}
                        onChange={(e) => handleRowNotesChange(row.tempId, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>

                    {/* Delete Action */}
                    <div className="flex items-center shrink-0 pt-3 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.tempId)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Hapus baris item ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Items & Quantity Summary Bar */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="text-slate-400">
                Total Item: <span className="text-white font-bold">{items.length} Macam Barang</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Total Kuantitas:</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {items.reduce((acc, cur) => acc + (cur.requestedQty || 0), 0)} Unit/Pcs
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20"
            >
              Kirim Material Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: REVISE MATERIAL REQUEST MODAL
// =============================================================================
interface ReviseMaterialRequestModalProps {
  request: MaterialRequest;
  currentUser: UserAccount | null;
  onClose: () => void;
  onSubmit: (revised: MaterialRequest) => void;
}

const ReviseMaterialRequestModal: React.FC<ReviseMaterialRequestModalProps> = ({
  request,
  currentUser,
  onClose,
  onSubmit
}) => {
  const [items, setItems] = useState<MaterialRequestItem[]>(() =>
    request.items.map((it) => ({
      ...it,
      approvedQty: it.approvedQty !== undefined ? it.approvedQty : it.requestedQty
    }))
  );

  const [revisionNotes, setRevisionNotes] = useState<string>(
    request.approvalNotes || ''
  );

  const [markAsApprovedDirectly, setMarkAsApprovedDirectly] = useState<boolean>(true);

  const handleQtyChange = (itemId: string, val: string) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, approvedQty: qty } : it))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!revisionNotes.trim()) {
      alert('Mohon masukkan alasan / catatan revisi kuota barang!');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Recalculate total estimated cost with revised qty
    const totalEstimatedCost = items.reduce(
      (acc, cur) => acc + (cur.unitPrice || 0) * (cur.approvedQty !== undefined ? cur.approvedQty : cur.requestedQty),
      0
    );

    const revisedRequest: MaterialRequest = {
      ...request,
      status: markAsApprovedDirectly ? 'APPROVED' : 'REVISED',
      items,
      totalEstimatedCost,
      reviewedById: currentUser?.id,
      reviewedByName: currentUser?.name || 'Super Admin (HQ)',
      reviewedByRole: currentUser?.role || 'Super Admin (HQ)',
      reviewedAt: nowStr,
      approvalNotes: revisionNotes.trim(),
      updatedAt: nowStr
    };

    onSubmit(revisedRequest);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Revisi Qty Permintaan: {request.requestCode}
              </h3>
              <p className="text-xs text-slate-400">
                Lokasi: {request.projectName} • Pemohon: {request.requesterName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-sky-950/30 border border-sky-500/30 p-3.5 rounded-xl text-xs text-sky-200">
            <div className="font-bold flex items-center space-x-1.5 text-sky-300">
              <Info className="w-4 h-4" />
              <span>Otorisasi Penyesuaian Kuota (Super Admin / Approver)</span>
            </div>
            <p className="text-slate-300 mt-1 leading-relaxed">
              Anda dapat menyesuaikan jumlah kuota barang yang disetujui (misalnya disesuaikan dengan ketersediaan gudang logistik atau efisiensi anggaran lokasi).
            </p>
          </div>

          {/* Table of Items for Revision */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-white">
              Daftar Penyesuaian Qty Item Barang
            </label>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const requested = item.requestedQty;
                const approved = item.approvedQty !== undefined ? item.approvedQty : requested;
                const diff = approved - requested;

                return (
                  <div
                    key={item.id || idx}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-[200px]">
                      <div className="font-bold text-white text-xs">{item.itemName}</div>
                      <div className="text-[11px] text-slate-400">
                        Kode: {item.itemCode} • Satuan: <span className="text-amber-400 font-bold">{item.unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Original Requested */}
                      <div className="text-center">
                        <span className="text-[10px] text-slate-500 block">Qty Diajukan</span>
                        <span className="text-xs font-bold text-amber-400">
                          {requested} {item.unit}
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-600" />

                      {/* Approved / Revised Input */}
                      <div className="text-center w-28">
                        <span className="text-[10px] font-bold text-sky-300 block">Qty Disetujui *</span>
                        <input
                          type="number"
                          min="0"
                          value={approved}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          className="w-full bg-slate-900 border border-sky-500/50 rounded-lg px-2 py-1 text-xs font-bold text-center text-white focus:outline-none focus:border-sky-400"
                          required
                        />
                      </div>

                      {/* Delta Indicator */}
                      <div className="text-center min-w-[70px]">
                        <span className="text-[10px] text-slate-500 block">Selisih</span>
                        <span
                          className={`text-xs font-bold ${
                            diff < 0
                              ? 'text-rose-400'
                              : diff > 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revision Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Alasan / Catatan Revisi Qty *
            </label>
            <textarea
              rows={3}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Contoh: Qty floor cleaner dikurangi 2 jerigen karena stok gudang pusat terbatas dan alokasi disesuaikan untuk 2 minggu..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              required
            />
          </div>

          {/* Workflow status option */}
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-white block">Status Pasca Revisi</span>
              <span className="text-[11px] text-slate-400">
                {markAsApprovedDirectly
                  ? 'Langsung setujui pengajuan dengan kuota revisi baru (APPROVED)'
                  : 'Simpan sebagai draf revisi (REVISED)'}
              </span>
            </div>
            <label className="flex items-center space-x-2 text-xs cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={markAsApprovedDirectly}
                onChange={(e) => setMarkAsApprovedDirectly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400"
              />
              <span className="font-bold text-amber-300">Langsung Setujui (Approve)</span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-lg shadow-sky-500/20"
            >
              Simpan Revisi Qty
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: APPROVE MODAL
// =============================================================================
interface ApproveModalProps {
  request: MaterialRequest;
  currentUser: UserAccount | null;
  onClose: () => void;
  onConfirm: (notes: string, applyStockImmediately: boolean) => void;
}

const ApproveMaterialRequestModal: React.FC<ApproveModalProps> = ({
  request,
  currentUser,
  onClose,
  onConfirm
}) => {
  const [notes, setNotes] = useState<string>('Disetujui untuk pengadaan stok lokasi proyek.');
  const [applyStockImmediately, setApplyStockImmediately] = useState<boolean>(true);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-950/80 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Persetujuan Material Request</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Anda akan menyetujui Material Request <strong>{request.requestCode}</strong> untuk lokasi <strong>{request.projectName}</strong> dengan total <strong>{request.totalItems} item</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Catatan Approval (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={applyStockImmediately}
              onChange={(e) => setApplyStockImmediately(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 mt-0.5"
            />
            <div>
              <span className="font-bold text-emerald-300 block">
                Otomatis Bukukan ke Stok Lokasi Proyek Sekarang
              </span>
              <span className="text-[11px] text-slate-400">
                Menambahkan kuota barang yang disetujui langsung ke data Stok Lokasi (Inbound Restock).
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onConfirm(notes, applyStockImmediately)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
            >
              Konfirmasi Setujui
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: REJECT MODAL
// =============================================================================
interface RejectModalProps {
  request: MaterialRequest;
  currentUser: UserAccount | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const RejectMaterialRequestModal: React.FC<RejectModalProps> = ({
  request,
  currentUser,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState<string>('');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-950/80 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-rose-400">
            <XCircle className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Penolakan Material Request</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Anda akan menolak pengajuan <strong>{request.requestCode}</strong> untuk lokasi <strong>{request.projectName}</strong>. Harap berikan alasan penolakan agar pemohon dapat mengetahuinya.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Alasan Penolakan (Wajib) *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Stok di lokasi proyek masih mencukupi berdasarkan audit fisik mingguan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!reason.trim()}
              onClick={() => {
                if (!reason.trim()) return;
                onConfirm(reason.trim());
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20"
            >
              Konfirmasi Tolak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: DETAIL & PRINT SLIP MODAL
// =============================================================================
interface DetailSlipModalProps {
  request: MaterialRequest;
  companyProfile?: CompanyProfile;
  onClose: () => void;
  onDelete?: () => void;
}

const MaterialRequestDetailSlipModal: React.FC<DetailSlipModalProps> = ({
  request,
  companyProfile,
  onClose,
  onDelete
}) => {
  const handleSavePDF = () => {
    generateMaterialRequestPDF(request, companyProfile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-6">
        {/* Top Control Bar */}
        <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">
              Slip Surat Permintaan Barang (Material Request)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              id="save-pdf-mr-slip-btn"
              type="button"
              onClick={handleSavePDF}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Simpan PDF</span>
            </button>
            {onDelete && (
              <button
                id="delete-mr-slip-btn"
                type="button"
                onClick={onDelete}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Hapus Pengajuan Material Request Ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Slip Paper Container */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          {/* Header Kop Surat Sesuai Master Identitas & Legalitas */}
          <OfficialLetterhead
            company={companyProfile || storageService.getCompanyProfile()}
            departmentSubtitle="Divisi Operasional & Chemical Management System"
            showLegal={true}
            className="border-b-2 border-slate-900 pb-4 mb-3"
          />

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 text-xs">
            <div>
              <span className="font-mono text-slate-500 uppercase font-semibold">
                KODE: <strong className="text-slate-900 font-bold">{request.requestCode}</strong> • TGL: {formatDateDDMMYYYY(request.requestDate)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">FORMULIR RESMI LOGISTIK</span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  request.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : request.status === 'REVISED'
                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                    : request.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                STATUS: {request.status}
              </span>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-5">
            <h2 className="text-sm font-black tracking-wider uppercase underline underline-offset-4">
              SURAT PERMINTAAN BARANG STOK LOKASI PROYEK (MATERIAL REQUEST)
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Divisi Operasional & Chemical Management System
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-5">
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-500">Lokasi Proyek Target:</span>{' '}
                <strong className="text-slate-900">{request.projectName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Tujuan / Keperluan:</span>{' '}
                <span className="text-slate-800 italic">{request.purpose}</span>
              </div>
              <div>
                <span className="text-slate-500">Tingkat Prioritas:</span>{' '}
                <strong className="text-slate-900">{request.priority}</strong>
              </div>
            </div>

            <div className="space-y-1.5 text-right sm:text-left">
              <div>
                <span className="text-slate-500">Tanggal Pengajuan:</span>{' '}
                <strong className="text-slate-900">{formatDateDDMMYYYY(request.requestDate)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Target Dibutuhkan:</span>{' '}
                <strong className="text-slate-900">
                  {request.requiredDate ? formatDateDDMMYYYY(request.requiredDate) : '-'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Pemohon (Requester):</span>{' '}
                <strong className="text-slate-900">{request.requesterName} ({request.requesterRole})</strong>
              </div>
            </div>
          </div>

          {/* Table of Requested Items */}
          <div className="overflow-hidden border border-slate-300 rounded-xl mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">Kode & Nama Item</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-center">Satuan</th>
                  <th className="py-2.5 px-3 text-center">Qty Diminta</th>
                  <th className="py-2.5 px-3 text-center">Qty Disetujui</th>
                  <th className="py-2.5 px-3">Catatan Khusus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {request.items.map((item, idx) => {
                  return (
                    <tr key={item.id || idx}>
                      <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.itemName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.itemCode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{item.unit}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {item.requestedQty}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {item.approvedQty !== undefined
                          ? item.approvedQty
                          : request.status === 'APPROVED'
                          ? item.requestedQty
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 italic">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-300 font-bold">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-slate-700">
                    Total: <span className="text-slate-900">{request.items.length} Macam Barang</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-950 font-bold">
                    {request.items.reduce((s, i) => s + (i.requestedQty || 0), 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                    {request.items.reduce(
                      (s, i) =>
                        s +
                        (i.approvedQty !== undefined
                          ? i.approvedQty
                          : request.status === 'APPROVED'
                          ? i.requestedQty
                          : 0),
                      0
                    )}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Verification / Approval Section */}
          {request.reviewedByName && (
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs mb-6">
              <div className="font-bold text-slate-800">Catatan Otorisasi & Verifikasi Approver:</div>
              <p className="text-slate-700 italic mt-1 leading-relaxed">
                "{request.approvalNotes || 'Disetujui sesuai prosedur standar operasional.'}"
              </p>
              <div className="text-[11px] text-slate-500 mt-2">
                Diverifikasi oleh: <strong>{request.reviewedByName}</strong> ({request.reviewedByRole}) pada {request.reviewedAt}
              </div>
            </div>
          )}

          {/* Signature Boxes */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-xs">
            <div>
              <p className="text-slate-500 mb-14">Pemohon (Site Requester)</p>
              <p className="font-bold text-slate-900 underline">{request.requesterName}</p>
              <p className="text-[10px] text-slate-500">{request.requesterRole}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-14">Supervisor / Koordinator Lokasi</p>
              <p className="font-bold text-slate-900 underline">Supervisor Operasional</p>
              <p className="text-[10px] text-slate-500">{companyProfile?.name || 'Departemen Logistik'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-14">Otorisasi Manajemen / Approver</p>
              <p className="font-bold text-slate-900 underline">
                {request.reviewedByName || companyProfile?.directorName || 'Super Admin (HQ)'}
              </p>
              <p className="text-[10px] text-slate-500">
                {request.reviewedByRole || companyProfile?.directorTitle || 'Otorisasi Super Admin'}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
            {companyProfile?.letterheadFooterNote || `Dokumen resmi diterbitkan melalui Sistem ERP ${companyProfile?.name || 'Perusahaan'} • Tercatat dalam Audit Trail Logistik`}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: MANAGE APPROVERS MODAL (SUPER ADMIN CONFIG)
// =============================================================================
interface ManageApproversModalProps {
  users: UserAccount[];
  currentUser: UserAccount | null;
  onClose: () => void;
  onUpdateUsers: (newUsers: UserAccount[]) => void;
}

const ManageApproversModal: React.FC<ManageApproversModalProps> = ({
  users,
  currentUser,
  onClose,
  onUpdateUsers
}) => {
  const [localUsers, setLocalUsers] = useState<UserAccount[]>(users);

  const toggleApproval = (userId: string) => {
    setLocalUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (u.role === 'Super Admin (HQ)') return u; // Super Admin always active
        return {
          ...u,
          canApproveMaterialRequests: !u.canApproveMaterialRequests
        };
      })
    );
  };

  const toggleRevise = (userId: string) => {
    setLocalUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (u.role === 'Super Admin (HQ)') return u; // Super Admin always active
        return {
          ...u,
          canReviseMaterialRequests: !u.canReviseMaterialRequests
        };
      })
    );
  };

  const handleSave = () => {
    onUpdateUsers(localUsers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Kelola Otorisasi Approver & Revisi</h3>
              <p className="text-xs text-slate-400">
                Tentukan akun pengguna mana saja yang berhak melakukan Approval dan Revisi Qty Material Request
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Sesuai regulasi sistem, Super Admin selalu memiliki hak penuh atas persetujuan dan revisi kuota barang.
            Anda dapat mendelegasikan hak tersebut kepada staf atau supervisor lain di bawah ini:
          </p>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Nama Pengguna</th>
                  <th className="py-2.5 px-3">Role Sistem</th>
                  <th className="py-2.5 px-3 text-center">Hak Approval / Reject</th>
                  <th className="py-2.5 px-3 text-center">Hak Revisi Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                {localUsers.map((u) => {
                  const isSuper = u.role === 'Super Admin (HQ)';
                  const hasApprove = isSuper || Boolean(u.canApproveMaterialRequests);
                  const hasRevise = isSuper || Boolean(u.canReviseMaterialRequests);

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] font-mono text-amber-400">@{u.username}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-slate-300 font-medium">{u.role}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleApproval(u.id)}
                          disabled={isSuper}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            hasApprove
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          } ${isSuper ? 'opacity-80 cursor-default' : ''}`}
                          title={isSuper ? 'Super Admin selalu memiliki hak' : 'Klik untuk mengubah hak'}
                        >
                          {hasApprove ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleRevise(u.id)}
                          disabled={isSuper}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                            hasRevise
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          } ${isSuper ? 'opacity-80 cursor-default' : ''}`}
                          title={isSuper ? 'Super Admin selalu memiliki hak' : 'Klik untuk mengubah hak'}
                        >
                          {hasRevise ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
