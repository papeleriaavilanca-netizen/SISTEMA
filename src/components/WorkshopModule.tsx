import React, { useState, useMemo, useEffect } from 'react';
import {
  Scissors,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  User,
  Phone,
  Clock,
  Printer,
  MessageCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Boxes,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  WorkshopOrder,
  WorkshopOrderStatus,
  CompanyConfig,
  CurrencyConfig,
  Client,
  Product,
  User as SystemUser,
} from '../types';
import {
  formatCurrency,
  formatWorkshopDateShort,
  formatWorkshopDeliveryDate,
  generateWorkshopWhatsAppMessage,
} from '../utils/formatters';
import { WorkshopOrderDetails } from './WorkshopOrderDetails';
import { WorkshopNewOrderModal } from './WorkshopNewOrderModal';
import { WorkshopPrintModal } from './WorkshopPrintModal';
import { WORKSHOP_STEPS, WorkshopDatalineBar, getWorkshopStatusTheme } from './WorkshopTimeline';

interface WorkshopModuleProps {
  orders: WorkshopOrder[];
  onSaveOrder: (order: WorkshopOrder) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: WorkshopOrderStatus, note?: string) => void;
  onUpdateOrderItemStatus?: (orderId: string, itemId: string, newStatus: WorkshopOrderStatus) => void;
  onDeleteOrder?: (orderId: string) => void;
  onAddPayment?: (orderId: string, amount: number, method: string, note?: string) => void;
  company: CompanyConfig;
  currency: CurrencyConfig;
  clients: Client[];
  products: Product[];
  users: SystemUser[];
  currentUser: SystemUser;
  initialSelectedOrderId?: string | null;
}

type SortField = 'fechaEntrega' | 'monto' | 'cantidad' | 'cliente' | 'fechaCreacion' | 'estado';
type SortDirection = 'asc' | 'desc';

