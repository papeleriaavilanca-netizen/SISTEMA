import React, { useState } from 'react';
import {
  X,
  Printer,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { WorkshopOrder, CompanyConfig, CurrencyConfig } from '../types';
import {
  formatCurrency,
  formatWorkshopDateShort,
  formatWorkshopDeliveryDate,
} from '../utils/formatters';

interface WorkshopPrintModalProps {
  order: WorkshopOrder;
  company: CompanyConfig;
  currency: CurrencyConfig;
  isOpen: boolean;
  onClose: () => void;
  defaultFormat?: 'factura' | 'orden';
}

export const WorkshopPrintModal: React.FC<WorkshopPrintModalProps> = ({
  order,
  company,
  currency,
  isOpen,
  onClose,
  defaultFormat = 'factura',
}) => {
  const [printFormat, setPrintFormat] = useState<'factura' | 'orden'>(defaultFormat);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {printFormat === 'factura' ? 'Factura Fiscal de Venta' : 'Orden de Pedido y Taller'}
              </h3>
              <p className="text-xs text-slate-500">
                Documento: <span className="font-mono font-bold text-blue-700">{order.numeroPedido}</span>
              </p>
            </div>
          </div>

          {/* Selector de Formato de Impresión */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setPrintFormat('factura')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                printFormat === 'factura'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Factura / Ticket
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('orden')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                printFormat === 'orden'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Orden de Taller
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Imprimir {printFormat === 'factura' ? 'Factura' : 'Orden'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Order Sheet */}
        <div className="p-8 sm:p-10 text-slate-800 font-sans text-xs sm:text-sm bg-white print:p-0 print:m-0 print:text-black">
          {/* Company Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-800">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {company.nombre}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                RIF: <span className="font-bold">{company.rif}</span> | NIT:{' '}
                <span className="font-bold">{company.nit}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {company.direccion}
              </p>
              <p className="text-xs text-slate-500">
                Teléfono: <span className="font-semibold">{company.telefono}</span>
                {company.email && ` | Email: ${company.email}`}
              </p>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl p-3 sm:min-w-[200px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                {printFormat === 'factura' ? 'FACTURA DE VENTA / PEDIDO' : 'ORDEN DE PEDIDO / TALLER'}
              </span>
              <span className="text-xl font-black text-blue-700 font-mono tracking-tight block my-0.5">
                {order.numeroPedido}
              </span>
              <span className="inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-100 text-blue-800 uppercase">
                {order.estado.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Dates and Participants Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
            {/* Client Info */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Datos del Cliente
              </span>
              <p className="font-bold text-slate-900 text-sm">{order.cliente.nombre}</p>
              <p className="text-slate-600">Doc / RIF: <span className="font-semibold">{order.cliente.docId}</span></p>
              <p className="text-slate-600">Teléfono: <span className="font-semibold">{order.cliente.telefono}</span></p>
              {order.cliente.direccion && (
                <p className="text-slate-500 text-[11px] mt-1">{order.cliente.direccion}</p>
              )}
            </div>

            {/* Dates & Seller */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Control de Entrega y Venta
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10.5px] text-slate-500 block">Fecha Compra:</span>
                  <span className="font-bold text-slate-800">
                    {formatWorkshopDateShort(order.fechaCreacion)}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg">
                  <span className="text-[9.5px] font-black text-emerald-700 uppercase tracking-wide block">
                    ENTREGA ESTIMADA:
                  </span>
                  <span className="font-extrabold text-emerald-900 text-xs">
                    {formatWorkshopDeliveryDate(order.fechaEstimadaEntrega)}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Vendedor:</span>
                <span className="font-bold text-slate-800">{order.vendedorNombre}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Resumen del Pedido / Especificaciones de Confección
            </h4>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-3">Producto / Especificación</th>
                  <th className="py-2 px-3 text-center w-16">Cant.</th>
                  <th className="py-2 px-3 text-right w-24">P. Unitario</th>
                  <th className="py-2 px-3 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="text-xs">
                    <td className="py-2 px-2 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-bold text-slate-900">{item.nombre}</p>
                      {item.tallaOColor && (
                        <p className="text-[11px] text-blue-700 font-medium">
                          • {item.tallaOColor}
                        </p>
                      )}
                      {item.notas && (
                        <p className="text-[10px] text-slate-500 italic">
                          Nota: {item.notas}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-800">
                      {item.cantidad}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 font-mono">
                      {formatCurrency(item.precioUnitario, currency.monedaPrincipal)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(item.total, currency.monedaPrincipal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Advance Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 pb-6 border-t border-slate-200">
            {/* Workshop Notes */}
            <div className="w-full sm:w-1/2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">
                Instrucciones / Observaciones del Taller:
              </span>
              <p className="text-slate-600 text-[11px] italic">
                {order.notasTaller || 'Sin observaciones adicionales registradas para confección.'}
              </p>
              <div className="mt-2 text-[10px] text-slate-400">
                Tasa de Cambio Aplicada:{' '}
                <span className="font-semibold text-slate-600">
                  {order.tasaCambioAplicada.toFixed(2)} {currency.monedaReferencia.codigo}/
                  {currency.monedaPrincipal.codigo}
                </span>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="w-full sm:w-2/5 space-y-1.5 text-xs text-right">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatCurrency(order.subtotalPrincipal, currency.monedaPrincipal)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b-2 border-slate-800 bg-slate-100/80 px-2 rounded-lg">
                <span className="font-black text-slate-900 text-sm">GRAN TOTAL:</span>
                <div className="text-right">
                  <span className="font-black text-blue-700 text-base font-mono block">
                    {formatCurrency(order.totalPrincipal, currency.monedaPrincipal)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 font-mono">
                    {formatCurrency(order.totalReferencia, currency.monedaReferencia)}
                  </span>
                </div>
              </div>

              {order.montoAbonadoPrincipal !== undefined && (
                <>
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span className="font-semibold">Monto Abonado:</span>
                    <span className="font-bold font-mono">
                      {formatCurrency(order.montoAbonadoPrincipal, currency.monedaPrincipal)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-700 font-bold bg-rose-50 px-2 rounded">
                    <span>Saldo Restante por Pagar:</span>
                    <span className="font-mono">
                      {formatCurrency(order.saldoPendientePrincipal || 0, currency.monedaPrincipal)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Signatures Section for Physical Workshop Delivery */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-dashed border-slate-300 text-center text-xs text-slate-500">
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-1 h-12" />
              <p className="font-bold text-slate-800">Firma y Sello del Taller</p>
              <p className="text-[10px]">Responsable de Producción / Entrega</p>
            </div>
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-1 h-12" />
              <p className="font-bold text-slate-800">Recibido Conforme (Cliente)</p>
              <p className="text-[10px]">C.I. / Firma al retirar el pedido</p>
            </div>
          </div>

          {/* Barcode Mock */}
          <div className="mt-8 text-center border-t border-slate-200 pt-4">
            <div className="font-mono tracking-widest text-slate-800 font-bold text-sm select-none">
              ||| | |||| ||| || ||||| | ||| |||| | ||
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              ID CONTROL INTERNO: {order.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
