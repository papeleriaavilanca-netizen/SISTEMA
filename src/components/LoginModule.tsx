import React, { useState, useEffect } from 'react';
import { CompanyConfig, CurrencyConfig, User } from '../types';
import { db } from '../services/db';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Store,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface LoginModuleProps {
  company: CompanyConfig;
  currency: CurrencyConfig;
  onLoginSuccess: (user: User) => void;
  inactivityNotice?: string | null;
}

export const LoginModule: React.FC<LoginModuleProps> = ({
  company,
  currency,
  onLoginSuccess,
  inactivityNotice,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('master');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Live system clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (lockoutSeconds > 0) {
      setErrorMsg(`Sistema bloqueado temporalmente por seguridad. Espere ${lockoutSeconds} segundos.`);
      return;
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('Por favor ingrese tanto el usuario como la clave de acceso.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Artificial short security check delay for realistic responsiveness
    setTimeout(() => {
      const result = db.authenticate(trimmedUser, trimmedPass);

      if (result.success && result.user) {
        setFailedAttempts(0);
        setLoading(false);
        onLoginSuccess(result.user);
      } else {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        setLoading(false);

        if (nextFails >= 5) {
          setLockoutSeconds(30);
          setErrorMsg('Demasiados intentos fallidos. Sistema bloqueado temporalmente por 30 segundos.');
        } else {
          setErrorMsg(result.error || 'Credenciales inválidas. Compruebe usuario o contraseña.');
        }
      }
    }, 350);
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between text-slate-100 relative overflow-hidden select-none">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              <span>{company.nombre}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium hidden sm:inline">
                {company.rif}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className="font-bold text-emerald-400">NEXUS POS</span>
              <span>•</span>
              <span>Control de Acceso Seguro</span>
            </div>
          </div>
        </div>

        {/* Live Clock & Security Status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {currentTime.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline">Sistema Protegido</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Center */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Inactivity Notice Alert if timed out */}
          {inactivityNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Sesión Finalizada</p>
                <p className="text-[11.5px] opacity-90">{inactivityNotice}</p>
              </div>
            </div>
          )}

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Acceso al Sistema TPV</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ingrese sus credenciales de usuario o clave master autorizada
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Usuario, Correo o Cédula</span>
                  <span className="text-[10px] text-slate-500 font-normal">Obligatorio</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    required
                    disabled={lockoutSeconds > 0 || loading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. admin o correo"
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Contraseña o Clave Master</span>
                  <span className="text-[10px] text-slate-500 font-normal">Sensible a mayúsculas</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={lockoutSeconds > 0 || loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : lockoutSeconds > 0 ? (
                  <span>Bloqueado ({lockoutSeconds}s)</span>
                ) : (
                  <>
                    <span>Entrar al Sistema</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Access Credentials Panel */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Acceso Rápido & Configuración Inicial</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Admin Quick Fill */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin', 'master')}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/20 text-left transition group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Administrador</span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-mono">
                      Dashboard
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white group-hover:text-purple-300 transition">
                    admin
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono">
                    Clave: <span className="text-slate-200">master</span>
                  </div>
                </button>

                {/* Vendedor Quick Fill */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('mariana', '2222')}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 text-left transition group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Vendedor (Caja)</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">
                      TPV
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition">
                    mariana
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono">
                    PIN: <span className="text-slate-200">2222</span>
                  </div>
                </button>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Redirección automática:</strong> Los administradores van directo al <strong>Dashboard</strong> y los vendedores a la <strong>Página de Ventas (TPV)</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Security Information */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80 text-[11.5px] text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Seguridad con Cifrado Local, Auditoría de Intentos y Control Antifraude</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{company.telefono}</span>
          <span>•</span>
          <span>{company.email}</span>
        </div>
      </footer>
    </div>
  );
};
