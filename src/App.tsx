import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { POSScreen } from "./components/POSScreen";
import { DashboardView } from "./components/DashboardView";
import { ProductManagement } from "./components/ProductManagement";
import { InventoryAndExpiryView } from "./components/InventoryAndExpiryView";
import { SalesHistoryView } from "./components/SalesHistoryView";
import { PurchasesView } from "./components/PurchasesView";
import { CustomersAndSuppliersView } from "./components/CustomersAndSuppliersView";
import { ReportsView } from "./components/ReportsView";
import { AIAssistantView } from "./components/AIAssistantView";
import { AuditLogsView } from "./components/AuditLogsView";
import { SettingsView } from "./components/SettingsView";
import { BarcodeScannerModal } from "./components/BarcodeScannerModal";

import {
  User,
  Product,
  Sale,
  Customer,
  Supplier,
  Purchase,
  StockMovement,
  DashboardStats,
  NotificationItem,
  SystemSettings,
  AuditLog,
  ThemeType,
  StaffSession
} from "./types";
import { api } from "./services/api";

export default function App() {
  // Navigation & Layout State
  const [activeView, setActiveView] = useState<string>("pos");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobilePOSMode, setIsMobilePOSMode] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(api.getOfflineSalesCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<StaffSession | null>(null);

  // Core Data State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: "u-admin",
    name: "Alexander Wright",
    username: "alexander",
    role: "admin",
    email: "alexander@retailapex.com",
    phone: "+1 415-555-0199",
    active: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    businessName: "APEX Supermarket & Gourmet",
    tagline: "Quality Groceries & Fast Checkout",
    address: "742 Evergreen Terrace, Retail District, CA",
    phone: "+1 (555) 019-2831",
    email: "contact@apexretail.store",
    taxNumber: "TAX-US-99281-X",
    currency: "USD",
    currencySymbol: "$",
    defaultTaxRate: 8.5,
    defaultDiscountRate: 0,
    receiptHeader: "APEX SUPERMARKET",
    receiptFooter: "Thank you for shopping with us! Returns accepted within 14 days with receipt.",
    theme: "grey",
    enableSoundEffects: true,
    preventExpiredSales: true,
    allowNegativeStock: false,
    expiryWarningDays: 30,
    sessionTimeoutMinutes: 60
  });

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [
        prodsData,
        usersData,
        custData,
        suppData,
        salesData,
        statsData,
        notifsData,
        settingsData
      ] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getUsers().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getSales().catch(() => []),
        api.getDashboardStats().catch(() => null),
        api.getNotifications().catch(() => []),
        api.getSettings().catch(() => null)
      ]);

      if (prodsData.length) setProducts(prodsData);
      if (usersData.length) {
        setUsers(usersData);
        // keep current user in sync
        const found = usersData.find((u: User) => u.id === currentUser.id);
        if (found) setCurrentUser(found);
      }
      if (custData.length) setCustomers(custData);
      if (suppData.length) setSuppliers(suppData);
      if (salesData.length) setSales(salesData);
      if (statsData) setStats(statsData);
      if (notifsData.length) setNotifications(notifsData);
      if (settingsData) setSettings(settingsData);
    } catch (err) {
      console.warn("Error loading data", err);
    } finally {
      setIsLoading(false);
      setOfflineCount(api.getOfflineSalesCount());
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load secondary logs when navigating to specific views
  useEffect(() => {
    if (activeView === "inventory") {
      api.getStockMovements().then(setMovements).catch(() => {});
    } else if (activeView === "purchases") {
      api.getPurchases().then(setPurchases).catch(() => {});
    } else if (activeView === "audit") {
      api.getAuditLogs().then(setAuditLogs).catch(() => {});
    }
  }, [activeView]);

  // Online / Offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync pending offline sales
      handleSyncOffline();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Global Keyboard Shortcuts (F2 -> POS, F4 -> Scanner)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setActiveView("pos");
      } else if (e.key === "F4") {
        e.preventDefault();
        setIsScannerOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handlers
  const handleSyncOffline = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await api.syncOfflineSales();
      if (result.syncedCount > 0) {
        alert(`Successfully synchronized ${result.syncedCount} offline transaction(s).`);
      }
      setOfflineCount(api.getOfflineSalesCount());
      loadData();
    } catch (err: any) {
      alert("Failed to sync offline sales: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCompleteSale = async (saleData: any): Promise<Sale> => {
    const newSale = await api.createSale(saleData);
    setSales(prev => [newSale, ...prev]);
    setOfflineCount(api.getOfflineSalesCount());
    // Refresh stats & products in background
    api.getProducts().then(setProducts).catch(() => {});
    api.getDashboardStats().then(setStats).catch(() => {});
    return newSale;
  };

  const handleRefundSale = async (saleId: string, payload: any) => {
    const updated = await api.refundSale(saleId, payload);
    setSales(prev => prev.map(s => (s.id === saleId ? updated.sale : s)));
    api.getProducts().then(setProducts).catch(() => {});
    api.getDashboardStats().then(setStats).catch(() => {});
  };

  const handleCreateProduct = async (data: Partial<Product>) => {
    const newP = await api.createProduct(data);
    setProducts(prev => [newP, ...prev]);
    api.getDashboardStats().then(setStats).catch(() => {});
  };

  const handleUpdateProduct = async (id: string, data: Partial<Product>) => {
    const updated = await api.updateProduct(id, data);
    setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    api.getDashboardStats().then(setStats).catch(() => {});
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    api.getDashboardStats().then(setStats).catch(() => {});
  };

  const handleAdjustStock = async (payload: any) => {
    await api.adjustStock(payload);
    api.getProducts().then(setProducts).catch(() => {});
    api.getStockMovements().then(setMovements).catch(() => {});
    api.getDashboardStats().then(setStats).catch(() => {});
  };

  const handleCreatePurchase = async (data: any) => {
    const newPO = await api.createPurchase(data);
    setPurchases(prev => [newPO, ...prev]);
    api.getProducts().then(setProducts).catch(() => {});
    api.getDashboardStats().then(setStats).catch(() => {});
  };

  const handleReceivePurchase = async (id: string) => {
    const received = await api.receivePurchase(id, { id: currentUser.id, name: currentUser.name });
    setPurchases(prev => prev.map(purchase => (purchase.id === id ? received : purchase)));
    api.getProducts().then(setProducts).catch(() => {});
    api.getDashboardStats().then(setStats).catch(() => {});
  };

  const handleDeletePurchase = async (id: string) => {
    await api.deletePurchase(id);
    setPurchases(prev => prev.filter(purchase => purchase.id !== id));
  };

  const handleCreateCustomer = async (data: Partial<Customer>) => {
    const newC = await api.createCustomer(data);
    setCustomers(prev => [...prev, newC]);
  };

  const handleCreateSupplier = async (data: Partial<Supplier>) => {
    const newS = await api.createSupplier(data);
    setSuppliers(prev => [...prev, newS]);
  };

  const handleCreateUser = async (data: Partial<User>) => {
    const newU = await api.createUser(data);
    setUsers(prev => [...prev, newU]);
  };

  const handleUpdateUser = async (id: string, data: Partial<User>) => {
    const updated = await api.updateUser(id, data);
    setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
    if (currentUser.id === id) setCurrentUser(updated);
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    setUsers(prev => prev.filter(user => user.id !== id));
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    setIsMobilePOSMode(false);
    const defaultView = user.role === "warehouse_manager"
      ? "inventory"
      : user.role === "cashier" || user.role === "salesperson"
      ? "pos"
      : "dashboard";
    setActiveView(defaultView);
  };

  const handleLoginUser = async (user: User) => {
    if (activeSession) await api.endStaffSession(activeSession.id);
    const session = await api.startStaffSession(user.id);
    setActiveSession(session);
    handleSwitchUser(user);
    api.getUsers().then(setUsers).catch(() => {});
  };

  const handleLogoutUser = async () => {
    if (!activeSession) return;
    await api.endStaffSession(activeSession.id);
    setActiveSession(null);
  };

  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
  };

  const handleUpdateTheme = (theme: ThemeType) => {
    handleUpdateSettings({ theme });
  };

  const handleMarkNotificationRead = async (id?: string, all?: boolean) => {
    await api.markNotificationRead(id, all);
    setNotifications(prev =>
      prev.map(n => {
        if (all || n.id === id) return { ...n, read: true };
        return n;
      })
    );
  };

  // When an item is scanned from anywhere (e.g. global camera modal)
  const handleScannedProduct = (product: Product) => {
    setActiveView("pos");
    // Handled via state or directly passed
  };

  // Theme Class Calculation
  const getThemeWrapperClass = () => {
    switch (settings.theme) {
      case "dark":
        return "theme-dark bg-neutral-950 text-neutral-100";
      case "black_grey":
        return "theme-black-grey bg-neutral-900 text-neutral-100";
      case "high_contrast":
        return "theme-high-contrast bg-black text-yellow-400";
      case "blue":
        return "theme-blue bg-slate-50 text-slate-900";
      case "green":
        return "theme-green bg-emerald-50/40 text-emerald-950";
      case "purple":
        return "theme-purple bg-purple-50/40 text-purple-950";
      case "amber":
        return "theme-amber bg-amber-50/40 text-stone-900";
      case "rose":
        return "theme-rose bg-rose-50/40 text-stone-900";
      case "teal":
        return "theme-teal bg-teal-50/40 text-teal-950";
      case "light":
        return "theme-light bg-neutral-50 text-neutral-900";
      default:
        return "theme-grey bg-neutral-100 text-neutral-900";
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased ${getThemeWrapperClass()}`}>
      {/* Top Main Navigation Header */}
      <Header
        currentUser={currentUser}
        users={users}
        onSwitchUser={handleSwitchUser}
        activeSession={activeSession}
        onLoginUser={handleLoginUser}
        onLogoutUser={handleLogoutUser}
        settings={settings}
        onUpdateTheme={handleUpdateTheme}
        isOnline={isOnline}
        offlineCount={offlineCount}
        onSyncOffline={handleSyncOffline}
        isSyncing={isSyncing}
        activeView={activeView}
        onNavigate={setActiveView}
        isMobilePOSMode={isMobilePOSMode}
        onToggleMobileMode={() => setIsMobilePOSMode(!isMobilePOSMode)}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Hidden in touch mobile POS view or small viewports) */}
        {!isMobilePOSMode && (
          <div className="hidden md:flex">
            <Sidebar
              activeView={activeView}
              onNavigate={setActiveView}
              userRole={currentUser.role}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onOpenScanner={() => setIsScannerOpen(true)}
            />
          </div>
        )}

        {/* View Switcher Container */}
        <main className="flex-1 flex flex-col overflow-hidden relative pb-14 md:pb-0">
          {activeView === "pos" && (
            <POSScreen
              products={products}
              customers={customers}
              currentUser={currentUser}
              settings={settings}
              onCompleteSale={handleCompleteSale}
              onOpenScanner={() => setIsScannerOpen(true)}
              onRefreshProducts={() => api.getProducts().then(setProducts)}
            />
          )}

          {activeView === "dashboard" && (
            <DashboardView
              stats={stats}
              settings={settings}
              products={products}
              recentSales={sales}
              onNavigate={setActiveView}
              onOpenScanner={() => setIsScannerOpen(true)}
              onRefresh={loadData}
              isLoading={isLoading}
            />
          )}

          {activeView === "products" && (
            <ProductManagement
              products={products}
              suppliers={suppliers}
              settings={settings}
              onCreateProduct={handleCreateProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onOpenScanner={() => setIsScannerOpen(true)}
            />
          )}

          {activeView === "inventory" && (
            <InventoryAndExpiryView
              products={products}
              movements={movements}
              settings={settings}
              currentUser={currentUser}
              onAdjustStock={handleAdjustStock}
              onUpdateProduct={handleUpdateProduct}
            />
          )}

          {activeView === "sales" && (
            <SalesHistoryView
              sales={sales}
              settings={settings}
              currentUser={currentUser}
              onRefundSale={handleRefundSale}
            />
          )}

          {activeView === "purchases" && (
            <PurchasesView
              purchases={purchases}
              products={products}
              suppliers={suppliers}
              currentUser={currentUser}
              onCreatePurchase={handleCreatePurchase}
              onReceivePurchase={handleReceivePurchase}
              onDeletePurchase={handleDeletePurchase}
              onCreateProduct={handleCreateProduct}
            />
          )}

          {activeView === "directory" && (
            <CustomersAndSuppliersView
              customers={customers}
              suppliers={suppliers}
              onCreateCustomer={handleCreateCustomer}
              onCreateSupplier={handleCreateSupplier}
            />
          )}

          {activeView === "reports" && (
            <ReportsView
              stats={stats}
              settings={settings}
              sales={sales}
              products={products}
            />
          )}

          {activeView === "ai" && <AIAssistantView currentUser={currentUser} onNavigate={setActiveView} />}

          {activeView === "audit" && <AuditLogsView logs={auditLogs} />}

          {activeView === "settings" && (
            <SettingsView
              settings={settings}
              users={users}
              currentUser={currentUser}
              onUpdateSettings={handleUpdateSettings}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}
        </main>
      </div>

      {/* Mobile Touch Bottom Nav */}
      <MobileBottomNav
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenScanner={() => setIsScannerOpen(true)}
        userRole={currentUser.role}
      />

      {/* Native Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onScanProduct={handleScannedProduct}
        soundEnabled={settings.enableSoundEffects}
      />
    </div>
  );
}
