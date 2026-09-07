import React, { useState, useMemo } from 'react';
import { Product, InventoryMovement, CurrencyConfig, Category, CompanyConfig } from '../types';
import { db } from '../services/db';
import { formatCurrency, convertToRef } from '../utils/formatters';
import {
  exportInventoryToCSV,
  exportInventoryToPDF,
  exportMovementsToCSV,
  exportMovementsToPDF,
} from '../utils/exportUtils';
import {
  Boxes,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  Search,
  Check,
  X,
  History,
  FileSpreadsheet,
  FileText,
  Printer,
  Layers,
} from 'lucide-react';

interface InventoryModuleProps {
  products: Product[];
  categories?: Category[];
  company?: CompanyConfig;
  movements: InventoryMovement[];
  currency: CurrencyConfig;
  canManage: boolean;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  categories,
  company,
  movements,
  currency,
  canManage,
}) => {
  const currentCategories = categories || db.getCategories();
  const currentCompany = company || db.getCompany();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'KARDEX'>('STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Manual Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockInput, setNewStockInput] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');

  // Financial metrics
  const { totalUnits, totalCostVal, totalSalesVal, potentialProfit, lowStockCount, outOfStockCount } =
    useMemo(() => {
      let units = 0;
      let costVal = 0;
      let salesVal = 0;
      let low = 0;
      let out = 0;

      products.forEach((p) => {
        units += p.stockActual;
        costVal += p.stockActual * p.precioCompra;
        salesVal += p.stockActual * p.precioVenta;
        if (p.stockActual <= 0) out++;
        else if (p.stockActual <= p.stockMinimo) low++;
      });

      return {
        totalUnits: units,
        totalCostVal: costVal,
        totalSalesVal: salesVal,
        potentialProfit: salesVal - costVal,
        lowStockCount: low,
        outOfStockCount: out,
      };
    }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        p.nombre.toLowerCase().includes(term) ||
        p.codigoBarras.toLowerCase().includes(term);

      if (stockFilter === 'OUT') return matchSearch && p.stockActual <= 0;
      if (stockFilter === 'LOW') return matchSearch && p.stockActual > 0 && p.stockActual <= p.stockMinimo;
      return matchSearch;
    });
  }, [products, searchTerm, stockFilter]);

  // Open adjustment modal
  const openAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setNewStockInput(p.stockActual.toString());
    setAdjustReason('');
    setAdjustError('');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const qty = parseInt(newStockInput);
    if (isNaN(qty) || qty < 0) {
      setAdjustError('Ingrese una cantidad válida mayor o igual a 0.');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('Debe ingresar un motivo obligatorio para el ajuste de auditoría.');
      return;
    }

    try {
      db.adjustInventory(adjustingProduct.id, qty, adjustReason.trim());
      setAdjustingProduct(null);
    } catch (err: any) {
      setAdjustError(err.message || 'Error al ajustar inventario');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            Control de Inventario & Kardex
          </h2>
          <p className="text-xs text-slate-500">
            Monitorea existencias en tiempo real, valorización económica y trazabilidad de movimientos.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('STOCK')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'STOCK' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Existencias & Alertas
          </button>
          <button
            onClick={() => setActiveTab('KARDEX')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'KARDEX' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Kardex ({movements.length})
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Cost Value */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] text-slate-400 font-medium">Valor a Costo Total</span>
          <div className="text-lg font-bold text-slate-800 mt-1">
            {formatCurrency(totalCostVal, currency.monedaPrincipal)}
          </div>
          <div className="text-[10.5px] text-slate-500">
            Ref: {formatCurrency(convertToRef(totalCostVal, currency.tasaCambio), currency.monedaReferencia)}
          </div>
        </div>

        {/* Projected Sales Value */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] text-slate-400 font-medium">Valor Proyectado Venta</span>
          <div className="text-lg font-bold text-emerald-600 mt-1">
            {formatCurrency(totalSalesVal, currency.monedaPrincipal)}
          </div>
          <div className="text-[10.5px] text-slate-500">
            Ganancia Potencial: {formatCurrency(potentialProfit, currency.monedaPrincipal)}
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] text-slate-400 font-medium">Total Unidades Físicas</span>
          <div className="text-lg font-bold text-slate-800 mt-1">
            {totalUnits.toLocaleString('es-VE')} Unidades
          </div>
          <div className="text-[10.5px] text-slate-500">En {products.length} productos registrados</div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] text-slate-400 font-medium">Alertas de Reposición</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold text-amber-600">{lowStockCount} Bajos</span>
            <span className="text-slate-300">•</span>
            <span className="text-lg font-bold text-red-600">{outOfStockCount} Agotados</span>
          </div>
          <div className="text-[10.5px] text-slate-500">Requieren reposición de compra</div>
        </div>
      </div>

      {activeTab === 'STOCK' ? (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar en inventario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStockFilter('ALL')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  stockFilter === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('LOW')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1 ${
                  stockFilter === 'LOW'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                Stock Bajo ({lowStockCount})
              </button>
              <button
                onClick={() => setStockFilter('OUT')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1 ${
                  stockFilter === 'OUT'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                Agotados ({outOfStockCount})
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Export Buttons */}
              <button
                type="button"
                onClick={() => exportInventoryToCSV(filteredProducts, currentCategories, currency, currentCompany)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Exportar listado actual a formato CSV / Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportInventoryToPDF(
                    filteredProducts,
                    currentCategories,
                    currency,
                    currentCompany,
                    stockFilter === 'ALL' ? 'Todos los Productos' : stockFilter === 'LOW' ? 'Stock Bajo' : 'Agotados'
                  )
                }
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Descargar reporte formal de inventario en PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3.5">Código</th>
                    <th className="px-4 py-3.5">Producto</th>
                    <th className="px-4 py-3.5">Stock Actual</th>
                    <th className="px-4 py-3.5">Stock Mínimo</th>
                    <th className="px-4 py-3.5">Costo Unitario</th>
                    <th className="px-4 py-3.5">Valorización Total</th>
                    <th className="px-4 py-3.5">Estado</th>
                    {canManage && <th className="px-4 py-3.5 text-right">Ajuste</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No hay productos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isOut = p.stockActual <= 0;
                      const isLow = p.stockActual <= p.stockMinimo && !isOut;
                      const valTotal = p.stockActual * p.precioCompra;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{p.codigoBarras}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            <div>{p.nombre}</div>
                            {p.variantes && p.variantes.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                  <Layers className="w-2.5 h-2.5" />
                                  {p.variantes.length} variantes:
                                </span>
                                {p.variantes.map((v) => (
                                  <span
                                    key={v.id}
                                    className="text-[9.5px] font-normal bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono"
                                  >
                                    {v.nombre}:{' '}
                                    <strong className={v.stock <= 0 ? 'text-red-600' : v.stock <= (v.stockMinimo || 2) ? 'text-amber-600' : 'text-slate-900'}>
                                      {v.stock}
                                    </strong>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-sm text-slate-900">
                              {p.stockActual} {p.unidadMedida}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.stockMinimo} {p.unidadMedida}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {formatCurrency(p.precioCompra, currency.monedaPrincipal)}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-600 font-mono">
                            {formatCurrency(valTotal, currency.monedaPrincipal)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isOut
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}
                            >
                              {isOut ? 'Agotado' : isLow ? 'Stock Crítico' : 'Disponible'}
                            </span>
                          </td>
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => openAdjustModal(p)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition border border-slate-200"
                              >
                                Ajustar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* KARDEX MOVEMENTS */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Libro de Movimientos de Inventario (Kardex Auditado)</span>
              <span className="text-xs font-normal text-slate-500">({movements.length} movimientos)</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => exportMovementsToCSV(movements, products, currentCompany)}
                disabled={movements.length === 0}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Exportar Kardex a CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Kardex CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportMovementsToPDF(movements, products, currentCompany)}
                disabled={movements.length === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Exportar Kardex a PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Kardex PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-3">Fecha & Hora</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Tipo Movimiento</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3 text-center">Previo → Posterior</th>
                  <th className="px-4 py-3">Motivo / Documento</th>
                  <th className="px-4 py-3">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No hay registros de movimientos aún.
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => {
                    const isPositive =
                      mov.tipo === 'ENTRADA_COMPRA' ||
                      mov.tipo === 'AJUSTE_POSITIVO' ||
                      mov.tipo === 'DEVOLUCION';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                          {new Date(mov.fecha).toLocaleString('es-VE')}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{mov.productoNombre}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              mov.tipo === 'ENTRADA_COMPRA'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : mov.tipo === 'SALIDA_VENTA'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : mov.tipo === 'DEVOLUCION'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : mov.tipo === 'AJUSTE_POSITIVO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {mov.tipo.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold font-mono">
                          <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                            {isPositive ? `+${mov.cantidad}` : `-${mov.cantidad}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">
                          {mov.stockAnterior} →{' '}
                          <span className="font-bold text-slate-800">{mov.stockPosterior}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{mov.motivo}</div>
                          {mov.referenciaDoc && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Ref: {mov.referenciaDoc}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px] font-medium">{mov.usuarioNombre}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                Ajuste Manual de Inventario
              </h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-800">{adjustingProduct.nombre}</div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Stock Actual en Sistema:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {adjustingProduct.stockActual} {adjustingProduct.unidadMedida}
                </span>
              </div>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl font-medium">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nuevo Conteo Físico Real *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo Obligatorio de Ajuste *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. Conteo físico de fin de mes / Merma / Rotura justificada"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Registrar en Kardex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