export const WorkshopModule: React.FC<WorkshopModuleProps> = ({
  orders,
  onSaveOrder,
  onUpdateOrderStatus,
  onUpdateOrderItemStatus,
  onDeleteOrder,
  onAddPayment,
  company,
  currency,
  clients,
  products,
  users,
  currentUser,
  initialSelectedOrderId,
}) => {
  // Navigation / View State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => {
    if (initialSelectedOrderId && orders.some((o) => o.id === initialSelectedOrderId)) {
      return initialSelectedOrderId;
    }
    return orders.length > 0 ? orders[0].id : null;
  });
  const [viewMode, setViewMode] = useState<'details' | 'list'>('details');

  // If initialSelectedOrderId changes, update selection
  useEffect(() => {
    if (initialSelectedOrderId && orders.some((o) => o.id === initialSelectedOrderId)) {
      setSelectedOrderId(initialSelectedOrderId);
      setViewMode('details');
    }
  }, [initialSelectedOrderId, orders]);

  // Modals
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkshopOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<WorkshopOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<WorkshopOrder | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [sellerFilter, setSellerFilter] = useState<string>('TODOS');
  const [deliveryRangeFilter, setDeliveryRangeFilter] = useState<string>('TODOS');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('fechaEntrega');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Currently viewed order object
  const activeOrder = useMemo(() => {
    if (!selectedOrderId) return orders[0] || null;
    return orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  }, [orders, selectedOrderId]);

  // Metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const inProgress = orders.filter((o) => o.estado === 'EN_CONFECCION' || o.estado === 'EN_DISENO').length;
    const readyToDeliver = orders.filter((o) => o.estado === 'LISTO').length;
    const delivered = orders.filter((o) => o.estado === 'ENTREGADO').length;
    const totalPendingBalance = orders.reduce((sum, o) => sum + (o.saldoPendientePrincipal || 0), 0);

    return {
      totalOrders,
      inProgress,
      readyToDeliver,
      delivered,
      totalPendingBalance,
    };
  }, [orders]);

  // Filtered and Sorted Orders List
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return orders
      .filter((order) => {
        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchClient = order.cliente.nombre.toLowerCase().includes(q);
          const matchDoc = order.cliente.docId.toLowerCase().includes(q);
          const matchOrderNumber = order.numeroPedido.toLowerCase().includes(q);
          const matchProduct = order.items.some((it) => it.nombre.toLowerCase().includes(q));
          if (!matchClient && !matchDoc && !matchOrderNumber && !matchProduct) {
            return false;
          }
        }

        // Status
        if (statusFilter !== 'TODOS' && order.estado !== statusFilter) {
          return false;
        }

        // Seller
        if (sellerFilter !== 'TODOS' && order.vendedorId !== sellerFilter) {
          return false;
        }

        // Delivery Range
        if (deliveryRangeFilter === 'HOY') {
          if (order.fechaEstimadaEntrega !== todayStr) return false;
        } else if (deliveryRangeFilter === 'VENCIDOS') {
          if (order.fechaEstimadaEntrega >= todayStr || order.estado === 'ENTREGADO') return false;
        } else if (deliveryRangeFilter === 'PROXIMOS_3_DIAS') {
          const limitDate = new Date();
          limitDate.setDate(limitDate.getDate() + 3);
          const limitStr = limitDate.toISOString().split('T')[0];
          if (order.fechaEstimadaEntrega < todayStr || order.fechaEstimadaEntrega > limitStr) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'fechaEntrega') {
          comparison = a.fechaEstimadaEntrega.localeCompare(b.fechaEstimadaEntrega);
        } else if (sortField === 'monto') {
          comparison = a.totalPrincipal - b.totalPrincipal;
        } else if (sortField === 'cantidad') {
          const qtyA = a.items.reduce((s, i) => s + i.cantidad, 0);
          const qtyB = b.items.reduce((s, i) => s + i.cantidad, 0);
          comparison = qtyA - qtyB;
        } else if (sortField === 'cliente') {
          comparison = a.cliente.nombre.localeCompare(b.cliente.nombre);
        } else if (sortField === 'fechaCreacion') {
          comparison = a.fechaCreacion.localeCompare(b.fechaCreacion);
        } else if (sortField === 'estado') {
          comparison = a.estado.localeCompare(b.estado);
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [orders, searchTerm, statusFilter, sellerFilter, deliveryRangeFilter, sortField, sortDirection]);

  // Open WhatsApp directly
  const handleSendWhatsApp = (order: WorkshopOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const rawPhone = order.cliente.telefono.replace(/[^0-9]/g, '');
    const message = generateWorkshopWhatsAppMessage(order, company, currency);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrintClick = (order: WorkshopOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPrintingOrder(order);
  };

  const handleEditClick = (order: WorkshopOrder) => {
    setEditingOrder(order);
    setIsNewOrderModalOpen(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Banner & Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Módulo Taller & Fabricación
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Gestión de Pedidos</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Control de Pedidos y Línea de Tiempo
            </h1>
          </div>
        </div>

        {/* View mode toggle & New Order Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('details')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'details'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ficha del Pedido
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lista ({filteredOrders.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingOrder(null);
              setIsNewOrderModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Pedido</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Pedidos
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalOrders}</p>
          <span className="text-[11px] text-slate-500 font-medium">Registrados en taller</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
            En Proceso / Diseño
          </span>
          <p className="text-2xl font-black text-blue-900 mt-1">{metrics.inProgress}</p>
          <span className="text-[11px] text-blue-600 font-medium">Confección & Diseño</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Listos para Retiro
          </span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{metrics.readyToDeliver}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Esperando al cliente</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Entregados
          </span>
          <p className="text-2xl font-black text-slate-700 mt-1">{metrics.delivered}</p>
          <span className="text-[11px] text-slate-400 font-medium">Histórico finalizado</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Saldo por Cobrar
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-950 font-mono mt-1">
            {formatCurrency(metrics.totalPendingBalance, currency.monedaPrincipal)}
          </p>
          <span className="text-[10.5px] text-amber-700 font-semibold">Pendiente en entregas</span>
        </div>
      </div>

      {/* Filter and Sorting Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cédula/RIF, # de orden o producto..."
              className="w-full text-xs font-medium pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Quick Filter Status */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="EN_CONFECCION">En Confección</option>
              <option value="EN_DISENO">En Diseño</option>
              <option value="LISTO">Listo</option>
              <option value="ENTREGADO">Entregado</option>
            </select>

            {/* Seller Filter */}
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
            >
              <option value="TODOS">Todos los Vendedores</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  Vendedor: {u.nombre}
                </option>
              ))}
            </select>

            {/* Delivery Date Filter */}
            <select
              value={deliveryRangeFilter}
              onChange={(e) => setDeliveryRangeFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
            >
              <option value="TODOS">Cualquier Fecha de Entrega</option>
              <option value="HOY">Entrega Hoy</option>
              <option value="PROXIMOS_3_DIAS">Próximos 3 días</option>
              <option value="VENCIDOS">Entregas Atrasadas / Vencidas</option>
            </select>
          </div>
        </div>

        {/* Sorting Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-bold text-slate-400 uppercase text-[10px]">Organizar pedidos por:</span>
          <button
            type="button"
            onClick={() => toggleSort('fechaEntrega')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortField === 'fechaEntrega'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Fecha Entrega {sortField === 'fechaEntrega' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSort('monto')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortField === 'monto'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <DollarSign className="w-3 h-3" />
            <span>Monto $ {sortField === 'monto' ? (sortDirection === 'asc' ? 'Menor a Mayor' : 'Mayor a Menor') : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSort('cantidad')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortField === 'cantidad'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Boxes className="w-3 h-3" />
            <span>Cantidad {sortField === 'cantidad' ? (sortDirection === 'asc' ? 'Menor' : 'Mayor') : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSort('cliente')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortField === 'cliente'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Cliente {sortField === 'cliente' ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A') : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSort('fechaCreacion')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortField === 'fechaCreacion'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Recientes</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'details' && activeOrder ? (
        <div className="space-y-6">
          {/* Quick Order Switcher Carousel */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 overflow-x-auto flex items-center gap-2 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">
              Pedidos:
            </span>
            {filteredOrders.map((ord) => {
              const isSelected = ord.id === activeOrder.id;
              return (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`shrink-0 text-left px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-2xs'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900">{ord.numeroPedido}</span>
                    <span
                      className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                        ord.estado === 'LISTO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.estado === 'EN_DISENO'
                          ? 'bg-indigo-100 text-indigo-800'
                          : ord.estado === 'EN_CONFECCION'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ord.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium truncate max-w-[130px]">
                    {ord.cliente.nombre}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detailed View Matching Image */}
          <WorkshopOrderDetails
            order={activeOrder}
            company={company}
            currency={currency}
            onBack={() => setViewMode('list')}
            onUpdateStatus={onUpdateOrderStatus}
            onUpdateOrderItemStatus={onUpdateOrderItemStatus}
            onEditOrder={handleEditClick}
            onDeleteOrder={onDeleteOrder}
            onAddPayment={onAddPayment}
          />
        </div>
      ) : (
        /* Full Order List View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const isUrgent = order.prioridad === 'URGENTE';
              const isHigh = order.prioridad === 'ALTA';

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setViewMode('details');
                  }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {order.numeroPedido}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-base mt-1.5 group-hover:text-blue-600 transition-colors">
                          {order.cliente.nombre}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          order.estado === 'LISTO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.estado === 'EN_DISENO'
                            ? 'bg-indigo-100 text-indigo-800'
                            : order.estado === 'EN_CONFECCION'
                            ? 'bg-amber-100 text-amber-800'
                            : order.estado === 'ENTREGADO'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {order.estado.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 mb-3">
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.cliente.telefono}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vendedor: {order.vendedorNombre}</span>
                      </p>
                    </div>

                    {/* Delivery Date Highlight */}
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-700" />
                        <div>
                          <span className="text-[9.5px] font-black uppercase tracking-wide text-emerald-800 block leading-tight">
                            ENTREGA ESTIMADA:
                          </span>
                          <span className="text-xs font-bold text-emerald-950">
                            {formatWorkshopDeliveryDate(order.fechaEstimadaEntrega)}
                          </span>
                        </div>
                      </div>
                      {(isUrgent || isHigh) && (
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                            isUrgent ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          }`}
                        >
                          {order.prioridad}
                        </span>
                      )}
                    </div>

                    {/* Items List Preview */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-200/60 pb-1 mb-1">
                        <span className="flex items-center gap-1">
                          <Boxes className="w-3 h-3 text-slate-400" />
                          <span>Artículos ({order.items.length})</span>
                        </span>
                        <span className="text-blue-700 font-mono font-black">
                          {order.items.reduce((sum, item) => sum + item.cantidad, 0)} u. totales
                        </span>
                      </div>
                      {order.items.slice(0, 2).map((item) => {
                        const itemTheme = getWorkshopStatusTheme(item.estado || order.estado);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg border ${itemTheme.border} ${itemTheme.bgSubtle} transition-colors`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full ${itemTheme.dot} shrink-0`} />
                              <span className={`truncate max-w-[150px] font-bold ${itemTheme.text}`}>
                                {item.nombre}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${itemTheme.badge}`}>
                                {itemTheme.label.split(' ')[1] || itemTheme.label}
                              </span>
                              <span className="font-bold text-slate-800 text-[11px]">
                                x{item.cantidad}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {order.items.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-semibold block pt-0.5">
                          + {order.items.length - 2} artículo(s) más
                        </span>
                      )}
                    </div>

                    {/* Payment Status Badge on Card */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-2 text-[11px] p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="font-semibold text-slate-600">Pago:</span>
                        <span
                          className={`font-black px-2 py-0.5 rounded-md text-[10.5px] ${
                            order.saldoPendientePrincipal === 0 || order.tipoPago === 'COMPLETO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.montoAbonadoPrincipal && order.montoAbonadoPrincipal > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.saldoPendientePrincipal === 0 || order.tipoPago === 'COMPLETO'
                            ? '✓ PAGO COMPLETO'
                            : order.montoAbonadoPrincipal && order.montoAbonadoPrincipal > 0
                            ? `ABONADO: ${formatCurrency(order.montoAbonadoPrincipal, currency.monedaPrincipal)}`
                            : 'PENDIENTE DE PAGO'}
                        </span>
                      </div>
                      {order.saldoPendientePrincipal !== undefined && order.saldoPendientePrincipal > 0 && (
                        <div className="flex justify-between items-center text-[10.5px] px-2 pt-1 font-semibold text-slate-500">
                          <span>Saldo Restante:</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {formatCurrency(order.saldoPendientePrincipal, currency.monedaPrincipal)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Interactive Dataline con 5 botones */}
                    <div className="pt-1 pb-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Seguimiento (5 Botones):</span>
                        </span>
                        <span className="text-blue-700 font-black text-[11px]">
                          {order.estado.replace('_', ' ')}
                        </span>
                      </div>
                      <WorkshopDatalineBar
                        currentStatus={order.estado}
                        onSelectStep={(nextStatus) => onUpdateOrderStatus(order.id, nextStatus)}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Card Bottom: Total & Quick Action Icons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Gran Total
                      </span>
                      <span className="font-black text-slate-900 font-mono text-sm">
                        {formatCurrency(order.totalPrincipal, currency.monedaPrincipal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(order);
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Editar Pedido"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {onDeleteOrder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderToDelete(order);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar Pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleSendWhatsApp(order, e)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Enviar por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handlePrintClick(order, e)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Imprimir Orden"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setViewMode('details');
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Ver Ficha Completa"
                      >
                        <ChevronRight className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOrders.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-base">
                No se encontraron pedidos
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay ningún pedido que coincida con los filtros o el término de búsqueda actual.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('TODOS');
                  setSellerFilter('TODOS');
                  setDeliveryRangeFilter('TODOS');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Deleting Order */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ¿Eliminar este Pedido?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ¿Estás seguro de eliminar el pedido <span className="font-bold text-slate-800">{orderToDelete.numeroPedido}</span> de <span className="font-bold text-slate-800">{orderToDelete.cliente.nombre}</span>? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOrder) onDeleteOrder(orderToDelete.id);
                  if (selectedOrderId === orderToDelete.id) {
                    setSelectedOrderId(null);
                  }
                  setOrderToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Order Modal */}
      <WorkshopNewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => {
          setIsNewOrderModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={(order) => {
          onSaveOrder(order);
          setSelectedOrderId(order.id);
          setViewMode('details');
        }}
        clients={clients}
        products={products}
        users={users}
        currentUser={currentUser}
        currency={currency}
        initialOrder={editingOrder}
      />

      {/* Print Modal */}
      {printingOrder && (
        <WorkshopPrintModal
          order={printingOrder}
          company={company}
          currency={currency}
          isOpen={!!printingOrder}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
};
