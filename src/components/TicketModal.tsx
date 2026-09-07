import React, { useState, useEffect } from 'react';
import { Sale, CompanyConfig, CurrencyConfig } from '../types';
import { formatCurrency, generateWhatsAppMessage } from '../utils/formatters';
import { Printer, MessageSquare, X, CheckCircle2, Share2, Copy, Check, ExternalLink } from 'lucide-react';

interface TicketModalProps {
  sale: Sale;
  company: CompanyConfig;
  currency: CurrencyConfig;
  initialAction?: 'print' | 'whatsapp' | 'none';
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  sale,
  company,
  currency,
  initialAction = 'none',
  onClose,
}) => {
  const [whatsappPhone, setWhatsappPhone] = useState(sale.cliente?.telefono || '');
  const [copied, setCopied] = useState(false);

  // Clean phone number for WhatsApp with intelligent country code handling
  const formatPhoneForWhatsApp = (phone: string): string => {
    let digits = phone.replace(/[^0-9]/g, '');
    if (!digits) return '';
    // If Venezuelan local number starting with 0 (e.g. 0412, 0414, 0424, 0416, 0426, 0212), replace 0 with 58
    if (digits.startsWith('0')) {
      digits = '58' + digits.substring(1);
    } else if (digits.length === 10 && (digits.startsWith('4') || digits.startsWith('2'))) {
      digits = '58' + digits;
    }
    return digits;
  };

  const cleanPhone = formatPhoneForWhatsApp(whatsappPhone);
  const encodedMessage = generateWhatsAppMessage(sale, company, currency);
  const waUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;

  useEffect(() => {
    if (initialAction === 'print') {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    } else if (initialAction === 'whatsapp' && cleanPhone) {
      const timer = setTimeout(() => {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [initialAction]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyText = () => {
    const rawMsg = decodeURIComponent(generateWhatsAppMessage(sale, company, currency));
    navigator.clipboard.writeText(rawMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Styles for print mode */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            margin: 0;
            box-shadow: none;
            border: none;
            background: #fff;
            color: #000;
            font-size: 11px;
            font-family: monospace;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden print:border-none print:shadow-none print:bg-white print:max-h-none print:w-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 no-print">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <span className="font-bold text-slate-900 block leading-tight">Venta #{sale.numeroTicket} Procesada</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Vendedor: <strong className="text-slate-700">{sale.vendedorNombre}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls (Top Bar) */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 space-y-3 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Direct Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-98"
              title="Imprimir ticket térmico"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Factura / Ticket</span>
            </button>

            {/* Direct WhatsApp Button / Link */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-98"
              title="Enviar ticket por WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>

          {/* WhatsApp Phone Quick Editor & Copy Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Teléfono / WhatsApp cliente (ej: 04141234567)"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full shadow-xs"
              />
              {cleanPhone && (
                <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-mono font-semibold">
                  +{cleanPhone}
                </span>
              )}
            </div>

            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition flex-shrink-0"
              title="Copiar texto formateado de la factura"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Ticket Body (Scrollable preview & Print container) */}
        <div className="overflow-y-auto p-6 flex justify-center bg-slate-100/70">
          <div
            id="thermal-receipt"
            className="w-full max-w-[340px] bg-white text-neutral-900 p-5 rounded-md shadow-md font-mono text-[12px] leading-snug border border-neutral-200"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-neutral-400">
              <h1 className="font-bold text-sm uppercase tracking-wide">{company.nombre}</h1>
              <p className="text-[11px] text-neutral-700 mt-0.5">
                <strong>RIF:</strong> {company.rif} | <strong>NIT:</strong> {company.nit}
              </p>
              <p className="text-[10px] text-neutral-600 mt-1 leading-tight">{company.direccion}</p>
              <p className="text-[10px] text-neutral-600 mt-0.5">Tel: {company.telefono}</p>
              {company.redesSociales?.instagram && (
                <p className="text-[9px] text-neutral-500">IG: {company.redesSociales.instagram}</p>
              )}
            </div>

            {/* Ticket Info */}
            <div className="py-2.5 border-b border-dashed border-neutral-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>TICKET DE VENTA:</span>
                <span className="font-bold">{sale.numeroTicket}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>FECHA / HORA:</span>
                <span>{new Date(sale.fecha).toLocaleString('es-VE')}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>CAJERO / VENDEDOR:</span>
                <span className="font-semibold text-neutral-900">{sale.vendedorNombre}</span>
              </div>
              {sale.cliente?.nombre && (
                <div className="pt-1 text-[11px] border-t border-dotted border-neutral-300">
                  <div><strong>CLIENTE:</strong> {sale.cliente.nombre}</div>
                  <div><strong>DOC ID:</strong> {sale.cliente.docId}</div>
                  {sale.cliente.telefono && <div><strong>TEL / WA:</strong> {sale.cliente.telefono}</div>}
                  {sale.cliente.direccion && <div><strong>DIR:</strong> {sale.cliente.direccion}</div>}
                </div>
              )}
            </div>

            {/* Table Items Header */}
            <div className="pt-2 text-[10px] uppercase font-bold grid grid-cols-12 pb-1 border-b border-neutral-300">
              <span className="col-span-6">DESCRIPCIÓN</span>
              <span className="col-span-2 text-center">CANT</span>
              <span className="col-span-4 text-right">TOTAL ({currency.monedaPrincipal.simbolo})</span>
            </div>

            {/* Items List */}
            <div className="py-2 divide-y divide-dashed divide-neutral-200">
              {sale.items.map((item, idx) => {
                const itemTotalRef = item.total * sale.tasaCambioAplicada;
                return (
                  <div key={idx} className="py-1 text-[11px]">
                    <div className="font-medium text-neutral-900">
                      {item.producto.nombre}
                      {item.variante && (
                        <span className="text-[10px] text-neutral-600 font-normal ml-1">
                          [{item.variante.nombre}]
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-12 text-[10px] text-neutral-600 pt-0.5">
                      <span className="col-span-6 text-neutral-500">
                        P.Unit: {formatCurrency(item.precioUnitario, currency.monedaPrincipal)}
                        {item.descuentoPorcentaje > 0 && ` (-${item.descuentoPorcentaje}%)`}
                      </span>
                      <span className="col-span-2 text-center">{item.cantidad}</span>
                      <span className="col-span-4 text-right font-medium text-neutral-900">
                        {formatCurrency(item.total, currency.monedaPrincipal)}
                      </span>
                    </div>
                    <div className="text-right text-[9px] text-neutral-500">
                      Ref: {formatCurrency(itemTotalRef, currency.monedaReferencia)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Breakdown */}
            <div className="pt-2 border-t border-dashed border-neutral-400 space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-700">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(sale.subtotalPrincipal, currency.monedaPrincipal)}</span>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>IVA / IMPUESTOS:</span>
                <span>{formatCurrency(sale.impuestosPrincipal, currency.monedaPrincipal)}</span>
              </div>

              {/* DUAL CURRENCY HIGHLIGHT */}
              <div className="bg-neutral-100 p-2 rounded my-1 border border-neutral-300">
                <div className="flex justify-between font-bold text-sm text-neutral-900">
                  <span>TOTAL ({currency.monedaPrincipal.codigo}):</span>
                  <span>{formatCurrency(sale.totalPrincipal, currency.monedaPrincipal)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-neutral-800 mt-0.5">
                  <span>TOTAL ({currency.monedaReferencia.codigo}):</span>
                  <span>{formatCurrency(sale.totalReferencia, currency.monedaReferencia)}</span>
                </div>
                <div className="text-[9.5px] text-neutral-500 text-right mt-1">
                  Tasa de cambio: 1 {currency.monedaPrincipal.codigo} = {sale.tasaCambioAplicada.toFixed(2)} {currency.monedaReferencia.codigo}
                </div>
              </div>

              {/* Payment Details */}
              <div className="pt-1.5 border-t border-neutral-200 text-[10.5px] space-y-0.5">
                <div className="flex justify-between">
                  <span>FORMA DE PAGO:</span>
                  <span className="font-semibold">{sale.pago.metodo.replace(/_/g, ' ')}</span>
                </div>
                {sale.pago.montoPagadoPrincipal > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>PAGADO ({currency.monedaPrincipal.codigo}):</span>
                    <span>{formatCurrency(sale.pago.montoPagadoPrincipal, currency.monedaPrincipal)}</span>
                  </div>
                )}
                {sale.pago.montoPagadoReferencia > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>PAGADO ({currency.monedaReferencia.codigo}):</span>
                    <span>{formatCurrency(sale.pago.montoPagadoReferencia, currency.monedaReferencia)}</span>
                  </div>
                )}
                {(sale.pago.cambioPrincipal > 0 || sale.pago.cambioReferencia > 0) && (
                  <div className="flex justify-between font-bold text-emerald-700 pt-0.5">
                    <span>CAMBIO / VUELTO:</span>
                    <span>
                      {formatCurrency(sale.pago.cambioPrincipal, currency.monedaPrincipal)} /{' '}
                      {formatCurrency(sale.pago.cambioReferencia, currency.monedaReferencia)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 mt-3 border-t border-dashed border-neutral-400 text-[10px] text-neutral-600 space-y-1">
              <p className="font-semibold italic">{company.mensajePieTicket}</p>
              <p className="text-[9px] text-neutral-400">*** SISTEMA TPV FISCAL SEGURO ***</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition"
          >
            Cerrar & Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
};
