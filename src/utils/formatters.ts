import { CurrencyConfig, CompanyConfig, Sale, Tax, ClientDebt, WorkshopOrder } from '../types';

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

  if (sale.condicionVenta === 'CREDITO' || (sale.saldoPendientePrincipal && sale.saldoPendientePrincipal > 0)) {
    lines.push(`*CONDICIÓN:* ⚠️ *VENTA A CRÉDITO*`);
    const abonadoP = sale.montoAbonadoPrincipal !== undefined ? sale.montoAbonadoPrincipal : sale.pago.montoPagadoPrincipal;
    const abonadoRef = sale.montoAbonadoReferencia !== undefined ? sale.montoAbonadoReferencia : sale.pago.montoPagadoReferencia;
    const saldoP = sale.saldoPendientePrincipal || Math.max(0, sale.totalPrincipal - abonadoP);
    const saldoRef = sale.saldoPendienteReferencia || (saldoP * sale.tasaCambioAplicada);
    lines.push(`*Monto Abonado:* ${formatCurrency(abonadoP, currency.monedaPrincipal)} / ${formatCurrency(abonadoRef, currency.monedaReferencia)}`);
    lines.push(`*SALDO PENDIENTE (POR COBRAR):* *${formatCurrency(saldoP, currency.monedaPrincipal)}* / *${formatCurrency(saldoRef, currency.monedaReferencia)}*`);
  }

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

export function generateDebtWhatsAppReminder(
  client: { nombre: string; docId: string; telefono?: string },
  debts: ClientDebt[],
  totalDebtPrincipal: number,
  totalDebtRef: number,
  company: CompanyConfig,
  currency: CurrencyConfig
): string {
  const lines: string[] = [];
  lines.push(`📋 *RECORDATORIO DE PAGO - ${company.nombre.toUpperCase()}*`);
  lines.push(`Estimado(a) *${client.nombre}* (${client.docId}),`);
  lines.push(`Le saludamos cordialmente de parte de *${company.nombre}*.`);
  lines.push(``);
  lines.push(`Le recordamos amablemente que presenta un saldo pendiente en su cuenta por cobrar:`);
  lines.push(`💰 *TOTAL ADEUDADO:* *${formatCurrency(totalDebtPrincipal, currency.monedaPrincipal)}* / *${formatCurrency(totalDebtRef, currency.monedaReferencia)}*`);
  lines.push(`📌 _(Tasa referencial aplicada: 1 ${currency.monedaPrincipal.codigo} = ${currency.tasaCambio.toFixed(2)} ${currency.monedaReferencia.codigo})_`);
  lines.push(``);
  lines.push(`*DETALLE DE FACTURAS PENDIENTES:*`);
  debts.forEach((d, i) => {
    const saldoRef = formatCurrency(d.saldoPendientePrincipal * currency.tasaCambio, currency.monedaReferencia);
    lines.push(
      `${i + 1}. Factura *#${d.numeroTicket}* (${new Date(d.fecha).toLocaleDateString('es-VE')}):\n   • Saldo: *${formatCurrency(d.saldoPendientePrincipal, currency.monedaPrincipal)}* (${saldoRef})\n   • Total Facturado: ${formatCurrency(d.montoTotalPrincipal, currency.monedaPrincipal)}`
    );
  });
  lines.push(`---------------------------------`);
  if (company.telefono) {
    lines.push(`📞 Para coordinar su pago (Pago Móvil / Transferencia / Efectivo), contáctenos al: *${company.telefono}*`);
  }
  lines.push(`🏢 O puede visitarnos directamente en nuestras instalaciones.`);
  lines.push(`_Si ya realizó este pago recientemente, por favor ignore este mensaje._`);
  lines.push(`🙏 ¡Agradecemos su atención y preferencia!`);

  return encodeURIComponent(lines.join('\n'));
}

export function formatWorkshopDateShort(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    const day = d.getDate();
    const standardMonths = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
    return `${day} ${standardMonths[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function formatWorkshopDeliveryDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'];
    return `${daysOfWeek[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function generateWorkshopWhatsAppMessage(
  order: WorkshopOrder,
  company: CompanyConfig,
  currency: CurrencyConfig
): string {
  const lines: string[] = [];
  lines.push(`🧵 *ESTADO DE PEDIDO / TALLER - ${company.nombre.toUpperCase()}*`);
  lines.push(`Hola estimado(a) *${order.cliente.nombre}*, le saludamos de *${company.nombre}*.`);
  lines.push(``);
  lines.push(`📦 *Orden N°:* *${order.numeroPedido}*`);
  lines.push(`📅 *Fecha de Registro:* ${formatWorkshopDateShort(order.fechaCreacion)}`);
  lines.push(`🗓️ *Fecha Estimada de Entrega:* *${formatWorkshopDeliveryDate(order.fechaEstimadaEntrega)}*`);
  lines.push(`👤 *Vendedor:* ${order.vendedorNombre}`);
  lines.push(``);

  const statusLabel =
    order.estado === 'CONFIRMADO'
      ? 'PEDIDO CONFIRMADO ✅'
      : order.estado === 'EN_CONFECCION'
      ? 'EN CONFECCIÓN / PRODUCCIÓN 🧵'
      : order.estado === 'EN_DISENO'
      ? 'EN DISEÑO Y PERSONALIZACIÓN 💻'
      : order.estado === 'LISTO'
      ? '¡LISTO PARA RETIRAR! 🛍️'
      : 'ENTREGADO CON ÉXITO ✨';

  lines.push(`📍 *ESTADO ACTUAL:* *${statusLabel}*`);

  const currentStep = order.timeline?.find((t) => t.estado === order.estado);
  if (currentStep?.descripcion) {
    lines.push(`ℹ️ _Detalle: ${currentStep.descripcion}_`);
  }
  lines.push(``);
  lines.push(`📋 *RESUMEN DEL PEDIDO:*`);
  order.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. *${item.nombre}* x${item.cantidad} — ${formatCurrency(item.total, currency.monedaPrincipal)}`
    );
    if (item.tallaOColor) {
      lines.push(`   • Detalle: ${item.tallaOColor}`);
    }
  });

  lines.push(`---------------------------------`);
  lines.push(
    `💵 *GRAN TOTAL:* *${formatCurrency(order.totalPrincipal, currency.monedaPrincipal)}* (${formatCurrency(order.totalReferencia, currency.monedaReferencia)})`
  );

  if (
    order.montoAbonadoPrincipal !== undefined &&
    order.saldoPendientePrincipal !== undefined &&
    order.saldoPendientePrincipal > 0
  ) {
    lines.push(`✅ *Monto Abonado:* ${formatCurrency(order.montoAbonadoPrincipal, currency.monedaPrincipal)}`);
    lines.push(`⚠️ *Saldo Pendiente:* *${formatCurrency(order.saldoPendientePrincipal, currency.monedaPrincipal)}*`);
  }

  if (order.notasTaller) {
    lines.push(``);
    lines.push(`📝 *Notas:* ${order.notasTaller}`);
  }

  lines.push(``);
  if (company.telefono) {
    lines.push(`📞 Contáctenos al: *${company.telefono}*`);
  }
  lines.push(`🙏 ¡Gracias por su confianza!`);

  return encodeURIComponent(lines.join('\n'));
}
