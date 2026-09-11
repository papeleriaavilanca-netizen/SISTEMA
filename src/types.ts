export type UserRole = 'USUARIO' | 'VENDEDOR' | 'ADMINISTRADOR';

export interface RolePermissions {
  canAccessPOS: boolean;
  canApplyDiscounts: boolean;
  canManageInventory: boolean;
  canManageProducts: boolean;
  canManageCategories: boolean;
  canManagePurchases: boolean;
  canManageRefunds: boolean;
  canManageUsers: boolean;
  canManageConfig: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  canManageWorkshop?: boolean;
}

export interface SecurityConfig {
  autoLogoutEnabled: boolean;
  autoLogoutMinutes: number; // Tiempo en minutos antes de cerrar la sesión automáticamente
  masterUsername: string; // 'admin'
  masterPassword: string; // 'master'
}

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  username?: string; // e.g. 'admin'
  docId: string; // Obligatorio
  telefono?: string; // Opcional
  email: string;
  pin: string; // 4-6 digits for quick POS switch
  password?: string; // Optional custom password
  role: UserRole;
  activo: boolean;
  creadoEn: string;
}

export interface Tax {
  id: string;
  nombre: string;
  porcentaje: number; // e.g. 16 for 16%
  activo: boolean;
  esPredeterminado: boolean;
}

export interface CurrencyItem {
  id: string;
  codigo: string; // e.g. 'USD', 'VES', 'EUR', 'COP'
  nombre: string; // e.g. 'Dólar Estadounidense', 'Bolívar Digital'
  simbolo: string; // e.g. '$', 'Bs.', '€'
  decimales: number; // e.g. 2
  esPrincipal: boolean; // Moneda Principal (Base Contable)
  esReferencia: boolean; // Moneda de Referencia (Visualización Dual)
  valorTasa: number; // Valor respecto a la moneda principal (1.0 para principal, tasa de cambio para referencia/otras)
  activa: boolean;
}

export interface BankAccount {
  id: string;
  banco: string; // BANCO (ej. Banesco, Banco de Venezuela, Mercantil)
  codigo: string; // CODIGO (ej. 0134, 0102, 0105, CHASE01)
  documentoId: string; // DOCUMENTO DE ID (ej. J-12345678-9, V-18765432)
  numeroCuenta: string; // NUMERO DE CUENTA (ej. 0134-0001-22-0001234567)
  titular: string; // TITULAR (ej. Papelería Ávila N.C.A.)
  telefono?: string; // Teléfono asociado (para Pago Móvil)
  tipo?: 'CORRIENTE' | 'AHORRO' | 'VIRTUAL' | 'EFECTIVO';
  activa: boolean;
}

export interface PaymentMethodItem {
  id: string;
  nombre: string; // ej. "Pago Móvil Banesco", "Efectivo Divisas ($)"
  tipo: 'EFECTIVO' | 'PAGO_MOVIL' | 'TRANSFERENCIA' | 'PUNTO_VENTA' | 'BIOPAGO' | 'DIGITAL_ZELLE' | 'OTRO';
  monedaId: string; // Vinculado al menos a una moneda
  monedaCodigo?: string;
  cuentaId: string; // Vinculado a una Cuenta Bancaria
  requiereReferencia: boolean; // Si requiere número de referencia en el cobro
  activo: boolean;
  instrucciones?: string; // Datos o instrucciones para el pago
}

export interface CurrencyConfig {
  monedaPrincipal: {
    codigo: string; // e.g. 'USD'
    simbolo: string; // e.g. '$'
    nombre: string;
    decimales: number;
  };
  monedaReferencia: {
    codigo: string; // e.g. 'VES'
    simbolo: string; // e.g. 'Bs.'
    nombre: string;
    decimales: number;
  };
  tasaCambio: number; // 1 Moneda Principal = X Moneda Referencia (e.g. 36.50)
  ultimaActualizacionTasa: string;
  modoAutoActualizar: boolean;
}

export interface CompanyConfig {
  nombre: string;
  rif: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  redesSociales: {
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
    sitioWeb?: string;
  };
  mensajePieTicket?: string;
}

export interface Category {
  id: string;
  nombre: string;
  color?: string;
  icono?: string;
  descripcion?: string;
}

