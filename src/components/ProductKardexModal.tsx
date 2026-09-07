import React, { useState } from 'react';
import { Product, InventoryMovement, CurrencyConfig } from '../types';
import { db } from '../services/db';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  SlidersHorizontal,
  Check,
  AlertCircle,
  Package,
  Calendar,
  User as UserIcon,
  FileText,
} from 'lucide-react';

interface ProductKardexModalProps {
  product: Product;
  currency: CurrencyConfig;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
}

export const ProductKardexModal: React.FC<ProductKardexModalProps> = ({
  product,
  currency,
  isOpen,
  onClose,
  canManage,
}) => {
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [newStock, setNewStock] = useState(product.stockActual.toString());
  const [motive, setMotive] = useState('Conteo físico y conciliación periódica');
  const [adjustError, setAdjustError] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');

  if (!isOpen) return null;

  const movements = db.getProductMovements(product.id);
  const isDecimal = ['KG', 'LTS', 'MTS'].includes(product.unidadMedida);

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError('');
    setAdjustSuccess('');

    const targetStock = isDecimal ? parseFloat(newStock) : parseInt(newStock, 10);
    if (isNaN(targetStock) || targetStock < 0) {
      setAdjustError('Ingrese un valor de stock válido (número igual o mayor a 0).');
      return;
    }

    if (!motive.trim()) {
      setAdjustError('Debe especificar un motivo justificado para el ajuste de inventario.');
      return;
    }

    try {
      db.adjustInventory(product.id, targetStock, motive.trim());
      setAdjustSuccess(`Stock ajustado exitosamente a ${targetStock} ${product.unidadMedida}.`);
      setShowAdjustForm(false);
      setTimeout(() => setAdjustSuccess(''), 3500);
    } catch (err: any) {
      setAdjustError(err?.message || 'Error al ajustar el inventario.');
    }
  };

  const getBadgeStyle = (tipo: InventoryMovement['tipo']) => {
    switch (tipo) {
      case 'ENTRADA_COMPRA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SALIDA_VENTA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'AJUSTE_POSITIVO':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'AJUSTE_NEGATIVO':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DEVOLUCION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBadgeIcon = (tipo: InventoryMovement['tipo']) => {
    switch (tipo) {
      case 'ENTRADA_COMPRA':
      case 'AJUSTE_POSITIVO':
        return <TrendingUp className="w-3 h-3 text-emerald-600" />;
      case 'SALIDA_VENTA':
      case 'AJUSTE_NEGATIVO':
        return <TrendingDown className="w-3 h-3 text-rose-600" />;
      case 'DEVOLUCION':
        return <RotateCcw className="w-3 h-3 text-amber-600" />;
      default:
        return <History className="w-3 h-3 text-slate-500" />;
    }
  };

  const getTipoLabel = (tipo: InventoryMovement['tipo']) => {
    switch (tipo) {
      case 'ENTRADA_COMPRA':
        return 'Entrada / Compra';
      case 'SALIDA_VENTA':
        return 'Venta Registrada';
      case 'AJUSTE_POSITIVO':
        return 'Ajuste Positivo (+)';
      case 'AJUSTE_NEGATIVO':
        return 'Ajuste Negativo (-)';
      case 'DEVOLUCION':
        return 'Devolución de Venta';
      default:
        return tipo;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Kardex de Auditoría & Movimientos
              </h3>
              <p className="text-xs text-slate-500">
                {product.nombre} • SKU: <span className="font-mono text-slate-700 font-semibold">{product.codigoBarras}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Snapshot Bar */}
        <div className="bg-emerald-50/40 border-b border-emerald-100/70 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Stock Actual</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {product.stockActual} {product.unidadMedida}
              </span>
            </div>
            <div className="h-6 w-px bg-emerald-200/60" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Stock Mínimo</span>
              <span className="font-medium text-slate-700 font-mono">
                {product.stockMinimo} {product.unidadMedida}
              </span>
            </div>
            <div className="h-6 w-px bg-emerald-200/60" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Precio de Venta</span>
              <span className="font-bold text-emerald-700 font-mono">
                {formatCurrency(product.precioVenta, currency.monedaPrincipal)}
              </span>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setShowAdjustForm((prev) => !prev);
                setNewStock(product.stockActual.toString());
                setAdjustError('');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAdjustForm ? 'Cerrar Ajuste' : 'Ajustar Stock Manual'}
            </button>
          )}
        </div>

        {/* Notification alerts */}
        {adjustSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {adjustSuccess}
          </div>
        )}

        {adjustError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            {adjustError}
          </div>
        )}

        {/* Manual Stock Adjustment Form Accordion */}
        {showAdjustForm && canManage && (
          <form
            onSubmit={handleAdjustStock}
            className="m-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
          >
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              Ajuste Rápido de Inventario Físico
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nuevo Stock Físico ({product.unidadMedida}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step={isDecimal ? '0.01' : '1'}
                  required
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo Justificado del Ajuste *
                </label>
                <input
                  type="text"
                  required
                  value={motive}
                  onChange={(e) => setMotive(e.target.value)}
                  placeholder="Ej. Conteo físico, merma por rotura, corrección..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustForm(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Registrar Ajuste en Kardex
              </button>
            </div>
          </form>
        )}

        {/* Movements History List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Histórico de Entradas, Salidas y Ajustes ({movements.length})</span>
            <span className="text-[11px] font-normal text-slate-400">Orden cronológico descendente</span>
          </div>

          {movements.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No hay movimientos registrados para este producto todavía.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Las ventas, compras y ajustes manuales se listarán automáticamente aquí.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((mov) => (
                <div
                  key={mov.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 mt-0.5">
                      {getBadgeIcon(mov.tipo)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getBadgeStyle(mov.tipo)}`}>
                          {getTipoLabel(mov.tipo)}
                        </span>
                        {mov.referenciaDoc && (
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            Ref: {mov.referenciaDoc}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        {mov.motivo}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(mov.fecha)}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {mov.usuarioNombre}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                    <span
                      className={`text-sm font-mono font-bold ${
                        mov.tipo === 'ENTRADA_COMPRA' || mov.tipo === 'AJUSTE_POSITIVO' || mov.tipo === 'DEVOLUCION'
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {mov.tipo === 'ENTRADA_COMPRA' || mov.tipo === 'AJUSTE_POSITIVO' || mov.tipo === 'DEVOLUCION' ? '+' : '-'}
                      {mov.cantidad} {product.unidadMedida}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Saldo: {mov.stockAnterior} → <strong className="text-slate-700">{mov.stockPosterior}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-slate-500 text-[11px]">
            Auditoría inmutable registrada automáticamente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
