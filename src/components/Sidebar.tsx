import React from 'react';
import { User, RolePermissions } from '../types';
import { ROLE_PERMISSIONS } from '../services/db';
import {
  ShoppingCart,
  Package,
  Boxes,
  Tags,
  Users,
  Truck,
  RotateCcw,
  Settings,
  ShieldAlert,
  Lock,
  LayoutGrid,
  X,
  Pin,
  PinOff,
  LayoutDashboard,
  ClipboardList,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'ventas'
  | 'taller'
  | 'inventario'
  | 'productos'
  | 'categorias'
  | 'usuarios'
  | 'compras'
  | 'devoluciones'
  | 'configuracion'
  | 'auditoria';

export const TAB_LABELS: Record<ActiveTab, string> = {
  dashboard: 'Dashboard & Métricas',
  ventas: 'Ventas (TPV)',
  taller: 'Taller & Pedidos',
  productos: 'Productos',
  inventario: 'Inventario',
  categorias: 'Categorías',
  compras: 'Compras',
  devoluciones: 'Devoluciones',
  usuarios: 'Usuarios & Roles',
  configuracion: 'Configuración',
  auditoria: 'Auditoría',
};

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: User;
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onClose,
  isPinned = false,
  onTogglePin,
}) => {
  const permissions: RolePermissions = ROLE_PERMISSIONS[currentUser.role];

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard / Métricas',
      icon: LayoutDashboard,
      allowed: permissions.canViewReports,
      badge: 'En Vivo',
    },
    {
      id: 'ventas' as ActiveTab,
      label: 'Ventas (TPV)',
      icon: ShoppingCart,
      allowed: permissions.canAccessPOS,
      badge: 'Caja',
    },
    {
      id: 'taller' as ActiveTab,
      label: 'Taller & Pedidos',
      icon: ClipboardList,
      allowed: true,
      badge: 'Taller',
    },
    {
      id: 'productos' as ActiveTab,
      label: 'Productos',
      icon: Package,
      allowed: true, // USUARIO can view
      badge: null,
    },
    {
      id: 'inventario' as ActiveTab,
      label: 'Inventario',
      icon: Boxes,
      allowed: true, // USUARIO can view
      badge: null,
    },
    {
      id: 'categorias' as ActiveTab,
      label: 'Categorías',
      icon: Tags,
      allowed: true,
      badge: null,
    },
    {
      id: 'compras' as ActiveTab,
      label: 'Compras',
      icon: Truck,
      allowed: permissions.canManagePurchases,
      badge: null,
    },
    {
      id: 'devoluciones' as ActiveTab,
      label: 'Devoluciones',
      icon: RotateCcw,
      allowed: permissions.canManageRefunds,
      badge: null,
    },
    {
      id: 'usuarios' as ActiveTab,
      label: 'Usuarios & Roles',
      icon: Users,
      allowed: permissions.canManageUsers,
      badge: null,
    },
    {
      id: 'configuracion' as ActiveTab,
      label: 'Configuración',
      icon: Settings,
      allowed: permissions.canManageConfig,
      badge: null,
    },
    {
      id: 'auditoria' as ActiveTab,
      label: 'Auditoría',
      icon: ShieldAlert,
      allowed: permissions.canViewAuditLogs,
      badge: 'Seguridad',
    },
  ];

  const handleItemClick = (id: ActiveTab) => {
    onTabChange(id);
    // Auto-collapse if not explicitly pinned
    if (!isPinned && onClose) {
      onClose();
    }
  };

  return (
    <aside className="w-72 sm:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-3 px-3 select-none flex-shrink-0 text-slate-400 h-full overflow-y-auto">
      <div className="space-y-2">
        {/* Header with Title and Auto-collapse / Pin Controls */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/90 px-1">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
              Módulos del Sistema
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onTogglePin && (
              <button
                type="button"
                onClick={onTogglePin}
                className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                  isPinned
                    ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isPinned ? 'Desfijar (Auto-colapsable)' : 'Fijar barra abierta'}
              >
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Cerrar barra de módulos (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Informative Auto-collapse status tip */}
        <div className="px-2 py-1 text-[10px] text-slate-400 flex items-center justify-between font-mono bg-slate-950/40 rounded-lg border border-slate-800/60">
          <span>Modo:</span>
          <span className={isPinned ? 'text-blue-400 font-semibold' : 'text-emerald-400 font-semibold'}>
            {isPinned ? '📌 Fijada en pantalla' : '⚡ Auto-colapsable'}
          </span>
        </div>

        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAllowed = item.allowed;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isAllowed) {
                    handleItemClick(item.id);
                  }
                }}
                disabled={!isAllowed}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-xs'
                    : isAllowed
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 cursor-not-allowed opacity-40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-emerald-400' : isAllowed ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isAllowed && <Lock className="w-3 h-3 text-slate-600" />}
                  {item.badge && isAllowed && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & Role Info */}
      <div className="space-y-2 pt-3 mt-3 border-t border-slate-800/80">
        {onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            className="w-full py-2 px-2.5 bg-slate-800/70 hover:bg-slate-800 text-[11px] text-slate-300 rounded-xl border border-slate-700/60 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-1.5">
              {isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-400" /> : <Pin className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isPinned ? 'Desactivar fijado' : 'Fijar en pantalla'}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {isPinned ? 'Auto-ocultar' : 'Fija'}
            </span>
          </button>
        )}

        {/* Role permission indicator box */}
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Rol:</span>
            </div>
            <span className="font-bold text-slate-200">{currentUser.role}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            {currentUser.role === 'ADMINISTRADOR'
              ? 'Acceso total y configuración.'
              : currentUser.role === 'VENDEDOR'
              ? 'Operación de terminal TPV y cobros.'
              : 'Modo consulta de inventario.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
