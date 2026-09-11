import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Calendar,
  User,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  FileCheck,
  AlertCircle,
  Edit3,
  CheckCircle2,
  Package,
  Truck,
  Sparkles,
  Trash2,
  DollarSign,
  PlusCircle,
  Check,
  History,
  FileText,
} from 'lucide-react';
import {
  WorkshopOrder,
  WorkshopOrderStatus,
  CompanyConfig,
  CurrencyConfig,
} from '../types';
import {
  formatCurrency,
  formatWorkshopDateShort,
  formatWorkshopDeliveryDate,
  generateWorkshopWhatsAppMessage,
} from '../utils/formatters';
import { WorkshopTimeline, WORKSHOP_STEPS, normalizeWorkshopStatus, getWorkshopStatusTheme } from './WorkshopTimeline';
import { WorkshopPrintModal } from './WorkshopPrintModal';

interface WorkshopOrderDetailsProps {
  order: WorkshopOrder;
  company: CompanyConfig;
  currency: CurrencyConfig;
  onBack: () => void;
  onUpdateStatus: (orderId: string, newStatus: WorkshopOrderStatus, note?: string) => void;
  onUpdateOrderItemStatus?: (orderId: string, itemId: string, newStatus: WorkshopOrderStatus) => void;
  onEditOrder?: (order: WorkshopOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onAddPayment?: (orderId: string, amount: number, method: string, note?: string) => void;
}

export const WorkshopOrderDetails: React.FC<WorkshopOrderDetailsProps> = ({
  order,
  company,
  currency,
  onBack,
  onUpdateStatus,
  onUpdateOrderItemStatus,
  onEditOrder,
  onDeleteOrder,
  onAddPayment,
}) => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalFormat, setPrintModalFormat] = useState<'factura' | 'orden'>('factura');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatusToAdvance, setSelectedStatusToAdvance] = useState<WorkshopOrderStatus>(order.estado);
  const [statusCustomNote, setStatusCustomNote] = useState('');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(order.saldoPendientePrincipal || 0);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo USD');
  const [paymentNote, setPaymentNote] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Handle WhatsApp direct click
  const handleOpenWhatsApp = () => {
    const rawPhone = order.cliente.telefono.replace(/[^0-9]/g, '');
    const message = generateWorkshopWhatsAppMessage(order, company, currency);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTimelineStepClick = (stepKey: WorkshopOrderStatus) => {
    setSelectedStatusToAdvance(stepKey);
    setStatusCustomNote('');
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = () => {
    onUpdateStatus(order.id, selectedStatusToAdvance, statusCustomNote.trim() || undefined);
    setShowStatusModal(false);
    setStatusCustomNote('');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;
    if (onAddPayment) {
      onAddPayment(order.id, paymentAmount, paymentMethod, paymentNote.trim() || undefined);
    }
    setShowPaymentModal(false);
    setPaymentNote('');
  };

  const handleConfirmDelete = () => {
    if (onDeleteOrder) {
      onDeleteOrder(order.id);
    }
    setShowDeleteModal(false);
  };

  const normalizedCurrent = normalizeWorkshopStatus(order.estado);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Volver a la lista de pedidos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Detalles del Pedido
              </span>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                  normalizedCurrent === 'ACEPTADO'
                    ? 'bg-blue-100 text-blue-700'
                    : normalizedCurrent === 'EN_CONFECCION'
                    ? 'bg-amber-100 text-amber-800'
                    : normalizedCurrent === 'EN_DISENO'
                    ? 'bg-indigo-100 text-indigo-800'
                    : normalizedCurrent === 'LISTO'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {normalizedCurrent.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Detalles del Pedido de {order.cliente.nombre}
            </h1>
          </div>
        </div>

        {/* Action Buttons: WhatsApp, Print, Edit, Delete */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            title="Enviar detalle y estado actual por WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Enviar por WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrintModalFormat('factura');
              setIsPrintModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            title="Ver e imprimir factura fiscal con desglose, IVA y abonos"
          >
            <FileText className="w-4 h-4" />
            <span>Factura Fiscal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrintModalFormat('orden');
              setIsPrintModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            title="Imprimir ficha de taller y confección"
          >
            <Printer className="w-4 h-4" />
            <span>Orden Taller</span>
          </button>

          {onEditOrder && (
            <button
              type="button"
              onClick={() => onEditOrder(order)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm rounded-xl border border-blue-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar</span>
            </button>
          )}

          {onDeleteOrder && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs sm:text-sm rounded-xl border border-rose-200 transition-colors cursor-pointer"
              title="Eliminar Pedido"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Information Cards - Matching Reference Image */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: ID del Pedido */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500">ID del Pedido:</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-1">
            {order.numeroPedido}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Prioridad: <span className="font-bold text-slate-700 uppercase">{order.prioridad || 'NORMAL'}</span>
          </p>
        </div>

        {/* Card 2: Fecha de Compra */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500">Fecha de Compra:</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {formatWorkshopDateShort(order.fechaCreacion)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Atendido por: <span className="font-bold text-slate-700">{order.vendedorNombre}</span>
          </p>
        </div>

        {/* Card 3: FECHA ESTIMADA DE ENTREGA (Green Highlighted box as in image) */}
        <div className="bg-emerald-50/70 rounded-2xl p-5 border border-emerald-300/80 shadow-xs flex flex-col justify-center relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              FECHA ESTIMADA DE ENTREGA:
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight">
            {formatWorkshopDeliveryDate(order.fechaEstimadaEntrega)}
          </p>
          {order.fechaEntregaReal && (
            <span className="text-[11px] font-bold text-emerald-700 mt-1">
              Entregado el: {formatWorkshopDateShort(order.fechaEntregaReal)}
            </span>
          )}
        </div>
      </div>

      {/* Customer & Seller Info Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-start gap-2.5">
          <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-400 text-[11px] font-bold uppercase block">Cliente</span>
            <span className="font-bold text-slate-900">{order.cliente.nombre}</span>
            <span className="text-slate-500 block text-xs">Doc: {order.cliente.docId}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-400 text-[11px] font-bold uppercase block">Contacto</span>
            <span className="font-bold text-slate-900">{order.cliente.telefono}</span>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1 mt-0.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Abrir chat
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-400 text-[11px] font-bold uppercase block">Dirección / Entrega</span>
            <span className="text-slate-700 text-xs">
              {order.cliente.direccion || 'Retiro directo en mostrador del taller'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Horizontal Timeline Progress Bar */}
      <WorkshopTimeline
        currentStatus={order.estado}
        timeline={order.timeline}
        onSelectStep={handleTimelineStepClick}
        interactive={true}
      />

      {/* Resumen del Pedido Table - Con Coloración Dinámica por Estado de Dataline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Resumen de Artículos y Estado del Producto</span>
              <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cada producto se colorea según su estado en el dataline interactivo de 5 etapas.
            </p>
          </div>

          {/* Guía de Colores según Dataline */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
              1- Azul: Aceptado
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
              2- Ámbar: Confección
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
              3- Púrpura: Diseño
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              4- Verde: Listo
            </span>
            <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
              5- Teal: Entregado
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-6">Producto y Estado</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-6 text-right">Precio Unitario</th>
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-xs sm:text-sm">
              {order.items.map((item) => {
                const itemStatus = item.estado || order.estado;
                const itemTheme = getWorkshopStatusTheme(itemStatus);

                return (
                  <tr
                    key={item.id}
                    className={`border-l-4 ${itemTheme.borderAccent} ${itemTheme.bgSubtle} transition-all hover:brightness-[0.98]`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${itemTheme.badge} shadow-2xs font-bold`}
                          title={`Estado: ${itemTheme.label} (${itemTheme.colorName})`}
                        >
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className={`font-black text-sm ${itemTheme.text}`}>
                            {item.nombre}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {/* Color-coded Product Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider ${itemTheme.badge} shadow-2xs`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              {itemTheme.label}
                            </span>

                            <span className="text-[10.5px] font-bold text-slate-500">
                              (Color: {itemTheme.colorName})
                            </span>

                            {item.tallaOColor && (
                              <span className="inline-block text-[11px] font-bold text-slate-700 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                                {item.tallaOColor}
                              </span>
                            )}
                          </div>

                          {/* Individual Item Status Changer (If Granular Control Desired) */}
                          {onUpdateOrderItemStatus && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[10px] font-semibold text-slate-500">
                                Estado individual:
                              </span>
                              <select
                                value={itemStatus}
                                onChange={(e) =>
                                  onUpdateOrderItemStatus(
                                    order.id,
                                    item.id,
                                    e.target.value as WorkshopOrderStatus
                                  )
                                }
                                className="text-[10.5px] font-bold bg-white border border-slate-300 rounded-md px-2 py-0.5 text-slate-700 cursor-pointer focus:ring-1 focus:ring-blue-500"
                              >
                                {WORKSHOP_STEPS.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {item.notas && (
                            <p className="text-[11px] text-slate-600 mt-1 italic">
                              Nota: {item.notas}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-slate-800 text-sm">
                      <span className="inline-block bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-black">
                        {item.cantidad}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-semibold text-slate-700 font-mono">
                      {formatCurrency(item.precioUnitario, currency.monedaPrincipal)}
                    </td>

                    <td className="py-4 px-6 text-right font-black text-slate-900 font-mono text-sm">
                      {formatCurrency(item.total, currency.monedaPrincipal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Gran Total Bar - Matching Image */}
        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            {order.notasTaller && (
              <p className="max-w-md">
                <span className="font-bold text-slate-800">Observación Taller: </span>
                {order.notasTaller}
              </p>
            )}
          </div>

          <div className="flex items-baseline gap-6 w-full sm:w-auto justify-end">
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Gran Total
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(order.totalPrincipal, currency.monedaPrincipal)}
              </span>
              <span className="block text-xs font-bold text-slate-500 font-mono mt-0.5">
                ≈ {formatCurrency(order.totalReferencia, currency.monedaReferencia)}
              </span>
            </div>
          </div>
        </div>

        {/* Advance, Balance & Payment Actions */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50/50 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Condición de Pago:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${
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
                    ? 'PAGO PARCIAL / ABONADO'
                    : 'PENDIENTE DE PAGO'}
                </span>
              </div>

              {order.montoAbonadoPrincipal !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">Total Abonado:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {formatCurrency(order.montoAbonadoPrincipal, currency.monedaPrincipal)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Saldo Pendiente:</span>
                <span
                  className={`font-black font-mono text-sm ${
                    order.saldoPendientePrincipal && order.saldoPendientePrincipal > 0
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(order.saldoPendientePrincipal || 0, currency.monedaPrincipal)}
                </span>
              </div>
            </div>

            {onAddPayment && (order.saldoPendientePrincipal || 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPaymentAmount(order.saldoPendientePrincipal || 0);
                  setShowPaymentModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Abono / Pago</span>
              </button>
            )}
          </div>

          {/* Payment History List if available */}
          {order.historialAbonos && order.historialAbonos.length > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-2 text-slate-700 font-bold text-xs">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Historial de Abonos y Pagos Registrados ({order.historialAbonos.length}):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {order.historialAbonos.map((abono, idx) => (
                  <div
                    key={abono.id || idx}
                    className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-[11px]"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-emerald-700 font-mono text-xs">
                        +{formatCurrency(abono.monto, currency.monedaPrincipal)}
                      </span>
                      <span className="text-slate-400 font-normal text-[10px]">
                        {formatWorkshopDateShort(abono.fecha)}
                      </span>
                    </div>
                    <div className="text-slate-600 font-medium mt-0.5">
                      Método: <span className="font-bold text-slate-800">{abono.metodoPago}</span>
                    </div>
                    {abono.notas && (
                      <div className="text-slate-500 italic text-[10px] mt-0.5">
                        {abono.notas}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Advance State Bar with the 5 explicit interactive buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Seguimiento Interactivo de Taller (5 Pasos)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Haz clic en cualquiera de los 5 estados para avanzar o retroceder el pedido y notificar al cliente.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full md:w-auto">
          {WORKSHOP_STEPS.map((step) => {
            const isCurrent = step.key === normalizedCurrent;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => handleTimelineStepClick(step.key)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-400/50'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                }`}
              >
                {step.stepNumber}- {step.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal for Registering a Payment / Abono */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Registrar Abono o Pago
                </h3>
                <p className="text-xs text-slate-500">
                  Pedido {order.numeroPedido} - {order.cliente.nombre}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monto a Abonar ($):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={order.saldoPendientePrincipal || order.totalPrincipal}
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full pl-8 pr-3 py-2 text-sm font-black bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] mt-1 text-slate-500">
                  <span>Saldo actual pendiente:</span>
                  <span className="font-bold text-rose-600 font-mono">
                    {formatCurrency(order.saldoPendientePrincipal || 0, currency.monedaPrincipal)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Método de Pago:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:bg-white"
                >
                  <option value="Efectivo USD">Efectivo USD ($)</option>
                  <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                  <option value="Punto de Venta / Débito">Punto de Venta / Débito</option>
                  <option value="Efectivo Bs">Efectivo Bs</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nota o Referencia (Opcional):
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ej: Pago Móvil ref #4892..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Deleting Order Confirmation */}
      {showDeleteModal && (
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
                ¿Estás seguro de eliminar el pedido <span className="font-bold text-slate-800">{order.numeroPedido}</span> de <span className="font-bold text-slate-800">{order.cliente.nombre}</span>? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Updating Status Note */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Actualizar Estado del Pedido
            </h3>
            <p className="text-xs text-slate-600">
              Cambiarás el estado a:{' '}
              <span className="font-bold text-blue-600">
                {selectedStatusToAdvance.replace('_', ' ')}
              </span>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nota o Subtexto de Seguimiento (Opcional):
              </label>
              <textarea
                value={statusCustomNote}
                onChange={(e) => setStatusCustomNote(e.target.value)}
                placeholder="Ej: 7 sep, 08:00 AM - Paquete salió del centro de distribución local..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmStatusUpdate}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
              >
                Confirmar Cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      <WorkshopPrintModal
        order={order}
        company={company}
        currency={currency}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultFormat={printModalFormat}
      />
    </div>
  );
};
