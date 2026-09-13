import {
  Product,
  Sale,
  User,
  Customer,
  Supplier,
  Purchase,
  StockMovement,
  DashboardStats,
  AuditLog,
  NotificationItem,
  SystemSettings,
  AIInsight,
  StaffSession,
  StaffActivity
} from "../types";

const OFFLINE_SALES_KEY = "apex_pos_offline_sales";
const LOCAL_CACHE_PREFIX = "apex_pos_cache_";

export const api = {
  // Products
  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      localStorage.setItem(LOCAL_CACHE_PREFIX + "products", JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(LOCAL_CACHE_PREFIX + "products");
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async getProductByBarcode(barcode: string): Promise<Product> {
    const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Barcode not found");
    }
    return res.json();
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create product");
    }
    return res.json();
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update product");
    }
    return res.json();
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete product");
  },

  // Sales
  async getSales(filter?: { cashierId?: string; customerId?: string }): Promise<Sale[]> {
    let url = "/api/sales";
    if (filter?.cashierId) url += `?cashierId=${filter.cashierId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch sales");
    return res.json();
  },

  async createSale(saleData: any): Promise<Sale> {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Checkout failed");
      }
      return res.json();
    } catch (err: any) {
      // If offline or network error, save to offline sales queue!
      if (!navigator.onLine || err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        const offlineSale: Sale = {
          ...saleData,
          id: "off-sale-" + Date.now(),
          invoiceNumber: `INV-${new Date().getFullYear()}-OFF-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString(),
          status: "completed",
          offlineSynced: false
        };
        const existingQueue = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || "[]");
        existingQueue.push(offlineSale);
        localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(existingQueue));
        return offlineSale;
      }
      throw err;
    }
  },

  async refundSale(saleId: string, payload: any): Promise<any> {
    const res = await fetch(`/api/sales/${saleId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Refund failed");
    }
    return res.json();
  },

  // Offline Sync
  async syncOfflineSales(): Promise<{ syncedCount: number; message: string }> {
    const offlineQueue = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || "[]");
    if (!offlineQueue.length) {
      return { syncedCount: 0, message: "No offline sales to sync" };
    }
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offlineSales: offlineQueue })
    });
    if (!res.ok) throw new Error("Synchronization failed");
    const data = await res.json();
    localStorage.removeItem(OFFLINE_SALES_KEY);
    return data;
  },

  getOfflineSalesCount(): number {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || "[]");
      return queue.length;
    } catch {
      return 0;
    }
  },

  // Inventory
  async getStockMovements(): Promise<StockMovement[]> {
    const res = await fetch("/api/inventory/movements");
    if (!res.ok) throw new Error("Failed to fetch movements");
    return res.json();
  },

  async adjustStock(payload: { productId: string; changeQty: number; type: string; reason: string; userId: string; userName: string }): Promise<any> {
    const res = await fetch("/api/inventory/adjustment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to adjust stock");
    }
    return res.json();
  },

  // Purchases
  async getPurchases(): Promise<Purchase[]> {
    const res = await fetch("/api/purchases");
    if (!res.ok) throw new Error("Failed to fetch purchases");
    return res.json();
  },

  async createPurchase(data: any): Promise<Purchase> {
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create purchase order");
    }
    return res.json();
  },

  async receivePurchase(id: string, user?: { id: string; name: string }): Promise<Purchase> {
    const res = await fetch(`/api/purchases/${id}/receive`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, userName: user?.name })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to receive purchase order");
    }
    return res.json();
  },

  async deletePurchase(id: string): Promise<void> {
    const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete purchase order");
    }
  },

  async disposeExpired(payload: {
    productId: string;
    batchId?: string;
    reason: string;
    actionType?: "dispose" | "delete_product";
    userId?: string;
    userName?: string;
  }): Promise<any> {
    const res = await fetch("/api/inventory/expired/dispose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to process disposal");
    }
    return res.json();
  },

  async updateBatchThresholds(updates: { id: string; minStock?: number; maxStock?: number }[]): Promise<any> {
    const res = await fetch("/api/products/batch-threshold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update threshold levels");
    }
    return res.json();
  },

  // Customers & Suppliers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch("/api/customers");
    if (!res.ok) throw new Error("Failed to fetch customers");
    return res.json();
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create customer");
    return res.json();
  },

  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch("/api/suppliers");
    if (!res.ok) throw new Error("Failed to fetch suppliers");
    return res.json();
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create supplier");
    return res.json();
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  async createUser(data: Partial<User>): Promise<User> {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create user");
    }
    return res.json();
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update user");
    return res.json();
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to remove user");
    }
  },

  async startStaffSession(userId: string): Promise<StaffSession> {
    const res = await fetch("/api/staff-sessions/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error((await res.json()).error || "Unable to start staff session");
    return res.json();
  },

  async endStaffSession(sessionId: string): Promise<StaffSession> {
    const res = await fetch(`/api/staff-sessions/${sessionId}/logout`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json()).error || "Unable to end staff session");
    return res.json();
  },

  async getUserActivity(userId: string): Promise<StaffActivity> {
    const res = await fetch(`/api/users/${userId}/activity`);
    if (!res.ok) throw new Error((await res.json()).error || "Unable to load staff activity");
    return res.json();
  },

  // Dashboard & Reports
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch("/api/reports/dashboard");
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch("/api/audit-logs");
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch("/api/notifications");
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
  },

  async markNotificationRead(id?: string, all?: boolean): Promise<void> {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, all })
    });
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch("/api/settings");
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },

  // AI Assistant & Insights
  async queryAI(query: string, userRole: string, userName: string): Promise<{ response: string; structuredData?: any; modelUsed?: string }> {
    const res = await fetch("/api/ai/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, userRole, userName })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "AI query failed");
    }
    return res.json();
  },

  async getAIInsights(): Promise<AIInsight[]> {
    const res = await fetch("/api/ai/insights");
    if (!res.ok) throw new Error("Failed to fetch AI insights");
    return res.json();
  }
};
