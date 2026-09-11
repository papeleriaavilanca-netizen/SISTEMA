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
  SavedSale,
  ClientData,
  PaymentDetails,
  User,
  ClientDebt,
  WorkshopOrder,
  WorkshopOrderItem,
  WorkshopOrderPaymentRecord,
  CurrencyItem,
  BankAccount,
  PaymentMethodItem,
} from '../types';
import { db } from '../services/db';
import { formatCurrency, convertToRef, convertToPrimary, generateWhatsAppMessage, generateDebtWhatsAppReminder } from '../utils/formatters';
import { generateTicketPDF, generateTraditionalInvoicePDF } from '../utils/ticketPdf';
import { VariantSelectorModal } from './VariantSelectorModal';
import { SalesHistoryModal } from './SalesHistoryModal';
import { UserSwitchModal } from './UserSwitchModal';
import { AccountsReceivableModal } from './AccountsReceivableModal';
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
  UserPlus,
  Send,
  BookmarkCheck,
  FolderClock,
  PlayCircle,
  FileText,
  ClipboardList,
  Calendar,
  ShieldAlert,
  KeyRound,
  Banknote,
  Landmark,
  Copy,
  Wallet,
  Coins,
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
  onNavigateToWorkshop?: (orderId?: string) => void;
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
  onNavigateToWorkshop,
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
      const allUsers = users.length > 0 ? users : db.getUsers();
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
    const allUsers = users.length > 0 ? users : db.getUsers();
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
  const [allClients, setAllClients] = useState<ClientData[]>(() => db.getClients());
  const [client, setClient] = useState<ClientData>({
    nombre: 'Consumidor Final',
    docId: 'V-00000000',
    telefono: '',
    direccion: '',
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState<ClientData>({
    nombre: '',
    docId: '',
    telefono: '',
    direccion: '',
    email: '',
  });
  const clientSearchContainerRef = useRef<HTMLDivElement>(null);

  // Close client dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        clientSearchContainerRef.current &&
        !clientSearchContainerRef.current.contains(event.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered clients for quick search
  const matchedClients = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return allClients.slice(0, 8);
    return allClients.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.docId.toLowerCase().includes(q) ||
        (c.telefono && c.telefono.toLowerCase().includes(q))
    );
  }, [allClients, clientSearchQuery]);

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

  // -------------------------------------------------------------
  // VENTAS GUARDADAS / EN ESPERA (HOLD SALES)
  // No alteran inventario, stock, movimientos ni estadísticas.
  // -------------------------------------------------------------
  const [savedSales, setSavedSales] = useState<SavedSale[]>(() => db.getSavedSales());
  const [showSavedSalesModal, setShowSavedSalesModal] = useState(false);
  const [savedSaleSearchQuery, setSavedSaleSearchQuery] = useState('');
  const [selectedSavedSaleDetail, setSelectedSavedSaleDetail] = useState<SavedSale | null>(null);

  // -------------------------------------------------------------
  // TOMAR PEDIDO MODAL (PLANTILLA COBRAR Y PROCESAR VENTA)
  // Datos obligatorios: Pago correspondiente y Fecha de entrega
  // Si monto recibido < 50%, confirmación de Administrador por PIN
  // Si monto no cubre total, registrar como ABONO. Dataline: ACEPTADO
  // -------------------------------------------------------------
  const [showTakeOrderModal, setShowTakeOrderModal] = useState(false);
  const [saleForTakeOrder, setSaleForTakeOrder] = useState<SavedSale | null>(null);
  const [takeOrderDeliveryDate, setTakeOrderDeliveryDate] = useState('');
  const [takeOrderPaymentMethod, setTakeOrderPaymentMethod] = useState<string>('PAGO_MIXTO');
  const [takeOrderSingleAmount, setTakeOrderSingleAmount] = useState('');
  const [takeOrderMixedAmounts, setTakeOrderMixedAmounts] = useState<Record<string, string>>({});
  const [takeOrderAmountPaidPrimary, setTakeOrderAmountPaidPrimary] = useState('');
  const [takeOrderAmountPaidRef, setTakeOrderAmountPaidRef] = useState('');
  const [takeOrderReferenceCode, setTakeOrderReferenceCode] = useState('');
  const [takeOrderNotes, setTakeOrderNotes] = useState('');
  const [takeOrderError, setTakeOrderError] = useState('');

  // Confirmación de Administrador por PIN cuando monto recibido < 50%
  const [showTakeOrderAdminAuthModal, setShowTakeOrderAdminAuthModal] = useState(false);
  const [takeOrderAdminPin, setTakeOrderAdminPin] = useState('');
  const [takeOrderAdminError, setTakeOrderAdminError] = useState('');
  const [takeOrderSelectedAdminId, setTakeOrderSelectedAdminId] = useState('');

  // -------------------------------------------------------------
  // CUENTAS POR COBRAR / DEUDAS CLIENTE (ESTRICTO CONTROL)
  // -------------------------------------------------------------
  const [showAccountsReceivableModal, setShowAccountsReceivableModal] = useState(false);
  const [accountsReceivableClientFilter, setAccountsReceivableClientFilter] = useState<string | undefined>(undefined);
  const [dbDebtTick, setDbDebtTick] = useState(0);

  // Pending debt for currently selected client
  const clientDebtInfo = useMemo(() => {
    if (!client || !client.docId || client.docId === 'V-00000000') {
      return { totalPrincipal: 0, totalReferencia: 0, debts: [] };
    }
    return db.getClientTotalPendingDebt(client.docId);
  }, [client, dbDebtTick]);

  // Check if debt charge is already loaded in current ticket
  const isDebtLoadedInTicket = useMemo(() => {
    return ticketItems.some(
      (item) => item.producto.id === 'DEUDA-PENDIENTE' || item.producto.codigoBarras === 'DEUDA-CXC'
    );
  }, [ticketItems]);

  // Overall active debts count across the whole system for the header badge
  const pendingDebtsCount = useMemo(() => {
    return db.getPendingClientDebts().length;
  }, [dbDebtTick]);

  // Filtered saved sales for tracking modal search
  const filteredSavedSales = useMemo(() => {
    const q = savedSaleSearchQuery.trim().toLowerCase();
    if (!q) return savedSales;
    return savedSales.filter(
      (s) =>
        s.codigo.toLowerCase().includes(q) ||
        (s.cliente && s.cliente.nombre.toLowerCase().includes(q)) ||
        (s.cliente && s.cliente.docId.toLowerCase().includes(q)) ||
        (s.cliente?.telefono && s.cliente.telefono.includes(q)) ||
        s.vendedorNombre.toLowerCase().includes(q)
    );
  }, [savedSales, savedSaleSearchQuery]);

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
  // PAYMENT METHODS & CURRENCIES FROM FACTURACIÓN & FINANZAS
  // -------------------------------------------------------------
  const allCurrencies = useMemo(() => db.getCurrencies(), [dbDebtTick, showCheckoutModal, showTakeOrderModal]);
  const activeCurrencies = useMemo(() => {
    const list = allCurrencies.filter((c) => c.activa);
    return list.length > 0 ? list : allCurrencies;
  }, [allCurrencies]);

  const allBankAccounts = useMemo(() => db.getBankAccounts(), [dbDebtTick, showCheckoutModal, showTakeOrderModal]);

  const allPaymentMethods = useMemo(() => db.getPaymentMethodsConfig(), [dbDebtTick, showCheckoutModal, showTakeOrderModal]);
  const configuredPaymentMethods = useMemo(() => {
    const list = allPaymentMethods.filter((m) => m.activo);
    return list.length > 0 ? list : allPaymentMethods;
  }, [allPaymentMethods]);

  // Selected payment method in checkout: active payment method ID or 'PAGO_MIXTO'
  const [paymentMethod, setPaymentMethod] = useState<string>(() => {
    return configuredPaymentMethods[0]?.id || 'PAGO_MIXTO';
  });

  // Single method received amount in that method's currency
  const [singleAmountReceived, setSingleAmountReceived] = useState<string>('');

  // Mixed payment amounts per active currency (currency.id -> amount string)
  const [mixedCurrencyAmounts, setMixedCurrencyAmounts] = useState<Record<string, string>>({});

  const [referenceCode, setReferenceCode] = useState<string>('');

  // Current selected single method & currency
  const isMixedPayment = paymentMethod === 'PAGO_MIXTO';

  const currentSelectedMethod = useMemo(() => {
    return configuredPaymentMethods.find((m) => m.id === paymentMethod) || configuredPaymentMethods[0];
  }, [configuredPaymentMethods, paymentMethod]);

  const currentMethodCurrency = useMemo(() => {
    if (!currentSelectedMethod) return allCurrencies[0];
    return allCurrencies.find((c) => c.id === currentSelectedMethod.monedaId) || allCurrencies.find((c) => c.esPrincipal) || allCurrencies[0];
  }, [allCurrencies, currentSelectedMethod]);

  const currentMethodAccount = useMemo(() => {
    if (!currentSelectedMethod) return undefined;
    return allBankAccounts.find((a) => a.id === currentSelectedMethod.cuentaId);
  }, [allBankAccounts, currentSelectedMethod]);

  const currentMethodRate = useMemo(() => {
    if (!currentMethodCurrency) return 1.0;
    if (currentMethodCurrency.esPrincipal) return 1.0;
    return currentMethodCurrency.valorTasa > 0 ? currentMethodCurrency.valorTasa : currency.tasaCambio;
  }, [currentMethodCurrency, currency.tasaCambio]);

  const requiredInMethodCurrency = useMemo(() => {
    if (!currentMethodCurrency) return totalPrincipal;
    if (currentMethodCurrency.esPrincipal) return totalPrincipal;
    return Number((totalPrincipal * currentMethodRate).toFixed(currentMethodCurrency.decimales || 2));
  }, [currentMethodCurrency, currentMethodRate, totalPrincipal]);

  const parsedMethodCurrencyAmount = parseFloat(singleAmountReceived) || 0;

  // Breakdown for mixed payment: calculates each active currency independently
  const mixedCurrencyBreakdown = useMemo(() => {
    return activeCurrencies.map((c) => {
      const rate = c.esPrincipal ? 1.0 : (c.valorTasa > 0 ? c.valorTasa : currency.tasaCambio);
      const amountStr = mixedCurrencyAmounts[c.id] || '';
      const amountNum = parseFloat(amountStr) || 0;
      const equivPrincipal = c.esPrincipal ? amountNum : (rate > 0 ? amountNum / rate : amountNum);
      const equivReferencia = equivPrincipal * currency.tasaCambio;
      return {
        currency: c,
        rate,
        amountStr,
        amountNum,
        equivPrincipal,
        equivReferencia,
      };
    });
  }, [activeCurrencies, mixedCurrencyAmounts, currency.tasaCambio]);

  const totalMixedReceivedPrincipal = useMemo(() => {
    return mixedCurrencyBreakdown.reduce((sum, item) => sum + item.equivPrincipal, 0);
  }, [mixedCurrencyBreakdown]);

  // Unified paid amounts in Principal and Reference
  const parsedPaidPrimary = useMemo(() => {
    if (isMixedPayment) {
      return totalMixedReceivedPrincipal;
    }
    if (currentMethodCurrency?.esPrincipal) {
      return parsedMethodCurrencyAmount;
    }
    return currentMethodRate > 0 ? parsedMethodCurrencyAmount / currentMethodRate : parsedMethodCurrencyAmount;
  }, [isMixedPayment, totalMixedReceivedPrincipal, currentMethodCurrency, parsedMethodCurrencyAmount, currentMethodRate]);

  const parsedPaidRef = useMemo(() => {
    return parsedPaidPrimary * currency.tasaCambio;
  }, [parsedPaidPrimary, currency.tasaCambio]);

  // Backward compatibility strings
  const amountPaidPrimary = parsedPaidPrimary.toFixed(2);
  const amountPaidRef = parsedPaidRef.toFixed(2);

  // Auto-fill payment amount when modal opens or method changes
  useEffect(() => {
    if (showCheckoutModal) {
      const isValid = configuredPaymentMethods.some((m) => m.id === paymentMethod) || paymentMethod === 'PAGO_MIXTO';
      const targetMethodId = isValid ? paymentMethod : (configuredPaymentMethods[0]?.id || 'PAGO_MIXTO');
      if (!isValid) {
        setPaymentMethod(targetMethodId);
      }

      if (targetMethodId !== 'PAGO_MIXTO') {
        const methodObj = configuredPaymentMethods.find((m) => m.id === targetMethodId) || configuredPaymentMethods[0];
        if (methodObj) {
          const curr = allCurrencies.find((c) => c.id === methodObj.monedaId) || allCurrencies.find((c) => c.esPrincipal) || allCurrencies[0];
          const rate = curr?.esPrincipal ? 1.0 : (curr?.valorTasa > 0 ? curr.valorTasa : currency.tasaCambio);
          const reqInCurr = curr?.esPrincipal ? totalPrincipal : Number((totalPrincipal * rate).toFixed(curr?.decimales || 2));
          setSingleAmountReceived(reqInCurr.toFixed(curr?.decimales || 2));
        }
      }

      const initialMixed: Record<string, string> = {};
      activeCurrencies.forEach((c) => {
        initialMixed[c.id] = '';
      });
      setMixedCurrencyAmounts(initialMixed);
      setReferenceCode('');
    }
  }, [showCheckoutModal, totalPrincipal, configuredPaymentMethods, allCurrencies]);

  const handleSelectPaymentMethod = (methodId: string) => {
    setPaymentMethod(methodId);
    if (methodId !== 'PAGO_MIXTO') {
      const methodObj = configuredPaymentMethods.find((m) => m.id === methodId);
      if (methodObj) {
        const curr = allCurrencies.find((c) => c.id === methodObj.monedaId) || allCurrencies.find((c) => c.esPrincipal) || allCurrencies[0];
        const rate = curr?.esPrincipal ? 1.0 : (curr?.valorTasa > 0 ? curr.valorTasa : currency.tasaCambio);
        const reqInCurr = curr?.esPrincipal ? totalPrincipal : Number((totalPrincipal * rate).toFixed(curr?.decimales || 2));
        setSingleAmountReceived(reqInCurr.toFixed(curr?.decimales || 2));
      }
    }
  };

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

  const vueltoInMethodCurrency = useMemo(() => {
    if (!isOverpaid || isMixedPayment) return 0;
    return Math.max(0, parsedMethodCurrencyAmount - requiredInMethodCurrency);
  }, [isOverpaid, isMixedPayment, parsedMethodCurrencyAmount, requiredInMethodCurrency]);

  // Faltante por cobrar si lo recibido es menor al total
  const faltantePrincipal = isUnderpaid ? Math.abs(balanceDiffPrimary) : 0;
  const faltanteReferencia = useMemo(() => {
    return isUnderpaid ? convertToRef(faltantePrincipal, currency.tasaCambio) : 0;
  }, [isUnderpaid, faltantePrincipal, currency.tasaCambio]);

  const faltanteInMethodCurrency = useMemo(() => {
    if (!isUnderpaid || isMixedPayment) return 0;
    return Math.max(0, requiredInMethodCurrency - parsedMethodCurrencyAmount);
  }, [isUnderpaid, isMixedPayment, requiredInMethodCurrency, parsedMethodCurrencyAmount]);

  // Mantenemos compatibilidad con el objeto Sale existente
  const changePrincipal = vueltoPrincipal;
  const changeReferencia = vueltoReferencia;

  // -------------------------------------------------------------
  // PROCESS SALE & FINALIZE
  // -------------------------------------------------------------
  const handleProcessSale = () => {
    if (ticketItems.length === 0) {
      triggerFeedback('⚠️ El ticket está vacío. Agregue productos antes de procesar la venta.');
      return;
    }
    setShowCheckoutModal(true);
  };

  // -------------------------------------------------------------
  // GUARDAR VENTA EN ESPERA (SIN AFECTAR STOCK NI ESTADÍSTICAS)
  // -------------------------------------------------------------
  const handleSaveSaleOnHold = () => {
    if (ticketItems.length === 0) {
      triggerFeedback('⚠️ El ticket está vacío. Agregue productos antes de guardar la venta.');
      return;
    }

    const nextNumber = (savedSales.length + 1).toString().padStart(3, '0');
    const codigo = `ESP-${nextNumber}`;
    const newSavedSale: SavedSale = {
      id: `saved_${Date.now()}`,
      codigo,
      fecha: new Date().toISOString(),
      items: [...ticketItems],
      subtotalPrincipal,
      impuestosPrincipal,
      totalPrincipal,
      subtotalReferencia,
      impuestosReferencia,
      totalReferencia,
      tasaCambioAplicada: currency.tasaCambio,
      tipoVenta,
      cliente: { ...client },
      vendedorId: activeVendor.id,
      vendedorNombre: `${activeVendor.nombre} ${activeVendor.apellido}`.trim(),
    };

    db.saveSavedSale(newSavedSale);
    setSavedSales(db.getSavedSales());

    // Limpiar ticket activo para dejar la caja lista de inmediato
    setTicketItems([]);
    setClient({
      nombre: 'Consumidor Final',
      docId: 'V-00000000',
      telefono: '',
      direccion: '',
    });

    triggerFeedback(`💾 Venta #${codigo} guardada en espera (Stock intacto). Caja disponible.`);
  };

  // -------------------------------------------------------------
  // RETOMAR VENTA GUARDADA AL TICKET ACTIVO
  // -------------------------------------------------------------
  const handleResumeSavedSale = (saleToResume: SavedSale) => {
    if (ticketItems.length > 0) {
      const confirmReplace = window.confirm(
        `El ticket actual ya contiene ${ticketItems.length} producto(s).\n\n¿Desea descartar el ticket actual y cargar la venta guardada #${saleToResume.codigo}?`
      );
      if (!confirmReplace) return;
    }

    setTicketItems(saleToResume.items);
    if (saleToResume.cliente) {
      setClient(saleToResume.cliente);
    }
    if (saleToResume.tipoVenta) {
      setTipoVenta(saleToResume.tipoVenta);
    }

    db.deleteSavedSale(saleToResume.id);
    setSavedSales(db.getSavedSales());
    setShowSavedSalesModal(false);
    setSelectedSavedSaleDetail(null);
    triggerFeedback(`✅ Venta #${saleToResume.codigo} cargada al ticket. Lista para procesar o editar.`);
  };

  // -------------------------------------------------------------
  // TOMAR PEDIDO DESDE VENTA GUARDADA (PLANTILLA COBRAR Y PROCESAR VENTA)
  // Campos obligatorios: Pago correspondiente y Fecha de entrega
  // Si monto recibido < 50%, pide confirmación de Administrador por PIN
  // Si no cubre el total, registra como ABONO. Dataline: ACEPTADO
  // -------------------------------------------------------------
  const handleOpenTakeOrderModal = (saleToTake: SavedSale) => {
    setSaleForTakeOrder(saleToTake);

    // Fecha estimada sugerida: 5 días a partir de hoy (YYYY-MM-DD)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    setTakeOrderDeliveryDate(futureDate.toISOString().split('T')[0]);

    // Sugerir el 50% inicial como anticipo reglamentario de taller
    const suggestedFifty = Number((saleToTake.totalPrincipal * 0.5).toFixed(2));
    setTakeOrderAmountPaidPrimary(suggestedFifty.toString());
    setTakeOrderAmountPaidRef((suggestedFifty * currency.tasaCambio).toFixed(2));

    const defaultMethod = configuredPaymentMethods[0];
    const initialMethodId = defaultMethod ? defaultMethod.id : 'PAGO_MIXTO';
    setTakeOrderPaymentMethod(initialMethodId);

    if (defaultMethod) {
      const linkedCurr = allCurrencies.find((c) => c.id === defaultMethod.monedaId) || allCurrencies.find((c) => c.esPrincipal) || allCurrencies[0];
      const rate = linkedCurr?.esPrincipal ? 1.0 : (linkedCurr?.valorTasa > 0 ? linkedCurr.valorTasa : currency.tasaCambio);
      const reqFiftyInCurr = linkedCurr?.esPrincipal ? suggestedFifty : Number((suggestedFifty * rate).toFixed(linkedCurr?.decimales || 2));
      setTakeOrderSingleAmount(reqFiftyInCurr.toString());
    } else {
      setTakeOrderSingleAmount(suggestedFifty.toString());
    }
    setTakeOrderMixedAmounts({});
    setTakeOrderReferenceCode('');
    setTakeOrderNotes(saleToTake.notas || '');
    setTakeOrderError('');
    setShowTakeOrderModal(true);
  };

  const handleValidateAndSubmitTakeOrder = () => {
    if (!saleForTakeOrder) return;
    setTakeOrderError('');

    const deliveryDate = takeOrderDeliveryDate.trim();
    if (!deliveryDate) {
      setTakeOrderError('La Fecha Estimada de Entrega es obligatoria.');
      return;
    }

    const paidAmount = parseFloat(takeOrderAmountPaidPrimary) || 0;
    if (paidAmount <= 0) {
      setTakeOrderError('El Pago Correspondiente es obligatorio y debe ser mayor a 0.');
      return;
    }

    const total = saleForTakeOrder.totalPrincipal;
    const fiftyPercent = Number((total * 0.5).toFixed(2));

    // REGLA: Si el monto recibido es menor al 50% del total, pedir confirmación de Administrador por PIN
    if (paidAmount < (fiftyPercent - 0.001)) {
      const allUsers = users.length > 0 ? users : db.getUsers();
      const activeAdmins = allUsers.filter((u) => u.role === 'ADMINISTRADOR' && u.activo);
      if (activeAdmins.length > 0) {
        setTakeOrderSelectedAdminId(activeAdmins[0].id);
      }
      setTakeOrderAdminPin('');
      setTakeOrderAdminError('');
      setShowTakeOrderAdminAuthModal(true);
      return;
    }

    // Si cubre el 50% o más, procesar directamente
    executeConfirmTakeOrder();
  };

  const handleVerifyTakeOrderAdminAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!saleForTakeOrder) return;

    const allUsers = users.length > 0 ? users : db.getUsers();
    const activeAdmins = allUsers.filter((u) => u.role === 'ADMINISTRADOR' && u.activo);
    const targetAdmin =
      activeAdmins.find((u) => u.id === takeOrderSelectedAdminId) || activeAdmins[0];

    if (!targetAdmin) {
      setTakeOrderAdminError('No se encontró ningún usuario Administrador activo para autorizar.');
      return;
    }

    if (takeOrderAdminPin === targetAdmin.pin) {
      const paidAmount = parseFloat(takeOrderAmountPaidPrimary) || 0;
      db.addAuditLog(
        'AUTORIZACION_CONCEDIDA',
        'TALLER',
        `Abono de Pedido menor al 50% (${formatCurrency(paidAmount, currency.monedaPrincipal)} de ${formatCurrency(saleForTakeOrder.totalPrincipal, currency.monedaPrincipal)}) autorizado por el Administrador ${targetAdmin.nombre} ${targetAdmin.apellido} para el usuario ${activeVendor.nombre}`
      );
      executeConfirmTakeOrder(targetAdmin);
    } else {
      setTakeOrderAdminError('PIN incorrecto. Ingrese el PIN del Administrador seleccionado.');
    }
  };

  const executeConfirmTakeOrder = (authorizedAdmin?: User) => {
    if (!saleForTakeOrder) return;

    const deliveryDate = takeOrderDeliveryDate.trim();
    const paidAmount = parseFloat(takeOrderAmountPaidPrimary) || 0;
    const total = saleForTakeOrder.totalPrincipal;

    // Si el monto no cubre el total, registrarlo como ABONO. Si lo cubre o supera, es PAGO COMPLETO
    const isFullPayment = paidAmount >= (total - 0.001);
    const isAbono = !isFullPayment;
    const montoAbonado = isFullPayment ? total : paidAmount;
    const saldoPendiente = isFullPayment ? 0 : Number((total - paidAmount).toFixed(2));

    const selectedMethodObj = configuredPaymentMethods.find((m) => m.id === takeOrderPaymentMethod);
    const paymentMethodLabel = takeOrderPaymentMethod === 'PAGO_MIXTO'
      ? 'Pago Mixto'
      : (selectedMethodObj ? selectedMethodObj.nombre : 'Efectivo');

    const now = new Date();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const formattedNow = `${now.getDate()} ${months[now.getMonth()]}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const orderNumber = saleForTakeOrder.codigo.startsWith('#')
      ? saleForTakeOrder.codigo
      : `#PED-${saleForTakeOrder.codigo}`;

    // Convertir items con Estado Dataline: ACEPTADO (Azul)
    const orderItems: WorkshopOrderItem[] = saleForTakeOrder.items.map((cartItem, idx) => ({
      id: `${cartItem.producto.id}-${idx}-${Date.now()}`,
      productoId: cartItem.producto.id,
      nombre: cartItem.producto.nombre + (cartItem.variante ? ` (${cartItem.variante.nombre})` : ''),
      codigo: cartItem.producto.codigoBarras,
      imagen: cartItem.producto.foto,
      tallaOColor: cartItem.variante ? cartItem.variante.nombre : undefined,
      cantidad: cartItem.cantidad,
      precioUnitario: cartItem.precioUnitario,
      total: cartItem.total,
      notas: cartItem.producto.descripcion || '',
      estado: 'ACEPTADO',
    }));

    const paymentRecord: WorkshopOrderPaymentRecord = {
      id: `abono-${Date.now()}`,
      fecha: new Date().toISOString(),
      monto: paidAmount,
      metodoPago: `${paymentMethodLabel}${takeOrderReferenceCode ? ` (Ref: ${takeOrderReferenceCode})` : ''}`,
      usuarioNombre: `${activeVendor.nombre} ${activeVendor.apellido}`.trim(),
      notas: isFullPayment
        ? `Pago total al tomar pedido #${orderNumber}`
        : `Abono inicial al tomar pedido #${orderNumber} (Saldo rest: ${formatCurrency(saldoPendiente, currency.monedaPrincipal)})`,
    };

    const newOrder: WorkshopOrder = {
      id: `wo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      numeroPedido: orderNumber,
      fechaCreacion: saleForTakeOrder.fecha || new Date().toISOString(),
      fechaEstimadaEntrega: deliveryDate,
      cliente: saleForTakeOrder.cliente || {
        nombre: 'Consumidor Final',
        docId: 'V-00000000',
        telefono: '',
      },
      vendedorId: saleForTakeOrder.vendedorId || activeVendor.id,
      vendedorNombre: saleForTakeOrder.vendedorNombre || `${activeVendor.nombre} ${activeVendor.apellido}`.trim(),
      estado: 'ACEPTADO',
      timeline: [
        {
          estado: 'ACEPTADO',
          titulo: 'ACEPTADO',
          fecha: formattedNow,
          completado: true,
          actual: true,
          descripcion: `Pedido tomado desde venta #${saleForTakeOrder.codigo}. ${
            isAbono
              ? `Registrado como ABONO: ${formatCurrency(paidAmount, currency.monedaPrincipal)} (Saldo pendiente: ${formatCurrency(saldoPendiente, currency.monedaPrincipal)})`
              : `Pago total recibido: ${formatCurrency(paidAmount, currency.monedaPrincipal)}`
          }. Fecha estimada de entrega: ${deliveryDate}.${
            authorizedAdmin
              ? ` Autorizado por Administrador: ${authorizedAdmin.nombre} ${authorizedAdmin.apellido}.`
              : ''
          }`,
        },
        {
          estado: 'EN_CONFECCION',
          titulo: 'CONFECCIÓN',
          completado: false,
          actual: false,
        },
        {
          estado: 'EN_DISENO',
          titulo: 'DISEÑO',
          completado: false,
          actual: false,
        },
        {
          estado: 'LISTO',
          titulo: 'LISTO',
          completado: false,
          actual: false,
        },
        {
          estado: 'ENTREGADO',
          titulo: 'ENTREGADO',
          completado: false,
          actual: false,
        },
      ],
      items: orderItems,
      subtotalPrincipal: saleForTakeOrder.subtotalPrincipal,
      impuestosPrincipal: saleForTakeOrder.impuestosPrincipal,
      totalPrincipal: saleForTakeOrder.totalPrincipal,
      subtotalReferencia: saleForTakeOrder.subtotalReferencia,
      impuestosReferencia: saleForTakeOrder.impuestosReferencia,
      totalReferencia: saleForTakeOrder.totalReferencia,
      tasaCambioAplicada: saleForTakeOrder.tasaCambioAplicada || currency.tasaCambio,
      notasTaller: takeOrderNotes
        ? `[Venta Guardada] ${takeOrderNotes}`
        : 'Pedido tomado desde venta en espera. Gestionado con factura, abonos y dataline.',
      prioridad: 'NORMAL',
      tipoPago: isFullPayment ? 'COMPLETO' : 'PARCIAL',
      metodoPagoAbono: paymentMethodLabel,
      montoAbonadoPrincipal: montoAbonado,
      saldoPendientePrincipal: saldoPendiente,
      historialAbonos: [paymentRecord],
    };

    // 1. Guardar en Pedidos / Taller
    db.saveWorkshopOrder(newOrder);

    // 2. Eliminar de ventas guardadas en espera
    db.deleteSavedSale(saleForTakeOrder.id);
    setSavedSales(db.getSavedSales());

    // 3. Cerrar modales
    setShowTakeOrderAdminAuthModal(false);
    setShowTakeOrderModal(false);
    setShowSavedSalesModal(false);
    setSelectedSavedSaleDetail(null);
    setSaleForTakeOrder(null);

    triggerFeedback(
      `📋 ¡Pedido #${newOrder.numeroPedido} tomado con éxito! Estado Dataline: ACEPTADO. ${
        isAbono
          ? `Registrado como ABONO: ${formatCurrency(paidAmount, currency.monedaPrincipal)}`
          : 'Pago Total Recibido'
      }`
    );

    // 4. Navegar automáticamente al módulo de pedidos/taller
    if (onNavigateToWorkshop) {
      onNavigateToWorkshop(newOrder.id);
    }
  };

  // -------------------------------------------------------------
  // ELIMINAR VENTA GUARDADA
  // -------------------------------------------------------------
  const handleDeleteSavedSale = (saleToDelete: SavedSale) => {
    const confirmDel = window.confirm(
      `¿Está seguro de descartar la venta guardada #${saleToDelete.codigo} (${saleToDelete.cliente?.nombre || 'Cliente'})?\n\nEsta acción no afectará el inventario ni las estadísticas.`
    );
    if (!confirmDel) return;

    db.deleteSavedSale(saleToDelete.id);
    setSavedSales(db.getSavedSales());
    if (selectedSavedSaleDetail?.id === saleToDelete.id) {
      setSelectedSavedSaleDetail(null);
    }
    triggerFeedback(`🗑️ Venta guardada #${saleToDelete.codigo} eliminada.`);
  };

  // -------------------------------------------------------------
  // CARGAR / REMOVER DEUDA DEL CLIENTE A LA FACTURA ACTUAL
  // -------------------------------------------------------------
  const handleToggleDebtInTicket = () => {
    if (clientDebtInfo.totalPrincipal <= 0) return;

    if (isDebtLoadedInTicket) {
      setTicketItems((prev) =>
        prev.filter((item) => item.producto.id !== 'DEUDA-PENDIENTE' && item.producto.codigoBarras !== 'DEUDA-CXC')
      );
      triggerFeedback('Saldo deudor removido de la factura actual.');
      return;
    }

    const debtProduct: Product = {
      id: 'DEUDA-PENDIENTE',
      codigoBarras: 'DEUDA-CXC',
      nombre: `Cobro Saldo Deudor CxC (${client.nombre})`,
      categoriaId: categories[0]?.id || 'cat-1',
      precioCompra: 0,
      precioVenta: clientDebtInfo.totalPrincipal,
      porcentajeGanancia: 0,
      impuestoId: taxes.find((t) => t.porcentaje === 0)?.id || taxes[0]?.id || 'tax-exento',
      stockActual: 9999,
      stockMinimo: 0,
      unidadMedida: 'UND',
      activo: true,
      creadoEn: new Date().toISOString(),
    };

    const exemptTax: Tax = taxes.find((t) => t.porcentaje === 0) || {
      id: 'tax-exento',
      nombre: 'Exento',
      porcentaje: 0,
      activo: true,
      esPredeterminado: false,
    };

    const newCartItem: CartItem = {
      producto: debtProduct,
      cantidad: 1,
      precioUnitario: clientDebtInfo.totalPrincipal,
      descuentoPorcentaje: 0,
      impuesto: exemptTax,
      subtotal: clientDebtInfo.totalPrincipal,
      impuestoTotal: 0,
      total: clientDebtInfo.totalPrincipal,
    };

    setTicketItems((prev) => [newCartItem, ...prev]);
    triggerFeedback(
      `✅ Saldo adeudado de ${formatCurrency(clientDebtInfo.totalPrincipal, currency.monedaPrincipal)} agregado a la factura.`
    );
  };

  // -------------------------------------------------------------
  // RECORDATORIO DE PAGO POR WHATSAPP
  // -------------------------------------------------------------
  const handleSendDebtWhatsAppReminder = (targetClient?: ClientData, customDebts?: ClientDebt[]) => {
    const c = targetClient || client;
    if (!c || !c.docId || c.docId === 'V-00000000') {
      triggerFeedback('⚠️ Seleccione un cliente registrado para enviar recordatorio.');
      return;
    }

    const debtsInfo = customDebts
      ? {
          debts: customDebts,
          totalPrincipal: customDebts.reduce((sum, d) => sum + d.saldoPendientePrincipal, 0),
          totalReferencia:
            customDebts.reduce((sum, d) => sum + d.saldoPendientePrincipal, 0) * currency.tasaCambio,
        }
      : db.getClientTotalPendingDebt(c.docId);

    if (debtsInfo.totalPrincipal <= 0) {
      triggerFeedback('ℹ️ Este cliente no presenta deudas pendientes actualmente.');
      return;
    }

    if (!c.telefono || c.telefono.trim().length < 7) {
      const phoneInput = window.prompt(
        `El cliente ${c.nombre} (${c.docId}) no posee número de teléfono guardado.\n\nIngrese su número de WhatsApp (ej. +584121234567 o 04141234567):`
      );
      if (!phoneInput || !phoneInput.trim()) return;

      const updatedClient: ClientData = { ...c, telefono: phoneInput.trim() };
      db.saveClient(updatedClient);
      setAllClients(db.getClients());
      if (c.docId === client.docId) {
        setClient(updatedClient);
      }
      c.telefono = phoneInput.trim();
    }

    const cleanPhone = c.telefono!.replace(/[^0-9]/g, '');
    const msg = generateDebtWhatsAppReminder(
      c,
      debtsInfo.debts,
      debtsInfo.totalPrincipal,
      debtsInfo.totalReferencia,
      company,
      currency
    );

    const url = `https://wa.me/${cleanPhone}?text=${msg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    triggerFeedback(`📲 Recordatorio de cobro por WhatsApp generado para ${c.nombre}.`);
  };

  // -------------------------------------------------------------
  // CONFIRMAR VENTA A CRÉDITO (ABONA RECIBIDO Y ADEUDA SALDO A CXC)
  // -------------------------------------------------------------
  const handleConfirmCreditSale = () => {
    if (client.docId === 'V-00000000') {
      alert(
        '⚠️ Para otorgar una Venta a Crédito es indispensable identificar al cliente con Cédula o RIF para poder registrar la cuenta por cobrar.\n\nPor favor seleccione o cree un cliente.'
      );
      setShowCheckoutModal(false);
      setIsClientDropdownOpen(true);
      return;
    }

    const paidPrimary = parsedPaidPrimary;
    const paidRef = parsedPaidRef;
    const saldoPendienteP = Number(Math.max(0, totalPrincipal - paidPrimary).toFixed(2));
    const saldoPendienteR = Number((saldoPendienteP * currency.tasaCambio).toFixed(2));

    const paymentMethodLabel = isMixedPayment
      ? 'Pago Mixto'
      : (currentSelectedMethod?.nombre || 'Efectivo');

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
        metodo: paymentMethodLabel,
        metodoNombre: paymentMethodLabel,
        metodoId: paymentMethod,
        monedaId: isMixedPayment ? undefined : currentMethodCurrency?.id,
        monedaCodigo: isMixedPayment ? 'MIXTO' : currentMethodCurrency?.codigo,
        montoPagadoPrincipal: paidPrimary,
        montoPagadoReferencia: paidRef,
        montoPagadoMonedaMetodo: isMixedPayment ? undefined : parsedMethodCurrencyAmount,
        cambioPrincipal: 0,
        cambioReferencia: 0,
        cambioMonedaMetodo: 0,
        referenciaBancaria: referenceCode || undefined,
        cuentaBancariaId: isMixedPayment ? undefined : currentMethodAccount?.id,
        detallesMixto: isMixedPayment
          ? mixedCurrencyBreakdown
              .filter((b) => b.amountNum > 0)
              .map((b) => ({
                monedaId: b.currency.id,
                monedaCodigo: b.currency.codigo,
                simbolo: b.currency.simbolo,
                tasa: b.rate,
                monto: b.amountNum,
                montoEquivPrincipal: b.equivPrincipal,
              }))
          : undefined,
      },
      cliente: client,
      vendedorId: activeVendor.id,
      vendedorNombre: `${activeVendor.nombre} ${activeVendor.apellido}`.trim(),
      estado: 'CREDITO_PENDIENTE',
      condicionVenta: 'CREDITO',
      montoAbonadoPrincipal: paidPrimary,
      saldoPendientePrincipal: saldoPendienteP,
      montoAbonadoReferencia: paidRef,
      saldoPendienteReferencia: saldoPendienteR,
    };

    // Save to Database (this will automatically create ClientDebt in cuentasPorCobrar)
    db.saveSale(newSale);
    setDbDebtTick((t) => t + 1);

    // Save audit log
    db.addAuditLog(
      'VENTA_CREADA',
      'VENTAS',
      `Venta a Crédito #${newSale.numeroTicket} a favor de ${client.nombre} (${client.docId}). Abono: ${formatCurrency(paidPrimary, currency.monedaPrincipal)}, Saldo CxC: ${formatCurrency(saldoPendienteP, currency.monedaPrincipal)}`
    );

    // Notify parent
    onSaleCompleted(newSale, 'none');

    // Keep completed sale in state for invoice / whatsapp
    setCompletedSaleData(newSale);
    setShowCheckoutModal(false);
    setShowCompletedModal(true);

    // Reset ticket & client
    setTicketItems([]);
    setClient({
      nombre: 'Consumidor Final',
      docId: 'V-00000000',
      telefono: '',
      direccion: '',
    });

    triggerFeedback(
      `🏷️ Venta a Crédito procesada con éxito. Saldo adeudado de ${formatCurrency(saldoPendienteP, currency.monedaPrincipal)} registrado en Cuentas por Cobrar.`
    );
  };

  const handleConfirmSale = () => {
    if (isUnderpaid && faltantePrincipal > 0.01) {
      const confirmCredit = window.confirm(
        `Atención: El monto recibido (${formatCurrency(parsedPaidPrimary, currency.monedaPrincipal)}) es insuficiente para cubrir el total de ${formatCurrency(totalPrincipal, currency.monedaPrincipal)}.\n\n¿Desea procesar esta transacción como VENTA A CRÉDITO?\n- Se abonará: ${formatCurrency(parsedPaidPrimary, currency.monedaPrincipal)}\n- Se registrará a cuentas por cobrar: ${formatCurrency(faltantePrincipal, currency.monedaPrincipal)}`
      );
      if (confirmCredit) {
        handleConfirmCreditSale();
        return;
      }
      return;
    }

    const paymentMethodLabel = isMixedPayment
      ? 'Pago Mixto'
      : (currentSelectedMethod?.nombre || 'Efectivo');

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
        metodo: paymentMethodLabel,
        metodoNombre: paymentMethodLabel,
        metodoId: paymentMethod,
        monedaId: isMixedPayment ? undefined : currentMethodCurrency?.id,
        monedaCodigo: isMixedPayment ? 'MIXTO' : currentMethodCurrency?.codigo,
        montoPagadoPrincipal: parsedPaidPrimary,
        montoPagadoReferencia: parsedPaidRef,
        montoPagadoMonedaMetodo: isMixedPayment ? undefined : parsedMethodCurrencyAmount,
        cambioPrincipal: changePrincipal,
        cambioReferencia: changeReferencia,
        cambioMonedaMetodo: isMixedPayment ? undefined : vueltoInMethodCurrency,
        referenciaBancaria: referenceCode || undefined,
        cuentaBancariaId: isMixedPayment ? undefined : currentMethodAccount?.id,
        detallesMixto: isMixedPayment
          ? mixedCurrencyBreakdown
              .filter((b) => b.amountNum > 0)
              .map((b) => ({
                monedaId: b.currency.id,
                monedaCodigo: b.currency.codigo,
                simbolo: b.currency.simbolo,
                tasa: b.rate,
                monto: b.amountNum,
                montoEquivPrincipal: b.equivPrincipal,
              }))
          : undefined,
      },
      cliente: client,
      vendedorId: activeVendor.id,
      vendedorNombre: `${activeVendor.nombre} ${activeVendor.apellido}`.trim(),
      estado: 'COMPLETADA',
      condicionVenta: 'CONTADO',
    };

    // Save to Database (handles debt settlement if DEUDA-PENDIENTE item was charged)
    db.saveSale(newSale);
    setDbDebtTick((t) => t + 1);

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
        condicionVenta: saleToPrint.condicionVenta,
        montoAbonadoPrincipal: saleToPrint.montoAbonadoPrincipal,
        saldoPendientePrincipal: saleToPrint.saldoPendientePrincipal,
        montoAbonadoReferencia: saleToPrint.montoAbonadoReferencia,
        saldoPendienteReferencia: saleToPrint.saldoPendienteReferencia,
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
        condicionVenta: saleToPrint.condicionVenta,
        montoAbonadoPrincipal: saleToPrint.montoAbonadoPrincipal,
        saldoPendientePrincipal: saleToPrint.saldoPendientePrincipal,
        montoAbonadoReferencia: saleToPrint.montoAbonadoReferencia,
        saldoPendienteReferencia: saleToPrint.saldoPendienteReferencia,
      },
      company,
      currency
    );
    triggerFeedback('🧾 Ticket térmico generado en PDF');
  };

  // -------------------------------------------------------------
  // SEND DIRECTLY VIA WHATSAPP (SIN CONFIGURACIÓN ADICIONAL)
  // -------------------------------------------------------------
  const [showWhatsAppPhoneModal, setShowWhatsAppPhoneModal] = useState(false);
  const [manualWhatsAppPhone, setManualWhatsAppPhone] = useState('');

  const formatCleanWhatsAppPhone = (rawPhone: string) => {
    let digits = (rawPhone || '').replace(/\D/g, '');
    if (!digits) return '';
    // Formato telefónico venezolano (0414, 0424, 0412, etc.)
    if (digits.startsWith('0') && digits.length === 11) {
      digits = '58' + digits.slice(1);
    } else if (
      digits.length === 10 &&
      (digits.startsWith('414') ||
        digits.startsWith('424') ||
        digits.startsWith('412') ||
        digits.startsWith('416') ||
        digits.startsWith('426'))
    ) {
      digits = '58' + digits;
    }
    return digits;
  };

  const handleSendWhatsApp = (saleToSend: Sale = completedSaleData!) => {
    if (!saleToSend) return;
    const rawPhone = saleToSend.cliente?.telefono || '';
    const cleanPhone = formatCleanWhatsAppPhone(rawPhone);

    if (cleanPhone.length >= 8) {
      // Envío DIRECTO al número registrado por el cliente
      const msg = generateWhatsAppMessage(saleToSend, company, currency);
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      triggerFeedback(`💬 Enviando factura por WhatsApp a ${saleToSend.cliente?.nombre || 'cliente'} (${cleanPhone})...`);
    } else {
      // Si el cliente no tiene teléfono cargado en la venta
      setManualWhatsAppPhone('');
      setShowWhatsAppPhoneModal(true);
    }
  };

  const handleConfirmManualWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!completedSaleData) return;
    const cleanPhone = formatCleanWhatsAppPhone(manualWhatsAppPhone);
    const msg = generateWhatsAppMessage(completedSaleData, company, currency);

    let waUrl = '';
    if (cleanPhone.length >= 8) {
      waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
      triggerFeedback(`💬 Enviando factura por WhatsApp al ${cleanPhone}...`);
    } else {
      waUrl = `https://api.whatsapp.com/send?text=${msg}`;
      triggerFeedback('💬 Abriendo WhatsApp con la factura...');
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setShowWhatsAppPhoneModal(false);
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

        {/* Center: Tasa Oficial (Editable) & Botón Seguimiento Ventas Guardadas */}
        <div className="flex items-center gap-2">
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

          {/* Botón de Seguimiento de Ventas Guardadas (En Espera) */}
          <button
            type="button"
            onClick={() => setShowSavedSalesModal(true)}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition cursor-pointer shadow-xs ${
              savedSales.length > 0
                ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/60 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700/90 border-slate-700 text-slate-300'
            }`}
            title="Abrir sistema de seguimiento para las ventas guardadas en espera"
          >
            <FolderClock className={`w-4 h-4 flex-shrink-0 ${savedSales.length > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-[9px] text-slate-400 font-bold uppercase">EN ESPERA</div>
              <div className="text-xs font-bold flex items-center gap-1">
                <span>Guardadas</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                    savedSales.length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {savedSales.length}
                </span>
              </div>
            </div>
            <span
              className={`sm:hidden px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                savedSales.length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {savedSales.length}
            </span>
          </button>

          {/* Botón de Cuentas por Cobrar (Deudas por Cliente) */}
          <button
            type="button"
            onClick={() => {
              setAccountsReceivableClientFilter(undefined);
              setShowAccountsReceivableModal(true);
            }}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition cursor-pointer shadow-xs ${
              pendingDebtsCount > 0
                ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/50 text-rose-200'
                : 'bg-slate-800 hover:bg-slate-700/90 border-slate-700 text-slate-300'
            }`}
            title="Control de Cuentas por Cobrar y Deudas por Cliente"
          >
            <Clock className={`w-4 h-4 flex-shrink-0 ${pendingDebtsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-[9px] text-slate-400 font-bold uppercase">POR COBRAR</div>
              <div className="text-xs font-bold flex items-center gap-1">
                <span>Créditos</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                    pendingDebtsCount > 0 ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {pendingDebtsCount}
                </span>
              </div>
            </div>
            <span
              className={`sm:hidden px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                pendingDebtsCount > 0 ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {pendingDebtsCount}
            </span>
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

      {/* Notificación Emergente Flotante (Toast fijo que NO modifica el layout ni mueve ninguna parte de la pantalla) */}
      {feedbackMessage && (
        <div className="fixed top-4 right-4 z-50 pointer-events-none transition-all duration-300 animate-fadeIn">
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-2.5 max-w-md pointer-events-auto">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="leading-snug">{feedbackMessage}</span>
          </div>
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

              <div className="flex items-center gap-1.5">
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
            </div>

            {/* Buscador y Selector de Cliente: Cliente, Buscar Cliente y Nuevo Cliente en la misma fila */}
            <div className="bg-white border border-slate-200 rounded-xl p-2 text-xs relative" ref={clientSearchContainerRef}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 1. Campo Cliente */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/90 hover:bg-slate-100 border border-slate-200 rounded-lg max-w-[140px] sm:max-w-[170px] flex-shrink-0 transition-colors"
                  title={`Cliente: ${client.nombre} (${client.docId})`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <span className="font-bold text-slate-800 text-[11px] truncate block">
                      {client.nombre}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-mono truncate block">
                      {client.docId}
                    </span>
                  </div>
                  {client.docId !== 'V-00000000' && (
                    <button
                      type="button"
                      onClick={() => {
                        setClient({
                          nombre: 'Consumidor Final',
                          docId: 'V-00000000',
                          telefono: '',
                          direccion: '',
                        });
                        triggerFeedback('👤 Cliente restablecido a Consumidor Final');
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-white cursor-pointer transition-colors"
                      title="Restablecer a Consumidor Final"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 2. Campo Buscar Cliente */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                  {clientSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setClientSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 3. Campo Nuevo Cliente */}
                <button
                  type="button"
                  onClick={() => {
                    const rawDigits = clientSearchQuery.replace(/\D/g, '');
                    const isDigitsOnly = rawDigits.length > 0 && clientSearchQuery.trim() === rawDigits;
                    setNewClientForm({
                      nombre: !isDigitsOnly ? clientSearchQuery.trim() : '',
                      docId: isDigitsOnly ? `V-${rawDigits}` : (clientSearchQuery.includes('-') ? clientSearchQuery.trim() : ''),
                      telefono: isDigitsOnly && (rawDigits.startsWith('04') || rawDigits.startsWith('4')) ? rawDigits : '',
                      direccion: '',
                      email: '',
                    });
                    setShowNewClientModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs flex-shrink-0"
                  title="Registrar cliente nuevo al sistema"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Nuevo</span>
                </button>
              </div>

              {/* Dropdown flotante con resultados de clientes */}
              {isClientDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                  {matchedClients.length > 0 ? (
                    matchedClients.map((c) => (
                      <button
                        key={`${c.docId}-${c.nombre}`}
                        type="button"
                        onClick={() => {
                          setClient(c);
                          setIsClientDropdownOpen(false);
                          setClientSearchQuery('');
                          triggerFeedback(`👤 Cliente seleccionado: ${c.nombre}`);
                        }}
                        className="w-full text-left p-2.5 hover:bg-emerald-50 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate group-hover:text-emerald-900">
                            {c.nombre}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{c.docId}</span>
                            {c.telefono && <span>• Tel: {c.telefono}</span>}
                          </p>
                        </div>
                        {c.docId === client.docId ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Activo
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-medium">
                            Seleccionar
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center">
                      <p className="text-xs text-slate-500 mb-2">
                        No se encontró ningún cliente con ese criterio.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const rawDigits = clientSearchQuery.replace(/\D/g, '');
                          const isDigitsOnly = rawDigits.length > 0 && clientSearchQuery.trim() === rawDigits;
                          setNewClientForm({
                            nombre: !isDigitsOnly ? clientSearchQuery.trim() : '',
                            docId: isDigitsOnly ? `V-${rawDigits}` : (clientSearchQuery.includes('-') ? clientSearchQuery.trim() : ''),
                            telefono: isDigitsOnly && (rawDigits.startsWith('04') || rawDigits.startsWith('4')) ? rawDigits : '',
                            direccion: '',
                            email: '',
                          });
                          setIsClientDropdownOpen(false);
                          setShowNewClientModal(true);
                        }}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Registrar cliente nuevo ahora</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Si el cliente seleccionado tiene deuda pendiente: Banner de Alerta y Acciones */}
            {clientDebtInfo.totalPrincipal > 0 && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-fadeIn">
                <div className="flex items-start sm:items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-black">
                    <Clock className="w-4 h-4 text-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-amber-950 text-xs tracking-wide">
                        DEUDA PENDIENTE:
                      </span>
                      <span className="font-black text-rose-600 text-xs">
                        {formatCurrency(clientDebtInfo.totalPrincipal, currency.monedaPrincipal)}
                      </span>
                      <span className="text-[10.5px] text-amber-900 font-semibold">
                        ({formatCurrency(clientDebtInfo.totalReferencia, currency.monedaReferencia)})
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      {clientDebtInfo.debts.length} factura(s) con saldo por cobrar
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end">
                  {/* Opción 1: Agregar a la próxima factura el monto adeudado en la Moneda Principal */}
                  <button
                    type="button"
                    onClick={handleToggleDebtInTicket}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                      isDebtLoadedInTicket
                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    title={
                      isDebtLoadedInTicket
                        ? 'Quitar cobro de deuda de la factura actual'
                        : 'Agregar el monto adeudado a la próxima factura'
                    }
                  >
                    {isDebtLoadedInTicket ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-rose-700" />
                        <span>Deuda en Factura (Quitar)</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cargar Deuda ({formatCurrency(clientDebtInfo.totalPrincipal, currency.monedaPrincipal)})</span>
                      </>
                    )}
                  </button>

                  {/* Opción 2: Recordatorio de pago enviado a su WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleSendDebtWhatsAppReminder()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    title="Enviar recordatorio de pago a su WhatsApp"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  {/* Opción 3: Ver detalle de facturas en modal */}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountsReceivableClientFilter(client.docId);
                      setShowAccountsReceivableModal(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                    title="Ver detalle de facturas adeudadas"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
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
          {/* BOTTOM BAR: BOTONES DE ACCIÓN DEL TICKET                    */}
          {/* Fila 1: Selector Modalidad (DETAL/MAYOR) y GUARDAR VENTA    */}
          {/* Fila 2: PROCESAR VENTA (ancho total debajo)                */}
          {/* ----------------------------------------------------------- */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            {/* Fila 1: Selector de Modalidad y GUARDAR VENTA en la misma fila */}
            <div className="grid grid-cols-2 gap-2">
              {/* Botón 1: Tipo de Venta (DETAL o MAYOR) */}
              <button
                type="button"
                onClick={handleToggleTipoVenta}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  tipoVenta === 'DETAL'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title="Pulse para alternar entre VENTA AL DETAL y VENTA AL MAYOR"
              >
                {tipoVenta === 'DETAL' ? (
                  <>
                    <Tag className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                    <span className="truncate">VENTA AL DETAL</span>
                  </>
                ) : (
                  <>
                    <Boxes className="w-4 h-4 text-indigo-200 flex-shrink-0" />
                    <span className="truncate">VENTA AL MAYOR</span>
                  </>
                )}
              </button>

              {/* Botón 2: GUARDAR VENTA (Siempre activo - Sin afectar inventario, stock ni estadísticas) */}
              <button
                type="button"
                onClick={handleSaveSaleOnHold}
                className="py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow-md active:scale-[0.99]"
                title="Guardar la venta en espera para ser retomada, editada o procesada luego (No afecta stock ni inventario)"
              >
                <BookmarkCheck className="w-4 h-4 text-amber-100 flex-shrink-0" />
                <span className="truncate">GUARDAR VENTA</span>
              </button>
            </div>

            {/* Fila 2: PROCESAR VENTA (Siempre activo) en fila aparte ocupando el ancho total posible */}
            <button
              type="button"
              onClick={handleProcessSale}
              className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white hover:shadow-md active:scale-[0.99]"
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

              {/* Payment Methods (Only Active Methods from Facturación + PAGO MIXTO) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase flex items-center justify-between">
                  <span>Método de Pago</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Configuración activa de Facturación
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {configuredPaymentMethods.map((pm) => {
                    const linkedCurr = allCurrencies.find((c) => c.id === pm.monedaId);
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => handleSelectPaymentMethod(pm.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
                          {pm.tipo === 'EFECTIVO' ? (
                            <Banknote className="w-4 h-4" />
                          ) : pm.tipo === 'PAGO_MOVIL' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : pm.tipo === 'PUNTO_VENTA' ? (
                            <CreditCard className="w-4 h-4" />
                          ) : pm.tipo === 'DIGITAL_ZELLE' ? (
                            <Wallet className="w-4 h-4" />
                          ) : (
                            <Landmark className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate flex-1">
                          <p className="truncate font-bold leading-tight">{pm.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            {linkedCurr ? linkedCurr.codigo : 'Divisa'}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Siempre disponible la Opción de PAGO MIXTO */}
                  <button
                    type="button"
                    onClick={() => handleSelectPaymentMethod('PAGO_MIXTO')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left ${
                      isMixedPayment
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div className="truncate flex-1">
                      <p className="truncate font-bold leading-tight">Pago Mixto</p>
                      <p className="text-[10px] text-slate-400 font-normal">Multimoneda</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Monto Recibido Section */}
              {!isMixedPayment ? (
                /* MONTO RECIBIDO EN LA MONEDA ASOCIADA AL MÉTODO ACTIVO */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Monto Recibido ({currentMethodCurrency.nombre} - {currentMethodCurrency.codigo})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSingleAmountReceived(requiredInMethodCurrency.toFixed(currentMethodCurrency.decimales || 2));
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold transition cursor-pointer"
                      >
                        Monto Exacto ({currentMethodCurrency.simbolo} {requiredInMethodCurrency.toFixed(currentMethodCurrency.decimales || 2)})
                      </button>
                      {currentMethodCurrency.codigo === 'USD' &&
                        [10, 20, 50, 100].map((bill) => {
                          if (bill < requiredInMethodCurrency && bill !== 100) return null;
                          return (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => setSingleAmountReceived(bill.toFixed(2))}
                              className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition cursor-pointer"
                            >
                              ${bill}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Ingrese pago en {currentMethodCurrency.nombre} ({currentMethodCurrency.simbolo})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                        {currentMethodCurrency.simbolo}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={singleAmountReceived}
                        onChange={(e) => setSingleAmountReceived(e.target.value)}
                        className="w-full pl-9 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md font-mono">
                        {currentMethodCurrency.codigo}
                      </span>
                    </div>
                  </div>

                  {/* Tasa de conversión y equivalencia contable si la moneda no es la principal */}
                  {!currentMethodCurrency.esPrincipal && (
                    <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <span>
                        Tasa: 1 {currency.monedaPrincipal.codigo} = {currentMethodRate} {currentMethodCurrency.codigo}
                      </span>
                      <span className="font-semibold text-slate-800">
                        Equivalente: {formatCurrency(parsedPaidPrimary, currency.monedaPrincipal)}
                      </span>
                    </div>
                  )}

                  {/* Ficha de Información Bancaria vinculada al Método de Pago */}
                  {currentMethodAccount && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                          {currentMethodAccount.banco} ({currentMethodAccount.codigo})
                        </span>
                        <span className="font-mono text-slate-600">{currentMethodAccount.documentoId}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 font-mono text-[11px]">
                        <span>Cuenta: {currentMethodAccount.numeroCuenta}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(currentMethodAccount.numeroCuenta);
                            triggerFeedback('📋 N° de cuenta copiado al portapapeles');
                          }}
                          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copiar
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Titular: <span className="font-semibold text-slate-800">{currentMethodAccount.titular}</span>
                        {currentMethodAccount.telefono && (
                          <span className="ml-2 font-mono">| Tel: {currentMethodAccount.telefono}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instrucciones de pago si las tiene */}
                  {currentSelectedMethod?.instrucciones && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                      {currentSelectedMethod.instrucciones}
                    </p>
                  )}

                  {/* Reference Code if required or non-cash */}
                  {(currentSelectedMethod?.requiereReferencia || currentSelectedMethod?.tipo !== 'EFECTIVO') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase flex items-center justify-between">
                        <span>N° de Referencia Bancaria / Comprobante</span>
                        {currentSelectedMethod?.requiereReferencia && (
                          <span className="text-[10px] text-rose-600 font-extrabold uppercase">Obligatorio</span>
                        )}
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
                </div>
              ) : (
                /* PAGO MIXTO: CAMPOS DE LAS MONEDAS ACTIVAS CON CÁLCULO INDEPENDIENTE */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Pago Mixto Multimoneda (Monedas Activas)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Cálculo independiente por cada divisa
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeCurrencies.map((c) => {
                      const rate = c.esPrincipal ? 1.0 : (c.valorTasa > 0 ? c.valorTasa : currency.tasaCambio);
                      const amountStr = mixedCurrencyAmounts[c.id] || '';
                      const amountNum = parseFloat(amountStr) || 0;
                      const equivPrincipal = c.esPrincipal ? amountNum : (rate > 0 ? amountNum / rate : amountNum);

                      // Calculate remaining needed in this currency
                      const otherContributions = mixedCurrencyBreakdown
                        .filter((b) => b.currency.id !== c.id)
                        .reduce((sum, b) => sum + b.equivPrincipal, 0);
                      const remainingToCoverInThisCurr = Math.max(
                        0,
                        (totalPrincipal - otherContributions) * (c.esPrincipal ? 1.0 : rate)
                      );

                      return (
                        <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {c.nombre} ({c.codigo})
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {c.esPrincipal
                                ? 'Moneda Base'
                                : `Tasa: 1 ${currency.monedaPrincipal.codigo} = ${rate} ${c.codigo}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                                {c.simbolo}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={amountStr}
                                onChange={(e) => {
                                  setMixedCurrencyAmounts((prev) => ({
                                    ...prev,
                                    [c.id]: e.target.value,
                                  }));
                                }}
                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                                placeholder="0.00"
                              />
                            </div>

                            {remainingToCoverInThisCurr > 0.01 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMixedCurrencyAmounts((prev) => ({
                                    ...prev,
                                    [c.id]: remainingToCoverInThisCurr.toFixed(c.decimales || 2),
                                  }));
                                }}
                                className="px-2.5 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition cursor-pointer flex-shrink-0"
                                title="Completar el restante en esta moneda"
                              >
                                Pagar Restante
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                            <span>Aporte contable independiente:</span>
                            <span className="font-bold font-mono text-emerald-800">
                              {formatCurrency(equivPrincipal, currency.monedaPrincipal)} ({formatCurrency(equivPrincipal * currency.tasaCambio, currency.monedaReferencia)})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mixed Payment Reference / Notes */}
                  <div className="pt-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Referencias o Comprobantes del Pago Mixto
                    </label>
                    <input
                      type="text"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                      placeholder="Ej. Efectivo $20 + Ref Pago Móvil 123456"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
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
                <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs flex-shrink-0">
                        <Clock className="w-6 h-6 text-slate-950" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-amber-950 tracking-wide uppercase">
                          MONTO INSUFICIENTE • OPCIÓN VENTA A CRÉDITO
                        </p>
                        <p className="text-xs font-bold text-amber-800 mt-0.5">
                          Resta por cobrar: {formatCurrency(faltanteReferencia, currency.monedaReferencia)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-rose-600 tracking-tight leading-none">
                        -{formatCurrency(faltantePrincipal, currency.monedaPrincipal)}
                      </p>
                      <span className="text-[10px] font-bold text-amber-800 uppercase">
                        Saldo Pendiente CxC
                      </span>
                    </div>
                  </div>

                  {/* Resumen del desglose de abono y deuda */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Monto abonado a la factura:</span>
                      <span className="font-bold text-emerald-700">
                        +{formatCurrency(parsedPaidPrimary, currency.monedaPrincipal)} ({formatCurrency(parsedPaidRef, currency.monedaReferencia)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700 border-t border-slate-100 pt-1.5">
                      <span className="font-bold text-rose-700">Monto adeudado a Cuentas por Cobrar:</span>
                      <span className="font-black text-rose-700">
                        {formatCurrency(faltantePrincipal, currency.monedaPrincipal)} ({formatCurrency(faltanteReferencia, currency.monedaReferencia)})
                      </span>
                    </div>
                  </div>

                  {/* Advertencia / Validación de Cliente Identificado */}
                  {client.docId === 'V-00000000' ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-rose-800">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                        <span>
                          Para procesar a Crédito, se debe seleccionar un cliente con Cédula/RIF.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckoutModal(false);
                          setIsClientDropdownOpen(true);
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs whitespace-nowrap cursor-pointer transition"
                      >
                        Asignar Cliente
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmCreditSale}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-slate-950" />
                      <span>
                        Procesar como Venta a Crédito (Abonar {formatCurrency(parsedPaidPrimary, currency.monedaPrincipal)} y Enviar Saldo a CxC)
                      </span>
                    </button>
                  )}
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
              {isUnderpaid ? (
                <button
                  type="button"
                  onClick={handleConfirmCreditSale}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-slate-950" />
                  <span>Procesar Venta a Crédito</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmSale}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar y Finalizar Venta</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: VENTA COMPLETADA - FACTURA PDF & WHATSAPP            */}
      {/* (Diseño fiel a imagen de referencia con botones de gran tamaño)*/}
      {/* ------------------------------------------------------------- */}
      {showCompletedModal && completedSaleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            {/* Top Success Header */}
            <div className="bg-[#009b68] text-white pt-7 pb-6 px-6 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3 shadow-inner">
                <Check className="w-8 h-8 text-white stroke-[3]" />
              </div>
              <h3 className="text-xl font-black tracking-wide text-white">¡VENTA PROCESADA CON ÉXITO!</h3>
              <p className="text-xs text-emerald-100 mt-1 font-mono">
                Factura: {completedSaleData.numeroTicket}
              </p>
            </div>

            {/* Summary Details */}
            <div className="p-6 space-y-3 bg-white text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Cliente:</span>
                <span className="font-bold text-slate-800 text-right">
                  {completedSaleData.cliente?.nombre || 'Consumidor Final'} ({completedSaleData.cliente?.docId || 'V-00000000'})
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Vendedor:</span>
                <span className="font-bold text-slate-800">{completedSaleData.vendedorNombre}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Modalidad:</span>
                <span className="font-extrabold text-[#009b68] uppercase tracking-wide">
                  VENTA AL {tipoVenta}
                </span>
              </div>
              <div className="border-t border-slate-200 my-1"></div>
              <div className="flex justify-between items-center py-1 text-sm sm:text-base">
                <span className="text-slate-800 font-black">Total Cobrado:</span>
                <span className="font-black text-slate-900 text-base sm:text-lg">
                  {formatCurrency(completedSaleData.totalPrincipal, currency.monedaPrincipal)} /{' '}
                  {formatCurrency(completedSaleData.totalReferencia, currency.monedaReferencia)}
                </span>
              </div>

              {/* Si fue Venta a Crédito: Mostrar desglose de Abono y Saldo en CxC */}
              {completedSaleData.condicionVenta === 'CREDITO' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 my-2 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-950 font-black uppercase">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>CONDICIÓN DE PAGO: VENTA A CRÉDITO</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Monto Abonado a Factura:</span>
                    <span className="font-bold text-emerald-700">
                      +{formatCurrency(completedSaleData.montoAbonadoPrincipal || 0, currency.monedaPrincipal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700 border-t border-amber-200/70 pt-1">
                    <span className="font-bold text-rose-700">Saldo en Cuentas por Cobrar:</span>
                    <span className="font-black text-rose-700">
                      {formatCurrency(completedSaleData.saldoPendientePrincipal || 0, currency.monedaPrincipal)} ({formatCurrency(completedSaleData.saldoPendienteReferencia || 0, currency.monedaReferencia)})
                    </span>
                  </div>
                </div>
              )}

              {completedSaleData.pago.cambioPrincipal > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between font-bold text-emerald-900 text-xs">
                  <span>Cambio Entregado:</span>
                  <span>
                    {formatCurrency(completedSaleData.pago.cambioPrincipal, currency.monedaPrincipal)} ({formatCurrency(completedSaleData.pago.cambioReferencia, currency.monedaReferencia)})
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons: Grande y con los colores del diseño */}
            <div className="p-6 pt-0 bg-white space-y-3">
              {/* Traditional Invoice PDF */}
              <button
                type="button"
                onClick={() => handlePrintTraditionalInvoice(completedSaleData)}
                className="w-full py-4 px-4 rounded-2xl bg-[#111827] hover:bg-slate-800 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-5 h-5 text-emerald-400" />
                <span>Imprimir Factura Tradicional (PDF)</span>
              </button>

              {/* Send directly via WhatsApp to registered phone */}
              <button
                type="button"
                onClick={() => handleSendWhatsApp(completedSaleData)}
                className="w-full py-4 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer"
                title={
                  completedSaleData.cliente?.telefono
                    ? `Enviar directamente al número registrado: ${completedSaleData.cliente.telefono}`
                    : 'Enviar por WhatsApp'
                }
              >
                <Phone className="w-5 h-5 text-white" />
                <span className="truncate">
                  Enviar por WhatsApp
                  {completedSaleData.cliente?.telefono ? ` (${completedSaleData.cliente.telefono})` : ''}
                </span>
              </button>

              {/* Optional Thermal Receipt PDF */}
              <button
                type="button"
                onClick={() => handlePrintThermalTicket(completedSaleData)}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-slate-500" />
                <span>Imprimir Ticket Térmico 80mm</span>
              </button>

              {/* Opción NUEVA VENTA con el mismo diseño de VENTA EXITOSA */}
              <button
                type="button"
                onClick={() => {
                  setShowCompletedModal(false);
                  triggerFeedback('🛒 Caja lista para nueva venta');
                }}
                className="w-full py-4 px-4 rounded-2xl bg-[#009b68] hover:bg-emerald-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 text-white stroke-[2.5]" />
                <span className="tracking-wide uppercase">NUEVA VENTA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: REGISTRAR CLIENTE NUEVO AL SISTEMA                   */}
      {/* ------------------------------------------------------------- */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Registrar Nuevo Cliente</h3>
                  <p className="text-[11px] text-slate-500">Se guardará en la base de datos y se asignará al ticket actual</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newClientForm.nombre.trim() || !newClientForm.docId.trim()) {
                  triggerFeedback('⚠️ Ingrese al menos el nombre y la cédula/RIF del cliente');
                  return;
                }
                const saved = db.saveClient(newClientForm);
                setAllClients(db.getClients());
                setClient(saved);
                setShowNewClientModal(false);
                setIsClientDropdownOpen(false);
                setClientSearchQuery('');
                triggerFeedback(`✅ Cliente "${saved.nombre}" guardado y asignado a la venta`);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo o Razón Social *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newClientForm.nombre}
                  onChange={(e) => setNewClientForm({ ...newClientForm, nombre: e.target.value })}
                  placeholder="Ej. Juan Pérez o Inversiones Sol C.A."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cédula / RIF *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClientForm.docId}
                    onChange={(e) => setNewClientForm({ ...newClientForm, docId: e.target.value })}
                    placeholder="Ej. V-12345678 o J-12345678-0"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newClientForm.telefono || ''}
                    onChange={(e) => setNewClientForm({ ...newClientForm, telefono: e.target.value })}
                    placeholder="Ej. 04141234567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección Fiscal (Opcional)
                </label>
                <input
                  type="text"
                  value={newClientForm.direccion || ''}
                  onChange={(e) => setNewClientForm({ ...newClientForm, direccion: e.target.value })}
                  placeholder="Ej. Av. Principal, Local 4, Caracas"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={newClientForm.email || ''}
                  onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                  placeholder="Ej. cliente@correo.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar y Asignar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL RÁPIDO: WHATSAPP DIRECTO SI CLIENTE NO TENÍA TELÉFONO   */}
      {/* ------------------------------------------------------------- */}
      {showWhatsAppPhoneModal && completedSaleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            <div className="bg-[#009b68] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-white" />
                <h4 className="text-sm font-black">Enviar Factura por WhatsApp</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppPhoneModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmManualWhatsApp} className="p-5 space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                El cliente actual (<strong className="text-slate-800">{completedSaleData.cliente?.nombre || 'Consumidor Final'}</strong>) no tiene un número registrado. Ingrese el número de WhatsApp para enviarle la factura de inmediato:
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de Teléfono / WhatsApp:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    autoFocus
                    required
                    value={manualWhatsAppPhone}
                    onChange={(e) => setManualWhatsAppPhone(e.target.value)}
                    placeholder="Ej. 04141234567 o +58412..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Se antepondrá el prefijo internacional automáticamente si escribe 0414, 0412, etc.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppPhoneModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#009b68] hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </form>
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
                const activeAdmins = (users.length > 0 ? users : db.getUsers()).filter(
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL 7: SISTEMA DE SEGUIMIENTO DE VENTAS GUARDADAS (EN ESPERA) */}
      {/* ------------------------------------------------------------- */}
      {showSavedSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
                  <FolderClock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                      Seguimiento de Ventas Guardadas
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                      {savedSales.length} en espera
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Ventas retenidas para ser retomadas, editadas o cobradas. No afectan stock ni estadísticas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSavedSalesModal(false);
                  setSelectedSavedSaleDetail(null);
                }}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={savedSaleSearchQuery}
                  onChange={(e) => setSavedSaleSearchQuery(e.target.value)}
                  placeholder="Buscar por código, cliente o vendedor..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                />
                {savedSaleSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSavedSaleSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
                <span>Total guardado en espera:</span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {formatCurrency(
                    savedSales.reduce((acc, s) => acc + s.totalPrincipal, 0),
                    currency.monedaPrincipal
                  )}
                </span>
              </div>
            </div>

            {/* Cuerpo / Lista de Ventas Guardadas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {filteredSavedSales.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mb-3">
                    <BookmarkCheck className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">
                    {savedSaleSearchQuery
                      ? 'No se encontraron ventas guardadas con ese criterio'
                      : 'No hay ventas guardadas en espera'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md">
                    {savedSaleSearchQuery
                      ? 'Intente buscar con otro nombre de cliente, código o vendedor.'
                      : 'Cuando un cliente necesite pausar su compra, use el botón "GUARDAR VENTA" en el ticket. La venta se retendrá aquí sin descontar inventario ni alterar estadísticas.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredSavedSales.map((sale) => {
                    const totalQty = sale.items.reduce((sum, item) => sum + item.cantidad, 0);
                    const isExpanded = selectedSavedSaleDetail?.id === sale.id;

                    return (
                      <div
                        key={sale.id}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden"
                      >
                        {/* Header de la Tarjeta */}
                        <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                              #{sale.codigo}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                                sale.tipoVenta === 'MAYOR'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {sale.tipoVenta === 'MAYOR' ? 'Al Mayor' : 'Al Detal'}
                            </span>
                          </div>

                          <div className="text-[10.5px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {new Date(sale.fecha).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span>
                              {new Date(sale.fecha).toLocaleDateString([], {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Datos del Cliente y Vendedor */}
                        <div className="p-3.5 flex-1 space-y-2.5 text-xs">
                          {/* Cliente */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">
                                  {sale.cliente?.nombre || 'Consumidor Final'}
                                </p>
                                <p className="text-[10.5px] text-slate-500 font-mono truncate">
                                  {sale.cliente?.docId || 'V-00000000'}
                                  {sale.cliente?.telefono && ` • ${sale.cliente.telefono}`}
                                </p>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                Por: {sale.vendedorNombre}
                              </span>
                            </div>
                          </div>

                          {/* Resumen de Productos */}
                          <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 pb-1 border-b border-slate-200/60">
                              <span>
                                {sale.items.length} productos ({totalQty} unidades)
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedSavedSaleDetail(isExpanded ? null : sale)
                                }
                                className="text-amber-700 hover:text-amber-800 text-[10px] underline cursor-pointer"
                              >
                                {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                              </button>
                            </div>

                            {/* Lista de productos (expandida o compacta) */}
                            <div className="space-y-1 pt-1">
                              {(isExpanded ? sale.items : sale.items.slice(0, 3)).map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-[11px] text-slate-600"
                                >
                                  <span className="truncate pr-2">
                                    <span className="font-bold text-slate-800 font-mono">
                                      {item.cantidad}x
                                    </span>{' '}
                                    {item.producto.nombre}
                                    {item.variante && ` (${item.variante.nombre})`}
                                  </span>
                                  <span className="font-mono text-slate-700 flex-shrink-0">
                                    {formatCurrency(item.total, currency.monedaPrincipal)}
                                  </span>
                                </div>
                              ))}
                              {!isExpanded && sale.items.length > 3 && (
                                <p className="text-[10px] text-slate-400 italic pt-0.5">
                                  + {sale.items.length - 3} producto(s) más...
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Totales */}
                          <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400">Total Venta:</span>
                              <p className="text-[11px] font-bold text-emerald-600">
                                {formatCurrency(sale.totalReferencia, currency.monedaReferencia)}
                              </p>
                            </div>
                            <span className="text-lg font-black text-slate-900">
                              {formatCurrency(sale.totalPrincipal, currency.monedaPrincipal)}
                            </span>
                          </div>
                        </div>

                        {/* Botones de Acción de la Tarjeta */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                          {/* BOTÓN PRINCIPAL: TOMAR PEDIDO */}
                          <button
                            type="button"
                            onClick={() => handleOpenTakeOrderModal(sale)}
                            className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
                            title="Convertir esta venta en un pedido de taller para gestionarlo con factura, abonos y seguimiento dataline"
                          >
                            <ClipboardList className="w-4 h-4 text-blue-100" />
                            <span>TOMAR PEDIDO</span>
                          </button>

                          {/* Acciones Secundarias: Retomar o Eliminar */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Retomar Venta al Ticket */}
                            <button
                              type="button"
                              onClick={() => handleResumeSavedSale(sale)}
                              className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition cursor-pointer"
                              title="Cargar esta venta al ticket para editarla, añadir más productos o cobrarla"
                            >
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-100" />
                              <span>Retomar Venta</span>
                            </button>

                            {/* Eliminar / Descartar */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedSale(sale)}
                              className="py-2 px-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                              title="Descartar esta venta guardada"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-5 sm:px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <BookmarkCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="hidden sm:inline">
                  Las ventas guardadas quedan disponibles para cualquier vendedor o turno.
                </span>
                <span className="sm:hidden">Disponibles para cualquier turno.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSavedSalesModal(false);
                  setSelectedSavedSaleDetail(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
              >
                Cerrar Seguimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TOMAR PEDIDO (PLANTILLA COBRAR Y PROCESAR VENTA)       */}
      {/* ------------------------------------------------------------- */}
      {showTakeOrderModal && saleForTakeOrder && (() => {
        const totalPrincipal = saleForTakeOrder.totalPrincipal;
        const totalReferencia = saleForTakeOrder.totalReferencia;
        const fiftyPercent = Number((totalPrincipal * 0.5).toFixed(2));
        const fiftyPercentRef = Number((totalReferencia * 0.5).toFixed(2));

        const isTakeOrderMixed = takeOrderPaymentMethod === 'PAGO_MIXTO';
        const selectedTakeOrderMethod = configuredPaymentMethods.find((m) => m.id === takeOrderPaymentMethod);
        const takeOrderMethodCurrency = selectedTakeOrderMethod
          ? (allCurrencies.find((c) => c.id === selectedTakeOrderMethod.monedaId) || allCurrencies.find((c) => c.esPrincipal) || allCurrencies[0])
          : (allCurrencies.find((c) => c.esPrincipal) || allCurrencies[0]);
        const takeOrderMethodRate = takeOrderMethodCurrency?.esPrincipal
          ? 1.0
          : (takeOrderMethodCurrency?.valorTasa > 0 ? takeOrderMethodCurrency.valorTasa : currency.tasaCambio);
        const takeOrderMethodAccount = selectedTakeOrderMethod?.cuentaBancariaId
          ? bankAccounts.find((a) => a.id === selectedTakeOrderMethod.cuentaBancariaId)
          : undefined;

        // Required amounts in selected method's currency
        const fiftyPercentInMethodCurrency = Number(
          (fiftyPercent * (takeOrderMethodCurrency?.esPrincipal ? 1.0 : takeOrderMethodRate)).toFixed(takeOrderMethodCurrency?.decimales || 2)
        );
        const totalInMethodCurrency = Number(
          (totalPrincipal * (takeOrderMethodCurrency?.esPrincipal ? 1.0 : takeOrderMethodRate)).toFixed(takeOrderMethodCurrency?.decimales || 2)
        );

        // Mixed breakdown for take order
        const takeOrderMixedBreakdown = activeCurrencies.map((c) => {
          const rate = c.esPrincipal ? 1.0 : (c.valorTasa > 0 ? c.valorTasa : currency.tasaCambio);
          const raw = parseFloat(takeOrderMixedAmounts[c.id] || '0') || 0;
          const equiv = c.esPrincipal ? raw : (rate > 0 ? raw / rate : raw);
          return { currency: c, amount: raw, equivPrincipal: equiv };
        });
        const totalTakeOrderMixedPrincipal = takeOrderMixedBreakdown.reduce((sum, b) => sum + b.equivPrincipal, 0);

        // Effective paid amount in principal currency
        const parsedMethodSingleAmount = parseFloat(takeOrderSingleAmount) || 0;
        const paidAmount = isTakeOrderMixed
          ? totalTakeOrderMixedPrincipal
          : (takeOrderMethodCurrency?.esPrincipal
              ? parsedMethodSingleAmount
              : (takeOrderMethodRate > 0 ? parsedMethodSingleAmount / takeOrderMethodRate : parsedMethodSingleAmount));

        const isUnderFifty = paidAmount > 0 && paidAmount < (fiftyPercent - 0.001);
        const isFullPayment = paidAmount >= (totalPrincipal - 0.001);
        const isAbono = !isFullPayment && paidAmount > 0;
        const saldoPendiente = Math.max(0, Number((totalPrincipal - paidAmount).toFixed(2)));
        const saldoPendienteRef = Math.max(0, Number((saldoPendiente * currency.tasaCambio).toFixed(2)));
        const vuelto = Math.max(0, Number((paidAmount - totalPrincipal).toFixed(2)));
        const vueltoRef = Math.max(0, Number((vuelto * currency.tasaCambio).toFixed(2)));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header con estilo Cobrar y Procesar */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-inner">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Tomar Pedido y Procesar Anticipo</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wider">
                        Dataline: ACEPTADO
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Venta #{saleForTakeOrder.codigo} • Cliente:{' '}
                      <span className="font-semibold text-white">
                        {saleForTakeOrder.cliente?.nombre || 'Consumidor Final'}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowTakeOrderModal(false);
                    setSaleForTakeOrder(null);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                {/* Total Summary Banner */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-inner">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Total del Pedido
                    </p>
                    <p className="text-2xl font-black text-white">
                      {formatCurrency(totalPrincipal, currency.monedaPrincipal)}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-300">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                      <span>
                        Anticipo 50% reglamentario:{' '}
                        <strong>{formatCurrency(fiftyPercent, currency.monedaPrincipal)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                      En Referencia
                    </p>
                    <p className="text-lg font-bold text-emerald-400">
                      {formatCurrency(totalReferencia, currency.monedaReferencia)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Tasa: Bs. {currency.tasaCambio}
                    </p>
                  </div>
                </div>

                {/* CAMPO OBLIGATORIO 1: FECHA ESTIMADA DE ENTREGA */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Fecha Estimada de Entrega</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                      Obligatorio
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={takeOrderDeliveryDate}
                      onChange={(e) => setTakeOrderDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
                      required
                    />
                  </div>

                  {/* Accesos rápidos de fecha */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                    <span className="text-slate-500 text-[10px] font-bold">Rápido:</span>
                    {[
                      { label: '+3 días', days: 3 },
                      { label: '+5 días (Estándar)', days: 5 },
                      { label: '+1 semana', days: 7 },
                      { label: '+15 días', days: 15 },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + btn.days);
                          setTakeOrderDeliveryDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-semibold transition cursor-pointer shadow-2xs"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CAMPO OBLIGATORIO 2: MÉTODO DE PAGO (SOLO ACTIVOS + PAGO MIXTO) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <span>Método de Pago</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] font-normal text-slate-500">
                      Configuración activa
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {configuredPaymentMethods.map((pm) => {
                      const linkedCurr = allCurrencies.find((c) => c.id === pm.monedaId);
                      const isSelected = takeOrderPaymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setTakeOrderPaymentMethod(pm.id);
                            const curr = allCurrencies.find((c) => c.id === pm.monedaId) || allCurrencies.find((c) => c.esPrincipal) || allCurrencies[0];
                            const rate = curr?.esPrincipal ? 1.0 : (curr?.valorTasa > 0 ? curr.valorTasa : currency.tasaCambio);
                            const val50 = Number((fiftyPercent * rate).toFixed(curr?.decimales || 2));
                            setTakeOrderSingleAmount(val50.toString());
                            setTakeOrderAmountPaidPrimary(fiftyPercent.toString());
                            setTakeOrderAmountPaidRef(fiftyPercentRef.toString());
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold">
                            {pm.tipo === 'EFECTIVO' ? (
                              <Banknote className="w-4 h-4" />
                            ) : pm.tipo === 'PAGO_MOVIL' ? (
                              <Smartphone className="w-4 h-4" />
                            ) : pm.tipo === 'PUNTO_VENTA' ? (
                              <CreditCard className="w-4 h-4" />
                            ) : pm.tipo === 'DIGITAL_ZELLE' ? (
                              <Wallet className="w-4 h-4" />
                            ) : (
                              <Landmark className="w-4 h-4" />
                            )}
                          </div>
                          <div className="truncate flex-1">
                            <p className="truncate font-bold leading-tight">{pm.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-normal">
                              {linkedCurr ? linkedCurr.codigo : 'Divisa'}
                            </p>
                          </div>
                        </button>
                      );
                    })}

                    {/* Siempre disponible la Opción de PAGO MIXTO */}
                    <button
                      type="button"
                      onClick={() => {
                        setTakeOrderPaymentMethod('PAGO_MIXTO');
                        setTakeOrderAmountPaidPrimary(fiftyPercent.toString());
                        setTakeOrderAmountPaidRef(fiftyPercentRef.toString());
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left ${
                        isTakeOrderMixed
                          ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div className="truncate flex-1">
                        <p className="truncate font-bold leading-tight">Pago Mixto</p>
                        <p className="text-[10px] text-slate-400 font-normal">Multimoneda</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* CAMPO OBLIGATORIO 3: MONTO RECIBIDO / ABONO EN LA MONEDA CORRESPONDIENTE */}
                {!isTakeOrderMixed ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                        <span>Monto Recibido ({takeOrderMethodCurrency?.nombre} - {takeOrderMethodCurrency?.codigo})</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setTakeOrderSingleAmount(fiftyPercentInMethodCurrency.toString());
                            setTakeOrderAmountPaidPrimary(fiftyPercent.toString());
                            setTakeOrderAmountPaidRef(fiftyPercentRef.toString());
                          }}
                          className="px-2 py-0.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold transition cursor-pointer"
                          title="Fijar anticipo del 50%"
                        >
                          50% ({takeOrderMethodCurrency?.simbolo} {fiftyPercentInMethodCurrency})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTakeOrderSingleAmount(totalInMethodCurrency.toString());
                            setTakeOrderAmountPaidPrimary(totalPrincipal.toString());
                            setTakeOrderAmountPaidRef(totalReferencia.toString());
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold transition cursor-pointer"
                          title="Fijar pago total (100%)"
                        >
                          100% ({takeOrderMethodCurrency?.simbolo} {totalInMethodCurrency})
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                        {takeOrderMethodCurrency?.simbolo}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={takeOrderSingleAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTakeOrderSingleAmount(val);
                          const num = parseFloat(val) || 0;
                          const equiv = takeOrderMethodCurrency?.esPrincipal
                            ? num
                            : (takeOrderMethodRate > 0 ? num / takeOrderMethodRate : num);
                          setTakeOrderAmountPaidPrimary(equiv.toFixed(2));
                          setTakeOrderAmountPaidRef((equiv * currency.tasaCambio).toFixed(2));
                        }}
                        className="w-full pl-9 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="0.00"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md font-mono">
                        {takeOrderMethodCurrency?.codigo}
                      </span>
                    </div>

                    {!takeOrderMethodCurrency?.esPrincipal && (
                      <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span>
                          Tasa: 1 {currency.monedaPrincipal.codigo} = {takeOrderMethodRate} {takeOrderMethodCurrency?.codigo}
                        </span>
                        <span className="font-semibold text-slate-800">
                          Equivalente: {formatCurrency(paidAmount, currency.monedaPrincipal)}
                        </span>
                      </div>
                    )}

                    {/* Ficha Bancaria Vinculada */}
                    {takeOrderMethodAccount && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                            {takeOrderMethodAccount.banco} ({takeOrderMethodAccount.codigo})
                          </span>
                          <span className="font-mono text-slate-600">{takeOrderMethodAccount.documentoId}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 font-mono text-[11px]">
                          <span>Cuenta: {takeOrderMethodAccount.numeroCuenta}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(takeOrderMethodAccount.numeroCuenta);
                              triggerFeedback('📋 N° de cuenta copiado al portapapeles');
                            }}
                            className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Copiar
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Titular: <span className="font-semibold text-slate-800">{takeOrderMethodAccount.titular}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* PAGO MIXTO MULTIMONEDA EN TOMAR PEDIDO */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase">
                        Pago Mixto Multimoneda (Monedas Activas)
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Cálculo independiente por cada divisa
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeCurrencies.map((c) => {
                        const rate = c.esPrincipal ? 1.0 : (c.valorTasa > 0 ? c.valorTasa : currency.tasaCambio);
                        const amountStr = takeOrderMixedAmounts[c.id] || '';
                        const amountNum = parseFloat(amountStr) || 0;
                        const equivPrincipal = c.esPrincipal ? amountNum : (rate > 0 ? amountNum / rate : amountNum);

                        const otherContributions = takeOrderMixedBreakdown
                          .filter((b) => b.currency.id !== c.id)
                          .reduce((sum, b) => sum + b.equivPrincipal, 0);
                        const remaining50 = Math.max(
                          0,
                          (fiftyPercent - otherContributions) * (c.esPrincipal ? 1.0 : rate)
                        );
                        const remainingTotal = Math.max(
                          0,
                          (totalPrincipal - otherContributions) * (c.esPrincipal ? 1.0 : rate)
                        );

                        return (
                          <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                {c.nombre} ({c.codigo})
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {c.esPrincipal
                                  ? 'Moneda Base'
                                  : `Tasa: 1 ${currency.monedaPrincipal.codigo} = ${rate} ${c.codigo}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                                  {c.simbolo}
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={amountStr}
                                  onChange={(e) => {
                                    const nextAmounts = {
                                      ...takeOrderMixedAmounts,
                                      [c.id]: e.target.value,
                                    };
                                    setTakeOrderMixedAmounts(nextAmounts);

                                    // Calculate total equiv principal
                                    const sumPrincipal = activeCurrencies.reduce((sum, curr) => {
                                      const currRate = curr.esPrincipal ? 1.0 : (curr.valorTasa > 0 ? curr.valorTasa : currency.tasaCambio);
                                      const rawVal = parseFloat(nextAmounts[curr.id] || '0') || 0;
                                      return sum + (curr.esPrincipal ? rawVal : (currRate > 0 ? rawVal / currRate : rawVal));
                                    }, 0);
                                    setTakeOrderAmountPaidPrimary(sumPrincipal.toFixed(2));
                                    setTakeOrderAmountPaidRef((sumPrincipal * currency.tasaCambio).toFixed(2));
                                  }}
                                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                  placeholder="0.00"
                                />
                              </div>

                              {remaining50 > 0.01 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextAmounts = {
                                      ...takeOrderMixedAmounts,
                                      [c.id]: remaining50.toFixed(c.decimales || 2),
                                    };
                                    setTakeOrderMixedAmounts(nextAmounts);
                                    const sumPrincipal = activeCurrencies.reduce((sum, curr) => {
                                      const currRate = curr.esPrincipal ? 1.0 : (curr.valorTasa > 0 ? curr.valorTasa : currency.tasaCambio);
                                      const rawVal = parseFloat(nextAmounts[curr.id] || '0') || 0;
                                      return sum + (curr.esPrincipal ? rawVal : (currRate > 0 ? rawVal / currRate : rawVal));
                                    }, 0);
                                    setTakeOrderAmountPaidPrimary(sumPrincipal.toFixed(2));
                                    setTakeOrderAmountPaidRef((sumPrincipal * currency.tasaCambio).toFixed(2));
                                  }}
                                  className="px-2 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold transition cursor-pointer flex-shrink-0"
                                  title="Cubrir el 50% en esta moneda"
                                >
                                  Cubrir 50%
                                </button>
                              )}

                              {remainingTotal > 0.01 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextAmounts = {
                                      ...takeOrderMixedAmounts,
                                      [c.id]: remainingTotal.toFixed(c.decimales || 2),
                                    };
                                    setTakeOrderMixedAmounts(nextAmounts);
                                    const sumPrincipal = activeCurrencies.reduce((sum, curr) => {
                                      const currRate = curr.esPrincipal ? 1.0 : (curr.valorTasa > 0 ? curr.valorTasa : currency.tasaCambio);
                                      const rawVal = parseFloat(nextAmounts[curr.id] || '0') || 0;
                                      return sum + (curr.esPrincipal ? rawVal : (currRate > 0 ? rawVal / currRate : rawVal));
                                    }, 0);
                                    setTakeOrderAmountPaidPrimary(sumPrincipal.toFixed(2));
                                    setTakeOrderAmountPaidRef((sumPrincipal * currency.tasaCambio).toFixed(2));
                                  }}
                                  className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold transition cursor-pointer flex-shrink-0"
                                  title="Completar el restante en esta moneda"
                                >
                                  Pagar Restante
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                              <span>Aporte contable independiente:</span>
                              <span className="font-bold font-mono text-blue-800">
                                {formatCurrency(equivPrincipal, currency.monedaPrincipal)} ({formatCurrency(equivPrincipal * currency.tasaCambio, currency.monedaReferencia)})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Referencia bancaria si no es efectivo o es pago mixto */}
                {(isTakeOrderMixed || selectedTakeOrderMethod?.requiereReferencia || selectedTakeOrderMethod?.tipo !== 'EFECTIVO') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      N° de Referencia Bancaria / Comprobante
                    </label>
                    <input
                      type="text"
                      value={takeOrderReferenceCode}
                      onChange={(e) => setTakeOrderReferenceCode(e.target.value)}
                      placeholder="Ej. 98765432 o Referencia Mixta"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                )}

                {/* Observaciones opcionales */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Notas u Observaciones del Pedido
                  </label>
                  <input
                    type="text"
                    value={takeOrderNotes}
                    onChange={(e) => setTakeOrderNotes(e.target.value)}
                    placeholder="Instrucciones especiales para confección, diseño o entrega..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* ESTADO FINANCIERO DINÁMICO & VALIDACIÓN 50% */}
                {paidAmount > 0 && (
                  <div>
                    {isFullPayment ? (
                      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-800 font-black text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>PAGO COMPLETO (100%)</span>
                          </div>
                          {vuelto > 0 && (
                            <span className="text-[11px] font-black text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded">
                              Vuelto a entregar: {formatCurrency(vuelto, currency.monedaPrincipal)} ({formatCurrency(vueltoRef, currency.monedaReferencia)})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          El pedido quedará saldado en su totalidad y se creará con Estado Dataline: <strong>ACEPTADO</strong>.
                        </p>
                      </div>
                    ) : isUnderFifty ? (
                      <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 space-y-1 shadow-2xs">
                        <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
                          <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>MONTO MENOR AL 50% REQUERIDO ({formatCurrency(paidAmount, currency.monedaPrincipal)} de {formatCurrency(fiftyPercent, currency.monedaPrincipal)})</span>
                        </div>
                        <p className="text-[11px] text-rose-700">
                          ⚠️ <strong>Requiere confirmación de un Administrador por PIN</strong>. Si continúa, se abrirá la ventana de autorización por PIN para validar la recepción de este monto inferior.
                        </p>
                        <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-rose-800 border-t border-rose-200">
                          <span>Se registrará como: <strong>ABONO</strong></span>
                          <span>Saldo pendiente por cobrar: <strong>{formatCurrency(saldoPendiente, currency.monedaPrincipal)}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                            <span>PAGO PARCIAL (≥ 50%) — SE REGISTRARÁ COMO ABONO</span>
                          </div>
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                            Abono: {formatCurrency(paidAmount, currency.monedaPrincipal)}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Saldo restante por cobrar para entrega: <strong>{formatCurrency(saldoPendiente, currency.monedaPrincipal)} ({formatCurrency(saldoPendienteRef, currency.monedaReferencia)})</strong>. Estado Dataline: <strong>ACEPTADO</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje de error si faltan datos obligatorios */}
                {takeOrderError && (
                  <div className="bg-rose-50 border border-rose-300 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span className="font-semibold">{takeOrderError}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTakeOrderModal(false);
                    setSaleForTakeOrder(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleValidateAndSubmitTakeOrder}
                  className={`px-5 py-2.5 rounded-xl text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95 ${
                    isUnderFifty
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isUnderFifty ? (
                    <>
                      <KeyRound className="w-4 h-4 text-amber-200" />
                      <span>Pedir PIN Admin y Tomar Pedido</span>
                    </>
                  ) : isFullPayment ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Aceptar Pedido (Pago Total)</span>
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-4 h-4 text-blue-200" />
                      <span>Aceptar Pedido con Abono</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONFIRMACIÓN DE ADMINISTRADOR POR PIN (ANTICIPO < 50%) */}
      {/* ------------------------------------------------------------- */}
      {showTakeOrderAdminAuthModal && saleForTakeOrder && (() => {
        const totalPrincipal = saleForTakeOrder.totalPrincipal;
        const fiftyPercent = Number((totalPrincipal * 0.5).toFixed(2));
        const paidAmount = parseFloat(takeOrderAmountPaidPrimary) || 0;
        const allUsers = users.length > 0 ? users : db.getUsers();
        const activeAdmins = allUsers.filter((u) => u.role === 'ADMINISTRADOR' && u.activo);

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-amber-500 text-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-950/10 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide">
                      Autorización de Administrador Requerida
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-800">
                      Anticipo menor al 50% del total
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTakeOrderAdminAuthModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleVerifyTakeOrderAdminAuth} className="p-5 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 text-xs text-amber-950">
                  <p className="font-bold">
                    El monto a recibir ({formatCurrency(paidAmount, currency.monedaPrincipal)}) es menor al 50% reglamentario ({formatCurrency(fiftyPercent, currency.monedaPrincipal)}).
                  </p>
                  <p className="text-[11px] text-amber-900">
                    Para registrar este pedido como <strong>ABONO</strong> con Estado Dataline <strong>ACEPTADO</strong>, se requiere el PIN de un Administrador.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Seleccionar Administrador:
                  </label>
                  <select
                    value={takeOrderSelectedAdminId || (activeAdmins[0]?.id || '')}
                    onChange={(e) => setTakeOrderSelectedAdminId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  >
                    {activeAdmins.map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.nombre} {adm.apellido} ({adm.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    PIN de Seguridad del Administrador:
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={6}
                      autoFocus
                      value={takeOrderAdminPin}
                      onChange={(e) => setTakeOrderAdminPin(e.target.value)}
                      placeholder="••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono font-black text-lg tracking-widest text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {takeOrderAdminError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{takeOrderAdminError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTakeOrderAdminAuthModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                  >
                    Volver y Editar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Autorizar y Aceptar Pedido</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* MODAL CONTROL DE CUENTAS POR COBRAR Y DEUDAS POR CLIENTE       */}
      {/* ------------------------------------------------------------- */}
      <AccountsReceivableModal
        isOpen={showAccountsReceivableModal}
        onClose={() => {
          setShowAccountsReceivableModal(false);
          setAccountsReceivableClientFilter(undefined);
          setDbDebtTick((t) => t + 1);
        }}
        currency={currency}
        company={company}
        initialClientDocId={accountsReceivableClientFilter}
        onLoadDebtToTicket={(clientData, debtAmount) => {
          setClient(clientData);
          setAccountsReceivableClientFilter(undefined);
          setShowAccountsReceivableModal(false);

          const debtProduct: Product = {
            id: 'DEUDA-PENDIENTE',
            codigoBarras: 'DEUDA-CXC',
            nombre: `Cobro Saldo Deudor CxC (${clientData.nombre})`,
            categoriaId: categories[0]?.id || 'cat-1',
            precioCompra: 0,
            precioVenta: debtAmount,
            porcentajeGanancia: 0,
            impuestoId: taxes.find((t) => t.porcentaje === 0)?.id || taxes[0]?.id || 'tax-exento',
            stockActual: 9999,
            stockMinimo: 0,
            unidadMedida: 'UND',
            activo: true,
            creadoEn: new Date().toISOString(),
          };

          const exemptTax: Tax = taxes.find((t) => t.porcentaje === 0) || {
            id: 'tax-exento',
            nombre: 'Exento',
            porcentaje: 0,
            activo: true,
            esPredeterminado: false,
          };

          const newCartItem: CartItem = {
            producto: debtProduct,
            cantidad: 1,
            precioUnitario: debtAmount,
            descuentoPorcentaje: 0,
            impuesto: exemptTax,
            subtotal: debtAmount,
            impuestoTotal: 0,
            total: debtAmount,
          };

          setTicketItems((prev) => [
            newCartItem,
            ...prev.filter(
              (item) =>
                item.producto.id !== 'DEUDA-PENDIENTE' && item.producto.codigoBarras !== 'DEUDA-CXC'
            ),
          ]);

          triggerFeedback(
            `✅ Saldo adeudado de ${formatCurrency(debtAmount, currency.monedaPrincipal)} cargado a la factura de ${clientData.nombre}.`
          );
        }}
        onSendWhatsAppReminder={(targetClient, debts) => {
          handleSendDebtWhatsAppReminder(targetClient, debts);
        }}
      />
    </div>
  );
};
