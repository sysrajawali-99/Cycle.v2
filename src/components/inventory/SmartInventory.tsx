import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  History,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  BarChart3,
  FileText,
  Download,
  Calendar,
  Layers,
  DollarSign,
  FileSpreadsheet,
  UploadCloud,
  Upload,
  FileCheck2,
  FileCheck,
  X,
  Info,
  Edit3,
  Trash2
} from 'lucide-react';
import {
  Project,
  InventoryItem,
  ProjectStock,
  InventoryLog,
  InventoryCategory,
  UserRole,
  MaterialRequest,
  UserAccount,
  CompanyProfile
} from '../../types';
import { storageService } from '../../services/storageService';
import { MaterialRequestTab } from './MaterialRequestTab';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { generateInventoryUsagePDF } from '../../utils/pdfExport';
import {
  downloadInventoryTemplateXLSX,
  downloadInventoryTemplateCSV,
  exportMasterInventoryToXLSX,
  parseInventoryFile,
  BulkParsedInventoryItem,
  downloadLocationStockTemplateXLSX,
  parseLocationStockFile,
  ParsedLocationStockRow
} from '../../utils/inventoryExcel';

interface SmartInventoryProps {
  projects: Project[];
  inventoryItems: InventoryItem[];
  projectStocks: ProjectStock[];
  inventoryLogs: InventoryLog[];
  materialRequests?: MaterialRequest[];
  onUpdateMaterialRequests?: (requests: MaterialRequest[]) => void;
  currentUser?: UserAccount | null;
  users?: UserAccount[];
  onUpdateUsers?: (users: UserAccount[]) => void;
  companyProfile?: CompanyProfile;
  selectedProjectId: string;
  onUpdateStocks: (updated: ProjectStock[]) => void;
  onAddLog: (log: InventoryLog) => void;
  onAddMasterItem: (item: InventoryItem) => void;
  onUpdateInventoryItems?: (items: InventoryItem[]) => void;
  userRole: UserRole;
}

