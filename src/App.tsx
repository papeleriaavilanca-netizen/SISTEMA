import React, { useState, useEffect, useRef } from 'react';
import { db } from './services/db';
import { Sale, User, WorkshopOrder } from './types';
import { Header } from './components/Header';
import { Sidebar, ActiveTab, TAB_LABELS } from './components/Sidebar';
import { LoginModule } from './components/LoginModule';
import { DashboardModule } from './components/DashboardModule';
import { POSModule } from './components/POSModule';
import { ProductsModule } from './components/ProductsModule';
import { InventoryModule } from './components/InventoryModule';
import { CategoriesModule } from './components/CategoriesModule';
import { UsersModule } from './components/UsersModule';
import { PurchasesModule } from './components/PurchasesModule';
import { RefundsModule } from './components/RefundsModule';
import { ConfigModule } from './components/ConfigModule';
import { AuditModule } from './components/AuditModule';
import { TicketModal } from './components/TicketModal';
import { UserSwitchModal } from './components/UserSwitchModal';
import { WorkshopModule } from './components/WorkshopModule';
import { Menu, X, LayoutGrid, ChevronRight } from 'lucide-react';

export default function App() {
  // Trigger re-render whenever db mutates
  const [, setDbVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setDbVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Database snapshot
  const company = db.getCompany();
  const currency = db.getCurrency();
  const products = db.getProducts();
  const categories = db.getCategories();
  const taxes = db.getTaxes();
  const users = db.getUsers();
  const movements = db.getMovements();
  const sales = db.getSales();
  const purchases = db.getPurchases();
  const refunds = db.getRefunds();
  const auditLogs = db.getAuditLogs();
  const currentUser = db.getCurrentUser();
  const clients = db.getClients();

  // Workshop Orders Reactive State
  const [workshopOrders, setWorkshopOrders] = useState<WorkshopOrder[]>(() => db.getWorkshopOrders());
  const [selectedWorkshopOrderId, setSelectedWorkshopOrderId] = useState<string | null>(null);

  const refreshWorkshopOrders = () => {
    setWorkshopOrders([...db.getWorkshopOrders()]);
  };

  // Active module navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Inactivity auto-logout tracking
  const lastActivityRef = useRef<number>(Date.now());
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);

  // Monitor user movement to trigger auto-logout when inactive
  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    // Periodic check every 4 seconds
    const interval = setInterval(() => {
      const sec = db.getSecurityConfig();
      if (!sec.autoLogoutEnabled || sec.autoLogoutMinutes <= 0) return;

      const idleMs = Date.now() - lastActivityRef.current;
      const maxIdleMs = sec.autoLogoutMinutes * 60 * 1000;

      if (idleMs >= maxIdleMs) {
        db.logout(`Cierre automático por inactividad detectada (${sec.autoLogoutMinutes} min sin movimiento)`);
        setInactivityNotice(`Sesión cerrada automáticamente tras ${sec.autoLogoutMinutes} minuto${sec.autoLogoutMinutes > 1 ? 's' : ''} de inactividad.`);
        setShowUserSwitch(false);
        setModulesOpen(false);
      }
    }, 4000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
      clearInterval(interval);
    };
  }, [currentUser]);

  // Modals
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [initialTicketAction, setInitialTicketAction] = useState<'print' | 'whatsapp' | 'none'>('none');
  const [showUserSwitch, setShowUserSwitch] = useState(false);

  // Modules Bar State (Auto-collapsible by default, hidden unless needed)
  const [modulesOpen, setModulesOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Keyboard shortcut listener for toggling / closing modules bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with Alt+M
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setModulesOpen((prev) => !prev);
      }
      // Close on Escape if open and not pinned
      if (e.key === 'Escape' && modulesOpen && !isPinned) {
        setModulesOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modulesOpen, isPinned]);

  // Fallback to allowed tab if role cannot access currentTab
  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'dashboard' && !db.hasPermission('canViewReports')) {
      setActiveTab(db.hasPermission('canAccessPOS') ? 'ventas' : 'productos');
    } else if (activeTab === 'ventas' && !db.hasPermission('canAccessPOS')) {
      setActiveTab('productos');
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (user: User) => {
    setInactivityNotice(null);
    lastActivityRef.current = Date.now();
    // Role-based automatic redirection:
    // Administrators go directly to Dashboard; Sellers go directly to POS Sales
    if (user.role === 'ADMINISTRADOR') {
      setActiveTab('dashboard');
    } else if (user.role === 'VENDEDOR') {
      setActiveTab('ventas');
    } else {
      setActiveTab('productos');
    }
  };

  const handleLogout = () => {
    db.logout('Cierre de sesión manual');
    setInactivityNotice(null);
    setShowUserSwitch(false);
    setModulesOpen(false);
  };

  // If no user session is authenticated, enforce mandatory Login screen
  if (!currentUser) {
    return (
      <LoginModule
        company={company}
        currency={currency}
        onLoginSuccess={handleLoginSuccess}
        inactivityNotice={inactivityNotice}
      />
    );
  }

  const handleSaleCompleted = (sale: Sale, action: 'print' | 'whatsapp' | 'none' = 'none') => {
    // Si la acción es 'none', el módulo POS ya muestra de forma autónoma su pantalla exclusiva de resultado de operación
    if (action !== 'none') {
      setCompletedSale(sale);
      setInitialTicketAction(action);
    }
  };

  const handleTabSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    // Auto-collapse after module selection if not pinned
    if (!isPinned) {
      setModulesOpen(false);
    }
  };

  const canManageProducts = db.hasPermission('canManageProducts');
  const canManageInventory = db.hasPermission('canManageInventory');
  const canManageCategories = db.hasPermission('canManageCategories');
  const canManageUsers = db.hasPermission('canManageUsers');
  const canManagePurchases = db.hasPermission('canManagePurchases');
  const canManageRefunds = db.hasPermission('canManageRefunds');
  const canManageConfig = db.hasPermission('canManageConfig');

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden select-none font-sans">
      {/* Global Header - Omitted in VENTAS (POS) module to avoid duplicate headers per user specification */}
      {activeTab !== 'ventas' && (
        <Header
          company={company}
          currency={currency}
          currentUser={currentUser}
          onOpenUserSwitch={() => setShowUserSwitch(true)}
          onLogout={handleLogout}
          onToggleModules={() => setModulesOpen((prev) => !prev)}
          isModulesOpen={modulesOpen}
          activeModuleLabel={TAB_LABELS[activeTab]}
        />
      )}

      {/* Main Workspace Layout */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative">
        {/* Pinned Desktop Sidebar (Only when user explicitly chooses to pin it) */}
        {isPinned && modulesOpen && (
          <div className="hidden md:flex flex-shrink-0 z-30 shadow-md">
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabSelect}
              currentUser={currentUser}
              onClose={() => setModulesOpen(false)}
              isPinned={isPinned}
              onTogglePin={() => setIsPinned(false)}
            />
          </div>
        )}

        {/* Floating Auto-collapsible Drawer (Default mode: slides in when needed, auto-collapses on selection or outside click) */}
        {modulesOpen && !isPinned && (
          <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150">
            {/* Backdrop: Clicking outside automatically collapses the sidebar */}
            <div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
              onClick={() => setModulesOpen(false)}
              aria-label="Cerrar barra de módulos"
            />
            {/* Sidebar drawer */}
            <div className="relative z-50 flex shadow-2xl h-full animate-in slide-in-from-left duration-200">
              <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabSelect}
                currentUser={currentUser}
                onClose={() => setModulesOpen(false)}
                isPinned={isPinned}
                onTogglePin={() => setIsPinned(true)}
              />
            </div>
          </div>
        )}

        {/* Subtle quick-access tab on the left edge when modules bar is closed */}
        {!modulesOpen && (
          <button
            type="button"
            onClick={() => setModulesOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-slate-900/90 hover:bg-slate-900 text-slate-300 hover:text-white px-1 py-3 rounded-r-xl border border-l-0 border-slate-700/80 shadow-md flex flex-col items-center gap-1.5 transition-all hover:pr-2 group cursor-pointer"
            title="Abrir Módulos del Sistema (Alt+M)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
            <span className="[writing-mode:vertical-rl] rotate-180 font-bold uppercase tracking-widest text-[8.5px] text-slate-400 group-hover:text-emerald-300 transition py-0.5 font-mono">
              Módulos
            </span>
            <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
          </button>
        )}

        {/* Active Module Display */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-slate-50">
          {activeTab === 'dashboard' && (
            <DashboardModule
              sales={sales}
              products={products}
              categories={categories}
              purchases={purchases}
              refunds={refunds}
              currency={currency}
              company={company}
              users={users}
              taxes={taxes}
              onNavigateTab={(tab) => handleTabSelect(tab)}
            />
          )}

          {activeTab === 'ventas' && (
            <POSModule
              company={company}
              currency={currency}
              products={products}
              categories={categories}
              taxes={taxes}
              users={users}
              currentUser={currentUser}
              sales={sales}
              onSaleCompleted={handleSaleCompleted}
              onLogout={handleLogout}
              onToggleModules={() => setModulesOpen((prev) => !prev)}
              isModulesOpen={modulesOpen}
              onNavigateToWorkshop={(orderId) => {
                refreshWorkshopOrders();
                if (orderId) {
                  setSelectedWorkshopOrderId(orderId);
                }
                setActiveTab('taller');
              }}
            />
          )}

          {activeTab === 'taller' && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <WorkshopModule
                orders={workshopOrders}
                onSaveOrder={(order) => {
                  db.saveWorkshopOrder(order);
                  refreshWorkshopOrders();
                }}
                onUpdateOrderStatus={(id, status, note) => {
                  db.updateWorkshopOrderStatus(id, status, note);
                  refreshWorkshopOrders();
                }}
                onUpdateOrderItemStatus={(orderId, itemId, status) => {
                  db.updateWorkshopOrderItemStatus(orderId, itemId, status);
                  refreshWorkshopOrders();
                }}
                onDeleteOrder={(id) => {
                  db.deleteWorkshopOrder(id);
                  refreshWorkshopOrders();
                }}
                onAddPayment={(id, amount, method, note) => {
                  db.addWorkshopOrderPayment(id, amount, method, note);
                  refreshWorkshopOrders();
                }}
                company={company}
                currency={currency}
                clients={clients}
                products={products}
                users={users}
                currentUser={currentUser}
                initialSelectedOrderId={selectedWorkshopOrderId}
              />
            </div>
          )}

          {activeTab === 'productos' && (
            <ProductsModule
              products={products}
              categories={categories}
              taxes={taxes}
              currency={currency}
              canManage={canManageProducts}
            />
          )}

          {activeTab === 'inventario' && (
            <InventoryModule
              products={products}
              categories={categories}
              company={company}
              movements={movements}
              currency={currency}
              canManage={canManageInventory}
            />
          )}

          {activeTab === 'categorias' && (
            <CategoriesModule
              categories={categories}
              products={products}
              canManage={canManageCategories}
            />
          )}

          {activeTab === 'usuarios' && (
            <UsersModule
              users={users}
              currentUser={currentUser}
              canManage={canManageUsers}
            />
          )}

          {activeTab === 'compras' && (
            <PurchasesModule
              purchases={purchases}
              products={products}
              currency={currency}
              canManage={canManagePurchases}
            />
          )}

          {activeTab === 'devoluciones' && (
            <RefundsModule
              refunds={refunds}
              sales={sales}
              currency={currency}
              canManage={canManageRefunds}
            />
          )}

          {activeTab === 'configuracion' && (
            <ConfigModule
              company={company}
              currency={currency}
              taxes={taxes}
              canManage={canManageConfig}
            />
          )}

          {activeTab === 'auditoria' && <AuditModule logs={auditLogs} />}
        </main>
      </div>

      {/* Ticket Modal (Shown upon completing sales or viewing ticket) */}
      {completedSale && (
        <TicketModal
          sale={completedSale}
          company={company}
          currency={currency}
          initialAction={initialTicketAction}
          onClose={() => {
            setCompletedSale(null);
            setInitialTicketAction('none');
          }}
        />
      )}

      {/* User Switch Modal (PIN authentication) */}
      {showUserSwitch && (
        <UserSwitchModal
          currentUser={currentUser}
          users={users}
          onClose={() => setShowUserSwitch(false)}
          onLogout={handleLogout}
          onUserChanged={(newUser) => {
            setShowUserSwitch(false);
            if (newUser.role === 'ADMINISTRADOR') {
              setActiveTab('dashboard');
            } else if (newUser.role === 'VENDEDOR') {
              setActiveTab('ventas');
            }
          }}
        />
      )}
    </div>
  );
}
