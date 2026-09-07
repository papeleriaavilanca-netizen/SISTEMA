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
import { formatCurrency, convertToRef, convertToPrimary, generateWhatsAppMessage } from '../utils/formatters';
import { generateTicketPDF, generateTraditionalInvoicePDF } from '../utils/ticketPdf';
import { VariantSelectorModal } from './VariantSelectorModal';
import { SalesHistoryModal } from './SalesHistoryModal';
import { UserSwitchModal } from './UserSwitchModal';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Check,
  DollarSign,
  CreditCard,
  Smartphone,
  Layers,
  Printer,
  User as UserIcon,
  Phone,
  X,
  Package,
  History,
  Receipt,
  Share2,
  Lock,
  Tag,
  Boxes,
  RotateCcw,
  AlertCircle,
  Clock,
  Sparkles,
  Barcode,
  HelpCircle,
  Building2,
  Percent,
  TrendingUp,
  LogOut,
  LayoutGrid,
  ShieldCheck,
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
  onLogout?: () => void;
  onToggleModules?: () => void;
  isModulesOpen?: boolean;
}

export const POSModule: React.FC<POSModuleProps> = ({
  company,
  currency,
  products,
  categories,
  taxes,
  users = [],
  currentUser,
  sales = [],
  onSaleCompleted,
  onLogout,
  onToggleModules,
  isModulesOpen = false,
}) => {
  // -------------------------------------------------------------
  // SELLER / ACTIVE USER MANAGEMENT (With PIN Verification)
  // -------------------------------------------------------------
  const sessionUser = currentUser || db.getCurrentUser() || {
    id: 'admin',
    nombre: 'Administrador',
    apellido: 'Principal',
    email: 'admin@pos.com',
    role: 'ADMINISTRADOR',
    pin: '1234',
    activo: true,
    creadoEn: new Date().toISOString(),
  };

  const [activeVendor, setActiveVendor] = useState<User>(sessionUser);
  const [showUserSwitchModal, setShowUserSwitchModal] = useState(false);

  // Sync activeVendor if currentUser changes from parent
  useEffect(() => {
    if (currentUser) {
      setActiveVendor(currentUser);
    }
  }, [currentUser]);

  // -------------------------------------------------------------
  // TASA OFICIAL (EDITABLE) STATE, HANDLERS & ADMIN PIN AUTH
  // -------------------------------------------------------------
  const [showRateModal, setShowRateModal] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState(currency.tasaCambio.toString());

  // Admin PIN Auth modal state
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminAuthPin, setAdminAuthPin] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');

  useEffect(() => {
    setNewExchangeRate(currency.tasaCambio.toString());
  }, [currency.tasaCambio]);

  // Check permissions: If ADMINISTRADOR, open rate modal directly. Otherwise, request Admin PIN.
  const handleInitiateRateEdit = () => {
    if (activeVendor.role === 'ADMINISTRADOR') {
      setNewExchangeRate(currency.tasaCambio.toString());
      setShowRateModal(true);
    } else {
      const allUsers = db.getDatabase().usuarios || [];
      const activeAdmins = allUsers.filter((u) => u.role === 'ADMINISTRADOR' && u.activo);
      if (activeAdmins.length > 0) {
        setSelectedAdminId(activeAdmins[0].id);
      }
      setAdminAuthPin('');
      setAdminAuthError('');
      setShowAdminAuthModal(true);
    }
  };

  const handleVerifyAdminAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const allUsers = db.getDatabase().usuarios || [];
    const activeAdmins = allUsers.filter((u) => u.role === 'ADMINISTRADOR' && u.activo);
    const targetAdmin = activeAdmins.find((u) => u.id === selectedAdminId) || activeAdmins[0];

    if (!targetAdmin) {
      setAdminAuthError('No se encontró ningún usuario Administrador activo en el sistema.');
      return;
    }

    if (adminAuthPin === targetAdmin.pin) {
      db.addAuditLog(
        'AUTORIZACION_CONCEDIDA',
        'CONFIG',
        `Edición de Tasa Oficial autorizada mediante PIN por el Administrador ${targetAdmin.nombre} ${targetAdmin.apellido} para el usuario ${activeVendor.nombre}`
      );
      setShowAdminAuthModal(false);
      setAdminAuthPin('');
      setAdminAuthError('');
      setNewExchangeRate(currency.tasaCambio.toString());
      setShowRateModal(true);
      triggerFeedback(`Autorizado por Administrador: ${targetAdmin.nombre}`);
    } else {
      setAdminAuthError('PIN de Administrador incorrecto. Verifique e intente nuevamente.');
      setAdminAuthPin('');
    }
  };

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newExchangeRate);
    if (!isNaN(parsed) && parsed > 0) {
      db.updateCurrency({
        ...currency,
        tasaCambio: parsed,
      });
      db.addAuditLog(
        'CONFIG_ACTUALIZADA',
        'CONFIG',
        `Tasa de cambio oficial actualizada a ${parsed.toFixed(2)} ${currency.monedaReferencia.codigo} por ${activeVendor.nombre}`
      );
      setShowRateModal(false);
      triggerFeedback(`✅ Tasa oficial actualizada a ${parsed.toFixed(2)} ${currency.monedaReferencia.codigo}`);
    }
  };

  const handleLogoutSession = () => {
    if (onLogout) {
      onLogout();
    } else {
      db.logout('Cierre de sesión desde mostrador TPV');
    }
  };

  // -------------------------------------------------------------
  // SALE TYPE STATE: 'DETAL' (Default) <-> 'MAYOR'
  // -------------------------------------------------------------
  const [tipoVenta, setTipoVenta] = useState<'DETAL' | 'MAYOR'>('DETAL');

  // -------------------------------------------------------------
  // SEARCH & CATEGORY FILTER
  // -------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // ACTIVE SALES REGISTER (TICKET DIRECTO - SIN CARRO)
  // -------------------------------------------------------------
  const [ticketItems, setTicketItems] = useState<CartItem[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Client info for ticket
  const [client, setClient] = useState<ClientData>({
    nombre: 'Consumidor Final',
    docId: 'V-00000000',
    telefono: '',
    direccion: '',
  });
  const [showClientModal, setShowClientModal] = useState(false);

  // Dynamic ticket number
  const currentTicketNumber = useMemo(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = (sales.length + 1).toString().padStart(4, '0');
    return `FAC-${dateStr}-${count}`;
  }, [sales.length]);

  // Tax lookup
  const taxMap = useMemo(() => {
    const map = new Map<string, Tax>();
    taxes.forEach((t) => map.set(t.id, t));
    return map;
  }, [taxes]);

  // -------------------------------------------------------------
  // PRODUCT CATALOG FILTERING & MODAL STATES
  // -------------------------------------------------------------
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState<Sale | null>(null);
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  // Filtered active products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.activo === false) return false;
      const matchCat = selectedCategory === 'ALL' || p.categoriaId === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.nombre.toLowerCase().includes(term) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Transient feedback
  const triggerFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((curr) => (curr === msg ? null : curr));
    }, 2200);
  };

  // Helper key for ticket item
  const getItemKey = (item: CartItem) => {
    return item.variante ? `${item.producto.id}_var_${item.variante.id}` : item.producto.id;
  };

  // -------------------------------------------------------------
  // TICKET ACTIONS: ADD, UPDATE QUANTITY, REMOVE, CLEAR
  // -------------------------------------------------------------
  const getProductUnitPrice = (product: Product, variant?: ProductVariant, mode = tipoVenta): number => {
    if (mode === 'MAYOR') {
      const supportsWholesale =
        product.ventaMayorActiva !== false &&
        product.precioMayor !== undefined &&
        product.precioMayor > 0;
      if (supportsWholesale) {
        return product.precioMayor!;
      }
      // If wholesale not supported, default to detal price as specified
      return variant ? variant.precio : product.precioVenta;
    }
    return variant ? variant.precio : product.precioVenta;
  };

  const addToTicket = (product: Product, variant?: ProductVariant) => {
    if (!variant && product.variantes && product.variantes.length > 0) {
      setVariantSelectionProduct(product);
      return;
    }

    const availableStock = variant ? variant.stock : product.stockActual;
    if (availableStock <= 0) {
      triggerFeedback(`❌ Sin stock disponible para ${product.nombre}`);
      return;
    }

    const targetKey = variant ? `${product.id}_var_${variant.id}` : product.id;
    const unitPrice = getProductUnitPrice(product, variant, tipoVenta);
    const tax = taxMap.get(product.impuestoId) || {
      id: 'default',
      nombre: 'Exento',
      porcentaje: 0,
      activo: true,
      esPredeterminado: false,
    };

    setTicketItems((prevItems) => {
      const existing = prevItems.find((item) => getItemKey(item) === targetKey);
      if (existing) {
        if (existing.cantidad >= availableStock) {
          triggerFeedback(`⚠️ Stock máximo alcanzado (${availableStock} uds)`);
          return prevItems;
        }
        const newQty = existing.cantidad + 1;
        const subtotal = Number(
          (newQty * existing.precioUnitario * (1 - existing.descuentoPorcentaje / 100)).toFixed(2)
        );
        const impuestoTotal = Number((subtotal * (existing.impuesto.porcentaje / 100)).toFixed(2));
        const total = Number((subtotal + impuestoTotal).toFixed(2));

        triggerFeedback(`+1 ${product.nombre} al ticket`);
        return prevItems.map((item) =>
          getItemKey(item) === targetKey
            ? { ...item, cantidad: newQty, subtotal, impuestoTotal, total }
            : item
        );
      } else {
        const subtotal = unitPrice;
        const impuestoTotal = Number((subtotal * (tax.porcentaje / 100)).toFixed(2));
        const total = Number((subtotal + impuestoTotal).toFixed(2));

        triggerFeedback(`Agregado: ${product.nombre}`);
        return [
          ...prevItems,
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

  const updateItemQuantity = (itemKey: string, delta: number) => {
    setTicketItems((prevItems) =>
      prevItems
        .map((item) => {
          if (getItemKey(item) !== itemKey) return item;
          const maxStock = item.variante ? item.variante.stock : item.producto.stockActual;
          const newQty = item.cantidad + delta;
          if (newQty <= 0) return null;
          if (newQty > maxStock) {
            triggerFeedback(`⚠️ Stock máximo: ${maxStock} uds`);
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

  const setItemExactQuantity = (itemKey: string, qty: number) => {
    setTicketItems((prevItems) =>
      prevItems.map((item) => {
        if (getItemKey(item) !== itemKey) return item;
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

  const removeItem = (itemKey: string) => {
    setTicketItems((prev) => prev.filter((item) => getItemKey(item) !== itemKey));
  };

  const clearTicket = () => {
    if (ticketItems.length === 0) return;
    setTicketItems([]);
    triggerFeedback('Ticket limpiado');
  };

  // -------------------------------------------------------------
  // TOGGLE TIPO DE VENTA: DETAL <-> MAYOR
  // -------------------------------------------------------------
  const handleToggleTipoVenta = () => {
    const nextMode = tipoVenta === 'DETAL' ? 'MAYOR' : 'DETAL';
    setTipoVenta(nextMode);

    // Recalculate prices of all existing items on the ticket
    setTicketItems((prevItems) =>
      prevItems.map((item) => {
        const newUnitPrice = getProductUnitPrice(item.producto, item.variante, nextMode);
        const subtotal = Number(
          (item.cantidad * newUnitPrice * (1 - item.descuentoPorcentaje / 100)).toFixed(2)
        );
        const impuestoTotal = Number((subtotal * (item.impuesto.porcentaje / 100)).toFixed(2));
        const total = Number((subtotal + impuestoTotal).toFixed(2));

        return {
          ...item,
          precioUnitario: newUnitPrice,
          subtotal,
          impuestoTotal,
          total,
        };
      })
    );

    triggerFeedback(nextMode === 'MAYOR' ? 'VENTA AL MAYOR' : 'VENTA AL DETAL');
  };

  // -------------------------------------------------------------
  // BARCODE SCANNER / QUICK SEARCH ENTER HANDLER
  // -------------------------------------------------------------
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = searchTerm.trim().toLowerCase();
      if (!term) return;

      // Exact barcode match
      for (const p of products) {
        if (p.activo === false) continue;
        if (p.codigoBarras && p.codigoBarras.toLowerCase() === term) {
          addToTicket(p);
          setSearchTerm('');
          return;
        }
        if (p.variantes) {
          const matchedVar = p.variantes.find(
            (v) => v.activo !== false && v.codigoBarras && v.codigoBarras.toLowerCase() === term
          );
          if (matchedVar) {
            addToTicket(p, matchedVar);
            setSearchTerm('');
            return;
          }
        }
      }

      // First filtered product match
      if (filteredProducts.length > 0) {
        addToTicket(filteredProducts[0]);
        setSearchTerm('');
      }
    }
  };

  // -------------------------------------------------------------
  // TOTALS CALCULATION
  // -------------------------------------------------------------
  const subtotalPrincipal = useMemo(
    () => Number(ticketItems.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)),
    [ticketItems]
  );
  const impuestosPrincipal = useMemo(
    () => Number(ticketItems.reduce((acc, item) => acc + item.impuestoTotal, 0).toFixed(2)),
    [ticketItems]
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

  const totalItemsCount = useMemo(
    () => ticketItems.reduce((acc, item) => acc + item.cantidad, 0),
    [ticketItems]
  );

  // -------------------------------------------------------------
  // PAYMENT DETAILS STATE
  // -------------------------------------------------------------
  const [paymentMethod, setPaymentMethod] = useState<PaymentDetails['metodo']>('EFECTIVO_PRINCIPAL');
  const [amountPaidPrimary, setAmountPaidPrimary] = useState<string>('');
  const [amountPaidRef, setAmountPaidRef] = useState<string>('');
  const [referenceCode, setReferenceCode] = useState<string>('');

  // Auto-fill payment amount when modal opens
  useEffect(() => {
    if (showCheckoutModal) {
      setAmountPaidPrimary(totalPrincipal.toFixed(2));
      setAmountPaidRef(totalReferencia.toFixed(2));
    }
  }, [showCheckoutModal, totalPrincipal, totalReferencia]);

  const parsedPaidPrimary = parseFloat(amountPaidPrimary) || 0;
  const parsedPaidRef = parseFloat(amountPaidRef) || 0;

  // Calculo de balance entre monto recibido y total a pagar (Vuelto vs Faltante)
  const balanceDiffPrimary = useMemo(() => {
    return Number((parsedPaidPrimary - totalPrincipal).toFixed(2));
  }, [parsedPaidPrimary, totalPrincipal]);

  const isOverpaid = balanceDiffPrimary > 0.009;
  const isUnderpaid = balanceDiffPrimary < -0.009;
  const isExactPayment = !isOverpaid && !isUnderpaid;

  // Vuelto a entregar si lo recibido supera el total
  const vueltoPrincipal = isOverpaid ? balanceDiffPrimary : 0;
  const vueltoReferencia = useMemo(() => {
    return isOverpaid ? convertToRef(vueltoPrincipal, currency.tasaCambio) : 0;
  }, [isOverpaid, vueltoPrincipal, currency.tasaCambio]);

  // Faltante por cobrar si lo recibido es menor al total
  const faltantePrincipal = isUnderpaid ? Math.abs(balanceDiffPrimary) : 0;
  const faltanteReferencia = useMemo(() => {
    return isUnderpaid ? convertToRef(faltantePrincipal, currency.tasaCambio) : 0;
  }, [isUnderpaid, faltantePrincipal, currency.tasaCambio]);

  // Mantenemos compatibilidad con el objeto Sale existente
  const changePrincipal = vueltoPrincipal;
  const changeReferencia = vueltoReferencia;

  // -------------------------------------------------------------
  // PROCESS SALE & FINALIZE
  // -------------------------------------------------------------
  const handleProcessSale = () => {
    if (ticketItems.length === 0) return;
    setShowCheckoutModal(true);
  };

  const handleConfirmSale = () => {
    if (isUnderpaid && faltantePrincipal > 0.01) {
      const confirmShort = window.confirm(
        `Atención: El monto recibido tiene un FALTANTE de ${formatCurrency(faltantePrincipal, currency.monedaPrincipal)} (${formatCurrency(faltanteReferencia, currency.monedaReferencia)}).\n\n¿Desea confirmar la venta registrando el saldo pendiente?`
      );
      if (!confirmShort) return;
    }

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      numeroTicket: currentTicketNumber,
      fecha: new Date().toISOString(),
      items: ticketItems,
      subtotalPrincipal,
      impuestosPrincipal,
      totalPrincipal,
      subtotalReferencia,
      impuestosReferencia,
      totalReferencia,
      tasaCambioAplicada: currency.tasaCambio,
      pago: {
        metodo: paymentMethod,
        montoPagadoPrincipal: parsedPaidPrimary,
        montoPagadoReferencia: parsedPaidRef,
        cambioPrincipal: changePrincipal,
        cambioReferencia: changeReferencia,
        referenciaBancaria: referenceCode || undefined,
      },
      cliente: client,
      vendedorId: activeVendor.id,
      vendedorNombre: `${activeVendor.nombre} ${activeVendor.apellido}`.trim(),
      estado: 'COMPLETADA',
    };

    // Save to Database
    db.saveSale(newSale);

    // Save audit log
    db.addAuditLog(
      'VENTA_CREADA',
      'VENTAS',
      `Venta #${newSale.numeroTicket} (${tipoVenta}) procesada por ${newSale.vendedorNombre} por ${formatCurrency(newSale.totalPrincipal, currency.monedaPrincipal)}`
    );

    // Notify parent
    onSaleCompleted(newSale, 'none');

    // Keep completed sale in local state for immediate PDF / WhatsApp from this sales tab
    setCompletedSaleData(newSale);
    setShowCheckoutModal(false);
    setShowCompletedModal(true);

    // Reset ticket
    setTicketItems([]);
    setClient({
      nombre: 'Consumidor Final',
      docId: 'V-00000000',
      telefono: '',
      direccion: '',
    });
  };

  // -------------------------------------------------------------
  // PRINT TRADITIONAL INVOICE PDF
  // -------------------------------------------------------------
  const handlePrintTraditionalInvoice = (saleToPrint: Sale = completedSaleData!) => {
    if (!saleToPrint) return;
    generateTraditionalInvoicePDF(
      {
        saleNumber: saleToPrint.numeroTicket,
        date: new Date(saleToPrint.fecha),
        vendorName: saleToPrint.vendedorNombre,
        client: saleToPrint.cliente,
        items: saleToPrint.items,
        subtotalPrincipal: saleToPrint.subtotalPrincipal,
        impuestosPrincipal: saleToPrint.impuestosPrincipal,
        totalPrincipal: saleToPrint.totalPrincipal,
        subtotalReferencia: saleToPrint.subtotalReferencia,
        impuestosReferencia: saleToPrint.impuestosReferencia,
        totalReferencia: saleToPrint.totalReferencia,
        tasaCambio: saleToPrint.tasaCambioAplicada,
        paymentMethod: saleToPrint.pago.metodo,
        paidPrincipal: saleToPrint.pago.montoPagadoPrincipal,
        paidReferencia: saleToPrint.pago.montoPagadoReferencia,
        cambioPrincipal: saleToPrint.pago.cambioPrincipal,
        cambioReferencia: saleToPrint.pago.cambioReferencia,
        referenceCode: saleToPrint.pago.referenciaBancaria,
        tipoVenta,
      },
      company,
      currency
    );
    triggerFeedback('📄 Factura tradicional generada en PDF');
  };

  // -------------------------------------------------------------
  // PRINT THERMAL TICKET PDF
  // -------------------------------------------------------------
  const handlePrintThermalTicket = (saleToPrint: Sale = completedSaleData!) => {
    if (!saleToPrint) return;
    generateTicketPDF(
      {
        saleNumber: saleToPrint.numeroTicket,
        date: new Date(saleToPrint.fecha),
        vendorName: saleToPrint.vendedorNombre,
        client: saleToPrint.cliente,
        items: saleToPrint.items,
        subtotalPrincipal: saleToPrint.subtotalPrincipal,
        impuestosPrincipal: saleToPrint.impuestosPrincipal,
        totalPrincipal: saleToPrint.totalPrincipal,
        subtotalReferencia: saleToPrint.subtotalReferencia,
        impuestosReferencia: saleToPrint.impuestosReferencia,
        totalReferencia: saleToPrint.totalReferencia,
        tasaCambio: saleToPrint.tasaCambioAplicada,
        paymentMethod: saleToPrint.pago.metodo,
        paidPrincipal: saleToPrint.pago.montoPagadoPrincipal,
        paidReferencia: saleToPrint.pago.montoPagadoReferencia,
        cambioPrincipal: saleToPrint.pago.cambioPrincipal,
        cambioReferencia: saleToPrint.pago.cambioReferencia,
        referenceCode: saleToPrint.pago.referenciaBancaria,
      },
      company,
      currency
    );
    triggerFeedback('🧾 Ticket térmico generado en PDF');
  };

  // -------------------------------------------------------------
  // SEND DIRECTLY VIA WHATSAPP (SIN CONFIGURACIÓN ADICIONAL)
  // -------------------------------------------------------------
  const handleSendWhatsApp = (saleToSend: Sale = completedSaleData!) => {
    if (!saleToSend) return;
    const msg = generateWhatsAppMessage(saleToSend, company, currency);
    const rawPhone = saleToSend.cliente?.telefono || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    let waUrl = '';
    if (cleanPhone.length >= 7) {
      waUrl = `https://wa.me/${cleanPhone}?text=${msg}`;
    } else {
      waUrl = `https://wa.me/?text=${msg}`;
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    triggerFeedback('💬 Abriendo WhatsApp con la factura...');
  };

  // Map for variant quantities
  const cartQuantitiesByVariantId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of ticketItems) {
      if (item.variante) {
        map[item.variante.id] = (map[item.variante.id] || 0) + item.cantidad;
      }
    }
    return map;
  }, [ticketItems]);

  return (
    <div className="h-full w-full flex flex-col bg-slate-100 overflow-hidden select-none font-sans">
      {/* ------------------------------------------------------------- */}
      {/* HEADER TPV: NOMBRE EMPRESA & RIF, TASA OFICIAL (PROTEGIDA),  */}
      {/* VENDEDOR ACTIVO CON PIN Y CERRAR SESIÓN                      */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-md z-20 flex-shrink-0 gap-2 border-b border-slate-800">
        {/* Left: Company Name & RIF */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white shadow-xs flex-shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-xs sm:text-sm md:text-base leading-tight text-white tracking-wide truncate uppercase">
              {company.nombre}
            </h1>
            <p className="text-[10.5px] sm:text-xs font-semibold text-emerald-400 tracking-wider truncate">
              RIF: {company.rif}
            </p>
          </div>
        </div>

        {/* Center: Tasa Oficial (Editable - Requiere permisos o PIN de Administrador) */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleInitiateRateEdit}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 hover:border-emerald-500/60 text-slate-200 transition cursor-pointer shadow-xs group"
            title="Haga clic para editar la Tasa Oficial del día (requiere autorización de Administrador)"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[9px] sm:text-[9.5px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <span>TASA OFICIAL</span>
                <span className="text-emerald-400 text-[8.5px] bg-emerald-950/80 border border-emerald-500/30 px-1 py-0.2 rounded font-mono">
                  EDITABLE ✎
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-400 tracking-tight">
                1 {currency.monedaPrincipal.codigo} = {currency.tasaCambio.toFixed(2)} {currency.monedaReferencia.codigo}
              </div>
            </div>
          </button>
        </div>

        {/* Right: Active Vendor with PIN switch & Logout */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Active Vendor Widget */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {activeVendor.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden lg:block pr-1">
              <p className="text-xs font-bold text-slate-200 leading-tight">
                {activeVendor.nombre} {activeVendor.apellido}
              </p>
              <p className="text-[9.5px] text-emerald-400 uppercase font-semibold">
                {activeVendor.role}
              </p>
            </div>

            {/* Cambiar Vendedor (PIN) */}
            <button
              type="button"
              onClick={() => setShowUserSwitchModal(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition cursor-pointer"
              title="Cambiar cajero o vendedor con PIN de seguridad"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Cambiar Vendedor</span>
              <span className="sm:hidden">PIN</span>
            </button>

            {/* Cerrar Sesión */}
            <button
              type="button"
              onClick={handleLogoutSession}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-800/50 text-rose-200 hover:text-white text-xs font-semibold transition cursor-pointer"
              title="Cerrar sesión actual de usuario"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Cerrar Sesión</span>
            </button>
          </div>

          {/* Last Sale Button (if completed) */}
          {completedSaleData && (
            <button
              type="button"
              onClick={() => setShowCompletedModal(true)}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="Ver última factura procesada"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Última Factura</span>
            </button>
          )}
        </div>
      </div>

      {/* Transient Feedback Banner */}
      {feedbackMessage && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-1 px-4 text-center shadow-xs flex items-center justify-center gap-2 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TRADITIONAL POS MAIN WORKSPACE (SPLIT LAYOUT WITHOUT CART)   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* ============================================================= */}
        {/* LEFT COLUMN: CATALOG & SEARCH                                 */}
        {/* ============================================================= */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100 border-r border-slate-200 overflow-hidden">
          {/* Search & Category Header */}
          <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2.5 shadow-2xs">
            {/* Barcode / Search Input */}
            <div className="relative flex items-center">
              <Barcode className="w-5 h-5 absolute left-3 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escanear código de barras o buscar producto (Enter para agregar)..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Quick Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({products.filter((p) => p.activo !== false).length})
              </button>
              {categories
                .filter((c) => c.activa !== false)
                .map((cat) => {
                  const count = products.filter((p) => p.activo !== false && p.categoriaId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.nombre} ({count})
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Current Sale Mode Banner Above Grid */}
          <div
            className={`px-4 py-2 border-b flex items-center justify-between text-xs font-bold transition-colors ${
              tipoVenta === 'MAYOR'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {tipoVenta === 'MAYOR' ? (
                <Boxes className="w-4 h-4 text-indigo-600" />
              ) : (
                <Tag className="w-4 h-4 text-emerald-600" />
              )}
              <span className="tracking-wide">
                MODALIDAD ACTIVA:{' '}
                <strong className="uppercase">
                  {tipoVenta === 'MAYOR' ? 'VENTA AL MAYOR' : 'VENTA AL DETAL'}
                </strong>
              </span>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-3.5 scrollbar-thin">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Package className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
                <p className="text-sm font-semibold">No se encontraron productos activos</p>
                <p className="text-xs text-slate-400 mt-1">
                  Intente ajustar el término de búsqueda o la categoría seleccionada.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => {
                  const hasVariants = product.variantes && product.variantes.length > 0;
                  const isOutOfStock = hasVariants
                    ? product.variantes!.reduce((sum, v) => sum + (v.stock || 0), 0) <= 0
                    : product.stockActual <= 0;

                  // Check if product admits wholesale
                  const admitsWholesale =
                    product.ventaMayorActiva !== false &&
                    product.precioMayor !== undefined &&
                    product.precioMayor > 0;

                  // User rule: only color the border red if product doesn't admit wholesale in wholesale mode
                  const isWholesaleMode = tipoVenta === 'MAYOR';
                  const isNoWholesaleRedBorder = isWholesaleMode && !admitsWholesale;

                  // Price to display
                  let displayPrice = product.precioVenta;
                  let displayPriceLabel = 'Precio Detal:';

                  if (isWholesaleMode) {
                    if (admitsWholesale) {
                      displayPrice = product.precioMayor!;
                      displayPriceLabel = 'Precio Mayor:';
                    } else {
                      displayPrice = product.precioVenta;
                      displayPriceLabel = 'Precio Detal:';
                    }
                  }

                  const displayPriceRef = convertToRef(displayPrice, currency.tasaCambio);

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToTicket(product)}
                      disabled={isOutOfStock}
                      className={`relative flex flex-col text-left p-3 rounded-xl transition-all cursor-pointer shadow-2xs group ${
                        isOutOfStock
                          ? 'bg-slate-200/70 border border-slate-300 opacity-60 cursor-not-allowed'
                          : isNoWholesaleRedBorder
                          ? 'bg-white hover:bg-slate-50 border-2 border-red-500 hover:border-red-600 text-slate-800'
                          : isWholesaleMode && admitsWholesale
                          ? 'bg-white hover:bg-indigo-50/50 border border-indigo-300 hover:border-indigo-500 text-slate-800'
                          : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500 text-slate-800'
                      }`}
                    >
                      {/* Subtle wholesale indicator if product has active wholesale pricing */}
                      {isWholesaleMode && admitsWholesale && (
                        <div className="w-full mb-1.5 py-0.5 px-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9.5px] font-bold text-center uppercase tracking-wider flex items-center justify-center gap-1">
                          <Boxes className="w-3 h-3 text-indigo-600" />
                          <span>PRECIO AL MAYOR</span>
                        </div>
                      )}

                      {/* Header: SKU / Code & Stock */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 w-full">
                        <span className="truncate font-mono">
                          {product.codigoBarras || 'S/C'}
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : (product.stockActual || 0) <= (product.stockMinimo || 5)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Stock: {product.stockActual} {product.unidadMedida}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h3
                        className="text-xs font-bold line-clamp-2 leading-tight flex-1 mb-2 text-slate-800"
                        title={product.nombre}
                      >
                        {product.nombre}
                      </h3>

                      {/* Variants indicator */}
                      {hasVariants && (
                        <div className="flex items-center gap-1 text-[10.5px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded mb-2 w-fit font-medium">
                          <Layers className="w-3 h-3" />
                          <span>{product.variantes!.length} variantes</span>
                        </div>
                      )}

                      {/* Price Box */}
                      <div className="w-full pt-2 border-t mt-auto border-slate-100">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {displayPriceLabel}
                          </span>
                          <span
                            className={`text-sm font-black ${
                              isWholesaleMode && admitsWholesale
                                ? 'text-indigo-700'
                                : 'text-emerald-600'
                            }`}
                          >
                            {formatCurrency(displayPrice, currency.monedaPrincipal)}
                          </span>
                        </div>
                        <p className="text-[10px] text-right font-semibold text-slate-500">
                          {formatCurrency(displayPriceRef, currency.monedaReferencia)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* RIGHT COLUMN: TRADITIONAL TICKET REGISTER (SIN CARRO)         */}
        {/* ============================================================= */}
        <div className="w-full md:w-[420px] lg:w-[480px] xl:w-[520px] flex flex-col bg-white border-l border-slate-200 shadow-md min-h-0 flex-shrink-0">
          {/* Ticket Header: Client, Invoice #, Clear */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Ticket de Venta
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-xs font-bold">
                  {currentTicketNumber}
                </span>
              </div>

              {ticketItems.length > 0 && (
                <button
                  onClick={clearTicket}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Vaciar ticket actual"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            {/* Client Selector Row */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="truncate">
                  <p className="font-bold text-slate-800 truncate leading-tight">
                    {client.nombre}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {client.docId} {client.telefono ? `• ${client.telefono}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowClientModal(true)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] transition-colors cursor-pointer flex-shrink-0"
              >
                Cambiar Cliente
              </button>
            </div>
          </div>

          {/* Ticket Items List / Table */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            {ticketItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                  <Receipt className="w-8 h-8 stroke-1" />
                </div>
                <p className="text-sm font-bold text-slate-600">Terminal Listo para Vender</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Escanee un código de barras o seleccione productos del catálogo izquierdo para agregarlos al ticket de venta.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ticketItems.map((item) => {
                  const itemKey = getItemKey(item);
                  const isItemWholesale =
                    tipoVenta === 'MAYOR' &&
                    item.producto.ventaMayorActiva !== false &&
                    (item.producto.precioMayor || 0) > 0;

                  return (
                    <div
                      key={itemKey}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/80 transition-colors gap-2"
                    >
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-slate-800 truncate">
                            {item.producto.nombre}
                          </h4>
                          {isItemWholesale ? (
                            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[9.5px] font-bold rounded">
                              MAYOR
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9.5px] font-bold rounded">
                              DETAL
                            </span>
                          )}
                        </div>
                        {item.variante && (
                          <p className="text-[10px] text-purple-700 font-medium">
                            Variante: {item.variante.nombre}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatCurrency(item.precioUnitario, currency.monedaPrincipal)} c/u
                        </p>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                        <button
                          onClick={() => updateItemQuantity(itemKey, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => setItemExactQuantity(itemKey, parseInt(e.target.value) || 1)}
                          className="w-9 text-center text-xs font-bold text-slate-800 focus:outline-hidden"
                        />
                        <button
                          onClick={() => updateItemQuantity(itemKey, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right min-w-[70px]">
                        <p className="text-xs font-black text-slate-900">
                          {formatCurrency(item.total, currency.monedaPrincipal)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatCurrency(item.total * currency.tasaCambio, currency.monedaReferencia)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(itemKey)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* TOTALS SUMMARY BOX                                          */}
          {/* ----------------------------------------------------------- */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Renglones / Unidades:</span>
              <span className="font-semibold text-slate-700">
                {ticketItems.length} ítems ({totalItemsCount} unidades)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(subtotalPrincipal, currency.monedaPrincipal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Impuesto (IVA):</span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(impuestosPrincipal, currency.monedaPrincipal)}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2 mt-1 flex items-baseline justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  TOTAL A COBRAR
                </p>
                <p className="text-xs text-emerald-600 font-bold">
                  {formatCurrency(totalReferencia, currency.monedaReferencia)}
                </p>
              </div>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(totalPrincipal, currency.monedaPrincipal)}
              </p>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* BOTTOM BAR: DOS BOTONES INFERIORES                          */}
          {/* 1. TIPO DE VENTA (DETAL <-> MAYOR)                          */}
          {/* 2. PROCESAR VENTA                                           */}
          {/* ----------------------------------------------------------- */}
          <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-2 gap-2.5">
            {/* Botón 1: Tipo de Venta (DETAL o MAYOR) */}
            <button
              onClick={handleToggleTipoVenta}
              className={`py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                tipoVenta === 'DETAL'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              title="Pulse para alternar entre VENTA AL DETAL y VENTA AL MAYOR"
            >
              {tipoVenta === 'DETAL' ? (
                <>
                  <Tag className="w-4 h-4 text-emerald-200" />
                  <span>VENTA AL DETAL</span>
                </>
              ) : (
                <>
                  <Boxes className="w-4 h-4 text-indigo-200" />
                  <span>VENTA AL MAYOR</span>
                </>
              )}
            </button>

            {/* Botón 2: Procesar Venta */}
            <button
              onClick={handleProcessSale}
              disabled={ticketItems.length === 0}
              className={`py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                ticketItems.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-md'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>PROCESAR VENTA</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: COBRO Y PROCESAMIENTO DE PAGO                        */}
      {/* ------------------------------------------------------------- */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cobrar y Procesar Venta ({tipoVenta === 'MAYOR' ? 'Al Mayor' : 'Al Detal'})
                </h3>
                <p className="text-xs text-slate-500">Ticket: {currentTicketNumber}</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Total Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Total a Cobrar</p>
                  <p className="text-2xl font-black text-white">
                    {formatCurrency(totalPrincipal, currency.monedaPrincipal)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-400 font-semibold uppercase">En Referencia</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(totalReferencia, currency.monedaReferencia)}
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'EFECTIVO_PRINCIPAL', label: 'Efectivo ($)', icon: DollarSign },
                    { id: 'EFECTIVO_REFERENCIA', label: 'Efectivo (Bs.)', icon: DollarSign },
                    { id: 'PAGO_MOVIL_TRANSFERENCIA', label: 'Pago Móvil / Transf.', icon: Smartphone },
                    { id: 'TARJETA', label: 'Punto de Venta / Tarjeta', icon: CreditCard },
                    { id: 'MIXTO', label: 'Pago Mixto / Combinado', icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Cash Buttons & Amount Inputs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Monto Recibido
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAmountPaidPrimary(totalPrincipal.toFixed(2));
                        setAmountPaidRef(totalReferencia.toFixed(2));
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold transition cursor-pointer"
                    >
                      Monto Exacto
                    </button>
                    {[10, 20, 50, 100].map((bill) => {
                      if (bill < totalPrincipal && bill !== 100) return null;
                      return (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => {
                            setAmountPaidPrimary(bill.toFixed(2));
                            setAmountPaidRef((bill * currency.tasaCambio).toFixed(2));
                          }}
                          className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition cursor-pointer"
                        >
                          ${bill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      En {currency.monedaPrincipal.nombre} ({currency.monedaPrincipal.simbolo})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                        {currency.monedaPrincipal.simbolo}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaidPrimary}
                        onChange={(e) => {
                          setAmountPaidPrimary(e.target.value);
                          const val = parseFloat(e.target.value) || 0;
                          setAmountPaidRef((val * currency.tasaCambio).toFixed(2));
                        }}
                        className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      En {currency.monedaReferencia.nombre} ({currency.monedaReferencia.simbolo})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                        {currency.monedaReferencia.simbolo}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaidRef}
                        onChange={(e) => {
                          setAmountPaidRef(e.target.value);
                          const val = parseFloat(e.target.value) || 0;
                          setAmountPaidPrimary((val / currency.tasaCambio).toFixed(2));
                        }}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Code if not Cash */}
              {paymentMethod !== 'EFECTIVO_PRINCIPAL' && paymentMethod !== 'EFECTIVO_REFERENCIA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    N° de Referencia Bancaria / Comprobante
                  </label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="Ej. 12345678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Balance Result: VUELTO vs FALTANTE vs PAGO EXACTO */}
              {isOverpaid && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-xs flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-900 tracking-wide uppercase">
                        VUELTO / CAMBIO A ENTREGAR
                      </p>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        En {currency.monedaReferencia.nombre}: {formatCurrency(vueltoReferencia, currency.monedaReferencia)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-800 tracking-tight leading-none">
                      {formatCurrency(vueltoPrincipal, currency.monedaPrincipal)}
                    </p>
                    <span className="text-[10.5px] font-bold text-emerald-600 uppercase">
                      Cambio Listo
                    </span>
                  </div>
                </div>
              )}

              {isUnderpaid && (
                <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shadow-xs flex-shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-rose-900 tracking-wide uppercase">
                        MONTO FALTANTE POR COBRAR
                      </p>
                      <p className="text-xs font-bold text-rose-700 mt-0.5">
                        Resta por cobrar: {formatCurrency(faltanteReferencia, currency.monedaReferencia)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-rose-700 tracking-tight leading-none">
                      -{formatCurrency(faltantePrincipal, currency.monedaPrincipal)}
                    </p>
                    <span className="text-[10.5px] font-bold text-rose-600 uppercase">
                      Saldo Incompleto
                    </span>
                  </div>
                </div>
              )}

              {isExactPayment && (
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase">
                        PAGO EXACTO RECIBIDO
                      </p>
                      <p className="text-[11px] text-slate-500">
                        El monto recibido cubre el total exacto de la venta.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
                    Vuelto: {currency.monedaPrincipal.simbolo}0.00
                  </span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-colors cursor-pointer shadow-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar y Finalizar Venta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: VENTA COMPLETADA - FACTURA PDF & WHATSAPP            */}
      {/* ------------------------------------------------------------- */}
      {showCompletedModal && completedSaleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            {/* Top Success Header */}
            <div className="bg-emerald-600 text-white p-6 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <Check className="w-7 h-7 text-white stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black tracking-wide">¡VENTA PROCESADA CON ÉXITO!</h3>
              <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                Factura: {completedSaleData.numeroTicket}
              </p>
            </div>

            {/* Summary Details */}
            <div className="p-5 space-y-3.5 bg-slate-50 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Cliente:</span>
                <span className="font-bold text-slate-800">
                  {completedSaleData.cliente?.nombre || 'Consumidor Final'} ({completedSaleData.cliente?.docId || 'V-00000000'})
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Vendedor:</span>
                <span className="font-bold text-slate-800">{completedSaleData.vendedorNombre}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Modalidad:</span>
                <span className="font-bold text-emerald-700">
                  VENTA AL {tipoVenta}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2 text-sm">
                <span className="text-slate-700 font-black">Total Cobrado:</span>
                <span className="font-black text-slate-900">
                  {formatCurrency(completedSaleData.totalPrincipal, currency.monedaPrincipal)} /{' '}
                  {formatCurrency(completedSaleData.totalReferencia, currency.monedaReferencia)}
                </span>
              </div>

              {completedSaleData.pago.cambioPrincipal > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex justify-between font-bold text-emerald-900">
                  <span>Cambio Entregado:</span>
                  <span>
                    {formatCurrency(completedSaleData.pago.cambioPrincipal, currency.monedaPrincipal)} ({formatCurrency(completedSaleData.pago.cambioReferencia, currency.monedaReferencia)})
                  </span>
                </div>
              )}
            </div>

            {/* Direct Action Buttons: Factura PDF & WhatsApp */}
            <div className="p-5 bg-white space-y-2.5">
              {/* Traditional Invoice PDF */}
              <button
                onClick={() => handlePrintTraditionalInvoice(completedSaleData)}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Factura Tradicional (PDF)</span>
              </button>

              {/* Send directly via WhatsApp */}
              <button
                onClick={() => handleSendWhatsApp(completedSaleData)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Enviar Factura por WhatsApp</span>
              </button>

              {/* Optional Thermal Receipt PDF */}
              <button
                onClick={() => handlePrintThermalTicket(completedSaleData)}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>Imprimir Ticket Térmico 80mm</span>
              </button>

              {/* Ready for Next Sale */}
              <button
                onClick={() => setShowCompletedModal(false)}
                className="w-full mt-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Nueva Venta (Caja Lista)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CAMBIAR DATOS DEL CLIENTE EN EL TICKET               */}
      {/* ------------------------------------------------------------- */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Datos del Cliente para la Factura</h3>
              <button
                onClick={() => setShowClientModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre o Razón Social
                </label>
                <input
                  type="text"
                  value={client.nombre}
                  onChange={(e) => setClient({ ...client, nombre: e.target.value })}
                  placeholder="Ej. Consumidor Final o Empresa C.A."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cédula / RIF / NIT
                  </label>
                  <input
                    type="text"
                    value={client.docId}
                    onChange={(e) => setClient({ ...client, docId: e.target.value })}
                    placeholder="Ej. V-12345678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={client.telefono || ''}
                    onChange={(e) => setClient({ ...client, telefono: e.target.value })}
                    placeholder="Ej. 04141234567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección Fiscal (Opcional)
                </label>
                <input
                  type="text"
                  value={client.direccion || ''}
                  onChange={(e) => setClient({ ...client, direccion: e.target.value })}
                  placeholder="Ej. Av. Principal, Local 4"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setClient({
                    nombre: 'Consumidor Final',
                    docId: 'V-00000000',
                    telefono: '',
                    direccion: '',
                  });
                  setShowClientModal(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Consumidor Final
              </button>
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: CAMBIO DE VENDEDOR CON VERIFICACIÓN POR PIN          */}
      {/* ------------------------------------------------------------- */}
      {showUserSwitchModal && (
        <UserSwitchModal
          currentUser={activeVendor}
          users={users.length > 0 ? users : [activeVendor]}
          onClose={() => setShowUserSwitchModal(false)}
          onUserChanged={(newUser) => {
            setActiveVendor(newUser);
            setShowUserSwitchModal(false);
            triggerFeedback(`Vendedor cambiado a: ${newUser.nombre} ${newUser.apellido}`);
          }}
          onLogout={handleLogoutSession}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: AUTORIZACIÓN POR PIN DE ADMINISTRADOR (TASA OFICIAL)   */}
      {/* ------------------------------------------------------------- */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Autorización de Administrador</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminAuthModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5 mb-0.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Permiso Restringido</span>
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  El usuario actual <strong>{activeVendor.nombre}</strong> ({activeVendor.role}) no tiene permisos para editar la Tasa Oficial. Ingrese el PIN de un Administrador para autorizar.
                </p>
              </div>

              {/* Selector de Administrador (si hay más de 1) */}
              {(() => {
                const activeAdmins = (users.length > 0 ? users : db.getDatabase().usuarios || []).filter(
                  (u) => u.role === 'ADMINISTRADOR' && u.activo
                );
                return (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Administrador que Autoriza:
                    </label>
                    <select
                      value={selectedAdminId || (activeAdmins[0]?.id || '')}
                      onChange={(e) => {
                        setSelectedAdminId(e.target.value);
                        setAdminAuthError('');
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      {activeAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.nombre} {admin.apellido} ({admin.docId})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {/* PIN Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIN de Seguridad del Administrador:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={adminAuthPin}
                    onChange={(e) => {
                      setAdminAuthPin(e.target.value.replace(/\D/g, ''));
                      setAdminAuthError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifyAdminAuth();
                      }
                    }}
                    placeholder="••••"
                    className="w-full text-center tracking-[0.5em] py-3 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                </div>
                {adminAuthError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{adminAuthError}</span>
                  </p>
                )}
              </div>

              {/* Teclado Numérico Virtual para TPV Touch */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') {
                        setAdminAuthPin('');
                        setAdminAuthError('');
                      } else if (k === '⌫') {
                        setAdminAuthPin((prev) => prev.slice(0, -1));
                        setAdminAuthError('');
                      } else {
                        if (adminAuthPin.length < 6) {
                          setAdminAuthPin((prev) => prev + k);
                          setAdminAuthError('');
                        }
                      }
                    }}
                    className={`py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
                      k === 'C'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : k === '⌫'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdminAuthModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyAdminAuth()}
                  disabled={!adminAuthPin}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                    adminAuthPin
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Autorizar Edición
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDICIÓN DE TASA OFICIAL (EDITABLE)                    */}
      {/* ------------------------------------------------------------- */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Editar Tasa Oficial</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Equivalencia de 1 {currency.monedaPrincipal.nombre} ({currency.monedaPrincipal.simbolo}) en {currency.monedaReferencia.nombre}:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    {currency.monedaReferencia.simbolo}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newExchangeRate}
                    onChange={(e) => setNewExchangeRate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Botones de ajuste rápido */}
              <div className="flex items-center gap-1.5">
                {[-1, -0.5, 0.5, 1].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => {
                      const current = parseFloat(newExchangeRate) || currency.tasaCambio;
                      setNewExchangeRate(Math.max(0.01, current + delta).toFixed(2));
                    }}
                    className="flex-1 py-1 px-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                <p className="font-semibold">Actualización en Tiempo Real:</p>
                <p className="opacity-90">
                  Esta tasa actualizará inmediatamente todos los precios de referencia y cálculos de vuelto en el TPV.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Guardar Tasa Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: SELECTOR DE VARIANTES                                */}
      {/* ------------------------------------------------------------- */}
      {variantSelectionProduct && (
        <VariantSelectorModal
          product={variantSelectionProduct}
          currency={currency}
          isOpen={true}
          onClose={() => setVariantSelectionProduct(null)}
          onSelectVariant={(variant) => {
            addToTicket(variantSelectionProduct, variant);
            setVariantSelectionProduct(null);
          }}
          cartQuantitiesByVariantId={cartQuantitiesByVariantId}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: HISTORIAL DE VENTAS                                  */}
      {/* ------------------------------------------------------------- */}
      {showHistoryModal && (
        <SalesHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          sales={sales}
          currency={currency}
          company={company}
          onViewTicket={(sale) => {
            setCompletedSaleData(sale);
            setShowHistoryModal(false);
            setShowCompletedModal(true);
          }}
        />
      )}
    </div>
  );
};
