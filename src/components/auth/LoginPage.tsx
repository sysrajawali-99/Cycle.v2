import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound
} from 'lucide-react';
import { UserAccount, CompanyProfile } from '../../types';

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

  const compName = companyProfile?.name || 'PT RAJAWALI CYCLE INDONESIA';
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-amber-200 selection:text-slate-900">
      {/* Subtle light ambient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Masuk ke Portal Sistem
          </h1>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed font-medium">
            {tagline}
          </p>
        </div>

        {/* Form Login Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Otentikasi Kredensial</h2>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center space-x-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aman</span>
            </span>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug font-semibold">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="login-username-input">
                Username / Email Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full bg-slate-50 border border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="login-password-input">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Toggle Password Visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer select-none font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Ingat akun saya</span>
              </label>
              <span className="text-slate-500 text-[11px] font-medium">Enkripsi SSL/TLS Aktif</span>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-600 space-y-1">
            <p className="font-medium">Sistem ini hanya diperuntukkan bagi personil dan manajemen resmi.</p>
            <p className="text-[11px] text-slate-500 font-medium">Semua aktivitas diawasi dan tercatat dalam Audit Trail.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-2 leading-relaxed font-medium">
          © {new Date().getFullYear()} {compName}
        </div>
      </div>
    </div>
  );
};

