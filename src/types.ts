export type Role = 'admin' | 'manager' | 'warehouse_manager' | 'cashier' | 'salesperson' | 'sales_agent';
export type UserRole = Role;

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin Portal",
  manager: "Manager Portal",
  warehouse_manager: "Warehouse Portal",
  cashier: "Cashier Portal",
  salesperson: "Salesperson Portal",
  sales_agent: "Sales Agent Portal"
};

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  email: string;
  phone: string;
  active: boolean;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface StaffSession {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  loginAt: string;
  logoutAt?: string;
  active: boolean;
}

export interface StaffActivity {
  user: User;
  sessions: StaffSession[];
  sales: Sale[];
  auditLogs: AuditLog[];
}

export type ExpiryStatus = 'fresh' | 'expiring_soon' | 'expired';

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  supplierId?: string;
  status: ExpiryStatus;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number; // percentage, e.g. 5 for 5%
  discount: number; // default discount percentage
  currentStock: number;
  minStock: number;
  maxStock: number;
  description: string;
  image: string;
  supplierId?: string;
  supplierName?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  expiryStatus?: ExpiryStatus;
  batches?: ProductBatch[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  itemDiscountPercent: number; // 0-100
  taxRate: number; // 0-100
  selectedBatch?: string;
  lineTotal: number;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'split' | 'other';

export interface SplitPaymentDetail {
  cash?: number;
  card?: number;
  digital_wallet?: number;
  bank_transfer?: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  cashierId: string;
  cashierName: string;
  cashierRole: Role;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerType?: CustomerType;
  orderNumber?: string;
  orderStatus?: OnlineOrderStatus;
  deliveryAddress?: string;
  deliveryCharge?: number;
  riderName?: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    barcode: string;
    image: string;
    unitPrice: number;
    costPrice: number;
    quantity: number;
    discountPercent: number;
    taxRate: number;
    lineTotal: number;
    batchNumber?: string;
  }[];
  subtotal: number;
  itemDiscountsTotal: number;
  cartDiscountPercent: number;
  cartDiscountAmount: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentDetails: {
    amountReceived: number;
    change: number;
    cardReference?: string;
    walletType?: string;
    split?: SplitPaymentDetail;
  };
  status: 'completed' | 'refunded' | 'partially_refunded' | 'void';
  notes?: string;
  offlineSynced?: boolean;
}

export interface RefundItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  restock: boolean;
}

export interface Refund {
  id: string;
  saleId: string;
  invoiceNumber: string;
  refundNumber: string;
  timestamp: string;
  cashierId: string;
  cashierName: string;
  reason: string;
  refundAmount: number;
  paymentMethod: PaymentMethod;
  items: RefundItem[];
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  image?: string;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
}

export interface Purchase {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  totalAmount?: number;
  receivedBy?: string;
  status: 'received' | 'pending' | 'cancelled' | 'ordered';
  notes?: string;
  createdAt: string;
}

export type StockMovementType =
  | 'sale'
  | 'purchase'
  | 'return'
  | 'refund'
  | 'adjustment'
  | 'damage'
  | 'expiry'
  | 'manual';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  changeQty: number; // positive or negative
  type: StockMovementType;
  referenceId: string;
  userId: string;
  userName: string;
  date: string;
  timestamp?: string;
  reason: string;
}

export type CustomerType = "walk_in" | "registered" | "online" | "corporate" | "wholesale" | "delivery";
export type OnlineOrderStatus = "pending" | "confirmed" | "packed" | "shipped" | "delivered";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalPurchases: number;
  totalSpent?: number;
  outstandingBalance: number;
  balance?: number;
  visitCount: number;
  points?: number;
  lastPurchaseDate?: string;
  customerType?: CustomerType;
  companyName?: string;
  taxNumber?: string;
  creditTerms?: string;
  wholesaleDiscountPercent?: number;
  minimumOrderQuantity?: number;
  priceListName?: string;
  deliveryAddress?: string;
  deliveryCharge?: number;
  preferredPaymentMethod?: PaymentMethod;
  defaultOrderStatus?: OnlineOrderStatus;
  photo?: string;
}

export interface Supplier {
  id: string;
  name: string;
  company?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  outstandingPayable: number;
  balance?: number;
  totalPurchased: number;
  categories?: string[];
  photo?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  userRole?: Role;
  action: string;
  entity: string;
  entityType?: string;
  entityId?: string;
  referenceId: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export interface NotificationItem {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'expired' | 'sale' | 'refund' | 'sync' | 'security';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  referenceId?: string;
}

export type ThemeType =
  | 'grey'
  | 'blue'
  | 'green'
  | 'purple'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'dark'
  | 'black_grey'
  | 'high_contrast'
  | 'light';

export interface SystemSettings {
  businessName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  taxNumber: string;
  currency: string;
  currencySymbol: string;
  defaultTaxRate: number;
  defaultDiscountRate: number;
  expiryWarningDays: number;
  allowNegativeStock: boolean;
  preventExpiredSales: boolean;
  receiptHeader?: string;
  receiptFooter: string;
  theme: ThemeType;
  primaryAccent?: string;
  enableSoundEffects: boolean;
  sessionTimeoutMinutes?: number;
}

export interface DashboardStats {
  todaySales: number;
  todayPurchases: number;
  todayProfit: number;
  transactionsCount: number;
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  expiredCount: number;
  totalStockValue?: number;
  salesByCashier: { cashierId: string; name: string; sales: number; count: number }[];
  salesByPaymentMethod: { method: string; total: number; count: number }[];
  topSellingProducts: { productId: string; name: string; qty: number; revenue: number; image?: string }[];
  topProducts?: { productId: string; name: string; qty: number; revenue: number; image?: string }[];
  recentSales: Sale[];
  salesTrend: { date: string; sales: number; profit: number; purchases: number }[];
}

export interface AIInsight {
  id: string;
  type: 'stock_risk' | 'expiry_risk' | 'opportunity' | 'cashier_anomaly' | 'dead_stock';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation?: string;
  actionable?: string;
  category?: string;
  metric?: string;
}
