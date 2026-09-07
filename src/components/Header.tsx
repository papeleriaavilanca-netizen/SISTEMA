import React, { useState, useEffect } from 'react';
import { CompanyConfig, CurrencyConfig, User } from '../types';
import { db } from '../services/db';
import {
  Store,
  RefreshCw,
  Wifi,
  WifiOff,
  User as UserIcon,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  ChevronDown,
  Check,
  Calculator,
  LayoutGrid,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  company: CompanyConfig;
  currency: CurrencyConfig;
  currentUser: User;
  onOpenUserSwitch: () => void;
  onLogout?: () => void;
  onOpenCashRegister?: () => void;
  onToggleModules?: () => void;
  isModulesOpen?: boolean;
  activeModuleLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  currency,
  currentUser,
  onOpenUserSwitch,
  onLogout,
  onOpenCashRegister,
  onToggleModules,
  isModulesOpen = false,
  activeModuleLabel,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRate, setNewRate] = useState(currency.tasaCambio.toString());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = () => {
    setSyncing(true);
    setTimeout(() => {
      db.simulateOnlineSync();
      setSyncing(false);
    }, 600);
  };

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newRate);
    if (!isNaN(parsed) && parsed > 0) {
      db.updateCurrency({
        ...currency,
        tasaCambio: parsed,
      });
      setShowRateModal(false);
    }
  };

  const roleColors: Record<string, string> = {
    ADMINISTRADOR: 'bg-purple-50 border-purple-200 text-purple-700',
    VENDEDOR: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    USUARIO: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between gap-3 md:gap-4 z-20 select-none shadow-xs">
        {/* Left: Modules Bar Toggle & Brand / Company Info */}
        <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
          {onToggleModules && (
            <button
              type="button"
              onClick={onToggleModules}
              className={`flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2 rounded-xl text-xs font-bold transition border shadow-2xs ${
                isModulesOpen
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 hover:border-slate-700'
              }`}
              title="Abrir/Cerrar barra de módulos del sistema (Alt+M)"
            >
              <LayoutGrid className={`w-4 h-4 ${isModulesOpen ? 'text-white' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">Módulos</span>
              {activeModuleLabel && (
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono hidden md:inline font-medium max-w-[110px] truncate">
                  {activeModuleLabel}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isModulesOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
            </button>
          )}

          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-xs flex-shrink-0">
            <Store className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-bold text-slate-800 truncate tracking-tight flex items-center gap-1.5 md:gap-2">
              <span>{company.nombre}</span>
              <span className="text-[9.5px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 font-medium tracking-wider hidden xs:inline">
                {company.rif}
              </span>
            </h1>
            <div className="text-[10.5px] md:text-[11px] text-slate-500 flex items-center gap-1.5 md:gap-2 truncate">
              <span className="font-semibold text-slate-700">NEXUS<span className="text-emerald-600">POS</span></span>
              <span>•</span>
              <span className="text-slate-400">v2.5</span>
              <span>•</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 text-[9.5px] font-mono rounded tracking-wider hidden sm:inline">
                STATUS: {isOnline ? 'ONLINE_SYNC' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right items */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Exchange Rate Badge with Quick Edit */}
          <button
            onClick={() => {
              setNewRate(currency.tasaCambio.toString());
              setShowRateModal(true);
            }}
            title="Haga clic para actualizar la tasa de cambio oficial"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-white transition group text-left shadow-2xs"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <div className="leading-tight">
              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                TASA OFICIAL
                <span className="text-[9px] text-slate-400 group-hover:text-emerald-600 transition">✎</span>
              </div>
              <div className="text-xs font-bold text-slate-800">
                1 {currency.monedaPrincipal.codigo} = {currency.tasaCambio.toFixed(2)} {currency.monedaReferencia.simbolo}
              </div>
            </div>
          </button>

          {/* Sync Status Badge */}
          <button
            onClick={handleManualSync}
            disabled={syncing}
            title="Base de datos con sincronización online automática. Clic para forzar sync."
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-700 transition shadow-2xs"
          >
            {isOnline ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            )}
            <span className="text-[11px] hidden md:inline text-slate-600 font-medium">
              {isOnline ? 'Online Sync' : 'Modo Offline'}
            </span>
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-400 hover:text-slate-600 ${
                syncing ? 'animate-spin text-emerald-600' : ''
              }`}
            />
          </button>

          {/* Current User & Quick Switch / Logout */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={onOpenUserSwitch}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-white transition group text-left"
              title="Cambiar cajero o usuario activo"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                {currentUser.nombre.charAt(0)}
                {currentUser.apellido.charAt(0)}
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition flex items-center gap-1">
                  <span>{currentUser.nombre}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                      roleColors[currentUser.role] || 'text-slate-500 border-slate-200'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </button>

            {/* Salir del sistema button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200"
                title="Cerrar sesión y salir del sistema"
                aria-label="Salir del sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Quick Rate Edit Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Actualizar Tasa de Cambio
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Define la equivalencia actual de 1 {currency.monedaPrincipal.codigo} ({currency.monedaPrincipal.nombre}) en{' '}
              {currency.monedaReferencia.codigo} ({currency.monedaReferencia.nombre}). Todos los precios del sistema se convertirán automáticamente.
            </p>
            <form onSubmit={handleSaveRate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nueva Tasa (1 {currency.monedaPrincipal.simbolo} = X {currency.monedaReferencia.simbolo})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Ej. 36.80"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-mono">
                    {currency.monedaReferencia.codigo}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar Tasa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
