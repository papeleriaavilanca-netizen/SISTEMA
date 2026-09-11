import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Phone,
  DollarSign,
  Package,
  ShoppingBag,
  Clock,
  Sparkles,
  AlertCircle,
  Scissors,
} from 'lucide-react';
import {
  WorkshopOrder,
  WorkshopOrderItem,
  WorkshopOrderStatus,
  Client,
  Product,
  User as SystemUser,
  CurrencyConfig,
} from '../types';
import { formatCurrency, convertToRef } from '../utils/formatters';
import { db } from '../services/db';

interface WorkshopNewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: WorkshopOrder) => void;
  clients: Client[];
  products: Product[];
  users: SystemUser[];
  currentUser: SystemUser;
  currency: CurrencyConfig;
  initialOrder?: WorkshopOrder | null;
}

export const WorkshopNewOrderModal: React.FC<WorkshopNewOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  products,
  users,
  currentUser,
  currency,
  initialOrder,
}) => {
  if (!isOpen) return null;

  // Form states
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientNombre, setClientNombre] = useState('');
  const [clientDocId, setClientDocId] = useState('');
  const [clientTelefono, setClientTelefono] = useState('');
  const [clientDireccion, setClientDireccion] = useState('');

  const [vendedorId, setVendedorId] = useState<string>(currentUser.id);
  const [vendedorNombre, setVendedorNombre] = useState<string>(
    `${currentUser.nombre} ${currentUser.apellido}`
  );

  const [fechaEstimadaEntrega, setFechaEstimadaEntrega] = useState<string>('');
  const [prioridad, setPrioridad] = useState<'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');
  const [notasTaller, setNotasTaller] = useState<string>('');

  const [items, setItems] = useState<WorkshopOrderItem[]>([]);
  const [tipoPago, setTipoPago] = useState<'COMPLETO' | 'PARCIAL' | 'PENDIENTE'>('PARCIAL');
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo USD');
  const [montoAbonado, setMontoAbonado] = useState<number>(0);
  const [initialStatus, setInitialStatus] = useState<WorkshopOrderStatus>('ACEPTADO');

  // Quick product selector
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customItemNombre, setCustomItemNombre] = useState('');
  const [customItemPrecio, setCustomItemPrecio] = useState<number>(0);
  const [customItemCantidad, setCustomItemCantidad] = useState<number>(1);
  const [customItemTallaColor, setCustomItemTallaColor] = useState('');
  const [customItemNotas, setCustomItemNotas] = useState('');

  const configuredPaymentMethods = db.getPaymentMethodsConfig().filter((m) => m.activo !== false);
  const allCurrencies = db.getCurrencies();
  const bankAccounts = db.getBankAccounts();

  useEffect(() => {
    if (initialOrder) {
      setClientNombre(initialOrder.cliente.nombre);
      setClientDocId(initialOrder.cliente.docId);
      setClientTelefono(initialOrder.cliente.telefono);
      setClientDireccion(initialOrder.cliente.direccion || '');
      setVendedorId(initialOrder.vendedorId);
      setVendedorNombre(initialOrder.vendedorNombre);
      setFechaEstimadaEntrega(initialOrder.fechaEstimadaEntrega);
      setPrioridad(initialOrder.prioridad || 'NORMAL');
      setNotasTaller(initialOrder.notasTaller || '');
      setItems(initialOrder.items || []);
      setInitialStatus(initialOrder.estado || 'ACEPTADO');

      const abono = initialOrder.montoAbonadoPrincipal || 0;
      setMontoAbonado(abono);
      if (initialOrder.tipoPago) {
        setTipoPago(initialOrder.tipoPago);
      } else if (abono >= initialOrder.totalPrincipal && initialOrder.totalPrincipal > 0) {
        setTipoPago('COMPLETO');
      } else if (abono > 0) {
        setTipoPago('PARCIAL');
      } else {
        setTipoPago('PENDIENTE');
      }
      if (initialOrder.metodoPagoAbono) {
        setMetodoPago(initialOrder.metodoPagoAbono);
      }
    } else {
      // Default delivery date: 3 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      setFechaEstimadaEntrega(defaultDate.toISOString().split('T')[0]);

      // If clients exist, default to first or blank
      if (clients.length > 0) {
        const first = clients[0];
        setSelectedClientId(first.id);
        setClientNombre(first.nombre);
        setClientDocId(first.docId);
        setClientTelefono(first.telefono || '');
        setClientDireccion(first.direccion || '');
      }

      setVendedorId(currentUser.id);
      setVendedorNombre(`${currentUser.nombre} ${currentUser.apellido}`);
      setItems([]);
      setTipoPago('PARCIAL');
      const defaultMethod = configuredPaymentMethods[0];
      setMetodoPago(defaultMethod ? defaultMethod.nombre : 'Efectivo');
      setMontoAbonado(0);
      setInitialStatus('ACEPTADO');
      setNotasTaller('');
      setPrioridad('NORMAL');
    }
  }, [initialOrder, isOpen]);

  // Handle client selection change
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === 'NEW') {
      setClientNombre('');
      setClientDocId('');
      setClientTelefono('');
      setClientDireccion('');
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setClientNombre(client.nombre);
      setClientDocId(client.docId);
      setClientTelefono(client.telefono || '');
      setClientDireccion(client.direccion || '');
    }
  };

  // Quick delivery date setter
  const setQuickDeliveryDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFechaEstimadaEntrega(d.toISOString().split('T')[0]);
  };

  // Add product from inventory
  const handleAddProductFromInventory = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const newItem: WorkshopOrderItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      productoId: prod.id,
      nombre: prod.nombre,
      codigo: prod.codigo,
      cantidad: 1,
      precioUnitario: prod.precioVenta,
      total: prod.precioVenta,
      tallaOColor: '',
      notas: '',
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
  };

  // Add custom workshop product
  const handleAddCustomItem = () => {
    if (!customItemNombre.trim() || customItemPrecio <= 0 || customItemCantidad <= 0) return;

    const newItem: WorkshopOrderItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      nombre: customItemNombre.trim(),
      codigo: 'TALLER-' + Math.floor(100 + Math.random() * 900),
      cantidad: customItemCantidad,
      precioUnitario: customItemPrecio,
      total: Number((customItemPrecio * customItemCantidad).toFixed(2)),
      tallaOColor: customItemTallaColor.trim() || undefined,
      notas: customItemNotas.trim() || undefined,
    };

    setItems([...items, newItem]);
    setCustomItemNombre('');
    setCustomItemPrecio(0);
    setCustomItemCantidad(1);
    setCustomItemTallaColor('');
    setCustomItemNotas('');
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...items];
    updated[index].cantidad = newQty;
    updated[index].total = Number((newQty * updated[index].precioUnitario).toFixed(2));
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotalPrincipal = items.reduce((sum, item) => sum + item.total, 0);
  const totalPrincipal = subtotalPrincipal;
  const subtotalReferencia = convertToRef(subtotalPrincipal, currency.tasaCambio);
  const totalReferencia = subtotalReferencia;

  // Effective abono depending on tipoPago
  const effectiveAbono =
    tipoPago === 'COMPLETO'
      ? totalPrincipal
      : tipoPago === 'PENDIENTE'
      ? 0
      : Math.min(totalPrincipal, Math.max(0, montoAbonado));
  const saldoPendientePrincipal = Math.max(0, Number((totalPrincipal - effectiveAbono).toFixed(2)));

  const handleSelectTipoPago = (tipo: 'COMPLETO' | 'PARCIAL' | 'PENDIENTE') => {
    setTipoPago(tipo);
    if (tipo === 'COMPLETO') {
      setMontoAbonado(totalPrincipal);
    } else if (tipo === 'PENDIENTE') {
      setMontoAbonado(0);
    } else if (montoAbonado === 0 || montoAbonado >= totalPrincipal) {
      setMontoAbonado(Number((totalPrincipal * 0.5).toFixed(2)));
    }
  };

  const handleQuickPercentAbono = (percent: number) => {
    setTipoPago('PARCIAL');
    const calculated = Number(((totalPrincipal * percent) / 100).toFixed(2));
    setMontoAbonado(calculated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientNombre.trim() || !clientTelefono.trim()) {
      alert('Por favor complete el nombre y teléfono del cliente.');
      return;
    }

    if (!fechaEstimadaEntrega) {
      alert('Por favor ingrese la fecha estimada de entrega.');
      return;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un producto o prenda al pedido.');
      return;
    }

    const orderId = initialOrder ? initialOrder.id : 'ped-' + Date.now();
    const orderNumber = initialOrder
      ? initialOrder.numeroPedido
      : '#PED-' + Math.floor(10000 + Math.random() * 90000);

    const now = new Date();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const formattedNow = `${now.getDate()} ${months[now.getMonth()]}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const effectiveStatus: WorkshopOrderStatus = initialOrder ? initialOrder.estado : initialStatus;

    const statusSteps: { estado: WorkshopOrderStatus; titulo: string }[] = [
      { estado: 'ACEPTADO', titulo: '1- ACEPTADO' },
      { estado: 'EN_CONFECCION', titulo: '2- CONFECCIÓN' },
      { estado: 'EN_DISENO', titulo: '3- DISEÑO' },
      { estado: 'LISTO', titulo: '4- LISTO' },
      { estado: 'ENTREGADO', titulo: '5- ENTREGADO' },
    ];
    const targetIdx = statusSteps.findIndex((s) => s.estado === effectiveStatus);

    const generatedTimeline = statusSteps.map((s, idx) => {
      const existing = initialOrder?.timeline?.find((t) => t.estado === s.estado);
      const isPast = idx < (targetIdx >= 0 ? targetIdx : 0);
      const isCurrent = idx === targetIdx;

      return {
        estado: s.estado,
        titulo: s.titulo,
        fecha: isCurrent ? formattedNow : isPast ? existing?.fecha || 'Completado' : undefined,
        completado: isPast || (isCurrent && s.estado === 'ENTREGADO'),
        actual: isCurrent && s.estado !== 'ENTREGADO',
        descripcion:
          isCurrent && !existing?.descripcion
            ? `Estado: ${s.titulo}`
            : existing?.descripcion,
      };
    });

    const paymentRecords = initialOrder?.historialAbonos ? [...initialOrder.historialAbonos] : [];
    if (!initialOrder && effectiveAbono > 0) {
      paymentRecords.push({
        id: 'abono-init-' + Date.now(),
        fecha: now.toISOString(),
        monto: effectiveAbono,
        metodoPago: metodoPago,
        usuarioNombre: `${currentUser.nombre} ${currentUser.apellido}`,
        notas: tipoPago === 'COMPLETO' ? 'Pago completo inicial' : 'Abono / Anticipo inicial',
      });
    }

    const newOrder: WorkshopOrder = {
      id: orderId,
      numeroPedido: orderNumber,
      fechaCreacion: initialOrder ? initialOrder.fechaCreacion : now.toISOString(),
      fechaEstimadaEntrega: fechaEstimadaEntrega,
      fechaEntregaReal: effectiveStatus === 'ENTREGADO' ? now.toISOString() : initialOrder?.fechaEntregaReal,
      cliente: {
        nombre: clientNombre.trim(),
        docId: clientDocId.trim() || 'V-00000000',
        telefono: clientTelefono.trim(),
        direccion: clientDireccion.trim() || undefined,
      },
      vendedorId: vendedorId,
      vendedorNombre: vendedorNombre,
      estado: effectiveStatus,
      timeline: initialOrder ? initialOrder.timeline : generatedTimeline,
      items: items,
      subtotalPrincipal: subtotalPrincipal,
      impuestosPrincipal: 0,
      totalPrincipal: totalPrincipal,
      subtotalReferencia: subtotalReferencia,
      impuestosReferencia: 0,
      totalReferencia: totalReferencia,
      tasaCambioAplicada: currency.tasaCambio,
      notasTaller: notasTaller.trim() || undefined,
      prioridad: prioridad,
      tipoPago: tipoPago,
      metodoPagoAbono: metodoPago,
      montoAbonadoPrincipal: effectiveAbono,
      saldoPendientePrincipal: saldoPendientePrincipal,
      historialAbonos: paymentRecords,
    };

    onSave(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {initialOrder ? `Editar Pedido ${initialOrder.numeroPedido}` : 'Nuevo Pedido de Taller / Confección'}
              </h3>
              <p className="text-xs text-slate-500">
                Registre cliente, vendedor, entrega estimada y productos a confeccionar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Cliente & Vendedor */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              1. Cliente y Vendedor Responsable
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              {/* Client Selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seleccionar Cliente:
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="NEW">+ Ingresar Cliente Nuevo</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.docId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientNombre}
                      onChange={(e) => setClientNombre(e.target.value)}
                      placeholder="Ej: Omar Rodríguez"
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Cédula / RIF *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientDocId}
                      onChange={(e) => setClientDocId(e.target.value)}
                      placeholder="V-19842510"
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Teléfono WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientTelefono}
                      onChange={(e) => setClientTelefono(e.target.value)}
                      placeholder="+58 412 8765432"
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Dirección (Opcional)
                    </label>
                    <input
                      type="text"
                      value={clientDireccion}
                      onChange={(e) => setClientDireccion(e.target.value)}
                      placeholder="Ciudad / Sector"
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Vendedor and Delivery Dates */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendedor a Cargo:
                  </label>
                  <select
                    value={vendedorId}
                    onChange={(e) => {
                      setVendedorId(e.target.value);
                      const u = users.find((usr) => usr.id === e.target.value);
                      if (u) setVendedorNombre(`${u.nombre} ${u.apellido}`);
                    }}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} {u.apellido} ({u.rol})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delivery Date Picker & Quick Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Fecha Estimada de Entrega *</span>
                    <span className="text-[10px] text-blue-600 font-bold">Atajos rápidos:</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaEstimadaEntrega}
                    onChange={(e) => setFechaEstimadaEntrega(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-emerald-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryDays(1)}
                      className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryDays(3)}
                      className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      En 3 días
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryDays(7)}
                      className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      En 1 semana
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryDays(14)}
                      className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      En 2 semanas
                    </button>
                  </div>
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prioridad de Fabricación:
                    </label>
                    <div className="flex gap-1.5">
                      {(['NORMAL', 'ALTA', 'URGENTE'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPrioridad(p)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            prioridad === p
                              ? p === 'URGENTE'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : p === 'ALTA'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estado del Pedido (5 Pasos):
                    </label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as WorkshopOrderStatus)}
                      className="w-full text-xs font-black bg-white border border-blue-300 rounded-xl p-2 text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="ACEPTADO">1- ACEPTADO</option>
                      <option value="EN_CONFECCION">2- CONFECCIÓN</option>
                      <option value="EN_DISENO">3- DISEÑO</option>
                      <option value="LISTO">4- LISTO</option>
                      <option value="ENTREGADO">5- ENTREGADO</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Productos y Cantidades con Precios */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              2. Productos, Confección y Cantidades con Precios
            </h4>

            {/* Selector bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Inventory Picker */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Cargar desde Catálogo de Productos:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="flex-1 text-xs bg-white border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="">-- Seleccionar un producto existente --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {formatCurrency(p.precioVenta, currency.monedaPrincipal)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddProductFromInventory}
                      disabled={!selectedProductId}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {/* Custom Item Trigger */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    O prenda/servicio personalizado:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Añada abajo telas, calzados, estampados o confección a medida.
                  </p>
                </div>
              </div>

              {/* Custom Item Form */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                    Descripción / Prenda
                  </label>
                  <input
                    type="text"
                    value={customItemNombre}
                    onChange={(e) => setCustomItemNombre(e.target.value)}
                    placeholder="Ej: Tenis Deportivos Personalizados"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                    Talla / Color / Medida
                  </label>
                  <input
                    type="text"
                    value={customItemTallaColor}
                    onChange={(e) => setCustomItemTallaColor(e.target.value)}
                    placeholder="Talla 42 / Azul"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customItemCantidad}
                    onChange={(e) => setCustomItemCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                    Precio Unitario ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customItemPrecio || ''}
                    onChange={(e) => setCustomItemPrecio(parseFloat(e.target.value) || 0)}
                    placeholder="42.00"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-right"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={!customItemNombre || customItemPrecio <= 0}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-4">Producto / Detalle</th>
                    <th className="py-2.5 px-3 text-center w-24">Cantidad</th>
                    <th className="py-2.5 px-4 text-right w-28">P. Unitario</th>
                    <th className="py-2.5 px-4 text-right w-28">Total</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No has añadido productos a este pedido todavía.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{item.nombre}</p>
                          {item.tallaOColor && (
                            <span className="text-[11px] text-blue-600 font-semibold block">
                              • {item.tallaOColor}
                            </span>
                          )}
                          {item.notas && (
                            <span className="text-[10.5px] text-slate-500 italic block">
                              Nota: {item.notas}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(idx, item.cantidad - 1)}
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-bold w-6 text-center">{item.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(idx, item.cantidad + 1)}
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {formatCurrency(item.precioUnitario, currency.monedaPrincipal)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                          {formatCurrency(item.total, currency.monedaPrincipal)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Total & Payment Options Row */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col lg:flex-row items-start justify-between gap-5">
                <div className="w-full lg:w-5/12 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Instrucciones de Taller / Notas de Confección:
                    </label>
                    <textarea
                      rows={2}
                      value={notasTaller}
                      onChange={(e) => setNotasTaller(e.target.value)}
                      placeholder="Ej: Secado rápido para serigrafía, atención al bordado..."
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2"
                    />
                  </div>

                  {/* Payment Method Selector if there's payment */}
                  {tipoPago !== 'PENDIENTE' && (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                        Método de Pago para el Cobro:
                      </label>
                      <select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800"
                      >
                        <option value="Efectivo USD">Efectivo USD ($)</option>
                        <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                        <option value="Punto de Venta / Débito">Punto de Venta / Débito</option>
                        <option value="Efectivo Bs">Efectivo Bs</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-7/12 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  {/* Total summary */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Gran Total del Pedido:
                    </span>
                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {formatCurrency(totalPrincipal, currency.monedaPrincipal)}
                      </span>
                      <span className="text-xs font-bold text-slate-500 block font-mono">
                        ≈ {formatCurrency(totalReferencia, currency.monedaReferencia)}
                      </span>
                    </div>
                  </div>

                  {/* Payment condition buttons */}
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Condición / Modalidad de Pago:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectTipoPago('COMPLETO')}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          tipoPago === 'COMPLETO'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        ✓ Pago Completo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTipoPago('PARCIAL')}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          tipoPago === 'PARCIAL'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Pago Parcial / Abono
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTipoPago('PENDIENTE')}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          tipoPago === 'PENDIENTE'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Pendiente $0
                      </button>
                    </div>
                  </div>

                  {/* Partial Abono Controls */}
                  {tipoPago === 'PARCIAL' && (
                    <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/80 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-blue-950">
                          Monto Abonado / Anticipo ($):
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={totalPrincipal}
                            value={montoAbonado || ''}
                            onChange={(e) => setMontoAbonado(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-32 text-sm font-black text-right bg-white border border-blue-300 rounded-lg py-1.5 px-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Quick percentage abonos */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-blue-700 font-bold">Atajos rápidos:</span>
                        {[30, 50, 70].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleQuickPercentAbono(pct)}
                            className="px-2 py-0.5 text-[10px] font-black bg-white hover:bg-blue-100 text-blue-800 rounded-md border border-blue-200 cursor-pointer"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Balance Display */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold">
                    <span className="text-slate-600">Saldo Pendiente por Cobrar:</span>
                    <span
                      className={`font-mono text-sm font-black ${
                        saldoPendientePrincipal > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {saldoPendientePrincipal > 0
                        ? formatCurrency(saldoPendientePrincipal, currency.monedaPrincipal)
                        : '✓ Pagado en su totalidad'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              {initialOrder ? 'Guardar Cambios' : 'Crear Pedido de Taller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
