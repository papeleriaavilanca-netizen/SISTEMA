import {
  DatabaseSchema,
  CompanyConfig,
  CurrencyConfig,
  CurrencyItem,
  BankAccount,
  PaymentMethodItem,
  Tax,
  Category,
  Product,
  ProductVariant,
  User,
  RolePermissions,
  UserRole,
  Sale,
  Purchase,
  Refund,
  InventoryMovement,
  AuditLog,
  ClientData,
  SavedSale,
  SecurityConfig,
  ClientDebt,
  DebtPaymentRecord,
  WorkshopOrder,
  WorkshopOrderStatus,
  WorkshopOrderTimelineStep,
  WorkshopOrderItem,
} from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMINISTRADOR: {
    canAccessPOS: true,
    canApplyDiscounts: true,
    canManageInventory: true,
    canManageProducts: true,
    canManageCategories: true,
    canManagePurchases: true,
    canManageRefunds: true,
    canManageUsers: true,
    canManageConfig: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canManageWorkshop: true,
  },
  VENDEDOR: {
    canAccessPOS: true,
    canApplyDiscounts: true,
    canManageInventory: false,
    canManageProducts: false,
    canManageCategories: false,
    canManagePurchases: false,
    canManageRefunds: true,
    canManageUsers: false,
    canManageConfig: false,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageWorkshop: true,
  },
  USUARIO: {
    canAccessPOS: false,
    canApplyDiscounts: false,
    canManageInventory: false,
    canManageProducts: false,
    canManageCategories: false,
    canManagePurchases: false,
    canManageRefunds: false,
    canManageUsers: false,
    canManageConfig: false,
    canViewReports: false,
    canViewAuditLogs: false,
    canManageWorkshop: true,
  },
};

const DB_STORAGE_KEY = 'TPV_MASTER_DATABASE_V1';
const CURRENT_USER_KEY = 'TPV_CURRENT_USER_SESSION_V1';

const INITIAL_TAXES: Tax[] = [
  { id: 'tax-1', nombre: 'IVA General (16%)', porcentaje: 16, activo: true, esPredeterminado: true },
  { id: 'tax-2', nombre: 'IVA Reducido (8%)', porcentaje: 8, activo: true, esPredeterminado: false },
  { id: 'tax-3', nombre: 'Exento de IVA (0%)', porcentaje: 0, activo: true, esPredeterminado: false },
  { id: 'tax-4', nombre: 'IGTF (3%)', porcentaje: 3, activo: true, esPredeterminado: false },
];

const INITIAL_COMPANY: CompanyConfig = {
  nombre: 'Comercializadora & Papelería Ávila C.A.',
  rif: 'J-31245678-9',
  nit: '0614-250890-101-2',
  direccion: 'Av. Libertador, Edif. Centro Ávila, Piso 1, Local 12, Caracas',
  telefono: '+58 212 555-0199 / +58 414 123-4567',
  email: 'contacto@papeleriaavila.com',
  redesSociales: {
    instagram: '@papeleria_avila',
    whatsapp: '+584141234567',
    facebook: 'PapeleriaAvilaOficial',
    sitioWeb: 'www.papeleriaavila.com',
  },
  mensajePieTicket: '¡Gracias por su compra! Conserve este ticket como garantía. No se aceptan devoluciones después de 7 días.',
};

const INITIAL_CURRENCY: CurrencyConfig = {
  monedaPrincipal: {
    codigo: 'USD',
    simbolo: '$',
    nombre: 'Dólar Estadounidense',
    decimales: 2,
  },
  monedaReferencia: {
    codigo: 'VES',
    simbolo: 'Bs.',
    nombre: 'Bolívar Digital',
    decimales: 2,
  },
  tasaCambio: 36.80,
  ultimaActualizacionTasa: new Date().toISOString(),
  modoAutoActualizar: true,
};

export const INITIAL_CURRENCY_ITEMS: CurrencyItem[] = [
  {
    id: 'curr-usd',
    codigo: 'USD',
    nombre: 'Dólar Estadounidense',
    simbolo: '$',
    decimales: 2,
    esPrincipal: true,
    esReferencia: false,
    valorTasa: 1.0,
    activa: true,
  },
  {
    id: 'curr-ves',
    codigo: 'VES',
    nombre: 'Bolívar Digital',
    simbolo: 'Bs.',
    decimales: 2,
    esPrincipal: false,
    esReferencia: true,
    valorTasa: 36.80,
    activa: true,
  },
  {
    id: 'curr-eur',
    codigo: 'EUR',
    nombre: 'Euro',
    simbolo: '€',
    decimales: 2,
    esPrincipal: false,
    esReferencia: false,
    valorTasa: 0.92,
    activa: true,
  },
  {
    id: 'curr-cop',
    codigo: 'COP',
    nombre: 'Peso Colombiano',
    simbolo: 'COL$',
    decimales: 0,
    esPrincipal: false,
    esReferencia: false,
    valorTasa: 4150.0,
    activa: true,
  },
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-banesco',
    banco: 'Banesco Banco Universal',
    codigo: '0134',
    documentoId: 'J-12345678-9',
    numeroCuenta: '0134-0001-22-0001234567',
    titular: 'Papelería Ávila N.C.A.',
    telefono: '0414-1234567',
    tipo: 'CORRIENTE',
    activa: true,
  },
  {
    id: 'bank-bdv',
    banco: 'Banco de Venezuela',
    codigo: '0102',
    documentoId: 'J-12345678-9',
    numeroCuenta: '0102-0105-88-0009876543',
    titular: 'Papelería Ávila N.C.A.',
    telefono: '0414-1234567',
    tipo: 'CORRIENTE',
    activa: true,
  },
  {
    id: 'bank-mercantil',
    banco: 'Banco Mercantil',
    codigo: '0105',
    documentoId: 'J-12345678-9',
    numeroCuenta: '0105-0022-44-0005544332',
    titular: 'Papelería Ávila N.C.A.',
    telefono: '0412-9876543',
    tipo: 'CORRIENTE',
    activa: true,
  },
  {
    id: 'bank-caja-efectivo',
    banco: 'Caja Principal / Efectivo',
    codigo: '0001',
    documentoId: 'J-12345678-9',
    numeroCuenta: 'CAJA-TIENDA-01',
    titular: 'Custodia de Caja Tienda',
    telefono: '0212-5550192',
    tipo: 'EFECTIVO',
    activa: true,
  },
];

export const INITIAL_PAYMENT_METHODS: PaymentMethodItem[] = [
  {
    id: 'pm-efectivo-usd',
    nombre: 'Efectivo Divisas ($)',
    tipo: 'EFECTIVO',
    monedaId: 'curr-usd',
    monedaCodigo: 'USD',
    cuentaId: 'bank-caja-efectivo',
    requiereReferencia: false,
    activo: true,
    instrucciones: 'Recepción directa en caja de billetes en buen estado sin tachaduras.',
  },
  {
    id: 'pm-efectivo-ves',
    nombre: 'Efectivo Bolívares (Bs.)',
    tipo: 'EFECTIVO',
    monedaId: 'curr-ves',
    monedaCodigo: 'VES',
    cuentaId: 'bank-caja-efectivo',
    requiereReferencia: false,
    activo: true,
    instrucciones: 'Recepción en caja en efectivo en moneda nacional.',
  },
  {
    id: 'pm-pagomovil-banesco',
    nombre: 'Pago Móvil Banesco',
    tipo: 'PAGO_MOVIL',
    monedaId: 'curr-ves',
    monedaCodigo: 'VES',
    cuentaId: 'bank-banesco',
    requiereReferencia: true,
    activo: true,
    instrucciones: 'Banco Banesco (0134) - RIF: J-12345678-9 - Tel: 0414-1234567. Indicar número de referencia.',
  },
  {
    id: 'pm-pagomovil-bdv',
    nombre: 'Pago Móvil Banco de Venezuela',
    tipo: 'PAGO_MOVIL',
    monedaId: 'curr-ves',
    monedaCodigo: 'VES',
    cuentaId: 'bank-bdv',
    requiereReferencia: true,
    activo: true,
    instrucciones: 'Banco de Venezuela (0102) - RIF: J-12345678-9 - Tel: 0414-1234567.',
  },
  {
    id: 'pm-transf-banesco',
    nombre: 'Transferencia Banesco',
    tipo: 'TRANSFERENCIA',
    monedaId: 'curr-ves',
    monedaCodigo: 'VES',
    cuentaId: 'bank-banesco',
    requiereReferencia: true,
    activo: true,
    instrucciones: 'Transferencias directas del mismo banco o interbancarias inmediatas.',
  },
  {
    id: 'pm-punto-mercantil',
    nombre: 'Punto de Venta Mercantil',
    tipo: 'PUNTO_VENTA',
    monedaId: 'curr-ves',
    monedaCodigo: 'VES',
    cuentaId: 'bank-mercantil',
    requiereReferencia: true,
    activo: true,
    instrucciones: 'Deslizar tarjeta de débito o crédito en terminal de punto Mercantil.',
  },
  {
    id: 'pm-zelle-usd',
    nombre: 'Zelle / Dólares Digitales',
    tipo: 'DIGITAL_ZELLE',
    monedaId: 'curr-usd',
    monedaCodigo: 'USD',
    cuentaId: 'bank-banesco',
    requiereReferencia: true,
    activo: true,
    instrucciones: 'Enviar a pagos@papeleriaavila.com. Colocar número de orden en la nota.',
  },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', nombre: 'Papelería & Oficina', color: 'emerald', icono: 'FileText', descripcion: 'Resmas, carpetas, bolígrafos, engrapadoras' },
  { id: 'cat-2', nombre: 'Tecnología & Accesorios', color: 'blue', icono: 'Laptop', descripcion: 'Pendrives, cables, mouse, calculadoras' },
  { id: 'cat-3', nombre: 'Arte & Escolar', color: 'amber', icono: 'Palette', descripcion: 'Cuadernos, colores, temperas, tijeras' },
  { id: 'cat-4', nombre: 'Impresión & Tinta', color: 'purple', icono: 'Printer', descripcion: 'Cartuchos, tóner, hojas fotográficas' },
  { id: 'cat-5', nombre: 'Snacks & Cafetería', color: 'rose', icono: 'Coffee', descripcion: 'Café, agua mineral, golosinas de mostrador' },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    nombre: 'Resma de Papel Carta 75g (500 hojas)',
    codigoBarras: '759100100101',
    categoriaId: 'cat-1',
    precioCompra: 3.50,
    precioVenta: 5.50,
    porcentajeGanancia: 57.14,
    ventaMayorActiva: true,
    precioMayor: 4.80,
    porcentajeGananciaMayor: 37.14,
    impuestoId: 'tax-1',
    stockActual: 85,
    stockMinimo: 20,
    unidadMedida: 'UND',
    activo: true,
    creadoEn: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    nombre: 'Bolígrafo Gel Retráctil 0.7mm Caja x12',
    codigoBarras: '759100100102',
    categoriaId: 'cat-1',
    precioCompra: 2.80,
    precioVenta: 4.80,
    porcentajeGanancia: 71.43,
    ventaMayorActiva: true,
    precioMayor: 4.00,
    porcentajeGananciaMayor: 42.86,
    impuestoId: 'tax-1',
    stockActual: 42,
    stockMinimo: 10,
    unidadMedida: 'CAJA',
    activo: true,
    creadoEn: '2026-08-01T10:30:00.000Z',
    descripcion: 'Bolígrafos de tinta gel suave con grip antideslizante y secado rápido.',
    foto: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&auto=format&fit=crop&q=80',
    variantes: [
      {
        id: 'var-2-negro',
        nombre: 'Tinta Negra / 0.7mm',
        descripcion: 'Caja de 12 unidades tinta gel negra profunda, punta fina de acero inoxidable.',
        foto: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&auto=format&fit=crop&q=80',
        precio: 4.80,
        precioCompra: 2.80,
        porcentajeGanancia: 71.43,
        codigoBarras: '759100100102-NEG',
        stock: 24,
        stockMinimo: 5,
        activo: true,
      },
      {
        id: 'var-2-azul',
        nombre: 'Tinta Azul Rey / 0.7mm',
        descripcion: 'Caja de 12 unidades tinta gel azul intenso, ideal para firmas y oficina.',
        foto: 'https://images.unsplash.com/photo-1585336261026-77884a0d922f?w=300&auto=format&fit=crop&q=80',
        precio: 4.80,
        precioCompra: 2.80,
        porcentajeGanancia: 71.43,
        codigoBarras: '759100100102-AZU',
        stock: 14,
        stockMinimo: 5,
        activo: true,
      },
      {
        id: 'var-2-rojo',
        nombre: 'Tinta Roja / 0.7mm',
        descripcion: 'Caja de 12 unidades tinta gel roja brillante para corrección y auditoría.',
        foto: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=300&auto=format&fit=crop&q=80',
        precio: 5.00,
        precioCompra: 2.90,
        porcentajeGanancia: 72.41,
        codigoBarras: '759100100102-ROJ',
        stock: 4,
        stockMinimo: 5,
        activo: true,
      },
    ],
  },
  {
    id: 'prod-3',
    nombre: 'Memoria USB Kingston DataTraveler 3.2',
    codigoBarras: '759100100103',
    categoriaId: 'cat-2',
    precioCompra: 6.00,
    precioVenta: 9.90,
    porcentajeGanancia: 65.00,
    ventaMayorActiva: true,
    precioMayor: 8.50,
    porcentajeGananciaMayor: 41.67,
    impuestoId: 'tax-1',
    stockActual: 18,
    stockMinimo: 5,
    unidadMedida: 'UND',
    activo: true,
    creadoEn: '2026-08-02T11:00:00.000Z',
    descripcion: 'Almacenamiento portátil USB 3.2 Gen 1 de alta velocidad con capuchón protector.',
    foto: 'https://images.unsplash.com/photo-1618410320928-25228d811631?w=300&auto=format&fit=crop&q=80',
    variantes: [
      {
        id: 'var-3-64gb',
        nombre: 'Capacidad 64GB - Negro / Azul',
        descripcion: 'Velocidad de lectura hasta 100MB/s, ideal para documentos y fotos.',
        foto: 'https://images.unsplash.com/photo-1618410320928-25228d811631?w=300&auto=format&fit=crop&q=80',
        precio: 9.90,
        precioCompra: 6.00,
        porcentajeGanancia: 65.00,
        codigoBarras: '759100100103-64G',
        stock: 10,
        stockMinimo: 3,
        activo: true,
      },
      {
        id: 'var-3-128gb',
        nombre: 'Capacidad 128GB - Negro / Rojo',
        descripcion: 'Mayor capacidad para videos HD y respaldos completos de sistemas.',
        foto: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&auto=format&fit=crop&q=80',
        precio: 14.50,
        precioCompra: 9.00,
        porcentajeGanancia: 61.11,
        codigoBarras: '759100100103-128G',
        stock: 8,
        stockMinimo: 2,
        activo: true,
      },
    ],
  },
  {
    id: 'prod-4',
    nombre: 'Calculadora Científica Casio FX-82MS',
    codigoBarras: '759100100104',
    categoriaId: 'cat-2',
    precioCompra: 11.50,
    precioVenta: 18.00,
    porcentajeGanancia: 56.52,
    ventaMayorActiva: true,
    precioMayor: 15.50,
    porcentajeGananciaMayor: 34.78,
    impuestoId: 'tax-1',
    stockActual: 8,
    stockMinimo: 4,
    unidadMedida: 'UND',
    activo: true,
    creadoEn: '2026-08-02T11:30:00.000Z',
  },
  {
    id: 'prod-5',
    nombre: 'Set de Lápices de Colores Prisma x24',
    codigoBarras: '759100100105',
    categoriaId: 'cat-3',
    precioCompra: 4.20,
    precioVenta: 7.20,
    porcentajeGanancia: 71.43,
    ventaMayorActiva: true,
    precioMayor: 6.00,
    porcentajeGananciaMayor: 42.86,
    impuestoId: 'tax-1',
    stockActual: 30,
    stockMinimo: 8,
    unidadMedida: 'UND',
    activo: true,
    creadoEn: '2026-08-03T09:00:00.000Z',
  },
  {
    id: 'prod-6',
    nombre: 'Cuaderno Espiral Universitario 100 Hojas',
    codigoBarras: '759100100106',
    categoriaId: 'cat-3',
    precioCompra: 1.10,
    precioVenta: 2.00,
    porcentajeGanancia: 81.82,
    ventaMayorActiva: true,
    precioMayor: 1.60,
    porcentajeGananciaMayor: 45.45,
    impuestoId: 'tax-1',
    stockActual: 95,
    stockMinimo: 25,
    unidadMedida: 'UND',
    activo: true,
    creadoEn: '2026-08-03T09:30:00.000Z',
  },
  {
    id: 'prod-7',
    nombre: 'Tinta Negra Genérica para Impresora 100ml',
    codigoBarras: '759100100107',
    categoriaId: 'cat-4',
    precioCompra: 2.50,
    precioVenta: 4.50,
    porcentajeGanancia: 80.00,
    ventaMayorActiva: true,
    precioMayor: 3.80,
    porcentajeGananciaMayor: 52.00,
    impuestoId: 'tax-1',
    stockActual: 14,
    stockMinimo: 6,
    unidadMedida: 'UND',
    activo: true,
    creadoEn: '2026-08-04T14:00:00.000Z',
  },
  {
    id: 'prod-8',
    nombre: 'Agua Mineral 500ml',
    codigoBarras: '759100100108',
    categoriaId: 'cat-5',
    precioCompra: 0.40,
    precioVenta: 0.85,
    porcentajeGanancia: 112.50,
    ventaMayorActiva: true,
    precioMayor: 0.65,
    porcentajeGananciaMayor: 62.50,
    impuestoId: 'tax-3', // Exento
    stockActual: 48,
    stockMinimo: 12,
    unidadMedida: 'UND',
    activo: true,
    creadoEn: '2026-08-05T08:00:00.000Z',
  },
];

