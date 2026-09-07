import React, { useState, useRef } from 'react';
import { Product, ProductVariant, CurrencyConfig } from '../types';
import { db } from '../services/db';
import { formatCurrency, convertToRef, calculateProfitMargin } from '../utils/formatters';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Barcode,
  Check,
  AlertCircle,
  TrendingUp,
  Tag,
  Layers,
  Info,
} from 'lucide-react';

interface ProductVariantsManagerModalProps {
  product: Product;
  currency: CurrencyConfig;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_PHOTOS = [
  {
    label: 'Tinta Negra',
    url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Tinta Azul',
    url: 'https://images.unsplash.com/photo-1585336261026-77884a0d922f?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Tinta Roja',
    url: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Tinta Verde',
    url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Memoria USB',
    url: 'https://images.unsplash.com/photo-1618410320928-25228d811631?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Cuaderno',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
  },
];

export const ProductVariantsManagerModal: React.FC<ProductVariantsManagerModalProps> = ({
  product,
  currency,
  isOpen,
  onClose,
}) => {
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState('');
  const [precioVenta, setPrecioVenta] = useState(product.precioVenta.toFixed(2));
  const [precioCompra, setPrecioCompra] = useState(product.precioCompra.toFixed(2));
  const [codigoBarras, setCodigoBarras] = useState('');
  const [stock, setStock] = useState('10');
  const [stockMinimo, setStockMinimo] = useState('3');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentVariants = product.variantes || [];

  const resetForm = () => {
    setEditingVariantId(null);
    setNombre('');
    setDescripcion('');
    setFoto('');
    setPrecioVenta(product.precioVenta.toFixed(2));
    setPrecioCompra(product.precioCompra.toFixed(2));
    setCodigoBarras('');
    setStock('10');
    setStockMinimo('3');
    setErrorMsg('');
  };

  const handleEditClick = (v: ProductVariant) => {
    setEditingVariantId(v.id);
    setNombre(v.nombre);
    setDescripcion(v.descripcion || '');
    setFoto(v.foto || '');
    setPrecioVenta(v.precio.toFixed(2));
    setPrecioCompra(v.precioCompra !== undefined ? v.precioCompra.toFixed(2) : product.precioCompra.toFixed(2));
    setCodigoBarras(v.codigoBarras || '');
    setStock(v.stock.toString());
    setStockMinimo((v.stockMinimo || 3).toString());
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateSku = () => {
    const slug = nombre
      ? nombre.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')
      : 'VAR';
    const rand = Math.floor(100 + Math.random() * 900);
    setCodigoBarras(`${product.codigoBarras}-${slug}-${rand}`);
  };

  // Image upload handling: File Reader Data URL
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor seleccione un archivo de imagen válido (PNG, JPG, WebP, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setFoto(result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la variante es obligatorio (ej. Color Azul, Talla L, 64GB).');
      return;
    }

    const salePriceNum = parseFloat(precioVenta);
    if (isNaN(salePriceNum) || salePriceNum <= 0) {
      setErrorMsg('El precio de venta debe ser un número mayor a 0.');
      return;
    }

    const costPriceNum = parseFloat(precioCompra) || 0;
    const isDecimal = ['KG', 'LTS', 'MTS'].includes(product.unidadMedida);
    const stockNum = isDecimal ? parseFloat(stock) || 0 : parseInt(stock, 10) || 0;
    const stockMinNum = isDecimal ? parseFloat(stockMinimo) || 0 : parseInt(stockMinimo, 10) || 0;

    const variantId = editingVariantId || 'var-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const sku = codigoBarras.trim() || `${product.codigoBarras}-V${currentVariants.length + 1}`;

    const barcodeCheck = db.isBarcodeAvailable(sku, undefined, editingVariantId || undefined);
    if (!barcodeCheck.available) {
      setErrorMsg(`El código de barras / SKU "${sku}" ya está en uso por ${barcodeCheck.conflictWith}. Ingrese un código único.`);
      return;
    }

    const margin = costPriceNum > 0 ? calculateProfitMargin(costPriceNum, salePriceNum) : 0;

    const variantPayload: ProductVariant = {
      id: variantId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      foto: foto.trim() || undefined,
      precio: salePriceNum,
      precioCompra: costPriceNum > 0 ? costPriceNum : undefined,
      porcentajeGanancia: margin,
      codigoBarras: sku,
      stock: stockNum,
      stockMinimo: stockMinNum,
      activo: true,
    };

    try {
      db.saveProductVariant(product.id, variantPayload);
      setSuccessMsg(editingVariantId ? '¡Variante actualizada correctamente!' : '¡Variante agregada con éxito!');
      setTimeout(() => setSuccessMsg(''), 3000);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la variante.');
    }
  };

  const handleDeleteVariant = (variant: ProductVariant) => {
    if (confirm(`¿Eliminar la variante "${variant.nombre}"? Esta acción no se puede deshacer.`)) {
      db.deleteProductVariant(product.id, variant.id);
      if (editingVariantId === variant.id) {
        resetForm();
      }
    }
  };

  const parsedSalePrice = parseFloat(precioVenta) || 0;
  const parsedCostPrice = parseFloat(precioCompra) || 0;
  const liveMargin = parsedCostPrice > 0 ? calculateProfitMargin(parsedCostPrice, parsedSalePrice) : 0;
  const refSalePrice = convertToRef(parsedSalePrice, currency.tasaCambio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Variantes de Producto: <span className="text-emerald-700">{product.nombre}</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {currentVariants.length} {currentVariants.length === 1 ? 'Variante' : 'Variantes'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Código Base: {product.codigoBarras} | Precio Base:{' '}
                {formatCurrency(product.precioVenta, currency.monedaPrincipal)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Form Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800">
                  {editingVariantId ? 'Editar Variante de Producto' : 'Agregar Nueva Variante al Producto'}
                </h4>
              </div>
              {editingVariantId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                >
                  Cancelar edición y crear nueva
                </button>
              )}
            </div>

            <form onSubmit={handleSaveVariant} className="space-y-4">
              {/* Row 1: Name, SKU, Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre o Atributo de la Variante *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Tinta Azul 0.7mm, Color Rojo, Talla M, 128GB"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">SKU / Código Variante</label>
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="text-[10px] text-emerald-600 hover:underline font-bold"
                    >
                      Generar SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    placeholder="Ej. 759100-AZUL"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock ({product.unidadMedida})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={['KG', 'LTS', 'MTS'].includes(product.unidadMedida) ? '0.01' : '1'}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Photo Upload & Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Foto / Imagen de la Variante
                </label>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Dropzone & File Input */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`md:col-span-6 border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[90px] ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-300 hover:border-emerald-400 bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <p className="text-xs font-medium text-slate-700">
                      Arrastra una foto aquí o <span className="text-emerald-600 font-bold underline">examina</span>
                    </p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, WebP (soporte offline inmediato)</p>
                  </div>

                  {/* Direct URL input & Presets */}
                  <div className="md:col-span-6 space-y-2">
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="url"
                        value={foto}
                        onChange={(e) => setFoto(e.target.value)}
                        placeholder="O pega URL de imagen (https://...)"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium mr-1.5">Presets Rápidos:</span>
                      <div className="inline-flex flex-wrap gap-1">
                        {PRESET_PHOTOS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setFoto(preset.url)}
                            className="text-[10px] bg-slate-200 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 px-2 py-0.5 rounded-md font-medium transition"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo Preview if exists */}
                {foto && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 w-fit">
                    <img
                      src={foto}
                      alt="Vista previa variante"
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-100"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Foto seleccionada</p>
                      <button
                        type="button"
                        onClick={() => setFoto('')}
                        className="text-[11px] text-rose-600 hover:underline font-semibold"
                      >
                        Quitar foto
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción Detallada de la Variante (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Tinta gel ultranítida de secado rápido, acabado mate antideslizante, fabricado en Japón..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Row 4: Pricing and Profit Margins */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Precio de Venta ({currency.monedaPrincipal.simbolo}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                      ≈ {formatCurrency(refSalePrice, currency.monedaReferencia)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Costo Unitario ({currency.monedaPrincipal.simbolo})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioCompra}
                      onChange={(e) => setPrecioCompra(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Margen: <strong>{liveMargin.toFixed(1)}%</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Stock Mínimo ({product.unidadMedida})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={['KG', 'LTS', 'MTS'].includes(product.unidadMedida) ? '0.01' : '1'}
                      value={stockMinimo}
                      onChange={(e) => setStockMinimo(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Alerta de reposición</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {editingVariantId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingVariantId ? 'Guardar Cambios de Variante' : '+ Guardar Nueva Variante'}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Variants List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                Variantes Registradas para este Producto ({currentVariants.length})
              </h4>
            </div>

            {currentVariants.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400">
                <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">Este producto aún no tiene variantes registradas.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Completa el formulario superior para añadir colores, capacidades, tamaños o empaques.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentVariants.map((variant) => {
                  const isLow = variant.stock <= (variant.stockMinimo || 3);
                  const isOut = variant.stock <= 0;
                  const varRefPrice = convertToRef(variant.precio, currency.tasaCambio);

                  return (
                    <div
                      key={variant.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-emerald-300 transition flex gap-3 relative group shadow-2xs"
                    >
                      {/* Photo Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                        {variant.foto ? (
                          <img
                            src={variant.foto}
                            alt={variant.nombre}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h5 className="text-xs font-bold text-slate-900 truncate">{variant.nombre}</h5>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              isOut
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            Stock: {variant.stock}
                          </span>
                        </div>

                        {variant.codigoBarras && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            SKU: {variant.codigoBarras}
                          </span>
                        )}

                        {variant.descripcion && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-snug">
                            {variant.descripcion}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <div className="font-mono">
                            <span className="text-xs font-black text-emerald-700">
                              {formatCurrency(variant.precio, currency.monedaPrincipal)}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              ({formatCurrency(varRefPrice, currency.monedaReferencia)})
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditClick(variant)}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded transition"
                              title="Editar esta variante"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(variant)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                              title="Eliminar esta variante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            Las variantes se sincronizan automáticamente con el catálogo y terminal TPV.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
