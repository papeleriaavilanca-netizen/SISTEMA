import { CurrencyConfig, CompanyConfig, Sale, Tax } from '../types';

export function formatCurrency(
  amount: number,
  currency: { simbolo: string; codigo: string; decimales: number },
  showCode: boolean = false
): string {
  const decimals = currency.decimales ?? 2;
  const formatted = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount || 0);

  return showCode ? `${currency.simbolo} ${formatted} ${currency.codigo}` : `${currency.simbolo} ${formatted}`;
}

export function calculateProfitMargin(cost: number, price: number): number {
  if (!cost || cost <= 0) return 0;
  return Number((((price - cost) / cost) * 100).toFixed(2));
}

export function calculatePriceFromMargin(cost: number, marginPercent: number): number {
  if (!cost || cost <= 0) return 0;
  return Number((cost * (1 + marginPercent / 100)).toFixed(2));
}

export function convertToRef(amountPrimary: number, exchangeRate: number): number {
  return Number((amountPrimary * exchangeRate).toFixed(2));
}

export function convertToPrimary(amountRef: number, exchangeRate: number): number {
  if (!exchangeRate || exchangeRate <= 0) return 0;
  return Number((amountRef / exchangeRate).toFixed(2));
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function generateWhatsAppMessage(sale: Sale, company: CompanyConfig, currency: CurrencyConfig): string {
  const lines: string[] = [];
  lines.push(`🧾 *TICKET DE COMPRA - ${company.nombre.toUpperCase()}*`);
  lines.push(`*RIF:* ${company.rif} | *NIT:* ${company.nit}`);
  lines.push(`*Ticket N°:* ${sale.numeroTicket}`);
  lines.push(`*Fecha:* ${new Date(sale.fecha).toLocaleString('es-VE')}`);
  lines.push(`*Atendido por:* ${sale.vendedorNombre}`);
  if (sale.cliente?.nombre) {
    lines.push(`*Cliente:* ${sale.cliente.nombre} (${sale.cliente.docId})`);
  }
  lines.push(`---------------------------------`);
  lines.push(`*DETALLE DE PRODUCTOS:*`);

  sale.items.forEach((item, idx) => {
    const pVentaPrincipal = formatCurrency(item.subtotal, currency.monedaPrincipal);
    const pVentaRef = formatCurrency(item.subtotal * sale.tasaCambioAplicada, currency.monedaReferencia);
    const itemTitle = item.variante
      ? `${item.producto.nombre} [${item.variante.nombre}]`
      : item.producto.nombre;
    lines.push(
      `${idx + 1}. *${itemTitle}*\n   ${item.cantidad} x ${formatCurrency(item.precioUnitario, currency.monedaPrincipal)} = ${pVentaPrincipal} (${pVentaRef})`
    );
  });

  lines.push(`---------------------------------`);
  lines.push(`*Subtotal:* ${formatCurrency(sale.subtotalPrincipal, currency.monedaPrincipal)} / ${formatCurrency(sale.subtotalReferencia, currency.monedaReferencia)}`);
  lines.push(`*Impuestos (IVA):* ${formatCurrency(sale.impuestosPrincipal, currency.monedaPrincipal)} / ${formatCurrency(sale.impuestosReferencia, currency.monedaReferencia)}`);
  lines.push(`*TOTAL A PAGAR:* *${formatCurrency(sale.totalPrincipal, currency.monedaPrincipal)}* / *${formatCurrency(sale.totalReferencia, currency.monedaReferencia)}*`);
  lines.push(`*Tasa Aplicada:* 1 ${currency.monedaPrincipal.codigo} = ${sale.tasaCambioAplicada.toFixed(2)} ${currency.monedaReferencia.codigo}`);
  lines.push(`*Método de Pago:* ${sale.pago.metodo.replace(/_/g, ' ')}`);

  if (sale.pago.cambioPrincipal > 0 || sale.pago.cambioReferencia > 0) {
    lines.push(`*Cambio Entregado:* ${formatCurrency(sale.pago.cambioPrincipal, currency.monedaPrincipal)} / ${formatCurrency(sale.pago.cambioReferencia, currency.monedaReferencia)}`);
  }

  lines.push(`---------------------------------`);
  if (company.mensajePieTicket) {
    lines.push(`_${company.mensajePieTicket}_`);
  }
  if (company.telefono) {
    lines.push(`📞 Contacto: ${company.telefono}`);
  }
  lines.push(`🙏 ¡Gracias por preferirnos!`);

  return encodeURIComponent(lines.join('\n'));
}
