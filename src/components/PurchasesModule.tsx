import React, { useState } from 'react';
import { Purchase, Product, PurchaseItem, CurrencyConfig } from '../types';
import { db } from '../services/db';
import { formatCurrency, convertToRef } from '../utils/formatters';
import { Truck, Plus, Check, Trash2, Calendar, FileText, Building2, AlertCircle } from 'lucide-react';

interface PurchasesModuleProps {
  purchases: Purchase[];
  products: Product[];
  currency: CurrencyConfig;
  canManage: boolean;
}

export const PurchasesModule: React.FC<PurchasesModuleProps> = ({
  purchases,
  products,
  currency,
  canManage,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Form State
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [proveedorDocId, setProveedorDocId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notas, setNotas] = useState('');
  const [formError, setFormError] = useState('');

  // Line Item selector
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || '');
  const [lineQty, setLineQty] = useState('1');
  const [lineCost, setLineCost] = useState('1.00');

  const openCreateModal = () => {
    setProveedorNombre('');
    setProveedorDocId('');
    setNumeroFactura('FAC-' + Math.floor(100000 + Math.random() * 900000));
    setItems([]);
    setNotas('');
    setFormError('');
    if (products.length > 0) {
      setSelectedProdId(products[0].id);
      setLineCost(products[0].precioCompra.toString());
    }
    setShowModal(true);
  };

  const handleProductSelectionChange = (prodId: string) => {
    setSelectedProdId(prodId);
    const p = products.find((x) => x.id === prodId);
    if (p) {
      setLineCost(p.precioCompra.toString());
    }
  };

  const handleAddItem = () => {
    const qty = parseInt(lineQty) || 0;
    const cost = parseFloat(lineCost) || 0;
    if (qty <= 0 || cost < 0) return;

    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const subtotal = Number((qty * cost).toFixed(2));
    const newItem: PurchaseItem = {
      productoId: prod.id,
      productoNombre: prod.nombre,
      cantidad: qty,
      costoUnitario: cost,
      subtotal,
      total: subtotal,
    };

    setItems((prev) => [...prev, newItem]);
    setLineQty('1');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPrincipal = items.reduce((acc, it) => acc + it.total, 0);
  const totalReferencia = convertToRef(totalPrincipal, currency.tasaCambio);

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorNombre.trim()) {
      setFormError('El nombre del proveedor es obligatorio.');
      return;
    }
    if (!numeroFactura.trim()) {
      setFormError('El número de factura es obligatorio.');
      return;
    }
    if (items.length === 0) {
      setFormError('Debe agregar al menos un producto a la compra.');
      return;
    }

    db.recordPurchase({
      numeroFactura: numeroFactura.trim(),
      proveedorNombre: proveedorNombre.trim(),
      proveedorDocId: proveedorDocId.trim() || 'J-00000000-0',
      items,
      totalPrincipal,
      totalReferencia,
      tasaCambio: currency.tasaCambio,
      notas: notas.trim() || undefined,
    });

    setShowModal(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Compras a Proveedores & Recepción de Mercancía
          </h2>
          <p className="text-xs text-slate-500">
            Registra facturas de entrada con incremento automático de existencias y actualización de costos.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Registrar Compra
          </button>
        )}
      </div>

      {/* Purchases List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3.5">N° Factura</th>
                <th className="px-4 py-3.5">Proveedor & Doc</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Artículos</th>
                <th className="px-4 py-3.5">Total ({currency.monedaPrincipal.simbolo})</th>
                <th className="px-4 py-3.5">Total ({currency.monedaReferencia.simbolo})</th>
                <th className="px-4 py-3.5">Comprador</th>
                <th className="px-4 py-3.5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se han registrado compras aún. Registre la primera orden con el botón superior.
                  </td>
                </tr>
              ) : (
                purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{pur.numeroFactura}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{pur.proveedorNombre}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{pur.proveedorDocId}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(pur.fecha).toLocaleDateString('es-VE')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {pur.items.reduce((acc, it) => acc + it.cantidad, 0)} unidades ({pur.items.length} ítems)
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600 font-mono">
                      {formatCurrency(pur.totalPrincipal, currency.monedaPrincipal)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-500 font-mono">
                      {formatCurrency(pur.totalReferencia, currency.monedaReferencia)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium">{pur.usuarioNombre}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedPurchase(pur)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition border border-slate-200"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Purchase */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                Registrar Factura de Compra a Proveedor
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}

              {/* Supplier Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proveedor (Razón Social) *
                  </label>
                  <input
                    type="text"
                    required
                    value={proveedorNombre}
                    onChange={(e) => setProveedorNombre(e.target.value)}
                    placeholder="Ej. Distribuidora Papelera Nacional C.A."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RIF / NIT Proveedor
                  </label>
                  <input
                    type="text"
                    value={proveedorDocId}
                    onChange={(e) => setProveedorDocId(e.target.value)}
                    placeholder="J-12345678-0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  N° de Factura de Compra *
                </label>
                <input
                  type="text"
                  required
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="FAC-009182"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Line Item Input Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Agregar Producto a la Factura:</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] text-slate-600 mb-1">Producto</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelectionChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (Stock actual: {p.stockActual})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Costo Unit ({currency.monedaPrincipal.simbolo})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={lineCost}
                      onChange={(e) => setLineCost(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      + Añadir
                    </button>
                  </div>
                </div>

                {/* Items Table in Modal */}
                {items.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{it.productoNombre}</div>
                          <div className="text-[10px] text-slate-500">
                            {it.cantidad} unids x {formatCurrency(it.costoUnitario, currency.monedaPrincipal)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600 font-mono">
                            {formatCurrency(it.total, currency.monedaPrincipal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Total de la Factura:</span>
                <div className="text-right">
                  <div className="text-base font-bold text-emerald-600">
                    {formatCurrency(totalPrincipal, currency.monedaPrincipal)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {formatCurrency(totalReferencia, currency.monedaReferencia)}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Guardar & Cargar a Inventario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                Detalle Factura #{selectedPurchase.numeroFactura}
              </h3>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="text-xs space-y-1 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div><strong>Proveedor:</strong> {selectedPurchase.proveedorNombre}</div>
              <div><strong>RIF:</strong> {selectedPurchase.proveedorDocId}</div>
              <div><strong>Fecha:</strong> {new Date(selectedPurchase.fecha).toLocaleString('es-VE')}</div>
              <div><strong>Registrado por:</strong> {selectedPurchase.usuarioNombre}</div>
            </div>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {selectedPurchase.items.map((it, i) => (
                <div key={i} className="py-2 flex justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{it.productoNombre}</div>
                    <div className="text-slate-400 text-[10px]">
                      {it.cantidad} x {formatCurrency(it.costoUnitario, currency.monedaPrincipal)}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatCurrency(it.total, currency.monedaPrincipal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between text-xs font-bold text-emerald-700">
              <span>Total Comprado:</span>
              <span>{formatCurrency(selectedPurchase.totalPrincipal, currency.monedaPrincipal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
