import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Product,
  ProductVariant,
  Category,
  CartItem,
  Tax,
  CompanyConfig,
  CurrencyConfig,
  Sale,
  ClientData,
  PaymentDetails,
  User,
} from '../types';
import { db } from '../services/db';
import { formatCurrency, convertToRef, convertToPrimary } from '../utils/formatters';
import { VariantSelectorModal } from './VariantSelectorModal';
import { SalesHistoryModal } from './SalesHistoryModal';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Smartphone,
  Layers,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  UserCheck,
  Percent,
  Printer,
  MessageSquare,
  User as UserIcon,
  Phone,
  ChevronDown,
  X,
  Check,
  RefreshCw,
  Clock,
  Sparkles,
  Package,
  Columns,
  Table,
  LayoutGrid,
  History,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

interface POSModuleProps {
  company: CompanyConfig;
  currency: CurrencyConfig;
  products: Product[];
  categories: Category[];
  taxes: Tax[];
  users?: User[];
  currentUser?: User;
  sales?: Sale[];
  onSaleCompleted: (sale: Sale, action?: 'print' | 'whatsapp' | 'none') => void;
}

export const POSModule: React.FC<POSModuleProps> = ({
  company,
  currency,
  products,
  categories,
  taxes,
  users = [],
  currentUser,
  sales,
  onSaleCompleted,
}) => {
  const currentSales = sales || db.getSales();
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Variant Selection Modal State
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<Product | null>(null);

  // Unique identifier for items in cart (distinguishes variants of the same product)
  const getCartItemKey = (item: CartItem): string => {
    return item.variante ? `${item.producto.id}_var_${item.variante.id}` : item.producto.id;
  };

  // Map of quantities in cart per variant ID
  const cartQuantitiesByVariantId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      if (item.variante) {
        map[item.variante.id] = (map[item.variante.id] || 0) + item.cantidad;
      }
    }
    return map;
  }, [cart]);

  // POS Navigation and Layout Modes
  const [posTab, setPosTab] = useState<'catalogo' | 'venta'>('catalogo');
  const [desktopLayout, setDesktopLayout] = useState<'split' | 'catalogo' | 'venta'>('split');
  const [cartViewMode, setCartViewMode] = useState<'tabla' | 'tarjetas'>('tabla');

  // Search input ref for quick autofocus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active Seller selection
  const activeUser = currentUser || db.getCurrentUser();
  const [selectedVendorId, setSelectedVendorId] = useState<string>(activeUser.id);

  const selectedVendor = useMemo(() => {
    return users.find((u) => u.id === selectedVendorId) || activeUser;
  }, [users, selectedVendorId, activeUser]);

  // Client Data for ticket
  const [client, setClient] = useState<ClientData>({
    nombre: 'Consumidor Final',
    docId: 'V-00000000',
    telefono: '',
  });

  // Client Modal search / form state
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState<ClientData>({
    nombre: '',
    docId: '',
    telefono: '',
    direccion: '',
    email: '',
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentDetails['metodo']>('EFECTIVO_PRINCIPAL');
  const [amountPaidPrimary, setAmountPaidPrimary] = useState<string>('');
  const [amountPaidRef, setAmountPaidRef] = useState<string>('');
  const [referenceCode, setReferenceCode] = useState<string>('');

  // Frequent / Saved clients list
  const recentClients = useMemo(() => {
    return db.getRecentClients();
  }, [showClientModal, showCheckoutModal]);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return recentClients;
    const term = clientSearchTerm.toLowerCase();
    return recentClients.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        c.docId.toLowerCase().includes(term) ||
        (c.telefono && c.telefono.toLowerCase().includes(term))
    );
  }, [recentClients, clientSearchTerm]);

  // Tax lookup
  const taxMap = useMemo(() => {
    const map = new Map<string, Tax>();
    taxes.forEach((t) => map.set(t.id, t));
    return map;
  }, [taxes]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.activo) return false;
      const matchCat = selectedCategory === 'ALL' || p.categoriaId === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.nombre.toLowerCase().includes(term) ||
        p.codigoBarras.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Show transient feedback notification
  const triggerFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 2000);
  };

  // Add to cart (with optional specific variant)
  const addToCart = (product: Product, variant?: ProductVariant) => {
    // If product has variants and no specific variant was passed, open the variant picker modal
    if (!variant && product.variantes && product.variantes.length > 0) {
      setVariantSelectionProduct(product);
      return;
    }

    const availableStock = variant ? variant.stock : product.stockActual;
    if (availableStock <= 0) {
      triggerFeedback(
        variant
          ? `❌ Variante "${variant.nombre}" agotada`
          : `❌ ${product.nombre} no tiene stock disponible`
      );
      return;
    }

    setCart((prevCart) => {
      const targetKey = variant ? `${product.id}_var_${variant.id}` : product.id;
      const existing = prevCart.find((item) => getCartItemKey(item) === targetKey);
      const tax = taxMap.get(product.impuestoId) || {
        id: 'default',
        nombre: 'Exento',
        porcentaje: 0,
        activo: true,
        esPredeterminado: false,
      };

      const maxStock = availableStock;
      const unitPrice = variant ? variant.precio : product.precioVenta;
      const itemTitle = variant ? `${product.nombre} (${variant.nombre})` : product.nombre;

      if (existing) {
        if (existing.cantidad >= maxStock) {
          triggerFeedback(`⚠️ Stock máximo alcanzado (${maxStock} unidades)`);
          return prevCart;
        }
        const newQty = existing.cantidad + 1;
        const subtotal = Number(
          (newQty * existing.precioUnitario * (1 - existing.descuentoPorcentaje / 100)).toFixed(2)
        );
        const impuestoTotal = Number((subtotal * (tax.porcentaje / 100)).toFixed(2));
        const total = Number((subtotal + impuestoTotal).toFixed(2));

        triggerFeedback(`+1 ${itemTitle} en venta`);
        return prevCart.map((item) =>
          getCartItemKey(item) === targetKey
            ? { ...item, cantidad: newQty, subtotal, impuestoTotal, total }
            : item
        );
      } else {
        const subtotal = unitPrice;
        const impuestoTotal = Number((subtotal * (tax.porcentaje / 100)).toFixed(2));
        const total = Number((subtotal + impuestoTotal).toFixed(2));

        triggerFeedback(`Agregado: ${itemTitle}`);
        return [
          ...prevCart,
          {
            producto: product,
            variante: variant,
            cantidad: 1,
            precioUnitario: unitPrice,
            descuentoPorcentaje: 0,
            impuesto: tax,
            subtotal,
            impuestoTotal,
            total,
          },
        ];
      }
    });
  };

  // Update quantity via step or direct input using cartItemKey
  const updateQuantity = (cartItemKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (getCartItemKey(item) !== cartItemKey) return item;
          const maxStock = item.variante ? item.variante.stock : item.producto.stockActual;
          const newQty = item.cantidad + delta;
          if (newQty <= 0) return null;
          if (newQty > maxStock) {
            triggerFeedback(`⚠️ Stock máximo disponible: ${maxStock}`);
            return item;
          }

          const subtotal = Number(
            (newQty * item.precioUnitario * (1 - item.descuentoPorcentaje / 100)).toFixed(2)
          );
          const impuestoTotal = Number((subtotal * (item.impuesto.porcentaje / 100)).toFixed(2));
          const total = Number((subtotal + impuestoTotal).toFixed(2));

          return { ...item, cantidad: newQty, subtotal, impuestoTotal, total };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setExactQuantity = (cartItemKey: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (getCartItemKey(item) !== cartItemKey) return item;
        const maxStock = item.variante ? item.variante.stock : item.producto.stockActual;
        const validatedQty = Math.max(1, Math.min(maxStock, Math.floor(qty) || 1));
        const subtotal = Number(
          (validatedQty * item.precioUnitario * (1 - item.descuentoPorcentaje / 100)).toFixed(2)
        );
        const impuestoTotal = Number((subtotal * (item.impuesto.porcentaje / 100)).toFixed(2));
        const total = Number((subtotal + impuestoTotal).toFixed(2));

        return { ...item, cantidad: validatedQty, subtotal, impuestoTotal, total };
      })
    );
  };

  const setItemDiscount = (cartItemKey: string, discount: number) => {
    const validDiscount = Math.min(100, Math.max(0, discount || 0));
    setCart((prev) =>
      prev.map((item) => {
        if (getCartItemKey(item) !== cartItemKey) return item;
        const subtotal = Number(
          (item.cantidad * item.precioUnitario * (1 - validDiscount / 100)).toFixed(2)
        );
        const impuestoTotal = Number((subtotal * (item.impuesto.porcentaje / 100)).toFixed(2));
        const total = Number((subtotal + impuestoTotal).toFixed(2));
        return { ...item, descuentoPorcentaje: validDiscount, subtotal, impuestoTotal, total };
      })
    );
  };

  const removeFromCart = (cartItemKey: string) => {
    setCart((prev) => prev.filter((item) => getCartItemKey(item) !== cartItemKey));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    triggerFeedback('Carrito vaciado');
  };

  // Barcode / Search Enter key handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = searchTerm.trim().toLowerCase();
      if (!term) return;

      // 1. Look for exact barcode match across products or any variant
      for (const p of products) {
        if (!p.activo) continue;
        if (p.codigoBarras && p.codigoBarras.toLowerCase() === term) {
          addToCart(p);
          setSearchTerm('');
          return;
        }
        if (p.variantes) {
          const matchedVar = p.variantes.find(
            (v) => v.activo !== false && v.codigoBarras && v.codigoBarras.toLowerCase() === term
          );
          if (matchedVar) {
            addToCart(p, matchedVar);
            setSearchTerm('');
            return;
          }
        }
      }

      // 2. Look for exact name match
      const exactName = products.find(
        (p) => p.activo && p.nombre.toLowerCase() === term
      );
      if (exactName) {
        addToCart(exactName);
        setSearchTerm('');
        return;
      }

      // 3. If there is only one filtered product, add it
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchTerm('');
        return;
      }

      // 4. Add the first filtered product if available
      if (filteredProducts.length > 0) {
        addToCart(filteredProducts[0]);
        setSearchTerm('');
      }
    }
  };

  // Cart Totals Calculation
  const subtotalPrincipal = useMemo(
    () => Number(cart.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)),
    [cart]
  );
  const impuestosPrincipal = useMemo(
    () => Number(cart.reduce((acc, item) => acc + item.impuestoTotal, 0).toFixed(2)),
    [cart]
  );
  const totalPrincipal = useMemo(
    () => Number((subtotalPrincipal + impuestosPrincipal).toFixed(2)),
    [subtotalPrincipal, impuestosPrincipal]
  );

  const subtotalReferencia = useMemo(
    () => convertToRef(subtotalPrincipal, currency.tasaCambio),
    [subtotalPrincipal, currency.tasaCambio]
  );
  const impuestosReferencia = useMemo(
    () => convertToRef(impuestosPrincipal, currency.tasaCambio),
    [impuestosPrincipal, currency.tasaCambio]
  );
  const totalReferencia = useMemo(
    () => convertToRef(totalPrincipal, currency.tasaCambio),
    [totalPrincipal, currency.tasaCambio]
  );

  const cartTotalUnits = useMemo(
    () => cart.reduce((acc, item) => acc + item.cantidad, 0),
    [cart]
  );

  const totalDescuentoPrincipal = useMemo(() => {
    return Number(
      cart
        .reduce((acc, item) => {
          const raw = item.cantidad * item.precioUnitario;
          return acc + (raw - item.subtotal);
        }, 0)
        .toFixed(2)
    );
  }, [cart]);

  // Global Keyboard Shortcuts (F2: Focus Search, F4: Checkout, Escape: Close Modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCheckoutModal || showClientModal) {
        if (e.key === 'Escape') {
          setShowCheckoutModal(false);
          setShowClientModal(false);
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        setPosTab('catalogo');
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          handleOpenCheckout();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCheckoutModal, showClientModal, cart.length, totalPrincipal, totalReferencia]);

  // Quick Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('EFECTIVO_PRINCIPAL');
    setAmountPaidPrimary(totalPrincipal.toFixed(2));
    setAmountPaidRef(totalReferencia.toFixed(2));
    setReferenceCode('');
    setShowCheckoutModal(true);
  };

  // Change Calculation logic
  const { cambioPrincipal, cambioReferencia, totalReceivedInPrincipal, isShort } = useMemo(() => {
    const paidPrim = parseFloat(amountPaidPrimary) || 0;
    const paidRef = parseFloat(amountPaidRef) || 0;

    let totalRec = 0;
    if (paymentMethod === 'EFECTIVO_PRINCIPAL' || paymentMethod === 'TARJETA') {
      totalRec = paidPrim;
    } else if (paymentMethod === 'EFECTIVO_REFERENCIA' || paymentMethod === 'PAGO_MOVIL_TRANSFERENCIA') {
      totalRec = convertToPrimary(paidRef, currency.tasaCambio);
    } else if (paymentMethod === 'MIXTO') {
      totalRec = paidPrim + convertToPrimary(paidRef, currency.tasaCambio);
    }

    const diff = Number((totalRec - totalPrincipal).toFixed(2));
    const chgPrim = diff > 0.005 ? diff : 0;
    const chgRef = diff > 0.005 ? convertToRef(chgPrim, currency.tasaCambio) : 0;
    const shortAmount = diff < -0.005 ? Math.abs(diff) : 0;

    return {
      cambioPrincipal: chgPrim,
      cambioReferencia: chgRef,
      totalReceivedInPrincipal: totalRec,
      isShort: shortAmount > 0,
    };
  }, [amountPaidPrimary, amountPaidRef, paymentMethod, totalPrincipal, currency.tasaCambio]);

  // Method selector switch helper
  const handleSelectPaymentMethod = (method: PaymentDetails['metodo']) => {
    setPaymentMethod(method);
    if (method === 'EFECTIVO_PRINCIPAL' || method === 'TARJETA') {
      setAmountPaidPrimary(totalPrincipal.toFixed(2));
      setAmountPaidRef('0');
    } else if (method === 'EFECTIVO_REFERENCIA' || method === 'PAGO_MOVIL_TRANSFERENCIA') {
      setAmountPaidRef(totalReferencia.toFixed(2));
      setAmountPaidPrimary('0');
    } else if (method === 'MIXTO') {
      // Half and half as initial helper
      const halfPrim = (totalPrincipal / 2).toFixed(2);
      const halfRef = convertToRef(totalPrincipal - parseFloat(halfPrim), currency.tasaCambio).toFixed(2);
      setAmountPaidPrimary(halfPrim);
      setAmountPaidRef(halfRef);
    }
  };

  // Complete Sale execution
  const executeCompleteSale = (action: 'print' | 'whatsapp' | 'none' = 'none') => {
    if (cart.length === 0) return;

    const paymentDetails: PaymentDetails = {
      metodo: paymentMethod,
      montoPagadoPrincipal: parseFloat(amountPaidPrimary) || 0,
      montoPagadoReferencia: parseFloat(amountPaidRef) || 0,
      cambioPrincipal,
      cambioReferencia,
      referenciaBancaria: referenceCode.trim() || undefined,
    };

    const newSale = db.recordSale({
      items: cart,
      subtotalPrincipal,
      impuestosPrincipal,
      totalPrincipal,
      subtotalReferencia,
      impuestosReferencia,
      totalReferencia,
      tasaCambioAplicada: currency.tasaCambio,
      pago: paymentDetails,
      cliente: client.nombre ? client : undefined,
      vendedorId: selectedVendor.id,
      vendedorNombre: `${selectedVendor.nombre} ${selectedVendor.apellido}`,
      estado: 'COMPLETADA',
    });

    // Reset local cart and close checkout modal
    setCart([]);
    setShowCheckoutModal(false);

    // Notify parent to open TicketModal with specified action
    onSaleCompleted(newSale, action);
  };

  // Save new client helper
  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.nombre.trim() || !newClientForm.docId.trim()) {
      alert('Por favor ingrese al menos el Nombre y el Documento de Identidad');
      return;
    }
    const cleanClient: ClientData = {
      nombre: newClientForm.nombre.trim(),
      docId: newClientForm.docId.trim(),
      telefono: newClientForm.telefono?.trim() || '',
      direccion: newClientForm.direccion?.trim() || '',
      email: newClientForm.email?.trim() || '',
    };
    setClient(cleanClient);
    setIsCreatingClient(false);
    setShowClientModal(false);
    triggerFeedback(`Cliente seleccionado: ${cleanClient.nombre}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-slate-50 text-slate-800">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* POS Top Navigation Bar: Fast switching between Catalog and Venta Actual */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-2 border-b border-slate-800 flex-shrink-0 z-10 select-none">
        <div className="flex items-center gap-2">
          {/* Navigation Tabs for Mobile / Tablet / Compact */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPosTab('catalogo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                posTab === 'catalogo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Catálogo</span>
              <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.2 rounded-full hidden sm:inline">
                {filteredProducts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPosTab('venta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 relative ${
                posTab === 'venta'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Venta Actual</span>
              {cart.length > 0 && (
                <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full shadow-xs">
                  {cart.length}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Layout Switcher (visible on lg+ screens) */}
          <div className="hidden lg:flex items-center bg-slate-800 p-1 rounded-xl text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setDesktopLayout('split')}
              className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                desktopLayout === 'split' ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
              }`}
              title="Vista Dividida (Catálogo y Venta Actual en paralelo)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Dividida</span>
            </button>
            <button
              type="button"
              onClick={() => setDesktopLayout('catalogo')}
              className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                desktopLayout === 'catalogo' ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
              }`}
              title="Maximizar pantalla de catálogo"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Solo Catálogo</span>
            </button>
            <button
              type="button"
              onClick={() => setDesktopLayout('venta')}
              className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                desktopLayout === 'venta' ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
              }`}
              title="Maximizar venta actual"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Solo Venta ({cart.length})</span>
            </button>
          </div>
        </div>

        {/* Live Total & Quick Action in Top Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Historial de Ventas / Reportes Exportables */}
          <button
            type="button"
            onClick={() => setShowSalesHistory(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700 shadow-2xs"
            title="Historial de Ventas y Exportación a CSV / PDF"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Historial Ventas</span>
          </button>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Actual:</div>
            <div className="text-xs sm:text-sm font-black text-white leading-tight">
              {formatCurrency(totalPrincipal, currency.monedaPrincipal)}{' '}
              <span className="text-[11px] text-emerald-400 font-mono font-normal">
                / {formatCurrency(totalReferencia, currency.monedaReferencia)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            title="Abrir liquidación y cobro (F4)"
          >
            <span>Cobrar</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="text-[9px] bg-emerald-600 text-white px-1 py-0.2 rounded font-mono hidden md:inline">
              F4
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace (Split / Tabs) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0 overflow-hidden relative">
        {/* Left Column: Catalog & Search */}
        <div
          className={`flex-1 flex flex-col min-h-0 min-w-0 border-r border-slate-200 ${
            posTab !== 'catalogo' ? 'hidden lg:flex' : 'flex'
          } ${desktopLayout === 'venta' ? 'lg:hidden' : ''}`}
        >
          {/* Top Control Bar: Search, Category Bar & Vendor / Client summary */}
          <div className="p-3 sm:p-4 bg-white border-b border-slate-200 space-y-2.5 shadow-2xs flex-shrink-0">
            {/* Quick Active Sellers & Clients Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Seller / Vendor Selector Chip */}
                <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 transition">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 font-medium">Vendedor:</span>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => {
                      setSelectedVendorId(e.target.value);
                      const v = users.find((u) => u.id === e.target.value);
                      if (v) triggerFeedback(`Vendedor activo: ${v.nombre} ${v.apellido}`);
                    }}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer pr-1"
                  >
                    {users.length > 0 ? (
                      users
                        .filter((u) => u.activo)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} {u.apellido} ({u.role})
                          </option>
                        ))
                    ) : (
                      <option value={activeUser.id}>
                        {activeUser.nombre} {activeUser.apellido}
                      </option>
                    )}
                  </select>
                </div>

                {/* Client Selector Chip */}
                <button
                  type="button"
                  onClick={() => setShowClientModal(true)}
                  className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-emerald-50 hover:border-emerald-200 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 transition group"
                  title="Cambiar o registrar cliente"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 font-medium">Cliente:</span>
                  <span className="font-bold text-slate-900 text-xs truncate max-w-[140px] sm:max-w-[180px]">
                    {client.nombre}
                  </span>
                  {client.telefono && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-medium hidden sm:inline">
                      WA ✓
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Exchange Rate Live Pill */}
              <div className="flex items-center gap-1.5 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-1 rounded-lg font-mono">
                <RefreshCw className="w-3 h-3 text-emerald-600" />
                <span className="font-semibold">
                  1 {currency.monedaPrincipal.codigo} = {currency.tasaCambio.toFixed(2)}{' '}
                  {currency.monedaReferencia.codigo}
                </span>
              </div>
            </div>

            {/* Search Input with Scanner support */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Buscar por nombre, SKU o escanear código (Enter para agregar, F2 para buscar)..."
                  className="w-full bg-slate-100/80 border border-slate-200 rounded-xl pl-10 pr-24 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition shadow-2xs"
                />
                <div className="absolute right-2.5 top-1.5 flex items-center gap-1">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="p-1 text-xs text-slate-400 hover:text-slate-600 rounded"
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                    Enter ↵
                  </span>
                </div>
              </div>
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-slate-900'
                }`}
              >
                Todos ({products.filter((p) => p.activo).length})
              </button>
              {categories.map((cat) => {
                const count = products.filter((p) => p.categoriaId === cat.id && p.activo).length;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-slate-900'
                    }`}
                  >
                    <span>{cat.nombre}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid Catalog with smooth scrolling */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-slate-50/50">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                <Search className="w-12 h-12 mb-3 opacity-30 stroke-[1.5]" />
                <p className="text-sm font-semibold text-slate-700">No se encontraron productos</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
                  Intente con otro término de búsqueda o seleccione otra categoría.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const hasVariants = !!(product.variantes && product.variantes.length > 0);
                  const totalStock = hasVariants
                    ? product.variantes!.reduce((sum, v) => sum + (v.stock || 0), 0)
                    : product.stockActual;
                  const isOutOfStock = totalStock <= 0;
                  const isLowStock = totalStock > 0 && totalStock <= product.stockMinimo;
                  const priceRef = convertToRef(product.precioVenta, currency.tasaCambio);
                  const category = categories.find((c) => c.id === product.categoriaId);
                  const inCartUnits = cart
                    .filter((item) => item.producto.id === product.id)
                    .reduce((sum, item) => sum + item.cantidad, 0);

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`group relative bg-white border rounded-xl p-3 flex flex-col justify-between transition-all duration-150 ${
                        isOutOfStock
                          ? 'opacity-50 border-slate-200 cursor-not-allowed bg-slate-50'
                          : 'border-slate-200 hover:border-emerald-400 hover:shadow-md cursor-pointer active:scale-98'
                      }`}
                    >
                      {/* In-cart badge indicator */}
                      {inCartUnits > 0 && (
                        <span className="absolute -top-2 -right-2 bg-emerald-600 text-white font-bold text-[10px] min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center shadow-sm border-2 border-white z-10">
                          {inCartUnits}
                        </span>
                      )}

                      <div>
                        {/* Photo if available */}
                        {product.foto && (
                          <div className="w-full h-28 mb-2 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                            <img
                              src={product.foto}
                              alt={product.nombre}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        )}

                        {/* Category & Stock Pill */}
                        <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-medium text-slate-400 truncate max-w-[100px]">
                            {category?.nombre || 'General'}
                          </span>

                          {hasVariants && (
                            <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1 border border-emerald-200">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              {product.variantes!.length} Var.
                            </span>
                          )}

                          {isOutOfStock ? (
                            <span className="text-[9.5px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              Agotado
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[9.5px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              Quedan {totalStock}
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Stock: {totalStock}
                            </span>
                          )}
                        </div>

                        {/* Product Name */}
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 group-hover:text-emerald-700 transition">
                          {product.nombre}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          SKU: {product.codigoBarras || product.id.substring(0, 8)}
                        </p>
                      </div>

                      {/* Pricing & Add Button */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between gap-2">
                        <div>
                          <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                            {formatCurrency(product.precioVenta, currency.monedaPrincipal)}
                          </div>
                          <div className="text-[10px] sm:text-xs font-semibold text-emerald-700 font-mono leading-tight">
                            {formatCurrency(priceRef, currency.monedaReferencia)}
                          </div>
                        </div>

                        {!isOutOfStock && (
                          inCartUnits > 0 ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 border border-slate-300 rounded-lg p-0.5 shadow-2xs flex-shrink-0"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasVariants) {
                                    const cartItem = cart.find((it) => it.producto.id === product.id);
                                    if (cartItem) {
                                      updateQuantity(getCartItemKey(cartItem), -1);
                                    }
                                  } else {
                                    updateQuantity(product.id, -1);
                                  }
                                }}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 flex items-center justify-center transition border border-slate-200 active:scale-95 shadow-2xs"
                                title="Disminuir cantidad"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              {hasVariants ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVariantSelectionProduct(product);
                                  }}
                                  className="px-1.5 h-6 sm:h-7 rounded text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 flex items-center gap-1 transition"
                                  title="Gestionar variantes en la venta"
                                >
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>{inCartUnits}</span>
                                </button>
                              ) : (
                                <span className="px-1.5 text-xs font-bold text-slate-900 font-mono select-none">
                                  {inCartUnits}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasVariants) {
                                    setVariantSelectionProduct(product);
                                  } else {
                                    addToCart(product);
                                  }
                                }}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition active:scale-95"
                                title={hasVariants ? 'Elegir más variantes' : 'Aumentar cantidad'}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              className={
                                hasVariants
                                  ? 'h-7 sm:h-8 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-1 text-[11px] font-bold shadow-2xs transition active:scale-95 flex-shrink-0'
                                  : 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition active:scale-90 flex-shrink-0'
                              }
                              title={hasVariants ? 'Elegir variante' : 'Agregar a la venta'}
                            >
                              {hasVariants ? (
                                <>
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  <span>Variantes</span>
                                </>
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky / Floating Cart Summary Bar when in Catalog Mode on smaller screens */}
          {cart.length > 0 && posTab === 'catalogo' && (
            <div className="lg:hidden p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg flex items-center justify-between gap-2 z-20 flex-shrink-0">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Venta Actual: {cart.length} productos ({cartTotalUnits} uds)</span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  {formatCurrency(totalPrincipal, currency.monedaPrincipal)}{' '}
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    ({formatCurrency(totalReferencia, currency.monedaReferencia)})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPosTab('venta')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                >
                  Ver Carrito
                </button>
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1"
                >
                  <span>Cobrar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Cart Panel ("Venta Actual") */}
        <aside
          className={`w-full ${
            desktopLayout === 'venta' ? 'lg:flex-1' : 'lg:w-[450px] xl:w-[530px]'
          } flex flex-col min-h-0 min-w-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 shadow-xs flex-shrink-0 ${
            posTab !== 'venta' ? 'hidden lg:flex' : 'flex'
          } ${desktopLayout === 'catalogo' ? 'lg:hidden' : ''}`}
        >
          {/* Cart Header */}
          <div className="p-3 sm:p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {/* Return to catalog button on mobile */}
              <button
                type="button"
                onClick={() => setPosTab('catalogo')}
                className="lg:hidden p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                title="Volver al catálogo"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm leading-tight">Venta Actual</h2>
                  <p className="text-[11px] text-slate-500">
                    {cart.length === 0
                      ? 'Carrito vacío'
                      : `${cart.length} productos • ${cartTotalUnits} unidades`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* View Mode Toggle: Tabla vs Tarjetas */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCartViewMode('tabla')}
                  className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition ${
                    cartViewMode === 'tabla'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista Tabla con columnas"
                >
                  <Table className="w-3 h-3" />
                  <span className="text-[10px] hidden sm:inline">Tabla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCartViewMode('tarjetas')}
                  className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition ${
                    cartViewMode === 'tarjetas'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista Tarjetas"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span className="text-[10px] hidden sm:inline">Tarjetas</span>
                </button>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                  title="Vaciar todo el carrito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Cart Active Client & Vendor Quick Preview */}
          <div className="px-3.5 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs flex-shrink-0">
            <div className="min-w-0 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 truncate text-xs">
                    {client.nombre}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">({client.docId})</span>
                </div>
                {client.telefono && (
                  <div className="text-[10px] text-emerald-700 font-mono">
                    Tel: {client.telefono}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowClientModal(true)}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs hover:bg-emerald-50 transition flex-shrink-0"
            >
              Cambiar Cliente
            </button>
          </div>

          {/* Cart Items List: Lists products, quantities, prices, and totals correctly */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/30">
            {cart.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-25 stroke-[1.5]" />
                <p className="text-sm font-semibold text-slate-700">El carrito está vacío</p>
                <p className="text-xs text-slate-400 max-w-[220px] mt-1">
                  Agregue productos desde el catálogo o use el escáner / buscador para iniciar la venta.
                </p>
                <button
                  type="button"
                  onClick={() => setPosTab('catalogo')}
                  className="mt-4 px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition lg:hidden"
                >
                  Ir al Catálogo de Productos
                </button>
              </div>
            ) : cartViewMode === 'tabla' ? (
              /* TABULAR VIEW: Explicit columns for Producto, Cantidad, Precio Unitario, and Total */
              <div className="min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3">Producto / Descripción</th>
                      <th className="py-2.5 px-1 text-center w-24">Cantidad</th>
                      <th className="py-2.5 px-2 text-right">Precio Unit.</th>
                      <th className="py-2.5 px-3 text-right">Total Renglón</th>
                      <th className="py-2.5 px-1 text-center w-7"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 text-xs bg-white">
                    {cart.map((item) => {
                      const itemKey = getCartItemKey(item);
                      const itemTotalRef = convertToRef(item.total, currency.tasaCambio);
                      const itemPriceRef = convertToRef(item.precioUnitario, currency.tasaCambio);
                      const cat = categories.find((c) => c.id === item.producto.categoriaId);
                      const maxStock = item.variante ? item.variante.stock : item.producto.stockActual;
                      const displayPhoto = item.variante?.foto || item.producto.foto;

                      return (
                        <tr
                          key={itemKey}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Producto / Variante / Descripción */}
                          <td className="py-2.5 px-3 align-top">
                            <div className="flex items-start gap-2.5">
                              {displayPhoto ? (
                                <img
                                  src={displayPhoto}
                                  alt={item.producto.nombre}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0 mt-0.5 shadow-2xs"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Package className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                                  {item.producto.nombre}
                                </div>
                                {item.variante && (
                                  <div className="mt-1 flex items-center gap-1">
                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10.5px] inline-flex items-center gap-1 border border-emerald-200">
                                      <Sparkles className="w-3 h-3 text-emerald-600" />
                                      Variante: {item.variante.nombre}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 mt-1 font-mono">
                                  <span>SKU: {item.variante?.codigoBarras || item.producto.codigoBarras}</span>
                                  <span>•</span>
                                  <span className="text-slate-600 font-sans">{cat?.nombre || 'General'}</span>
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-sans">
                                    {item.impuesto.nombre} ({item.impuesto.porcentaje}%)
                                  </span>
                                  {item.descuentoPorcentaje > 0 && (
                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded font-sans">
                                      -{item.descuentoPorcentaje}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cantidad Control */}
                          <td className="py-2.5 px-1 align-middle text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(itemKey, -1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-white active:scale-95 transition"
                                  title="Disminuir cantidad"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={maxStock}
                                  value={item.cantidad}
                                  onChange={(e) =>
                                    setExactQuantity(itemKey, parseInt(e.target.value) || 1)
                                  }
                                  className="w-8 text-center font-bold text-slate-900 text-xs font-mono bg-transparent focus:bg-white focus:outline-none rounded"
                                  title="Escribir cantidad directa"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(itemKey, 1)}
                                  disabled={item.cantidad >= maxStock}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-white disabled:opacity-30 active:scale-95 transition"
                                  title="Aumentar cantidad"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono">
                                Stock: {maxStock} {item.producto.unidadMedida}
                              </span>
                            </div>
                          </td>

                          {/* Precio Unitario */}
                          <td className="py-2.5 px-2 align-middle text-right">
                            <div className="font-bold text-slate-900 text-xs">
                              {formatCurrency(item.precioUnitario, currency.monedaPrincipal)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {formatCurrency(itemPriceRef, currency.monedaReferencia)}
                            </div>
                          </td>

                          {/* Total Renglón */}
                          <td className="py-2.5 px-3 align-middle text-right">
                            <div className="font-extrabold text-slate-900 text-xs">
                              {formatCurrency(item.total, currency.monedaPrincipal)}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-mono font-bold">
                              {formatCurrency(itemTotalRef, currency.monedaReferencia)}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Sub: {formatCurrency(item.subtotal, currency.monedaPrincipal)}
                              {item.impuestoTotal > 0 &&
                                ` + IVA ${formatCurrency(item.impuestoTotal, currency.monedaPrincipal)}`}
                            </div>
                          </td>

                          {/* Eliminar */}
                          <td className="py-2.5 px-1 align-middle text-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(itemKey)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CARD VIEW: Structured cards per item */
              <div className="p-3 space-y-2.5">
                {cart.map((item) => {
                  const itemKey = getCartItemKey(item);
                  const itemTotalRef = convertToRef(item.total, currency.tasaCambio);
                  const itemPriceRef = convertToRef(item.precioUnitario, currency.tasaCambio);
                  const cat = categories.find((c) => c.id === item.producto.categoriaId);
                  const maxStock = item.variante ? item.variante.stock : item.producto.stockActual;
                  const displayPhoto = item.variante?.foto || item.producto.foto;

                  return (
                    <div
                      key={itemKey}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {displayPhoto ? (
                            <img
                              src={displayPhoto}
                              alt={item.producto.nombre}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 flex-shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Package className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 text-xs leading-snug">
                              {item.producto.nombre}
                            </h4>
                            {item.variante && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1 border border-emerald-200">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  Variante: {item.variante.nombre}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 flex-wrap font-mono">
                              <span>SKU: {item.variante?.codigoBarras || item.producto.codigoBarras}</span>
                              <span>•</span>
                              <span className="font-sans text-slate-500">{cat?.nombre || 'General'}</span>
                              <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-sans">
                                {item.impuesto.nombre} ({item.impuesto.porcentaje}%)
                              </span>
                              {item.descuentoPorcentaje > 0 && (
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-1 rounded font-sans">
                                  -{item.descuentoPorcentaje}% desc
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(itemKey)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition flex-shrink-0"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity controls and Line Total */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 items-center">
                        {/* Cantidad */}
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                            Cantidad:
                          </span>
                          <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5 w-fit">
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-white active:scale-95 transition"
                              title="Disminuir cantidad"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={maxStock}
                              value={item.cantidad}
                              onChange={(e) =>
                                setExactQuantity(itemKey, parseInt(e.target.value) || 1)
                              }
                              className="w-8 text-center font-bold text-slate-900 text-xs font-mono bg-transparent focus:bg-white focus:outline-none rounded"
                              title="Escribir cantidad"
                            />

                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, 1)}
                              disabled={item.cantidad >= maxStock}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-white disabled:opacity-30 active:scale-95 transition"
                              title="Aumentar cantidad"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Precio Unitario */}
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                            Precio Unit:
                          </span>
                          <div className="font-bold text-slate-800 text-xs">
                            {formatCurrency(item.precioUnitario, currency.monedaPrincipal)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {formatCurrency(itemPriceRef, currency.monedaReferencia)}
                          </div>
                        </div>

                        {/* Total Renglón */}
                        <div className="text-right">
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                            Total:
                          </span>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {formatCurrency(item.total, currency.monedaPrincipal)}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-mono font-bold">
                            {formatCurrency(itemTotalRef, currency.monedaReferencia)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Totals & Checkout Trigger - Docked Sticky Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 space-y-3 flex-shrink-0 shadow-xs">
            <div className="space-y-1.5 text-xs bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Artículos en Venta:</span>
                <span className="font-semibold text-slate-800">
                  {cart.length} productos ({cartTotalUnits} unidades)
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Base Imponible:</span>
                <div className="text-right font-semibold text-slate-800">
                  <span>{formatCurrency(subtotalPrincipal, currency.monedaPrincipal)}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                    ({formatCurrency(subtotalReferencia, currency.monedaReferencia)})
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Impuestos / IVA discriminado:</span>
                <div className="text-right font-semibold text-slate-800">
                  <span>{formatCurrency(impuestosPrincipal, currency.monedaPrincipal)}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                    ({formatCurrency(impuestosReferencia, currency.monedaReferencia)})
                  </span>
                </div>
              </div>
              {totalDescuentoPrincipal > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Descuento Aplicado:</span>
                  <span>-{formatCurrency(totalDescuentoPrincipal, currency.monedaPrincipal)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-slate-200">
                <div>
                  <span className="text-xs uppercase font-extrabold text-slate-900 tracking-wider">
                    Total a Pagar:
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Tasa: 1 {currency.monedaPrincipal.codigo} = {currency.tasaCambio.toFixed(2)}{' '}
                    {currency.monedaReferencia.codigo}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {formatCurrency(totalPrincipal, currency.monedaPrincipal)}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-emerald-700 font-mono leading-tight mt-0.5">
                    {formatCurrency(totalReferencia, currency.monedaReferencia)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="px-3 py-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition disabled:opacity-40 shadow-2xs"
                title="Vaciar todo el carrito"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Cobrar y Liquidar Venta</span>
                <ArrowRight className="w-4 h-4" />
                <span className="text-[10px] bg-emerald-700/70 text-white px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                  F4
                </span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================
          CLIENT SELECTION & CREATION MODAL
          ========================================================= */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Seleccionar o Registrar Cliente</span>
              </div>
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setIsCreatingClient(false);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Quick Preset: Consumidor Final */}
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Consumidor Final (General)</h4>
                  <p className="text-[11px] text-slate-500">Documento: V-00000000</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClient({
                      nombre: 'Consumidor Final',
                      docId: 'V-00000000',
                      telefono: '',
                    });
                    setShowClientModal(false);
                    triggerFeedback('Cliente: Consumidor Final seleccionado');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Usar Este
                </button>
              </div>

              {/* Mode Toggle: Pick existing vs Create new */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(false)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    !isCreatingClient
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Buscar Cliente Frecuente
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(true)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    isCreatingClient
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  + Registrar Nuevo Cliente
                </button>
              </div>

              {!isCreatingClient ? (
                <div className="space-y-3">
                  {/* Search filter */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, cédula / RIF o teléfono..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* List of clients */}
                  <div className="space-y-1.5 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredClients.map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setClient(c);
                          setShowClientModal(false);
                          triggerFeedback(`Cliente seleccionado: ${c.nombre}`);
                        }}
                        className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{c.nombre}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>ID: {c.docId}</span>
                            {c.telefono && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-mono">📞 {c.telefono}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg transition"
                        >
                          Seleccionar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Create new client form */
                <form onSubmit={handleSaveNewClient} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre Completo o Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. María Pérez o Inversiones Los Andes C.A."
                      value={newClientForm.nombre}
                      onChange={(e) =>
                        setNewClientForm({ ...newClientForm, nombre: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cédula / RIF / Doc ID *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. V-18456789 o J-30495812"
                        value={newClientForm.docId}
                        onChange={(e) =>
                          setNewClientForm({ ...newClientForm, docId: e.target.value })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Teléfono / WhatsApp (Para enviar factura)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. 04141234567 o +58 414 1234567"
                        value={newClientForm.telefono}
                        onChange={(e) =>
                          setNewClientForm({ ...newClientForm, telefono: e.target.value })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Dirección Fiscal (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Av. Universidad, Edif. Apolo, Piso 2"
                      value={newClientForm.direccion}
                      onChange={(e) =>
                        setNewClientForm({ ...newClientForm, direccion: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingClient(false)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      Guardar y Usar Cliente
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          CHECKOUT & PAYMENT MODAL
          ========================================================= */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Liquidación y Cobro de Venta</span>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Dual Currency Total Banner */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">
                    Total a Cobrar:
                  </span>
                  <div className="text-2xl font-black text-slate-900 leading-tight">
                    {formatCurrency(totalPrincipal, currency.monedaPrincipal)}
                  </div>
                  <div className="text-sm font-bold text-emerald-700 font-mono">
                    {formatCurrency(totalReferencia, currency.monedaReferencia)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-mono">
                  <div>Tasa Aplicada:</div>
                  <div className="font-bold text-slate-800">
                    1 {currency.monedaPrincipal.codigo} = {currency.tasaCambio.toFixed(2)}{' '}
                    {currency.monedaReferencia.codigo}
                  </div>
                </div>
              </div>

              {/* Vendor & Client Summary row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Vendedor Asignado:
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {users.length > 0 ? (
                        users
                          .filter((u) => u.activo)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre} {u.apellido}
                            </option>
                          ))
                      ) : (
                        <option value={activeUser.id}>
                          {activeUser.nombre} {activeUser.apellido}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Cliente / Receptor:
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-slate-900 truncate">
                      {client.nombre} ({client.docId})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowClientModal(true)}
                      className="text-[10px] text-emerald-700 font-bold hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>

              {/* Client WhatsApp Phone Quick Input (if missing or needs change) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Teléfono / WhatsApp para envío directo de factura:</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej. 04141234567 o +584141234567"
                    value={client.telefono || ''}
                    onChange={(e) => setClient({ ...client, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                  {client.telefono && (
                    <span className="absolute right-3 top-2 text-[10px] text-emerald-700 font-bold">
                      Listo para WhatsApp ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Seleccione Método de Pago:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'EFECTIVO_PRINCIPAL',
                      label: `Efectivo (${currency.monedaPrincipal.codigo})`,
                      icon: DollarSign,
                    },
                    {
                      id: 'EFECTIVO_REFERENCIA',
                      label: `Efectivo (${currency.monedaReferencia.codigo})`,
                      icon: DollarSign,
                    },
                    { id: 'TARJETA', label: 'Punto de Venta / Tarjeta', icon: CreditCard },
                    { id: 'PAGO_MOVIL_TRANSFERENCIA', label: 'Pago Móvil / Transf.', icon: Smartphone },
                    { id: 'MIXTO', label: 'Pago Mixto (Combinado)', icon: Layers },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          handleSelectPaymentMethod(m.id as PaymentDetails['metodo'])
                        }
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Received Inputs & Quick Presets */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                {/* Live Received vs Change Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Monto Recibido
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {formatCurrency(totalReceivedInPrincipal, currency.monedaPrincipal)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono font-medium">
                      {formatCurrency(
                        convertToRef(totalReceivedInPrincipal, currency.tasaCambio),
                        currency.monedaReferencia
                      )}
                    </p>
                  </div>

                  <div
                    className={`p-3 border rounded-xl text-center shadow-2xs ${
                      isShort
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <p className="text-[10px] uppercase font-bold tracking-wider">
                      {isShort ? 'Faltante por Cobrar' : 'Cambio / Vuelto'}
                    </p>
                    <p className="text-sm font-black">
                      {isShort
                        ? formatCurrency(
                            totalPrincipal - totalReceivedInPrincipal,
                            currency.monedaPrincipal
                          )
                        : formatCurrency(cambioPrincipal, currency.monedaPrincipal)}
                    </p>
                    <p className="text-[10px] font-mono font-medium">
                      {isShort
                        ? formatCurrency(
                            convertToRef(
                              totalPrincipal - totalReceivedInPrincipal,
                              currency.tasaCambio
                            ),
                            currency.monedaReferencia
                          )
                        : formatCurrency(cambioReferencia, currency.monedaReferencia)}
                    </p>
                  </div>
                </div>

                {/* Amount Inputs depending on method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(paymentMethod === 'EFECTIVO_PRINCIPAL' ||
                    paymentMethod === 'TARJETA' ||
                    paymentMethod === 'MIXTO') && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-semibold text-slate-700">
                          Recibido en {currency.monedaPrincipal.codigo} ({currency.monedaPrincipal.simbolo}):
                        </label>
                        <button
                          type="button"
                          onClick={() => setAmountPaidPrimary(totalPrincipal.toFixed(2))}
                          className="text-[10px] text-emerald-700 hover:underline font-bold"
                        >
                          Exacto
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaidPrimary}
                        onChange={(e) => setAmountPaidPrimary(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="0.00"
                      />

                      {/* Quick Cash Presets for Principal (e.g. $5, $10, $20, $50, $100) */}
                      {paymentMethod === 'EFECTIVO_PRINCIPAL' && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[5, 10, 20, 50, 100].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => setAmountPaidPrimary(bill.toString())}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 shadow-2xs transition"
                            >
                              ${bill}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(paymentMethod === 'EFECTIVO_REFERENCIA' ||
                    paymentMethod === 'PAGO_MOVIL_TRANSFERENCIA' ||
                    paymentMethod === 'MIXTO') && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-semibold text-slate-700">
                          Recibido en {currency.monedaReferencia.codigo} (
                          {currency.monedaReferencia.simbolo}):
                        </label>
                        <button
                          type="button"
                          onClick={() => setAmountPaidRef(totalReferencia.toFixed(2))}
                          className="text-[10px] text-emerald-700 hover:underline font-bold"
                        >
                          Exacto
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaidRef}
                        onChange={(e) => setAmountPaidRef(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="0.00"
                      />

                      {/* Quick Cash Presets for Reference Currency */}
                      {paymentMethod === 'EFECTIVO_REFERENCIA' && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[50, 100, 200, 500, 1000].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => setAmountPaidRef(bill.toString())}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 shadow-2xs transition"
                            >
                              {bill} {currency.monedaReferencia.simbolo}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reference Code for Electronic Payments */}
                {(paymentMethod === 'TARJETA' || paymentMethod === 'PAGO_MOVIL_TRANSFERENCIA') && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nro. de Lote / Referencia Bancaria / Aprobación:
                    </label>
                    <input
                      type="text"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                      placeholder="Ej. REF-489012 o Lote #03"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Short Payment Warning */}
                {isShort && (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    <span>
                      El monto recibido es menor al total a cobrar. Faltan{' '}
                      <strong>
                        {formatCurrency(
                          totalPrincipal - totalReceivedInPrincipal,
                          currency.monedaPrincipal
                        )}{' '}
                        ({formatCurrency(
                          convertToRef(
                            totalPrincipal - totalReceivedInPrincipal,
                            currency.tasaCambio
                          ),
                          currency.monedaReferencia
                        )})
                      </strong>
                      .
                    </span>
                  </div>
                )}
              </div>

              {/* POST-SALE ACTION BUTTONS (Requested by user) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Opciones de Emisión de Factura:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Finalizar e Imprimir Ticket */}
                  <button
                    type="button"
                    disabled={isShort}
                    onClick={() => executeCompleteSale('print')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-98"
                    title="Registrar venta e imprimir ticket térmico automáticamente"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Finalizar e Imprimir Ticket</span>
                  </button>

                  {/* Finalizar y Enviar por WhatsApp */}
                  <button
                    type="button"
                    disabled={isShort}
                    onClick={() => executeCompleteSale('whatsapp')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition active:scale-98"
                    title="Registrar venta y enviar factura directamente al WhatsApp del cliente"
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span>Finalizar y Enviar por WhatsApp</span>
                  </button>
                </div>

                {/* Regular Complete Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-lg transition"
                  >
                    Regresar al Carrito
                  </button>

                  <button
                    type="button"
                    disabled={isShort}
                    onClick={() => executeCompleteSale('none')}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                    <span>Finalizar sin Imprimir / Ver Factura</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selector Modal for POS Checkout */}
      {variantSelectionProduct && (
        <VariantSelectorModal
          product={variantSelectionProduct}
          currency={currency}
          cartQuantitiesByVariantId={cartQuantitiesByVariantId}
          onClose={() => setVariantSelectionProduct(null)}
          onSelectVariant={(variant) => {
            addToCart(variantSelectionProduct, variant);
          }}
          onDecreaseVariant={(variant) => {
            const itemKey = `${variantSelectionProduct.id}_var_${variant.id}`;
            updateQuantity(itemKey, -1);
          }}
        />
      )}

      {/* Sales History & CSV / PDF Export Modal */}
      {showSalesHistory && (
        <SalesHistoryModal
          isOpen={showSalesHistory}
          onClose={() => setShowSalesHistory(false)}
          sales={currentSales}
          currency={currency}
          company={company}
          onViewTicket={(sale, action) => onSaleCompleted(sale, action)}
        />
      )}
    </div>
  );
};
