import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, Category, CurrencyConfig, CompanyConfig, InventoryMovement, Sale, Purchase, Refund } from '../types';
import { formatCurrency, convertToRef } from './formatters';

/**
 * Universal CSV download helper with UTF-8 BOM for Excel compatibility
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): void {
  const sanitize = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    if (str.search(/("|,|\n|\r)/g) >= 0) {
      return `"${str}"`;
    }
    return `"${str}"`;
  };

  const csvRows = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(',')),
  ];

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// INVENTORY EXPORTS (CSV & PDF)
// ============================================================================

export function exportInventoryToCSV(
  products: Product[],
  categories: Category[],
  currency: CurrencyConfig,
  company: CompanyConfig
): void {
  const categoryMap = new Map(categories.map((c) => [c.id, c.nombre]));
  const headers = [
    'Código/SKU',
    'Producto',
    'Variante',
    'Categoría',
    'Stock Actual',
    'Unidad de Medida',
    'Stock Mínimo',
    `Costo Unitario (${currency.monedaPrincipal.codigo})`,
    `Precio Venta (${currency.monedaPrincipal.codigo})`,
    `Precio Ref (${currency.monedaReferencia.codigo})`,
    `Valor Costo Total (${currency.monedaPrincipal.codigo})`,
    `Valor Venta Total (${currency.monedaPrincipal.codigo})`,
    'Margen Ganancia (%)',
    'Estado Existencia',
  ];

  const rows: (string | number)[][] = [];

  products.forEach((p) => {
    const catName = categoryMap.get(p.categoriaId) || 'General';
    const hasVariants = p.variantes && p.variantes.length > 0;

    if (hasVariants) {
      p.variantes!.forEach((v) => {
        const variantCost = v.precioCompra !== undefined ? v.precioCompra : p.precioCompra;
        const costVal = Number((variantCost * v.stock).toFixed(2));
        const salesVal = Number((v.precio * v.stock).toFixed(2));
        const priceRef = convertToRef(v.precio, currency.tasaCambio);
        const margin =
          variantCost > 0
            ? Number((((v.precio - variantCost) / variantCost) * 100).toFixed(1))
            : 0;
        const status = v.stock <= 0 ? 'AGOTADO' : v.stock <= (v.stockMinimo || p.stockMinimo) ? 'STOCK BAJO' : 'DISPONIBLE';

        rows.push([
          v.codigoBarras || p.codigoBarras,
          p.nombre,
          v.nombre,
          catName,
          v.stock,
          p.unidadMedida,
          v.stockMinimo || p.stockMinimo,
          variantCost.toFixed(2),
          v.precio.toFixed(2),
          priceRef.toFixed(2),
          costVal.toFixed(2),
          salesVal.toFixed(2),
          `${margin}%`,
          status,
        ]);
      });
    } else {
      const costVal = Number((p.precioCompra * p.stockActual).toFixed(2));
      const salesVal = Number((p.precioVenta * p.stockActual).toFixed(2));
      const priceRef = convertToRef(p.precioVenta, currency.tasaCambio);
      const margin =
        p.precioCompra > 0
          ? Number((((p.precioVenta - p.precioCompra) / p.precioCompra) * 100).toFixed(1))
          : 0;
      const status = p.stockActual <= 0 ? 'AGOTADO' : p.stockActual <= p.stockMinimo ? 'STOCK BAJO' : 'DISPONIBLE';

      rows.push([
        p.codigoBarras,
        p.nombre,
        '-',
        catName,
        p.stockActual,
        p.unidadMedida,
        p.stockMinimo,
        p.precioCompra.toFixed(2),
        p.precioVenta.toFixed(2),
        priceRef.toFixed(2),
        costVal.toFixed(2),
        salesVal.toFixed(2),
        `${margin}%`,
        status,
      ]);
    }
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  exportToCSV(`Inventario_${safeCompany}_${dateStr}.csv`, headers, rows);
}

export function exportInventoryToPDF(
  products: Product[],
  categories: Category[],
  currency: CurrencyConfig,
  company: CompanyConfig,
  filterName: string = 'Todos'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const categoryMap = new Map(categories.map((c) => [c.id, c.nombre]));

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate totals
  let totalUnits = 0;
  let totalCostVal = 0;
  let totalSalesVal = 0;

  products.forEach((p) => {
    const hasVariants = p.variantes && p.variantes.length > 0;
    if (hasVariants) {
      p.variantes!.forEach((v) => {
        const variantCost = v.precioCompra !== undefined ? v.precioCompra : p.precioCompra;
        totalUnits += v.stock;
        totalCostVal += v.stock * variantCost;
        totalSalesVal += v.stock * v.precio;
      });
    } else {
      totalUnits += p.stockActual;
      totalCostVal += p.stockActual * p.precioCompra;
      totalSalesVal += p.stockActual * p.precioVenta;
    }
  });

  const potentialProfit = totalSalesVal - totalCostVal;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company.nombre.toUpperCase(), 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`RIF: ${company.rif} | NIT: ${company.nit} | Tel: ${company.telefono || 'N/A'}`, 14, 16);
  if (company.direccion) {
    doc.text(`Dirección: ${company.direccion.substring(0, 75)}`, 14, 20);
  }

  // Right Header Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('REPORTE DE INVENTARIO Y VALORIZACIÓN', 283, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emisión: ${dateFormatted} | Filtro: ${filterName}`, 283, 16, { align: 'right' });
  doc.text(`Tasa Cambio: 1 ${currency.monedaPrincipal.codigo} = ${currency.tasaCambio.toFixed(2)} ${currency.monedaReferencia.codigo}`, 283, 20, { align: 'right' });

  // Summary Metrics Bar
  const boxY = 28;
  const boxWidth = 51.5;
  const boxHeight = 15;

  const summaryBoxes = [
    { label: 'PRODUCTOS / REGS', val: `${products.length} Items`, color: [248, 250, 252], textCol: [30, 41, 59] },
    { label: 'UNIDADES FÍSICAS', val: `${totalUnits.toLocaleString('es-VE')}`, color: [248, 250, 252], textCol: [30, 41, 59] },
    { label: `VALOR COSTO (${currency.monedaPrincipal.codigo})`, val: formatCurrency(totalCostVal, currency.monedaPrincipal), color: [248, 250, 252], textCol: [30, 41, 59] },
    { label: `VALOR VENTA (${currency.monedaPrincipal.codigo})`, val: formatCurrency(totalSalesVal, currency.monedaPrincipal), color: [236, 253, 245], textCol: [4, 120, 87] },
    { label: 'GANANCIA POTENCIAL', val: formatCurrency(potentialProfit, currency.monedaPrincipal), color: [240, 253, 244], textCol: [21, 128, 61] },
  ];

  summaryBoxes.forEach((b, idx) => {
    const x = 14 + idx * (boxWidth + 3.5);
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + 3.5, boxY + 5);

    doc.setFontSize(9);
    doc.setTextColor(b.textCol[0], b.textCol[1], b.textCol[2]);
    doc.text(b.val, x + 3.5, boxY + 11.5);
  });

  // Table rows
  const tableData: (string | number)[][] = [];

  products.forEach((p) => {
    const catName = categoryMap.get(p.categoriaId) || 'General';
    const hasVariants = p.variantes && p.variantes.length > 0;

    if (hasVariants) {
      p.variantes!.forEach((v) => {
        const variantCost = v.precioCompra !== undefined ? v.precioCompra : p.precioCompra;
        const costVal = variantCost * v.stock;
        const salesVal = v.precio * v.stock;
        const status = v.stock <= 0 ? 'AGOTADO' : v.stock <= (v.stockMinimo || p.stockMinimo) ? 'STOCK BAJO' : 'DISPONIBLE';

        tableData.push([
          v.codigoBarras || p.codigoBarras,
          `${p.nombre} [${v.nombre}]`,
          catName,
          v.stock.toString(),
          formatCurrency(variantCost, currency.monedaPrincipal),
          formatCurrency(v.precio, currency.monedaPrincipal),
          formatCurrency(costVal, currency.monedaPrincipal),
          formatCurrency(salesVal, currency.monedaPrincipal),
          status,
        ]);
      });
    } else {
      const costVal = p.precioCompra * p.stockActual;
      const salesVal = p.precioVenta * p.stockActual;
      const status = p.stockActual <= 0 ? 'AGOTADO' : p.stockActual <= p.stockMinimo ? 'STOCK BAJO' : 'DISPONIBLE';

      tableData.push([
        p.codigoBarras,
        p.nombre,
        catName,
        p.stockActual.toString(),
        formatCurrency(p.precioCompra, currency.monedaPrincipal),
        formatCurrency(p.precioVenta, currency.monedaPrincipal),
        formatCurrency(costVal, currency.monedaPrincipal),
        formatCurrency(salesVal, currency.monedaPrincipal),
        status,
      ]);
    }
  });

  autoTable(doc, {
    startY: 47,
    head: [[
      'CÓDIGO/SKU',
      'PRODUCTO / VARIEDAD',
      'CATEGORÍA',
      'STOCK',
      `COSTO (${currency.monedaPrincipal.codigo})`,
      `PRECIO (${currency.monedaPrincipal.codigo})`,
      `VAL. COSTO`,
      `VAL. VENTA`,
      'ESTADO',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 28, font: 'courier' },
      1: { cellWidth: 70 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 27, halign: 'right' },
      7: { cellWidth: 27, halign: 'right' },
      8: { cellWidth: 19, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento para fines contables y de auditoría interna - Página ${data.pageNumber} de ${pageNumber}`,
        14,
        204
      );
      doc.text(
        `Generado por ${company.nombre} el ${dateFormatted}`,
        283,
        204,
        { align: 'right' }
      );
    },
  });

  const dateStr = now.toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Inventario_${safeCompany}_${dateStr}.pdf`);
}

// ============================================================================
// INVENTORY MOVEMENTS / KARDEX EXPORTS (CSV & PDF)
// ============================================================================

export function exportMovementsToCSV(
  movements: InventoryMovement[],
  products: Product[],
  company: CompanyConfig
): void {
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const headers = [
    'ID Movimiento',
    'Fecha',
    'Hora',
    'Código/SKU',
    'Producto',
    'Tipo Movimiento',
    'Cantidad',
    'Stock Anterior',
    'Stock Resultante',
    'Motivo / Referencia',
    'Usuario Responsable',
  ];

  const rows = movements.map((m) => {
    const p = prodMap.get(m.productoId);
    const dateObj = new Date(m.fecha);
    return [
      m.id,
      dateObj.toLocaleDateString('es-VE'),
      dateObj.toLocaleTimeString('es-VE'),
      p?.codigoBarras || '-',
      p?.nombre || m.productoNombre || m.productoId,
      m.tipo,
      m.cantidad,
      m.stockAnterior,
      m.stockPosterior,
      m.motivo,
      m.usuarioNombre || 'Sistema',
    ];
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  exportToCSV(`Kardex_Movimientos_${safeCompany}_${dateStr}.csv`, headers, rows);
}

export function exportMovementsToPDF(
  movements: InventoryMovement[],
  products: Product[],
  company: CompanyConfig
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company.nombre.toUpperCase(), 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`RIF: ${company.rif} | NIT: ${company.nit} | Tel: ${company.telefono || 'N/A'}`, 14, 16);
  if (company.direccion) {
    doc.text(`Dirección: ${company.direccion.substring(0, 75)}`, 14, 20);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246); // blue-500
  doc.text('KARDEX Y MOVIMIENTOS DE INVENTARIO', 283, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Total registros: ${movements.length} | Emisión: ${dateFormatted}`, 283, 16, { align: 'right' });

  const tableData = movements.map((m) => {
    const p = prodMap.get(m.productoId);
    const dateObj = new Date(m.fecha);
    const dateStr = `${dateObj.toLocaleDateString('es-VE')} ${dateObj.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;

    return [
      dateStr,
      m.tipo,
      p?.codigoBarras || '-',
      p?.nombre || m.productoNombre || m.productoId,
      m.cantidad > 0 ? `+${m.cantidad}` : `${m.cantidad}`,
      m.stockAnterior.toString(),
      m.stockPosterior.toString(),
      m.motivo,
      m.usuarioNombre || 'Sistema',
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [[
      'FECHA / HORA',
      'TIPO',
      'SKU',
      'PRODUCTO',
      'CANTIDAD',
      'STOCK ANT.',
      'STOCK POST.',
      'MOTIVO / REFERENCIA',
      'RESPONSABLE',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 24, font: 'courier' },
      3: { cellWidth: 58 },
      4: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 54 },
      8: { cellWidth: 32 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Kardex de Auditoría Interna - Página ${data.pageNumber} de ${pageNumber}`,
        14,
        204
      );
    },
  });

  const dateStr = now.toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Kardex_Movimientos_${safeCompany}_${dateStr}.pdf`);
}

// ============================================================================
// SALES HISTORY EXPORTS (CSV & PDF)
// ============================================================================

export function exportSalesToCSV(
  sales: Sale[],
  currency: CurrencyConfig,
  company: CompanyConfig
): void {
  const headers = [
    'N° Ticket',
    'Fecha',
    'Hora',
    'Cliente',
    'Doc. Identidad',
    'Teléfono',
    'Vendedor',
    'Método de Pago',
    'Tasa de Cambio',
    'Cant. Productos',
    `Subtotal (${currency.monedaPrincipal.codigo})`,
    `Impuesto Total (${currency.monedaPrincipal.codigo})`,
    `Total Venta (${currency.monedaPrincipal.codigo})`,
    `Total Venta Ref (${currency.monedaReferencia.codigo})`,
    'Estado',
    'Resumen Items Vendidos',
  ];

  const rows = sales.map((s) => {
    const d = new Date(s.fecha);
    const itemsSummary = s.items
      .map((it) => `${it.cantidad}x ${it.producto.nombre}${it.variante ? ` (${it.variante.nombre})` : ''}`)
      .join('; ');

    return [
      s.numeroTicket,
      d.toLocaleDateString('es-VE'),
      d.toLocaleTimeString('es-VE'),
      s.cliente?.nombre || 'Consumidor Final',
      s.cliente?.docId || '-',
      s.cliente?.telefono || '-',
      s.vendedorNombre,
      s.pago?.metodo || 'EFECTIVO',
      (s.tasaCambioAplicada || currency.tasaCambio).toFixed(2),
      s.items.reduce((sum, it) => sum + it.cantidad, 0),
      s.subtotalPrincipal.toFixed(2),
      s.impuestosPrincipal.toFixed(2),
      s.totalPrincipal.toFixed(2),
      s.totalReferencia.toFixed(2),
      s.estado,
      itemsSummary,
    ];
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  exportToCSV(`Historial_Ventas_${safeCompany}_${dateStr}.csv`, headers, rows);
}

export function exportSalesToPDF(
  sales: Sale[],
  currency: CurrencyConfig,
  company: CompanyConfig,
  dateFilterLabel: string = 'Historial Completo'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate Metrics
  let totalRevenuePrimary = 0;
  let totalRevenueRef = 0;
  let totalTaxCollected = 0;
  let totalItemsSold = 0;

  sales.forEach((s) => {
    totalRevenuePrimary += s.totalPrincipal;
    totalRevenueRef += s.totalReferencia;
    totalTaxCollected += s.impuestosPrincipal;
    totalItemsSold += s.items.reduce((sum, it) => sum + it.cantidad, 0);
  });

  const avgTicket = sales.length > 0 ? totalRevenuePrimary / sales.length : 0;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company.nombre.toUpperCase(), 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`RIF: ${company.rif} | NIT: ${company.nit} | Tel: ${company.telefono || 'N/A'}`, 14, 16);
  if (company.direccion) {
    doc.text(`Dirección: ${company.direccion.substring(0, 75)}`, 14, 20);
  }

  // Right Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('HISTORIAL Y LIBRO DE VENTAS', 283, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Periodo: ${dateFilterLabel} | Emisión: ${dateFormatted}`, 283, 16, { align: 'right' });
  doc.text(`Tasa Cambio Oficial: 1 ${currency.monedaPrincipal.codigo} = ${currency.tasaCambio.toFixed(2)} ${currency.monedaReferencia.codigo}`, 283, 20, { align: 'right' });

  // Summary Metrics Bar
  const boxY = 28;
  const boxWidth = 51.5;
  const boxHeight = 15;

  const summaryBoxes = [
    { label: 'TICKETS REGISTRADOS', val: `${sales.length} Ventas`, color: [248, 250, 252], textCol: [30, 41, 59] },
    { label: 'UNIDADES VENDIDAS', val: `${totalItemsSold.toLocaleString('es-VE')} Unidades`, color: [248, 250, 252], textCol: [30, 41, 59] },
    { label: `TOTAL FACTURADO (${currency.monedaPrincipal.codigo})`, val: formatCurrency(totalRevenuePrimary, currency.monedaPrincipal), color: [236, 253, 245], textCol: [4, 120, 87] },
    { label: `TOTAL REFERENCIA (${currency.monedaReferencia.codigo})`, val: formatCurrency(totalRevenueRef, currency.monedaReferencia), color: [240, 253, 244], textCol: [21, 128, 61] },
    { label: 'TICKET PROMEDIO', val: formatCurrency(avgTicket, currency.monedaPrincipal), color: [248, 250, 252], textCol: [30, 41, 59] },
  ];

  summaryBoxes.forEach((b, idx) => {
    const x = 14 + idx * (boxWidth + 3.5);
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + 3.5, boxY + 5);

    doc.setFontSize(9);
    doc.setTextColor(b.textCol[0], b.textCol[1], b.textCol[2]);
    doc.text(b.val, x + 3.5, boxY + 11.5);
  });

  // Table rows
  const tableData = sales.map((s) => {
    const d = new Date(s.fecha);
    const dateStr = `${d.toLocaleDateString('es-VE')} ${d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
    const itemsCount = s.items.reduce((sum, it) => sum + it.cantidad, 0);

    const clientName = s.cliente?.nombre ? `${s.cliente.nombre} (${s.cliente.docId || 'S/D'})` : 'Consumidor Final';

    return [
      s.numeroTicket,
      dateStr,
      clientName,
      s.vendedorNombre,
      s.pago?.metodo?.replace('_', ' ') || 'EFECTIVO',
      itemsCount.toString(),
      formatCurrency(s.subtotalPrincipal, currency.monedaPrincipal),
      formatCurrency(s.impuestosPrincipal, currency.monedaPrincipal),
      formatCurrency(s.totalPrincipal, currency.monedaPrincipal),
      formatCurrency(s.totalReferencia, currency.monedaReferencia),
    ];
  });

  autoTable(doc, {
    startY: 47,
    head: [[
      'TICKET N°',
      'FECHA / HORA',
      'CLIENTE',
      'VENDEDOR',
      'MÉTODO PAGO',
      'ITEMS',
      `SUBTOTAL (${currency.monedaPrincipal.codigo})`,
      `IMPUESTO (${currency.monedaPrincipal.codigo})`,
      `TOTAL (${currency.monedaPrincipal.codigo})`,
      `TOTAL (${currency.monedaReferencia.codigo})`,
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129], // emerald-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 26, font: 'courier', fontStyle: 'bold' },
      1: { cellWidth: 28 },
      2: { cellWidth: 54 },
      3: { cellWidth: 32 },
      4: { cellWidth: 30 },
      5: { cellWidth: 14, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
      8: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 28, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Libro Diario y Reporte de Ventas - Página ${data.pageNumber} de ${pageNumber}`,
        14,
        204
      );
      doc.text(
        `Emitido por Sistema POS ${company.nombre} - ${dateFormatted}`,
        283,
        204,
        { align: 'right' }
      );
    },
  });

  const dateStr = now.toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Ventas_${safeCompany}_${dateStr}.pdf`);
}

// ============================================================================
// DASHBOARD & FINANCIAL ACCOUNTING EXPORTS (CSV & PDF)
// ============================================================================

export interface DashboardExportData {
  periodLabel: string;
  totalSalesCount: number;
  grossSalesPrimary: number;
  grossSalesRef: number;
  refundsPrimary: number;
  refundsRef: number;
  netSalesPrimary: number;
  netSalesRef: number;
  cogsPrimary: number;
  grossProfitPrimary: number;
  grossProfitMarginPercent: number;
  avgTicketPrimary: number;
  taxCollectedPrimary: number;
  totalPurchasesPrimary: number;
  inventoryCostValuation: number;
  inventorySaleValuation: number;
  paymentMethods: {
    method: string;
    label: string;
    count: number;
    totalPrimary: number;
    percentage: number;
  }[];
  topProducts: {
    nombre: string;
    categoria: string;
    unidades: number;
    ingresos: number;
    utilidad: number;
  }[];
  lowStockItems: {
    codigoBarras: string;
    nombre: string;
    stockActual: number;
    stockMinimo: number;
    unidadMedida: string;
    costoUnitario: number;
    deficit: number;
    costoReposicion: number;
  }[];
}

export function exportDashboardToCSV(
  data: DashboardExportData,
  currency: CurrencyConfig,
  company: CompanyConfig
): void {
  const headers = ['SECCIÓN / CONCEPTO', 'MÉTRICA / DETALLE', `VALOR (${currency.monedaPrincipal.codigo})`, `VALOR (${currency.monedaReferencia.codigo})`, 'OBSERVACIÓN'];
  const rows: (string | number | boolean | null | undefined)[][] = [];

  // 1. Resumen General
  rows.push(['ESTADO DE RESULTADOS', 'Ventas Brutas', data.grossSalesPrimary.toFixed(2), data.grossSalesRef.toFixed(2), `${data.totalSalesCount} transacciones`]);
  rows.push(['ESTADO DE RESULTADOS', '(-) Devoluciones / Reembolsos', data.refundsPrimary.toFixed(2), data.refundsRef.toFixed(2), 'Impacto negativo']);
  rows.push(['ESTADO DE RESULTADOS', '(=) Ventas Netas', data.netSalesPrimary.toFixed(2), data.netSalesRef.toFixed(2), 'Ingreso operacional efectivo']);
  rows.push(['ESTADO DE RESULTADOS', '(-) Costo de Ventas (CMV)', data.cogsPrimary.toFixed(2), (data.cogsPrimary * currency.tasaCambio).toFixed(2), 'Costo directo de mercancía']);
  rows.push(['ESTADO DE RESULTADOS', '(=) Utilidad Bruta (Ganancia)', data.grossProfitPrimary.toFixed(2), (data.grossProfitPrimary * currency.tasaCambio).toFixed(2), `Margen Bruto: ${data.grossProfitMarginPercent.toFixed(1)}%`]);
  rows.push(['INDICADORES CLAVE', 'Ticket Promedio', data.avgTicketPrimary.toFixed(2), (data.avgTicketPrimary * currency.tasaCambio).toFixed(2), 'Promedio por cliente']);
  rows.push(['INDICADORES CLAVE', 'Impuestos Recaudados (IVA)', data.taxCollectedPrimary.toFixed(2), (data.taxCollectedPrimary * currency.tasaCambio).toFixed(2), 'Pasivo fiscal']);
  rows.push(['INDICADORES CLAVE', 'Compras a Proveedores en el Período', data.totalPurchasesPrimary.toFixed(2), (data.totalPurchasesPrimary * currency.tasaCambio).toFixed(2), 'Reabastecimiento']);
  rows.push(['VALORIZACIÓN INVENTARIO', 'Activo en Almacén (a Costo)', data.inventoryCostValuation.toFixed(2), (data.inventoryCostValuation * currency.tasaCambio).toFixed(2), 'Capital inmovilizado']);
  rows.push(['VALORIZACIÓN INVENTARIO', 'Proyección de Venta Almacén', data.inventorySaleValuation.toFixed(2), (data.inventorySaleValuation * currency.tasaCambio).toFixed(2), 'Venta potencial']);
  rows.push(['', '', '', '', '']);

  // 2. Métodos de Pago
  rows.push(['MÉTODOS DE PAGO', '--- DESGLOSE DE RECAUDACIÓN ---', '', '', '']);
  data.paymentMethods.forEach((pm) => {
    rows.push([
      'MÉTODO DE PAGO',
      pm.label,
      pm.totalPrimary.toFixed(2),
      (pm.totalPrimary * currency.tasaCambio).toFixed(2),
      `${pm.count} ops (${pm.percentage.toFixed(1)}%)`,
    ]);
  });
  rows.push(['', '', '', '', '']);

  // 3. Top Productos
  rows.push(['TOP PRODUCTOS', '--- PRODUCTOS MÁS VENDIDOS ---', '', '', '']);
  data.topProducts.forEach((tp, idx) => {
    rows.push([
      `TOP #${idx + 1}`,
      `${tp.nombre} [${tp.categoria}]`,
      tp.ingresos.toFixed(2),
      (tp.ingresos * currency.tasaCambio).toFixed(2),
      `${tp.unidades} unidades | Utilidad: $${tp.utilidad.toFixed(2)}`,
    ]);
  });
  rows.push(['', '', '', '', '']);

  // 4. Stock Crítico
  rows.push(['STOCK CRÍTICO', '--- PRODUCTOS EN ALERTA O AGOTADOS ---', '', '', '']);
  data.lowStockItems.forEach((ls) => {
    rows.push([
      'ALERTA STOCK',
      `${ls.nombre} (${ls.codigoBarras})`,
      ls.costoReposicion.toFixed(2),
      (ls.costoReposicion * currency.tasaCambio).toFixed(2),
      `Actual: ${ls.stockActual} / Mín: ${ls.stockMinimo} | Déficit: ${ls.deficit} ${ls.unidadMedida}`,
    ]);
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  exportToCSV(`Dashboard_Contable_${safeCompany}_${dateStr}.csv`, headers, rows);
}

export function exportDashboardReportToPDF(
  data: DashboardExportData,
  currency: CurrencyConfig,
  company: CompanyConfig
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(company.nombre.toUpperCase(), 14, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`RIF: ${company.rif} | NIT: ${company.nit} | Tel: ${company.telefono || 'N/A'}`, 14, 16);
  if (company.direccion) {
    doc.text(`Dirección: ${company.direccion.substring(0, 70)}`, 14, 21);
  }

  // Right Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('REPORTE EJECUTIVO Y CONTABLE', 196, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Período: ${data.periodLabel} | Emisión: ${dateFormatted}`, 196, 16, { align: 'right' });
  doc.text(`Tasa: 1 ${currency.monedaPrincipal.codigo} = ${currency.tasaCambio.toFixed(2)} ${currency.monedaReferencia.codigo}`, 196, 21, { align: 'right' });

  // 6 KPI Metric Cards in 2 rows of 3
  const startY = 29;
  const colW = 58;
  const rowH = 14;

  const kpis = [
    { label: 'VENTAS NETAS', val: formatCurrency(data.netSalesPrimary, currency.monedaPrincipal), sub: formatCurrency(data.netSalesRef, currency.monedaReferencia), bg: [236, 253, 245], border: [16, 185, 129], text: [4, 120, 87] },
    { label: 'UTILIDAD BRUTA (GANANCIA)', val: formatCurrency(data.grossProfitPrimary, currency.monedaPrincipal), sub: `Margen: ${data.grossProfitMarginPercent.toFixed(1)}%`, bg: [238, 242, 255], border: [99, 102, 241], text: [67, 56, 202] },
    { label: 'TICKET PROMEDIO', val: formatCurrency(data.avgTicketPrimary, currency.monedaPrincipal), sub: `${data.totalSalesCount} transacciones`, bg: [248, 250, 252], border: [203, 213, 225], text: [30, 41, 59] },
    { label: 'IMPUESTOS RECAUDADOS', val: formatCurrency(data.taxCollectedPrimary, currency.monedaPrincipal), sub: 'Pasivo IVA período', bg: [254, 242, 242], border: [239, 68, 68], text: [185, 28, 28] },
    { label: 'VALOR ALMACÉN (COSTO)', val: formatCurrency(data.inventoryCostValuation, currency.monedaPrincipal), sub: `Venta Proy: ${formatCurrency(data.inventorySaleValuation, currency.monedaPrincipal)}`, bg: [254, 249, 195], border: [234, 179, 8], text: [161, 98, 7] },
    { label: 'COMPRAS DEL PERÍODO', val: formatCurrency(data.totalPurchasesPrimary, currency.monedaPrincipal), sub: 'Gasto a Proveedores', bg: [240, 249, 255], border: [56, 189, 248], text: [3, 105, 161] },
  ];

  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 14 + col * (colW + 4);
    const y = startY + row * (rowH + 3);

    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.roundedRect(x, y, colW, rowH, 1.5, 1.5, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 2.5, y + 4);

    doc.setFontSize(9);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, x + 2.5, y + 9);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 2.5, y + 12.5);
  });

  // Section 1: Estado de Resultados Simplificado
  const plStartY = startY + 2 * (rowH + 3) + 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADO DE RESULTADOS OPERATIVO (P&L)', 14, plStartY);

  const plRows = [
    ['(+) Ventas Brutas Totales', `${data.totalSalesCount} transacciones registradas`, formatCurrency(data.grossSalesPrimary, currency.monedaPrincipal), formatCurrency(data.grossSalesRef, currency.monedaReferencia)],
    ['(-) Devoluciones y Reembolsos', 'Notas de crédito aplicadas', `-${formatCurrency(data.refundsPrimary, currency.monedaPrincipal)}`, `-${formatCurrency(data.refundsRef, currency.monedaReferencia)}`],
    ['(=) Ventas Netas Totales', 'Base de ingreso neto', formatCurrency(data.netSalesPrimary, currency.monedaPrincipal), formatCurrency(data.netSalesRef, currency.monedaReferencia)],
    ['(-) Costo de Mercancía Vendida (CMV)', 'Costo directo de adquisición de lo vendido', `-${formatCurrency(data.cogsPrimary, currency.monedaPrincipal)}`, `-${formatCurrency(data.cogsPrimary * currency.tasaCambio, currency.monedaReferencia)}`],
    ['(=) Utilidad Bruta Operativa', `Margen Comercial Bruto: ${data.grossProfitMarginPercent.toFixed(1)}%`, formatCurrency(data.grossProfitPrimary, currency.monedaPrincipal), formatCurrency(data.grossProfitPrimary * currency.tasaCambio, currency.monedaReferencia)],
  ];

  autoTable(doc, {
    startY: plStartY + 2,
    head: [['CONCEPTO CONTABLE', 'DESCRIPCIÓN OPERACIONAL', `TOTAL (${currency.monedaPrincipal.codigo})`, `TOTAL (${currency.monedaReferencia.codigo})`]],
    body: plRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 65 },
      2: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 31, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Section 2: Métodos de Pago & Top Productos (Side by side or stacked)
  let currentY = (doc as any).lastAutoTable.finalY + 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RECAUDACIÓN POR MÉTODO DE PAGO', 14, currentY);

  const paymentRows = data.paymentMethods.map((pm) => [
    pm.label,
    `${pm.count} transacciones`,
    `${pm.percentage.toFixed(1)}%`,
    formatCurrency(pm.totalPrimary, currency.monedaPrincipal),
    formatCurrency(pm.totalPrimary * currency.tasaCambio, currency.monedaReferencia),
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['MÉTODO DE PAGO', 'OPERACIONES', '% PARTICIPACIÓN', `TOTAL (${currency.monedaPrincipal.codigo})`, `TOTAL (${currency.monedaReferencia.codigo})`]],
    body: paymentRows,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 27, halign: 'center' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 35, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Section 3: Top Productos Más Vendidos
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOP PRODUCTOS MÁS VENDIDOS DEL PERÍODO', 14, currentY);

  const topProdRows = data.topProducts.slice(0, 7).map((p, idx) => [
    `#${idx + 1}`,
    p.nombre,
    p.categoria,
    `${p.unidades} und`,
    formatCurrency(p.ingresos, currency.monedaPrincipal),
    formatCurrency(p.utilidad, currency.monedaPrincipal),
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['#', 'PRODUCTO', 'CATEGORÍA', 'UNIDADES', `VENTAS (${currency.monedaPrincipal.codigo})`, `UTILIDAD (${currency.monedaPrincipal.codigo})`]],
    body: topProdRows.length > 0 ? topProdRows : [['-', 'No hay ventas en este período', '-', '0', '$0.00', '$0.00']],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 62, fontStyle: 'bold' },
      2: { cellWidth: 35 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 25, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Section 4: Alertas de Stock Bajo (if space permits or on same page)
  if (currentY < 235 && data.lowStockItems.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('ALERTAS DE STOCK CRÍTICO / REPOSICIÓN URGENTE', 14, currentY);

    const stockRows = data.lowStockItems.slice(0, 5).map((item) => [
      item.codigoBarras,
      item.nombre,
      `${item.stockActual} ${item.unidadMedida}`,
      `${item.stockMinimo} ${item.unidadMedida}`,
      `${item.deficit} ${item.unidadMedida}`,
      formatCurrency(item.costoReposicion, currency.monedaPrincipal),
    ]);

    autoTable(doc, {
      startY: currentY + 2,
      head: [['SKU', 'PRODUCTO', 'STOCK ACTUAL', 'MÍNIMO', 'DÉFICIT', `COSTO REPOSICIÓN (${currency.monedaPrincipal.codigo})`]],
      body: stockRows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 1.3 },
      columnStyles: {
        0: { cellWidth: 28, font: 'courier' },
        1: { cellWidth: 64, fontStyle: 'bold' },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
        5: { cellWidth: 22, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [254, 242, 242] },
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Informe Contable & Gerencial - ${company.nombre} - Página ${i} de ${pageCount}`, 14, 290);
    doc.text(`Generado el ${dateFormatted}`, 196, 290, { align: 'right' });
  }

  const dateStr = now.toISOString().split('T')[0];
  const safeCompany = company.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Reporte_Dashboard_Contable_${safeCompany}_${dateStr}.pdf`);
}

