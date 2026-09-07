import React from 'react';
import { Product, ProductVariant, CurrencyConfig } from '../types';
import { formatCurrency, convertToRef } from '../utils/formatters';
import {
  Layers,
  X,
  Plus,
  Minus,
  Package,
  CheckCircle2,
  AlertCircle,
  Barcode,
  ShoppingCart,
} from 'lucide-react';

interface VariantSelectorModalProps {
  product: Product;
  currency: CurrencyConfig;
  isOpen?: boolean;
  onClose: () => void;
  onSelectVariant: (variant: ProductVariant) => void;
  onDecreaseVariant?: (variant: ProductVariant) => void;
  cartQuantitiesByVariantId?: Record<string, number>;
}

export const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
  product,
  currency,
  isOpen = true,
  onClose,
  onSelectVariant,
  onDecreaseVariant,
  cartQuantitiesByVariantId = {},
}) => {
  if (!isOpen) return null;

  const variants = (product.variantes || []).filter((v) => v.activo !== false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate">
                Seleccionar Variante
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {product.nombre}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product summary banner */}
        <div className="px-5 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-3">
          {product.foto ? (
            <img
              src={product.foto}
              alt={product.nombre}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-emerald-200 flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wide block">
              Producto Base
            </span>
            <div className="text-xs font-bold text-slate-900 truncate">
              {product.nombre}
            </div>
            {product.descripcion && (
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {product.descripcion}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-slate-400 block font-medium">Opciones</span>
            <span className="text-xs font-bold text-emerald-700">
              {variants.length} disponibles
            </span>
          </div>
        </div>

        {/* Variants List */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
          {variants.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No hay variantes activas registradas para este producto.</p>
            </div>
          ) : (
            variants.map((v) => {
              const inCartQty = cartQuantitiesByVariantId[v.id] || 0;
              const isOutOfStock = v.stock <= 0;
              const isMaxInCart = inCartQty >= v.stock;
              const priceRef = convertToRef(v.precio, currency.tasaCambio);

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (!isOutOfStock && !isMaxInCart) {
                      onSelectVariant(v);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all flex items-center gap-3.5 cursor-pointer select-none ${
                    isOutOfStock
                      ? 'bg-slate-50/80 border-slate-200 opacity-60 cursor-not-allowed'
                      : isMaxInCart
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-sm'
                  }`}
                >
                  {/* Variant Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative">
                    {v.foto ? (
                      <img
                        src={v.foto}
                        alt={v.nombre}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    {inCartQty > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                        {inCartQty}
                      </span>
                    )}
                  </div>

                  {/* Variant Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                        {v.nombre}
                      </h4>
                      {isOutOfStock && (
                        <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9.5px] font-bold rounded">
                          Agotado
                        </span>
                      )}
                      {inCartQty > 0 && (
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9.5px] font-bold rounded inline-flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          En Carrito ({inCartQty})
                        </span>
                      )}
                    </div>

                    {v.descripcion && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {v.descripcion}
                      </p>
                    )}

                    <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-slate-400 font-mono">
                      {v.codigoBarras && (
                        <span className="flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          {v.codigoBarras}
                        </span>
                      )}
                      <span>•</span>
                      <span className={v.stock <= (v.stockMinimo || 2) ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                        Stock disponible: {v.stock}
                      </span>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                    <div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                        {formatCurrency(v.precio, currency.monedaPrincipal)}
                      </div>
                      <div className="text-[10.5px] font-semibold text-emerald-700 font-mono leading-tight">
                        {formatCurrency(priceRef, currency.monedaReferencia)}
                      </div>
                    </div>

                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                        {onDecreaseVariant && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDecreaseVariant(v);
                            }}
                            className="w-7 h-7 rounded-md bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 flex items-center justify-center transition border border-slate-200/80 shadow-2xs"
                            title="Disminuir cantidad en carrito"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="px-2 text-xs font-bold text-slate-900 font-mono select-none">
                          {inCartQty}
                        </span>
                        <button
                          type="button"
                          disabled={isOutOfStock || isMaxInCart}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock && !isMaxInCart) {
                              onSelectVariant(v);
                            }
                          }}
                          className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition shadow-2xs"
                          title="Aumentar cantidad en carrito"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isOutOfStock || isMaxInCart}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock && !isMaxInCart) {
                            onSelectVariant(v);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isMaxInCart ? 'Máx Stock' : 'Agregar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Haz clic sobre cualquier variante para agregarla directamente a la venta.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
