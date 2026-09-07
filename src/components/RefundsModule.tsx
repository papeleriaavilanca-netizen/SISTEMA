import React, { useState, useMemo } from 'react';
import { Refund, Sale, RefundItem, CurrencyConfig } from '../types';
import { db } from '../services/db';
import { formatCurrency, convertToRef } from '../utils/formatters';
import { RotateCcw, Search, Check, AlertCircle, FileText, Printer, Plus } from 'lucide-react';

interface RefundsModuleProps {
  refunds: Refund[];
  sales: Sale[];
  currency: CurrencyConfig;
  canManage: boolean;
}

export const RefundsModule: React.FC<RefundsModuleProps> = ({
  refunds,
  sales,
  currency,
  canManage,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [motivo, setMotivo] = useState('');
  const [formError, setFormError] = useState('');

  const openModal = () => {
    setSelectedSale(null);
    setTicketSearch('');
    setReturnItems({});
    setMotivo('');
    setFormError('');
    setShowModal(true);
  };

  const handleSelectSale = (s: Sale) => {
    setSelectedSale(s);
    const initialCounts: { [productId: string]: number } = {};
    s.items.forEach((it) => {
      initialCounts[it.producto.id] = 1; // Default to 1 unit to return
    });
    setReturnItems(initialCounts);
    setFormError('');
  };

  const handleItemCountChange = (productId: string, maxQty: number, val: number) => {
    const clamped = Math.max(0, Math.min(maxQty, val));
    setReturnItems((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  // Calculate total refund amount
  const { totalReembolsoPrincipal, totalReembolsoRef, refundPayloadItems } = useMemo(() => {
    if (!selectedSale) {
      return { totalReembolsoPrincipal: 0, totalReembolsoRef: 0, refundPayloadItems: [] };
    }

    const payload: RefundItem[] = [];
    let sum = 0;

    selectedSale.items.forEach((it) => {
      const qty = returnItems[it.producto.id] || 0;
      if (qty > 0) {
        const itemRefund = Number((qty * it.precioUnitario).toFixed(2));
        sum += itemRefund;
        payload.push({
          productoId: it.producto.id,
          productoNombre: it.producto.nombre,
          cantidad: qty,
          precioUnitario: it.precioUnitario,
          totalReembolso: itemRefund,
        });
      }
    });

    const sumRef = convertToRef(sum, selectedSale.tasaCambioAplicada);
    return {
      totalReembolsoPrincipal: Number(sum.toFixed(2)),
      totalReembolsoRef: sumRef,
      refundPayloadItems: payload,
    };
  }, [selectedSale, returnItems]);

  const handleSubmitRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) {
      setFormError('Debe seleccionar una venta válida para procesar la devolución.');
      return;
    }
    if (refundPayloadItems.length === 0) {
      setFormError('Debe seleccionar al menos 1 producto para devolver.');
      return;
    }
    if (!motivo.trim()) {
      setFormError('El motivo de la devolución es estrictamente obligatorio.');
      return;
    }

    db.recordRefund({
      ventaId: selectedSale.id,
      numeroTicket: selectedSale.numeroTicket,
      items: refundPayloadItems,
      totalPrincipal: totalReembolsoPrincipal,
      totalReferencia: totalReembolsoRef,
      motivo: motivo.trim(),
      clienteNombre: selectedSale.cliente?.nombre,
    });

    setShowModal(false);
  };

  // Filter sales for the search dialog
  const matchingSales = useMemo(() => {
    if (!ticketSearch.trim()) return sales.slice(0, 10);
    const term = ticketSearch.toLowerCase();
    return sales.filter(
      (s) =>
        s.numeroTicket.toLowerCase().includes(term) ||
        (s.cliente?.nombre && s.cliente.nombre.toLowerCase().includes(term))
    );
  }, [sales, ticketSearch]);

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-600" />
            Devoluciones & Notas de Crédito
          </h2>
          <p className="text-xs text-slate-500">
            Procesa devoluciones de clientes con reingreso automático al inventario y generación de nota fiscal.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Devolución
          </button>
        )}
      </div>

      {/* Refunds History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3.5">N° Nota Crédito</th>
                <th className="px-4 py-3.5">Ticket Origen</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Ítems Devueltos</th>
                <th className="px-4 py-3.5">Motivo Justificado</th>
                <th className="px-4 py-3.5">Reintegro ({currency.monedaPrincipal.simbolo})</th>
                <th className="px-4 py-3.5">Autorizado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No hay devoluciones registradas hasta el momento.
                  </td>
                </tr>
              ) : (
                refunds.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-red-600">{ref.numeroNotaCredito}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{ref.numeroTicket}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(ref.fecha).toLocaleString('es-VE')}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{ref.clienteNombre || 'Cliente General'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {ref.items.map((it, i) => (
                        <div key={i} className="text-[11px]">
                          {it.cantidad}x {it.productoNombre}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{ref.motivo}</td>
                    <td className="px-4 py-3 font-mono font-bold text-red-600">
                      {formatCurrency(ref.totalPrincipal, currency.monedaPrincipal)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{ref.usuarioNombre}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Process Refund */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-600" />
                Procesar Devolución de Venta
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRefund} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}

              {!selectedSale ? (
                /* Step 1: Select Sale Ticket */
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Buscar Venta o Ticket a Devolver:
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nro de ticket (ej. TKT-000001) o cliente..."
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {matchingSales.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No hay ventas registradas que coincidan con la búsqueda.
                      </p>
                    ) : (
                      matchingSales.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSale(s)}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50/40 cursor-pointer flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <div className="font-bold text-slate-800 font-mono">{s.numeroTicket}</div>
                            <div className="text-slate-500 text-[11px]">
                              {new Date(s.fecha).toLocaleString('es-VE')} • {s.cliente?.nombre || 'General'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-600 font-mono">
                              {formatCurrency(s.totalPrincipal, currency.monedaPrincipal)}
                            </div>
                            <div className="text-[10px] text-slate-400">{s.items.length} productos</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Step 2: Select Items and Reason */
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500">Ticket Seleccionado: </span>
                      <strong className="text-slate-900 font-mono">{selectedSale.numeroTicket}</strong>
                      <span className="text-slate-500 ml-2">
                        ({new Date(selectedSale.fecha).toLocaleDateString('es-VE')})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSale(null)}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Cambiar Venta
                    </button>
                  </div>

                  {/* Items in Sale */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Seleccionar Cantidades a Retornar al Inventario:
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedSale.items.map((it) => {
                        const count = returnItems[it.producto.id] || 0;
                        return (
                          <div
                            key={it.producto.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{it.producto.nombre}</div>
                              <div className="text-[10px] text-slate-500">
                                Comprado: {it.cantidad} unids • Precio: {formatCurrency(it.precioUnitario, currency.monedaPrincipal)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[11px]">Devolver:</span>
                              <input
                                type="number"
                                min="0"
                                max={it.cantidad}
                                value={count}
                                onChange={(e) =>
                                  handleItemCountChange(it.producto.id, it.cantidad, parseInt(e.target.value) || 0)
                                }
                                className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Motivo de la Devolución (Obligatorio) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Ej. Defecto de fábrica / Error en talla o modelo / Cliente insatisfecho"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* Refund Total Box */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-red-700">Total Reintegro al Cliente:</span>
                    <div className="text-right">
                      <div className="text-base font-bold text-red-600 font-mono">
                        {formatCurrency(totalReembolsoPrincipal, currency.monedaPrincipal)}
                      </div>
                      <div className="text-xs text-red-500 font-mono">
                        {formatCurrency(totalReembolsoRef, currency.monedaReferencia)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Emitir Nota de Crédito & Reintegrar
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
