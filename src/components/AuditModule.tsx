import React, { useState, useMemo } from 'react';
import { AuditLog } from '../types';
import { ShieldCheck, Search, Filter, Clock, User, AlertCircle, FileText } from 'lucide-react';

interface AuditModuleProps {
  logs: AuditLog[];
}

export const AuditModule: React.FC<AuditModuleProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !searchTerm ||
        log.detalles.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.usuarioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.accion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchAction = actionFilter === 'ALL' || log.accion === actionFilter;

      return matchSearch && matchAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const actionBadges: Record<string, { bg: string; text: string; label: string }> = {
    VENTA: { bg: 'bg-emerald-50', text: 'text-emerald-700 border-emerald-200', label: 'Venta Realizada' },
    COMPRA: { bg: 'bg-blue-50', text: 'text-blue-700 border-blue-200', label: 'Compra Proveedor' },
    AJUSTE_INVENTARIO: { bg: 'bg-amber-50', text: 'text-amber-700 border-amber-200', label: 'Ajuste Inventario' },
    DEVOLUCION: { bg: 'bg-purple-50', text: 'text-purple-700 border-purple-200', label: 'Devolución / NC' },
    CAMBIO_USUARIO: { bg: 'bg-slate-100', text: 'text-slate-700 border-slate-200', label: 'Acceso / Usuario' },
    CAMBIO_CONFIG: { bg: 'bg-slate-100', text: 'text-slate-600 border-slate-200', label: 'Configuración' },
  };

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Registro Pericial de Auditoría & Seguridad
          </h2>
          <p className="text-xs text-slate-500">
            Trazabilidad inmutable de todas las transacciones, operaciones críticas y accesos de usuarios.
          </p>
        </div>

        <div className="text-xs text-slate-600 font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs font-semibold">
          {logs.length} Eventos Auditados
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por detalle, usuario o código de acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs font-medium"
        >
          <option value="ALL">Todas las Operaciones</option>
          <option value="VENTA">Ventas</option>
          <option value="COMPRA">Compras</option>
          <option value="AJUSTE_INVENTARIO">Ajustes de Inventario</option>
          <option value="DEVOLUCION">Devoluciones</option>
          <option value="CAMBIO_USUARIO">Usuarios y Permisos</option>
          <option value="CAMBIO_CONFIG">Configuración del Sistema</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Fecha & Hora</th>
                <th className="px-4 py-3.5">Tipo de Evento</th>
                <th className="px-4 py-3.5">Usuario Operador</th>
                <th className="px-4 py-3.5">Descripción Detallada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No se encontraron registros de auditoría que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = actionBadges[log.accion] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-600 border-slate-200',
                    label: log.accion,
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.fecha).toLocaleString('es-VE')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{log.usuarioNombre}</td>
                      <td className="px-4 py-3 text-slate-600 leading-relaxed">{log.detalles}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
