import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, CartItem, CompanyConfig, CurrencyConfig, ClientData } from '../types';
import { formatCurrency } from './formatters';

export interface TicketPdfData {
  saleNumber: string;
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
  tasaCambio: number;
  paymentMethod?: string;
  paidPrincipal?: number;
  paidReferencia?: number;
  cambioPrincipal?: number;
  cambioReferencia?: number;
  referenceCode?: string;
  condicionVenta?: 'CONTADO' | 'CREDITO';
  montoAbonadoPrincipal?: number;
  saldoPendientePrincipal?: number;
  montoAbonadoReferencia?: number;
  saldoPendienteReferencia?: number;
}

/**
 * Generates and downloads an 80mm thermal receipt formatted PDF or standard receipt PDF
 */
export function generateTicketPDF(
  data: TicketPdfData,
  company: CompanyConfig,
  currency: CurrencyConfig
): void {
  // 80mm width receipt thermal format (approx 80mm x 200mm+ or auto height)
  // We can calculate dynamic height based on items count
  const estimatedHeight = Math.max(160, 100 + data.items.length * 10);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, estimatedHeight],
  });

  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 8;

  // Header - Company info
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(company.nombre.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`RIF: ${company.rif} | NIT: ${company.nit}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 3.5;

  if (company.direccion) {
    const splitDir = doc.splitTextToSize(company.direccion, contentWidth);
    doc.text(splitDir, pageWidth / 2, currentY, { align: 'center' });
    currentY += splitDir.length * 3;
  }

  if (company.telefono) {
    doc.text(`Tel: ${company.telefono}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3.5;
  }

  // Dashed separator
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 3.5;

  // Ticket Meta
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`TICKET DE VENTA: #${data.saleNumber}`, margin, currentY);
  currentY += 3.5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text(`Fecha/Hora: ${data.date.toLocaleString('es-VE')}`, margin, currentY);
  currentY += 3.2;

  doc.text(`Atendido por: ${data.vendorName}`, margin, currentY);
  currentY += 3.2;

  if (data.client?.nombre) {
    doc.text(`Cliente: ${data.client.nombre}`, margin, currentY);
    currentY += 3.2;
    doc.text(`Doc / RIF: ${data.client.docId}`, margin, currentY);
    currentY += 3.2;
    if (data.client.telefono) {
      doc.text(`Teléfono / WhatsApp: ${data.client.telefono}`, margin, currentY);
      currentY += 3.2;
    }
  }

  // Dashed separator
  currentY += 1;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 2;

  // Table of Items
  const tableData = data.items.map((item) => {
    const itemName = item.variante
      ? `${item.producto.nombre} [${item.variante.nombre}]`
      : item.producto.nombre;
    const priceText = formatCurrency(item.precioUnitario, currency.monedaPrincipal);
    const totalText = formatCurrency(item.total, currency.monedaPrincipal);
    return [
      itemName,
      item.cantidad.toString(),
      priceText,
      totalText,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['DESCRIPCIÓN', 'CANT', 'P.UNIT', 'TOTAL']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      font: 'courier',
      fontStyle: 'bold',
      fontSize: 6.5,
      textColor: [0, 0, 0],
      fillColor: [240, 240, 240],
      cellPadding: 1,
    },
    styles: {
      font: 'courier',
      fontSize: 6.5,
      textColor: [30, 30, 30],
      cellPadding: 1,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 8, halign: 'center' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 17, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 2;

  // Dashed separator
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 3;

  // Totals breakdown
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text('SUBTOTAL:', margin, currentY);
  doc.text(formatCurrency(data.subtotalPrincipal, currency.monedaPrincipal), pageWidth - margin, currentY, { align: 'right' });
  currentY += 3;

  doc.text('IVA / IMPUESTOS:', margin, currentY);
  doc.text(formatCurrency(data.impuestosPrincipal, currency.monedaPrincipal), pageWidth - margin, currentY, { align: 'right' });
  currentY += 3.5;

  // Total Box
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, currentY, contentWidth, 11, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, currentY, contentWidth, 11, 'S');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL (${currency.monedaPrincipal.codigo}):`, margin + 1.5, currentY + 4);
  doc.text(formatCurrency(data.totalPrincipal, currency.monedaPrincipal), pageWidth - margin - 1.5, currentY + 4, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`TOTAL (${currency.monedaReferencia.codigo}):`, margin + 1.5, currentY + 7.5);
  doc.text(formatCurrency(data.totalReferencia, currency.monedaReferencia), pageWidth - margin - 1.5, currentY + 7.5, { align: 'right' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Tasa: 1 ${currency.monedaPrincipal.codigo} = ${data.tasaCambio.toFixed(2)} ${currency.monedaReferencia.codigo}`,
    pageWidth - margin - 1.5,
    currentY + 10,
    { align: 'right' }
  );

  currentY += 13.5;

  // Payment method info if completed
  if (data.paymentMethod) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(50, 50, 50);
    doc.text(`MÉTODO DE PAGO: ${data.paymentMethod.replace(/_/g, ' ')}`, margin, currentY);
    currentY += 2.8;

    if (data.referenceCode) {
      doc.text(`REF BANCARIA: ${data.referenceCode}`, margin, currentY);
      currentY += 2.8;
    }

    if (data.paidPrincipal && data.paidPrincipal > 0) {
      doc.text(`PAGADO (${currency.monedaPrincipal.codigo}): ${formatCurrency(data.paidPrincipal, currency.monedaPrincipal)}`, margin, currentY);
      currentY += 2.8;
    }

    if (data.paidReferencia && data.paidReferencia > 0) {
      doc.text(`PAGADO (${currency.monedaReferencia.codigo}): ${formatCurrency(data.paidReferencia, currency.monedaReferencia)}`, margin, currentY);
      currentY += 2.8;
    }

    if (data.condicionVenta === 'CREDITO' || (data.saldoPendientePrincipal && data.saldoPendientePrincipal > 0)) {
      doc.setFont('courier', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(`*** VENTA A CRÉDITO ***`, margin, currentY);
      currentY += 2.8;
      if (data.montoAbonadoPrincipal !== undefined) {
        doc.text(`ABONADO: ${formatCurrency(data.montoAbonadoPrincipal, currency.monedaPrincipal)}`, margin, currentY);
        currentY += 2.8;
      }
      if (data.saldoPendientePrincipal !== undefined) {
        doc.text(`SALDO PENDIENTE (CXC): ${formatCurrency(data.saldoPendientePrincipal, currency.monedaPrincipal)}`, margin, currentY);
        currentY += 3.2;
      }
    }

    if ((data.cambioPrincipal && data.cambioPrincipal > 0) || (data.cambioReferencia && data.cambioReferencia > 0)) {
      doc.setFont('courier', 'bold');
      doc.setTextColor(16, 110, 60);
      doc.text(
        `CAMBIO / VUELTO: ${formatCurrency(data.cambioPrincipal || 0, currency.monedaPrincipal)} / ${formatCurrency(data.cambioReferencia || 0, currency.monedaReferencia)}`,
        margin,
        currentY
      );
      currentY += 3;
    }
  }

  // Footer message
  currentY += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 3.5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  if (company.mensajePieTicket) {
    const splitFooter = doc.splitTextToSize(company.mensajePieTicket, contentWidth);
    doc.text(splitFooter, pageWidth / 2, currentY, { align: 'center' });
    currentY += splitFooter.length * 2.8;
  }

  doc.setFontSize(5.5);
  doc.setTextColor(120, 120, 120);
  doc.text('*** SISTEMA TPV FISCAL SEGURO ***', pageWidth / 2, currentY, { align: 'center' });

  // Save the PDF
  const safeNum = data.saleNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Ticket_${safeNum}.pdf`);
}

/**
 * Generates a traditional full-page (A4 / Letter) invoice in PDF format
 */
export function generateTraditionalInvoicePDF(
  data: TicketPdfData & { tipoVenta?: 'DETAL' | 'MAYOR' },
  company: CompanyConfig,
  currency: CurrencyConfig
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 16;

  // Header Box - Company Branding
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, 'FD');

  // Company Information (Left side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(company.nombre.toUpperCase(), margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`RIF: ${company.rif}  |  NIT: ${company.nit}`, margin + 6, currentY + 16);

  if (company.direccion) {
    const splitDir = doc.splitTextToSize(`Dirección: ${company.direccion}`, 110);
    doc.text(splitDir, margin + 6, currentY + 22);
  }

  if (company.telefono || company.email) {
    doc.text(`Tel: ${company.telefono || 'N/A'}  |  Email: ${company.email || 'N/A'}`, margin + 6, currentY + 32);
  }

  // Invoice Box (Right side)
  const invBoxX = pageWidth - margin - 65;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(invBoxX, currentY + 4, 60, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text('FACTURA', invBoxX + 30, currentY + 11, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`N°: ${data.saleNumber}`, invBoxX + 30, currentY + 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${data.date.toLocaleDateString('es-VE')} ${data.date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`, invBoxX + 30, currentY + 24, { align: 'center' });
  doc.text(`Tipo: ${data.tipoVenta === 'MAYOR' ? 'VENTA AL MAYOR' : 'VENTA AL DETAL'}`, invBoxX + 30, currentY + 29, { align: 'center' });

  currentY += 44;

  // Client Details & Seller Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL CLIENTE', margin + 5, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const clientName = data.client?.nombre || 'Consumidor Final';
  const clientDoc = data.client?.docId || 'V-00000000';
  const clientPhone = data.client?.telefono || 'N/A';
  const clientDir = data.client?.direccion || 'Mostrador / Local';

  doc.text(`Cliente: ${clientName}`, margin + 5, currentY + 12);
  doc.text(`C.I. / RIF: ${clientDoc}`, margin + 5, currentY + 18);

  doc.text(`Teléfono: ${clientPhone}`, margin + 95, currentY + 12);
  doc.text(`Dirección: ${clientDir}`, margin + 95, currentY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text(`Vendedor: ${data.vendorName}`, pageWidth - margin - 5, currentY + 12, { align: 'right' });

  currentY += 28;

  // Table of Items
  const tableData = data.items.map((item, idx) => {
    const itemName = item.variante
      ? `${item.producto.nombre} [${item.variante.nombre}]`
      : item.producto.nombre;
    const isWholesale = (item as any).esVentaMayor || data.tipoVenta === 'MAYOR';
    const unitPrice = formatCurrency(item.precioUnitario, currency.monedaPrincipal);
    const subtotalText = formatCurrency(item.total, currency.monedaPrincipal);
    const subtotalRef = formatCurrency(item.total * data.tasaCambio, currency.monedaReferencia);

    return [
      (idx + 1).toString(),
      item.producto.codigoBarras || 'S/C',
      itemName,
      isWholesale ? 'AL MAYOR' : 'AL DETAL',
      item.cantidad.toString(),
      unitPrice,
      `${subtotalText}\n(${subtotalRef})`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'CÓDIGO', 'DESCRIPCIÓN DEL PRODUCTO', 'MODALIDAD', 'CANT', 'P. UNITARIO', 'SUBTOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 70 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Check page overflow
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // Totals & Payment Summary Box
  const totalsBoxWidth = 85;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  // Left side: Payment details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('FORMA DE PAGO:', margin + 2, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Método: ${(data.paymentMethod || 'EFECTIVO').replace(/_/g, ' ')}`, margin + 2, currentY + 11);
  if (data.referenceCode) {
    doc.text(`Referencia: ${data.referenceCode}`, margin + 2, currentY + 16);
  }
  doc.text(`Tasa de Cambio Oficial: 1 ${currency.monedaPrincipal.codigo} = ${data.tasaCambio.toFixed(2)} ${currency.monedaReferencia.codigo}`, margin + 2, currentY + 21);

  if (data.condicionVenta === 'CREDITO' || (data.saldoPendientePrincipal && data.saldoPendientePrincipal > 0)) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`CONDICIÓN: VENTA A CRÉDITO`, margin + 2, currentY + 26);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Abonado: ${formatCurrency(data.montoAbonadoPrincipal || 0, currency.monedaPrincipal)} | Pendiente: ${formatCurrency(data.saldoPendientePrincipal || 0, currency.monedaPrincipal)}`, margin + 2, currentY + 31);
  }

  // Right side: Totals
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal Base:', totalsBoxX + 4, currentY + 7);
  doc.text(formatCurrency(data.subtotalPrincipal, currency.monedaPrincipal), totalsBoxX + totalsBoxWidth - 4, currentY + 7, { align: 'right' });

  doc.text('Impuesto (IVA):', totalsBoxX + 4, currentY + 13);
  doc.text(formatCurrency(data.impuestosPrincipal, currency.monedaPrincipal), totalsBoxX + totalsBoxWidth - 4, currentY + 13, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX + 4, currentY + 17, totalsBoxX + totalsBoxWidth - 4, currentY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL (${currency.monedaPrincipal.codigo}):`, totalsBoxX + 4, currentY + 24);
  doc.text(formatCurrency(data.totalPrincipal, currency.monedaPrincipal), totalsBoxX + totalsBoxWidth - 4, currentY + 24, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text(`TOTAL (${currency.monedaReferencia.codigo}):`, totalsBoxX + 4, currentY + 30);
  doc.text(formatCurrency(data.totalReferencia, currency.monedaReferencia), totalsBoxX + totalsBoxWidth - 4, currentY + 30, { align: 'right' });

  currentY += 44;

  // Signatures
  doc.setDrawColor(203, 213, 225);
  const sigWidth = 60;
  doc.line(margin + 15, currentY + 10, margin + 15 + sigWidth, currentY + 10);
  doc.line(pageWidth - margin - 15 - sigWidth, currentY + 10, pageWidth - margin - 15, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('FIRMA / SELLO VENDEDOR', margin + 15 + sigWidth / 2, currentY + 15, { align: 'center' });
  doc.text('RECIBIDO CONFORME CLIENTE', pageWidth - margin - 15 - sigWidth / 2, currentY + 15, { align: 'center' });

  // Footer Note
  if (company.mensajePieTicket) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(company.mensajePieTicket, pageWidth / 2, currentY + 23, { align: 'center' });
  }

  // Save the PDF
  const safeNum = data.saleNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Factura_${safeNum}.pdf`);
}
