import React, { useState, useMemo } from 'react';
import {
  Sale,
  Product,
  Category,
  Purchase,
  Refund,
  CurrencyConfig,
  CompanyConfig,
  User,
  Tax,
} from '../types';
import { formatCurrency, convertToRef } from '../utils/formatters';
import {
  exportDashboardToCSV,
  exportDashboardReportToPDF,
  DashboardExportData,
} from '../utils/exportUtils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  ShoppingCart,
  AlertTriangle,
  Package,
  Boxes,
  FileSpreadsheet,
  FileText,
  Calendar,
  RefreshCw,
  Award,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  ShieldCheck,
  Percent,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Search,
} from 'lucide-react';

export type DateFilterType =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'THIS_MONTH'
  | 'LAST_30_DAYS'
  | 'THIS_YEAR'
  | 'ALL'
  | 'CUSTOM';

interface DashboardModuleProps {
  sales: Sale[];
  products: Product[];
  categories: Category[];
  purchases: Purchase[];
  refunds: Refund[];
  currency: CurrencyConfig;
  company: CompanyConfig;
  users?: User[];
  taxes?: Tax[];
  onNavigateTab?: (tab: any) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  sales,
  products,
  categories,
  purchases,
  refunds,
  currency,
  company,
  users = [],
  taxes = [],
  onNavigateTab,
}) => {
  // Period filter state
  const [dateFilter, setDateFilter] = useState<DateFilterType>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Active view within Dashboard
  const [activeSubView, setActiveSubView] = useState<'OVERVIEW' | 'STOCK_ALERTS' | 'PAYMENTS' | 'SELLERS'>('OVERVIEW');
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  // Map categories for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.nombre));
    return map;
  }, [categories]);

  // Map products for fast lookup
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Calculate Date Boundaries
  const { startTimestamp, endTimestamp, filterLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date();
    let label = 'Historial Completo';

    switch (dateFilter) {
      case 'TODAY': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = 'Hoy';
        break;
      }
      case 'YESTERDAY': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
        end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
        label = 'Ayer';
        break;
      }
      case 'LAST_7_DAYS': {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        label = 'Últimos 7 Días';
        break;
      }
      case 'THIS_MONTH': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        label = now.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
        label = label.charAt(0).toUpperCase() + label.slice(1);
        break;
      }
      case 'LAST_30_DAYS': {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        label = 'Últimos 30 Días';
        break;
      }
      case 'THIS_YEAR': {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        label = `Año ${now.getFullYear()}`;
        break;
      }
      case 'CUSTOM': {
        if (customStartDate) {
          start = new Date(`${customStartDate}T00:00:00`);
        }
        if (customEndDate) {
          end = new Date(`${customEndDate}T23:59:59.999`);
        }
        label = `Del ${customStartDate} al ${customEndDate}`;
        break;
      }
      case 'ALL':
      default:
        start = new Date(0);
        label = 'Historial Completo';
        break;
    }

    return {
      startTimestamp: start.getTime(),
      endTimestamp: end.getTime(),
      filterLabel: label,
    };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filter Sales in Period
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const t = new Date(s.fecha).getTime();
      return t >= startTimestamp && t <= endTimestamp;
    });
  }, [sales, startTimestamp, endTimestamp]);

  // Filter Purchases in Period
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const t = new Date(p.fecha).getTime();
      return t >= startTimestamp && t <= endTimestamp;
    });
  }, [purchases, startTimestamp, endTimestamp]);

  // Filter Refunds in Period
  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const t = new Date(r.fecha).getTime();
      return t >= startTimestamp && t <= endTimestamp;
    });
  }, [refunds, startTimestamp, endTimestamp]);

  // =========================================================================
  // FINANCIAL CALCULATIONS & ACCOUNTING METRICS
  // =========================================================================
  const financialSummary = useMemo(() => {
    let grossSalesPrimary = 0;
    let grossSalesRef = 0;
    let totalTaxCollectedPrimary = 0;
    let totalTaxCollectedRef = 0;
    let totalItemsSold = 0;
    let cogsPrimary = 0; // Cost of Goods Sold

    filteredSales.forEach((sale) => {
      grossSalesPrimary += sale.totalPrincipal;
      grossSalesRef += sale.totalReferencia;
      totalTaxCollectedPrimary += sale.impuestosPrincipal;
      totalTaxCollectedRef += sale.impuestosReferencia;

      sale.items.forEach((item) => {
        totalItemsSold += item.cantidad;
        // Lookup cost
        const prod = productMap.get(item.producto.id);
        const costUnit = item.variante?.precioCompra !== undefined && item.variante?.precioCompra > 0
          ? item.variante.precioCompra
          : prod?.precioCompra || item.producto.precioCompra || 0;
        cogsPrimary += costUnit * item.cantidad;
      });
    });

    // Total Refunds
    let refundsPrimary = 0;
    let refundsRef = 0;
    filteredRefunds.forEach((r) => {
      refundsPrimary += r.totalPrincipal;
      refundsRef += r.totalReferencia;
    });

    // Net Sales = Gross Sales - Refunds
    const netSalesPrimary = Math.max(0, grossSalesPrimary - refundsPrimary);
    const netSalesRef = Math.max(0, grossSalesRef - refundsRef);

    // Gross Profit = Net Sales - COGS
    const grossProfitPrimary = netSalesPrimary - cogsPrimary;
    const grossProfitMarginPercent = netSalesPrimary > 0
      ? (grossProfitPrimary / netSalesPrimary) * 100
      : 0;

    // Average Ticket
    const avgTicketPrimary = filteredSales.length > 0
      ? grossSalesPrimary / filteredSales.length
      : 0;
    const avgTicketRef = filteredSales.length > 0
      ? grossSalesRef / filteredSales.length
      : 0;

    // Total Purchases to Suppliers in Period
    let totalPurchasesPrimary = 0;
    let totalPurchasesRef = 0;
    filteredPurchases.forEach((p) => {
      totalPurchasesPrimary += p.totalPrincipal;
      totalPurchasesRef += p.totalReferencia;
    });

    return {
      salesCount: filteredSales.length,
      grossSalesPrimary,
      grossSalesRef,
      refundsPrimary,
      refundsRef,
      netSalesPrimary,
      netSalesRef,
      cogsPrimary,
      grossProfitPrimary,
      grossProfitMarginPercent,
      avgTicketPrimary,
      avgTicketRef,
      totalTaxCollectedPrimary,
      totalTaxCollectedRef,
      totalItemsSold,
      totalPurchasesPrimary,
      totalPurchasesRef,
    };
  }, [filteredSales, filteredRefunds, filteredPurchases, productMap]);

  // =========================================================================
  // INVENTORY VALUATION & CRITICAL STOCK ALERTS
  // =========================================================================
  const inventoryStats = useMemo(() => {
    let costValuation = 0;
    let saleValuation = 0;
    let totalStockUnits = 0;
    let totalLowStockCount = 0;
    let totalOutOfStockCount = 0;

    const criticalItems: {
      codigoBarras: string;
      nombre: string;
      stockActual: number;
      stockMinimo: number;
      unidadMedida: string;
      costoUnitario: number;
      precioVenta: number;
      deficit: number;
      costoReposicion: number;
      isOutOfStock: boolean;
    }[] = [];

    products.forEach((prod) => {
      if (!prod.activo) return;

      costValuation += prod.stockActual * prod.precioCompra;
      saleValuation += prod.stockActual * prod.precioVenta;
      totalStockUnits += prod.stockActual;

      const isOut = prod.stockActual <= 0;
      const isLow = prod.stockActual > 0 && prod.stockActual <= prod.stockMinimo;

      if (isOut) {
        totalOutOfStockCount++;
      } else if (isLow) {
        totalLowStockCount++;
      }

      if (isOut || isLow) {
        const targetStock = Math.max(prod.stockMinimo * 2, prod.stockMinimo + 5);
        const deficit = Math.max(0, targetStock - prod.stockActual);
        criticalItems.push({
          codigoBarras: prod.codigoBarras,
          nombre: prod.nombre,
          stockActual: prod.stockActual,
          stockMinimo: prod.stockMinimo,
          unidadMedida: prod.unidadMedida,
          costoUnitario: prod.precioCompra,
          precioVenta: prod.precioVenta,
          deficit,
          costoReposicion: deficit * prod.precioCompra,
          isOutOfStock: isOut,
        });
      }
    });

    // Sort critical items: Out of stock first, then highest deficit
    criticalItems.sort((a, b) => {
      if (a.isOutOfStock && !b.isOutOfStock) return -1;
      if (!a.isOutOfStock && b.isOutOfStock) return 1;
      return b.costoReposicion - a.costoReposicion;
    });

    const potentialProfit = saleValuation - costValuation;
    const potentialMarginPercent = costValuation > 0
      ? (potentialProfit / costValuation) * 100
      : 0;

    return {
      costValuation,
      saleValuation,
      potentialProfit,
      potentialMarginPercent,
      totalStockUnits,
      totalLowStockCount,
      totalOutOfStockCount,
      criticalItems,
      totalProductsCount: products.filter((p) => p.activo).length,
    };
  }, [products]);

  // =========================================================================
  // TOP SELLING PRODUCTS RANKING
  // =========================================================================
  const topProducts = useMemo(() => {
    const productStats = new Map<
      string,
      {
        id: string;
        nombre: string;
        categoria: string;
        unidades: number;
        ingresos: number;
        utilidad: number;
      }
    >();

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = productMap.get(item.producto.id);
        const key = item.producto.id;
        const current = productStats.get(key) || {
          id: item.producto.id,
          nombre: item.producto.nombre,
          categoria: categoryMap.get(item.producto.categoriaId) || 'General',
          unidades: 0,
          ingresos: 0,
          utilidad: 0,
        };

        const costUnit = item.variante?.precioCompra !== undefined && item.variante?.precioCompra > 0
          ? item.variante.precioCompra
          : prod?.precioCompra || item.producto.precioCompra || 0;

        current.unidades += item.cantidad;
        current.ingresos += item.subtotal;
        current.utilidad += (item.precioUnitario - costUnit) * item.cantidad;

        productStats.set(key, current);
      });
    });

    const list = Array.from(productStats.values());
    list.sort((a, b) => b.unidades - a.unidades);
    return list;
  }, [filteredSales, productMap, categoryMap]);

  // =========================================================================
  // PAYMENT METHODS BREAKDOWN
  // =========================================================================
  const paymentMethodsBreakdown = useMemo(() => {
    const breakdown: Record<
      string,
      { label: string; count: number; totalPrimary: number; icon: any }
    > = {
      EFECTIVO_PRINCIPAL: {
        label: `Efectivo (${currency.monedaPrincipal.codigo})`,
        count: 0,
        totalPrimary: 0,
        icon: Banknote,
      },
      EFECTIVO_REFERENCIA: {
        label: `Efectivo (${currency.monedaReferencia.codigo})`,
        count: 0,
        totalPrimary: 0,
        icon: Banknote,
      },
      TARJETA: {
        label: 'Punto de Venta / Tarjeta',
        count: 0,
        totalPrimary: 0,
        icon: CreditCard,
      },
      PAGO_MOVIL_TRANSFERENCIA: {
        label: 'Pago Móvil / Transferencia',
        count: 0,
        totalPrimary: 0,
        icon: Smartphone,
      },
      MIXTO: {
        label: 'Pago Mixto / Combinado',
        count: 0,
        totalPrimary: 0,
        icon: Layers,
      },
    };

    let grandTotal = 0;

    filteredSales.forEach((sale) => {
      const method = sale.pago?.metodo || 'EFECTIVO_PRINCIPAL';
      if (breakdown[method]) {
        breakdown[method].count += 1;
        breakdown[method].totalPrimary += sale.totalPrincipal;
      } else {
        breakdown.EFECTIVO_PRINCIPAL.count += 1;
        breakdown.EFECTIVO_PRINCIPAL.totalPrimary += sale.totalPrincipal;
      }
      grandTotal += sale.totalPrincipal;
    });

    return Object.entries(breakdown).map(([key, data]) => ({
      method: key,
      label: data.label,
      count: data.count,
      totalPrimary: data.totalPrimary,
      icon: data.icon,
      percentage: grandTotal > 0 ? (data.totalPrimary / grandTotal) * 100 : 0,
    }));
  }, [filteredSales, currency]);

  // =========================================================================
  // SALES BY SELLER / CASHIER
  // =========================================================================
  const sellerPerformance = useMemo(() => {
    const sellers = new Map<
      string,
      { id: string; name: string; salesCount: number; totalPrimary: number }
    >();

    filteredSales.forEach((sale) => {
      const key = sale.vendedorId || 'Desconocido';
      const current = sellers.get(key) || {
        id: key,
        name: sale.vendedorNombre || 'Cajero',
        salesCount: 0,
        totalPrimary: 0,
      };

      current.salesCount += 1;
      current.totalPrimary += sale.totalPrincipal;
      sellers.set(key, current);
    });

    const list = Array.from(sellers.values());
    list.sort((a, b) => b.totalPrimary - a.totalPrimary);
    return list;
  }, [filteredSales]);

  // =========================================================================
  // DAILY SALES TREND FOR VISUAL CHART
  // =========================================================================
  const salesTimelineChart = useMemo(() => {
    const daysMap = new Map<string, { label: string; amount: number; count: number }>();

    // If dateFilter is TODAY or YESTERDAY, group by 2-hour slots
    const isSingleDay = dateFilter === 'TODAY' || dateFilter === 'YESTERDAY';

    if (isSingleDay) {
      for (let h = 8; h <= 20; h += 2) {
        const slotKey = `${h}:00`;
        daysMap.set(slotKey, { label: slotKey, amount: 0, count: 0 });
      }

      filteredSales.forEach((s) => {
        const d = new Date(s.fecha);
        const hour = d.getHours();
        const slotHour = Math.floor(hour / 2) * 2;
        const slotKey = `${Math.max(8, Math.min(20, slotHour))}:00`;
        const entry = daysMap.get(slotKey) || { label: slotKey, amount: 0, count: 0 };
        entry.amount += s.totalPrincipal;
        entry.count += 1;
        daysMap.set(slotKey, entry);
      });
    } else {
      // Group by date (last 14 days or filtered days)
      filteredSales.forEach((s) => {
        const d = new Date(s.fecha);
        const dayKey = d.toLocaleDateString('es-VE', { month: 'numeric', day: 'numeric' });
        const entry = daysMap.get(dayKey) || { label: dayKey, amount: 0, count: 0 };
        entry.amount += s.totalPrincipal;
        entry.count += 1;
        daysMap.set(dayKey, entry);
      });
    }

    const dataPoints = Array.from(daysMap.values());
    const maxAmount = Math.max(...dataPoints.map((d) => d.amount), 1);

    return {
      dataPoints,
      maxAmount,
    };
  }, [filteredSales, dateFilter]);

  // Handler for Exporting CSV
  const handleExportCSV = () => {
    const exportData: DashboardExportData = {
      periodLabel: filterLabel,
      totalSalesCount: financialSummary.salesCount,
      grossSalesPrimary: financialSummary.grossSalesPrimary,
      grossSalesRef: financialSummary.grossSalesRef,
      refundsPrimary: financialSummary.refundsPrimary,
      refundsRef: financialSummary.refundsRef,
      netSalesPrimary: financialSummary.netSalesPrimary,
      netSalesRef: financialSummary.netSalesRef,
      cogsPrimary: financialSummary.cogsPrimary,
      grossProfitPrimary: financialSummary.grossProfitPrimary,
      grossProfitMarginPercent: financialSummary.grossProfitMarginPercent,
      avgTicketPrimary: financialSummary.avgTicketPrimary,
      taxCollectedPrimary: financialSummary.totalTaxCollectedPrimary,
      totalPurchasesPrimary: financialSummary.totalPurchasesPrimary,
      inventoryCostValuation: inventoryStats.costValuation,
      inventorySaleValuation: inventoryStats.saleValuation,
      paymentMethods: paymentMethodsBreakdown.map((pm) => ({
        method: pm.method,
        label: pm.label,
        count: pm.count,
        totalPrimary: pm.totalPrimary,
        percentage: pm.percentage,
      })),
      topProducts: topProducts.slice(0, 15).map((p) => ({
        nombre: p.nombre,
        categoria: p.categoria,
        unidades: p.unidades,
        ingresos: p.ingresos,
        utilidad: p.utilidad,
      })),
      lowStockItems: inventoryStats.criticalItems.map((c) => ({
        codigoBarras: c.codigoBarras,
        nombre: c.nombre,
        stockActual: c.stockActual,
        stockMinimo: c.stockMinimo,
        unidadMedida: c.unidadMedida,
        costoUnitario: c.costoUnitario,
        deficit: c.deficit,
        costoReposicion: c.costoReposicion,
      })),
    };

    exportDashboardToCSV(exportData, currency, company);
  };

  // Handler for Exporting PDF Report
  const handleExportPDF = () => {
    const exportData: DashboardExportData = {
      periodLabel: filterLabel,
      totalSalesCount: financialSummary.salesCount,
      grossSalesPrimary: financialSummary.grossSalesPrimary,
      grossSalesRef: financialSummary.grossSalesRef,
      refundsPrimary: financialSummary.refundsPrimary,
      refundsRef: financialSummary.refundsRef,
      netSalesPrimary: financialSummary.netSalesPrimary,
      netSalesRef: financialSummary.netSalesRef,
      cogsPrimary: financialSummary.cogsPrimary,
      grossProfitPrimary: financialSummary.grossProfitPrimary,
      grossProfitMarginPercent: financialSummary.grossProfitMarginPercent,
      avgTicketPrimary: financialSummary.avgTicketPrimary,
      taxCollectedPrimary: financialSummary.totalTaxCollectedPrimary,
      totalPurchasesPrimary: financialSummary.totalPurchasesPrimary,
      inventoryCostValuation: inventoryStats.costValuation,
      inventorySaleValuation: inventoryStats.saleValuation,
      paymentMethods: paymentMethodsBreakdown.map((pm) => ({
        method: pm.method,
        label: pm.label,
        count: pm.count,
        totalPrimary: pm.totalPrimary,
        percentage: pm.percentage,
      })),
      topProducts: topProducts.slice(0, 15).map((p) => ({
        nombre: p.nombre,
        categoria: p.categoria,
        unidades: p.unidades,
        ingresos: p.ingresos,
        utilidad: p.utilidad,
      })),
      lowStockItems: inventoryStats.criticalItems.map((c) => ({
        codigoBarras: c.codigoBarras,
        nombre: c.nombre,
        stockActual: c.stockActual,
        stockMinimo: c.stockMinimo,
        unidadMedida: c.unidadMedida,
        costoUnitario: c.costoUnitario,
        deficit: c.deficit,
        costoReposicion: c.costoReposicion,
      })),
    };

    exportDashboardReportToPDF(exportData, currency, company);
  };

  // Filtered critical items based on search input
  const filteredCriticalItems = useMemo(() => {
    if (!stockSearchTerm.trim()) return inventoryStats.criticalItems;
    const q = stockSearchTerm.toLowerCase();
    return inventoryStats.criticalItems.filter(
      (it) => it.nombre.toLowerCase().includes(q) || it.codigoBarras.toLowerCase().includes(q)
    );
  }, [inventoryStats.criticalItems, stockSearchTerm]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Header & Filter Controls Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex-shrink-0 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Live Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Dashboard de Control Gerencial & Estadísticas
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Resumen financiero, control contable de ventas, costos, inventario y rendimiento
              </p>
            </div>
          </div>

          {/* Quick Period Selectors & Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period selector dropdown / pills */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDateFilter('TODAY')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  dateFilter === 'TODAY'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('LAST_7_DAYS')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  dateFilter === 'LAST_7_DAYS'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                7 Días
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('THIS_MONTH')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  dateFilter === 'THIS_MONTH'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('THIS_YEAR')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  dateFilter === 'THIS_YEAR'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Año
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  dateFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('CUSTOM')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  dateFilter === 'CUSTOM'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Rango
              </button>
            </div>

            {/* Custom Date Pickers */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-slate-800 text-xs font-medium focus:outline-none"
                />
                <span className="text-slate-400">a</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-slate-800 text-xs font-medium focus:outline-none"
                />
              </div>
            )}

            {/* Export Actions */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Exportar Resumen Contable a Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Descargar Reporte Ejecutivo en PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Informe PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-navigation tabs inside Dashboard */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubView('OVERVIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubView === 'OVERVIEW'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Resumen Financiero & Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('STOCK_ALERTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubView === 'STOCK_ALERTS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Alertas de Stock & Reposición</span>
            {(inventoryStats.totalOutOfStockCount > 0 || inventoryStats.totalLowStockCount > 0) && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full">
                {inventoryStats.totalOutOfStockCount + inventoryStats.totalLowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('PAYMENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubView === 'PAYMENTS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            <span>Caja & Métodos de Pago</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('SELLERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubView === 'SELLERS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Rendimiento Cajeros ({sellerPerformance.length})</span>
          </button>

          <div className="ml-auto text-xs text-slate-500 hidden md:block">
            Período analizado: <strong className="text-slate-800">{filterLabel}</strong>
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ================================================================= */}
        {/* 1. PRIMARY KPI METRIC CARDS (Always visible)                      */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Ventas Netas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-emerald-300 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ventas Netas Totales
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(financialSummary.netSalesPrimary, currency.monedaPrincipal)}
              </div>
              <div className="text-xs font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                <span>Ref:</span>
                <span>{formatCurrency(financialSummary.netSalesRef, currency.monedaReferencia)}</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{financialSummary.salesCount} tickets cobrados</span>
              <span className="font-mono text-[11px] text-slate-600">
                {financialSummary.totalItemsSold} unds
              </span>
            </div>
          </div>

          {/* Card 2: Utilidad Bruta & Margen */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-indigo-300 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Utilidad Bruta (Ganancia)
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-indigo-950 tracking-tight">
                {formatCurrency(financialSummary.grossProfitPrimary, currency.monedaPrincipal)}
              </div>
              <div className="text-xs font-semibold text-indigo-700 mt-0.5 flex items-center gap-1">
                <span>Margen Bruto:</span>
                <span className="font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                  {financialSummary.grossProfitMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>CMV (Costo):</span>
              <span className="font-mono font-bold text-slate-700">
                {formatCurrency(financialSummary.cogsPrimary, currency.monedaPrincipal)}
              </span>
            </div>
          </div>

          {/* Card 3: Ticket Promedio & Impuestos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ticket Promedio
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(financialSummary.avgTicketPrimary, currency.monedaPrincipal)}
              </div>
              <div className="text-xs font-semibold text-blue-700 mt-0.5">
                Ref: {formatCurrency(financialSummary.avgTicketRef, currency.monedaReferencia)}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>IVA Recaudado:</span>
              <span className="font-mono font-bold text-slate-700">
                {formatCurrency(financialSummary.totalTaxCollectedPrimary, currency.monedaPrincipal)}
              </span>
            </div>
          </div>

          {/* Card 4: Valorización de Inventario */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-amber-300 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Valor Total Almacén
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(inventoryStats.costValuation, currency.monedaPrincipal)}
              </div>
              <div className="text-xs font-semibold text-amber-700 mt-0.5">
                Venta Proyectada: {formatCurrency(inventoryStats.saleValuation, currency.monedaPrincipal)}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{inventoryStats.totalStockUnits.toLocaleString()} unidades</span>
              {inventoryStats.totalOutOfStockCount > 0 ? (
                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  {inventoryStats.totalOutOfStockCount} agotados
                </span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Stock óptimo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUBVIEW 1: OVERVIEW (General Financial & Sales Insights)          */}
        {/* ================================================================= */}
        {activeSubView === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Row: Sales Trend Chart & Simplified P&L */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Trend Chart (2 Cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Evolución de Ingresos ({currency.monedaPrincipal.codigo})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tendencia de recaudación por ventas durante {filterLabel}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                      Pico: {formatCurrency(salesTimelineChart.maxAmount, currency.monedaPrincipal)}
                    </span>
                  </div>

                  {salesTimelineChart.dataPoints.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs font-medium">No se registraron ventas en el período seleccionado</p>
                    </div>
                  ) : (
                    <div className="pt-4">
                      {/* Bar Visualization */}
                      <div className="h-40 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
                        {salesTimelineChart.dataPoints.map((dp, idx) => {
                          const heightPct = Math.max(
                            8,
                            Math.round((dp.amount / salesTimelineChart.maxAmount) * 100)
                          );
                          return (
                            <div
                              key={idx}
                              className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center group relative cursor-pointer"
                            >
                              {/* Hover Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                                {dp.label}: {formatCurrency(dp.amount, currency.monedaPrincipal)} ({dp.count} vtas)
                              </div>

                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-t-lg transition-all duration-300 ${
                                  dp.amount > 0
                                    ? 'bg-emerald-500 group-hover:bg-emerald-600 group-hover:shadow-md'
                                    : 'bg-slate-200'
                                }`}
                              />
                              <span className="text-[9.5px] font-semibold text-slate-500 mt-2 truncate w-full text-center">
                                {dp.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Ingresos facturados
                  </span>
                  <span className="font-mono text-slate-700 font-bold">
                    Total: {formatCurrency(financialSummary.grossSalesPrimary, currency.monedaPrincipal)}
                  </span>
                </div>
              </div>

              {/* Simplified P&L / Estado de Resultados (1 Col) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Estado de Resultados (P&L)
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Balance contable operativo del período
                  </p>

                  <div className="space-y-2.5 text-xs">
                    {/* Ventas Brutas */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">(+) Ventas Brutas</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(financialSummary.grossSalesPrimary, currency.monedaPrincipal)}
                      </span>
                    </div>

                    {/* Devoluciones */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100 text-rose-600">
                      <span className="font-medium">(-) Devoluciones / Reembolsos</span>
                      <span className="font-mono font-bold">
                        -{formatCurrency(financialSummary.refundsPrimary, currency.monedaPrincipal)}
                      </span>
                    </div>

                    {/* Ventas Netas */}
                    <div className="flex items-center justify-between py-1 bg-slate-50 px-2 rounded-lg font-bold text-slate-800">
                      <span>(=) Ventas Netas Operativas</span>
                      <span className="font-mono text-emerald-700">
                        {formatCurrency(financialSummary.netSalesPrimary, currency.monedaPrincipal)}
                      </span>
                    </div>

                    {/* Costo Mercancía */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span className="font-medium">(-) Costo de Ventas (CMV)</span>
                      <span className="font-mono font-bold text-slate-800">
                        -{formatCurrency(financialSummary.cogsPrimary, currency.monedaPrincipal)}
                      </span>
                    </div>

                    {/* Utilidad Bruta */}
                    <div className="flex items-center justify-between py-2 bg-indigo-50 border border-indigo-200 px-3 rounded-xl font-black text-indigo-950">
                      <span>(=) Utilidad Bruta</span>
                      <span className="font-mono text-sm text-indigo-700">
                        {formatCurrency(financialSummary.grossProfitPrimary, currency.monedaPrincipal)}
                      </span>
                    </div>

                    {/* Compras a Proveedores */}
                    <div className="flex items-center justify-between py-1 border-t border-slate-100 text-slate-500 text-[11px] pt-2">
                      <span>Inversión en Compras (Proveedores):</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {formatCurrency(financialSummary.totalPurchasesPrimary, currency.monedaPrincipal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Margen de Ganancia:</span>
                  <span className="font-bold text-indigo-700">
                    {financialSummary.grossProfitMarginPercent.toFixed(1)}% sobre ventas netas
                  </span>
                </div>
              </div>
            </div>

            {/* Row: Top Selling Products & Methods Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Selling Products (2 Cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Top Productos Más Vendidos
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    {topProducts.length} productos con rotación
                  </span>
                </div>

                {topProducts.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">Aún no se registran ventas en este período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 w-12 text-center">#</th>
                          <th className="px-4 py-2.5">Producto & Categoría</th>
                          <th className="px-4 py-2.5 text-right">Unidades</th>
                          <th className="px-4 py-2.5 text-right">Ingresos ({currency.monedaPrincipal.codigo})</th>
                          <th className="px-4 py-2.5 text-right">Utilidad ({currency.monedaPrincipal.codigo})</th>
                          <th className="px-4 py-2.5 w-28">Participación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {topProducts.slice(0, 7).map((prod, idx) => {
                          const totalRevenue = financialSummary.grossSalesPrimary || 1;
                          const sharePct = Math.min(100, Math.round((prod.ingresos / totalRevenue) * 100));

                          return (
                            <tr key={prod.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                                    idx === 0
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : idx === 1
                                      ? 'bg-slate-200 text-slate-700'
                                      : idx === 2
                                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900">{prod.nombre}</div>
                                <div className="text-[11px] text-slate-500">{prod.categoria}</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                                {prod.unidades} und
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                                {formatCurrency(prod.ingresos, currency.monedaPrincipal)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-indigo-700 font-semibold">
                                {formatCurrency(prod.utilidad, currency.monedaPrincipal)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${sharePct}%` }}
                                      className="h-full bg-emerald-500 rounded-full"
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-500 w-7 text-right">
                                    {sharePct}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment Methods Breakdown (1 Col) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Ventas por Forma de Pago
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Distribución de fondos ingresados a caja
                  </p>

                  <div className="space-y-3">
                    {paymentMethodsBreakdown.map((pm) => {
                      const Icon = pm.icon;
                      return (
                        <div key={pm.method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-slate-500" />
                              {pm.label}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatCurrency(pm.totalPrimary, currency.monedaPrincipal)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pm.percentage}%` }}
                                className="h-full bg-emerald-500 rounded-full transition-all"
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 w-12 text-right">
                              {pm.percentage.toFixed(1)}% ({pm.count})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Total Recaudado:</span>
                  <span className="font-mono font-black text-slate-900">
                    {formatCurrency(financialSummary.grossSalesPrimary, currency.monedaPrincipal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUBVIEW 2: STOCK ALERTS & REPLENISHMENT                           */}
        {/* ================================================================= */}
        {activeSubView === 'STOCK_ALERTS' && (
          <div className="space-y-4">
            {/* Top Critical Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-rose-950">
                    {inventoryStats.totalOutOfStockCount}
                  </div>
                  <div className="text-xs font-bold text-rose-700">Productos Agotados (Stock 0)</div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-950">
                    {inventoryStats.totalLowStockCount}
                  </div>
                  <div className="text-xs font-bold text-amber-700">Productos con Stock Mínimo</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-black text-blue-950">
                    {formatCurrency(
                      inventoryStats.criticalItems.reduce((s, it) => s + it.costoReposicion, 0),
                      currency.monedaPrincipal
                    )}
                  </div>
                  <div className="text-xs font-bold text-blue-700">Presupuesto Sugerido de Reorden</div>
                </div>
              </div>
            </div>

            {/* Critical Inventory Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Lista de Reposición Urgente ({inventoryStats.criticalItems.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Productos que requieren pedido inmediato a proveedores para evitar quiebre de stock
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código..."
                      value={stockSearchTerm}
                      onChange={(e) => setStockSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('compras')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                    >
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ir a Compras</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredCriticalItems.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">¡Almacén en perfecto estado!</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    No hay productos agotados ni por debajo del stock mínimo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Código / SKU</th>
                        <th className="px-4 py-2.5">Producto</th>
                        <th className="px-4 py-2.5 text-center">Estado</th>
                        <th className="px-4 py-2.5 text-right">Stock Actual</th>
                        <th className="px-4 py-2.5 text-right">Stock Mínimo</th>
                        <th className="px-4 py-2.5 text-right">Déficit Sugerido</th>
                        <th className="px-4 py-2.5 text-right">Costo Unitario</th>
                        <th className="px-4 py-2.5 text-right">Presupuesto Reorden</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCriticalItems.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 transition ${
                            item.isOutOfStock ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                            {item.codigoBarras}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {item.nombre}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                AGOTADO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                STOCK BAJO
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            <span className={item.isOutOfStock ? 'text-rose-600' : 'text-amber-600'}>
                              {item.stockActual} {item.unidadMedida}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {item.stockMinimo} {item.unidadMedida}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-slate-800">
                            +{item.deficit} {item.unidadMedida}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {formatCurrency(item.costoUnitario, currency.monedaPrincipal)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-blue-700">
                            {formatCurrency(item.costoReposicion, currency.monedaPrincipal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUBVIEW 3: PAYMENTS & CASH FLOW                                   */}
        {/* ================================================================= */}
        {activeSubView === 'PAYMENTS' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethodsBreakdown.map((pm) => {
                const Icon = pm.icon;
                return (
                  <div
                    key={pm.method}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">{pm.label}</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {formatCurrency(pm.totalPrimary, currency.monedaPrincipal)}
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                        Ref: {formatCurrency(pm.totalPrimary * currency.tasaCambio, currency.monedaReferencia)}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>{pm.count} operaciones</span>
                      <span className="font-bold text-slate-800">{pm.percentage.toFixed(1)}% de la caja</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reconciliation Note Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  Arqueo y Conciliación de Cierre
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Total facturado en el período: {formatCurrency(financialSummary.grossSalesPrimary, currency.monedaPrincipal)} / {formatCurrency(financialSummary.grossSalesRef, currency.monedaReferencia)}.
                  Menos reembolsos: {formatCurrency(financialSummary.refundsPrimary, currency.monedaPrincipal)}.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportPDF}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Descargar Acta Contable PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUBVIEW 4: SELLERS / CASHIERS PERFORMANCE                         */}
        {/* ================================================================= */}
        {activeSubView === 'SELLERS' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Rendimiento y Productividad por Vendedor / Cajero
                </h2>
                <p className="text-xs text-slate-500">
                  Volumen de ventas, tickets atendidos y ticket promedio generado por cada usuario
                </p>
              </div>
            </div>

            {sellerPerformance.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No hay ventas registradas en el período seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center">#</th>
                      <th className="px-4 py-2.5">Vendedor / Cajero</th>
                      <th className="px-4 py-2.5 text-center">Tickets Cobrados</th>
                      <th className="px-4 py-2.5 text-right">Total Facturado ({currency.monedaPrincipal.codigo})</th>
                      <th className="px-4 py-2.5 text-right">Total Facturado ({currency.monedaReferencia.codigo})</th>
                      <th className="px-4 py-2.5 text-right">Ticket Promedio</th>
                      <th className="px-4 py-2.5 w-32">Participación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sellerPerformance.map((seller, idx) => {
                      const totalVol = financialSummary.grossSalesPrimary || 1;
                      const sharePct = Math.min(100, Math.round((seller.totalPrimary / totalVol) * 100));
                      const avgTicket = seller.salesCount > 0 ? seller.totalPrimary / seller.salesCount : 0;

                      return (
                        <tr key={seller.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 text-center font-bold text-slate-500">
                            #{idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{seller.name}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                            {seller.salesCount} tickets
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(seller.totalPrimary, currency.monedaPrincipal)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {formatCurrency(seller.totalPrimary * currency.tasaCambio, currency.monedaReferencia)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                            {formatCurrency(avgTicket, currency.monedaPrincipal)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${sharePct}%` }}
                                  className="h-full bg-blue-600 rounded-full"
                                />
                              </div>
                              <span className="font-mono text-[10px] text-slate-500 w-8 text-right">
                                {sharePct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
