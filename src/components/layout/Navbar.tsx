import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  RotateCcw, 
  Menu, 
  X, 
  LogOut, 
  Lock, 
  Unlock,
  User,
  Shield,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Server
} from 'lucide-react';
import { Project, UserAccount, AppView, CompanyProfile } from '../../types';
import { storageService } from '../../services/storageService';
import { themeService, ThemeMode } from '../../services/themeService';
import { vpsSyncService, VpsConnectionStatus } from '../../services/vpsSyncService';
import { VpsSyncModal } from '../vps/VpsSyncModal';

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
  const [isVpsModalOpen, setIsVpsModalOpen] = useState(false);
  const [vpsStatus, setVpsStatus] = useState<VpsConnectionStatus>(() => vpsSyncService.getStatus());
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => storageService.getCompanyProfile());
  const [themePref, setThemePref] = useState<ThemeMode>(() => themeService.getThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => themeService.getResolvedTheme());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setCompanyProfile(storageService.getCompanyProfile());
    };
    const handleThemeChange = (e: any) => {
      setThemePref(themeService.getThemePreference());
      setResolvedTheme(themeService.getResolvedTheme());
    };

    const unsubVps = vpsSyncService.subscribeStatus((status) => {
      setVpsStatus(status);
    });

    window.addEventListener('company_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('theme_changed', handleThemeChange as EventListener);
    return () => {
      unsubVps();
      window.removeEventListener('company_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('theme_changed', handleThemeChange as EventListener);
    };
  }, []);

  const currentProject = (projects || []).find((p) => p.id === selectedProjectId);

  const isLocationLocked = currentUser?.isLocationLocked || false;
  const isSuperAdmin = currentUser?.role === 'Super Admin (HQ)';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Left: Hamburger & Brand Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              id="navbar-toggle-sidebar-btn"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 md:hidden cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={() => onSelectView?.('dashboard')}
              className="flex items-center space-x-2 sm:space-x-3 min-w-0 text-left cursor-pointer group"
              title="Dashboard Utama"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40 shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                {companyProfile.logoUrl ? (
                  <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-lg sm:text-xl font-black text-slate-950 tracking-tighter">🦅</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-white truncate group-hover:text-amber-400 transition-colors">
                    {companyProfile.brandName || companyProfile.name || 'RAJAWALI CYCLE'}
                  </span>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30 hidden xs:inline-block">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden lg:block truncate">
                  {companyProfile.tagline || 'Visionary Management for Sparkling Results • Outsourcing Suite'}
                </p>
              </div>
            </button>
          </div>

          {/* Right Controls: Site Selector, User Profile Chip, Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Site / Location Selector */}
            {isLocationLocked ? (
              // LOCKED SITE VIEW (For Admin Lokasi 1 / 2)
              <div
                className="flex items-center space-x-1.5 bg-emerald-950/70 border border-emerald-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs max-w-[150px] xs:max-w-[210px] sm:max-w-none text-emerald-200"
                title={`Akses lokasi Anda terkunci pada ${currentProject?.name || 'Site Ini'}`}
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white truncate text-xs">
                  📍 {currentProject ? currentProject.name : 'Lokasi Terkunci'}
                </span>
                <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/20 hidden sm:inline-block">
                  Terkunci
                </span>
              </div>
            ) : (
              // UNLOCKED SITE SELECTOR (For Super Admin & General Admin)
              <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 px-2 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm max-w-[130px] xs:max-w-[190px] sm:max-w-none">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                <select
                  id="navbar-site-selector"
                  value={selectedProjectId}
                  onChange={(e) => onSelectProject?.(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs sm:text-sm truncate w-full"
                  title="Pilih Lokasi Gedung (Semua Lokasi / Spesifik)"
                >
                  <option value="ALL" className="bg-slate-900 text-white">
                    🌐 Semua Lokasi (HQ)
                  </option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="bg-slate-900 text-white">
                      📍 {proj.name} ({proj.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Theme Toggle Button */}
            <button
              id="navbar-theme-toggle-btn"
              onClick={() => {
                themeService.toggleTheme();
              }}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-slate-200 hover:text-white"
              title={`Ganti Tema (${resolvedTheme === 'dark' ? 'Mode Gelap aktif. Klik untuk Mode Terang' : 'Mode Terang aktif. Klik untuk Mode Gelap'})`}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
                  <span className="hidden xl:inline text-[11px] text-amber-300 font-medium">Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500 animate-in spin-in-180 duration-300" />
                  <span className="hidden xl:inline text-[11px] text-indigo-600 font-medium">Gelap</span>
                </>
              )}
            </button>

            {/* Live VPS Real-time Database Status Badge */}
            <button
              id="navbar-vps-status-btn"
              type="button"
              onClick={() => setIsVpsModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/40 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-slate-200"
              title={`Integrasi VPS Database & Real-Time Sync: ${
                vpsStatus.connected
                  ? 'PostgreSQL VPS Terhubung (Real-Time)'
                  : 'Penyimpanan File Lokal Aktif (Klik untuk Panduan VPS)'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span
                className={`w-2 h-2 rounded-full ${
                  vpsStatus.connected
                    ? 'bg-emerald-400 animate-pulse'
                    : vpsStatus.socketConnected
                    ? 'bg-sky-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="hidden md:inline text-[11px] font-medium text-slate-300">
                {vpsStatus.connected ? 'VPS DB' : 'VPS Ready'}
              </span>
            </button>

            {/* User Session Profile Chip */}
            {currentUser && (
              <div className="relative">
                <button
                  id="navbar-user-profile-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title="Profil & Pengaturan Akun"
                >
                  <span className="text-base">{currentUser.avatar || '👤'}</span>
                  <div className="hidden sm:block text-left">
                    <div className="text-white text-xs font-bold leading-tight truncate max-w-[100px] md:max-w-[130px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-amber-400 leading-none truncate">
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
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-3 animate-scale-up">
                      <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                          {currentUser.avatar || '👤'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{currentUser.name}</div>
                          <div className="text-xs text-amber-400">{currentUser.role}</div>
                          <div className="text-[11px] text-slate-400 font-mono">@{currentUser.username}</div>
                        </div>
                      </div>

                      <div className="text-xs space-y-1 text-slate-300">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Visibilitas:</span>
                          <span className="font-semibold text-slate-200">
                            {currentUser.isLocationLocked ? '📍 1 Lokasi Terkunci' : '🌐 Semua Lokasi (HQ)'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Hak Akses:</span>
                          <span className="font-semibold text-emerald-400">
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
                            className="w-full text-left flex items-center space-x-2 p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-amber-500/20"
                          >
                            <Building2 className="w-4 h-4 text-amber-400" />
                            <span>Pengaturan Perusahaan (HQ)</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onSelectView?.('access_control');
                            }}
                            className="w-full text-left flex items-center space-x-2 p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                          >
                            <ShieldCheck className="w-4 h-4 text-amber-400" />
                            <span>Kelola Hak Akses Pengguna</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsVpsModalOpen(true);
                            }}
                            className="w-full text-left flex items-center space-x-2 p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                          >
                            <Server className="w-4 h-4 text-amber-400" />
                            <span>Integrasi & Status VPS Database</span>
                          </button>
                        </div>
                      )}

                      {/* Theme Mode Selector in Profile Dropdown */}
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between px-0.5">
                          <span>Tema Tampilan:</span>
                          <span className="text-[10px] text-amber-400 font-semibold uppercase">
                            {resolvedTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                          <button
                            id="theme-select-dark-btn"
                            type="button"
                            onClick={() => themeService.setTheme('dark')}
                            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              themePref === 'dark'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <Moon className="w-3.5 h-3.5 mb-0.5" />
                            <span>Gelap</span>
                          </button>
                          <button
                            id="theme-select-light-btn"
                            type="button"
                            onClick={() => themeService.setTheme('light')}
                            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              themePref === 'light'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5 mb-0.5" />
                            <span>Terang</span>
                          </button>
                          <button
                            id="theme-select-system-btn"
                            type="button"
                            onClick={() => themeService.setTheme('system')}
                            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              themePref === 'system'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <Monitor className="w-3.5 h-3.5 mb-0.5" />
                            <span>Otomatis</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <button
                          id="navbar-logout-btn"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout?.();
                          }}
                          className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-500/30"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
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
                className="p-1.5 sm:p-2 rounded-xl text-rose-400/80 hover:text-rose-200 hover:bg-rose-500/20 transition-colors shrink-0 cursor-pointer hidden sm:flex border border-rose-500/30"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Quick Direct Logout button (Mobile/Desktop) */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar dari Akun"
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-header Banner if specific project active */}
      {selectedProjectId !== 'ALL' && currentProject && (
        <div className="bg-amber-950/60 border-t border-amber-500/20 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs text-amber-200/90 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center space-x-2 truncate">
            <span className="font-bold text-amber-400 shrink-0">Site Aktif:</span>
            <span className="truncate">{currentProject.name} ({currentProject.address})</span>
            <span className="text-slate-400 shrink-0 hidden sm:inline">• Spv: {currentProject.siteSupervisor}</span>
          </div>
          {!isLocationLocked && onSelectProject && (
            <button 
              onClick={() => onSelectProject('ALL')} 
              className="text-amber-400 hover:underline font-bold shrink-0 text-[11px] cursor-pointer"
            >
              Semua Proyek ✕
            </button>
          )}
        </div>
      )}

      {/* VPS Database & Real-Time Sync Modal */}
      <VpsSyncModal
        isOpen={isVpsModalOpen}
        onClose={() => setIsVpsModalOpen(false)}
      />
    </header>
  );
};
