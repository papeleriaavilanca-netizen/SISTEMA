import React from 'react';
import { CartItem, CompanyConfig, CurrencyConfig, ClientData } from '../types';
import { formatCurrency, convertToRef } from '../utils/formatters';

interface LiveTicketProps {
  ticketNumber: string;
  date: Date;
  vendorName: string;
  client?: ClientData;
  items: CartItem[];
  subtotalPrincipal: number;
  impuestosPrincipal: number;
  totalPrincipal: number;
  subtotalReferencia: number;
  impuestosReferencia: number;
  totalReferencia: number;
  company: CompanyConfig;
  currency: CurrencyConfig;
  className?: string;
  id?: string;
}

export const LiveTicket: React.FC<LiveTicketProps> = ({
  ticketNumber,
  date,
  vendorName,
  client,
  items,
  subtotalPrincipal,
  impuestosPrincipal,
  totalPrincipal,
  subtotalReferencia,
  impuestosReferencia,
  totalReferencia,
  company,
  currency,
  className = '',
  id = 'thermal-receipt',
}) => {
  return (
    <div
      id={id}
      className={`w-full bg-white text-neutral-900 p-4 sm:p-5 font-mono text-[11px] leading-snug border border-neutral-200 shadow-sm rounded-lg ${className}`}
    >
      {/* Header Fiscal de la Empresa */}
      <div className="text-center pb-2.5 border-b border-dashed border-neutral-400">
        <h1 className="font-bold text-xs uppercase tracking-wider text-neutral-900">{company.nombre}</h1>
        <p className="text-[10px] text-neutral-600 mt-0.5">
          <strong>RIF:</strong> {company.rif} | <strong>NIT:</strong> {company.nit}
        </p>
        {company.direccion && (
          <p className="text-[9.5px] text-neutral-500 mt-0.5 leading-tight">{company.direccion}</p>
        )}
        {company.telefono && (
          <p className="text-[9.5px] text-neutral-500 mt-0.5">Tel: {company.telefono}</p>
        )}
      </div>

      {/* Datos del Ticket y Operación */}
      <div className="py-2 border-b border-dashed border-neutral-400 text-[10px] space-y-0.5">
        <div className="flex justify-between font-bold text-neutral-900">
          <span>TICKET PRE-FACTURA:</span>
          <span>#{ticketNumber}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>FECHA / HORA:</span>
          <span>{date.toLocaleString('es-VE')}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>VENDEDOR:</span>
          <span className="font-semibold text-neutral-800">{vendorName}</span>
        </div>
        {client?.nombre && (
          <div className="pt-1 text-[10px] border-t border-dotted border-neutral-300 mt-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">CLIENTE:</span>
              <span className="font-bold text-neutral-900 text-right truncate max-w-[170px]">{client.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">DOC / RIF:</span>
              <span className="font-mono text-neutral-800">{client.docId}</span>
            </div>
            {client.telefono && (
              <div className="flex justify-between">
                <span className="text-neutral-500">TELÉFONO:</span>
                <span className="font-mono text-emerald-700 font-semibold">{client.telefono}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Encabezado Tabla */}
      <div className="pt-2 text-[9.5px] uppercase font-bold grid grid-cols-12 pb-1 border-b border-neutral-300 text-neutral-700">
        <span className="col-span-6">DESCRIPCIÓN</span>
        <span className="col-span-2 text-center">CANT</span>
        <span className="col-span-4 text-right">TOTAL ({currency.monedaPrincipal.simbolo})</span>
      </div>

      {/* Items List */}
      <div className="py-1.5 divide-y divide-dashed divide-neutral-200">
        {items.length === 0 ? (
          <div className="py-4 text-center text-neutral-400 italic text-[10px]">
            [ Carrito sin productos agregados ]
          </div>
        ) : (
          items.map((item, idx) => {
            const itemTotalRef = convertToRef(item.total, currency.tasaCambio);
            const itemName = item.variante
              ? `${item.producto.nombre} [${item.variante.nombre}]`
              : item.producto.nombre;

            return (
              <div key={idx} className="py-1 text-[10px]">
                <div className="font-semibold text-neutral-900 leading-tight">
                  {itemName}
                </div>
                <div className="grid grid-cols-12 text-[9.5px] text-neutral-600 pt-0.5">
                  <span className="col-span-6 text-neutral-500 truncate">
                    {formatCurrency(item.precioUnitario, currency.monedaPrincipal)} c/u
                    {item.descuentoPorcentaje > 0 && ` (-${item.descuentoPorcentaje}%)`}
                  </span>
                  <span className="col-span-2 text-center font-bold text-neutral-800">{item.cantidad}</span>
                  <span className="col-span-4 text-right font-bold text-neutral-900">
                    {formatCurrency(item.total, currency.monedaPrincipal)}
                  </span>
                </div>
                <div className="text-right text-[8.5px] text-neutral-400">
                  Ref: {formatCurrency(itemTotalRef, currency.monedaReferencia)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals Breakdown */}
      <div className="pt-2 border-t border-dashed border-neutral-400 space-y-1 text-[10.5px]">
        <div className="flex justify-between text-neutral-600">
          <span>SUBTOTAL:</span>
          <span className="font-semibold">{formatCurrency(subtotalPrincipal, currency.monedaPrincipal)}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>IVA / IMPUESTOS:</span>
          <span className="font-semibold">{formatCurrency(impuestosPrincipal, currency.monedaPrincipal)}</span>
        </div>

        {/* DUAL CURRENCY HIGHLIGHT */}
        <div className="bg-neutral-100 p-2 rounded my-1 border border-neutral-300">
          <div className="flex justify-between font-bold text-xs text-neutral-900">
            <span>TOTAL ({currency.monedaPrincipal.codigo}):</span>
            <span className="text-sm">{formatCurrency(totalPrincipal, currency.monedaPrincipal)}</span>
          </div>
          <div className="flex justify-between font-bold text-[11px] text-neutral-800 mt-0.5">
            <span>TOTAL ({currency.monedaReferencia.codigo}):</span>
            <span>{formatCurrency(totalReferencia, currency.monedaReferencia)}</span>
          </div>
          <div className="text-[8.5px] text-neutral-500 text-right mt-1">
            Tasa: 1 {currency.monedaPrincipal.codigo} = {currency.tasaCambio.toFixed(2)} {currency.monedaReferencia.codigo}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-3 mt-2 border-t border-dashed border-neutral-400 text-[9.5px] text-neutral-500 space-y-0.5">
        {company.mensajePieTicket && (
          <p className="font-medium italic">{company.mensajePieTicket}</p>
        )}
        <p className="text-[8.5px] text-neutral-400">*** SISTEMA TPV FISCAL SEGURO ***</p>
      </div>
    </div>
  );
};
