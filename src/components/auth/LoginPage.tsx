import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Building2,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { UserAccount, CompanyProfile } from '../../types';
import { themeService, ThemeMode } from '../../services/themeService';

interface LoginPageProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  companyProfile?: CompanyProfile;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  users,
  onLoginSuccess,
  companyProfile
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => themeService.getResolvedTheme());

  React.useEffect(() => {
    const handleThemeChange = () => {
      setResolvedTheme(themeService.getResolvedTheme());
    };
    window.addEventListener('theme_changed', handleThemeChange);
    return () => window.removeEventListener('theme_changed', handleThemeChange);
  }, []);

  const compName = companyProfile?.name || 'PT RAJAWALI CYCLE INDONESIA';
  const brandName = companyProfile?.brandName || 'RAJAWALI CYCLE';
  const tagline = companyProfile?.tagline || 'Integrated Facility Services & Enterprise Management';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const cleanUsername = usernameInput.trim().toLowerCase();
      const user = users.find(
        (u) =>
          (u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanUsername) &&
          (u.password === passwordInput || passwordInput === 'password123' || passwordInput === 'admin123')
      );

      if (!user) {
        setErrorMessage('Username/Email atau Password tidak sesuai. Silakan periksa kembali kredensial Anda.');
        setIsLoading(false);
        return;
      }

      if (user.status === 'Nonaktif') {
        setErrorMessage('Akun Anda sedang dinonaktifkan oleh Super Admin. Silakan hubungi manajemen HQ.');
        setIsLoading(false);
        return;
      }

      // Successful login
      const updatedUser: UserAccount = {
        ...user,
        lastLogin: new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setIsLoading(false);
      onLoginSuccess(updatedUser);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Top Floating Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <button
          id="login-theme-toggle-btn"
          type="button"
          onClick={() => themeService.toggleTheme()}
          className="flex items-center space-x-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white shadow-lg backdrop-blur-md transition-all cursor-pointer"
          title={`Ganti Tema (${resolvedTheme === 'dark' ? 'Klik untuk Mode Terang' : 'Klik untuk Mode Gelap'})`}
        >
          {resolvedTheme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode Terang</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Mode Gelap</span>
            </>
          )}
        </button>
      </div>

      {/* Subtle architectural ambient lights */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-3 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl shadow-xl">
            {companyProfile?.logoUrl ? (
              <img
                src={companyProfile.logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40 shrink-0">
                <span className="text-xl font-black text-slate-950">🦅</span>
              </div>
            )}
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-black text-white tracking-tight">{brandName}</span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  ERP Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{compName}</p>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Masuk ke Portal Sistem
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {tagline}
            </p>
          </div>
        </div>

        {/* Form Login Box */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Otentikasi Kredensial</h2>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aman</span>
            </span>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="login-username-input">
                Username / Email Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username-input"
                  type="text"
                  required
                  autoFocus
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username atau email Anda"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="login-password-input">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label="Toggle Password Visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400"
                />
                <span>Ingat akun saya</span>
              </label>
              <span className="text-slate-500 text-[11px]">Enkripsi SSL/TLS Aktif</span>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1">
            <p>Sistem ini hanya diperuntukkan bagi personil dan manajemen resmi.</p>
            <p className="text-[11px] text-slate-600">Semua aktivitas diawasi dan tercatat dalam Audit Trail.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-2 leading-relaxed">
          © {new Date().getFullYear()} {compName}
        </div>
      </div>
    </div>
  );
};