const INITIAL_SECURITY: SecurityConfig = {
  autoLogoutEnabled: true,
  autoLogoutMinutes: 10,
  masterUsername: 'admin',
  masterPassword: 'master',
};

const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    nombre: 'Carlos',
    apellido: 'Ávila',
    username: 'admin',
    password: 'master',
    docId: 'V-18450123',
    telefono: '+58 414 1234567',
    email: 'admin@papeleriaavila.com',
    pin: '1234',
    role: 'ADMINISTRADOR',
    activo: true,
    creadoEn: '2026-07-15T08:00:00.000Z',
  },
  {
    id: 'usr-vendedor',
    nombre: 'Mariana',
    apellido: 'González',
    username: 'mariana',
    password: 'vendedor',
    docId: 'V-24560789',
    telefono: '+58 424 9876543',
    email: 'mariana.caja@papeleriaavila.com',
    pin: '2222',
    role: 'VENDEDOR',
    activo: true,
    creadoEn: '2026-07-20T09:00:00.000Z',
  },
  {
    id: 'usr-usuario',
    nombre: 'Pedro',
    apellido: 'Ramírez',
    username: 'pedro',
    password: 'usuario',
    docId: 'V-27890456',
    telefono: '+58 412 5550192',
    email: 'pedro.consulta@papeleriaavila.com',
    pin: '3333',
    role: 'USUARIO',
    activo: true,
    creadoEn: '2026-08-01T10:00:00.000Z',
  },
];

const INITIAL_CLIENTS: ClientData[] = [
  { nombre: 'Consumidor Final', docId: 'V-00000000', telefono: '', direccion: 'Mostrador' },
  { nombre: 'Inversiones Los Andes C.A.', docId: 'J-40123456-7', telefono: '+584141234567', direccion: 'Chacao, Caracas', email: 'compras@losandes.com' },
  { nombre: 'María Gabriela Pérez', docId: 'V-18456123', telefono: '+584249876543', direccion: 'El Recreo, Caracas', email: 'mgabrielap@gmail.com' },
  { nombre: 'Suministros Gráficos Ávila C.A.', docId: 'J-50987123-4', telefono: '+584125556677', direccion: 'Bello Monte, Caracas', email: 'contacto@graficosavila.com' },
  { nombre: 'Alejandro Colmenares', docId: 'V-21345678', telefono: '+584163332211', direccion: 'Los Palos Grandes', email: 'acolmenares@hotmail.com' },
];

const INITIAL_DEBTS: ClientDebt[] = [
  {
    id: 'debt-init-1',
    clienteDocId: 'J-40123456-7',
    clienteNombre: 'Inversiones Los Andes C.A.',
    clienteTelefono: '+584141234567',
    ticketId: 'tkt-init-1',
    numeroTicket: 'TKT-000004',
    fecha: new Date(Date.now() - 86400000 * 3).toISOString(),
    montoTotalPrincipal: 45.00,
    montoAbonadoPrincipal: 15.00,
    saldoPendientePrincipal: 30.00,
    montoTotalReferencia: 1656.00,
    montoAbonadoReferencia: 552.00,
    saldoPendienteReferencia: 1104.00,
    tasaCambio: 36.80,
    estado: 'PENDIENTE',
    notas: 'Venta a crédito de suministros de oficina. Saldo pendiente de pago.',
    historialAbonos: [
      {
        id: 'abono-init-1',
        fecha: new Date(Date.now() - 86400000 * 3).toISOString(),
        montoPrincipal: 15.00,
        montoReferencia: 552.00,
        metodoPago: 'PAGO_MOVIL_TRANSFERENCIA',
        referenciaBancaria: 'REF-7890',
        usuarioNombre: 'Mariana González',
        notas: 'Abono inicial en venta',
      },
    ],
  },
  {
    id: 'debt-init-2',
    clienteDocId: 'V-18456123',
    clienteNombre: 'María Gabriela Pérez',
    clienteTelefono: '+584249876543',
    ticketId: 'tkt-init-2',
    numeroTicket: 'TKT-000006',
    fecha: new Date(Date.now() - 86400000 * 1).toISOString(),
    montoTotalPrincipal: 25.50,
    montoAbonadoPrincipal: 10.00,
    saldoPendientePrincipal: 15.50,
    montoTotalReferencia: 938.40,
    montoAbonadoReferencia: 368.00,
    saldoPendienteReferencia: 570.40,
    tasaCambio: 36.80,
    estado: 'PENDIENTE',
    notas: 'Compra de cuadernos y resmas a crédito.',
    historialAbonos: [
      {
        id: 'abono-init-2',
        fecha: new Date(Date.now() - 86400000 * 1).toISOString(),
        montoPrincipal: 10.00,
        montoReferencia: 368.00,
        metodoPago: 'EFECTIVO_PRINCIPAL',
        usuarioNombre: 'Mariana González',
        notas: 'Abono inicial en efectivo',
      },
    ],
  },
];

