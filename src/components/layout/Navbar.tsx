import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Menu, 
  X, 
  LogOut, 
  Lock, 
  Trash2
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
          <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
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
              className="flex items-center space-x-2 sm:space-x-3 min-w-0 text-left cursor-pointer group"
              title="Dashboard Utama"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40 shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                {companyProfile.logoUrl ? (
                  <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-base sm:text-xl font-black text-slate-950 tracking-tighter">🦅</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="text-xs sm:text-base md:text-lg font-extrabold tracking-tight text-slate-900 truncate max-w-[110px] sm:max-w-[190px] md:max-w-none group-hover:text-amber-600 transition-colors">
                    {companyProfile.brandName || companyProfile.name || 'RAJAWALI CYCLE'}
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-amber-300 hidden sm:inline-block">
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
                className="flex items-center space-x-1 bg-emerald-50 border border-emerald-300 px-2 sm:px-3 py-1.5 rounded-xl text-xs max-w-[110px] sm:max-w-[210px] md:max-w-none text-emerald-900"
                title={`Akses lokasi Anda terkunci pada ${currentProject?.name || 'Site Ini'}`}
              >
                <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="font-semibold text-slate-900 truncate text-xs">
                  📍 {currentProject ? currentProject.name : 'Lokasi Terkunci'}
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded border border-emerald-300 hidden sm:inline-block font-bold">
                  Terkunci
                </span>
              </div>
            ) : (
              // UNLOCKED SITE SELECTOR (For Super Admin & General Admin)
              <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-50 border border-slate-300 px-1.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm max-w-[105px] sm:max-w-[190px] md:max-w-none shrink min-w-0">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                <select
                  id="navbar-site-selector"
                  value={selectedProjectId}
                  onChange={(e) => onSelectProject?.(e.target.value)}
                  className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer text-xs sm:text-sm truncate w-full min-w-0"
                  title="Pilih Lokasi Gedung (Semua Lokasi / Spesifik)"
                >
                  <option value="ALL" className="bg-white text-slate-900">
                    🌐 Semua Lokasi (HQ)
                  </option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="bg-white text-slate-900">
                      📍 {proj.name} ({proj.code})
                    </option>
                  ))}
                </select>
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