export interface ProductVariant {
  id: string;
  nombre: string; // e.g. "Color Azul", "Tamaño Carta", "Punta 0.7mm"
  descripcion?: string; // Descripción detallada de la variante
  foto?: string; // Foto / Imagen en Base64 o URL
  precio: number; // Precio de venta específico de la variante
  precioCompra?: number; // Costo específico
  porcentajeGanancia?: number; // Margen de ganancia de la variante
  codigoBarras?: string; // SKU o Código de barras único de la variante
  stock: number; // Stock asignado a esta variante
  stockMinimo?: number; // Stock mínimo de alerta para la variante
  activo: boolean;
}

export interface Product {
  id: string;
  nombre: string;
  codigoBarras: string;
  categoriaId: string;
  precioCompra: number; // Costo
  precioVenta: number; // PRECIO AL DETAL
  porcentajeGanancia: number; // % calculado automaticamente para detal
  ventaMayorActiva?: boolean; // Selector venta al mayor (Activo por defecto)
  precioMayor?: number; // PRECIO AL MAYOR
  porcentajeGananciaMayor?: number; // % calculado automaticamente para mayor
  impuestoId: string; // Tax ID
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string; // 'UND', 'KG', 'LTS', 'PQT'
  activo: boolean;
  creadoEn: string;
  descripcion?: string;
  foto?: string;
  variantes?: ProductVariant[];
}

export interface InventoryMovement {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: 'ENTRADA_COMPRA' | 'SALIDA_VENTA' | 'DEVOLUCION' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
  cantidad: number;
  stockAnterior: number;
  stockPosterior: number;
  motivo: string;
  referenciaDoc?: string; // Venta ID, Compra ID, etc.
  usuarioId: string;
  usuarioNombre: string;
  fecha: string;
}

export interface CartItem {
  producto: Product;
  variante?: ProductVariant;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number;
  impuesto: Tax;
  subtotal: number;
  impuestoTotal: number;
  total: number;
}

export interface PaymentDetails {
  metodo: 'EFECTIVO_PRINCIPAL' | 'EFECTIVO_REFERENCIA' | 'TARJETA' | 'PAGO_MOVIL_TRANSFERENCIA' | 'MIXTO' | 'CREDITO' | string;
  metodoNombre?: string;
  metodoId?: string;
  monedaId?: string;
  monedaCodigo?: string;
  montoPagadoPrincipal: number;
  montoPagadoReferencia: number;
  montoPagadoMonedaMetodo?: number;
  cambioPrincipal: number;
  cambioReferencia: number;
  cambioMonedaMetodo?: number;
  referenciaBancaria?: string;
  cuentaBancariaId?: string;
  detallesMixto?: {
    monedaId: string;
    monedaCodigo: string;
    simbolo: string;
    tasa: number;
    monto: number;
    montoEquivPrincipal: number;
  }[];
}