const INITIAL_WORKSHOP_ORDERS: WorkshopOrder[] = [
  {
    id: 'ped-om-89214',
    numeroPedido: '#OM-89214',
    fechaCreacion: '2026-09-05T09:30:00.000Z',
    fechaEstimadaEntrega: '2026-09-09',
    cliente: {
      nombre: 'Omar Rodríguez',
      docId: 'V-19842510',
      telefono: '+58 412 8765432',
      direccion: 'Av. Las Delicias, Edf. Rosalba, Apto 4-B',
    },
    vendedorId: 'usr-vendedor',
    vendedorNombre: 'Mariana González',
    estado: 'EN_DISENO',
    timeline: [
      {
        estado: 'CONFIRMADO',
        titulo: 'PEDIDO CONFIRMADO',
        fecha: '5 sep, 09:30 AM',
        completado: true,
        actual: false,
        descripcion: 'Pedido confirmado y pago inicial verificado',
      },
      {
        estado: 'EN_CONFECCION',
        titulo: 'EN CONFECCIÓN',
        fecha: '6 sep, 02:15 PM',
        completado: true,
        actual: false,
        descripcion: 'Corte de telas y preparación de materiales',
      },
      {
        estado: 'EN_DISENO',
        titulo: 'EN DISEÑO',
        fecha: '7 sep, 08:00 AM',
        completado: false,
        actual: true,
        descripcion: '7 sep, 08:00 AM - Paquete salió del centro de distribución local',
      },
      {
        estado: 'LISTO',
        titulo: 'LISTO',
        fecha: 'Estimado 9 sep',
        completado: false,
        actual: false,
        descripcion: 'Control de calidad y embalaje final',
      },
      {
        estado: 'ENTREGADO',
        titulo: 'ENTREGADO',
        fecha: 'Pendiente',
        completado: false,
        actual: false,
        descripcion: 'Entrega final al cliente',
      },
    ],
    items: [
      {
        id: 'item-1',
        nombre: 'Tenis Deportivos - Talla 42',
        codigo: 'CALZ-001',
        cantidad: 2,
        precioUnitario: 42.0,
        total: 84.0,
        tallaOColor: 'Talla 42 / Azul y Blanco',
        notas: 'Personalización de plantilla y talón',
      },
      {
        id: 'item-2',
        nombre: 'Camiseta Algodón Negra - Talla L',
        codigo: 'TEXT-004',
        cantidad: 1,
        precioUnitario: 31.0,
        total: 31.0,
        tallaOColor: 'Talla L / Negra',
        notas: 'Estampado serigráfico en pecho',
      },
    ],
    subtotalPrincipal: 115.0,
    impuestosPrincipal: 0.0,
    totalPrincipal: 115.0,
    subtotalReferencia: 4209.0,
    impuestosReferencia: 0.0,
    totalReferencia: 4209.0,
    tasaCambioAplicada: 36.6,
    notasTaller: 'Cliente solicita atención en el secado de serigrafía. Entrega puntual.',
    prioridad: 'ALTA',
    montoAbonadoPrincipal: 70.0,
    saldoPendientePrincipal: 45.0,
  },
  {
    id: 'ped-cl-94821',
    numeroPedido: '#PED-94821',
    fechaCreacion: '2026-09-06T11:15:00.000Z',
    fechaEstimadaEntrega: '2026-09-12',
    cliente: {
      nombre: 'Distribuidora Los Andes C.A.',
      docId: 'J-30458921-0',
      telefono: '+58 414 5551234',
      direccion: 'Zona Industrial El Tambor, Galpón 12',
    },
    vendedorId: 'usr-admin',
    vendedorNombre: 'Carlos Ávila',
    estado: 'EN_CONFECCION',
    timeline: [
      {
        estado: 'CONFIRMADO',
        titulo: 'PEDIDO CONFIRMADO',
        fecha: '6 sep, 11:15 AM',
        completado: true,
        actual: false,
        descripcion: 'Orden de 30 chemises bordadas confirmada',
      },
      {
        estado: 'EN_CONFECCION',
        titulo: 'EN CONFECCIÓN',
        fecha: '7 sep, 09:30 AM',
        completado: false,
        actual: true,
        descripcion: '7 sep, 09:30 AM - Montaje en máquina bordadora industrial',
      },
      {
        estado: 'EN_DISENO',
        titulo: 'EN DISEÑO',
        fecha: '6 sep, 04:00 PM',
        completado: true,
        actual: false,
        descripcion: 'Matriz de bordado digitalizada y aprobada por el cliente',
      },
      {
        estado: 'LISTO',
        titulo: 'LISTO',
        fecha: 'Estimado 12 sep',
        completado: false,
        actual: false,
        descripcion: 'Revisión y planchado a vapor',
      },
      {
        estado: 'ENTREGADO',
        titulo: 'ENTREGADO',
        fecha: 'Pendiente',
        completado: false,
        actual: false,
        descripcion: 'Despacho con nota de entrega',
      },
    ],
    items: [
      {
        id: 'item-corp-1',
        nombre: 'Chemises Piqué con Bordado de Logotipo',
        codigo: 'CHM-CORP-01',
        cantidad: 30,
        precioUnitario: 15.0,
        total: 450.0,
        tallaOColor: 'Surtido: 10 S, 10 M, 10 L',
        notas: 'Bordado en pecho izquierdo (10cm ancho)',
      },
    ],
    subtotalPrincipal: 450.0,
    impuestosPrincipal: 0.0,
    totalPrincipal: 450.0,
    subtotalReferencia: 16470.0,
    impuestosReferencia: 0.0,
    totalReferencia: 16470.0,
    tasaCambioAplicada: 36.6,
    notasTaller: 'Hilo azul marino pantone 286C.',
    prioridad: 'URGENTE',
    montoAbonadoPrincipal: 250.0,
    saldoPendientePrincipal: 200.0,
  },
  {
    id: 'ped-vg-78210',
    numeroPedido: '#PED-78210',
    fechaCreacion: '2026-09-04T15:00:00.000Z',
    fechaEstimadaEntrega: '2026-09-07',
    cliente: {
      nombre: 'Valeria Gómez',
      docId: 'V-26120345',
      telefono: '+58 416 3338901',
      direccion: 'Urb. Santa Rosa, Calle 3, Casa #14',
    },
    vendedorId: 'usr-vendedor',
    vendedorNombre: 'Mariana González',
    estado: 'LISTO',
    timeline: [
      {
        estado: 'CONFIRMADO',
        titulo: 'PEDIDO CONFIRMADO',
        fecha: '4 sep, 03:00 PM',
        completado: true,
        actual: false,
        descripcion: 'Pedido recibido y pagado en su totalidad',
      },
      {
        estado: 'EN_CONFECCION',
        titulo: 'EN CONFECCIÓN',
        fecha: '5 sep, 11:00 AM',
        completado: true,
        actual: false,
        descripcion: 'Sublimación de tazas y embalaje',
      },
      {
        estado: 'EN_DISENO',
        titulo: 'EN DISEÑO',
        fecha: '4 sep, 05:00 PM',
        completado: true,
        actual: false,
        descripcion: 'Arte fotográfico procesado',
      },
      {
        estado: 'LISTO',
        titulo: 'LISTO',
        fecha: '7 sep, 09:00 AM',
        completado: true,
        actual: true,
        descripcion: '7 sep, 09:00 AM - Empaquetado y listo para retiro en mostrador',
      },
      {
        estado: 'ENTREGADO',
        titulo: 'ENTREGADO',
        fecha: 'Pendiente retiro',
        completado: false,
        actual: false,
        descripcion: 'Cliente notificado por WhatsApp para entrega',
      },
    ],
    items: [
      {
        id: 'item-vg-1',
        nombre: 'Tazas Mágicas Sublimadas Personalizadas',
        codigo: 'REG-001',
        cantidad: 6,
        precioUnitario: 8.0,
        total: 48.0,
        tallaOColor: 'Cerámica negra 11oz',
      },
    ],
    subtotalPrincipal: 48.0,
    impuestosPrincipal: 0.0,
    totalPrincipal: 48.0,
    subtotalReferencia: 1756.8,
    impuestosReferencia: 0.0,
    totalReferencia: 1756.8,
    tasaCambioAplicada: 36.6,
    notasTaller: 'Incluye lazo decorativo y tarjeta de felicitación.',
    prioridad: 'NORMAL',
    montoAbonadoPrincipal: 48.0,
    saldoPendientePrincipal: 0.0,
  },
];

