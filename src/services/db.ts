import {
  DatabaseSchema,
  CompanyConfig,
  CurrencyConfig,
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
  SecurityConfig,
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

function getInitialDatabase(): DatabaseSchema {
  return {
    version: 1,
    empresa: INITIAL_COMPANY,
    seguridad: INITIAL_SECURITY,
    moneda: INITIAL_CURRENCY,
    impuestos: INITIAL_TAXES,
    categorias: INITIAL_CATEGORIES,
    productos: INITIAL_PRODUCTS,
    usuarios: INITIAL_USERS,
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
    this.addAuditLog('ACTUALIZAR_TASA_CAMBIO', 'CONFIGURACION', `Nueva tasa de cambio: 1 ${currency.monedaPrincipal.codigo} = ${currency.tasaCambio} ${currency.monedaReferencia.codigo}`);
    this.saveDatabase(this.db);
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

  public simulateOnlineSync(): { success: boolean; syncedAt: string } {
    this.db.ultimaSincronizacion = new Date().toISOString();
    this.saveDatabase(this.db);
    return { success: true, syncedAt: this.db.ultimaSincronizacion };
  }
}

export const db = new DatabaseService();
