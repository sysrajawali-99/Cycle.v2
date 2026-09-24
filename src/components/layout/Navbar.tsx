import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Menu, 
  X, 
  LogOut, 
  Lock, 
  Trash2,
  ChevronDown,
  Check
} from 'lucide-react';
import { Project, UserAccount, AppView, CompanyProfile } from '../../types';
import { storageService } from '../../services/storageService';

interface NavbarProps {
  projects?: Project[];
  selectedProjectId?: string; // 'ALL' or specific id
  onSelectProject?: (id: string) => void;
  currentUser?: UserAccount;
  users?: UserAccount[];
  onLogout?: () => void;
  onResetData?: () => void;
  lowStockCount?: number;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  currentView?: AppView;
  onSelectView?: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects = [],
  selectedProjectId = 'ALL',
  onSelectProject,
  currentUser,
  onLogout,
  onResetData,
  isSidebarOpen = false,
  onToggleSidebar,
  currentView,
  onSelectView
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => storageService.getCompanyProfile());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setCompanyProfile(storageService.getCompanyProfile());
    };

    window.addEventListener('company_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('company_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const currentProject = (projects || []).find((p) => p.id === selectedProjectId);

  const isLocationLocked = currentUser?.isLocationLocked || false;
  const isSuperAdmin = currentUser?.role === 'Super Admin (HQ)';

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-30 shadow-xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-3">
          {/* Left: Hamburger & Brand Logo */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
            <button
              id="navbar-toggle-sidebar-btn"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 lg:hidden cursor-pointer shrink-0"
              aria-label="Toggle Menu"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={() => onSelectView?.('dashboard')}
              className="flex items-center space-x-2 sm:space-x-3 min-w-0 text-left cursor-pointer group flex-1 sm:flex-initial"
              title="Dashboard Utama"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40 shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                {companyProfile.logoUrl ? (
                  <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5 sm:p-1" />
                ) : (
                  <span className="text-base sm:text-xl font-black text-slate-950 tracking-tighter">🦅</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="text-xs sm:text-base md:text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors leading-tight truncate">
                    {companyProfile.brandName || companyProfile.name || 'RAJAWALI CYCLE'}
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-amber-300 hidden sm:inline-block shrink-0">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden xl:block truncate max-w-sm">
                  {companyProfile.tagline || 'Visionary Management for Sparkling Results • Outsourcing Suite'}
                </p>
              </div>
            </button>
          </div>

          {/* Right Controls: Site Selector, User Profile Chip */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Site / Location Selector */}
            {isLocationLocked ? (
              // LOCKED SITE VIEW (For Admin Lokasi 1 / 2)
              <div
                className="flex items-center space-x-1 sm:space-x-1.5 bg-emerald-50 border border-emerald-300 px-2 sm:px-3 py-1.5 rounded-xl text-xs max-w-[115px] xs:max-w-[155px] sm:max-w-[240px] md:max-w-none text-emerald-900 shrink min-w-0 overflow-hidden"
                title={`Akses lokasi Anda terkunci pada ${currentProject?.name || 'Site Ini'}`}
              >
                <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="font-bold text-slate-900 truncate text-[11px] sm:text-xs flex-1 min-w-0">
                  {currentProject ? currentProject.name : 'Lokasi Terkunci'}
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded border border-emerald-300 hidden sm:inline-block font-bold shrink-0">
                  Terkunci
                </span>
              </div>
            ) : (
              // UNLOCKED SITE SELECTOR (Custom Responsive Trigger + Modal / Dropdown)
              <div className="relative shrink min-w-0">
                <button
                  type="button"
                  id="navbar-site-selector-btn"
                  onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                  className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-300 hover:border-slate-400 px-2 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm max-w-[115px] xs:max-w-[160px] sm:max-w-[230px] md:max-w-[300px] shrink min-w-0 transition-colors shadow-2xs group cursor-pointer overflow-hidden"
                  title="Pilih Lokasi Gedung / Proyek"
                >
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate text-[11px] sm:text-xs flex-1 min-w-0 text-left leading-tight">
                    {selectedProjectId === 'ALL'
                      ? 'Semua Lokasi'
                      : (currentProject?.name || 'Pilih Lokasi')}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isLocationMenuOpen ? 'rotate-180 text-amber-600' : 'group-hover:text-slate-600'
                    }`}
                  />
                </button>

                {/* Location Selection Dropdown (Desktop) / Bottom Sheet (Mobile) */}
                {isLocationMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs sm:bg-transparent"
                      onClick={() => setIsLocationMenuOpen(false)}
                    />
                    <div className="fixed sm:absolute bottom-0 sm:bottom-auto sm:top-full left-0 sm:left-auto sm:right-0 w-full sm:w-80 max-h-[85vh] sm:max-h-[480px] bg-white sm:rounded-2xl rounded-t-3xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2 duration-200 text-slate-900">
                      {/* Sheet/Modal Header */}
                      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                              Pilih Lokasi Gedung
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Filter modul & rekapitulasi data area
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsLocationMenuOpen(false)}
                          className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
                          title="Tutup"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Options List */}
                      <div className="overflow-y-auto p-2 sm:p-2.5 space-y-1 divide-y divide-slate-100/60 max-h-[60vh] sm:max-h-[360px]">
                        {/* Option: Semua Lokasi */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject?.('ALL');
                            setIsLocationMenuOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                            selectedProjectId === 'ALL'
                              ? 'bg-amber-50 text-amber-950 border border-amber-300 font-bold shadow-xs'
                              : 'hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                            <span className="text-base shrink-0">🌐</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">Semua Lokasi Proyek</div>
                              <div className="text-[10px] text-slate-500">Konsolidasi seluruh site & HQ</div>
                            </div>
                          </div>
                          {selectedProjectId === 'ALL' && (
                            <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>

                        {/* List of individual projects */}
                        {projects.map((proj) => {
                          const isSelected = selectedProjectId === proj.id;
                          return (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => {
                                onSelectProject?.(proj.id);
                                setIsLocationMenuOpen(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer pt-2 ${
                                isSelected
                                  ? 'bg-amber-50 text-amber-950 border border-amber-300 font-bold shadow-xs'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                                <span className="text-base shrink-0">📍</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <span className="text-xs font-bold truncate text-slate-900">
                                      {proj.name}
                                    </span>
                                    {proj.code && (
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0">
                                        {proj.code}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {proj.type ? `${proj.type} • ` : ''}
                                    {proj.address || 'Alamat proyek'}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* User Session Profile Chip */}
            {currentUser && (
              <div className="relative shrink-0">
                <button
                  id="navbar-user-profile-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 min-h-[34px]"
                  title="Profil & Pengaturan Akun"
                >
                  <span className="text-base leading-none">{currentUser.avatar || '👤'}</span>
                  <div className="hidden sm:block text-left">
                    <div className="text-slate-900 text-xs font-bold leading-tight truncate max-w-[90px] md:max-w-[130px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-amber-700 font-semibold leading-none truncate">
                      {currentUser.role}
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-3 animate-scale-up text-slate-900">
                      <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                          {currentUser.avatar || '👤'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</div>
                          <div className="text-xs text-amber-700 font-semibold">{currentUser.role}</div>
                          <div className="text-[11px] text-slate-500 font-mono font-medium">@{currentUser.username}</div>
                        </div>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600 font-medium">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Visibilitas:</span>
                          <span className="font-semibold text-slate-800">
                            {currentUser.isLocationLocked ? '📍 1 Lokasi Terkunci' : '🌐 Semua Lokasi (HQ)'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Hak Akses:</span>
                          <span className="font-semibold text-emerald-700">
                            {currentUser.allowedViews.length} Modul Aktif
                          </span>
                        </div>
                      </div>

                      {isSuperAdmin && (
                        <div className="space-y-1 pt-1">
                          <button
                            id="navbar-company-settings-btn"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onSelectView?.('company_settings');
                            }}
                            className="w-full text-left flex items-center space-x-2 p-2 bg-amber-50 hover:bg-amber-100 text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-amber-200"
                          >
                            <Building2 className="w-4 h-4 text-amber-600" />
                            <span>Pengaturan Perusahaan (HQ)</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onSelectView?.('access_control');
                            }}
                            className="w-full text-left flex items-center space-x-2 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                          >
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            <span>Kelola Hak Akses Pengguna</span>
                          </button>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200">
                        <button
                          id="navbar-logout-btn"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout?.();
                          }}
                          className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          <span>Keluar (Logout)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick Reset System Data (Khusus Super Admin) */}
            {onResetData && currentUser?.role === 'Super Admin (HQ)' && (
              <button
                id="reset-database-btn"
                onClick={() => {
                  if (window.confirm('KONFIRMASI SUPER ADMIN:\n\nKosongkan seluruh data operasional sistem (0 Proyek, 0 Karyawan, 0 Stok, 0 Keuangan) sekarang agar database bersih total untuk data riil?')) {
                    onResetData();
                  }
                }}
                title="Kosongkan seluruh data sistem menjadi 0 record (Khusus Super Admin)"
                className="p-1.5 sm:p-2 rounded-xl text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors shrink-0 cursor-pointer hidden sm:flex border border-rose-300"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Quick Direct Logout button (Mobile/Desktop) */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar dari Akun"
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-header Banner if specific project active */}
      {selectedProjectId !== 'ALL' && currentProject && (
        <div className="bg-amber-50 border-t border-amber-200 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs text-amber-900 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center space-x-2 truncate">
            <span className="font-bold text-amber-800 shrink-0">Site Aktif:</span>
            <span className="truncate">{currentProject.name} ({currentProject.address})</span>
            <span className="text-slate-600 shrink-0 hidden sm:inline">• Spv: {currentProject.siteSupervisor}</span>
          </div>
          {!isLocationLocked && onSelectProject && (
            <button 
              onClick={() => onSelectProject('ALL')} 
              className="text-amber-800 hover:underline font-bold shrink-0 text-[11px] cursor-pointer"
            >
              Semua Proyek ✕
            </button>
          )}
        </div>
      )}
    </header>
  );
};
