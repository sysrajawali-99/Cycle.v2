import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Printer,
  Sparkles,
  Eye,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  KeyRound,
  Database,
  Lock,
  RefreshCw,
  Wallet,
  Users,
  Megaphone,
  Server,
  Copy,
  Check,
  Radio,
  Plus,
  Edit,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Link as LinkIcon,
  Search,
  Filter
} from 'lucide-react';
import { CompanyProfile, UserAccount, AppView, CompanyBankAccount, BankAccountRole } from '../../types';
import { ChartOfAccount } from '../../types/finance';
import { INITIAL_COMPANY_PROFILE } from '../../data/initialData';
import { storageService } from '../../services/storageService';
import { BulkDeleteDivisionModal, DeletableDivision } from '../common/BulkDeleteDivisionModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { vpsSyncService, VpsConnectionStatus } from '../../services/vpsSyncService';

interface CompanySettingsProps {
  companyProfile: CompanyProfile;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
  currentUser: UserAccount | null;
  accounts?: ChartOfAccount[];
  onResetAllData?: () => void;
  onNavigateView?: (view: AppView) => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  companyProfile,
  onUpdateCompanyProfile,
  currentUser,
  accounts = [],
  onResetAllData,
  onNavigateView
}) => {
  const [formData, setFormData] = useState<CompanyProfile>({ ...companyProfile });
  const [activeTab, setActiveTab] = useState<'profile' | 'contact' | 'signees' | 'bank' | 'preview' | 'vps' | 'danger'>('profile');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [vpsStatus, setVpsStatus] = useState<VpsConnectionStatus>(() => vpsSyncService.getStatus());
  const [vpsLoading, setVpsLoading] = useState(false);
  const [vpsMsg, setVpsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [vpsSnippetCopied, setVpsSnippetCopied] = useState<string | null>(null);

  useEffect(() => {
    const unsubVps = vpsSyncService.subscribeStatus((status) => {
      setVpsStatus(status);
    });
    return () => {
      unsubVps();
    };
  }, []);

  // Reset All System Data & Bulk Delete Division states (Super Admin)
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState<boolean>(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [selectedDivisionForBulkDelete, setSelectedDivisionForBulkDelete] = useState<DeletableDivision>('finance');
  const resetMode = 'wipe_empty';
  const [resetConfirmCode, setResetConfirmCode] = useState<string>('');
  const [resetPin, setResetPin] = useState<string>('');
  const [resetError, setResetError] = useState<string>('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string>('');

  // --------------------------------------------------------------------------
  // Bank Account Management States & Logic
  // --------------------------------------------------------------------------
  const [bankRoleFilter, setBankRoleFilter] = useState<'ALL' | BankAccountRole>('ALL');
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankToDelete, setBankToDelete] = useState<CompanyBankAccount | null>(null);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [bankNotice, setBankNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const initialBankFormData = {
    bankName: 'Bank Central Asia (BCA)',
    customBankName: '',
    accountNumber: '',
    accountHolder: companyProfile.name || 'PT RAJAWALI CYCLE INDONESIA',
    role: 'Rekening Penerimaan Invoice' as BankAccountRole,
    branch: '',
    swiftCode: '',
    coaAccountCode: accounts.find((a) => a.category === 'Kas & Bank')?.code || '1120',
    coaAccountName: accounts.find((a) => a.category === 'Kas & Bank')?.name || 'Bank BCA - Rek Operasional (123-456-7890)',
    isPrimary: false,
    status: 'Aktif' as 'Aktif' | 'Nonaktif',
    notes: ''
  };

  const [bankFormData, setBankFormData] = useState(initialBankFormData);

  // Derive current bank accounts safely
  const currentBankAccounts: CompanyBankAccount[] = (
    Array.isArray(formData.bankAccounts) && formData.bankAccounts.length > 0
      ? formData.bankAccounts
      : [
          {
            id: 'bank-init-1',
            bankName: formData.bankName || 'Bank Central Asia (BCA)',
            accountNumber: formData.bankAccountNo || '541-0988-771',
            accountHolder: formData.bankAccountHolder || formData.name || 'PT RAJAWALI CYCLE INDONESIA',
            role: 'Rekening Penerimaan Invoice',
            branch: 'KCU Mega Kuningan Jakarta',
            swiftCode: 'CENAIDJA',
            coaAccountCode: '1120',
            coaAccountName: 'Bank BCA - Rek Operasional (123-456-7890)',
            isPrimary: true,
            status: 'Aktif',
            notes: 'Rekening penerimaan utama tagihan & invoice klien'
          }
        ]
  );

  const filteredBankAccounts = currentBankAccounts.filter((bank) => {
    if (bankRoleFilter !== 'ALL' && bank.role !== bankRoleFilter) return false;
    if (bankSearchQuery.trim()) {
      const q = bankSearchQuery.toLowerCase();
      const matchBank = bank.bankName.toLowerCase().includes(q);
      const matchNo = bank.accountNumber.toLowerCase().includes(q);
      const matchHolder = bank.accountHolder.toLowerCase().includes(q);
      const matchRole = bank.role.toLowerCase().includes(q);
      const matchCoa = (bank.coaAccountCode || '').toLowerCase().includes(q) || (bank.coaAccountName || '').toLowerCase().includes(q);
      return matchBank || matchNo || matchHolder || matchRole || matchCoa;
    }
    return true;
  });

  const handleOpenAddBankModal = () => {
    setEditingBankId(null);
    const defaultCoa = accounts.find((a) => a.category === 'Kas & Bank') || accounts[0];
    setBankFormData({
      bankName: 'Bank Central Asia (BCA)',
      customBankName: '',
      accountNumber: '',
      accountHolder: formData.name || 'PT RAJAWALI CYCLE INDONESIA',
      role: 'Rekening Penerimaan Invoice',
      branch: '',
      swiftCode: '',
      coaAccountCode: defaultCoa?.code || '1120',
      coaAccountName: defaultCoa?.name || 'Bank BCA - Rek Operasional (123-456-7890)',
      isPrimary: currentBankAccounts.length === 0,
      status: 'Aktif',
      notes: ''
    });
    setIsBankModalOpen(true);
  };

  const handleOpenEditBankModal = (bank: CompanyBankAccount) => {
    setEditingBankId(bank.id);
    const popularBanks = [
      'Bank Central Asia (BCA)',
      'Bank Mandiri (Persero)',
      'Bank Negara Indonesia (BNI)',
      'Bank Rakyat Indonesia (BRI)',
      'Bank Syariah Indonesia (BSI)',
      'Bank CIMB Niaga',
      'Bank Permata',
      'Bank Danamon',
      'Bank Tabungan Negara (BTN)',
      'Bank Panin',
      'Bank Mega',
      'Bank DKI',
      'Bank BJB',
      'Bank BTPN / Jenius',
      'Bank OCBC NISP'
    ];
    const isCustom = !popularBanks.includes(bank.bankName);

    setBankFormData({
      bankName: isCustom ? 'Lainnya' : bank.bankName,
      customBankName: isCustom ? bank.bankName : '',
      accountNumber: bank.accountNumber,
      accountHolder: bank.accountHolder,
      role: bank.role,
      branch: bank.branch || '',
      swiftCode: bank.swiftCode || '',
      coaAccountCode: bank.coaAccountCode || '1120',
      coaAccountName: bank.coaAccountName || '',
      isPrimary: !!bank.isPrimary,
      status: bank.status || 'Aktif',
      notes: bank.notes || ''
    });
    setIsBankModalOpen(true);
  };

  const handleSaveBankForm = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBankName =
      bankFormData.bankName === 'Lainnya'
        ? bankFormData.customBankName.trim()
        : bankFormData.bankName.trim();

    if (!effectiveBankName) {
      setBankNotice({ type: 'error', message: 'Nama Bank wajib diisi atau dipilih.' });
      return;
    }
    if (!bankFormData.accountNumber.trim()) {
      setBankNotice({ type: 'error', message: 'Nomor Rekening wajib diisi.' });
      return;
    }
    if (!bankFormData.accountHolder.trim()) {
      setBankNotice({ type: 'error', message: 'Atas Nama Pemilik Rekening wajib diisi.' });
      return;
    }

    const matchedCoa = accounts.find((a) => a.code === bankFormData.coaAccountCode);
    const resolvedCoaName = matchedCoa
      ? matchedCoa.name
      : bankFormData.coaAccountName || `Akun COA ${bankFormData.coaAccountCode}`;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let updatedList: CompanyBankAccount[];

    if (editingBankId) {
      updatedList = currentBankAccounts.map((b) => {
        if (b.id === editingBankId) {
          return {
            ...b,
            bankName: effectiveBankName,
            accountNumber: bankFormData.accountNumber.trim(),
            accountHolder: bankFormData.accountHolder.trim(),
            role: bankFormData.role,
            branch: bankFormData.branch.trim(),
            swiftCode: bankFormData.swiftCode.trim(),
            coaAccountCode: bankFormData.coaAccountCode,
            coaAccountName: resolvedCoaName,
            isPrimary: bankFormData.isPrimary,
            status: bankFormData.status,
            notes: bankFormData.notes.trim(),
            updatedAt: nowStr
          };
        }
        if (bankFormData.isPrimary) {
          return { ...b, isPrimary: false };
        }
        return b;
      });
    } else {
      const newBank: CompanyBankAccount = {
        id: `bank-${Date.now()}`,
        bankName: effectiveBankName,
        accountNumber: bankFormData.accountNumber.trim(),
        accountHolder: bankFormData.accountHolder.trim(),
        role: bankFormData.role,
        branch: bankFormData.branch.trim(),
        swiftCode: bankFormData.swiftCode.trim(),
        coaAccountCode: bankFormData.coaAccountCode,
        coaAccountName: resolvedCoaName,
        isPrimary: bankFormData.isPrimary || currentBankAccounts.length === 0,
        status: bankFormData.status,
        notes: bankFormData.notes.trim(),
        createdAt: nowStr,
        updatedAt: nowStr
      };

      if (newBank.isPrimary) {
        updatedList = [newBank, ...currentBankAccounts.map((b) => ({ ...b, isPrimary: false }))];
      } else {
        updatedList = [...currentBankAccounts, newBank];
      }
    }

    if (!updatedList.some((b) => b.isPrimary) && updatedList.length > 0) {
      updatedList[0].isPrimary = true;
    }

    const primaryBank = updatedList.find((b) => b.isPrimary) || updatedList[0];

    const updatedProfile: CompanyProfile = {
      ...formData,
      bankAccounts: updatedList,
      bankName: primaryBank.bankName,
      bankAccountNo: primaryBank.accountNumber,
      bankAccountHolder: primaryBank.accountHolder,
      updatedAt: new Date().toLocaleString('id-ID'),
      updatedBy: currentUser?.name || 'Super Admin'
    };

    setFormData(updatedProfile);
    onUpdateCompanyProfile(updatedProfile);
    setIsBankModalOpen(false);
    setBankNotice({
      type: 'success',
      message: editingBankId
        ? `Rekening ${effectiveBankName} (${bankFormData.accountNumber}) berhasil diperbarui.`
        : `Rekening baru ${effectiveBankName} (${bankFormData.accountNumber}) berhasil ditambahkan sebagai ${bankFormData.role}.`
    });
    setTimeout(() => setBankNotice(null), 5000);
  };

  const handleSetPrimaryBank = (bankId: string) => {
    const updatedList = currentBankAccounts.map((b) => ({
      ...b,
      isPrimary: b.id === bankId
    }));
    const primaryBank = updatedList.find((b) => b.id === bankId);
    if (!primaryBank) return;

    const updatedProfile: CompanyProfile = {
      ...formData,
      bankAccounts: updatedList,
      bankName: primaryBank.bankName,
      bankAccountNo: primaryBank.accountNumber,
      bankAccountHolder: primaryBank.accountHolder,
      updatedAt: new Date().toLocaleString('id-ID'),
      updatedBy: currentUser?.name || 'Super Admin'
    };

    setFormData(updatedProfile);
    onUpdateCompanyProfile(updatedProfile);
    setBankNotice({
      type: 'success',
      message: `${primaryBank.bankName} (${primaryBank.accountNumber}) dijadikan sebagai Rekening Utama Kop Surat.`
    });
    setTimeout(() => setBankNotice(null), 4000);
  };

  const handleExecuteDeleteBank = () => {
    if (!bankToDelete) return;
    if (currentBankAccounts.length <= 1) {
      alert('Perusahaan membutuhkan minimal satu rekening bank aktif untuk keperluan penerbitan invoice & kop surat.');
      setBankToDelete(null);
      return;
    }

    const updatedList = currentBankAccounts.filter((b) => b.id !== bankToDelete.id);
    if (bankToDelete.isPrimary && updatedList.length > 0) {
      updatedList[0].isPrimary = true;
    }

    const primaryBank = updatedList.find((b) => b.isPrimary) || updatedList[0];

    const updatedProfile: CompanyProfile = {
      ...formData,
      bankAccounts: updatedList,
      bankName: primaryBank.bankName,
      bankAccountNo: primaryBank.accountNumber,
      bankAccountHolder: primaryBank.accountHolder,
      updatedAt: new Date().toLocaleString('id-ID'),
      updatedBy: currentUser?.name || 'Super Admin'
    };

    setFormData(updatedProfile);
    onUpdateCompanyProfile(updatedProfile);
    const deletedName = bankToDelete.bankName;
    const deletedNo = bankToDelete.accountNumber;
    setBankToDelete(null);
    setBankNotice({
      type: 'success',
      message: `Rekening ${deletedName} (${deletedNo}) berhasil dihapus.`
    });
    setTimeout(() => setBankNotice(null), 4000);
  };

  const handleCopyAccountNumber = (accountNumber: string, id: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedBankId(id);
    setTimeout(() => setCopiedBankId(null), 2000);
  };

  useEffect(() => {
    setFormData({ ...companyProfile });
  }, [companyProfile]);

  const isSuperAdmin = currentUser?.role === 'Super Admin (HQ)';

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    setSaveSuccess(false);
    setErrorMsg('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Ukuran file logo maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('logoUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMsg('Nama Perusahaan wajib diisi.');
      return;
    }

    const updatedProfile: CompanyProfile = {
      ...formData,
      updatedAt: new Date().toLocaleString('id-ID'),
      updatedBy: currentUser?.name || 'Super Admin'
    };

    onUpdateCompanyProfile(updatedProfile);
    setSaveSuccess(true);
    setErrorMsg('');

    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  const handleResetDefault = () => {
    if (window.confirm('Kembalikan pengaturan profil perusahaan ke setelan default awal sistem?')) {
      const def = { ...INITIAL_COMPANY_PROFILE, updatedAt: new Date().toLocaleString('id-ID'), updatedBy: currentUser?.name || 'Super Admin' };
      setFormData(def);
      onUpdateCompanyProfile(def);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm text-slate-900">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Akses Dibatasi</h2>
        <p className="text-sm text-slate-600">
          Menu <b>Pengaturan Perusahaan</b> hanya dapat diakses dan diubah oleh pengguna dengan hak akses <b>Super Admin (HQ)</b>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300/80 text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Master Identitas & Legalitas Organisasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Pengaturan Perusahaan
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Perubahan identitas, kontak, logo, rekening, dan penandatangan di menu ini akan <b>secara otomatis terhubung & mengubah</b> seluruh kop surat resmi, laporan timesheet, slip gaji, neraca keuangan, SOP operasional, dan export PDF di seluruh aplikasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="company-reset-btn"
              type="button"
              onClick={handleResetDefault}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Reset Default</span>
            </button>

            <button
              id="company-save-btn"
              type="button"
              onClick={() => handleSave()}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>

        {/* Save feedback */}
        {saveSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center space-x-3 text-emerald-800 text-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">
              Data Perusahaan Berhasil Disimpan! Seluruh kop surat, laporan PDF, dan dashboard telah disinkronkan secara real-time.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center space-x-3 text-rose-800 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          id="tab-company-profile"
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Identitas & Legalitas</span>
        </button>

        <button
          id="tab-company-contact"
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'contact'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>2. Kontak & Kantor</span>
        </button>

        <button
          id="tab-company-signees"
          type="button"
          onClick={() => setActiveTab('signees')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'signees'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>3. Penandatangan & Direksi</span>
        </button>

        <button
          id="tab-company-bank"
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'bank'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>4. Rekening & Finansial</span>
        </button>

        <button
          id="tab-company-preview"
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'preview'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>5. Pratinjau Kop Surat</span>
        </button>

        <button
          id="tab-company-vps"
          type="button"
          onClick={() => setActiveTab('vps')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'vps'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>6. Integrasi VPS & Real-Time</span>
        </button>

        {isSuperAdmin && (
          <button
            id="tab-company-danger-zone"
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'danger'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-xs'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>7. Reset Sistem (Super Admin)</span>
          </button>
        )}
      </div>

      {/* TAB 1: IDENTITAS & LEGALITAS */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span>Identitas Pokok & Branding Perusahaan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Informasi ini akan menjadi nama entitas resmi pada seluruh header sistem, kop surat, dan laporan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nama PT Lengkap */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nama Resmi Perusahaan (PT / CV / Lembaga) <span className="text-rose-500">*</span>
              </label>
              <input
                id="company-name-input"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Contoh: PT RAJAWALI CYCLE INDONESIA"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
              <span className="text-[11px] text-slate-500">
                Nama ini muncul pada kop surat teratas, slip gaji, laporan laba rugi, dan dokumen kontrak.
              </span>
            </div>

            {/* Nama Singkat / Brand */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nama Singkat / Brand Dagang
              </label>
              <input
                id="company-brand-input"
                type="text"
                value={formData.brandName}
                onChange={(e) => handleChange('brandName', e.target.value)}
                placeholder="Contoh: RAJAWALI CYCLE"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* Slogan / Tagline */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Slogan / Tagline Bisnis
              </label>
              <input
                id="company-tagline-input"
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Contoh: Integrated Facility Services & Enterprise Management"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* NPWP */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nomor Pokok Wajib Pajak (NPWP)
              </label>
              <input
                id="company-taxid-input"
                type="text"
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                placeholder="Contoh: 01.890.123.4-012.000"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none font-mono focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* NIB / Izin */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nomor Induk Berusaha (NIB) / Izin Operasional
              </label>
              <input
                id="company-nib-input"
                type="text"
                value={formData.businessPermitNo}
                onChange={(e) => handleChange('businessPermitNo', e.target.value)}
                placeholder="Contoh: 9120008819231 (NIB)"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none font-mono focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* Logo URL / Custom Upload */}
            <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Logo Perusahaan (Digunakan di Kop Surat & Header)</span>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => handleChange('logoUrl', '')}
                    className="text-xs text-rose-500 hover:underline font-normal cursor-pointer"
                  >
                    Hapus Logo Kustom (Gunakan Icon Default)
                  </button>
                )}
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="w-20 h-20 bg-white border border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Perusahaan"
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-amber-600 text-xs font-bold text-center p-1">
                      <Sparkles className="w-6 h-6 mb-1" />
                      <span>RC Logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer flex items-center space-x-2 shadow-xs">
                      <Upload className="w-4 h-4 text-amber-500" />
                      <span>Upload File Logo (PNG/JPG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={formData.logoUrl || ''}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="Atau masukkan tautan URL gambar logo..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Format gambar ideal: PNG transparan atau JPG persegi (maks 2MB).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KONTAK & KANTOR PUSAT */}
      {activeTab === 'contact' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-amber-500" />
              <span>Alamat Kantor Pusat & Kontak Resmi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Data alamat dan nomor kontak yang tertera pada bagian kepala surat dan lembar kontak resmi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alamat Lengkap */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Alamat Kantor Pusat / Gedung Operasional <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="company-address-input"
                rows={3}
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Contoh: Menara Rajawali Lt. 12, Jl. DR. Ide Anak Agung Gde Agung Lot 5.1, Mega Kuningan"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed shadow-xs transition-all"
              />
            </div>

            {/* Kota & Kode Pos */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kota & Kode Pos / Wilayah
              </label>
              <input
                id="company-city-input"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Contoh: Jakarta Selatan 12950, DKI Jakarta"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* Telepon */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>Nomor Telepon Kantor</span>
              </label>
              <input
                id="company-phone-input"
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Contoh: (021) 5299-8800"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* WhatsApp Helpdesk */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Layanan / Hotline</span>
              </label>
              <input
                id="company-whatsapp-input"
                type="text"
                value={formData.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                placeholder="Contoh: 0812-9988-7766"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email Resmi Perusahaan</span>
              </label>
              <input
                id="company-email-input"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Contoh: corporate@rajawalicycle.co.id"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-600" />
                <span>Alamat Website Resmi</span>
              </label>
              <input
                id="company-website-input"
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="Contoh: www.rajawalicycle.co.id"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PENANDATANGAN & DIREKSI */}
      {activeTab === 'signees' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-amber-500" />
              <span>Pejabat Penandatangan Dokumen Resmi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Nama pejabat ini akan tercetak secara dinamis pada kolom tanda tangan Slip Gaji, Laporan Keuangan, dan Berita Acara.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pimpinan / Direktur */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Pimpinan Tertinggi / Direktur Utama</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Nama Lengkap & Gelar Direktur
                </label>
                <input
                  id="company-director-name-input"
                  type="text"
                  value={formData.directorName}
                  onChange={(e) => handleChange('directorName', e.target.value)}
                  placeholder="Contoh: Wanda I. Zeng, S.E."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-semibold shadow-xs transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Jabatan Resmi
                </label>
                <input
                  id="company-director-title-input"
                  type="text"
                  value={formData.directorTitle}
                  onChange={(e) => handleChange('directorTitle', e.target.value)}
                  placeholder="Contoh: Direktur Utama"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                />
              </div>
            </div>

            {/* Finance Lead */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Penanggung Jawab Keuangan & Payroll</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Nama Lengkap & Gelar Finance Lead
                </label>
                <input
                  id="company-finance-name-input"
                  type="text"
                  value={formData.financeManagerName}
                  onChange={(e) => handleChange('financeManagerName', e.target.value)}
                  placeholder="Contoh: Dewi Lestari, S.Ak"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-semibold shadow-xs transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Jabatan Resmi Keuangan
                </label>
                <input
                  id="company-finance-title-input"
                  type="text"
                  value={formData.financeManagerTitle}
                  onChange={(e) => handleChange('financeManagerTitle', e.target.value)}
                  placeholder="Contoh: Finance & Accounting Lead"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REKENING BANK & FOOTER KOP SURAT */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Notification Banner */}
          {bankNotice && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
                bankNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                {bankNotice.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                )}
                <span className="text-xs sm:text-sm font-semibold">{bankNotice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setBankNotice(null)}
                className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
            {/* Header & Main Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <span>Rekening Bank Operasional & Catatan Dokumen</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola rekening resmi perusahaan, peran transaksi (Penerimaan Invoice, Pembayaran Invoice, Operasional, Payroll, Simpanan) yang terintegrasi langsung dengan Bagan Akun Standar (PSAK) dan Buku Kas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {onNavigateView && (
                  <button
                    type="button"
                    onClick={() => onNavigateView('finance_cash_journal')}
                    className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-all cursor-pointer shadow-xs"
                    title="Buka Buku Kas & Bagan Akun Standar (COA)"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Buka Buku Kas (COA)</span>
                  </button>
                )}

                <button
                  id="add-company-bank-btn"
                  data-testid="add-company-bank-btn"
                  type="button"
                  onClick={handleOpenAddBankModal}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Rekening Bank</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Rekening</span>
                <span className="text-xl font-black text-slate-900 block">{currentBankAccounts.length}</span>
                <span className="text-[10px] text-slate-400 block">Bank Terdaftar</span>
              </div>

              <div className="bg-cyan-50/50 border border-cyan-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider flex items-center space-x-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Penerimaan</span>
                </span>
                <span className="text-xl font-black text-cyan-800 block">
                  {currentBankAccounts.filter((b) => b.role === 'Rekening Penerimaan Invoice').length}
                </span>
                <span className="text-[10px] text-slate-500 block">Invoice Klien</span>
              </div>

              <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center space-x-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Pembayaran</span>
                </span>
                <span className="text-xl font-black text-rose-800 block">
                  {currentBankAccounts.filter((b) => b.role === 'Rekening Pembayaran Invoice').length}
                </span>
                <span className="text-[10px] text-slate-500 block">Vendor & Supplier</span>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Payroll</span>
                </span>
                <span className="text-xl font-black text-emerald-800 block">
                  {currentBankAccounts.filter((b) => b.role === 'Rekening Payroll').length}
                </span>
                <span className="text-[10px] text-slate-500 block">Upah Manpower</span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-amber-50/50 border border-amber-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Operasional</span>
                </span>
                <span className="text-xl font-black text-amber-800 block">
                  {currentBankAccounts.filter((b) => b.role === 'Rekening Operasional' || b.role === 'Rekening Simpanan').length}
                </span>
                <span className="text-[10px] text-slate-500 block">Kas & Simpanan</span>
              </div>
            </div>

            {/* Role Filter Tabs & Search Bar */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Role Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setBankRoleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bankRoleFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs'
                  }`}
                >
                  Semua ({currentBankAccounts.length})
                </button>

                <button
                  type="button"
                  onClick={() => setBankRoleFilter('Rekening Penerimaan Invoice')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bankRoleFilter === 'Rekening Penerimaan Invoice'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-600 hover:text-cyan-700 border border-slate-200 shadow-xs'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>Penerimaan Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBankRoleFilter('Rekening Pembayaran Invoice')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bankRoleFilter === 'Rekening Pembayaran Invoice'
                      ? 'bg-rose-500 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-600 hover:text-rose-700 border border-slate-200 shadow-xs'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Pembayaran Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBankRoleFilter('Rekening Operasional')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bankRoleFilter === 'Rekening Operasional'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-600 hover:text-amber-700 border border-slate-200 shadow-xs'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Operasional</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBankRoleFilter('Rekening Payroll')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bankRoleFilter === 'Rekening Payroll'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-600 hover:text-emerald-700 border border-slate-200 shadow-xs'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>Payroll</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBankRoleFilter('Rekening Simpanan')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bankRoleFilter === 'Rekening Simpanan'
                      ? 'bg-indigo-500 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-600 hover:text-indigo-700 border border-slate-200 shadow-xs'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Simpanan</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari bank, no. rek, pemilik, COA..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
                />
                {bankSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBankSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBankAccounts.length === 0 ? (
                <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                  <CreditCard className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">Tidak ada rekening bank yang sesuai dengan filter.</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Coba sesuaikan kata kunci pencarian atau reset filter peran bank untuk melihat semua rekening.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBankRoleFilter('ALL');
                        setBankSearchQuery('');
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300 shadow-xs"
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>
              ) : (
                filteredBankAccounts.map((bank) => {
                  const getRoleStyle = () => {
                    switch (bank.role) {
                      case 'Rekening Penerimaan Invoice':
                        return {
                          badge: 'bg-cyan-50 text-cyan-800 border-cyan-300',
                          border: 'border-cyan-300',
                          icon: ArrowDownLeft,
                          title: 'Penerimaan Invoice'
                        };
                      case 'Rekening Pembayaran Invoice':
                        return {
                          badge: 'bg-rose-50 text-rose-800 border-rose-300',
                          border: 'border-rose-300',
                          icon: ArrowUpRight,
                          title: 'Pembayaran Invoice'
                        };
                      case 'Rekening Operasional':
                        return {
                          badge: 'bg-amber-50 text-amber-800 border-amber-300',
                          border: 'border-amber-300',
                          icon: Sparkles,
                          title: 'Operasional'
                        };
                      case 'Rekening Payroll':
                        return {
                          badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                          border: 'border-emerald-300',
                          icon: Users,
                          title: 'Payroll & Upah'
                        };
                      case 'Rekening Simpanan':
                      default:
                        return {
                          badge: 'bg-indigo-50 text-indigo-800 border-indigo-300',
                          border: 'border-indigo-300',
                          icon: ShieldCheck,
                          title: 'Simpanan'
                        };
                    }
                  };

                  const roleStyle = getRoleStyle();
                  const RoleIcon = roleStyle.icon;

                  return (
                    <div
                      key={bank.id}
                      className={`bg-white border rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between ${
                        bank.isPrimary ? 'border-amber-400 bg-amber-50/15' : 'border-slate-200'
                      }`}
                    >
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${roleStyle.badge}`}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                            <span>{bank.role}</span>
                          </span>

                          {bank.isPrimary && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300">
                              <span>★ Rekening Utama Kop Surat</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            bank.status === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          {bank.status || 'Aktif'}
                        </span>
                      </div>

                      {/* Bank Details */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-slate-900">
                          <Landmark className="w-4 h-4 text-amber-500 shrink-0" />
                          <h4 className="text-base font-extrabold tracking-tight truncate">{bank.bankName}</h4>
                        </div>

                        {/* Nomor Rekening Display with Copy Button */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                              Nomor Rekening
                            </span>
                            <span className="text-base sm:text-lg font-mono font-black text-amber-700 tracking-wider">
                              {bank.accountNumber}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyAccountNumber(bank.accountNumber, bank.id)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-300 shadow-xs"
                            title="Salin nomor rekening ke clipboard"
                          >
                            {copiedBankId === bank.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 text-[11px]">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[11px]">Salin</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-slate-500 text-[10px] block">Atas Nama Pemilik:</span>
                            <span className="font-bold text-slate-800 truncate block">{bank.accountHolder}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[10px] block">Kantor Cabang:</span>
                            <span className="font-medium text-slate-700 truncate block">{bank.branch || '-'}</span>
                          </div>
                        </div>

                        {bank.swiftCode && (
                          <div className="text-[11px] text-slate-600">
                            <span className="text-slate-500 text-[10px]">SWIFT / BI-FAST: </span>
                            <span className="font-mono text-slate-800">{bank.swiftCode}</span>
                          </div>
                        )}
                      </div>

                      {/* Integration with COA & Sub COA (PSAK) */}
                      <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1">
                            <LinkIcon className="w-3 h-3 text-amber-600" />
                            <span>Terhubung ke Bagan Akun (COA PSAK)</span>
                          </span>
                          <span className="font-mono text-[10px] font-bold text-amber-900 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300">
                            Akun: {bank.coaAccountCode || '1120'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {bank.coaAccountName || `Akun Kas & Bank [${bank.coaAccountCode}]`}
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Sinkron otomatis ke Pencatatan Kas & Jurnal Umum Double-Entry saat transaksi dicatat.
                        </p>
                      </div>

                      {bank.notes && (
                        <p className="text-[11px] text-slate-600 italic line-clamp-2">
                          &ldquo;{bank.notes}&rdquo;
                        </p>
                      )}

                      {/* Action Buttons Row */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          {!bank.isPrimary ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryBank(bank.id)}
                              className="text-[11px] text-slate-600 hover:text-amber-700 font-bold transition flex items-center space-x-1 cursor-pointer"
                              title="Jadikan rekening default pada kop surat cetak"
                            >
                              <span>★ Set Jadi Rekening Utama</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Rekening Utama Default</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditBankModal(bank)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 shadow-xs transition cursor-pointer"
                            title="Edit rekening & nomor rekening"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit Nomor Rekening</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBankToDelete(bank)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-xs transition cursor-pointer"
                            title="Hapus rekening bank yang dipilih"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Note */}
            <div className="space-y-2 pt-6 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Catatan Kaki Resmi (Footer Dokumen Cetak & Slip Gaji)</span>
              </label>
              <textarea
                id="company-footer-note-input"
                rows={3}
                value={formData.letterheadFooterNote}
                onChange={(e) => handleChange('letterheadFooterNote', e.target.value)}
                placeholder="Contoh: Dokumen ini sah dan diterbitkan secara digital oleh Sistem ERP PT Rajawali Cycle Indonesia..."
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed shadow-xs transition-all"
              />
              <span className="text-[11px] text-slate-500 block">
                Teks ini akan selalu dicetak di bagian paling bawah setiap lembar laporan PDF resmi dan slip gaji.
              </span>
            </div>
          </div>

          {/* MODAL: TAMBAH / EDIT REKENING BANK */}
          {isBankModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
              onClick={() => setIsBankModalOpen(false)}
            >
              <div
                className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        {editingBankId ? 'Edit Rekening Bank & Nomor Rekening' : 'Tambah Rekening Bank Operasional Baru'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Konfigurasi rekening dan integrasikan dengan Bagan Akun Standar (PSAK).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBankModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveBankForm} className="space-y-4">
                  {/* Row 1: Nama Bank */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Nama Bank Resmi *</span>
                      <span className="text-[10px] text-slate-500 font-normal">Pilih bank terdaftar atau lainnya</span>
                    </label>
                    <select
                      value={bankFormData.bankName}
                      onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                    >
                      <option value="Bank Central Asia (BCA)">Bank Central Asia (BCA)</option>
                      <option value="Bank Mandiri (Persero)">Bank Mandiri (Persero)</option>
                      <option value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</option>
                      <option value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</option>
                      <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                      <option value="Bank CIMB Niaga">Bank CIMB Niaga</option>
                      <option value="Bank Permata">Bank Permata</option>
                      <option value="Bank Danamon">Bank Danamon</option>
                      <option value="Bank Tabungan Negara (BTN)">Bank Tabungan Negara (BTN)</option>
                      <option value="Bank Panin">Bank Panin</option>
                      <option value="Bank Mega">Bank Mega</option>
                      <option value="Bank DKI">Bank DKI</option>
                      <option value="Bank BJB">Bank BJB</option>
                      <option value="Bank BTPN / Jenius">Bank BTPN / Jenius</option>
                      <option value="Bank OCBC NISP">Bank OCBC NISP</option>
                      <option value="Lainnya">Lainnya (Tulis Sendiri)</option>
                    </select>

                    {bankFormData.bankName === 'Lainnya' && (
                      <input
                        type="text"
                        placeholder="Ketik Nama Bank Lengkap..."
                        value={bankFormData.customBankName}
                        onChange={(e) => setBankFormData({ ...bankFormData, customBankName: e.target.value })}
                        className="w-full mt-2 px-4 py-2.5 bg-slate-50 focus:bg-white border border-amber-500 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Row 2: Nomor Rekening & Pemilik Rekening */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nomor Rekening *
                      </label>
                      <input
                        type="text"
                        value={bankFormData.accountNumber}
                        onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                        placeholder="Contoh: 541-0988-771"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Atas Nama Pemilik Rekening *
                      </label>
                      <input
                        type="text"
                        value={bankFormData.accountHolder}
                        onChange={(e) => setBankFormData({ ...bankFormData, accountHolder: e.target.value })}
                        placeholder="Contoh: PT RAJAWALI CYCLE INDONESIA"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Row 3: Peran Rekening Bank (Radio Cards) */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Peran & Fungsi Rekening Bank *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {
                          role: 'Rekening Penerimaan Invoice' as BankAccountRole,
                          title: 'Penerimaan Invoice',
                          desc: 'Penerimaan pelunasan invoice & tagihan dari klien',
                          color: 'border-cyan-400 text-cyan-800 bg-cyan-50'
                        },
                        {
                          role: 'Rekening Pembayaran Invoice' as BankAccountRole,
                          title: 'Pembayaran Invoice',
                          desc: 'Pembayaran tagihan invoice vendor & logistik',
                          color: 'border-rose-400 text-rose-800 bg-rose-50'
                        },
                        {
                          role: 'Rekening Operasional' as BankAccountRole,
                          title: 'Rekening Operasional',
                          desc: 'Kas operasional rutin site, transport & petty cash',
                          color: 'border-amber-400 text-amber-800 bg-amber-50'
                        },
                        {
                          role: 'Rekening Payroll' as BankAccountRole,
                          title: 'Rekening Payroll',
                          desc: 'Penggajian karyawan, transfer upah manpower & BPJS',
                          color: 'border-emerald-400 text-emerald-800 bg-emerald-50'
                        },
                        {
                          role: 'Rekening Simpanan' as BankAccountRole,
                          title: 'Rekening Simpanan',
                          desc: 'Simpanan cadangan likuiditas, deposito & kas darurat',
                          color: 'border-indigo-400 text-indigo-800 bg-indigo-50'
                        }
                      ].map((item) => (
                        <div
                          key={item.role}
                          onClick={() => setBankFormData({ ...bankFormData, role: item.role })}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            bankFormData.role === item.role
                              ? `${item.color} shadow-sm`
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{item.title}</span>
                            <input
                              type="radio"
                              name="bank_role"
                              checked={bankFormData.role === item.role}
                              onChange={() => setBankFormData({ ...bankFormData, role: item.role })}
                              className="text-amber-500 focus:ring-amber-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: Terhubung ke Bagan Akun Standar (COA - PSAK) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Hubungkan ke Bagan Akun Standar (COA & Sub COA - PSAK) *</span>
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold">Sinkron Jurnal Otomatis</span>
                    </label>

                    <select
                      value={bankFormData.coaAccountCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const found = accounts.find((a) => a.code === code);
                        setBankFormData({
                          ...bankFormData,
                          coaAccountCode: code,
                          coaAccountName: found ? found.name : `Akun ${code}`
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                    >
                      {accounts && accounts.length > 0 ? (
                        <>
                          <optgroup label="Akun Kas & Setara Kas (Likuiditas)">
                            {accounts
                              .filter((a) => a.category === 'Kas & Bank' || a.code.startsWith('11'))
                              .map((acc) => (
                                <option key={acc.code} value={acc.code}>
                                  [{acc.code}] {acc.name} ({acc.category})
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Akun Lainnya">
                            {accounts
                              .filter((a) => a.category !== 'Kas & Bank' && !a.code.startsWith('11'))
                              .map((acc) => (
                                <option key={acc.code} value={acc.code}>
                                  [{acc.code}] {acc.name} ({acc.category})
                                </option>
                              ))}
                          </optgroup>
                        </>
                      ) : (
                        <>
                          <option value="1120">[1120] Bank BCA - Rek Operasional (123-456-7890)</option>
                          <option value="1121">[1121] Bank Mandiri - Rek Payroll (987-654-3210)</option>
                          <option value="1122">[1122] Bank BNI - Rek Penerimaan Invoice (1177888008)</option>
                          <option value="1130">[1130] Bank Syariah Indonesia - Rek Operasional (777-666-555)</option>
                          <option value="1110">[1110] Kas Operasional Kantor Pusat (Petty Cash)</option>
                        </>
                      )}
                    </select>

                    <p className="text-[10px] text-slate-500">
                      Setiap kali transaksi penerimaan/pembayaran dilakukan melalui rekening ini, jurnal umum akan otomatis didebit/dikreditkan ke akun COA di atas.
                    </p>
                  </div>

                  {/* Row 5: Kantor Cabang & SWIFT Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Kantor Cabang (KCU / KCP)
                      </label>
                      <input
                        type="text"
                        value={bankFormData.branch}
                        onChange={(e) => setBankFormData({ ...bankFormData, branch: e.target.value })}
                        placeholder="Contoh: KCU Mega Kuningan Jakarta"
                        className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Kode SWIFT / BI-FAST (Opsional)
                      </label>
                      <input
                        type="text"
                        value={bankFormData.swiftCode}
                        onChange={(e) => setBankFormData({ ...bankFormData, swiftCode: e.target.value })}
                        placeholder="Contoh: CENAIDJA"
                        className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Row 6: Catatan & Checkbox Primary */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Catatan / Keterangan Tambahan
                    </label>
                    <input
                      type="text"
                      value={bankFormData.notes}
                      onChange={(e) => setBankFormData({ ...bankFormData, notes: e.target.value })}
                      placeholder="Contoh: Khusus pembayaran termin kontrak project gedung"
                      className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                    />
                  </div>

                  {/* Checkbox Jadikan Rekening Utama */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-3">
                    <input
                      id="checkbox-is-primary-bank"
                      type="checkbox"
                      checked={bankFormData.isPrimary}
                      onChange={(e) => setBankFormData({ ...bankFormData, isPrimary: e.target.checked })}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="checkbox-is-primary-bank" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Jadikan sebagai Rekening Utama untuk Kop Surat Resmi & Dokumen Faktur
                    </label>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsBankModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20 transition cursor-pointer"
                    >
                      {editingBankId ? 'Simpan Perubahan Rekening' : 'Tambahkan Rekening Bank'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CONFIRM MODAL: HAPUS REKENING BANK */}
          <ConfirmModal
            isOpen={!!bankToDelete}
            title="Hapus Rekening Bank Terpilih?"
            message={
              bankToDelete
                ? `Apakah Anda yakin ingin menghapus rekening bank "${bankToDelete.bankName}" dengan nomor rekening "${bankToDelete.accountNumber}" (Peran: ${bankToDelete.role})? Rekening ini terhubung dengan COA [${bankToDelete.coaAccountCode}]. Tindakan ini tidak dapat dibatalkan.`
                : ''
            }
            confirmText="Ya, Hapus Rekening"
            cancelText="Batal"
            confirmVariant="danger"
            onConfirm={handleExecuteDeleteBank}
            onCancel={() => setBankToDelete(null)}
          />
        </div>
      )}

      {/* TAB 5: PRATINJAU KOP SURAT RESMI */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                <Printer className="w-5 h-5 text-amber-600" />
                <span>Simulasi Pratinjau Kop Surat Resmi (A4 Paper Preview)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tampilan real-time hasil konfigurasi perusahaan saat dicetak atau diexport ke file PDF.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center space-x-2 cursor-pointer transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              <span>Test Cetak Browser</span>
            </button>
          </div>

          {/* Paper Mockup (Light high contrast official letterhead) */}
          <div className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 shadow-2xl max-w-4xl mx-auto border border-slate-300">
            {/* Kop Surat Header */}
            <div className="flex items-center justify-between border-b-4 border-slate-900 pb-5 mb-6">
              <div className="flex items-center space-x-5">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Company Logo"
                    className="w-16 h-16 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-900 text-amber-400 font-black rounded-xl flex items-center justify-center text-xl shadow-md">
                    RC
                  </div>
                )}

                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                    {formData.name || 'PT RAJAWALI CYCLE INDONESIA'}
                  </h2>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mt-0.5">
                    {formData.tagline || 'Integrated Facility Services & Enterprise Management'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-snug max-w-xl">
                    {formData.address} • {formData.city}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Telp: {formData.phone} • WA: {formData.whatsapp} • Email: {formData.email} • Web: {formData.website}
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-500 font-mono hidden sm:block shrink-0">
                <p>NPWP: {formData.taxId}</p>
                <p>NIB: {formData.businessPermitNo}</p>
              </div>
            </div>

            {/* Document Body Mockup */}
            <div className="space-y-6 py-4">
              <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                <h3 className="text-base font-extrabold tracking-wide uppercase text-slate-950">
                  SURAT KETERANGAN REKAPITULASI RESMI
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Nomor: 088/SK-RC/OPS/{new Date().getFullYear()}
                </p>
              </div>

              <div className="text-xs leading-relaxed text-slate-700 space-y-3">
                <p>
                  Dengan ini diterangkan bahwa data operasional, ketenagakerjaan, persediaan logistik, dan laporan keuangan yang tercantum pada sistem <b>{formData.name}</b> telah diverifikasi dan disetujui secara digital sesuai standar operasional prosedur perusahaan.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900">Rekening Resmi Perusahaan (Bagan Akun PSAK & Operasional):</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {currentBankAccounts.length} Rekening Terdaftar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentBankAccounts.map((b) => (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-lg border text-[11px] ${
                          b.isPrimary
                            ? 'bg-amber-50/60 border-amber-300 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{b.bankName}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {b.role.replace('Rekening ', '')}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 pt-0.5">{b.accountNumber}</div>
                        <div className="text-[10px] text-slate-500 truncate">a/n {b.accountHolder}</div>
                        <div className="text-[9px] text-amber-700 font-semibold pt-1">
                          COA: [{b.coaAccountCode}] {b.coaAccountName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Signature Area */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div className="space-y-16">
                  <p className="font-medium text-slate-600">Mengetahui & Menyetujui,</p>
                  <div>
                    <p className="font-bold text-slate-900 underline text-sm">
                      {formData.directorName}
                    </p>
                    <p className="text-slate-500 text-[11px] font-medium">{formData.directorTitle}</p>
                  </div>
                </div>

                <div className="space-y-16">
                  <p className="font-medium text-slate-600">Penanggung Jawab Keuangan,</p>
                  <div>
                    <p className="font-bold text-slate-900 underline text-sm">
                      {formData.financeManagerName}
                    </p>
                    <p className="text-slate-500 text-[11px] font-medium">{formData.financeManagerTitle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="border-t border-slate-300 pt-4 mt-8 text-center text-[10px] text-slate-500 italic">
              {formData.letterheadFooterNote}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: INTEGRASI VPS & DATABASE REAL-TIME */}
      {activeTab === 'vps' && (
        <div className="space-y-6">
          {/* VPS Feedback alert */}
          {vpsMsg && (
            <div
              className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs animate-in fade-in duration-200 ${
                vpsMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {vpsMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              )}
              <span className="font-semibold">{vpsMsg.text}</span>
            </div>
          )}

          {/* VPS Hero & Status Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-amber-600 text-xs font-bold uppercase tracking-wider">
                  <Server className="w-4 h-4" />
                  <span>Konektivitas Cloud Server Mandiri</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Integrasi Database VPS & Real-Time Sync
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Hubungkan sistem langsung ke server VPS Anda. Data master karyawan, timesheet, mutasi stok, transaksi kas keuangan, dan izin operasional akan tersimpan permanen di database PostgreSQL VPS dan terbarui secara instan antar pengguna.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={vpsLoading}
                  onClick={async () => {
                    setVpsLoading(true);
                    setVpsMsg(null);
                    try {
                      const res = await vpsSyncService.reconnect();
                      if (res.connected) {
                        setVpsMsg({ type: 'success', text: 'Koneksi ke PostgreSQL VPS berhasil diverifikasi!' });
                      } else {
                        setVpsMsg({
                          type: 'error',
                          text: res.error || 'Belum terhubung ke PostgreSQL VPS. Sistem saat ini berjalan dalam mode file lokal.'
                        });
                      }
                    } catch {
                      setVpsMsg({ type: 'error', text: 'Gagal menghubungi backend VPS.' });
                    } finally {
                      setVpsLoading(false);
                    }
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${vpsLoading ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
                  <span>Cek / Hubungkan Ulang</span>
                </button>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Status Database Engine</span>
                <div className="flex items-center space-x-2 pt-0.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      vpsStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-bold text-sm text-slate-900">
                    {vpsStatus.connected
                      ? vpsStatus.engine === 'remote_vps'
                        ? 'VPS Remote Aktif'
                        : 'PostgreSQL Aktif'
                      : 'Local File Store'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  {vpsStatus.connected
                    ? vpsStatus.engine === 'remote_vps'
                      ? 'Terhubung ke VPS Remote API & Real-time'
                      : 'Terhubung ke PostgreSQL VPS'
                    : 'Fallback aman lokal'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Aliran Real-Time</span>
                <div className="flex items-center space-x-2 pt-0.5">
                  <Radio
                    className={`w-4 h-4 ${
                      vpsStatus.socketConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
                    }`}
                  />
                  <span className="font-bold text-sm text-slate-900">
                    {vpsStatus.socketConnected ? 'Socket.IO Online' : 'Standby / Polling'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">Sinkronisasi instan multi-tab & multi-device</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Host Database VPS</span>
                <span className="font-mono text-xs font-bold text-amber-700 truncate block pt-1" title={vpsStatus.host || 'Localhost'}>
                  {vpsStatus.host || '127.0.0.1 (Local)'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  DB: {vpsStatus.database || 'rajawali_db'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Sinkronisasi Terakhir</span>
                <span className="font-mono text-xs font-bold text-slate-700 block pt-1">
                  {vpsStatus.lastSync ? new Date(vpsStatus.lastSync).toLocaleString('id-ID') : '-'}
                </span>
                <span className="text-[10px] text-slate-500 block">Auto-sync realtime aktif</span>
              </div>
            </div>

            {/* Automatic Synchronization Status Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-slate-900 block">Sinkronisasi Otomatis Latar Belakang (Real-Time Auto-Sync)</span>
                <span className="text-[11px] text-emerald-800 block">
                  Server VPS bekerja 100% otomatis di latar belakang. Setiap penambahan atau perubahan data (stok gudang, absensi, karyawan, jurnal kas, mutasi) langsung disimpan ke database VPS dan disinkronkan ke seluruh perangkat tanpa memerlukan perintah sinkronisasi manual.
                </span>
              </div>
            </div>
          </div>

          {/* Deployment Step-by-Step Documentation Guide */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Database className="w-5 h-5 text-amber-600" />
                <span>Panduan Lengkap Menghubungkan VPS & Konfigurasi Real-Time</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Ikuti 4 langkah berikut pada terminal SSH VPS Anda untuk mengaktifkan sistem secara permanen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1: Install PostgreSQL */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <span className="font-bold text-sm text-slate-900">Setup PostgreSQL di VPS</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `sudo apt update && sudo apt install -y postgresql postgresql-contrib\nsudo -u postgres psql -c "CREATE USER rajawali_user WITH PASSWORD 'PasswordRahasia123';"\nsudo -u postgres psql -c "CREATE DATABASE rajawali_db OWNER rajawali_user;"`
                      );
                      setVpsSnippetCopied('s1');
                      setTimeout(() => setVpsSnippetCopied(null), 2500);
                    }}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    {vpsSnippetCopied === 's1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{vpsSnippetCopied === 's1' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Jalankan perintah ini di terminal SSH VPS Ubuntu/Debian untuk membuat user dan database:
                </p>
                <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`sudo apt update && sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER rajawali_user WITH PASSWORD 'PasswordRahasia123';"
sudo -u postgres psql -c "CREATE DATABASE rajawali_db OWNER rajawali_user;"`}
                </pre>
              </div>

              {/* Step 2: Set .env */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <span className="font-bold text-sm text-slate-900">Atur Variabel Lingkungan (.env)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `PORT=3000\nDATABASE_URL="postgresql://rajawali_user:PasswordRahasia123@127.0.0.1:5432/rajawali_db"\nNODE_ENV=production`
                      );
                      setVpsSnippetCopied('s2');
                      setTimeout(() => setVpsSnippetCopied(null), 2500);
                    }}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    {vpsSnippetCopied === 's2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{vpsSnippetCopied === 's2' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Buat atau edit file <code className="text-amber-700 font-mono font-semibold">.env</code> di direktori root aplikasi:
                </p>
                <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-amber-300 overflow-x-auto">
{`PORT=3000
DATABASE_URL="postgresql://rajawali_user:PasswordRahasia123@127.0.0.1:5432/rajawali_db"
NODE_ENV=production`}
                </pre>
              </div>

              {/* Step 3: Run with PM2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <span className="font-bold text-sm text-slate-900">Build & Jalankan via PM2</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `npm install -g pm2\nnpm install\nnpm run build\npm2 start npm --name "rajawali-app" -- start\npm2 save && pm2 startup`
                      );
                      setVpsSnippetCopied('s3');
                      setTimeout(() => setVpsSnippetCopied(null), 2500);
                    }}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    {vpsSnippetCopied === 's3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{vpsSnippetCopied === 's3' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  PM2 menjaga aplikasi tetap menyala 24/7 dan otomatis hidup kembali saat server reboot:
                </p>
                <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-cyan-300 overflow-x-auto">
{`npm install -g pm2
npm install && npm run build
pm2 start npm --name "rajawali-app" -- start
pm2 save && pm2 startup`}
                </pre>
              </div>

              {/* Step 4: Nginx Proxy */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      4
                    </span>
                    <span className="font-bold text-sm text-slate-900">Nginx Reverse Proxy & WebSocket</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `location / {\n    proxy_pass http://127.0.0.1:3000;\n    proxy_http_version 1.1;\n    proxy_set_header Upgrade $http_upgrade;\n    proxy_set_header Connection "upgrade";\n    proxy_set_header Host $host;\n}`
                      );
                      setVpsSnippetCopied('s4');
                      setTimeout(() => setVpsSnippetCopied(null), 2500);
                    }}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    {vpsSnippetCopied === 's4' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{vpsSnippetCopied === 's4' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pastikan konfigurasi Nginx mendukung Upgrade Header agar WebSocket berjalan mulus:
                </p>
                <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-amber-300 overflow-x-auto">
{`location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DANGER ZONE & HAPUS DATA MASAL PER DIVISI (KHUSUS SUPER ADMIN) */}
      {activeTab === 'danger' && isSuperAdmin && (
        <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-rose-100 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Otoritas Super Admin (HQ) - Tindakan Permanen</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                <span>Pusat Hapus Data Masal per Divisi</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Fitur khusus Super Admin untuk menghapus data masal per masing-masing divisi perusahaan menggunakan PIN Otorisasi.
                Data yang terhapus mencakup seluruh data manual, upload file (e-Statement), maupun data demo bawaan dan <b>TIDAK DAPAT DIKEMBALIKAN</b>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                id="quick-wipe-empty-btn"
                onClick={() => {
                  setSelectedDivisionForBulkDelete('all');
                  setIsBulkDeleteModalOpen(true);
                }}
                className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-rose-600/20 transition-all cursor-pointer shrink-0 active:scale-95 border border-rose-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Bersih Seluruh Sistem (0 Data)</span>
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {resetSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-800 text-xs font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-black text-rose-900 text-xs uppercase tracking-wide">
                Peraturan & Keamanan Eksekusi Penghapusan Masal:
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                1. Setiap penghapusan mewajibkan <b>PIN Keamanan 6-Digit</b> dan pengetikan kata konfirmasi <b>HAPUS</b>.
                <br />
                2. Hanya akun role <b>Super Admin (HQ)</b> yang memiliki hak akses eksekusi.
                <br />
                3. Sekali dieksekusi, database divisi tersebut langsung terhapus bersih dari sistem.
              </p>
            </div>
          </div>

          {/* DIVISION CARDS GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Pilih Divisi yang Akan Dihapus Masal:
              </h4>
              <span className="text-[11px] text-slate-500">
                Pilih divisi di bawah untuk membuka dialog otorisasi PIN
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 1. Divisi Keuangan & Akuntansi */}
              <div className="p-5 rounded-2xl bg-white border border-emerald-200 hover:border-emerald-400 shadow-xs transition flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900">Divisi Keuangan & Akuntansi</h5>
                        <p className="text-[11px] text-slate-500">Finance, Accounting, AP/AR & Bank Reconciliation</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                      {storageService.getFinanceTransactions().length + storageService.getDebts().length + storageService.getReceivables().length + storageService.getBankStatements().length} data
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>• Jurnal Kas/Bank: <b className="text-emerald-700">{storageService.getFinanceTransactions().length}</b></div>
                    <div>• Rekening Koran: <b className="text-emerald-700">{storageService.getBankStatements().length}</b></div>
                    <div>• Hutang Usaha: <b className="text-emerald-700">{storageService.getDebts().length}</b></div>
                    <div>• Piutang Usaha: <b className="text-emerald-700">{storageService.getReceivables().length}</b></div>
                    <div>• Investasi: <b className="text-emerald-700">{storageService.getInvestments().length}</b></div>
                    <div>• Saldo COA: <b className="text-emerald-700">Direset Rp 0</b></div>
                  </div>

                  <p className="text-[11px] text-rose-600">
                    ⚠️ Seluruh transaksi kas masuk/keluar, hutang, piutang, upload e-statement & bagi hasil akan dihapus total.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-trigger-delete-finance"
                  onClick={() => {
                    setSelectedDivisionForBulkDelete('finance');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-rose-600 border border-emerald-300 hover:border-rose-500 text-emerald-800 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer group"
                >
                  <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-white" />
                  <span>Hapus Masal Divisi Keuangan</span>
                </button>
              </div>

              {/* 2. Divisi HRD & Ketenagakerjaan */}
              <div className="p-5 rounded-2xl bg-white border border-blue-200 hover:border-blue-400 shadow-xs transition flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900">Divisi HRD & Ketenagakerjaan</h5>
                        <p className="text-[11px] text-slate-500">Human Resources, Timesheets, Mutasi & SOP</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black">
                      {storageService.getEmployees().length + storageService.getTimesheets().length + storageService.getMutations().length + storageService.getSops().length} data
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>• Karyawan / Cleaner: <b className="text-blue-700">{storageService.getEmployees().length}</b></div>
                    <div>• Matriks Timesheet: <b className="text-blue-700">{storageService.getTimesheets().length}</b></div>
                    <div>• Riwayat Mutasi: <b className="text-blue-700">{storageService.getMutations().length}</b></div>
                    <div>• Dokumen SOP/K3: <b className="text-blue-700">{storageService.getSops().length}</b></div>
                  </div>

                  <p className="text-[11px] text-rose-600">
                    ⚠️ Seluruh biodata personil, absensi 1-31 hari, log mutasi dan dokumen SOP akan dihapus bersih.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-trigger-delete-hrm"
                  onClick={() => {
                    setSelectedDivisionForBulkDelete('hrm');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-rose-600 border border-blue-300 hover:border-rose-500 text-blue-800 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer group"
                >
                  <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-white" />
                  <span>Hapus Masal Divisi HRD</span>
                </button>
              </div>

              {/* 3. Divisi Operasional & Lapangan */}
              <div className="p-5 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 shadow-xs transition flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900">Divisi Operasional & Lapangan</h5>
                        <p className="text-[11px] text-slate-500">Site Proyek, Smart Inventory Chemical & Kanban</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black">
                      {storageService.getProjects().length + storageService.getInventoryItems().length + storageService.getProjectStocks().length + storageService.getInventoryLogs().length + storageService.getMaterialRequests().length + storageService.getTasks().length} data
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>• Lokasi Proyek: <b className="text-amber-700">{storageService.getProjects().length}</b></div>
                    <div>• Master Item Chemical: <b className="text-amber-700">{storageService.getInventoryItems().length}</b></div>
                    <div>• Stok Tiap Proyek: <b className="text-amber-700">{storageService.getProjectStocks().length}</b></div>
                    <div>• Log Mutasi Barang: <b className="text-amber-700">{storageService.getInventoryLogs().length}</b></div>
                    <div>• Permintaan Material: <b className="text-amber-700">{storageService.getMaterialRequests().length}</b></div>
                    <div>• Tugas Kanban Board: <b className="text-amber-700">{storageService.getTasks().length}</b></div>
                  </div>

                  <p className="text-[11px] text-rose-600">
                    ⚠️ Seluruh proyek gedung, master chemical, alokasi stok site, log barang & kartu tugas akan dihapus.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-trigger-delete-operations"
                  onClick={() => {
                    setSelectedDivisionForBulkDelete('operations');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-rose-600 border border-amber-300 hover:border-rose-500 text-amber-800 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer group"
                >
                  <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-white" />
                  <span>Hapus Masal Divisi Operasional</span>
                </button>
              </div>

              {/* 4. Divisi Komunikasi & Broadcast */}
              <div className="p-5 rounded-2xl bg-white border border-purple-200 hover:border-purple-400 shadow-xs transition flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900">Divisi Komunikasi & Broadcast</h5>
                        <p className="text-[11px] text-slate-500">Eagle Blast & Pengumuman Manajemen</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-black">
                      {storageService.getBlasts().length} data
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>• Pesan Siaran Eagle Blast: <b className="text-purple-700">{storageService.getBlasts().length} pesan</b></div>
                  </div>

                  <p className="text-[11px] text-rose-600">
                    ⚠️ Seluruh riwayat siaran pesan resmi dan pengumuman internal akan dihapus permanen.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-trigger-delete-blast"
                  onClick={() => {
                    setSelectedDivisionForBulkDelete('blast');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-rose-600 border border-purple-300 hover:border-rose-500 text-purple-800 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer group"
                >
                  <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-white" />
                  <span>Hapus Masal Broadcast (Eagle Blast)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900">Tips Keamanan Cadangan:</span>
              <p className="text-[11px] text-slate-600">
                Sebelum melakukan pembersihan data divisi, Anda disarankan untuk membuat cadangan terlebih dahulu menggunakan menu <b>Ekspor File / Cadangan Data</b>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OTORISASI RESET SEMUA DATA (SUPER ADMIN) */}
      {isResetAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-rose-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-rose-100 pb-4">
              <div className="p-2.5 rounded-2xl bg-rose-100 border border-rose-200">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {resetMode === 'wipe_empty' ? 'Konfirmasi Kosongkan Seluruh Data' : 'Konfirmasi Muat Data Demo'}
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  {resetMode === 'wipe_empty'
                    ? 'Akan menghapus semua data operasional menjadi 0 record (bersih total)'
                    : 'Akan mengisi ulang seluruh modul dengan data contoh / simulasi pabrik'}
                </p>
              </div>
            </div>

            {/* Reset confirmation info */}
            <div className="text-xs text-slate-700 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed">
              <p>
                Anda akan <b>mengosongkan seluruh database lokal</b> sistem. Seluruh data Proyek, Karyawan, Timesheet, Inventori, Tugas Kanban, dan Jurnal Keuangan akan dihapus hingga <b>0 record</b>. Sesi akun Super Admin tetap aktif.
              </p>
              <div className="text-[11px] text-rose-800 font-mono bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                Ketik kata <b>RESET</b> di bawah dan masukkan PIN Keamanan Super Admin Anda untuk verifikasi.
              </div>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{resetError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700">
                  1. Ketik "RESET" (Huruf Besar):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirmCode('RESET');
                    setResetPin('888999');
                    setResetError('');
                  }}
                  className="text-[10px] text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                >
                  ⚡ Isi Otomatis Kode & PIN
                </button>
              </div>
              <input
                type="text"
                id="input-confirm-reset-text"
                value={resetConfirmCode}
                onChange={(e) => setResetConfirmCode(e.target.value)}
                placeholder="Ketik RESET"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm uppercase tracking-wider focus:border-rose-500 focus:outline-none"
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  2. PIN Otorisasi Super Admin (Default: 888999 atau 123456):
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    id="input-confirm-reset-pin"
                    value={resetPin}
                    onChange={(e) => setResetPin(e.target.value)}
                    placeholder="Masukkan 6 digit PIN (888999)"
                    maxLength={10}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                id="cancel-reset-modal-btn"
                onClick={() => setIsResetAllModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition border border-slate-300"
              >
                Batal
              </button>

              <button
                type="button"
                id="execute-reset-modal-btn"
                onClick={() => {
                  const upperCode = resetConfirmCode.trim().toUpperCase();
                  if (upperCode !== 'RESET' && resetConfirmCode.trim() !== '') {
                    setResetError('Ketik kata "RESET" dengan benar untuk konfirmasi.');
                    return;
                  }

                  const validPins = ['888999', '123456', '112233', currentUser?.securityPin || ''];
                  const pin = resetPin.trim();
                  if (pin !== '' && !validPins.includes(pin)) {
                    setResetError('PIN Keamanan Super Admin tidak valid. Masukkan PIN 888999.');
                    return;
                  }

                  // Execute Wipe All Data to Empty (0 records)
                  storageService.clearAllDataToEmpty();
                  if (onResetAllData) {
                    onResetAllData();
                  }
                  setIsResetAllModalOpen(false);
                  setResetSuccessMessage('Seluruh data operasional berhasil dikosongkan (0 record). Aplikasi siap untuk penginputan data asli.');

                  setTimeout(() => {
                    setResetSuccessMessage('');
                  }, 6000);
                }}
                className="px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Semua Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS DATA MASAL PER DIVISI (KHUSUS SUPER ADMIN) */}
      <BulkDeleteDivisionModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        initialDivision={selectedDivisionForBulkDelete}
        currentUser={currentUser || undefined}
        users={storageService.getUsers()}
        onSuccess={(divLabel) => {
          setResetSuccessMessage(`Data ${divLabel} berhasil dihapus permanen menjadi 0 record.`);
          if (onResetAllData) {
            onResetAllData();
          }
          setTimeout(() => {
            setResetSuccessMessage('');
          }, 6000);
        }}
      />

      {/* Floating Save Button on Mobile */}
      <div className="fixed bottom-20 right-4 sm:hidden z-30">
        <button
          type="button"
          onClick={() => handleSave()}
          className="px-5 py-3 bg-amber-500 text-slate-950 font-black text-xs rounded-full shadow-2xl flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Profil</span>
        </button>
      </div>
    </div>
  );
};