export const SmartInventory: React.FC<SmartInventoryProps> = ({
  projects = [],
  inventoryItems = [],
  projectStocks = [],
  inventoryLogs = [],
  materialRequests = [],
  onUpdateMaterialRequests,
  currentUser = null,
  users = [],
  onUpdateUsers,
  companyProfile,
  selectedProjectId = 'ALL',
  onUpdateStocks,
  onAddLog,
  onAddMasterItem,
  onUpdateInventoryItems,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<'stocks' | 'requests' | 'recap' | 'logs' | 'catalog'>('stocks');
  const [activeProjectFilter, setActiveProjectFilter] = useState<string>(
    selectedProjectId !== 'ALL' ? selectedProjectId : projects[0]?.id || 'proj-1'
  );

  // Sync active project filter when projects or selected project changes
  useEffect(() => {
    if (selectedProjectId !== 'ALL' && selectedProjectId) {
      setActiveProjectFilter(selectedProjectId);
    } else if (projects.length > 0 && (!activeProjectFilter || !projects.some((p) => p.id === activeProjectFilter))) {
      setActiveProjectFilter(projects[0].id);
    }
  }, [selectedProjectId, projects]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Recap Tab Specific Filter States
  const [recapProjectFilter, setRecapProjectFilter] = useState<string>(
    selectedProjectId !== 'ALL' ? selectedProjectId : 'ALL'
  );
  const [recapCategoryFilter, setRecapCategoryFilter] = useState<string>('ALL');
  const [recapStartDate, setRecapStartDate] = useState<string>('2026-08-01');
  const [recapEndDate, setRecapEndDate] = useState<string>('2026-08-31');
  const [recapSearch, setRecapSearch] = useState<string>('');

  // Modals
  const [stockActionModal, setStockActionModal] = useState<{
    type: 'IN' | 'OUT';
    item: InventoryItem;
    currentStock: number;
  } | null>(null);

  const [showAddMasterModal, setShowAddMasterModal] = useState(false);

  // Bulk Upload Master Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsedList, setBulkParsedList] = useState<BulkParsedInventoryItem[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkErrorMessage, setBulkErrorMessage] = useState<string | null>(null);
  const [bulkImportMode, setBulkImportMode] = useState<'append' | 'replace'>('append');
  const [bulkInitStockForProjects, setBulkInitStockForProjects] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Stock Adjustment Modal State (Stok Lokasi Diisi Manual)
  const [manualStockModal, setManualStockModal] = useState<{
    item: InventoryItem;
    currentStock: number;
  } | null>(null);
  const [manualStockValue, setManualStockValue] = useState<number>(0);
  const [manualStockNotes, setManualStockNotes] = useState<string>('');
  const [manualStockPic, setManualStockPic] = useState<string>('Supervisor Site');

  // Location Stock Bulk Upload Modal State (Upload Masal Stok Lokasi)
  const [showLocationBulkModal, setShowLocationBulkModal] = useState(false);
  const [locationBulkFile, setLocationBulkFile] = useState<File | null>(null);
  const [locationBulkParsedList, setLocationBulkParsedList] = useState<ParsedLocationStockRow[]>([]);
  const [isLocationBulkLoading, setIsLocationBulkLoading] = useState(false);
  const [locationBulkErrorMessage, setLocationBulkErrorMessage] = useState<string | null>(null);
  const [locationBulkPic, setLocationBulkPic] = useState<string>('Admin Operasional');
  const [locationBulkNotes, setLocationBulkNotes] = useState<string>('Stock Opname Fisik Berkala Lokasi');
  const locationFileInputRef = useRef<HTMLInputElement | null>(null);

  // Stock Action Form State
  const [actionForm, setActionForm] = useState<{
    quantity: number;
    pic: string;
    notes: string;
  }>({
    quantity: 1,
    pic: 'Admin Operasional',
    notes: ''
  });

  // Master Item Form State
  const [masterForm, setMasterForm] = useState<{
    code: string;
    name: string;
    category: InventoryCategory;
    unit: string;
    minStock: number;
    description: string;
    unitPrice: number;
  }>({
    code: `CHM-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    category: 'Chemical',
    unit: 'Jerigen 5L',
    minStock: 4,
    description: '',
    unitPrice: 75000
  });

  // Tambah Stok di Lokasi (Ketik Manual Nama Barang, Kategori, Satuan, Qty & Tambah Baris)
  interface LocationStockRowItem {
    id: string;
    itemName: string;
    category: string;
    unit: string;
    qty: number | '';
  }

  const [showAddLocationStockModal, setShowAddLocationStockModal] = useState(false);
  const [targetLocationProjectId, setTargetLocationProjectId] = useState<string>('');
  const [addStockRows, setAddStockRows] = useState<LocationStockRowItem[]>([
    { id: 'row-1', itemName: '', category: 'Chemical', unit: 'Pcs', qty: 1 }
  ]);
  const [addStockPic, setAddStockPic] = useState<string>('Supervisor Site');
  const [addStockNotes, setAddStockNotes] = useState<string>('Input stok barang lokasi');

  // Distinct options from Master Catalog
  const masterItemNames = useMemo(() => {
    return Array.from(new Set(inventoryItems.map((i) => i.name).filter(Boolean))).sort();
  }, [inventoryItems]);

  const masterCategories = useMemo(() => {
    const cats = new Set(inventoryItems.map((i) => i.category).filter(Boolean));
    ['Chemical', 'Equipment', 'Consumable', 'Safety / APD', 'Lainnya'].forEach((c) => cats.add(c as any));
    return Array.from(cats).sort();
  }, [inventoryItems]);

  const masterUnits = useMemo(() => {
    const units = new Set(inventoryItems.map((i) => i.unit).filter(Boolean));
    ['Jerigen 5L', 'Botol 1L', 'Pcs', 'Unit', 'Roll', 'Box', 'Pasang', 'Set', 'Pack', 'Kg', 'Liter', 'Meter'].forEach((u) => units.add(u));
    return Array.from(units).sort();
  }, [inventoryItems]);

  const handleOpenAddLocationStock = () => {
    const validProj = projects.find((p) => p.id === activeProjectFilter)?.id || projects[0]?.id || 'proj-1';
    setTargetLocationProjectId(validProj);
    setAddStockRows([
      { id: `row-${Date.now()}-1`, itemName: '', category: 'Chemical', unit: 'Pcs', qty: 1 }
    ]);
    const currentPic = currentUser?.name || (userRole === 'MANAGEMENT' ? 'Manajemen HQ' : 'Supervisor Site');
    setAddStockPic(currentPic);
    const projName = projects.find((p) => p.id === validProj)?.name || activeProjectObj?.name || '';
    setAddStockNotes(`Input stok barang lokasi ${projName}`);
    setShowAddLocationStockModal(true);
  };

  const handleAddStockRowNameChange = (index: number, typedName: string) => {
    const updated = [...addStockRows];
    const trimmed = typedName.trim().toLowerCase();
    const matched = inventoryItems.find((it) => it.name.trim().toLowerCase() === trimmed);

    updated[index] = {
      ...updated[index],
      itemName: typedName,
      category: matched ? matched.category : (updated[index].category || 'Chemical'),
      unit: matched ? matched.unit : (updated[index].unit || 'Pcs')
    };

    setAddStockRows(updated);
  };

  const handleAddStockRowCategoryChange = (index: number, newCategory: string) => {
    const updated = [...addStockRows];
    updated[index] = { ...updated[index], category: newCategory };
    setAddStockRows(updated);
  };

  const handleAddStockRowUnitChange = (index: number, newUnit: string) => {
    const updated = [...addStockRows];
    updated[index] = { ...updated[index], unit: newUnit };
    setAddStockRows(updated);
  };

  const handleAddStockRowQtyChange = (index: number, val: string) => {
    const updated = [...addStockRows];
    if (val === '') {
      updated[index] = { ...updated[index], qty: '' };
    } else {
      const parsed = parseInt(val, 10);
      updated[index] = { ...updated[index], qty: isNaN(parsed) ? '' : Math.max(1, parsed) };
    }
    setAddStockRows(updated);
  };

  const handleRemoveAddStockRow = (index: number) => {
    if (addStockRows.length <= 1) {
      setAddStockRows([{ id: `row-${Date.now()}-1`, itemName: '', category: 'Chemical', unit: 'Pcs', qty: 1 }]);
      return;
    }
    const updated = addStockRows.filter((_, i) => i !== index);
    setAddStockRows(updated);
  };

  const handleAddNewRowManually = () => {
    setAddStockRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemName: '',
        category: 'Chemical',
        unit: 'Pcs',
        qty: 1
      }
    ]);
  };

  const handleSaveAddStockRows = (e: React.FormEvent) => {
    e.preventDefault();

    const targetProject = projects.find((p) => p.id === targetLocationProjectId) 
      || projects.find((p) => p.id === activeProjectFilter)
      || projects[0];

    const resolvedProjectId = targetProject?.id || activeProjectFilter;

    if (!resolvedProjectId) {
      alert('Lokasi / Proyek tujuan belum dipilih. Silakan pilih lokasi terlebih dahulu.');
      return;
    }

    // Filter valid rows: non-empty item name and valid qty > 0
    const validRows = addStockRows.filter(
      (r) => r.itemName && r.itemName.trim() !== '' && Number(r.qty) > 0
    );

    if (validRows.length === 0) {
      alert('Silakan ketik minimal 1 Nama Barang dan tentukan Jumlah (Qty) yang valid untuk disimpan.');
      return;
    }

    const nextStocks = [...projectStocks];
    const dateOnly = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let savedCount = 0;

    const newMasterItemsToSave: InventoryItem[] = [];
    const newLogsToSave: InventoryLog[] = [];
    const currentMasterCatalog = [...inventoryItems];

    validRows.forEach((r) => {
      const cleanName = r.itemName.trim();
      let matchedItem = currentMasterCatalog.find(
        (it) => it.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      let itemId = matchedItem?.id;

      if (!matchedItem) {
        const newItem: InventoryItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          code: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
          name: cleanName,
          category: (r.category || 'Chemical') as InventoryCategory,
          unit: r.unit || 'Pcs',
          minStock: 2,
          description: 'Ditambahkan via Tambah Stok Lokasi',
          unitPrice: 0
        };
        newMasterItemsToSave.push(newItem);
        currentMasterCatalog.push(newItem);
        itemId = newItem.id;
      }

      if (!itemId) return;

      const inputQty = Math.max(1, Math.round(Number(r.qty) || 1));
      const existingIdx = nextStocks.findIndex(
        (ps) => ps.itemId === itemId && ps.projectId === resolvedProjectId
      );

      if (existingIdx >= 0) {
        const prev = nextStocks[existingIdx].currentStock;
        const updatedStock = prev + inputQty;
        nextStocks[existingIdx] = {
          ...nextStocks[existingIdx],
          currentStock: updatedStock,
          lastUpdated: dateOnly
        };

        newLogsToSave.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          projectId: resolvedProjectId,
          itemId,
          type: 'IN',
          quantity: inputQty,
          previousStock: prev,
          newStock: updatedStock,
          date: nowStr,
          pic: addStockPic.trim() || currentUser?.name || userRole || 'Petugas Site',
          notes: addStockNotes.trim() || `Penambahan stok lokasi ${targetProject?.name || ''}`
        });
      } else {
        nextStocks.push({
          id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          projectId: resolvedProjectId,
          itemId,
          currentStock: inputQty,
          lastUpdated: dateOnly
        });

        newLogsToSave.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          projectId: resolvedProjectId,
          itemId,
          type: 'IN',
          quantity: inputQty,
          previousStock: 0,
          newStock: inputQty,
          date: nowStr,
          pic: addStockPic.trim() || currentUser?.name || userRole || 'Petugas Site',
          notes: addStockNotes.trim() || `Input stok awal lokasi ${targetProject?.name || ''}`
        });
      }

      savedCount++;
    });

    // 1. Update Master Items if new items were typed
    if (newMasterItemsToSave.length > 0) {
      if (onUpdateInventoryItems) {
        onUpdateInventoryItems(currentMasterCatalog);
      } else if (onAddMasterItem) {
        newMasterItemsToSave.forEach((itm) => onAddMasterItem(itm));
      }
      storageService.saveInventoryItems(currentMasterCatalog);
    }

    // 2. Update Project Stocks
    onUpdateStocks(nextStocks);
    storageService.saveProjectStocks(nextStocks);

    // 3. Update Inventory Logs
    const updatedLogs = [...newLogsToSave, ...inventoryLogs];
    storageService.saveInventoryLogs(updatedLogs);
    newLogsToSave.forEach((log) => onAddLog(log));

    // 4. Ensure view focuses on the target location so user sees newly added items immediately
    if (activeProjectFilter !== resolvedProjectId) {
      setActiveProjectFilter(resolvedProjectId);
    }

    alert(`Berhasil menyimpan ${savedCount} item ke stok lokasi ${targetProject?.name || ''}!`);
    setShowAddLocationStockModal(false);
  };

  const handleDeleteStockItem = (stockId: string, itemName: string) => {
    if (!window.confirm(`Hapus ${itemName} dari daftar stok lokasi ${activeProjectObj?.name || ''}?`)) {
      return;
    }
    const next = projectStocks.filter((ps) => ps.id !== stockId);
    onUpdateStocks(next);
  };

  const handleClearLocationStock = () => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin mengosongkan seluruh data stok di lokasi ${activeProjectObj?.name || ''}?`
      )
    ) {
      return;
    }
    const next = projectStocks.filter((ps) => ps.projectId !== activeProjectFilter);
    onUpdateStocks(next);
    alert(`Seluruh data stok di lokasi ${activeProjectObj?.name || ''} telah dikosongkan.`);
  };

  // Helper to get stock for an item in current selected project
  const getItemStock = (itemId: string, projId: string): number => {
    const found = projectStocks.find(
      (ps) => ps.itemId === itemId && ps.projectId === projId
    );
    return found ? found.currentStock : 0;
  };

  // Stock rows for the active project
  // Decoupled from master catalog: only shows items that have recorded stock in activeProjectFilter
  const stockRows = useMemo(() => {
    const siteStocks = projectStocks.filter((ps) => ps.projectId === activeProjectFilter);

    return siteStocks
      .map((ps) => {
        const matchedItem = inventoryItems.find((i) => i.id === ps.itemId);
        const item: InventoryItem = matchedItem || {
          id: ps.itemId,
          code: 'LOC-' + ps.itemId.slice(-6).toUpperCase(),
          name: (ps as any).itemName || 'Barang Lokasi',
          category: ((ps as any).category || 'Chemical') as InventoryCategory,
          unit: (ps as any).unit || 'Pcs',
          minStock: 2,
          description: 'Item stok lokasi',
          unitPrice: 0
        };
        const currentStock = ps.currentStock;
        const isCritical = currentStock <= item.minStock;
        return {
          stockId: ps.id,
          item,
          currentStock,
          isCritical,
          lastUpdated: ps.lastUpdated
        };
      })
      .filter(({ item }) => {
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.code.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [inventoryItems, projectStocks, activeProjectFilter, categoryFilter, searchQuery]);

  // Critical items count in active project
  const criticalItemsCount = useMemo(() => {
    return stockRows.filter((r) => r.isCritical).length;
  }, [stockRows]);

  // Bulk File Selection & Parsing Handler
  const handleBulkFileSelected = async (file: File) => {
    setBulkFile(file);
    setBulkErrorMessage(null);
    setIsBulkLoading(true);

    try {
      const parsed = await parseInventoryFile(file);
      setBulkParsedList(parsed);
    } catch (err: any) {
      console.error('Error parsing inventory file:', err);
      setBulkErrorMessage(err.message || 'Gagal membaca file spreadsheet/CSV.');
      setBulkParsedList([]);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Download template handlers
  const handleDownloadTemplateXLSX = () => {
    downloadInventoryTemplateXLSX();
  };

  const handleDownloadTemplateCSVDelimited = (delim: ';' | ',') => {
    downloadInventoryTemplateCSV(delim);
  };

  const handleExportMasterToXLSX = () => {
    exportMasterInventoryToXLSX(inventoryItems, projectStocks, projects);
  };

  // Execute Bulk Import
  const handleExecuteBulkImport = () => {
    const validItems = bulkParsedList.filter((item) => item.isValid);
    if (validItems.length === 0) {
      alert('Tidak ada data barang yang valid untuk di-import.');
      return;
    }

    const itemsToSave: InventoryItem[] = validItems.map((p) => p.item);
    let finalMasterCatalog: InventoryItem[] = [];

    if (bulkImportMode === 'replace') {
      finalMasterCatalog = itemsToSave;
    } else {
      // Append / Merge: update existing by code or append new
      const catalogMap = new Map<string, InventoryItem>();
      inventoryItems.forEach((existing) => {
        catalogMap.set(existing.code.toLowerCase(), existing);
      });
      itemsToSave.forEach((newItem) => {
        catalogMap.set(newItem.code.toLowerCase(), newItem);
      });
      finalMasterCatalog = Array.from(catalogMap.values());
    }

    if (onUpdateInventoryItems) {
      onUpdateInventoryItems(finalMasterCatalog);
    } else {
      // Fallback if not provided
      itemsToSave.forEach((it) => onAddMasterItem(it));
    }

    // Optional: Initialize project stock for all projects if initial stock specified
    if (bulkInitStockForProjects) {
      const nowStr = new Date().toISOString().split('T')[0];
      const nextStocks = [...projectStocks];

      validItems.forEach((p) => {
        if (p.initialStock > 0) {
          projects.forEach((proj) => {
            const existingIdx = nextStocks.findIndex(
              (s) => s.itemId === p.item.id && s.projectId === proj.id
            );
            if (existingIdx >= 0) {
              // Update stock if replacing or append
              nextStocks[existingIdx] = {
                ...nextStocks[existingIdx],
                currentStock: p.initialStock,
                lastUpdated: nowStr
              };
            } else {
              nextStocks.push({
                id: `stk-${Date.now()}-${proj.id}-${p.item.id}`,
                projectId: proj.id,
                itemId: p.item.id,
                currentStock: p.initialStock,
                lastUpdated: nowStr
              });
            }
          });
        }
      });

      onUpdateStocks(nextStocks);
    }

    alert(
      `Berhasil mengimpor ${validItems.length} Master Barang ke dalam sistem Rajawali!` +
        (bulkInitStockForProjects ? ' Stok awal per lokasi telah disinkronisasikan.' : '')
    );

    setShowBulkModal(false);
    setBulkFile(null);
    setBulkParsedList([]);
    setActiveTab('catalog');
  };

  // Handle Restock (IN) or Usage (OUT)
  const handleExecuteStockAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockActionModal) return;

    const { type, item, currentStock } = stockActionModal;
    const qty = Number(actionForm.quantity) || 0;

    if (qty <= 0) {
      alert('Jumlah quantity harus lebih besar dari 0!');
      return;
    }

    if (type === 'OUT' && qty > currentStock) {
      alert(`Stok tidak mencukupi! Sisa stok saat ini hanya ${currentStock} ${item.unit}`);
      return;
    }

    const newStock = type === 'IN' ? currentStock + qty : currentStock - qty;

    // 1. Update Project Stock
    const nextStocks = [...projectStocks];
    const existingIdx = nextStocks.findIndex(
      (ps) => ps.itemId === item.id && ps.projectId === activeProjectFilter
    );

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (existingIdx >= 0) {
      nextStocks[existingIdx] = {
        ...nextStocks[existingIdx],
        currentStock: newStock,
        lastUpdated: nowStr.split(' ')[0]
      };
    } else {
      nextStocks.push({
        id: `stk-${Date.now()}`,
        projectId: activeProjectFilter,
        itemId: item.id,
        currentStock: newStock,
        lastUpdated: nowStr.split(' ')[0]
      });
    }

    // 2. Create Audit Log
    const newLog: InventoryLog = {
      id: `log-${Date.now()}`,
      projectId: activeProjectFilter,
      itemId: item.id,
      type,
      quantity: qty,
      previousStock: currentStock,
      newStock,
      date: nowStr,
      pic: actionForm.pic || 'Admin Site',
      notes: actionForm.notes || (type === 'IN' ? 'Restock dari gudang pusat' : 'Pemakaian rutin operasional')
    };

    onUpdateStocks(nextStocks);
    onAddLog(newLog);
    setStockActionModal(null);
  };

  // Handle Manual Stock Adjustment (Stok Lokasi Diisi Manual)
  const handleSaveManualStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStockModal) return;

    const { item, currentStock } = manualStockModal;
    const finalNewStock = Math.max(0, Math.round(Number(manualStockValue) || 0));
    const diff = finalNewStock - currentStock;

    const nextStocks = [...projectStocks];
    const existingIdx = nextStocks.findIndex(
      (ps) => ps.itemId === item.id && ps.projectId === activeProjectFilter
    );

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (existingIdx >= 0) {
      nextStocks[existingIdx] = {
        ...nextStocks[existingIdx],
        currentStock: finalNewStock,
        lastUpdated: nowStr.split(' ')[0]
      };
    } else {
      nextStocks.push({
        id: `stk-${Date.now()}`,
        projectId: activeProjectFilter,
        itemId: item.id,
        currentStock: finalNewStock,
        lastUpdated: nowStr.split(' ')[0]
      });
    }

    if (diff !== 0) {
      const newLog: InventoryLog = {
        id: `log-${Date.now()}`,
        projectId: activeProjectFilter,
        itemId: item.id,
        type: diff > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(diff),
        previousStock: currentStock,
        newStock: finalNewStock,
        date: nowStr,
        pic: manualStockPic || userRole,
        notes:
          manualStockNotes.trim() ||
          `Penyesuaian stok manual lokasi ${activeProjectObj?.name || ''} (${
            diff > 0 ? `+${diff}` : diff
          } ${item.unit})`
      };
      onAddLog(newLog);
    }

    onUpdateStocks(nextStocks);
    setManualStockModal(null);
  };

  // Download Location Stock Template (.xlsx)
  const handleDownloadLocationStockTemplate = () => {
    downloadLocationStockTemplateXLSX(
      activeProjectObj?.name || 'Lokasi Proyek',
      inventoryItems,
      projectStocks,
      activeProjectFilter
    );
  };

  // Location Stock Bulk File Selected
  const handleLocationBulkFileSelected = async (file: File) => {
    setLocationBulkFile(file);
    setLocationBulkErrorMessage(null);
    setIsLocationBulkLoading(true);

    try {
      const parsed = await parseLocationStockFile(
        file,
        inventoryItems,
        projectStocks,
        activeProjectFilter
      );
      setLocationBulkParsedList(parsed);
    } catch (err: any) {
      console.error('Error parsing location stock file:', err);
      setLocationBulkErrorMessage(err.message || 'Gagal membaca file template stok lokasi.');
      setLocationBulkParsedList([]);
    } finally {
      setIsLocationBulkLoading(false);
    }
  };

  // Execute Location Stock Bulk Import
  const handleExecuteLocationBulkImport = () => {
    const validRows = locationBulkParsedList.filter((r) => r.status !== 'INVALID');
    if (validRows.length === 0) {
      alert('Tidak ada baris data stok yang valid untuk diperbarui.');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const dateOnly = nowStr.split(' ')[0];
    const nextStocks = [...projectStocks];
    let updatedCount = 0;
    let newItemsAdded = 0;
    const newItemsToCatalog: InventoryItem[] = [];

    validRows.forEach((row) => {
      let itemId = row.matchedItemId;

      if (!itemId) {
        const newItem: InventoryItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          code: row.code,
          name: row.name,
          category: (['Chemical', 'Equipment', 'Consumable', 'Safety / APD'].includes(row.category)
            ? row.category
            : 'Chemical') as InventoryCategory,
          unit: row.unit || 'Pcs',
          minStock: row.minStock || 4,
          description: 'Ditambahkan dari upload masal stok lokasi',
          unitPrice: 50000
        };
        newItemsToCatalog.push(newItem);
        itemId = newItem.id;
        newItemsAdded++;
      }

      const existingIdx = nextStocks.findIndex(
        (ps) => ps.itemId === itemId && ps.projectId === activeProjectFilter
      );

      if (existingIdx >= 0) {
        nextStocks[existingIdx] = {
          ...nextStocks[existingIdx],
          currentStock: row.newStock,
          lastUpdated: dateOnly
        };
      } else {
        nextStocks.push({
          id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          projectId: activeProjectFilter,
          itemId,
          currentStock: row.newStock,
          lastUpdated: dateOnly
        });
      }

      if (row.difference !== 0) {
        const newLog: InventoryLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          projectId: activeProjectFilter,
          itemId,
          type: row.difference > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(row.difference),
          previousStock: row.currentStockInSystem,
          newStock: row.newStock,
          date: nowStr,
          pic: locationBulkPic || userRole,
          notes:
            locationBulkNotes.trim() ||
            `Upload Masal Stok Lokasi (Stock Opname Fisik ${activeProjectObj?.name || ''})`
        };
        onAddLog(newLog);
      }

      updatedCount++;
    });

    if (newItemsToCatalog.length > 0 && onUpdateInventoryItems) {
      onUpdateInventoryItems([...inventoryItems, ...newItemsToCatalog]);
    } else if (newItemsToCatalog.length > 0) {
      newItemsToCatalog.forEach((it) => onAddMasterItem(it));
    }

    onUpdateStocks(nextStocks);

    alert(
      `Berhasil memperbarui ${updatedCount} stok barang di lokasi ${
        activeProjectObj?.name || 'proyek'
      }!` + (newItemsAdded > 0 ? ` (${newItemsAdded} barang baru didaftarkan ke katalog)` : '')
    );

    setShowLocationBulkModal(false);
    setLocationBulkFile(null);
    setLocationBulkParsedList([]);
  };

  // Handle Add Master Catalog Item
  const handleSaveMasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterForm.name.trim()) return;

    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      ...masterForm
    };

    onAddMasterItem(newItem);
    setShowAddMasterModal(false);
  };

  // ----------------------------------------------------
  // RECAP COMPUTATION (Daily Usage Filtered by Project/Category/Date)
  // ----------------------------------------------------
  const recapUsageLogs = useMemo(() => {
    return inventoryLogs.filter((log) => {
      if (log.type !== 'OUT') return false;
      if (recapProjectFilter !== 'ALL' && log.projectId !== recapProjectFilter) return false;

      const item = inventoryItems.find((i) => i.id === log.itemId);
      if (recapCategoryFilter !== 'ALL' && item?.category !== recapCategoryFilter) return false;

      // Date filter (assuming log.date starts with YYYY-MM-DD)
      const logDate = log.date.split(' ')[0];
      if (recapStartDate && logDate < recapStartDate) return false;
      if (recapEndDate && logDate > recapEndDate) return false;

      // Search query
      if (recapSearch.trim() !== '') {
        const q = recapSearch.toLowerCase();
        const itemName = item?.name.toLowerCase() || '';
        const itemCode = item?.code.toLowerCase() || '';
        const pic = log.pic.toLowerCase();
        const notes = log.notes.toLowerCase();
        return itemName.includes(q) || itemCode.includes(q) || pic.includes(q) || notes.includes(q);
      }

      return true;
    });
  }, [inventoryLogs, inventoryItems, recapProjectFilter, recapCategoryFilter, recapStartDate, recapEndDate, recapSearch]);

  const recapStats = useMemo(() => {
    let totalQty = 0;
    let totalEstimatedCost = 0;

    recapUsageLogs.forEach((log) => {
      const item = inventoryItems.find((i) => i.id === log.itemId);
      totalQty += log.quantity;
      totalEstimatedCost += log.quantity * (item?.unitPrice || 0);
    });

    return {
      totalTransactions: recapUsageLogs.length,
      totalQty,
      totalEstimatedCost
    };
  }, [recapUsageLogs, inventoryItems]);

  const handleDownloadUsagePDF = () => {
    generateInventoryUsagePDF({
      inventoryLogs,
      inventoryItems,
      projects,
      selectedProjectId: recapProjectFilter,
      startDate: recapStartDate,
      endDate: recapEndDate,
      categoryFilter: recapCategoryFilter
    });
  };

  const pendingRequestsCount = useMemo(() => {
    return materialRequests.filter((r) => r.status === 'PENDING').length;
  }, [materialRequests]);

  const activeProjectObj = projects.find((p) => p.id === activeProjectFilter);
  const recapProjectObj = projects.find((p) => p.id === recapProjectFilter);

  return (
    <div className="space-y-4">
      {/* Header & Site Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Smart Inventory & Chemical Tracker
                </h1>
                {criticalItemsCount > 0 && (
                  <span className="flex items-center space-x-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{criticalItemsCount} Item Kritis</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Pencatatan real-time penerimaan stok (Restock) dan pemakaian harian chemical / alat pembersih.
              </p>
            </div>
          </div>

          {/* Project Site Selector for Inventory */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
            <select
              id="inventory-project-select"
              value={activeProjectFilter}
              onChange={(e) => setActiveProjectFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-3"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  📍 {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            id="tab-stocks-btn"
            onClick={() => setActiveTab('stocks')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'stocks'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stok di Lokasi ({stockRows.length})</span>
          </button>

          {/* MATERIAL REQUEST (PERMINTAAN BARANG) TAB */}
          <button
            id="tab-requests-btn"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4 text-amber-400" />
            <span>Material Request (Permintaan Barang)</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                pendingRequestsCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {materialRequests.length}
            </span>
          </button>

          {/* REKAP PEMAKAIAN HARIAN TAB */}
          <button
            id="tab-recap-btn"
            onClick={() => setActiveTab('recap')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'recap'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Rekap Pemakaian Harian (PDF)</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
              {recapUsageLogs.length}
            </span>
          </button>

          <button
            id="tab-logs-btn"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Keluar / Masuk ({inventoryLogs.filter(l => l.projectId === activeProjectFilter).length})</span>
          </button>
          <button
            id="tab-catalog-btn"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Katalog Master Chemical & Alat</span>
          </button>
        </div>
      </div>

      {activeTab === 'stocks' ? (
        <>
          {/* Location Stock Header & Actions: Manual, Bulk Upload, Template */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Stok di Lokasi: <span className="text-amber-400">{activeProjectObj?.name}</span>
                </h3>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                  {activeProjectObj?.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Data stok lokasi dikelola mandiri secara manual atau upload masal spreadsheet (bebas & independen dari katalog master).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tambah Stok di Lokasi */}
              <button
                id="open-add-location-stock-btn"
                type="button"
                onClick={handleOpenAddLocationStock}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                title="Tambah data stok di lokasi (Dropdown Nama Barang, Kategori, Satuan, Qty & Otomatis Tambah Baris)"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Stok di Lokasi</span>
              </button>

              {/* Download Template Stok Lokasi (.xlsx) */}
              <button
                id="download-location-stock-template-btn"
                type="button"
                onClick={handleDownloadLocationStockTemplate}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                title="Download Template Excel Stok Lokasi (6 Kolom Terpisah: Kode, Nama, Kategori, Satuan, Min. Stok, Sisa Stok)"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download Template (.xlsx)</span>
              </button>

              {/* Upload Masal Stok Lokasi */}
              <button
                id="open-location-stock-bulk-btn"
                type="button"
                onClick={() => {
                  setShowLocationBulkModal(true);
                  setLocationBulkFile(null);
                  setLocationBulkParsedList([]);
                  setLocationBulkErrorMessage(null);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 hover:border-amber-500/50 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                title="Upload Masal Stok Lokasi dari File Excel / CSV"
              >
                <UploadCloud className="w-4 h-4 text-amber-400" />
                <span>Upload Masal Excel</span>
              </button>

              {/* Kosongkan Stok Lokasi */}
              {stockRows.length > 0 && (
                <button
                  id="clear-location-stock-btn"
                  type="button"
                  onClick={handleClearLocationStock}
                  className="flex items-center space-x-1 px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="Kosongkan seluruh data stok di lokasi ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>
          </div>

          {/* Low stock alert banner */}
          {criticalItemsCount > 0 && (
            <div className="bg-rose-950/40 border border-rose-500/30 p-4 rounded-2xl flex items-start space-x-3 text-xs text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300">Peringatan Batas Stok Rendah (Restock Needed)</div>
                <p className="text-slate-300 mt-0.5">
                  Terdapat <span className="font-bold text-rose-400">{criticalItemsCount} item</span> di lokasi{' '}
                  <span className="font-bold text-white">{activeProjectObj?.name}</span> yang berada di bawah batas minimum aman. Segera lakukan input permintaan restock dari gudang pusat.
                </p>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2 col-span-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="inventory-search-input"
                type="text"
                placeholder="Cari nama chemical, kode barang, fungsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2">
              <span className="text-xs text-slate-400 shrink-0">Kategori:</span>
              <select
                id="inventory-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Semua Kategori</option>
                <option value="Chemical" className="bg-slate-900">Chemical (Cairan Pembersih)</option>
                <option value="Equipment" className="bg-slate-900">Equipment (Alat Berat / Mesin)</option>
                <option value="Consumable" className="bg-slate-900">Consumable (Plastik / Lap)</option>
                <option value="Safety / APD" className="bg-slate-900">Safety / APD</option>
              </select>
            </div>
          </div>

          {/* Stocks Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Kode & Nama Barang</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5 text-center">Satuan</th>
                    <th className="p-3.5 text-center">Min. Stok</th>
                    <th className="p-3.5 text-center">Sisa Stok Saat Ini</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Aksi Cepat Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {stockRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                            <Package className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-white">Belum Ada Stok di Lokasi Ini</h4>
                          <p className="text-xs text-slate-400">
                            Stok di lokasi <span className="text-amber-400 font-semibold">{activeProjectObj?.name}</span> saat ini kosong (independen dari katalog master). Silakan input barang secara manual atau gunakan upload masal file Excel.
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={handleOpenAddLocationStock}
                              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>+ Tambah Stok di Lokasi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowLocationBulkModal(true);
                                setLocationBulkFile(null);
                                setLocationBulkParsedList([]);
                                setLocationBulkErrorMessage(null);
                              }}
                              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                              <UploadCloud className="w-4 h-4 text-amber-400" />
                              <span>Upload Masal Excel</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    stockRows.map(({ item, currentStock, isCritical, stockId }) => (
                      <tr
                        key={stockId || item.id}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isCritical ? 'bg-rose-950/20' : ''
                        }`}
                      >
                        {/* Item Name */}
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center space-x-2">
                            <span>{item.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            <span className="text-amber-400 font-mono">{item.code}</span>
                            <span className="mx-1">•</span>
                            <span>{item.description}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3.5">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700">
                            {item.category}
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="p-3.5 text-center font-medium text-slate-300">
                          {item.unit}
                        </td>

                        {/* Min Stock */}
                        <td className="p-3.5 text-center font-semibold text-slate-400">
                          {item.minStock} {item.unit}
                        </td>

                        {/* Current Stock (Clickable to Edit Manually) */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setManualStockModal({ item, currentStock });
                              setManualStockValue(currentStock);
                              setManualStockNotes(`Penyesuaian stok manual lokasi ${activeProjectObj?.name || ''}`);
                              setManualStockPic(userRole);
                            }}
                            title="Klik untuk isi / koreksi stok secara manual"
                            className={`group text-base font-black px-3 py-1 rounded-xl inline-flex items-center space-x-1.5 transition-all hover:scale-105 cursor-pointer ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm hover:bg-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            }`}
                          >
                            <span>{currentStock}</span>
                            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
                          </button>
                        </td>

                        {/* Status Badge */}
                        <td className="p-3.5 text-center">
                          {isCritical ? (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Stok Kritis</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aman / Normal</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons: Stock In, Usage & Manual Fill */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Manual Fill Button (Stok Lokasi Diisi Manual) */}
                            <button
                              id={`manual-stock-edit-btn-${item.id}`}
                              onClick={() => {
                                setManualStockModal({ item, currentStock });
                                setManualStockValue(currentStock);
                                setManualStockNotes(`Penyesuaian stok manual lokasi ${activeProjectObj?.name || ''}`);
                                setManualStockPic(userRole);
                              }}
                              title="Isi atau Koreksi Sisa Stok Fisik Secara Manual"
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/40 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Isi Manual</span>
                            </button>

                            {/* Stock IN */}
                            <button
                              id={`stock-in-btn-${item.id}`}
                              onClick={() => {
                                setStockActionModal({
                                  type: 'IN',
                                  item,
                                  currentStock
                                });
                                setActionForm({
                                  quantity: 1,
                                  pic: userRole,
                                  notes: `Penerimaan restock gudang pusat ${activeProjectObj?.name}`
                                });
                              }}
                              title="Penerimaan Barang Masuk (Restock)"
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm cursor-pointer"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>+ Masuk</span>
                            </button>

                            {/* Stock OUT (Usage) */}
                            <button
                              id={`stock-out-btn-${item.id}`}
                              onClick={() => {
                                setStockActionModal({
                                  type: 'OUT',
                                  item,
                                  currentStock
                                });
                                setActionForm({
                                  quantity: 1,
                                  pic: userRole,
                                  notes: 'Pemakaian harian operasional cleaning'
                                });
                              }}
                              title="Catat Pemakaian Harian"
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm cursor-pointer"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>- Pakai</span>
                            </button>

                            {/* Delete From Location */}
                            <button
                              id={`delete-stock-btn-${item.id}`}
                              onClick={() => handleDeleteStockItem(stockId, item.name)}
                              title="Hapus barang dari daftar stok lokasi ini"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'requests' ? (
        /* MATERIAL REQUEST TAB VIEW */
        <MaterialRequestTab
          projects={projects}
          inventoryItems={inventoryItems}
          projectStocks={projectStocks}
          inventoryLogs={inventoryLogs}
          materialRequests={materialRequests}
          currentUser={currentUser}
          users={users}
          companyProfile={companyProfile}
          selectedProjectId={activeProjectFilter}
          onUpdateMaterialRequests={onUpdateMaterialRequests || (() => {})}
          onUpdateStocks={onUpdateStocks}
          onAddLog={onAddLog}
          onUpdateUsers={onUpdateUsers}
        />
      ) : activeTab === 'recap' ? (
        /* ---------------------------------------------------- */
        /* TAB: REKAP PEMAKAIAN HARIAN DENGAN DOWNLOAD PDF */
        /* ---------------------------------------------------- */
        <div className="space-y-4">
          {/* Top Recap Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Rekap Pemakaian Harian Smart Inventory & Chemical</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Laporan resmi pemakaian bahan kimia & alat kerja harian. Dapat difilter per lokasi proyek atau konsolidasi seluruh gedung.
                </p>
              </div>

              {/* Direct PDF Download Button */}
              <button
                id="download-inventory-recap-pdf-btn"
                onClick={handleDownloadUsagePDF}
                className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Rekap (A4)</span>
              </button>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filter 1: Lokasi Proyek */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Filter Lokasi Proyek:
                </label>
                <select
                  id="recap-project-filter"
                  value={recapProjectFilter}
                  onChange={(e) => setRecapProjectFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-white">
                    🏢 Semua Lokasi Proyek (Konsolidasi Pusat)
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      📍 {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Kategori Item */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Kategori Chemical / Alat:
                </label>
                <select
                  id="recap-category-filter"
                  value={recapCategoryFilter}
                  onChange={(e) => setRecapCategoryFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">Semua Kategori</option>
                  <option value="Chemical" className="bg-slate-900">Chemical (Pembersih Cair)</option>
                  <option value="Equipment" className="bg-slate-900">Equipment (Alat Berat / Mesin)</option>
                  <option value="Consumable" className="bg-slate-900">Consumable (Plastik / Lap)</option>
                  <option value="Safety / APD" className="bg-slate-900">Safety / APD</option>
                </select>
              </div>

              {/* Filter 3: Rentang Tanggal Mulai */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tanggal Mulai:
                </label>
                <input
                  id="recap-start-date"
                  type="date"
                  value={recapStartDate}
                  onChange={(e) => setRecapStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Filter 4: Rentang Tanggal Selesai */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tanggal Selesai:
                </label>
                <input
                  id="recap-end-date"
                  type="date"
                  value={recapEndDate}
                  onChange={(e) => setRecapEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Keyword Search Bar for Recap */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                id="recap-search-input"
                type="text"
                placeholder="Cari nama chemical, PIC pengambil, atau area pembersihan..."
                value={recapSearch}
                onChange={(e) => setRecapSearch(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* 3 Executive Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Total Transaksi Pemakaian
              </span>
              <div className="text-2xl font-black text-white">
                {recapStats.totalTransactions}{' '}
                <span className="text-xs font-normal text-slate-400">Log Pengeluaran</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Periode {recapStartDate} s/d {recapEndDate}
              </div>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider block">
                Total Volume / Kuantitas Terpakai
              </span>
              <div className="text-2xl font-black text-emerald-400">
                {recapStats.totalQty}{' '}
                <span className="text-xs font-normal text-slate-400">Unit / Jerigen / Pcs</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Lokasi: {recapProjectFilter === 'ALL' ? 'Semua Gedung (5 Proyek)' : recapProjectObj?.name}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Estimasi Biaya Nilai Chemical
              </span>
              <div className="text-2xl font-black text-amber-400 truncate">
                {formatCurrency(recapStats.totalEstimatedCost)}
              </div>
              <div className="text-[11px] text-slate-500">
                Berdasarkan harga satuan master barang
              </div>
            </div>
          </div>

          {/* Detailed Usage Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">
                  Daftar Rincian Pemakaian Harian (Log OUT)
                </h4>
                <p className="text-xs text-slate-400">
                  Menampilkan {recapUsageLogs.length} catatan pemakaian chemical & alat
                </p>
              </div>
              <button
                onClick={handleDownloadUsagePDF}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan PDF A4</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3">Tanggal & Waktu</th>
                    <th className="py-3 px-3">Lokasi Proyek</th>
                    <th className="py-3 px-3">Chemical / Alat</th>
                    <th className="py-3 px-3 text-center">Kategori</th>
                    <th className="py-3 px-3 text-center">Qty Pakai</th>
                    <th className="py-3 px-3 text-center">Sisa Stok</th>
                    <th className="py-3 px-3 text-right">Nilai Biaya</th>
                    <th className="py-3 px-3">Petugas PIC</th>
                    <th className="py-3 px-4">Area & Keperluan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recapUsageLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        <div className="space-y-2">
                          <Package className="w-8 h-8 text-slate-600 mx-auto" />
                          <div className="font-bold text-slate-400">Tidak ada data pemakaian untuk filter ini.</div>
                          <p className="text-[11px] text-slate-500">
                            Coba ubah rentang tanggal atau pilih lokasi proyek lain.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recapUsageLogs.map((log, index) => {
                      const item = inventoryItems.find((i) => i.id === log.itemId);
                      const proj = projects.find((p) => p.id === log.projectId);
                      const lineCost = log.quantity * (item?.unitPrice || 0);

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300">
                            {log.date}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-xs">{proj?.name || '-'}</div>
                            <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.2 rounded">
                              {proj?.code}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-200">{item?.name || log.itemId}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item?.code}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700">
                              {item?.category || 'Chemical'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              -{log.quantity} {item?.unit || 'Unit'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-amber-400">
                            {log.newStock} {item?.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">
                            {formatCurrency(lineCost)}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-medium">
                            {log.pic}
                          </td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                            {log.notes}
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
      ) : activeTab === 'logs' ? (
        /* Inventory Logs Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">
                Log Audit Keluar-Masuk Barang ({activeProjectObj?.name})
              </h3>
              <p className="text-xs text-slate-400">
                Pencatatan transparan untuk mencegah kebocoran logistik dan bahan kimia di lokasi proyek.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-800 text-xs">
            {inventoryLogs.filter((l) => l.projectId === activeProjectFilter).length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Belum ada catatan transaksi stok pada lokasi ini.
              </div>
            ) : (
              inventoryLogs
                .filter((l) => l.projectId === activeProjectFilter)
                .map((log) => {
                  const item = inventoryItems.find((i) => i.id === log.itemId);
                  const isIN = log.type === 'IN';

                  return (
                    <div key={log.id} className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-xl text-white font-bold ${
                            isIN ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        >
                          {isIN ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm">{item?.name || 'Item'}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isIN
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              }`}
                            >
                              {isIN ? `+${log.quantity} ${item?.unit || ''} MASUK` : `-${log.quantity} ${item?.unit || ''} PAKAI`}
                            </span>
                          </div>

                          <p className="text-slate-300 text-xs mt-1">"{log.notes}"</p>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                            <span>Stok Awal: <b className="text-slate-300">{log.previousStock}</b></span>
                            <span>➔</span>
                            <span>Sisa Stok: <b className="text-amber-400">{log.newStock}</b></span>
                            <span>•</span>
                            <span>PIC: <b className="text-slate-300">{log.pic}</b></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-slate-400 text-[11px] shrink-0">
                        {log.date}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      ) : (
        /* Master Catalog Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">Katalog Master Chemical, Alat & APD</h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded-full text-xs font-black font-mono">
                  {inventoryItems.length} Item
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Daftar standarisasi bahan kimia pembersih, alat operasional, dan perlengkapan safety PT Rajawali.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Template Download Group */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 space-x-1">
                <button
                  id="btn-download-inv-template-xlsx"
                  onClick={handleDownloadTemplateXLSX}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-black text-xs rounded-lg border border-emerald-300 transition cursor-pointer"
                  title="Unduh Template Excel (.xlsx) dengan kolom terpisah A-H"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-950" />
                  <span>Template Excel (.xlsx)</span>
                </button>
                <button
                  id="btn-download-inv-template-csv"
                  onClick={() => handleDownloadTemplateCSVDelimited(';')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                  title="Unduh Template CSV (Titik Koma ';' - Standar Excel Indonesia)"
                >
                  <Download className="w-3 h-3 text-slate-400" />
                  <span>CSV (;)</span>
                </button>
              </div>

              {/* Export Master Items */}
              <button
                id="btn-export-master-inventory"
                onClick={handleExportMasterToXLSX}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                title="Export seluruh katalog master barang ke format Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Export Master (.xlsx)</span>
              </button>

              {/* Bulk Upload Button */}
              <button
                id="btn-open-bulk-upload-inventory"
                onClick={() => {
                  setShowBulkModal(true);
                  setBulkFile(null);
                  setBulkParsedList([]);
                  setBulkErrorMessage(null);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-950 font-black text-xs rounded-xl border border-blue-300 shadow-sm transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-950" />
                <span>Upload Massal (Excel / CSV)</span>
              </button>

              {/* Single Master Add */}
              <button
                id="add-master-item-btn"
                onClick={() => setShowAddMasterModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Master</span>
              </button>
            </div>
          </div>

          {/* Tampilan Baris Katalog Master Barang (Tanpa Nilai Harga) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 text-center w-12">No</th>
                    <th className="p-3.5 w-32">Kode Barang</th>
                    <th className="p-3.5">Nama Barang Master</th>
                    <th className="p-3.5 w-36">Kategori</th>
                    <th className="p-3.5 text-center w-28">Satuan</th>
                    <th className="p-3.5 text-center w-32">Min. Stok Aman</th>
                    <th className="p-3.5">Deskripsi & Spesifikasi Operasional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {inventoryItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-mono text-amber-400 font-bold">{item.code}</td>
                      <td className="p-3.5 font-bold text-white text-sm">{item.name}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-medium text-slate-300">{item.unit}</td>
                      <td className="p-3.5 text-center font-bold text-rose-400">{item.minStock} {item.unit}</td>
                      <td className="p-3.5 text-slate-300 max-w-sm">{item.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock IN / OUT Action Modal */}
      {stockActionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>{stockActionModal.type === 'IN' ? '📥 Barang Masuk / Restock' : '📤 Catat Pemakaian Harian'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {stockActionModal.item.name} ({activeProjectObj?.name})
                </p>
              </div>
              <button
                onClick={() => setStockActionModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteStockAction} className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span className="text-slate-400">Sisa Stok Saat Ini:</span>
                <span className="font-bold text-white">
                  {stockActionModal.currentStock} {stockActionModal.item.unit}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Jumlah ({stockActionModal.item.unit}):
                </label>
                <input
                  id="stock-qty-input"
                  type="number"
                  min="1"
                  max={stockActionModal.type === 'OUT' ? stockActionModal.currentStock : 9999}
                  required
                  value={actionForm.quantity}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, quantity: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Petugas / Penanggung Jawab (PIC):
                </label>
                <input
                  id="stock-pic-input"
                  type="text"
                  required
                  value={actionForm.pic}
                  onChange={(e) => setActionForm({ ...actionForm, pic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Nama Admin / Supervisor"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Catatan / Keterangan (No Surat Jalan / Area Penggunaan):
                </label>
                <textarea
                  id="stock-notes-input"
                  rows={2}
                  value={actionForm.notes}
                  onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  placeholder={
                    stockActionModal.type === 'IN'
                      ? 'No Surat Jalan atau tanggal kirim dari pusat...'
                      : 'Area pembersihan (misal: deep sanitasi toilet food court)...'
                  }
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockActionModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="save-stock-action-btn"
                  type="submit"
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-lg ${
                    stockActionModal.type === 'IN'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                  }`}
                >
                  {stockActionModal.type === 'IN' ? 'Konfirmasi Restock Masuk' : 'Konfirmasi Pemakaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Master Item Modal */}
      {showAddMasterModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Tambah Master Barang Baru</h3>
              <button
                onClick={() => setShowAddMasterModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMasterItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Barang:</label>
                <input
                  id="master-item-name"
                  type="text"
                  required
                  value={masterForm.name}
                  onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                  placeholder="Contoh: Marble Polishing Powder"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode:</label>
                  <input
                    id="master-item-code"
                    type="text"
                    required
                    value={masterForm.code}
                    onChange={(e) => setMasterForm({ ...masterForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori:</label>
                  <select
                    id="master-item-category"
                    value={masterForm.category}
                    onChange={(e) =>
                      setMasterForm({ ...masterForm, category: e.target.value as InventoryCategory })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Chemical">Chemical</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Consumable">Consumable</option>
                    <option value="Safety / APD">Safety / APD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Satuan:</label>
                  <input
                    id="master-item-unit"
                    type="text"
                    required
                    value={masterForm.unit}
                    onChange={(e) => setMasterForm({ ...masterForm, unit: e.target.value })}
                    placeholder="Jerigen 5L / Pcs / Unit"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Batas Min. Stok:</label>
                  <input
                    id="master-item-minstock"
                    type="number"
                    min="1"
                    required
                    value={masterForm.minStock}
                    onChange={(e) =>
                      setMasterForm({ ...masterForm, minStock: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Keterangan / Fungsi:</label>
                <textarea
                  id="master-item-desc"
                  rows={2}
                  value={masterForm.description}
                  onChange={(e) => setMasterForm({ ...masterForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  placeholder="Deskripsi bahan dan penggunaan..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMasterModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="save-master-item-submit"
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Simpan Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal for Master Items */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Upload Massal Master Barang (Excel .xlsx / CSV)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-normal">
                      Multi-Format
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Impor data master chemical, peralatan, consumable, dan APD dalam jumlah besar sekaligus dengan kolom terpisah.
                  </p>
                </div>
              </div>
              <button
                id="btn-close-bulk-inventory-modal"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Step 1: Download Template */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                      1
                    </span>
                    <span>Unduh Template Format Resmi (Kolom Terpisah A - H)</span>
                  </div>

                  {/* Template download buttons */}
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <button
                      id="bulk-modal-download-xlsx-btn"
                      onClick={handleDownloadTemplateXLSX}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm transition cursor-pointer text-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Template Excel (.xlsx)</span>
                    </button>
                    <button
                      id="bulk-modal-download-csv-semicolon-btn"
                      onClick={() => handleDownloadTemplateCSVDelimited(';')}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition cursor-pointer text-[11px]"
                      title="Format titik koma (;) standar Excel regional Indonesia"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>CSV (Titik Koma ';')</span>
                    </button>
                    <button
                      id="bulk-modal-download-csv-comma-btn"
                      onClick={() => handleDownloadTemplateCSVDelimited(',')}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition cursor-pointer text-[11px]"
                      title="Format koma (,) standar internasional"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>CSV (Koma ',')</span>
                    </button>
                  </div>
                </div>

                {/* Column Mapping Legend */}
                <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] text-slate-300">
                  <div className="font-semibold text-slate-200 mb-1.5 flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Struktur Kolom Template:</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10.5px]">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom A:</b> Kode Barang <br />
                      <span className="text-slate-400">(Cth: CHM-101, TLS-201)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom B:</b> Nama Barang <br />
                      <span className="text-slate-400">(Wajib diisi)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom C:</b> Kategori <br />
                      <span className="text-slate-400">(Chemical/Tools/Safety)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom D:</b> Satuan <br />
                      <span className="text-slate-400">(Jerigen 5L / Pcs / Unit)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom E:</b> Min. Stok <br />
                      <span className="text-slate-400">(Angka batas kritis)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom F:</b> Harga Satuan <br />
                      <span className="text-slate-400">(Angka Rupiah, cth: 75000)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom G:</b> Deskripsi <br />
                      <span className="text-slate-400">(Fungsi pemakaian)</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <b className="text-amber-400">Kolom H:</b> Stok Awal <br />
                      <span className="text-slate-400">(Saldo awal per lokasi)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Upload File */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px]">
                    2
                  </span>
                  <span>Pilih atau Tarik File Spreadsheet (.xlsx, .xls, .csv)</span>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleBulkFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, text/csv, text/plain, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBulkFileSelected(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="p-3 bg-slate-900 group-hover:bg-amber-500/10 rounded-full border border-slate-800 group-hover:border-amber-500/30 text-slate-400 group-hover:text-amber-400 transition">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {bulkFile ? bulkFile.name : 'Klik untuk pilih file atau tarik file ke area ini'}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV dengan auto-detect separator
                    </p>
                  </div>
                  {bulkFile && (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-mono font-semibold">
                      {(bulkFile.size / 1024).toFixed(1)} KB • Terpilih
                    </span>
                  )}
                </div>

                {isBulkLoading && (
                  <div className="flex items-center justify-center space-x-2 py-4 text-amber-400">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-semibold">Membaca dan memvalidasi baris data file...</span>
                  </div>
                )}

                {bulkErrorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{bulkErrorMessage}</span>
                  </div>
                )}
              </div>

              {/* Step 3: Parsed Data Preview & Options */}
              {bulkParsedList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                          3
                        </span>
                        <span>Pratinjau Data ({bulkParsedList.length} Baris Terdeteksi)</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold">
                        {bulkParsedList.filter((p) => p.isValid).length} Valid
                      </span>
                      {bulkParsedList.filter((p) => !p.isValid).length > 0 && (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[11px] font-bold">
                          {bulkParsedList.filter((p) => !p.isValid).length} Perlu Dicek
                        </span>
                      )}
                    </div>

                    {/* Import Mode Options */}
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="importMode"
                          checked={bulkImportMode === 'append'}
                          onChange={() => setBulkImportMode('append')}
                          className="accent-amber-500"
                        />
                        <span>Tambah / Update (Append)</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="importMode"
                          checked={bulkImportMode === 'replace'}
                          onChange={() => setBulkImportMode('replace')}
                          className="accent-amber-500"
                        />
                        <span className="text-amber-400 font-medium">Ganti Total (Replace)</span>
                      </label>
                    </div>
                  </div>

                  {/* Stock Initialization Checkbox */}
                  <div className="flex items-center space-x-2 px-1 text-slate-300">
                    <input
                      id="init-project-stock-check"
                      type="checkbox"
                      checked={bulkInitStockForProjects}
                      onChange={(e) => setBulkInitStockForProjects(e.target.checked)}
                      className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                    />
                    <label htmlFor="init-project-stock-check" className="cursor-pointer">
                      Otomatis inisialisasi <b>Stok Awal</b> (Kolom H) ke seluruh lokasi gedung proyek aktif ({projects.length} Lokasi Proyek).
                    </label>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Kode</th>
                          <th className="p-2.5">Nama Barang</th>
                          <th className="p-2.5">Kategori</th>
                          <th className="p-2.5">Satuan</th>
                          <th className="p-2.5 text-center">Min. Stok</th>
                          <th className="p-2.5 text-right">Harga Satuan</th>
                          <th className="p-2.5 text-center">Stok Awal</th>
                          <th className="p-2.5">Catatan / Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                        {bulkParsedList.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-slate-800/30' : 'bg-rose-950/20'}>
                            <td className="p-2.5">
                              {row.isValid ? (
                                <span className="flex items-center text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                                  OK
                                </span>
                              ) : (
                                <span className="flex items-center text-rose-400 font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                                  Error
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-amber-400 font-bold">{row.item.code}</td>
                            <td className="p-2.5 text-white font-medium">{row.item.name}</td>
                            <td className="p-2.5">
                              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700">
                                {row.item.category}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300">{row.item.unit}</td>
                            <td className="p-2.5 text-center text-rose-400 font-bold">{row.item.minStock}</td>
                            <td className="p-2.5 text-right font-mono text-amber-300">
                              {formatCurrency(row.item.unitPrice)}
                            </td>
                            <td className="p-2.5 text-center font-bold text-emerald-400">
                              {row.initialStock}
                            </td>
                            <td className="p-2.5 text-slate-400 max-w-xs truncate">
                              {row.notes || (row.isValid ? 'Siap di-import' : 'Data tidak lengkap')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
              <span className="text-slate-400 text-xs">
                {bulkParsedList.length > 0
                  ? `${bulkParsedList.filter((p) => p.isValid).length} dari ${bulkParsedList.length} baris siap disimpan.`
                  : 'Silakan pilih file Excel / CSV terlebih dahulu.'}
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="execute-bulk-inventory-import-btn"
                  type="button"
                  disabled={bulkParsedList.filter((p) => p.isValid).length === 0 || isBulkLoading}
                  onClick={handleExecuteBulkImport}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>
                    Import {bulkParsedList.filter((p) => p.isValid).length} Master Barang
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ISI & KOREKSI STOK MANUAL LOKASI                                 */}
      {/* ========================================================================= */}
      {manualStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Isi & Koreksi Sisa Stok Manual</h3>
                  <p className="text-xs text-slate-400">
                    Lokasi: <span className="text-amber-400 font-semibold">{activeProjectObj?.name}</span> ({activeProjectObj?.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualStockModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveManualStock} className="p-5 space-y-4">
              {/* Item Info Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {manualStockModal.item.code}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {manualStockModal.item.category}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{manualStockModal.item.name}</h4>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Satuan:</span>
                    <p className="text-slate-200 font-medium">{manualStockModal.item.unit}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Min. Stok Aman:</span>
                    <p className="text-rose-400 font-bold">{manualStockModal.item.minStock} {manualStockModal.item.unit}</p>
                  </div>
                </div>
              </div>

              {/* Current vs New Stock Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Stok Tercatat Sistem:</span>
                  <div className="text-2xl font-black text-slate-300">
                    {manualStockModal.currentStock}{' '}
                    <span className="text-xs font-normal text-slate-500">{manualStockModal.item.unit}</span>
                  </div>
                </div>

                <div className="bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/30">
                  <label className="text-[11px] text-amber-300 font-bold block mb-1">
                    Sisa Stok Fisik Saat Ini: *
                  </label>
                  <input
                    id="manual-stock-input-field"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={manualStockValue}
                    onChange={(e) => setManualStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-lg font-black text-white focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Live Difference Badge */}
              <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-950 text-xs border border-slate-800">
                <span className="text-slate-400">Selisih Penyesuaian (Fisik - Sistem):</span>
                {manualStockValue - manualStockModal.currentStock > 0 ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>+{manualStockValue - manualStockModal.currentStock} {manualStockModal.item.unit} (Penambahan)</span>
                  </span>
                ) : manualStockValue - manualStockModal.currentStock < 0 ? (
                  <span className="text-rose-400 font-bold flex items-center space-x-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{manualStockValue - manualStockModal.currentStock} {manualStockModal.item.unit} (Pengurangan)</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">0 (Tidak ada perubahan)</span>
                )}
              </div>

              {/* PIC Input */}
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Penanggung Jawab (PIC / Supervisor Site):
                </label>
                <input
                  type="text"
                  value={manualStockPic}
                  onChange={(e) => setManualStockPic(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Supervisor Site"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Alasan / Keterangan Opname Fisik:
                </label>
                <textarea
                  rows={2}
                  value={manualStockNotes}
                  onChange={(e) => setManualStockNotes(e.target.value)}
                  placeholder="Contoh: Hasil stock opname fisik rutin akhir pekan / Penyesuaian barang terpakai"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setManualStockModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="save-manual-stock-btn"
                  type="submit"
                  className="flex items-center space-x-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Sisa Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD MASAL SISA STOK LOKASI (EXCEL 6 KOLOM TERPISAH)           */}
      {/* ========================================================================= */}
      {showLocationBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Upload Masal Sisa Stok Lokasi</h3>
                  <p className="text-xs text-slate-400">
                    Target Lokasi Proyek: <span className="text-amber-400 font-bold">{activeProjectObj?.name}</span> ({activeProjectObj?.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationBulkModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Step 1: Download Official 6-Column Template Banner */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Format Template Resmi Stok Lokasi (6 Kolom Terpisah)</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    Template Excel (.xlsx) dibuat dengan <b>masing-masing kolom terpisah</b> (bukan 1 kolom dipisah koma):
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono shadow-xs">
                      Kolom A: Kode Barang
                    </span>
                    <span className="bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono shadow-xs">
                      Kolom B: Nama Barang
                    </span>
                    <span className="bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono shadow-xs">
                      Kolom C: Kategori
                    </span>
                    <span className="bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono shadow-xs">
                      Kolom D: Satuan
                    </span>
                    <span className="bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono shadow-xs">
                      Kolom E: Min. Stok
                    </span>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      Kolom F: Sisa Stok Saat Ini
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadLocationStockTemplate}
                  className="shrink-0 flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Upload Zone */}
              <div
                onClick={() => locationFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={locationFileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLocationBulkFileSelected(f);
                  }}
                />
                <UploadCloud className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <div className="font-bold text-white text-sm">
                  {locationBulkFile ? locationBulkFile.name : 'Pilih atau Tarik File Spreadsheet / Excel ke Sini'}
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Format yang didukung: <span className="text-amber-400 font-semibold">.xlsx</span>, .xls, .csv (Ukuran maks. 10MB)
                </p>
                {locationBulkFile && (
                  <span className="inline-block mt-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    File Terpilih: {(locationBulkFile.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              {/* Loading State */}
              {isLocationBulkLoading && (
                <div className="p-6 text-center text-slate-400">
                  <div className="inline-block w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p>Membaca dan memetakan data kolom file Excel...</p>
                </div>
              )}

              {/* Error State */}
              {locationBulkErrorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{locationBulkErrorMessage}</span>
                </div>
              )}

              {/* Step 3: Parsed Results Preview & Confirmation */}
              {locationBulkParsedList.length > 0 && (
                <div className="space-y-3">
                  {/* Summary Bar */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-white">
                        {locationBulkParsedList.length} Baris Terbaca
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold">
                        {locationBulkParsedList.filter((r) => r.status !== 'INVALID').length} Siap Diupdate
                      </span>
                      {locationBulkParsedList.filter((r) => r.status === 'NEW').length > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold">
                          {locationBulkParsedList.filter((r) => r.status === 'NEW').length} Item Baru
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 text-xs">PIC:</span>
                      <input
                        type="text"
                        value={locationBulkPic}
                        onChange={(e) => setLocationBulkPic(e.target.value)}
                        placeholder="Nama PIC / Admin"
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 text-center">No</th>
                          <th className="p-2.5">Kode Barang</th>
                          <th className="p-2.5">Nama Barang</th>
                          <th className="p-2.5">Kategori</th>
                          <th className="p-2.5 text-center">Satuan</th>
                          <th className="p-2.5 text-center">Min. Stok</th>
                          <th className="p-2.5 text-center">Stok Sistem</th>
                          <th className="p-2.5 text-center bg-amber-500/10 text-amber-300">Sisa Stok Fisik (Baru)</th>
                          <th className="p-2.5 text-center">Selisih</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                        {locationBulkParsedList.map((row, idx) => (
                          <tr key={idx} className={row.status === 'INVALID' ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'}>
                            <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-amber-400 font-bold">{row.code}</td>
                            <td className="p-2.5 text-white font-medium">{row.name}</td>
                            <td className="p-2.5">
                              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700">
                                {row.category}
                              </span>
                            </td>
                            <td className="p-2.5 text-center text-slate-300">{row.unit}</td>
                            <td className="p-2.5 text-center text-rose-400 font-bold">{row.minStock}</td>
                            <td className="p-2.5 text-center text-slate-400 font-medium">
                              {row.currentStockInSystem}
                            </td>
                            <td className="p-2.5 text-center font-black text-amber-300 bg-amber-500/5">
                              {row.newStock}
                            </td>
                            <td className="p-2.5 text-center font-bold">
                              {row.difference > 0 ? (
                                <span className="text-emerald-400">+{row.difference}</span>
                              ) : row.difference < 0 ? (
                                <span className="text-rose-400">{row.difference}</span>
                              ) : (
                                <span className="text-slate-500">0</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {row.status === 'OK' ? (
                                <span className="text-emerald-400 font-semibold flex items-center">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Cocok
                                </span>
                              ) : row.status === 'NEW' ? (
                                <span className="text-amber-400 font-semibold flex items-center">
                                  <Sparkles className="w-3 h-3 mr-1" /> Item Baru
                                </span>
                              ) : (
                                <span className="text-rose-400 font-semibold flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/70">
              <span className="text-slate-400 text-xs">
                {locationBulkParsedList.length > 0
                  ? `${locationBulkParsedList.filter((r) => r.status !== 'INVALID').length} dari ${locationBulkParsedList.length} item siap diperbarui ke ${activeProjectObj?.name}.`
                  : 'Unduh template resmi lalu unggah untuk pembaruan stok masal.'}
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLocationBulkModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="execute-location-bulk-stock-btn"
                  type="button"
                  disabled={
                    locationBulkParsedList.filter((r) => r.status !== 'INVALID').length === 0 ||
                    isLocationBulkLoading
                  }
                  onClick={handleExecuteLocationBulkImport}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Terapkan Pembaruan {locationBulkParsedList.filter((r) => r.status !== 'INVALID').length} Stok
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Stok di Lokasi (Ketik Manual Nama Barang, Kategori, Satuan, Qty & Tambah Baris) */}
      {showAddLocationStockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Datalist for Autocomplete Suggestions */}
            <datalist id="datalist-master-item-names">
              {masterItemNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <datalist id="datalist-master-units">
              {masterUnits.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Tambah Stok di Lokasi
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ketik nama barang secara manual atau pilih dari saran. Jika barang baru, sistem otomatis menambahkannya ke master katalog dan stok lokasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLocationStockModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveAddStockRows} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Target Location Selector */}
                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-slate-300">Lokasi / Proyek Penempatan Stok:</span>
                      <p className="text-[11px] text-slate-500">Pilih proyek/gedung yang akan menerima penambahan stok ini</p>
                    </div>
                  </div>
                  <select
                    id="select-target-project-stock"
                    value={targetLocationProjectId}
                    onChange={(e) => {
                      setTargetLocationProjectId(e.target.value);
                      const selectedP = projects.find((p) => p.id === e.target.value);
                      if (selectedP) {
                        setAddStockNotes(`Input stok barang lokasi ${selectedP.name}`);
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white font-normal">
                        {p.name} ({p.code || 'SITE'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Table of items to add */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3 w-2/5">Nama Barang (Ketik Manual) <span className="text-rose-400">*</span></th>
                        <th className="p-3 w-1/4">Kategori</th>
                        <th className="p-3 w-1/5">Satuan</th>
                        <th className="p-3 w-28 text-center">Qty <span className="text-rose-400">*</span></th>
                        <th className="p-3 w-12 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {addStockRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>

                          {/* Input Nama Barang (Ketik Manual dengan Datalist Rekomendasi) */}
                          <td className="p-2.5">
                            <input
                              id={`input-add-stock-name-${idx}`}
                              type="text"
                              list="datalist-master-item-names"
                              value={row.itemName}
                              onChange={(e) => handleAddStockRowNameChange(idx, e.target.value)}
                              placeholder="Ketik nama barang..."
                              autoComplete="off"
                              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-medium focus:outline-none placeholder:text-slate-500"
                            />
                          </td>

                          {/* Dropdown Kategori */}
                          <td className="p-2.5">
                            <select
                              id={`dropdown-add-stock-category-${idx}`}
                              value={row.category}
                              onChange={(e) => handleAddStockRowCategoryChange(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none cursor-pointer"
                            >
                              {masterCategories.map((cat) => (
                                <option key={cat} value={cat} className="bg-slate-900 text-white">
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Satuan (Bisa Pilih / Ketik Manual via Datalist) */}
                          <td className="p-2.5">
                            <input
                              id={`input-add-stock-unit-${idx}`}
                              type="text"
                              list="datalist-master-units"
                              value={row.unit}
                              onChange={(e) => handleAddStockRowUnitChange(idx, e.target.value)}
                              placeholder="Satuan (Pcs, Box, dll)"
                              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none placeholder:text-slate-500"
                            />
                          </td>

                          {/* Input Qty */}
                          <td className="p-2.5 text-center">
                            <input
                              id={`input-add-stock-qty-${idx}`}
                              type="number"
                              min="1"
                              max="99999"
                              value={row.qty}
                              onChange={(e) => handleAddStockRowQtyChange(idx, e.target.value)}
                              placeholder="1"
                              className="w-full text-center bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none"
                            />
                          </td>

                          {/* Delete Row Button */}
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveAddStockRow(idx)}
                              disabled={addStockRows.length === 1 && idx === 0 && row.itemName === ''}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quick Add Baris Manual & Guide */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-add-stock-row-manual"
                    onClick={handleAddNewRowManually}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Baris Baru</span>
                  </button>
                  <span className="text-[11px] text-slate-400 italic">
                    * Ketik nama barang secara manual. Klik "+ Tambah Baris Baru" untuk menginput beberapa barang sekaligus.
                  </span>
                </div>

                {/* Metadata: PIC & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Petugas / Penanggung Jawab (PIC):
                    </label>
                    <input
                      type="text"
                      value={addStockPic}
                      onChange={(e) => setAddStockPic(e.target.value)}
                      required
                      placeholder="Nama petugas / supervisor..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Catatan / Keterangan Penambahan:
                    </label>
                    <input
                      type="text"
                      value={addStockNotes}
                      onChange={(e) => setAddStockNotes(e.target.value)}
                      placeholder="Contoh: Stok awal fisik di lokasi, pengadaan lokal..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {addStockRows.filter((r) => r.itemName && r.itemName.trim() !== '' && Number(r.qty) > 0).length} barang valid siap disimpan ke lokasi
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLocationStockModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    id="submit-add-location-stock-btn"
                    type="submit"
                    className="flex items-center space-x-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan ke Stok Lokasi</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