export interface ClientData {
  nombre: string;
  docId: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export type Client = ClientData;

export interface DebtPaymentRecord {
  id: string;
  fecha: string;
  montoPrincipal: number;
  montoReferencia: number;
  metodoPago: string;
  referenciaBancaria?: string;
  ticketCobro?: string;
  usuarioNombre?: string;
  notas?: string;
}

export interface ClientDebt {
  id: string;
  clienteDocId: string;
  clienteNombre: string;
  clienteTelefono?: string;
  ticketId: string;
  numeroTicket: string;
  fecha: string;
  montoTotalPrincipal: number;
  montoAbonadoPrincipal: number;
  saldoPendientePrincipal: number;
  montoTotalReferencia: number;
  montoAbonadoReferencia: number;
  saldoPendienteReferencia: number;
  tasaCambio: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
  notas?: string;
  historialAbonos?: DebtPaymentRecord[];
}

export interface Sale {
  id: string;
  numeroTicket: string;
  fecha: string;
  items: CartItem[];
  subtotalPrincipal: number;
  impuestosPrincipal: number;
  totalPrincipal: number;
  subtotalReferencia: number;
  impuestosReferencia: number;
  totalReferencia: number;
  tasaCambioAplicada: number;
  pago: PaymentDetails;
  cliente?: ClientData;
  vendedorId: string;
  vendedorNombre: string;
  condicionVenta?: 'CONTADO' | 'CREDITO';
  montoAbonadoPrincipal?: number;
  saldoPendientePrincipal?: number;
  montoAbonadoReferencia?: number;
  saldoPendienteReferencia?: number;
  estado: 'COMPLETADA' | 'ANULADA' | 'DEVUELTA_PARCIAL' | 'DEVUELTA_TOTAL' | 'CREDITO_PENDIENTE';
}

export interface PurchaseItem {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  total: number;
}

export interface Purchase {
  id: string;
  numeroFactura: string;
  proveedorNombre: string;
  proveedorDocId: string;
  fecha: string;
  items: PurchaseItem[];
  totalPrincipal: number;
  totalReferencia: number;
  tasaCambio: number;
  usuarioId: string;
  usuarioNombre: string;
  notas?: string;
}

export interface RefundItem {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  totalReembolso: number;
}

export interface Refund {
  id: string;
  numeroNotaCredito: string;
  ventaId: string;
  numeroTicket: string;
  fecha: string;
  items: RefundItem[];
  totalPrincipal: number;
  totalReferencia: number;
  motivo: string;
  usuarioId: string;
  usuarioNombre: string;
  clienteNombre?: string;
}

export interface AuditLog {
  id: string;
  fecha: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  modulo: string;
  detalles: string;
}

export interface SavedSale {
  id: string;
  codigo: string;
  fecha: string;
  items: CartItem[];
  subtotalPrincipal: number;
  impuestosPrincipal: number;
  totalPrincipal: number;
  subtotalReferencia: number;
  impuestosReferencia: number;
  totalReferencia: number;
  tasaCambioAplicada: number;
  tipoVenta: 'DETAL' | 'MAYOR';
  cliente?: ClientData;
  vendedorId: string;
  vendedorNombre: string;
  notas?: string;
}

export interface DatabaseSchema {
  version: number;
  empresa: CompanyConfig;
  seguridad?: SecurityConfig;
  moneda: CurrencyConfig;
  monedas?: CurrencyItem[];
  cuentasBancarias?: BankAccount[];
  metodosPagoConfig?: PaymentMethodItem[];
  impuestos: Tax[];
  categorias: Category[];
  productos: Product[];
  usuarios: User[];
  clientes?: ClientData[];
  movimientos: InventoryMovement[];
  ventas: Sale[];
  ventasGuardadas?: SavedSale[];
  cuentasPorCobrar?: ClientDebt[];
  pedidosTaller?: WorkshopOrder[];
  compras: Purchase[];
  devoluciones: Refund[];
  auditoria: AuditLog[];
  ultimaSincronizacion: string;
}

// -------------------------------------------------------------
// MÓDULO TALLER Y GESTIÓN DE PEDIDOS
// -------------------------------------------------------------
export type WorkshopOrderStatus =
  | 'ACEPTADO'
  | 'CONFIRMADO'
  | 'EN_CONFECCION'
  | 'EN_DISENO'
  | 'LISTO'
  | 'ENTREGADO';

export interface WorkshopOrderTimelineStep {
  estado: WorkshopOrderStatus;
  titulo: string;
  fecha?: string;
  completado: boolean;
  actual: boolean;
  descripcion?: string;
}

export interface WorkshopOrderPaymentRecord {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  usuarioNombre?: string;
  notas?: string;
}

export interface WorkshopOrderItem {
  id: string;
  productoId?: string;
  nombre: string;
  codigo?: string;
  imagen?: string;
  tallaOColor?: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  notas?: string;
  estado?: WorkshopOrderStatus;
}

export interface WorkshopOrder {
  id: string;
  numeroPedido: string; // Ej. "#OM-89214" o "#PED-1024"
  fechaCreacion: string; // ISO date
  fechaEstimadaEntrega: string; // YYYY-MM-DD
  fechaEntregaReal?: string;
  cliente: ClientData;
  vendedorId: string;
  vendedorNombre: string;
  estado: WorkshopOrderStatus;
  timeline: WorkshopOrderTimelineStep[];
  items: WorkshopOrderItem[];
  subtotalPrincipal: number;
  impuestosPrincipal: number;
  totalPrincipal: number;
  subtotalReferencia: number;
  impuestosReferencia: number;
  totalReferencia: number;
  tasaCambioAplicada: number;
  notasTaller?: string;
  prioridad?: 'NORMAL' | 'ALTA' | 'URGENTE';
  tipoPago?: 'COMPLETO' | 'PARCIAL' | 'PENDIENTE';
  metodoPagoAbono?: string;
  montoAbonadoPrincipal?: number;
  saldoPendientePrincipal?: number;
  historialAbonos?: WorkshopOrderPaymentRecord[];
}

