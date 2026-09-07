import React, { useState, useMemo, useRef } from 'react';
import { Product, ProductVariant, Category, Tax, CurrencyConfig } from '../types';
import { db } from '../services/db';
import { ProductVariantsManagerModal } from './ProductVariantsManagerModal';
import { ProductKardexModal } from './ProductKardexModal';
import {
  formatCurrency,
  calculateProfitMargin,
  calculatePriceFromMargin,
  convertToRef,
} from '../utils/formatters';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  TrendingUp,
  Percent,
  Layers,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Tag,
  History,
  Copy,
  Download,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  DollarSign,
} from 'lucide-react';

interface ProductsModuleProps {
  products: Product[];
  categories: Category[];
  taxes: Tax[];
  currency: CurrencyConfig;
  canManage: boolean;
}

type StockFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
type SortOption = 'NAME_ASC' | 'NAME_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_ASC' | 'STOCK_DESC';

export const ProductsModule: React.FC<ProductsModuleProps> = ({
  products,
  categories,
  taxes,
  currency,
  canManage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NAME_ASC');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  const [kardexModalProduct, setKardexModalProduct] = useState<Product | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  const [actionSuccess, setActionSuccess] = useState('');

  // Form State
  const [nombre, setNombre] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precioCompra, setPrecioCompra] = useState('0');
  const [precioVenta, setPrecioVenta] = useState('0');
  const [porcentajeGanancia, setPorcentajeGanancia] = useState('0');
  const [impuestoId, setImpuestoId] = useState('');
  const [stockActual, setStockActual] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('5');
  const [unidadMedida, setUnidadMedida] = useState('UND');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState('');
  const [activo, setActivo] = useState(true);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTaxes = useMemo(() => taxes.filter((t) => t.activo), [taxes]);
  const defaultTax = useMemo(
    () => activeTaxes.find((t) => t.esPredeterminado) || activeTaxes[0] || taxes[0],
    [activeTaxes, taxes]
  );

  const isDecimalUnit = useMemo(() => ['KG', 'LTS', 'MTS'].includes(unidadMedida), [unidadMedida]);

  // Inventory KPI Metrics
  const metrics = useMemo(() => {
    let totalStock = 0;
    let totalVariants = 0;
    let totalCostVal = 0;
    let totalSaleVal = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let activeCount = 0;

    for (const p of products) {
      if (p.activo) activeCount++;
      totalStock += p.stockActual;
      totalVariants += p.variantes?.length || 0;
      totalCostVal += (p.precioCompra || 0) * (p.stockActual || 0);
      totalSaleVal += (p.precioVenta || 0) * (p.stockActual || 0);

      if (p.stockActual <= 0) {
        outOfStock++;
      } else if (p.stockActual <= p.stockMinimo) {
        lowStock++;
      }
    }

    return {
      totalProducts: products.length,
      activeCount,
      inactiveCount: products.length - activeCount,
      totalStock,
      totalVariants,
      totalCostVal,
      totalSaleVal,
      potentialProfit: Math.max(0, totalSaleVal - totalCostVal),
      lowStock,
      outOfStock,
    };
  }, [products]);

  const toggleExpandProduct = (id: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleProductImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Por favor seleccione un archivo de imagen válido (PNG, JPG, WebP, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFoto(event.target.result as string);
        setFormError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setNombre('');
    setCodigoBarras('759' + Math.floor(100000000 + Math.random() * 900000000));
    setCategoriaId(categories[0]?.id || '');
    setPrecioCompra('1.00');
    setPrecioVenta('1.50');
    setPorcentajeGanancia('50.00');
    setImpuestoId(defaultTax?.id || '');
    setStockActual('10');
    setStockMinimo('5');
    setUnidadMedida('UND');
    setDescripcion('');
    setFoto('');
    setActivo(true);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setNombre(p.nombre);
    setCodigoBarras(p.codigoBarras);
    setCategoriaId(p.categoriaId);
    setPrecioCompra(p.precioCompra.toString());
    setPrecioVenta(p.precioVenta.toString());
    setPorcentajeGanancia(p.porcentajeGanancia.toString());
    setImpuestoId(p.impuestoId);
    setStockActual(p.stockActual.toString());
    setStockMinimo(p.stockMinimo.toString());
    setUnidadMedida(p.unidadMedida || 'UND');
    setDescripcion(p.descripcion || '');
    setFoto(p.foto || '');
    setActivo(p.activo !== false);
    setFormError('');
    setShowModal(true);
  };

  // Profit Margin Auto Calculations
  const handleCostChange = (val: string) => {
    setPrecioCompra(val);
    const cost = parseFloat(val) || 0;
    const margin = parseFloat(porcentajeGanancia) || 0;
    if (cost > 0) {
      const newSale = calculatePriceFromMargin(cost, margin);
      setPrecioVenta(newSale.toFixed(2));
    }
  };

  const handleSalePriceChange = (val: string) => {
    setPrecioVenta(val);
    const sale = parseFloat(val) || 0;
    const cost = parseFloat(precioCompra) || 0;
    if (cost > 0) {
      const margin = calculateProfitMargin(cost, sale);
      setPorcentajeGanancia(margin.toFixed(2));
    }
  };

  const handleMarginChange = (val: string) => {
    setPorcentajeGanancia(val);
    const margin = parseFloat(val) || 0;
    const cost = parseFloat(precioCompra) || 0;
    if (cost > 0) {
      const newSale = calculatePriceFromMargin(cost, margin);
      setPrecioVenta(newSale.toFixed(2));
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nombre.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }

    const trimmedBarcode = codigoBarras.trim();
    if (!trimmedBarcode) {
      setFormError('El código de barras / SKU no puede estar vacío.');
      return;
    }

    // Uniqueness validation against other products and variants
    const barcodeCheck = db.isBarcodeAvailable(trimmedBarcode, editingProduct?.id);
    if (!barcodeCheck.available) {
      setFormError(
        `El código de barras o SKU "${trimmedBarcode}" ya se encuentra asignado a: ${barcodeCheck.conflictWith}. Ingrese o genere un código único.`
      );
      return;
    }

    const costNum = parseFloat(precioCompra) || 0;
    const saleNum = parseFloat(precioVenta) || 0;
    if (costNum < 0) {
      setFormError('El precio de compra (costo) no puede ser negativo.');
      return;
    }
    if (saleNum <= 0) {
      setFormError('El precio de venta debe ser un número mayor a 0.');
      return;
    }

    const isDec = ['KG', 'LTS', 'MTS'].includes(unidadMedida);
    const stockActualNum = isDec ? parseFloat(stockActual) || 0 : parseInt(stockActual, 10) || 0;
    const stockMinimoNum = isDec ? parseFloat(stockMinimo) || 0 : parseInt(stockMinimo, 10) || 0;

    if (stockActualNum < 0) {
      setFormError('El stock actual no puede ser negativo.');
      return;
    }
    if (stockMinimoNum < 0) {
      setFormError('El stock mínimo de alerta no puede ser negativo.');
      return;
    }

    const marginNum = costNum > 0 ? calculateProfitMargin(costNum, saleNum) : 0;

    const productPayload: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      nombre: nombre.trim(),
      codigoBarras: trimmedBarcode,
      categoriaId: categoriaId || categories[0]?.id || 'cat-gen',
      precioCompra: costNum,
      precioVenta: saleNum,
      porcentajeGanancia: marginNum,
      impuestoId: impuestoId || defaultTax?.id || 'tax-1',
      stockActual: stockActualNum,
      stockMinimo: stockMinimoNum,
      unidadMedida: unidadMedida.trim() || 'UND',
      activo,
      creadoEn: editingProduct ? editingProduct.creadoEn : new Date().toISOString(),
      descripcion: descripcion.trim() || undefined,
      foto: foto.trim() || undefined,
      variantes: editingProduct?.variantes || [],
    };

    db.saveProduct(productPayload);
    setActionSuccess(
      editingProduct
        ? `Producto "${productPayload.nombre}" actualizado correctamente.`
        : `Producto "${productPayload.nombre}" registrado exitosamente.`
    );
    setTimeout(() => setActionSuccess(''), 3500);
    setShowModal(false);
  };

  const handleToggleActive = (p: Product) => {
    const newState = db.toggleProductStatus(p.id);
    setActionSuccess(`Producto "${p.nombre}" marcado como ${newState ? 'ACTIVO' : 'INACTIVO'}.`);
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const handleDuplicateProduct = (p: Product) => {
    try {
      const copy = db.duplicateProduct(p.id);
      setActionSuccess(`Producto duplicado con éxito: "${copy.nombre}" (SKU: ${copy.codigoBarras}).`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      alert(err?.message || 'Error al duplicar el producto.');
    }
  };

  const handleDeleteProduct = (p: Product) => {
    const msg =
      p.stockActual > 0
        ? `ATENCIÓN: El producto "${p.nombre}" tiene ${p.stockActual} ${p.unidadMedida} en stock. ¿Está seguro de eliminarlo completamente del catálogo?`
        : `¿Está seguro de eliminar el producto "${p.nombre}" del catálogo?`;

    if (confirm(msg)) {
      db.deleteProduct(p.id);
      setActionSuccess(`Producto "${p.nombre}" eliminado del catálogo.`);
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  // Export products to CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;

    const headers = [
      'ID',
      'Codigo / SKU',
      'Nombre',
      'Categoria',
      'Unidad',
      'P. Compra',
      '% Margen',
      'P. Venta',
      'Stock Actual',
      'Stock Minimo',
      'Estado',
      'Variantes',
    ];

    const rows = filtered.map((p) => {
      const cat = categories.find((c) => c.id === p.categoriaId)?.nombre || 'Sin categoría';
      return [
        p.id,
        `"${p.codigoBarras}"`,
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${cat}"`,
        p.unidadMedida,
        p.precioCompra.toFixed(2),
        p.porcentajeGanancia.toFixed(2),
        p.precioVenta.toFixed(2),
        p.stockActual,
        p.stockMinimo,
        p.activo ? 'ACTIVO' : 'INACTIVO',
        p.variantes?.length || 0,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Catalogo_Productos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and Sort products
  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      const matchCat = selectedCat === 'ALL' || p.categoriaId === selectedCat;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.nombre.toLowerCase().includes(term) ||
        p.codigoBarras.toLowerCase().includes(term) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(term)) ||
        (p.variantes && p.variantes.some((v) => v.nombre.toLowerCase().includes(term) || (v.codigoBarras && v.codigoBarras.toLowerCase().includes(term))));

      let matchStock = true;
      if (stockFilter === 'ACTIVE') matchStock = p.activo;
      else if (stockFilter === 'INACTIVE') matchStock = !p.activo;
      else if (stockFilter === 'LOW_STOCK') matchStock = p.stockActual <= p.stockMinimo && p.stockActual > 0;
      else if (stockFilter === 'OUT_OF_STOCK') matchStock = p.stockActual <= 0;

      return matchCat && matchSearch && matchStock;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'NAME_ASC':
          return a.nombre.localeCompare(b.nombre);
        case 'NAME_DESC':
          return b.nombre.localeCompare(a.nombre);
        case 'PRICE_ASC':
          return a.precioVenta - b.precioVenta;
        case 'PRICE_DESC':
          return b.precioVenta - a.precioVenta;
        case 'STOCK_ASC':
          return a.stockActual - b.stockActual;
        case 'STOCK_DESC':
          return b.stockActual - a.stockActual;
        default:
          return 0;
      }
    });

    return result;
  }, [products, selectedCat, searchTerm, stockFilter, sortBy]);

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Catálogo Maestro de Productos & Kardex
          </h2>
          <p className="text-xs text-slate-500">
            Control de altas, bajas, modificaciones de precios, márgenes de ganancia, variantes y trazabilidad de inventario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            title="Descargar lista en formato CSV / Excel"
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Exportar CSV
          </button>

          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Catálogo</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono">{metrics.totalProducts}</span>
            <span className="text-[10px] text-slate-400 font-medium">({metrics.activeCount} activos)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Variantes Activas</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-teal-700 font-mono">{metrics.totalVariants}</span>
            <span className="text-[10px] text-slate-400">en inventario</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Inversión (Al Costo)</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-slate-800 font-mono">
              {formatCurrency(metrics.totalCostVal, currency.monedaPrincipal)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Valorización Venta</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-emerald-700 font-mono">
              {formatCurrency(metrics.totalSaleVal, currency.monedaPrincipal)}
            </span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Alertas de Stock</span>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setStockFilter(stockFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
                className={`text-xs font-bold px-2 py-0.5 rounded-md border transition ${
                  stockFilter === 'LOW_STOCK'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
                title="Filtrar productos con stock bajo"
              >
                {metrics.lowStock} Bajo
              </button>
              <button
                type="button"
                onClick={() => setStockFilter(stockFilter === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')}
                className={`text-xs font-bold px-2 py-0.5 rounded-md border transition ${
                  stockFilter === 'OUT_OF_STOCK'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
                title="Filtrar productos agotados"
              >
                {metrics.outOfStock} Agotados
              </button>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código de barra, descripción o variante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs flex-shrink-0"
            >
              <option value="ALL">Todas las Categorías ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs flex-shrink-0"
            >
              <option value="NAME_ASC">Nombre (A-Z)</option>
              <option value="NAME_DESC">Nombre (Z-A)</option>
              <option value="PRICE_ASC">Precio: Menor a Mayor</option>
              <option value="PRICE_DESC">Precio: Mayor a Menor</option>
              <option value="STOCK_ASC">Stock: Menor a Mayor</option>
              <option value="STOCK_DESC">Stock: Mayor a Menor</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Estado:
          </span>

          <button
            type="button"
            onClick={() => setStockFilter('ALL')}
            className={`px-3 py-1 rounded-xl font-semibold text-xs transition ${
              stockFilter === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Todos ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('ACTIVE')}
            className={`px-3 py-1 rounded-xl font-semibold text-xs transition ${
              stockFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            Activos ({metrics.activeCount})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('LOW_STOCK')}
            className={`px-3 py-1 rounded-xl font-semibold text-xs transition ${
              stockFilter === 'LOW_STOCK'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
            }`}
          >
            Bajo Stock ({metrics.lowStock})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('OUT_OF_STOCK')}
            className={`px-3 py-1 rounded-xl font-semibold text-xs transition ${
              stockFilter === 'OUT_OF_STOCK'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
            }`}
          >
            Agotados ({metrics.outOfStock})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('INACTIVE')}
            className={`px-3 py-1 rounded-xl font-semibold text-xs transition ${
              stockFilter === 'INACTIVE'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
            }`}
          >
            Inactivos ({metrics.inactiveCount})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Código / Barra</th>
                <th className="px-4 py-3.5">Nombre & Categoría</th>
                <th className="px-4 py-3.5">P. Compra (Costo)</th>
                <th className="px-4 py-3.5">% Margen</th>
                <th className="px-4 py-3.5">P. Venta ({currency.monedaPrincipal.simbolo})</th>
                <th className="px-4 py-3.5">P. Venta ({currency.monedaReferencia.simbolo})</th>
                <th className="px-4 py-3.5">Impuesto</th>
                <th className="px-4 py-3.5">Stock</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                {canManage && <th className="px-4 py-3.5 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 10 : 9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No se encontraron productos coincidentes con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoriaId);
                  const tax = taxes.find((t) => t.id === p.impuestoId);
                  const priceRef = convertToRef(p.precioVenta, currency.tasaCambio);
                  const isLow = p.stockActual <= p.stockMinimo && p.stockActual > 0;
                  const isOut = p.stockActual <= 0;
                  const variantsCount = p.variantes?.length || 0;
                  const isExpanded = expandedProductIds.has(p.id);

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`hover:bg-slate-50 transition border-b border-slate-100 ${
                          !p.activo ? 'bg-slate-50/60 opacity-75' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 font-semibold">
                          {p.codigoBarras}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {p.foto ? (
                                <img
                                  src={p.foto}
                                  alt={p.nombre}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{p.nombre}</span>
                                {!p.activo && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-600">
                                    INACTIVO
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {cat?.nombre || 'Sin categoría'}
                                </span>
                                {variantsCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandProduct(p.id)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md transition"
                                    title="Ver o gestionar variantes"
                                  >
                                    <Sparkles className="w-3 h-3 text-emerald-600" />
                                    <span>
                                      {variantsCount} {variantsCount === 1 ? 'variante' : 'variantes'}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">
                          {formatCurrency(p.precioCompra, currency.monedaPrincipal)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <TrendingUp className="w-3 h-3" />
                            {p.porcentajeGanancia.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 font-mono text-sm">
                          {formatCurrency(p.precioVenta, currency.monedaPrincipal)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-500 font-mono">
                          {formatCurrency(priceRef, currency.monedaReferencia)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                            {tax ? `${tax.nombre} (${tax.porcentaje}%)` : 'Exento'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
                              isOut
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {p.stockActual} {p.unidadMedida}
                          </span>
                        </td>

                        {/* Status Toggle Button in Table */}
                        <td className="px-4 py-3 text-center">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(p)}
                              title={p.activo ? 'Clic para Desactivar del catálogo' : 'Clic para Activar en catálogo'}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition border ${
                                p.activo
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.activo ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                p.activo
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-300'
                              }`}
                            >
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          )}
                        </td>

                        {canManage && (
                          <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => setVariantModalProduct(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                              title="Gestionar o agregar variantes a este producto"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Variante</span>
                            </button>

                            <button
                              onClick={() => setKardexModalProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                              title="Ver Kardex / Historial de Movimientos y Ajuste de Stock"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDuplicateProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                              title="Clonar / Duplicar ficha de producto"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                              title="Editar producto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Expandable Variants Sub-panel */}
                      {isExpanded && variantsCount > 0 && (
                        <tr className="bg-slate-50/75 border-b border-slate-200">
                          <td colSpan={canManage ? 10 : 9} className="p-3.5 pl-12">
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-bold text-slate-800">
                                    Variantes registradas ({variantsCount})
                                  </span>
                                </div>
                                {canManage && (
                                  <button
                                    onClick={() => setVariantModalProduct(p)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-2xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Gestionar / Agregar Variante
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {p.variantes?.map((v) => {
                                  const varRefPrice = convertToRef(v.precio, currency.tasaCambio);
                                  return (
                                    <div
                                      key={v.id}
                                      className="border border-slate-200 rounded-lg p-2.5 flex items-start gap-2.5 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition"
                                    >
                                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {v.foto ? (
                                          <img
                                            src={v.foto}
                                            alt={v.nombre}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <ImageIcon className="w-5 h-5 text-slate-300" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-xs text-slate-800 truncate">
                                          {v.nombre}
                                        </div>
                                        {v.codigoBarras && (
                                          <div className="text-[10px] font-mono text-slate-400">
                                            SKU: {v.codigoBarras}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="font-bold text-emerald-700 font-mono text-xs">
                                            {formatCurrency(v.precio, currency.monedaPrincipal)}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            ({formatCurrency(varRefPrice, currency.monedaReferencia)})
                                          </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                              v.stock <= 0
                                                ? 'bg-red-50 text-red-700 border border-red-200'
                                                : v.stock <= (v.stockMinimo || 3)
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            }`}
                                          >
                                            Stock: {v.stock}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Estado del Producto en Catálogo
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Si está inactivo, no aparecerá disponible para ventas en la caja TPV
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivo((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                    activo
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {activo ? 'Activo (Visible)' : 'Inactivo (Oculto)'}
                </button>
              </div>

              {/* Name & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Cuaderno Espiral Carta 100 Hojas"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Código / Barra *</label>
                    <button
                      type="button"
                      onClick={() => setCodigoBarras('759' + Math.floor(100000000 + Math.random() * 900000000))}
                      className="text-[10px] text-emerald-600 hover:underline font-bold"
                    >
                      Generar EAN
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    placeholder="759..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              {/* Category & Unit of Measure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="UND">Unidad (UND)</option>
                    <option value="CAJA">Caja (CAJA)</option>
                    <option value="PQT">Paquete (PQT)</option>
                    <option value="KG">Kilogramos (KG - permite decimales)</option>
                    <option value="LTS">Litros (LTS - permite decimales)</option>
                    <option value="MTS">Metros (MTS - permite decimales)</option>
                  </select>
                </div>
              </div>

              {/* Description & Photo */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descripción del Producto (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Detalles de marca, especificaciones, gramaje..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Foto / Imagen del Producto (Opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleProductImageFile}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir Imagen
                    </button>
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="url"
                        value={foto}
                        onChange={(e) => setFoto(e.target.value)}
                        placeholder="O pega URL de imagen (https://...)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    {foto && (
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                          <img
                            src={foto}
                            alt="Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFoto('')}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Eliminar foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {editingProduct && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Variantes de este producto ({editingProduct.variantes?.length || 0})
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Administra fotos, colores, capacidades, precios y stock individual
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setVariantModalProduct(editingProduct);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Gestionar Variantes
                    </button>
                  </div>
                )}
              </div>

              {/* AUTOMATIC PROFIT CALCULATION BOX */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Cálculo Inteligente de Margen y Precios
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Cambia cualquier campo y los demás se actualizarán al instante
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Precio de Compra (Costo) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400">
                        {currency.monedaPrincipal.simbolo}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={precioCompra}
                        onChange={(e) => handleCostChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      % Margen de Ganancia
                    </label>
                    <div className="relative">
                      <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                      <input
                        type="number"
                        step="0.1"
                        value={porcentajeGanancia}
                        onChange={(e) => handleMarginChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-emerald-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Precio de Venta Final *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400">
                        {currency.monedaPrincipal.simbolo}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={precioVenta}
                        onChange={(e) => handleSalePriceChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs text-emerald-600 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time Reference Calculation Preview */}
                <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-xs">
                  <div className="text-slate-600">
                    Ganancia Unitaria:{' '}
                    <strong className="text-emerald-700">
                      {formatCurrency(
                        Math.max(0, (parseFloat(precioVenta) || 0) - (parseFloat(precioCompra) || 0)),
                        currency.monedaPrincipal
                      )}
                    </strong>
                  </div>
                  <div className="text-slate-600">
                    Equivalente en {currency.monedaReferencia.codigo}:{' '}
                    <strong className="text-slate-800 font-mono font-bold">
                      {formatCurrency(
                        convertToRef(parseFloat(precioVenta) || 0, currency.tasaCambio),
                        currency.monedaReferencia
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* IVA Selection & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IVA / Impuesto Aplicable *
                  </label>
                  <select
                    value={impuestoId}
                    onChange={(e) => setImpuestoId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {activeTaxes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} ({t.porcentaje}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock {editingProduct ? 'Actual' : 'Inicial'} ({unidadMedida})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={isDecimalUnit ? '0.01' : '1'}
                    value={stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={isDecimalUnit ? '0.01' : '1'}
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Variants Management Modal */}
      {variantModalProduct && (
        <ProductVariantsManagerModal
          product={products.find((p) => p.id === variantModalProduct.id) || variantModalProduct}
          currency={currency}
          isOpen={!!variantModalProduct}
          onClose={() => setVariantModalProduct(null)}
        />
      )}

      {/* Product Kardex Audit & Movement History Modal */}
      {kardexModalProduct && (
        <ProductKardexModal
          product={products.find((p) => p.id === kardexModalProduct.id) || kardexModalProduct}
          currency={currency}
          isOpen={!!kardexModalProduct}
          onClose={() => setKardexModalProduct(null)}
          canManage={canManage}
        />
      )}
    </div>
  );
};
