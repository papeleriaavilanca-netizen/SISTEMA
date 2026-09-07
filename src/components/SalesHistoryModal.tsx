import React, { useState, useMemo } from 'react';
import { Sale, CurrencyConfig, CompanyConfig } from '../types';
import { formatCurrency, convertToRef } from '../utils/formatters';
import { exportSalesToCSV, exportSalesToPDF } from '../utils/exportUtils';
import {
  History,
  X,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  currency: CurrencyConfig;
  company: CompanyConfig;
  onViewTicket: (sale: Sale, action?: 'print' | 'whatsapp' | 'none') => void;
}

type DateFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
  isOpen,
  onClose,
  sales,
  currency,
  company,
  onViewTicket,
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Filtered sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter((s) => {
      // Date filter
      const saleTime = new Date(s.fecha).getTime();
      if (dateFilter === 'TODAY' && saleTime < todayStart) return false;
      if (dateFilter === 'WEEK' && saleTime < weekStart) return false;
      if (dateFilter === 'MONTH' && saleTime < monthStart) return false;

      // Payment filter
      if (paymentFilter !== 'ALL' && s.pago?.metodo !== paymentFilter) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchTicket = s.numeroTicket.toLowerCase().includes(term);
      const matchClient = s.cliente?.nombre?.toLowerCase().includes(term) || s.cliente?.docId?.toLowerCase().includes(term);
      const matchVendor = s.vendedorNombre.toLowerCase().includes(term);
      const matchItem = s.items.some((it) => it.producto.nombre.toLowerCase().includes(term));

      return matchTicket || matchClient || matchVendor || matchItem;
    });
  }, [sales, dateFilter, paymentFilter, searchTerm]);

  // Aggregate Metrics
  const { totalRevenuePrimary, totalRevenueRef, totalItemsCount, avgTicket } = useMemo(() => {
    let revP = 0;
    let revR = 0;
    let items = 0;

    filteredSales.forEach((s) => {
      revP += s.totalPrincipal;
      revR += s.totalReferencia;
      items += s.items.reduce((sum, it) => sum + it.cantidad, 0);
    });

    const avg = filteredSales.length > 0 ? revP / filteredSales.length : 0;

    return {
      totalRevenuePrimary: revP,
      totalRevenueRef: revR,
      totalItemsCount: items,
      avgTicket: avg,
    };
  }, [filteredSales]);

  const dateFilterLabels: Record<DateFilter, string> = {
    TODAY: 'Ventas de Hoy',
    WEEK: 'Últimos 7 Días',
    MONTH: 'Este Mes',
    ALL: 'Todo el Historial',
  };

  const handleExportCSV = () => {
    exportSalesToCSV(filteredSales, currency, company);
  };

  const handleExportPDF = () => {
    exportSalesToPDF(filteredSales, currency, company, dateFilterLabels[dateFilter]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base leading-tight truncate">
                Historial de Ventas & Facturación
              </h2>
              <p className="text-[11px] text-slate-300 truncate font-mono">
                {company.nombre} • RIF: {company.rif}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredSales.length === 0}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
              title="Descargar historial filtrado en archivo Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {/* PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={filteredSales.length === 0}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
              title="Descargar reporte formal en archivo PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Financial Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Total Facturado</span>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
              {formatCurrency(totalRevenuePrimary, currency.monedaPrincipal)}
            </div>
            <div className="text-[10.5px] text-emerald-700 font-mono font-semibold">
              Ref: {formatCurrency(totalRevenueRef, currency.monedaReferencia)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Ventas Registradas</span>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
              {filteredSales.length} Tickets
            </div>
            <div className="text-[10.5px] text-slate-500">
              {totalItemsCount} unidades vendidas
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Ticket Promedio</span>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
              {formatCurrency(avgTicket, currency.monedaPrincipal)}
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              Ref: {formatCurrency(convertToRef(avgTicket, currency.tasaCambio), currency.monedaReferencia)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Tasa de Cambio</span>
            <div className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono mt-0.5">
              {currency.tasaCambio.toFixed(2)} {currency.monedaReferencia.codigo}
            </div>
            <div className="text-[10.5px] text-slate-500">
              Base: 1 {currency.monedaPrincipal.codigo}
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ticket, cliente, RIF o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100/90 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none transition shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Range Chips */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 md:pb-0 scrollbar-none">
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as DateFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                  dateFilter === f
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'ALL' && 'Todo'}
                {f === 'TODAY' && 'Hoy'}
                {f === 'WEEK' && 'Última Semana'}
                {f === 'MONTH' && 'Este Mes'}
              </button>
            ))}
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:bg-white focus:outline-none"
          >
            <option value="ALL">Todos los métodos de pago</option>
            <option value="EFECTIVO_PRINCIPAL">Efectivo ({currency.monedaPrincipal.codigo})</option>
            <option value="EFECTIVO_REFERENCIA">Efectivo ({currency.monedaReferencia.codigo})</option>
            <option value="PAGO_MOVIL_TRANSFERENCIA">Pago Móvil / Transf.</option>
            <option value="TARJETA">Tarjeta / Punto</option>
            <option value="MIXTO">Pago Mixto</option>
          </select>
        </div>

        {/* Sales List Table */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 p-3 sm:p-4">
          {filteredSales.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
              <Receipt className="w-12 h-12 mb-3 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron ventas</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                No hay transacciones que coincidan con los filtros de búsqueda o fecha seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSales.map((sale) => {
                const dateObj = new Date(sale.fecha);
                const dateFormatted = dateObj.toLocaleDateString('es-VE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const timeFormatted = dateObj.toLocaleTimeString('es-VE', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const totalItems = sale.items.reduce((acc, it) => acc + it.cantidad, 0);

                return (
                  <div
                    key={sale.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Ticket info, Customer, Time */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {sale.numeroTicket}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {dateFormatted} {timeFormatted}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          {sale.estado}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <span className="truncate max-w-[200px]">
                          {sale.cliente?.nombre || 'Consumidor Final'}
                        </span>
                        {sale.cliente?.docId && (
                          <span className="text-slate-400 text-[11px] font-mono">
                            ({sale.cliente.docId})
                          </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 text-[11px]">
                          Vendedor: {sale.vendedorNombre}
                        </span>
                      </div>

                      {/* Items Preview */}
                      <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                        {sale.items
                          .map((it) => `${it.cantidad}x ${it.producto.nombre}${it.variante ? ` (${it.variante.nombre})` : ''}`)
                          .join(', ')}
                      </p>
                    </div>

                    {/* Right: Amounts & Ticket Action */}
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                          {formatCurrency(sale.totalPrincipal, currency.monedaPrincipal)}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700 font-mono leading-tight">
                          {formatCurrency(sale.totalReferencia, currency.monedaReferencia)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewTicket(sale, 'print')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="Imprimir ticket de venta"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ticket</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewTicket(sale, 'whatsapp')}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-emerald-200"
                          title="Compartir ticket por WhatsApp"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando {filteredSales.length} de {sales.length} ventas totales
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