function getInitialDatabase(): DatabaseSchema {
  return {
    version: 1,
    empresa: INITIAL_COMPANY,
    seguridad: INITIAL_SECURITY,
    moneda: INITIAL_CURRENCY,
    monedas: [...INITIAL_CURRENCY_ITEMS],
    cuentasBancarias: [...INITIAL_BANK_ACCOUNTS],
    metodosPagoConfig: [...INITIAL_PAYMENT_METHODS],
    impuestos: INITIAL_TAXES,
    categorias: INITIAL_CATEGORIES,
    productos: INITIAL_PRODUCTS,
    usuarios: INITIAL_USERS,
    clientes: INITIAL_CLIENTS,
    pedidosTaller: INITIAL_WORKSHOP_ORDERS,
    movimientos: [
      {
        id: 'mov-init-1',
        productoId: 'prod-1',
        productoNombre: 'Resma de Papel Carta 75g (500 hojas)',
        tipo: 'ENTRADA_COMPRA',
        cantidad: 85,
        stockAnterior: 0,
        stockPosterior: 85,
        motivo: 'Inventario Inicial de Apertura',
        referenciaDoc: 'INV-INI-001',
        usuarioId: 'usr-admin',
        usuarioNombre: 'Carlos Ávila',
        fecha: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'mov-init-2',
        productoId: 'prod-3',
        productoNombre: 'Memoria USB 64GB Kingston 3.2',
        tipo: 'ENTRADA_COMPRA',
        cantidad: 18,
        stockAnterior: 0,
        stockPosterior: 18,
        motivo: 'Inventario Inicial de Apertura',
        referenciaDoc: 'INV-INI-001',
        usuarioId: 'usr-admin',
        usuarioNombre: 'Carlos Ávila',
        fecha: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    ventas: [],
    cuentasPorCobrar: INITIAL_DEBTS,
    compras: [],
    devoluciones: [],
    auditoria: [
      {
        id: 'aud-1',
        fecha: new Date().toISOString(),
        usuarioId: 'usr-admin',
        usuarioNombre: 'Carlos Ávila',
        accion: 'INICIALIZACION_SISTEMA',
        modulo: 'CONFIGURACION',
        detalles: 'Base de datos inicial configurada y encriptada en memoria local.',
      },
    ],
    ultimaSincronizacion: new Date().toISOString(),
  };
}

class DatabaseService {
  private db: DatabaseSchema;
  private listeners: Set<() => void> = new Set();
  private currentUser: User | null = null;

  constructor() {
    this.db = this.loadDatabase();
    this.currentUser = this.loadCurrentUser();
    this.setupAutoSync();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      const stored = localStorage.getItem(DB_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.version === 1 && parsed.productos) {
          if (!parsed.seguridad) {
            parsed.seguridad = INITIAL_SECURITY;
          }
          // Ensure existing sample products acquire sample variants if missing
          const p2 = parsed.productos.find((p: any) => p.id === 'prod-2');
          if (p2 && (!p2.variantes || p2.variantes.length === 0)) {
            const initP2 = INITIAL_PRODUCTS.find((p) => p.id === 'prod-2');
            if (initP2?.variantes) p2.variantes = initP2.variantes;
          }
          const p3 = parsed.productos.find((p: any) => p.id === 'prod-3');
          if (p3 && (!p3.variantes || p3.variantes.length === 0)) {
            const initP3 = INITIAL_PRODUCTS.find((p) => p.id === 'prod-3');
            if (initP3?.variantes) p3.variantes = initP3.variantes;
          }
          // Ensure users have username if missing
          if (parsed.usuarios) {
            for (const u of parsed.usuarios) {
              if (!u.username) {
                if (u.id === 'usr-admin') {
                  u.username = 'admin';
                  u.password = 'master';
                } else if (u.id === 'usr-vendedor') {
                  u.username = 'mariana';
                  u.password = 'vendedor';
                } else if (u.id === 'usr-usuario') {
                  u.username = 'pedro';
                  u.password = 'usuario';
                }
              }
            }
          }
          // Ensure cuentasPorCobrar is initialized
          if (!parsed.cuentasPorCobrar || !Array.isArray(parsed.cuentasPorCobrar)) {
            parsed.cuentasPorCobrar = [...INITIAL_DEBTS];
          }
          // Ensure pedidosTaller is initialized
          if (!parsed.pedidosTaller || !Array.isArray(parsed.pedidosTaller) || parsed.pedidosTaller.length === 0) {
            parsed.pedidosTaller = [...INITIAL_WORKSHOP_ORDERS];
          }
          // Ensure monedas is initialized
          if (!parsed.monedas || !Array.isArray(parsed.monedas) || parsed.monedas.length === 0) {
            parsed.monedas = [...INITIAL_CURRENCY_ITEMS];
          }
          // Ensure cuentasBancarias is initialized
          if (!parsed.cuentasBancarias || !Array.isArray(parsed.cuentasBancarias) || parsed.cuentasBancarias.length === 0) {
            parsed.cuentasBancarias = [...INITIAL_BANK_ACCOUNTS];
          }
          // Ensure metodosPagoConfig is initialized
          if (!parsed.metodosPagoConfig || !Array.isArray(parsed.metodosPagoConfig) || parsed.metodosPagoConfig.length === 0) {
            parsed.metodosPagoConfig = [...INITIAL_PAYMENT_METHODS];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading DB from localStorage:', e);
    }
    const initial = getInitialDatabase();
    this.saveDatabase(initial);
    return initial;
  }

  private saveDatabase(data: DatabaseSchema) {
    try {
      data.ultimaSincronizacion = new Date().toISOString();
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(data));
      this.db = data;
      this.notify();
    } catch (e) {
      console.error('Error saving DB to localStorage:', e);
    }
  }

  private loadCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const exists = this.db.usuarios.find((u) => u.id === parsed.id && u.activo);
        if (exists) return exists;
      }
    } catch (e) {
      console.error('Error loading user session:', e);
    }
    // Return null so Login is mandatory
    return null;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    this.addAuditLog('CAMBIO_SESION', 'USUARIOS', `Sesión iniciada por ${user.nombre} ${user.apellido} (${user.role})`);
    this.notify();
  }

  public logout(reason: string = 'Cierre de sesión manual') {
    if (this.currentUser) {
      this.addAuditLog('CIERRE_SESION', 'SEGURIDAD', `${reason}: ${this.currentUser.nombre} ${this.currentUser.apellido} (${this.currentUser.role})`);
    }
    this.currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    this.notify();
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public authenticate(identifier: string, passwordOrPin: string): { success: boolean; user?: User; error?: string } {
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = passwordOrPin.trim();

    if (!trimmedId || !trimmedPass) {
      return { success: false, error: 'Por favor complete todos los campos de acceso.' };
    }

    const sec = this.getSecurityConfig();

    // 1. Master credential check: admin / master
    const isMasterUser = trimmedId === (sec.masterUsername || 'admin').toLowerCase();
    const isMasterPass = trimmedPass === (sec.masterPassword || 'master');

    if (isMasterUser && isMasterPass) {
      let adminUser = this.db.usuarios.find((u) => u.role === 'ADMINISTRADOR' && u.activo);
      if (!adminUser) {
        adminUser = this.db.usuarios[0];
      }
      this.setCurrentUser(adminUser);
      this.addAuditLog('LOGIN_EXITOSO', 'SEGURIDAD', `Acceso Maestro concedido a '${sec.masterUsername}' (${adminUser.nombre} ${adminUser.apellido})`);
      return { success: true, user: adminUser };
    }

    // 2. Check registered users by username, email, docId, or first name
    const user = this.db.usuarios.find((u) => {
      if (!u.activo) return false;
      const idMatch = (u.username && u.username.toLowerCase() === trimmedId) ||
                      u.email.toLowerCase() === trimmedId ||
                      u.docId.toLowerCase() === trimmedId ||
                      u.nombre.toLowerCase() === trimmedId;
      return idMatch;
    });

    if (user) {
      const pinMatch = user.pin === trimmedPass;
      const passMatch = user.password && user.password === trimmedPass;
      const masterPassForAdmin = user.role === 'ADMINISTRADOR' && isMasterPass;

      if (pinMatch || passMatch || masterPassForAdmin) {
        this.setCurrentUser(user);
        this.addAuditLog('LOGIN_EXITOSO', 'SEGURIDAD', `Sesión iniciada: ${user.nombre} ${user.apellido} (${user.role})`);
        return { success: true, user };
      }
    }

    this.addAuditLog('LOGIN_FALLIDO', 'SEGURIDAD', `Intento de acceso fallido para el usuario '${trimmedId}'`);
    return { success: false, error: 'Credenciales inválidas. Verifique su usuario o contraseña.' };
  }

  public authenticateWithPin(userId: string, pin: string): { success: boolean; user?: User; error?: string } {
    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      return { success: false, error: 'Por favor introduzca el PIN de seguridad.' };
    }
    const user = this.db.usuarios.find((u) => u.id === userId && u.activo);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado o inactivo.' };
    }
    if (user.pin === trimmedPin) {
      this.setCurrentUser(user);
      this.addAuditLog('CAMBIO_VENDEDOR_PIN', 'TPV', `Cambio de vendedor verificado por PIN: ${user.nombre} ${user.apellido} (${user.role})`);
      return { success: true, user };
    }
    this.addAuditLog('PIN_FALLIDO', 'SEGURIDAD', `PIN incorrecto al intentar cambiar al usuario ${user.nombre} ${user.apellido}`);
    return { success: false, error: 'PIN de seguridad incorrecto.' };
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public hasPermission(permission: keyof RolePermissions): boolean {
    if (!this.currentUser) return false;
    const rolePerms = ROLE_PERMISSIONS[this.currentUser.role];
    return !!rolePerms?.[permission];
  }

  public getSecurityConfig(): SecurityConfig {
    if (!this.db.seguridad) {
      this.db.seguridad = {
        autoLogoutEnabled: true,
        autoLogoutMinutes: 10,
        masterUsername: 'admin',
        masterPassword: 'master',
      };
      this.saveDatabase(this.db);
    }
    return this.db.seguridad;
  }

  public updateSecurityConfig(config: SecurityConfig) {
    this.db.seguridad = config;
    this.addAuditLog('ACTUALIZAR_SEGURIDAD', 'CONFIGURACION', `Configuración de seguridad actualizada: Auto-cierre ${config.autoLogoutEnabled ? 'activado (' + config.autoLogoutMinutes + ' min)' : 'desactivado'}`);
    this.saveDatabase(this.db);
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    });
  }

  private setupAutoSync() {
    // Sincronización automática periódica cada 30 segundos
    setInterval(() => {
      this.db.ultimaSincronizacion = new Date().toISOString();
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.db));
      this.notify();
    }, 30000);
  }

  // GETTERS
  public getSnapshot(): DatabaseSchema {
    return this.db;
  }

  public getCompany(): CompanyConfig {
    return this.db.empresa;
  }

  public getCurrency(): CurrencyConfig {
    return this.db.moneda;
  }

  public getTaxes(): Tax[] {
    return this.db.impuestos;
  }

  public getCategories(): Category[] {
    return this.db.categorias;
  }

  public getProducts(): Product[] {
    return this.db.productos;
  }

  public getUsers(): User[] {
    return this.db.usuarios;
  }

  public getMovements(): InventoryMovement[] {
    return this.db.movimientos;
  }

  public getSales(): Sale[] {
    return this.db.ventas;
  }

  public getPurchases(): Purchase[] {
    return this.db.compras;
  }

  public getRefunds(): Refund[] {
    return this.db.devoluciones;
  }

  public getAuditLogs(): AuditLog[] {
    return this.db.auditoria;
  }

  // AUDIT LOG
  public addAuditLog(accion: string, modulo: string, detalles: string) {
    const usuarioId = this.currentUser ? this.currentUser.id : 'usr-sistema';
    const usuarioNombre = this.currentUser
      ? `${this.currentUser.nombre} ${this.currentUser.apellido}`
      : 'Sistema / Seguridad';

    const log: AuditLog = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      fecha: new Date().toISOString(),
      usuarioId,
      usuarioNombre,
      accion,
      modulo,
      detalles,
    };
    this.db.auditoria.unshift(log);
    // Keep max 300 logs
    if (this.db.auditoria.length > 300) {
      this.db.auditoria.pop();
    }
    this.saveDatabase(this.db);
  }

  // CONFIGURATION METHODS
  public updateCompany(company: CompanyConfig) {
    this.db.empresa = company;
    this.addAuditLog('ACTUALIZAR_EMPRESA', 'CONFIGURACION', `Datos de empresa actualizados: ${company.nombre} (RIF: ${company.rif})`);
    this.saveDatabase(this.db);
  }

  public updateCurrency(currency: CurrencyConfig) {
    this.db.moneda = {
      ...currency,
      ultimaActualizacionTasa: new Date().toISOString(),
    };
    if (this.db.monedas && Array.isArray(this.db.monedas)) {
      this.db.monedas.forEach((c) => {
        if (c.codigo === currency.monedaPrincipal.codigo) {
          c.esPrincipal = true;
          c.esReferencia = false;
          c.valorTasa = 1.0;
        } else if (c.codigo === currency.monedaReferencia.codigo) {
          c.esReferencia = true;
          c.esPrincipal = false;
          c.valorTasa = currency.tasaCambio;
        }
      });
    }
    this.addAuditLog('ACTUALIZAR_TASA_CAMBIO', 'CONFIGURACION', `Nueva tasa de cambio: 1 ${currency.monedaPrincipal.codigo} = ${currency.tasaCambio} ${currency.monedaReferencia.codigo}`);
    this.saveDatabase(this.db);
  }

  // -------------------------------------------------------------
  // FACTURACIÓN: 1. MONEDAS
  // -------------------------------------------------------------
  public getCurrencies(): CurrencyItem[] {
    if (!this.db.monedas || !Array.isArray(this.db.monedas) || this.db.monedas.length === 0) {
      this.db.monedas = [...INITIAL_CURRENCY_ITEMS];
    }
    return this.db.monedas;
  }

  public saveCurrencyItem(item: CurrencyItem) {
    if (!this.db.monedas) {
      this.db.monedas = [...INITIAL_CURRENCY_ITEMS];
    }
    const idx = this.db.monedas.findIndex((c) => c.id === item.id);

    if (item.esPrincipal) {
      this.db.monedas.forEach((c) => {
        if (c.id !== item.id) c.esPrincipal = false;
      });
      item.esReferencia = false;
      item.valorTasa = 1.0;
      this.db.moneda.monedaPrincipal = {
        codigo: item.codigo.trim().toUpperCase(),
        simbolo: item.simbolo.trim(),
        nombre: item.nombre.trim(),
        decimales: item.decimales,
      };
    }

    if (item.esReferencia) {
      this.db.monedas.forEach((c) => {
        if (c.id !== item.id) c.esReferencia = false;
      });
      item.esPrincipal = false;
      this.db.moneda.monedaReferencia = {
        codigo: item.codigo.trim().toUpperCase(),
        simbolo: item.simbolo.trim(),
        nombre: item.nombre.trim(),
        decimales: item.decimales,
      };
      if (item.valorTasa > 0) {
        this.db.moneda.tasaCambio = item.valorTasa;
      }
    }

    if (idx >= 0) {
      this.db.monedas[idx] = item;
      this.addAuditLog('MODIFICAR_MONEDA', 'CONFIGURACION', `Moneda actualizada: ${item.codigo} - ${item.nombre} (Tasa: ${item.valorTasa})`);
    } else {
      this.db.monedas.push(item);
      this.addAuditLog('CREAR_MONEDA', 'CONFIGURACION', `Nueva moneda creada: ${item.codigo} - ${item.nombre} (Símbolo: ${item.simbolo})`);
    }

    this.saveDatabase(this.db);
  }

  public deleteCurrencyItem(id: string): { success: boolean; error?: string } {
    if (!this.db.monedas) return { success: false, error: 'No hay monedas registradas' };
    const item = this.db.monedas.find((c) => c.id === id);
    if (!item) return { success: false, error: 'Moneda no encontrada' };

    if (item.esPrincipal) {
      return { success: false, error: 'No puede eliminar la Moneda Principal activa del sistema. Asigne otra moneda como principal primero.' };
    }
    if (item.esReferencia) {
      return { success: false, error: 'No puede eliminar la Moneda de Referencia activa del sistema. Asigne otra moneda como referencia primero.' };
    }

    const linkedPM = (this.db.metodosPagoConfig || []).find((pm) => pm.monedaId === id || pm.monedaCodigo === item.codigo);
    if (linkedPM) {
      return { success: false, error: `No puede eliminar esta moneda porque está vinculada al método de pago "${linkedPM.nombre}". Edite o elimine dicho método primero.` };
    }

    this.db.monedas = this.db.monedas.filter((c) => c.id !== id);
    this.addAuditLog('ELIMINAR_MONEDA', 'CONFIGURACION', `Moneda eliminada: ${item.codigo} (${item.nombre})`);
    this.saveDatabase(this.db);
    return { success: true };
  }

  public setPrincipalCurrency(id: string) {
    const currencies = this.getCurrencies();
    const target = currencies.find((c) => c.id === id);
    if (!target) return;

    currencies.forEach((c) => {
      c.esPrincipal = c.id === id;
      if (c.id === id) {
        c.esReferencia = false;
        c.valorTasa = 1.0;
      }
    });

    this.db.moneda.monedaPrincipal = {
      codigo: target.codigo,
      simbolo: target.simbolo,
      nombre: target.nombre,
      decimales: target.decimales,
    };

    this.addAuditLog('ESTABLECER_MONEDA_PRINCIPAL', 'CONFIGURACION', `Moneda Principal cambiada a: ${target.codigo} (${target.nombre})`);
    this.saveDatabase(this.db);
  }

  public setReferenceCurrency(id: string, valorTasa?: number) {
    const currencies = this.getCurrencies();
    const target = currencies.find((c) => c.id === id);
    if (!target) return;

    currencies.forEach((c) => {
      c.esReferencia = c.id === id;
      if (c.id === id) {
        c.esPrincipal = false;
        if (valorTasa && valorTasa > 0) {
          c.valorTasa = valorTasa;
        }
      }
    });

    const rate = (valorTasa && valorTasa > 0) ? valorTasa : (target.valorTasa || 1);

    this.db.moneda.monedaReferencia = {
      codigo: target.codigo,
      simbolo: target.simbolo,
      nombre: target.nombre,
      decimales: target.decimales,
    };
    this.db.moneda.tasaCambio = rate;
    this.db.moneda.ultimaActualizacionTasa = new Date().toISOString();

    this.addAuditLog('ESTABLECER_MONEDA_REFERENCIA', 'CONFIGURACION', `Moneda de Referencia cambiada a: ${target.codigo} (${target.nombre}) con tasa ${rate}`);
    this.saveDatabase(this.db);
  }

  public updateReferenceRate(valorTasa: number) {
    if (isNaN(valorTasa) || valorTasa <= 0) return;
    const currencies = this.getCurrencies();
    const ref = currencies.find((c) => c.esReferencia);
    if (ref) {
      ref.valorTasa = valorTasa;
    }
    this.db.moneda.tasaCambio = valorTasa;
    this.db.moneda.ultimaActualizacionTasa = new Date().toISOString();
    this.addAuditLog('ACTUALIZAR_TASA_CAMBIO', 'CONFIGURACION', `Tasa de cambio actualizada: 1 ${this.db.moneda.monedaPrincipal.codigo} = ${valorTasa} ${this.db.moneda.monedaReferencia.codigo}`);
    this.saveDatabase(this.db);
  }

  // -------------------------------------------------------------
  // FACTURACIÓN: 2. CUENTAS BANCARIAS
  // -------------------------------------------------------------
  public getBankAccounts(): BankAccount[] {
    if (!this.db.cuentasBancarias || !Array.isArray(this.db.cuentasBancarias) || this.db.cuentasBancarias.length === 0) {
      this.db.cuentasBancarias = [...INITIAL_BANK_ACCOUNTS];
    }
    return this.db.cuentasBancarias;
  }

  public saveBankAccount(account: BankAccount) {
    if (!this.db.cuentasBancarias) {
      this.db.cuentasBancarias = [...INITIAL_BANK_ACCOUNTS];
    }
    const idx = this.db.cuentasBancarias.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
      this.db.cuentasBancarias[idx] = account;
      this.addAuditLog('MODIFICAR_CUENTA_BANCARIA', 'CONFIGURACION', `Cuenta bancaria modificada: ${account.banco} (${account.numeroCuenta}) - Titular: ${account.titular}`);
    } else {
      this.db.cuentasBancarias.push(account);
      this.addAuditLog('CREAR_CUENTA_BANCARIA', 'CONFIGURACION', `Nueva cuenta bancaria creada: ${account.banco} (${account.numeroCuenta}) - RIF: ${account.documentoId}`);
    }
    this.saveDatabase(this.db);
  }

  public deleteBankAccount(id: string): { success: boolean; error?: string } {
    if (!this.db.cuentasBancarias) return { success: false, error: 'No hay cuentas registradas' };
    const acc = this.db.cuentasBancarias.find((a) => a.id === id);
    if (!acc) return { success: false, error: 'Cuenta bancaria no encontrada' };

    const linkedPM = (this.db.metodosPagoConfig || []).find((pm) => pm.cuentaId === id);
    if (linkedPM) {
      return {
        success: false,
        error: `No se puede eliminar la cuenta "${acc.banco}" porque está vinculada al método de pago "${linkedPM.nombre}". Modifique o elimine el método de pago primero.`,
      };
    }

    this.db.cuentasBancarias = this.db.cuentasBancarias.filter((a) => a.id !== id);
    this.addAuditLog('ELIMINAR_CUENTA_BANCARIA', 'CONFIGURACION', `Cuenta bancaria eliminada: ${acc.banco} (${acc.numeroCuenta})`);
    this.saveDatabase(this.db);
    return { success: true };
  }

  // -------------------------------------------------------------
  // FACTURACIÓN: 3. MÉTODOS DE PAGO
  // -------------------------------------------------------------
  public getPaymentMethodsConfig(): PaymentMethodItem[] {
    if (!this.db.metodosPagoConfig || !Array.isArray(this.db.metodosPagoConfig) || this.db.metodosPagoConfig.length === 0) {
      this.db.metodosPagoConfig = [...INITIAL_PAYMENT_METHODS];
    }
    return this.db.metodosPagoConfig;
  }

  public savePaymentMethodConfig(method: PaymentMethodItem): { success: boolean; error?: string } {
    if (!method.monedaId) {
      return { success: false, error: 'Debe vincular el método de pago al menos a una moneda.' };
    }
    if (!method.cuentaId) {
      return { success: false, error: 'Debe vincular el método de pago a una cuenta bancaria.' };
    }

    if (!this.db.metodosPagoConfig) {
      this.db.metodosPagoConfig = [...INITIAL_PAYMENT_METHODS];
    }

    const idx = this.db.metodosPagoConfig.findIndex((m) => m.id === method.id);
    if (idx >= 0) {
      this.db.metodosPagoConfig[idx] = method;
      this.addAuditLog('MODIFICAR_METODO_PAGO', 'CONFIGURACION', `Método de pago modificado: ${method.nombre} (${method.tipo})`);
    } else {
      this.db.metodosPagoConfig.push(method);
      this.addAuditLog('CREAR_METODO_PAGO', 'CONFIGURACION', `Nuevo método de pago creado: ${method.nombre} (${method.tipo})`);
    }
    this.saveDatabase(this.db);
    return { success: true };
  }

  public deletePaymentMethodConfig(id: string): { success: boolean; error?: string } {
    if (!this.db.metodosPagoConfig) return { success: false, error: 'No hay métodos de pago registrados' };
    const pm = this.db.metodosPagoConfig.find((m) => m.id === id);
    if (!pm) return { success: false, error: 'Método de pago no encontrado' };

    this.db.metodosPagoConfig = this.db.metodosPagoConfig.filter((m) => m.id !== id);
    this.addAuditLog('ELIMINAR_METODO_PAGO', 'CONFIGURACION', `Método de pago eliminado: ${pm.nombre}`);
    this.saveDatabase(this.db);
    return { success: true };
  }

  public saveTax(tax: Tax) {
    const index = this.db.impuestos.findIndex((t) => t.id === tax.id);
    if (index >= 0) {
      this.db.impuestos[index] = tax;
      this.addAuditLog('MODIFICAR_IMPUESTO', 'CONFIGURACION', `Impuesto actualizado: ${tax.nombre} (${tax.porcentaje}%)`);
    } else {
      this.db.impuestos.push(tax);
      this.addAuditLog('CREAR_IMPUESTO', 'CONFIGURACION', `Nuevo impuesto creado: ${tax.nombre} (${tax.porcentaje}%)`);
    }
    this.saveDatabase(this.db);
  }

  public deleteTax(id: string) {
    const tax = this.db.impuestos.find((t) => t.id === id);
    if (!tax) return;
    this.db.impuestos = this.db.impuestos.filter((t) => t.id !== id);
    this.addAuditLog('ELIMINAR_IMPUESTO', 'CONFIGURACION', `Impuesto eliminado: ${tax.nombre}`);
    this.saveDatabase(this.db);
  }

  // CATEGORIES
  public saveCategory(category: Category) {
    const index = this.db.categorias.findIndex((c) => c.id === category.id);
    if (index >= 0) {
      this.db.categorias[index] = category;
      this.addAuditLog('MODIFICAR_CATEGORIA', 'CATEGORIAS', `Categoría actualizada: ${category.nombre}`);
    } else {
      this.db.categorias.push(category);
      this.addAuditLog('CREAR_CATEGORIA', 'CATEGORIAS', `Nueva categoría creada: ${category.nombre}`);
    }
    this.saveDatabase(this.db);
  }

  public deleteCategory(id: string) {
    const cat = this.db.categorias.find((c) => c.id === id);
    if (!cat) return;
    // Check if products belong to category
    const count = this.db.productos.filter((p) => p.categoriaId === id).length;
    if (count > 0) {
      throw new Error(`No se puede eliminar la categoría porque contiene ${count} producto(s) asignados.`);
    }
    this.db.categorias = this.db.categorias.filter((c) => c.id !== id);
    this.addAuditLog('ELIMINAR_CATEGORIA', 'CATEGORIAS', `Categoría eliminada: ${cat.nombre}`);
    this.saveDatabase(this.db);
  }

  // PRODUCTS
  public isBarcodeAvailable(barcode: string, excludeProductId?: string, excludeVariantId?: string): { available: boolean; conflictWith?: string } {
    const trimmed = barcode.trim();
    if (!trimmed) return { available: true };

    for (const p of this.db.productos) {
      if (p.id !== excludeProductId && p.codigoBarras && p.codigoBarras.trim() === trimmed) {
        return { available: false, conflictWith: `Producto: "${p.nombre}"` };
      }
      if (p.variantes) {
        for (const v of p.variantes) {
          if (v.id !== excludeVariantId && v.codigoBarras && v.codigoBarras.trim() === trimmed) {
            return { available: false, conflictWith: `Variante "${v.nombre}" del producto "${p.nombre}"` };
          }
        }
      }
    }
    return { available: true };
  }

  public saveProduct(product: Product) {
    const currentUserId = this.currentUser ? this.currentUser.id : 'usr-admin';
    const currentUserName = this.currentUser
      ? `${this.currentUser.nombre} ${this.currentUser.apellido}`
      : 'Administrador';

    const index = this.db.productos.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      const old = this.db.productos[index];
      this.db.productos[index] = product;
      this.addAuditLog(
        'MODIFICAR_PRODUCTO',
        'PRODUCTOS',
        `Producto modificado: ${product.nombre} (P. Venta: $${product.precioVenta.toFixed(2)}, Costo: $${product.precioCompra.toFixed(2)}, Margen: ${product.porcentajeGanancia.toFixed(1)}%, Stock: ${product.stockActual} ${product.unidadMedida}, Estado: ${product.activo ? 'ACTIVO' : 'INACTIVO'})`
      );

      // If stock changed directly via product edit, record movement
      if (old.stockActual !== product.stockActual) {
        const diff = product.stockActual - old.stockActual;
        this.addMovement({
          productoId: product.id,
          productoNombre: product.nombre,
          tipo: diff > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
          cantidad: Math.abs(diff),
          stockAnterior: old.stockActual,
          stockPosterior: product.stockActual,
          motivo: 'Ajuste manual desde ficha de edición de producto',
          referenciaDoc: 'EDICION-PROD',
          usuarioId: currentUserId,
          usuarioNombre: currentUserName,
        });
      }
    } else {
      this.db.productos.push(product);
      this.addAuditLog(
        'CREAR_PRODUCTO',
        'PRODUCTOS',
        `Nuevo producto creado: ${product.nombre} (Código: ${product.codigoBarras}, P. Venta: $${product.precioVenta.toFixed(2)}, Costo: $${product.precioCompra.toFixed(2)}, Stock: ${product.stockActual} ${product.unidadMedida})`
      );
      if (product.stockActual > 0) {
        this.addMovement({
          productoId: product.id,
          productoNombre: product.nombre,
          tipo: 'ENTRADA_COMPRA',
          cantidad: product.stockActual,
          stockAnterior: 0,
          stockPosterior: product.stockActual,
          motivo: 'Inventario inicial al dar de alta producto',
          referenciaDoc: 'ALTA-PROD',
          usuarioId: currentUserId,
          usuarioNombre: currentUserName,
        });
      }
    }
    this.saveDatabase(this.db);
  }

  public toggleProductStatus(id: string): boolean {
    const prod = this.db.productos.find((p) => p.id === id);
    if (!prod) return false;
    prod.activo = !prod.activo;
    this.addAuditLog(
      prod.activo ? 'ACTIVAR_PRODUCTO' : 'DESACTIVAR_PRODUCTO',
      'PRODUCTOS',
      `Producto "${prod.nombre}" marcado como ${prod.activo ? 'ACTIVO' : 'INACTIVO'} en el catálogo.`
    );
    this.saveDatabase(this.db);
    return prod.activo;
  }

  public duplicateProduct(id: string): Product {
    const original = this.db.productos.find((p) => p.id === id);
    if (!original) throw new Error('Producto original no encontrado');

    const newId = 'prod-' + Date.now();
    const newBarcode = '759' + Math.floor(100000000 + Math.random() * 900000000);
    const duplicatedVariants: ProductVariant[] = (original.variantes || []).map((v, i) => ({
      ...v,
      id: 'var-' + Date.now() + '-' + i,
      codigoBarras: `${newBarcode}-V${i + 1}`,
      stock: v.stock,
    }));

    const copy: Product = {
      ...original,
      id: newId,
      nombre: `Copia de ${original.nombre}`,
      codigoBarras: newBarcode,
      stockActual: 0, // Inicia en 0 para requerir entrada de inventario
      creadoEn: new Date().toISOString(),
      variantes: duplicatedVariants,
    };

    this.db.productos.push(copy);
    this.addAuditLog(
      'DUPLICAR_PRODUCTO',
      'PRODUCTOS',
      `Producto clonado a partir de "${original.nombre}": "${copy.nombre}" (Nuevo SKU: ${copy.codigoBarras})`
    );
    this.saveDatabase(this.db);
    return copy;
  }

  public deleteProduct(id: string) {
    const prod = this.db.productos.find((p) => p.id === id);
    if (!prod) return;
    this.db.productos = this.db.productos.filter((p) => p.id !== id);
    this.addAuditLog(
      'ELIMINAR_PRODUCTO',
      'PRODUCTOS',
      `Producto eliminado del catálogo: "${prod.nombre}" (Código: ${prod.codigoBarras}, Stock final: ${prod.stockActual} ${prod.unidadMedida})`
    );
    this.saveDatabase(this.db);
  }

  public getProductMovements(productId: string): InventoryMovement[] {
    return this.db.movimientos.filter((m) => m.productoId === productId);
  }

  // PRODUCT VARIANTS METHODS
  public saveProductVariant(productId: string, variant: ProductVariant) {
    const product = this.db.productos.find((p) => p.id === productId);
    if (!product) throw new Error('Producto no encontrado');

    if (!product.variantes) {
      product.variantes = [];
    }

    const idx = product.variantes.findIndex((v) => v.id === variant.id);
    if (idx >= 0) {
      product.variantes[idx] = variant;
      this.addAuditLog(
        'MODIFICAR_VARIANTE',
        'PRODUCTOS',
        `Variante "${variant.nombre}" actualizada en ${product.nombre} (P. Venta: $${variant.precio.toFixed(2)})`
      );
    } else {
      product.variantes.push(variant);
      this.addAuditLog(
        'CREAR_VARIANTE',
        'PRODUCTOS',
        `Nueva variante "${variant.nombre}" añadida a ${product.nombre} (P. Venta: $${variant.precio.toFixed(2)})`
      );
    }

    this.saveDatabase(this.db);
  }

  public deleteProductVariant(productId: string, variantId: string) {
    const product = this.db.productos.find((p) => p.id === productId);
    if (!product || !product.variantes) return;

    const removed = product.variantes.find((v) => v.id === variantId);
    product.variantes = product.variantes.filter((v) => v.id !== variantId);

    if (removed) {
      this.addAuditLog(
        'ELIMINAR_VARIANTE',
        'PRODUCTOS',
        `Variante "${removed.nombre}" eliminada del producto ${product.nombre}`
      );
    }

    this.saveDatabase(this.db);
  }

  // INVENTORY ADJUSTMENT
  public adjustInventory(productoId: string, nuevaCantidad: number, motivo: string) {
    const prod = this.db.productos.find((p) => p.id === productoId);
    if (!prod) throw new Error('Producto no encontrado');

    const anterior = prod.stockActual;
    const diff = nuevaCantidad - anterior;
    if (diff === 0) return;

    prod.stockActual = nuevaCantidad;

    const currentUserId = this.currentUser ? this.currentUser.id : 'usr-admin';
    const currentUserName = this.currentUser
      ? `${this.currentUser.nombre} ${this.currentUser.apellido}`
      : 'Administrador';

    this.addMovement({
      productoId: prod.id,
      productoNombre: prod.nombre,
      tipo: diff > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
      cantidad: Math.abs(diff),
      stockAnterior: anterior,
      stockPosterior: nuevaCantidad,
      motivo: motivo || 'Ajuste de inventario periódico',
      referenciaDoc: 'AJUSTE-KARDEX',
      usuarioId: currentUserId,
      usuarioNombre: currentUserName,
    });

    this.addAuditLog('AJUSTE_INVENTARIO', 'INVENTARIO', `Stock de ${prod.nombre} ajustado de ${anterior} a ${nuevaCantidad} ${prod.unidadMedida}. Motivo: ${motivo}`);
    this.saveDatabase(this.db);
  }

  private addMovement(movement: Omit<InventoryMovement, 'id' | 'fecha'>) {
    const newMov: InventoryMovement = {
      ...movement,
      id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      fecha: new Date().toISOString(),
    };
    this.db.movimientos.unshift(newMov);
    if (this.db.movimientos.length > 500) {
      this.db.movimientos.pop();
    }
  }

  // USERS
  public saveUser(user: User) {
    const index = this.db.usuarios.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      this.db.usuarios[index] = user;
      this.addAuditLog('MODIFICAR_USUARIO', 'USUARIOS', `Usuario modificado: ${user.nombre} ${user.apellido} (${user.role})`);
    } else {
      this.db.usuarios.push(user);
      this.addAuditLog('CREAR_USUARIO', 'USUARIOS', `Nuevo usuario creado: ${user.nombre} ${user.apellido} (${user.role}) - Doc: ${user.docId}`);
    }
    this.saveDatabase(this.db);
  }

  public deleteUser(id: string) {
    const user = this.db.usuarios.find((u) => u.id === id);
    if (!user) return;
    if (this.currentUser && user.id === this.currentUser.id) {
      throw new Error('No puedes eliminar al usuario con la sesión activa actual.');
    }
    const adminCount = this.db.usuarios.filter((u) => u.role === 'ADMINISTRADOR' && u.activo).length;
    if (user.role === 'ADMINISTRADOR' && adminCount <= 1) {
      throw new Error('Debe existir al menos un usuario Administrador activo en el sistema.');
    }
    this.db.usuarios = this.db.usuarios.filter((u) => u.id !== id);
    this.addAuditLog('ELIMINAR_USUARIO', 'USUARIOS', `Usuario eliminado: ${user.nombre} ${user.apellido}`);
    this.saveDatabase(this.db);
  }

  // SALES (TPV)
  public recordSale(
    saleData: Omit<Sale, 'id' | 'numeroTicket' | 'fecha' | 'vendedorId' | 'vendedorNombre'> & {
      vendedorId?: string;
      vendedorNombre?: string;
    }
  ): Sale {
    const nextTicketNumber = `TKT-${String(this.db.ventas.length + 1).padStart(6, '0')}`;
    const fallbackId = this.currentUser ? this.currentUser.id : 'usr-admin';
    const fallbackName = this.currentUser ? `${this.currentUser.nombre} ${this.currentUser.apellido}` : 'Cajero / Admin';
    const vendedorId = saleData.vendedorId || fallbackId;
    const vendedorNombre = saleData.vendedorNombre || fallbackName;

    const newSale: Sale = {
      ...saleData,
      id: 'sale-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      numeroTicket: nextTicketNumber,
      fecha: new Date().toISOString(),
      vendedorId,
      vendedorNombre,
    };

    // Deduct inventory
    for (const item of newSale.items) {
      const prod = this.db.productos.find((p) => p.id === item.producto.id);
      if (prod) {
        const stockAnterior = prod.stockActual;
        prod.stockActual = Math.max(0, prod.stockActual - item.cantidad);

        // Deduct specific variant stock if applicable
        if (item.variante && prod.variantes) {
          const varObj = prod.variantes.find((v) => v.id === item.variante!.id);
          if (varObj) {
            varObj.stock = Math.max(0, varObj.stock - item.cantidad);
          }
        }

        const itemDescriptor = item.variante
          ? `${prod.nombre} (${item.variante.nombre})`
          : prod.nombre;

        this.addMovement({
          productoId: prod.id,
          productoNombre: itemDescriptor,
          tipo: 'SALIDA_VENTA',
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior: prod.stockActual,
          motivo: `Venta TPV Ticket #${nextTicketNumber}${item.variante ? ` [${item.variante.nombre}]` : ''}`,
          referenciaDoc: nextTicketNumber,
          usuarioId: vendedorId,
          usuarioNombre: vendedorNombre,
        });
      }
    }

    this.db.ventas.unshift(newSale);
    this.addAuditLog(
      'VENTA_COMPLETADA',
      'VENTAS',
      `Venta completada Ticket #${nextTicketNumber} por $${newSale.totalPrincipal.toFixed(2)} (${newSale.totalReferencia.toFixed(2)} ${this.db.moneda.monedaReferencia.codigo}) - Vendedor: ${vendedorNombre}`
    );
    this.saveDatabase(this.db);
    return newSale;
  }

  public saveSale(sale: Sale): Sale {
    const idx = this.db.ventas.findIndex((v) => v.id === sale.id);
    if (idx >= 0) {
      this.db.ventas[idx] = sale;
    } else {
      for (const item of sale.items) {
        const prod = this.db.productos.find((p) => p.id === item.producto.id);
        if (prod) {
          const stockAnterior = prod.stockActual;
          prod.stockActual = Math.max(0, prod.stockActual - item.cantidad);
          if (item.variante && prod.variantes) {
            const varObj = prod.variantes.find((v) => v.id === item.variante!.id);
            if (varObj) {
              varObj.stock = Math.max(0, varObj.stock - item.cantidad);
            }
          }
          const itemDescriptor = item.variante ? `${prod.nombre} (${item.variante.nombre})` : prod.nombre;
          this.addMovement({
            productoId: prod.id,
            productoNombre: itemDescriptor,
            tipo: 'SALIDA_VENTA',
            cantidad: item.cantidad,
            stockAnterior,
            stockPosterior: prod.stockActual,
            motivo: `Venta TPV Ticket #${sale.numeroTicket}`,
            referenciaDoc: sale.numeroTicket,
            usuarioId: sale.vendedorId,
            usuarioNombre: sale.vendedorNombre,
          });
        }
      }
      this.db.ventas.unshift(sale);
      this.addAuditLog(
        'VENTA_COMPLETADA',
        'VENTAS',
        `Venta completada Ticket #${sale.numeroTicket} por $${sale.totalPrincipal.toFixed(2)} (${sale.totalReferencia.toFixed(2)} ${this.db.moneda.monedaReferencia.codigo}) - Vendedor: ${sale.vendedorNombre}`
      );
    }

    // If sale is a credit sale with outstanding balance, record in Cuentas por Cobrar
    if (
      (sale.condicionVenta === 'CREDITO' || (sale.saldoPendientePrincipal && sale.saldoPendientePrincipal > 0.009)) &&
      sale.cliente &&
      sale.cliente.docId &&
      sale.cliente.docId !== 'V-00000000'
    ) {
      const pendingPrincipal = sale.saldoPendientePrincipal || Math.max(0, sale.totalPrincipal - sale.pago.montoPagadoPrincipal);
      const paidPrincipal = sale.montoAbonadoPrincipal !== undefined ? sale.montoAbonadoPrincipal : sale.pago.montoPagadoPrincipal;
      if (pendingPrincipal > 0.009) {
        this.addClientDebt({
          clienteDocId: sale.cliente.docId,
          clienteNombre: sale.cliente.nombre,
          clienteTelefono: sale.cliente.telefono,
          ticketId: sale.id,
          numeroTicket: sale.numeroTicket,
          fecha: sale.fecha,
          montoTotalPrincipal: sale.totalPrincipal,
          montoAbonadoPrincipal: paidPrincipal,
          saldoPendientePrincipal: pendingPrincipal,
          montoTotalReferencia: sale.totalReferencia,
          montoAbonadoReferencia: Number((paidPrincipal * sale.tasaCambioAplicada).toFixed(2)),
          saldoPendienteReferencia: Number((pendingPrincipal * sale.tasaCambioAplicada).toFixed(2)),
          tasaCambio: sale.tasaCambioAplicada,
          estado: 'PENDIENTE',
          notas: `Venta a Crédito #${sale.numeroTicket}. Monto abonado: $${paidPrincipal.toFixed(2)}`,
          historialAbonos: paidPrincipal > 0 ? [
            {
              id: 'abono-' + Date.now(),
              fecha: sale.fecha,
              montoPrincipal: paidPrincipal,
              montoReferencia: Number((paidPrincipal * sale.tasaCambioAplicada).toFixed(2)),
              metodoPago: sale.pago.metodo,
              referenciaBancaria: sale.pago.referenciaBancaria,
              usuarioNombre: sale.vendedorNombre,
              notas: 'Abono inicial al procesar venta a crédito'
            }
          ] : []
        });
      }
    }

    // If this sale included a previous debt collection line item, mark the previous debts as settled
    const debtItem = sale.items.find(i => i.producto.id === 'DEUDA-PENDIENTE' || i.producto.codigoBarras === 'DEUDA-CXC');
    if (debtItem && sale.cliente && sale.cliente.docId) {
      this.settleAllClientDebts(sale.cliente.docId, sale.numeroTicket, debtItem.subtotal);
    }

    this.saveDatabase(this.db);
    return sale;
  }

  // Get unique recent clients from sales and default templates
  public getRecentClients(): ClientData[] {
    const clientsMap = new Map<string, ClientData>();
    // Default general client
    clientsMap.set('V-00000000', {
      nombre: 'Consumidor Final',
      docId: 'V-00000000',
      telefono: '',
    });

    for (const sale of this.db.ventas) {
      if (sale.cliente && sale.cliente.docId && !clientsMap.has(sale.cliente.docId)) {
        clientsMap.set(sale.cliente.docId, sale.cliente);
      }
    }

    if (clientsMap.size <= 1) {
      clientsMap.set('J-30495812-0', {
        nombre: 'Librería & Papelería Central C.A.',
        docId: 'J-30495812-0',
        telefono: '+58 412 9876543',
        direccion: 'Av. Bolívar, Centro Comercial Plaza, Local 12',
        email: 'libreriacentral@gmail.com',
      });
      clientsMap.set('V-20112455', {
        nombre: 'Alejandro Mendoza',
        docId: 'V-20112455',
        telefono: '+58 414 5558899',
        direccion: 'Urb. Los Rosales, Calle 4',
        email: 'alejandro.mendoza@email.com',
      });
      clientsMap.set('J-41223901-4', {
        nombre: 'Distribuidora Escolar El Saber',
        docId: 'J-41223901-4',
        telefono: '+58 424 3332211',
        direccion: 'Zona Industrial Este, Galpón 5',
        email: 'elsaber.ventas@gmail.com',
      });
    }

    return Array.from(clientsMap.values());
  }

  // PURCHASES (COMPRAS)
  public recordPurchase(purchaseData: Omit<Purchase, 'id' | 'fecha' | 'usuarioId' | 'usuarioNombre'>): Purchase {
    const usrId = this.currentUser ? this.currentUser.id : 'usr-admin';
    const usrName = this.currentUser ? `${this.currentUser.nombre} ${this.currentUser.apellido}` : 'Administrador';

    const newPurchase: Purchase = {
      ...purchaseData,
      id: 'pur-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      fecha: new Date().toISOString(),
      usuarioId: usrId,
      usuarioNombre: usrName,
    };

    // Increase stock and update cost
    for (const item of newPurchase.items) {
      const prod = this.db.productos.find((p) => p.id === item.productoId);
      if (prod) {
        const stockAnterior = prod.stockActual;
        prod.stockActual += item.cantidad;
        prod.precioCompra = item.costoUnitario;
        // Recalculate profit percentage
        if (prod.precioCompra > 0) {
          prod.porcentajeGanancia = Number((((prod.precioVenta - prod.precioCompra) / prod.precioCompra) * 100).toFixed(2));
        }

        this.addMovement({
          productoId: prod.id,
          productoNombre: prod.nombre,
          tipo: 'ENTRADA_COMPRA',
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior: prod.stockActual,
          motivo: `Compra Proveedor Factura #${newPurchase.numeroFactura} (${newPurchase.proveedorNombre})`,
          referenciaDoc: newPurchase.numeroFactura,
          usuarioId: usrId,
          usuarioNombre: usrName,
        });
      }
    }

    this.db.compras.unshift(newPurchase);
    this.addAuditLog('COMPRA_REGISTRADA', 'COMPRAS', `Factura #${newPurchase.numeroFactura} registrada a ${newPurchase.proveedorNombre} por $${newPurchase.totalPrincipal.toFixed(2)}`);
    this.saveDatabase(this.db);
    return newPurchase;
  }

  // REFUNDS (DEVOLUCIONES)
  public recordRefund(refundData: Omit<Refund, 'id' | 'numeroNotaCredito' | 'fecha' | 'usuarioId' | 'usuarioNombre'>): Refund {
    const nextRefundNumber = `NC-${String(this.db.devoluciones.length + 1).padStart(6, '0')}`;
    const usrId = this.currentUser ? this.currentUser.id : 'usr-admin';
    const usrName = this.currentUser ? `${this.currentUser.nombre} ${this.currentUser.apellido}` : 'Administrador';

    const newRefund: Refund = {
      ...refundData,
      id: 'ref-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      numeroNotaCredito: nextRefundNumber,
      fecha: new Date().toISOString(),
      usuarioId: usrId,
      usuarioNombre: usrName,
    };

    // Return items to inventory
    for (const item of newRefund.items) {
      const prod = this.db.productos.find((p) => p.id === item.productoId);
      if (prod) {
        const stockAnterior = prod.stockActual;
        prod.stockActual += item.cantidad;
        this.addMovement({
          productoId: prod.id,
          productoNombre: prod.nombre,
          tipo: 'DEVOLUCION',
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior: prod.stockActual,
          motivo: `Devolución Nota Crédito #${nextRefundNumber} - Motivo: ${newRefund.motivo}`,
          referenciaDoc: nextRefundNumber,
          usuarioId: usrId,
          usuarioNombre: usrName,
        });
      }
    }

    // Update sale status if all or partial
    const originalSale = this.db.ventas.find((s) => s.id === newRefund.ventaId);
    if (originalSale) {
      originalSale.estado = 'DEVUELTA_PARCIAL';
    }

    this.db.devoluciones.unshift(newRefund);
    this.addAuditLog('DEVOLUCION_PROCESADA', 'DEVOLUCIONES', `Devolución procesada NC #${nextRefundNumber} (Ticket ${newRefund.numeroTicket}) por $${newRefund.totalPrincipal.toFixed(2)}`);
    this.saveDatabase(this.db);
    return newRefund;
  }

  // EXPORT / IMPORT / RESET
  public exportDatabaseJson(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public importDatabaseJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data.productos || !data.empresa || !data.moneda || !data.usuarios) {
        throw new Error('El archivo no contiene una estructura válida de Base de Datos TPV.');
      }
      this.saveDatabase(data);
      this.addAuditLog('RESTAURAR_BASE_DATOS', 'CONFIGURACION', 'Base de datos restaurada exitosamente desde archivo JSON externo.');
      return true;
    } catch (e: any) {
      throw new Error('Error al importar la base de datos: ' + (e?.message || 'Formato JSON inválido'));
    }
  }

  public resetToFactoryDefaults() {
    const initial = getInitialDatabase();
    this.saveDatabase(initial);
    this.setCurrentUser(initial.usuarios[0]);
    this.addAuditLog('REINICIO_FABRICA', 'CONFIGURACION', 'El sistema fue restaurado a sus valores iniciales de fábrica.');
  }

  public getClients(): ClientData[] {
    if (!this.db.clientes || this.db.clientes.length === 0) {
      this.db.clientes = [...INITIAL_CLIENTS];
      this.saveDatabase(this.db);
    }
    return this.db.clientes;
  }

  public saveClient(client: ClientData): ClientData {
    if (!this.db.clientes) {
      this.db.clientes = [...INITIAL_CLIENTS];
    }
    const cleanDoc = (client.docId || '').trim();
    const existingIdx = this.db.clientes.findIndex(
      (c) => c.docId.trim().toLowerCase() === cleanDoc.toLowerCase()
    );
    if (existingIdx >= 0) {
      this.db.clientes[existingIdx] = { ...client };
    } else {
      this.db.clientes.push({ ...client });
    }
    this.addAuditLog('CLIENTE_GUARDADO', 'VENTAS', `Cliente registrado/actualizado: ${client.nombre} (${client.docId})`);
    this.saveDatabase(this.db);
    return client;
  }

  // =============================================================
  // VENTAS GUARDADAS (EN ESPERA)
  // No alteran inventario, stock, movimientos ni estadísticas.
  // =============================================================
  public getSavedSales(): SavedSale[] {
    if (!this.db.ventasGuardadas) {
      this.db.ventasGuardadas = [];
    }
    return this.db.ventasGuardadas;
  }

  public saveSavedSale(savedSale: SavedSale): SavedSale {
    if (!this.db.ventasGuardadas) {
      this.db.ventasGuardadas = [];
    }
    const existingIndex = this.db.ventasGuardadas.findIndex((s) => s.id === savedSale.id);
    if (existingIndex >= 0) {
      this.db.ventasGuardadas[existingIndex] = { ...savedSale };
    } else {
      this.db.ventasGuardadas.unshift({ ...savedSale });
    }
    this.addAuditLog(
      'VENTA_GUARDADA_ESPERA',
      'VENTAS',
      `Venta #${savedSale.codigo} guardada en espera por ${savedSale.vendedorNombre} (${savedSale.items.length} productos, total: ${savedSale.totalPrincipal.toFixed(2)}). Sin afectar inventario.`
    );
    this.saveDatabase(this.db);
    return savedSale;
  }

  public deleteSavedSale(id: string): boolean {
    if (!this.db.ventasGuardadas) {
      this.db.ventasGuardadas = [];
      return false;
    }
    const saleToDelete = this.db.ventasGuardadas.find((s) => s.id === id);
    this.db.ventasGuardadas = this.db.ventasGuardadas.filter((s) => s.id !== id);
    if (saleToDelete) {
      this.addAuditLog(
        'VENTA_GUARDADA_ELIMINADA',
        'VENTAS',
        `Venta guardada #${saleToDelete.codigo} descartada/eliminada por el usuario.`
      );
    }
    this.saveDatabase(this.db);
    return true;
  }

  // =============================================================
  // CUENTAS POR COBRAR (CONTROL ESTRICTO DE DEUDAS POR CLIENTE)
  // =============================================================
  public getClientDebts(clienteDocId?: string): ClientDebt[] {
    if (!this.db.cuentasPorCobrar) {
      this.db.cuentasPorCobrar = [...INITIAL_DEBTS];
    }
    if (clienteDocId) {
      const cleanDoc = clienteDocId.trim().toLowerCase();
      return this.db.cuentasPorCobrar.filter(
        (d) => d.clienteDocId.trim().toLowerCase() === cleanDoc
      );
    }
    return this.db.cuentasPorCobrar;
  }

  public getPendingClientDebts(clienteDocId?: string): ClientDebt[] {
    const all = this.getClientDebts(clienteDocId);
    return all.filter((d) => d.estado === 'PENDIENTE' && d.saldoPendientePrincipal > 0.009);
  }

  public getClientTotalPendingDebt(clienteDocId: string): {
    totalPrincipal: number;
    totalReferencia: number;
    debts: ClientDebt[];
  } {
    const debts = this.getPendingClientDebts(clienteDocId);
    const totalPrincipal = Number(debts.reduce((sum, d) => sum + d.saldoPendientePrincipal, 0).toFixed(2));
    const totalReferencia = Number((totalPrincipal * this.db.moneda.tasaCambio).toFixed(2));
    return {
      totalPrincipal,
      totalReferencia,
      debts,
    };
  }

  public addClientDebt(debt: Omit<ClientDebt, 'id'>): ClientDebt {
    if (!this.db.cuentasPorCobrar) {
      this.db.cuentasPorCobrar = [];
    }
    // Check if debt already exists for this ticket
    const existing = this.db.cuentasPorCobrar.find((d) => d.numeroTicket === debt.numeroTicket);
    if (existing) {
      Object.assign(existing, debt);
      this.saveDatabase(this.db);
      return existing;
    }

    const newDebt: ClientDebt = {
      ...debt,
      id: 'debt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    this.db.cuentasPorCobrar.unshift(newDebt);
    this.addAuditLog(
      'CUENTA_POR_COBRAR_CREADA',
      'VENTAS',
      `Venta a Crédito #${newDebt.numeroTicket} a ${newDebt.clienteNombre} (${newDebt.clienteDocId}). Total: $${newDebt.montoTotalPrincipal.toFixed(2)}, Abonado: $${newDebt.montoAbonadoPrincipal.toFixed(2)}, Saldo Deudor: $${newDebt.saldoPendientePrincipal.toFixed(2)}`
    );
    this.saveDatabase(this.db);
    return newDebt;
  }

  public addDebtPayment(
    debtId: string,
    amountPrincipal: number,
    metodoPago: string,
    referenciaBancaria?: string,
    notas?: string
  ): ClientDebt | null {
    if (!this.db.cuentasPorCobrar) return null;
    const debt = this.db.cuentasPorCobrar.find((d) => d.id === debtId);
    if (!debt) return null;

    const paymentAmount = Math.min(amountPrincipal, debt.saldoPendientePrincipal);
    debt.montoAbonadoPrincipal = Number((debt.montoAbonadoPrincipal + paymentAmount).toFixed(2));
    debt.saldoPendientePrincipal = Number(Math.max(0, debt.saldoPendientePrincipal - paymentAmount).toFixed(2));
    debt.montoAbonadoReferencia = Number((debt.montoAbonadoPrincipal * this.db.moneda.tasaCambio).toFixed(2));
    debt.saldoPendienteReferencia = Number((debt.saldoPendientePrincipal * this.db.moneda.tasaCambio).toFixed(2));

    if (debt.saldoPendientePrincipal <= 0.009) {
      debt.estado = 'PAGADO';
    }

    if (!debt.historialAbonos) debt.historialAbonos = [];
    const currentUserName = this.currentUser ? `${this.currentUser.nombre} ${this.currentUser.apellido}` : 'Cajero';
    debt.historialAbonos.push({
      id: 'abono-' + Date.now(),
      fecha: new Date().toISOString(),
      montoPrincipal: paymentAmount,
      montoReferencia: Number((paymentAmount * this.db.moneda.tasaCambio).toFixed(2)),
      metodoPago,
      referenciaBancaria,
      usuarioNombre: currentUserName,
      notas: notas || 'Abono registrado en caja',
    });

    this.addAuditLog(
      'ABONO_DEUDA_REGISTRADO',
      'VENTAS',
      `Abono de $${paymentAmount.toFixed(2)} registrado para deuda #${debt.numeroTicket} de ${debt.clienteNombre}. Saldo restante: $${debt.saldoPendientePrincipal.toFixed(2)}`
    );
    this.saveDatabase(this.db);
    return debt;
  }

  public settleAllClientDebts(clienteDocId: string, newTicketNumber: string, amountSettled?: number): void {
    if (!this.db.cuentasPorCobrar) return;
    const cleanDoc = clienteDocId.trim().toLowerCase();
    const debts = this.db.cuentasPorCobrar.filter(
      (d) => d.clienteDocId.trim().toLowerCase() === cleanDoc && d.estado === 'PENDIENTE'
    );
    let remainingSettlement = amountSettled !== undefined ? amountSettled : Infinity;

    for (const debt of debts) {
      if (remainingSettlement <= 0.001) break;
      const toPay = Math.min(debt.saldoPendientePrincipal, remainingSettlement);
      debt.montoAbonadoPrincipal = Number((debt.montoAbonadoPrincipal + toPay).toFixed(2));
      debt.saldoPendientePrincipal = Number(Math.max(0, debt.saldoPendientePrincipal - toPay).toFixed(2));
      debt.montoAbonadoReferencia = Number((debt.montoAbonadoPrincipal * this.db.moneda.tasaCambio).toFixed(2));
      debt.saldoPendienteReferencia = Number((debt.saldoPendientePrincipal * this.db.moneda.tasaCambio).toFixed(2));
      if (debt.saldoPendientePrincipal <= 0.009) {
        debt.estado = 'PAGADO';
      }
      if (!debt.historialAbonos) debt.historialAbonos = [];
      debt.historialAbonos.push({
        id: 'abono-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        fecha: new Date().toISOString(),
        montoPrincipal: toPay,
        montoReferencia: Number((toPay * this.db.moneda.tasaCambio).toFixed(2)),
        metodoPago: 'LIQUIDADO_EN_FACTURA',
        ticketCobro: newTicketNumber,
        usuarioNombre: this.currentUser ? `${this.currentUser.nombre} ${this.currentUser.apellido}` : 'Cajero',
        notas: `Saldo liquidado e incorporado en Ticket #${newTicketNumber}`,
      });
      remainingSettlement -= toPay;
    }
    this.addAuditLog(
      'DEUDAS_CLIENTE_LIQUIDADAS',
      'VENTAS',
      `Deuda(s) del cliente ${clienteDocId} saldadas e incorporadas en factura #${newTicketNumber}`
    );
    this.saveDatabase(this.db);
  }

  public simulateOnlineSync(): { success: boolean; syncedAt: string } {
    this.db.ultimaSincronizacion = new Date().toISOString();
    this.saveDatabase(this.db);
    return { success: true, syncedAt: this.db.ultimaSincronizacion };
  }

  // -------------------------------------------------------------
  // MÓDULO TALLER Y GESTIÓN DE PEDIDOS
  // -------------------------------------------------------------
  public getWorkshopOrders(): WorkshopOrder[] {
    if (!this.db.pedidosTaller || !Array.isArray(this.db.pedidosTaller)) {
      this.db.pedidosTaller = [...INITIAL_WORKSHOP_ORDERS];
      this.saveDatabase(this.db);
    }
    return [...this.db.pedidosTaller];
  }

  public getWorkshopOrderById(id: string): WorkshopOrder | undefined {
    const orders = this.getWorkshopOrders();
    return orders.find((o) => o.id === id || o.numeroPedido === id);
  }

  public saveWorkshopOrder(order: WorkshopOrder): void {
    if (!this.db.pedidosTaller) {
      this.db.pedidosTaller = [];
    }
    const idx = this.db.pedidosTaller.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      this.db.pedidosTaller[idx] = order;
      this.addAuditLog(
        'PEDIDO_TALLER_MODIFICADO',
        'TALLER',
        `Pedido #${order.numeroPedido} actualizado (${order.estado}) para ${order.cliente.nombre}`
      );
    } else {
      this.db.pedidosTaller.unshift(order);
      this.addAuditLog(
        'PEDIDO_TALLER_CREADO',
        'TALLER',
        `Nuevo Pedido de Taller #${order.numeroPedido} creado para ${order.cliente.nombre}`
      );
    }
    this.saveDatabase(this.db);
  }

  public updateWorkshopOrderStatus(
    orderId: string,
    newStatus: WorkshopOrderStatus,
    statusNote?: string
  ): WorkshopOrder | null {
    if (!this.db.pedidosTaller) return null;
    const order = this.db.pedidosTaller.find((o) => o.id === orderId);
    if (!order) return null;

    order.estado = newStatus;
    // Update product items in this order to match the new status
    if (order.items && order.items.length > 0) {
      order.items = order.items.map((item) => ({
        ...item,
        estado: newStatus,
      }));
    }
    const now = new Date();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const formattedNow = `${now.getDate()} ${months[now.getMonth()]}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const statusOrder: WorkshopOrderStatus[] = [
      'ACEPTADO',
      'EN_CONFECCION',
      'EN_DISENO',
      'LISTO',
      'ENTREGADO',
    ];
    // Map CONFIRMADO to ACEPTADO if encountered
    const normalizedTarget = (newStatus === 'CONFIRMADO' ? 'ACEPTADO' : newStatus) as WorkshopOrderStatus;
    const targetIdx = statusOrder.indexOf(normalizedTarget);

    order.timeline = statusOrder.map((st, i) => {
      const existing = order.timeline?.find((t) => t.estado === st || (st === 'ACEPTADO' && t.estado === 'CONFIRMADO'));
      const isPast = i < targetIdx;
      const isCurrent = i === targetIdx;

      let fecha = existing?.fecha;
      let descripcion = existing?.descripcion;

      if (isCurrent) {
        fecha = formattedNow;
        if (statusNote) {
          descripcion = statusNote;
        } else if (!descripcion) {
          descripcion = `${formattedNow} - Pedido en estado ${st === 'ACEPTADO' ? 'ACEPTADO' : st.replace('_', ' ')}`;
        }
      } else if (isPast && !fecha) {
        fecha = 'Completado';
      }

      return {
        estado: st,
        titulo:
          st === 'ACEPTADO'
            ? 'ACEPTADO'
            : st === 'EN_CONFECCION'
            ? 'CONFECCIÓN'
            : st === 'EN_DISENO'
            ? 'DISEÑO'
            : st === 'LISTO'
            ? 'LISTO'
            : 'ENTREGADO',
        fecha,
        completado: isPast || (isCurrent && st === 'ENTREGADO'),
        actual: isCurrent && st !== 'ENTREGADO',
        descripcion,
      };
    });

    if (newStatus === 'ENTREGADO') {
      order.fechaEntregaReal = now.toISOString();
    }

    this.addAuditLog(
      'ESTADO_PEDIDO_ACTUALIZADO',
      'TALLER',
      `Pedido #${order.numeroPedido} actualizado a '${newStatus}'`
    );
    this.saveDatabase(this.db);
    return order;
  }

  public updateWorkshopOrderItemStatus(
    orderId: string,
    itemId: string,
    itemStatus: WorkshopOrderStatus
  ): WorkshopOrder | null {
    if (!this.db.pedidosTaller) return null;
    const order = this.db.pedidosTaller.find((o) => o.id === orderId);
    if (!order) return null;

    order.items = order.items.map((item) =>
      item.id === itemId ? { ...item, estado: itemStatus } : item
    );

    this.addAuditLog(
      'ESTADO_PRODUCTO_PEDIDO_ACTUALIZADO',
      'TALLER',
      `Producto en pedido #${order.numeroPedido} actualizado a estado '${itemStatus}'`
    );
    this.saveDatabase(this.db);
    return order;
  }

  public addWorkshopOrderPayment(
    orderId: string,
    amount: number,
    metodoPago: string,
    notas?: string
  ): WorkshopOrder | null {
    if (!this.db.pedidosTaller) return null;
    const order = this.db.pedidosTaller.find((o) => o.id === orderId);
    if (!order) return null;

    const currentAbonado = order.montoAbonadoPrincipal || 0;
    const newAbonado = Number((currentAbonado + amount).toFixed(2));
    const newSaldo = Math.max(0, Number((order.totalPrincipal - newAbonado).toFixed(2)));

    order.montoAbonadoPrincipal = newAbonado;
    order.saldoPendientePrincipal = newSaldo;
    order.tipoPago = newSaldo === 0 ? 'COMPLETO' : 'PARCIAL';

    if (!order.historialAbonos) order.historialAbonos = [];
    order.historialAbonos.push({
      id: 'abono-' + Date.now(),
      fecha: new Date().toISOString(),
      monto: amount,
      metodoPago: metodoPago,
      usuarioNombre: this.currentUser ? `${this.currentUser.nombre} ${this.currentUser.apellido}` : undefined,
      notas: notas,
    });

    this.addAuditLog(
      'PAGO_PEDIDO_TALLER',
      'TALLER',
      `Abono de $${amount} (${metodoPago}) en pedido #${order.numeroPedido}. Saldo restante: $${newSaldo}`
    );
    this.saveDatabase(this.db);
    return order;
  }

  public deleteWorkshopOrder(orderId: string): boolean {
    if (!this.db.pedidosTaller) return false;
    const initialLen = this.db.pedidosTaller.length;
    const toDelete = this.db.pedidosTaller.find((o) => o.id === orderId);
    this.db.pedidosTaller = this.db.pedidosTaller.filter((o) => o.id !== orderId);
    if (this.db.pedidosTaller.length !== initialLen) {
      if (toDelete) {
        this.addAuditLog(
          'PEDIDO_TALLER_ELIMINADO',
          'TALLER',
          `Pedido #${toDelete.numeroPedido} eliminado del taller`
        );
      }
      this.saveDatabase(this.db);
      return true;
    }
    return false;
  }
}

export const db = new DatabaseService();
