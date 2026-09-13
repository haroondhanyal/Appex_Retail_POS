import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const configuredAiMode = process.env.AI_MODE?.toLowerCase();
const AI_MODE: "local" | "auto" | "gemini" =
  configuredAiMode === "gemini" || configuredAiMode === "auto" ? configuredAiMode : "local";
const ALLOWED_ROLES = new Set(["admin", "manager", "warehouse_manager", "cashier", "salesperson", "sales_agent"]);
const hashPassword = (password: string) => crypto.createHash("sha256").update(password).digest("hex");

app.use(express.json({ limit: "25mb" }));

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (AI_MODE === "local") return null;
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Data Store in memory with persistence to disk
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "pos_db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Seed Data
const INITIAL_PRODUCTS = [
  {
    id: "prod-1",
    name: "Coca-Cola Original 330ml Can",
    sku: "BEV-CC-330",
    barcode: "5449000000996",
    category: "Beverages",
    brand: "Coca-Cola",
    unit: "Can",
    costPrice: 0.65,
    sellingPrice: 1.50,
    taxRate: 5,
    discount: 0,
    currentStock: 148,
    minStock: 30,
    maxStock: 300,
    description: "Classic sparkling soft drink with vegetable extracts",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80",
    supplierId: "sup-1",
    supplierName: "Global Beverage Logistics",
    batchNumber: "CC-2026-B1",
    manufacturingDate: "2026-01-10",
    expiryDate: "2027-01-10",
    batches: [
      {
        id: "b-1",
        productId: "prod-1",
        batchNumber: "CC-2026-B1",
        mfgDate: "2026-01-10",
        expiryDate: "2027-01-10",
        quantity: 148,
        costPrice: 0.65,
        status: "fresh"
      }
    ]
  },
  {
    id: "prod-2",
    name: "Organic Whole Milk 1 Gallon",
    sku: "DAIRY-MILK-1G",
    barcode: "078742351866",
    category: "Dairy & Eggs",
    brand: "Horizon Organic",
    unit: "Bottle",
    costPrice: 3.20,
    sellingPrice: 5.49,
    taxRate: 0,
    discount: 5,
    currentStock: 24,
    minStock: 20,
    maxStock: 80,
    description: "Grade A pasteurized vitamin D organic whole milk",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
    supplierId: "sup-2",
    supplierName: "FarmFresh Organics Co.",
    batchNumber: "MLK-092",
    manufacturingDate: "2026-09-01",
    expiryDate: "2026-09-25", // Expiring soon (<15 days)
    batches: [
      {
        id: "b-2",
        productId: "prod-2",
        batchNumber: "MLK-092",
        mfgDate: "2026-09-01",
        expiryDate: "2026-09-25",
        quantity: 24,
        costPrice: 3.20,
        status: "expiring_soon"
      }
    ]
  },
  {
    id: "prod-3",
    name: "Artisan Sourdough Loaf 500g",
    sku: "BAK-SOUR-500",
    barcode: "8410076472819",
    category: "Bakery & Snacks",
    brand: "Crust & Co.",
    unit: "Loaf",
    costPrice: 1.80,
    sellingPrice: 4.25,
    taxRate: 0,
    discount: 0,
    currentStock: 8,
    minStock: 15, // Low stock!
    maxStock: 50,
    description: "Slow fermented naturally leavened sourdough bread",
    image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&q=80",
    supplierId: "sup-3",
    supplierName: "Metro Wholesale Dist.",
    batchNumber: "BAK-881",
    manufacturingDate: "2026-09-11",
    expiryDate: "2026-09-18",
    batches: [
      {
        id: "b-3",
        productId: "prod-3",
        batchNumber: "BAK-881",
        mfgDate: "2026-09-11",
        expiryDate: "2026-09-18",
        quantity: 8,
        costPrice: 1.80,
        status: "expiring_soon"
      }
    ]
  },
  {
    id: "prod-4",
    name: "Oatly Barista Edition Oat Milk 1L",
    sku: "BEV-OAT-1L",
    barcode: "7350052850011",
    category: "Dairy & Eggs",
    brand: "Oatly",
    unit: "Tetra Pak",
    costPrice: 2.10,
    sellingPrice: 4.80,
    taxRate: 5,
    discount: 0,
    currentStock: 62,
    minStock: 25,
    maxStock: 150,
    description: "Foamable oat drink for smooth coffee and tea",
    image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&q=80",
    supplierId: "sup-1",
    supplierName: "Global Beverage Logistics",
    batchNumber: "OAT-2026-X",
    manufacturingDate: "2026-02-15",
    expiryDate: "2027-02-15",
    batches: [
      {
        id: "b-4",
        productId: "prod-4",
        batchNumber: "OAT-2026-X",
        mfgDate: "2026-02-15",
        expiryDate: "2027-02-15",
        quantity: 62,
        costPrice: 2.10,
        status: "fresh"
      }
    ]
  },
  {
    id: "prod-5",
    name: "Nutella Hazelnut Spread 400g",
    sku: "SNK-NUT-400",
    barcode: "8000500310427",
    category: "Bakery & Snacks",
    brand: "Ferrero",
    unit: "Jar",
    costPrice: 2.90,
    sellingPrice: 5.99,
    taxRate: 8,
    discount: 10,
    currentStock: 45,
    minStock: 20,
    maxStock: 120,
    description: "Creamy hazelnut spread with skim milk and cocoa",
    image: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=400&q=80",
    supplierId: "sup-3",
    supplierName: "Metro Wholesale Dist.",
    batchNumber: "NUT-400-A",
    manufacturingDate: "2026-03-01",
    expiryDate: "2027-03-01",
    batches: [
      {
        id: "b-5",
        productId: "prod-5",
        batchNumber: "NUT-400-A",
        mfgDate: "2026-03-01",
        expiryDate: "2027-03-01",
        quantity: 45,
        costPrice: 2.90,
        status: "fresh"
      }
    ]
  },
  {
    id: "prod-6",
    name: "Fresh Hass Avocado (Pack of 4)",
    sku: "PRD-AVO-4PK",
    barcode: "033383000421",
    category: "Fresh Produce",
    brand: "Green Orchard",
    unit: "Pack",
    costPrice: 2.20,
    sellingPrice: 4.49,
    taxRate: 0,
    discount: 0,
    currentStock: 30,
    minStock: 15,
    maxStock: 70,
    description: "Ripe ready-to-eat Hass avocados with rich creamy texture",
    image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&q=80",
    supplierId: "sup-2",
    supplierName: "FarmFresh Organics Co.",
    batchNumber: "AVO-091",
    manufacturingDate: "2026-09-08",
    expiryDate: "2026-09-22",
    batches: [
      {
        id: "b-6",
        productId: "prod-6",
        batchNumber: "AVO-091",
        mfgDate: "2026-09-08",
        expiryDate: "2026-09-22",
        quantity: 30,
        costPrice: 2.20,
        status: "expiring_soon"
      }
    ]
  },
  {
    id: "prod-7",
    name: "Snickers Chocolate Bar 50g",
    sku: "SNK-SNIK-50",
    barcode: "5000159461122",
    category: "Bakery & Snacks",
    brand: "Mars Wrigley",
    unit: "Bar",
    costPrice: 0.55,
    sellingPrice: 1.25,
    taxRate: 8,
    discount: 0,
    currentStock: 210,
    minStock: 50,
    maxStock: 500,
    description: "Milk chocolate with soft nougat, caramel and roasted peanuts",
    image: "https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400&q=80",
    supplierId: "sup-3",
    supplierName: "Metro Wholesale Dist.",
    batchNumber: "SNK-2026-Z",
    manufacturingDate: "2026-01-20",
    expiryDate: "2027-01-20",
    batches: [
      {
        id: "b-7",
        productId: "prod-7",
        batchNumber: "SNK-2026-Z",
        mfgDate: "2026-01-20",
        expiryDate: "2027-01-20",
        quantity: 210,
        costPrice: 0.55,
        status: "fresh"
      }
    ]
  },
  {
    id: "prod-8",
    name: "Greek Plain Yogurt 500g (EXPIRED TEST)",
    sku: "DAIRY-YOG-500",
    barcode: "7622210741289",
    category: "Dairy & Eggs",
    brand: "Olympus",
    unit: "Tub",
    costPrice: 1.95,
    sellingPrice: 3.80,
    taxRate: 0,
    discount: 0,
    currentStock: 6,
    minStock: 10,
    maxStock: 40,
    description: "Authentic strained Greek yogurt, thick and high protein",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80",
    supplierId: "sup-2",
    supplierName: "FarmFresh Organics Co.",
    batchNumber: "YOG-EXP-99",
    manufacturingDate: "2026-08-10",
    expiryDate: "2026-09-05", // Already expired
    batches: [
      {
        id: "b-8",
        productId: "prod-8",
        batchNumber: "YOG-EXP-99",
        mfgDate: "2026-08-10",
        expiryDate: "2026-09-05",
        quantity: 6,
        costPrice: 1.95,
        status: "expired"
      }
    ]
  },
  {
    id: "prod-9",
    name: "San Pellegrino Sparkling Mineral 750ml",
    sku: "BEV-SAN-750",
    barcode: "8002270014901",
    category: "Beverages",
    brand: "San Pellegrino",
    unit: "Glass Bottle",
    costPrice: 1.40,
    sellingPrice: 3.20,
    taxRate: 5,
    discount: 0,
    currentStock: 0, // OUT OF STOCK
    minStock: 24,
    maxStock: 120,
    description: "Natural sparkling mineral water from Italian Alps",
    image: "https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&q=80",
    supplierId: "sup-1",
    supplierName: "Global Beverage Logistics",
    batchNumber: "SAN-750-B",
    manufacturingDate: "2026-02-01",
    expiryDate: "2028-02-01",
    batches: []
  },
  {
    id: "prod-10",
    name: "Method Antibacterial All-Purpose Cleaner 828ml",
    sku: "HOU-METH-CLEAN",
    barcode: "817939017685",
    category: "Household",
    brand: "Method",
    unit: "Spray Bottle",
    costPrice: 2.80,
    sellingPrice: 6.25,
    taxRate: 8,
    discount: 0,
    currentStock: 42,
    minStock: 15,
    maxStock: 80,
    description: "Plant-based surface cleaner with crisp wild rhubarb aroma",
    image: "https://images.unsplash.com/photo-1585670270608-b4be4fb88092?w=400&q=80",
    supplierId: "sup-4",
    supplierName: "Apex FMCG Supplies",
    batchNumber: "MET-2026-1",
    manufacturingDate: "2026-03-12",
    expiryDate: "2028-03-12",
    batches: [
      {
        id: "b-10",
        productId: "prod-10",
        batchNumber: "MET-2026-1",
        mfgDate: "2026-03-12",
        expiryDate: "2028-03-12",
        quantity: 42,
        costPrice: 2.80,
        status: "fresh"
      }
    ]
  },
  {
    id: "prod-11",
    name: "Colgate Total Clean Mint Toothpaste 150ml",
    sku: "PC-COLG-150",
    barcode: "8718951131102",
    category: "Personal Care",
    brand: "Colgate",
    unit: "Tube",
    costPrice: 1.50,
    sellingPrice: 3.49,
    taxRate: 8,
    discount: 0,
    currentStock: 85,
    minStock: 25,
    maxStock: 150,
    description: "Antibacterial protection for teeth, tongue, cheeks and gums",
    image: "https://images.unsplash.com/photo-1559591937-e1032a2491a6?w=400&q=80",
    supplierId: "sup-4",
    supplierName: "Apex FMCG Supplies",
    batchNumber: "COL-551",
    manufacturingDate: "2026-01-15",
    expiryDate: "2028-01-15",
    batches: [
      {
        id: "b-11",
        productId: "prod-11",
        batchNumber: "COL-551",
        mfgDate: "2026-01-15",
        expiryDate: "2028-01-15",
        quantity: 85,
        costPrice: 1.50,
        status: "fresh"
      }
    ]
  },
  {
    id: "prod-12",
    name: "Red Bull Energy Drink 250ml",
    sku: "BEV-RB-250",
    barcode: "9002490100070",
    category: "Beverages",
    brand: "Red Bull",
    unit: "Can",
    costPrice: 1.30,
    sellingPrice: 2.75,
    taxRate: 5,
    discount: 0,
    currentStock: 112,
    minStock: 30,
    maxStock: 240,
    description: "Vitalizes body and mind with taurine, B-group vitamins and caffeine",
    image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&q=80",
    supplierId: "sup-1",
    supplierName: "Global Beverage Logistics",
    batchNumber: "RB-2026-09",
    manufacturingDate: "2026-04-01",
    expiryDate: "2027-04-01",
    batches: [
      {
        id: "b-12",
        productId: "prod-12",
        batchNumber: "RB-2026-09",
        mfgDate: "2026-04-01",
        expiryDate: "2027-04-01",
        quantity: 112,
        costPrice: 1.30,
        status: "fresh"
      }
    ]
  }
];

const INITIAL_USERS = [
  {
    id: "u-admin",
    name: "Alexander Wright",
    username: "admin",
    role: "admin",
    email: "admin@apexretail.pos",
    phone: "+1 (555) 234-5678",
    active: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
    createdAt: "2025-01-01T00:00:00Z",
    lastLogin: new Date().toISOString()
  },
  {
    id: "u-mgr",
    name: "Elena Rostova",
    username: "manager",
    role: "manager",
    email: "elena.r@apexretail.pos",
    phone: "+1 (555) 345-6789",
    active: true,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80",
    createdAt: "2025-02-15T00:00:00Z",
    lastLogin: new Date().toISOString()
  },
  {
    id: "u-cashier1",
    name: "Sarah Jenkins",
    username: "cashier1",
    role: "cashier",
    email: "sarah.j@apexretail.pos",
    phone: "+1 (555) 456-7890",
    active: true,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80",
    createdAt: "2025-03-01T00:00:00Z",
    lastLogin: new Date().toISOString()
  },
  {
    id: "u-cashier2",
    name: "David Kim",
    username: "cashier2",
    role: "cashier",
    email: "david.k@apexretail.pos",
    phone: "+1 (555) 567-8901",
    active: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    createdAt: "2025-04-10T00:00:00Z",
    lastLogin: new Date().toISOString()
  }
];

const INITIAL_CUSTOMERS = [
  {
    id: "cust-walkin",
    name: "Walk-in Customer",
    customerType: "walk_in",
    phone: "N/A",
    email: "walkin@apexretail.pos",
    address: "Counter Checkout",
    totalPurchases: 1450.80,
    outstandingBalance: 0,
    visitCount: 142,
    lastPurchaseDate: new Date().toISOString()
  },
  {
    id: "cust-1",
    name: "Michael Chang",
    phone: "+1 (555) 678-1234",
    email: "mchang@corp.net",
    address: "742 Evergreen Terrace, Suite 4",
    totalPurchases: 620.40,
    outstandingBalance: 0,
    visitCount: 18,
    lastPurchaseDate: "2026-09-12T14:30:00Z"
  },
  {
    id: "cust-2",
    name: "Emily Watson",
    phone: "+1 (555) 890-5678",
    email: "emily.w@designstudio.io",
    address: "128 Beacon St, Boston",
    totalPurchases: 940.15,
    outstandingBalance: 45.00,
    visitCount: 26,
    lastPurchaseDate: "2026-09-11T16:15:00Z"
  },
  {
    id: "cust-3",
    name: "Robert Morales",
    phone: "+1 (555) 432-8765",
    email: "rmorales@bistro.org",
    address: "900 Market Street, San Francisco",
    totalPurchases: 1820.90,
    outstandingBalance: 0,
    visitCount: 44,
    lastPurchaseDate: "2026-09-13T08:10:00Z"
  }
];

const INITIAL_SUPPLIERS = [
  {
    id: "sup-1",
    name: "Global Beverage Logistics",
    company: "Global Beverage Logistics LLC",
    contactPerson: "Hans Gruber",
    phone: "+1 (800) 555-0199",
    email: "orders@globalbevlogistics.com",
    address: "Industrial Park Gate 4, Chicago, IL",
    outstandingPayable: 1450.00,
    balance: 1450.00,
    totalPurchased: 18450.00,
    categories: ["Beverages"]
  },
  {
    id: "sup-2",
    name: "FarmFresh Organics Co.",
    company: "FarmFresh Organics Cooperative",
    contactPerson: "Clara Higgins",
    phone: "+1 (800) 555-0288",
    email: "clara@farmfreshorganics.com",
    address: "Route 12 Valley Farms, Salinas, CA",
    outstandingPayable: 820.50,
    balance: 820.50,
    totalPurchased: 12100.00,
    categories: ["Fresh Produce", "Dairy & Eggs"]
  },
  {
    id: "sup-3",
    name: "Metro Wholesale Dist.",
    company: "Metro Wholesale Distribution Inc.",
    contactPerson: "Anthony Russo",
    phone: "+1 (800) 555-0377",
    email: "supply@metrowholesale.net",
    address: "Warehouse Hub 11, Queens, NY",
    outstandingPayable: 0,
    balance: 0,
    totalPurchased: 29400.00,
    categories: ["Bakery & Snacks"]
  },
  {
    id: "sup-4",
    name: "Apex FMCG Supplies",
    company: "Apex FMCG Supplies Ltd.",
    contactPerson: "Valerie Vance",
    phone: "+1 (800) 555-0466",
    email: "valerie@apexfmcg.com",
    address: "Logistics Boulevard, Dallas, TX",
    outstandingPayable: 560.00,
    balance: 560.00,
    totalPurchased: 8900.00,
    categories: ["Personal Care", "Household"]
  }
];

const INITIAL_SETTINGS = {
  businessName: "Apex Retail System",
  tagline: "Commercial Grade Retail Intelligence",
  logoUrl: "",
  address: "450 Broadway Avenue, New York, NY 10013",
  phone: "+1 (212) 555-0192",
  email: "contact@apexretailsystem.com",
  taxNumber: "US-TAX-89214710",
  currency: "USD",
  currencySymbol: "$",
  defaultTaxRate: 5,
  defaultDiscountRate: 0,
  expiryWarningDays: 30,
  allowNegativeStock: false,
  preventExpiredSales: true,
  receiptFooter: "Thank you for shopping at Apex Retail System! Returns accepted within 14 days with original receipt.",
  theme: "grey",
  primaryAccent: "#2563eb",
  enableSoundEffects: true
};

// Generate some initial sales
const now = new Date();
const todayISO = now.toISOString();
const yesterdayISO = new Date(Date.now() - 86400000).toISOString();

const INITIAL_SALES = [
  {
    id: "sale-101",
    invoiceNumber: "INV-2026-00101",
    timestamp: yesterdayISO,
    cashierId: "u-cashier1",
    cashierName: "Sarah Jenkins",
    cashierRole: "cashier",
    customerId: "cust-1",
    customerName: "Michael Chang",
    customerPhone: "+1 (555) 678-1234",
    items: [
      {
        productId: "prod-1",
        productName: "Coca-Cola Original 330ml Can",
        sku: "BEV-CC-330",
        barcode: "5449000000996",
        image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80",
        unitPrice: 1.50,
        costPrice: 0.65,
        quantity: 4,
        discountPercent: 0,
        taxRate: 5,
        lineTotal: 6.00,
        batchNumber: "CC-2026-B1"
      },
      {
        productId: "prod-4",
        productName: "Oatly Barista Edition Oat Milk 1L",
        sku: "BEV-OAT-1L",
        barcode: "7350052850011",
        image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&q=80",
        unitPrice: 4.80,
        costPrice: 2.10,
        quantity: 2,
        discountPercent: 0,
        taxRate: 5,
        lineTotal: 9.60,
        batchNumber: "OAT-2026-X"
      }
    ],
    subtotal: 15.60,
    itemDiscountsTotal: 0,
    cartDiscountPercent: 0,
    cartDiscountAmount: 0,
    taxTotal: 0.78,
    grandTotal: 16.38,
    paymentMethod: "card",
    paymentDetails: {
      amountReceived: 16.38,
      change: 0,
      cardReference: "AUTH-8992"
    },
    status: "completed",
    notes: "Regular customer",
    offlineSynced: false
  },
  {
    id: "sale-102",
    invoiceNumber: "INV-2026-00102",
    timestamp: todayISO,
    cashierId: "u-cashier2",
    cashierName: "David Kim",
    cashierRole: "cashier",
    customerId: "cust-walkin",
    customerName: "Walk-in Customer",
    customerPhone: "N/A",
    items: [
      {
        productId: "prod-5",
        productName: "Nutella Hazelnut Spread 400g",
        sku: "SNK-NUT-400",
        barcode: "8000500310427",
        image: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=400&q=80",
        unitPrice: 5.99,
        costPrice: 2.90,
        quantity: 1,
        discountPercent: 10,
        taxRate: 8,
        lineTotal: 5.39,
        batchNumber: "NUT-400-A"
      },
      {
        productId: "prod-7",
        productName: "Snickers Chocolate Bar 50g",
        sku: "SNK-SNIK-50",
        barcode: "5000159461122",
        image: "https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400&q=80",
        unitPrice: 1.25,
        costPrice: 0.55,
        quantity: 2,
        discountPercent: 0,
        taxRate: 8,
        lineTotal: 2.50,
        batchNumber: "SNK-2026-Z"
      }
    ],
    subtotal: 7.89,
    itemDiscountsTotal: 0.60,
    cartDiscountPercent: 0,
    cartDiscountAmount: 0,
    taxTotal: 0.63,
    grandTotal: 8.52,
    paymentMethod: "cash",
    paymentDetails: {
      amountReceived: 10.00,
      change: 1.48
    },
    status: "completed",
    notes: "",
    offlineSynced: false
  }
];

const INITIAL_PURCHASES = [
  {
    id: "po-101",
    poNumber: "PO-2026-0044",
    supplierId: "sup-1",
    supplierName: "Global Beverage Logistics",
    date: yesterdayISO,
    items: [
      {
        productId: "prod-1",
        productName: "Coca-Cola Original 330ml Can",
        sku: "BEV-CC-330",
        quantity: 50,
        costPrice: 0.65,
        taxRate: 0,
        discountPercent: 0,
        lineTotal: 32.50,
        batchNumber: "CC-2026-B1",
        expiryDate: "2027-01-10"
      },
      {
        productId: "prod-12",
        productName: "Red Bull Energy Drink 250ml",
        sku: "BEV-RB-250",
        quantity: 40,
        costPrice: 1.30,
        taxRate: 0,
        discountPercent: 0,
        lineTotal: 52.00,
        batchNumber: "RB-2026-09",
        expiryDate: "2027-04-01"
      }
    ],
    subtotal: 84.50,
    taxTotal: 0,
    grandTotal: 84.50,
    status: "received",
    notes: "Restocked energy drinks and sodas",
    createdAt: yesterdayISO
  }
];

const INITIAL_MOVEMENTS = [
  {
    id: "mov-1",
    productId: "prod-1",
    productName: "Coca-Cola Original 330ml Can",
    previousStock: 152,
    newStock: 148,
    changeQty: -4,
    type: "sale",
    referenceId: "INV-2026-00101",
    userId: "u-cashier1",
    userName: "Sarah Jenkins",
    date: yesterdayISO,
    reason: "Checkout Sale INV-2026-00101"
  },
  {
    id: "mov-2",
    productId: "prod-5",
    productName: "Nutella Hazelnut Spread 400g",
    previousStock: 46,
    newStock: 45,
    changeQty: -1,
    type: "sale",
    referenceId: "INV-2026-00102",
    userId: "u-cashier2",
    userName: "David Kim",
    date: todayISO,
    reason: "Checkout Sale INV-2026-00102"
  }
];

const INITIAL_AUDIT = [
  {
    id: "aud-1",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: "u-admin",
    userName: "Alexander Wright",
    role: "admin",
    action: "SYSTEM_INITIALIZE",
    entity: "System",
    referenceId: "SYS-INIT",
    details: "Apex Retail System initialized"
  },
  {
    id: "aud-2",
    timestamp: yesterdayISO,
    userId: "u-cashier1",
    userName: "Sarah Jenkins",
    role: "cashier",
    action: "SALE_CREATED",
    entity: "Sale",
    referenceId: "INV-2026-00101",
    details: "Processed sale for $16.38 (Card)"
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    type: "low_stock",
    title: "Low Stock Alert: Artisan Sourdough",
    message: "Artisan Sourdough Loaf 500g is at 8 units (Threshold: 15).",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: false,
    referenceId: "prod-3"
  },
  {
    id: "notif-2",
    type: "out_of_stock",
    title: "Out of Stock: San Pellegrino 750ml",
    message: "San Pellegrino Sparkling Mineral 750ml has reached 0 units.",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: false,
    referenceId: "prod-9"
  },
  {
    id: "notif-3",
    type: "expired",
    title: "Expired Stock Risk: Greek Yogurt",
    message: "Greek Plain Yogurt 500g (Batch YOG-EXP-99) expired on Sep 5, 2026.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: false,
    referenceId: "prod-8"
  }
];

// Load or Seed DB
let db = {
  products: INITIAL_PRODUCTS,
  users: INITIAL_USERS,
  customers: INITIAL_CUSTOMERS,
  suppliers: INITIAL_SUPPLIERS,
  sales: INITIAL_SALES,
  refunds: [] as any[],
  purchases: INITIAL_PURCHASES,
  stockMovements: INITIAL_MOVEMENTS,
  auditLogs: INITIAL_AUDIT,
  sessions: [] as any[],
  notifications: INITIAL_NOTIFICATIONS,
  settings: INITIAL_SETTINGS
};

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.products && parsed.products.length > 0) {
        db = parsed;
        if (!Array.isArray((db as any).sessions)) (db as any).sessions = [];
        (db as any).suppliers = (db as any).suppliers.map((supplier: any) => ({
          ...supplier,
          company: supplier.company || supplier.name,
          balance: Number(supplier.balance ?? supplier.outstandingPayable ?? 0),
          outstandingPayable: Number(supplier.outstandingPayable ?? supplier.balance ?? 0),
          categories: supplier.categories || []
        }));
        (db as any).customers = (db as any).customers.map((customer: any) => ({
          ...customer,
          customerType: customer.customerType || (customer.id === "cust-walkin" ? "walk_in" : "registered"),
          deliveryAddress: customer.deliveryAddress || "",
          deliveryCharge: Number(customer.deliveryCharge || 0),
          wholesaleDiscountPercent: Number(customer.wholesaleDiscountPercent || 0),
          minimumOrderQuantity: Number(customer.minimumOrderQuantity || 0),
          defaultOrderStatus: customer.defaultOrderStatus || "pending"
        }));
        saveDb();
        console.log("Database loaded from persistent file:", DB_FILE);
        return;
      }
    }
  } catch (e) {
    console.error("Failed to read persistent DB file, using seed:", e);
  }
  saveDb();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save DB file:", e);
  }
}

loadDb();

// Local/demo administrator requested for the sign-in screen. Production deployments
// must replace this with a proper identity provider and salted password hashes.
function ensureDemoAdminCredentials() {
  const admin = (db.users as any[]).find(user => user.role === "admin") || (db.users as any[])[0];
  if (!admin) return;
  admin.email = "rajaharoon320@gmail.com";
  admin.username = "rajaharoon320";
  admin.passwordHash = hashPassword("12345678");
  (db.users as any[]).forEach(user => {
    if (!user.passwordHash) user.passwordHash = hashPassword("12345678");
  });
  saveDb();
}
ensureDemoAdminCredentials();

// Helper: Calculate Expiry Status based on current date
function calculateExpiryStatus(expiryDateStr?: string, warningDays = 30): "fresh" | "expiring_soon" | "expired" {
  if (!expiryDateStr) return "fresh";
  const exp = new Date(expiryDateStr).getTime();
  const current = Date.now();
  if (exp < current) return "expired";
  const daysRemaining = (exp - current) / (1000 * 60 * 60 * 24);
  if (daysRemaining <= warningDays) return "expiring_soon";
  return "fresh";
}

// Log audit helper
function logAudit(userId: string, userName: string, role: string, action: string, entity: string, referenceId: string, details?: string, oldVal?: string, newVal?: string) {
  const item = {
    id: "aud-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    role,
    action,
    entity,
    referenceId,
    details,
    oldValue: oldVal,
    newValue: newVal
  };
  db.auditLogs.unshift(item);
  if (db.auditLogs.length > 500) db.auditLogs.pop();
  saveDb();
}

// ==========================================
// REST API ROUTES
// ==========================================

// Health
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Authentication
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { identifier, username, password, selectedRole } = req.body;
  const loginValue = String(identifier || username || "").trim().toLowerCase();
  const user: any = db.users.find(u => u.username.toLowerCase() === loginValue || u.email.toLowerCase() === loginValue);
  if (!user) return res.status(401).json({ error: "Invalid email or password. Please check your credentials and try again." });
  if (!user.active) return res.status(403).json({ error: user.accountStatus === "rejected" ? "Your account request has been rejected by the Admin." : user.accountStatus === "pending" ? "Your account request is currently pending Admin approval. Request Status: Pending." : "Your account has been deactivated. Please contact your administrator." });
  if (!password || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: "Incorrect password" });
  const approvedRoles = (user.approvedRoles || [user.role]) as string[];
  if (!selectedRole || !approvedRoles.includes(selectedRole)) return res.status(403).json({ error: `Role mismatch. Your account is not authorized to login as ${selectedRole || "this role"}. Please select your approved role.` });
  user.lastLogin = new Date().toISOString();
  logAudit(user.id, user.name, user.role, "USER_LOGIN", "User", user.id, `User logged in from POS terminal`);
  res.json({
    user,
    token: "pos-token-" + user.id + "-" + Date.now()
  });
});

app.post("/api/auth/signup", (req: Request, res: Response) => {
  const { name, username, email, phone, role, password, avatar, address } = req.body;
  const requestedRoles = new Set(["manager", "salesperson", "sales_agent", "cashier", "warehouse_manager"]);
  if (!name || !username || !email || !password) return res.status(400).json({ error: "Name, username, email, and password are required" });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (!requestedRoles.has(role)) return res.status(400).json({ error: "Select a valid staff role" });
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase())) return res.status(400).json({ error: "Username or email already exists" });
  const requestId = `AR-${String((db.users as any[]).filter(user => user.accountStatus === "pending").length + 1).padStart(6, "0")}`;
  const user: any = { id: "u-" + Date.now(), name, username, email, phone: phone || "", address: address || "", role, active: false, accountStatus: "pending", avatar: avatar || "", createdAt: new Date().toISOString(), lastLogin: undefined, passwordHash: hashPassword(password), requestId };
  db.users.push(user);
  logAudit(user.id, user.name, user.role, "SIGNUP_REQUESTED", "User", user.id, `${user.name} requested ${user.role} portal access`);
  saveDb();
  res.status(201).json({ requestId, message: `Account request ${requestId} submitted successfully. Status: Pending Admin Approval.` });
});

app.post("/api/auth/forgot-password", (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || "").trim().toLowerCase();
  const user: any = db.users.find(u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier);
  if (user) { user.passwordResetRequestedAt = new Date().toISOString(); logAudit(user.id, user.name, user.role, "PASSWORD_RESET_REQUESTED", "User", user.id, "Password reset request submitted"); saveDb(); }
  res.json({ message: "If the account exists, a password reset request has been sent to the administrator." });
});

app.get("/api/password-reset-requests", (_req: Request, res: Response) => res.json((db.users as any[]).filter(user => user.passwordResetRequestedAt)));

app.post("/api/users/:id/reset-password", (req: Request, res: Response) => {
  const user: any = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!req.body.password || String(req.body.password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  user.passwordHash = hashPassword(req.body.password); user.passwordResetRequestedAt = undefined;
  logAudit("admin", "Admin", "admin", "PASSWORD_RESET", "User", user.id, `Admin reset password for ${user.name}`); saveDb(); res.json({ success: true });
});

// Staff portal sessions. These power the admin activity view and are intentionally
// separate from the lightweight demo authentication endpoint above.
app.post("/api/staff-sessions/login", (req: Request, res: Response) => {
  const user = db.users.find(u => u.id === req.body.userId && u.active);
  if (!user) return res.status(404).json({ error: "Active staff user not found" });

  const now = new Date().toISOString();
  const session = {
    id: "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    userName: user.name,
    role: user.role,
    loginAt: now,
    active: true
  };
  user.lastLogin = now;
  (db as any).sessions.push(session);
  logAudit(user.id, user.name, user.role, "PORTAL_LOGIN", "StaffSession", session.id, `${user.name} started a ${user.role} portal session`);
  res.status(201).json(session);
});

app.post("/api/staff-sessions/:id/logout", (req: Request, res: Response) => {
  const session = (db as any).sessions.find((item: any) => item.id === req.params.id);
  if (!session) return res.status(404).json({ error: "Staff session not found" });
  if (session.active) {
    session.active = false;
    session.logoutAt = new Date().toISOString();
    logAudit(session.userId, session.userName, session.role, "PORTAL_LOGOUT", "StaffSession", session.id, `${session.userName} ended their portal session`);
  }
  saveDb();
  res.json(session);
});

app.get("/api/users/:id/activity", (req: Request, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const sessions = (db as any).sessions
    .filter((session: any) => session.userId === user.id)
    .sort((a: any, b: any) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime())
    .slice(0, 20);
  const sales = db.sales
    .filter(sale => sale.cashierId === user.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);
  const auditLogs = db.auditLogs
    .filter(log => log.userId === user.id)
    .slice(0, 30);
  res.json({ user, sessions, sales, auditLogs });
});

app.get("/api/users", (req: Request, res: Response) => {
  res.json(db.users);
});

app.post("/api/users", (req: Request, res: Response) => {
  const { name, username, role, email, phone, active, avatar } = req.body;
  if (!name || !username || !role) {
    return res.status(400).json({ error: "Name, username and role are required" });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ error: "Invalid staff role" });
  }
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: "Username already exists" });
  }
  const newUser: any = {
    id: "u-" + Date.now(),
    name,
    username,
    role,
    email: email || "",
    phone: phone || "",
    active: active !== undefined ? active : true,
    avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80`,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  db.users.push(newUser);
  logAudit("admin", "Admin", "admin", "USER_CREATED", "User", newUser.id, `Created user ${name} (${role})`);
  saveDb();
  res.json(newUser);
});

app.put("/api/users/:id", (req: Request, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { name, role, email, phone, active, avatar } = req.body;
  if (name) user.name = name;
  if (role) {
    if (!ALLOWED_ROLES.has(role)) return res.status(400).json({ error: "Invalid staff role" });
    user.role = role;
  }
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;
  if (active !== undefined) {
    user.active = active;
    (user as any).accountStatus = active ? "approved" : ((user as any).accountStatus === "pending" ? "pending" : "deactivated");
  }
  logAudit("admin", "Admin", "admin", "USER_UPDATED", "User", user.id, `Updated user ${user.name}`);
  saveDb();
  res.json(user);
});

app.delete("/api/users/:id", (req: Request, res: Response) => {
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });
  const user = db.users[index];
  const activeAdmins = db.users.filter(u => u.role === "admin" && u.active);
  if (user.role === "admin" && user.active && activeAdmins.length <= 1) {
    return res.status(400).json({ error: "At least one active admin account must remain" });
  }
  db.users.splice(index, 1);
  logAudit("admin", "Admin", "admin", "USER_REMOVED", "User", user.id, `Removed staff account ${user.name} (${user.role})`);
  saveDb();
  res.json({ message: "User removed", id: user.id });
});

// Products & Barcodes
app.get("/api/products", (req: Request, res: Response) => {
  const warningDays = db.settings.expiryWarningDays || 30;
  const enriched = db.products.map(p => {
    const status = calculateExpiryStatus(p.expiryDate, warningDays);
    return {
      ...p,
      expiryStatus: status
    };
  });
  res.json(enriched);
});

app.get("/api/products/barcode/:barcode", (req: Request, res: Response) => {
  const code = req.params.barcode.trim();
  const warningDays = db.settings.expiryWarningDays || 30;
  const product = db.products.find(p => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
  if (!product) {
    return res.status(404).json({ error: "Product not found for barcode " + code });
  }
  res.json({
    ...product,
    expiryStatus: calculateExpiryStatus(product.expiryDate, warningDays)
  });
});

app.post("/api/products", (req: Request, res: Response) => {
  const data = req.body;
  if (!data.name || !data.barcode || !data.sellingPrice) {
    return res.status(400).json({ error: "Product name, barcode, and selling price are required" });
  }
  if (db.products.some(p => p.barcode === data.barcode)) {
    return res.status(400).json({ error: `Barcode ${data.barcode} is already assigned to another product!` });
  }
  const newProduct = {
    id: "prod-" + Date.now(),
    name: data.name,
    sku: data.sku || "SKU-" + Math.floor(1000 + Math.random() * 9000),
    barcode: data.barcode,
    category: data.category || "General",
    brand: data.brand || "Generic",
    unit: data.unit || "Piece",
    costPrice: Number(data.costPrice) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    taxRate: Number(data.taxRate) || 0,
    discount: Number(data.discount) || 0,
    currentStock: Number(data.currentStock) || 0,
    minStock: Number(data.minStock) || 10,
    maxStock: Number(data.maxStock) || 100,
    description: data.description || "",
    image: data.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
    supplierId: data.supplierId || "",
    supplierName: data.supplierName || "",
    batchNumber: data.batchNumber || "B-" + Math.floor(100 + Math.random() * 900),
    manufacturingDate: data.manufacturingDate || new Date().toISOString().split("T")[0],
    expiryDate: data.expiryDate || "",
    batches: [
      {
        id: "b-" + Date.now(),
        productId: "prod-" + Date.now(),
        batchNumber: data.batchNumber || "B-INIT",
        mfgDate: data.manufacturingDate || new Date().toISOString().split("T")[0],
        expiryDate: data.expiryDate || "",
        quantity: Number(data.currentStock) || 0,
        costPrice: Number(data.costPrice) || 0,
        status: calculateExpiryStatus(data.expiryDate)
      }
    ]
  };

  db.products.push(newProduct);
  logAudit(data.userId || "admin", data.userName || "Admin", "manager", "PRODUCT_CREATED", "Product", newProduct.id, `Created product ${newProduct.name} (${newProduct.barcode})`);
  saveDb();
  res.status(201).json(newProduct);
});

app.put("/api/products/:id", (req: Request, res: Response) => {
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  const existing = db.products[index];
  const update = req.body;

  if (update.barcode && update.barcode !== existing.barcode) {
    if (db.products.some(p => p.barcode === update.barcode && p.id !== existing.id)) {
      return res.status(400).json({ error: `Barcode ${update.barcode} already belongs to another product` });
    }
  }

  const oldPrice = existing.sellingPrice;
  const updatedProduct = {
    ...existing,
    ...update,
    costPrice: update.costPrice !== undefined ? Number(update.costPrice) : existing.costPrice,
    sellingPrice: update.sellingPrice !== undefined ? Number(update.sellingPrice) : existing.sellingPrice,
    currentStock: update.currentStock !== undefined ? Number(update.currentStock) : existing.currentStock,
    minStock: update.minStock !== undefined ? Number(update.minStock) : existing.minStock,
    maxStock: update.maxStock !== undefined ? Number(update.maxStock) : existing.maxStock,
  };

  db.products[index] = updatedProduct;

  if (update.sellingPrice !== undefined && Number(update.sellingPrice) !== oldPrice) {
    logAudit(update.userId || "admin", update.userName || "Admin", "manager", "PRICE_CHANGE", "Product", existing.id, `Price changed from $${oldPrice} to $${update.sellingPrice}`, String(oldPrice), String(update.sellingPrice));
  } else {
    logAudit(update.userId || "admin", update.userName || "Admin", "manager", "PRODUCT_UPDATED", "Product", existing.id, `Updated product ${existing.name}`);
  }

  saveDb();
  res.json(updatedProduct);
});

app.delete("/api/products/:id", (req: Request, res: Response) => {
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });
  const removed = db.products.splice(index, 1)[0];
  logAudit("admin", "Admin", "admin", "PRODUCT_DELETED", "Product", removed.id, `Deleted product ${removed.name} (${removed.barcode})`);
  saveDb();
  res.json({ message: "Product deleted", id: removed.id });
});

// Sales & Checkout
app.get("/api/sales", (req: Request, res: Response) => {
  const { cashierId, customerId, paymentMethod, status } = req.query;
  let filtered = [...db.sales];
  if (cashierId) filtered = filtered.filter(s => s.cashierId === cashierId);
  if (customerId) filtered = filtered.filter(s => s.customerId === customerId);
  if (paymentMethod) filtered = filtered.filter(s => s.paymentMethod === paymentMethod);
  if (status) filtered = filtered.filter(s => s.status === status);
  // Sort latest first
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(filtered);
});

app.post("/api/sales", (req: Request, res: Response) => {
  const {
    cashierId,
    cashierName,
    cashierRole,
    customerId,
    customerName,
    customerPhone,
    customerType,
    orderNumber,
    orderStatus,
    deliveryAddress,
    deliveryCharge,
    riderName,
    items,
    subtotal,
    itemDiscountsTotal,
    cartDiscountPercent,
    cartDiscountAmount,
    taxTotal,
    grandTotal,
    paymentMethod,
    paymentDetails,
    notes,
    overrideExpiredCheck
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: "Sale must contain at least one item" });
  }

  // Check inventory and expiry safety
  for (const item of items) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product ${item.productName} not found` });
    }

    // Expiry check
    if (db.settings.preventExpiredSales && !overrideExpiredCheck) {
      const expStatus = calculateExpiryStatus(product.expiryDate);
      if (expStatus === "expired") {
        return res.status(400).json({
          error: `EXPIRED_PRODUCT_BLOCKED: ${product.name} (Batch ${product.batchNumber || "N/A"}) is expired. Manager override required.`,
          productId: product.id,
          expired: true
        });
      }
    }

    // Negative stock check
    if (!db.settings.allowNegativeStock && product.currentStock < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for ${product.name}. Current stock: ${product.currentStock}, Requested: ${item.quantity}`
      });
    }
  }

  // Generate unique invoice number
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(db.sales.length + 101).padStart(5, "0")}`;

  const newSale = {
    id: "sale-" + Date.now(),
    invoiceNumber,
    timestamp: new Date().toISOString(),
    cashierId: cashierId || "u-cashier1",
    cashierName: cashierName || "Cashier",
    cashierRole: cashierRole || "cashier",
    customerId: customerId || "cust-walkin",
    customerName: customerName || "Walk-in Customer",
    customerPhone: customerPhone || "N/A",
    customerType: customerType || "walk_in",
    orderNumber: orderNumber || undefined,
    orderStatus: orderStatus || undefined,
    deliveryAddress: deliveryAddress || undefined,
    deliveryCharge: Number(deliveryCharge || 0),
    riderName: riderName || undefined,
    items,
    subtotal: Number(subtotal),
    itemDiscountsTotal: Number(itemDiscountsTotal || 0),
    cartDiscountPercent: Number(cartDiscountPercent || 0),
    cartDiscountAmount: Number(cartDiscountAmount || 0),
    taxTotal: Number(taxTotal || 0),
    grandTotal: Number(grandTotal),
    paymentMethod: paymentMethod || "cash",
    paymentDetails: paymentDetails || { amountReceived: grandTotal, change: 0 },
    status: "completed",
    notes: notes || "",
    offlineSynced: false
  };

  // Perform Inventory Deduction & Stock Movements atomically
  for (const item of items) {
    const product = db.products.find(p => p.id === item.productId)!;
    const prevStock = product.currentStock;
    product.currentStock -= item.quantity;

    // Deduct from batches if applicable
    if (product.batches && product.batches.length > 0) {
      let remainingToDeduct = item.quantity;
      for (const batch of product.batches) {
        if (remainingToDeduct <= 0) break;
        if (batch.quantity > 0) {
          const deduct = Math.min(batch.quantity, remainingToDeduct);
          batch.quantity -= deduct;
          remainingToDeduct -= deduct;
        }
      }
    }

    // Record stock movement
    db.stockMovements.push({
      id: "mov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      productId: product.id,
      productName: product.name,
      previousStock: prevStock,
      newStock: product.currentStock,
      changeQty: -item.quantity,
      type: "sale",
      referenceId: invoiceNumber,
      userId: cashierId,
      userName: cashierName,
      date: newSale.timestamp,
      reason: `POS Sale ${invoiceNumber}`
    });

    // Check low stock notification trigger
    if (product.currentStock <= product.minStock) {
      db.notifications.unshift({
        id: "notif-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        type: product.currentStock === 0 ? "out_of_stock" : "low_stock",
        title: product.currentStock === 0 ? `Out of Stock: ${product.name}` : `Low Stock Alert: ${product.name}`,
        message: `${product.name} is down to ${product.currentStock} ${product.unit}(s). Minimum is ${product.minStock}.`,
        timestamp: newSale.timestamp,
        read: false,
        referenceId: product.id
      });
    }
  }

  // Update Customer Stats
  if (customerId && customerId !== "cust-walkin") {
    const customer = db.customers.find(c => c.id === customerId);
    if (customer) {
      customer.totalPurchases = Number((customer.totalPurchases + grandTotal).toFixed(2));
      customer.visitCount += 1;
      customer.lastPurchaseDate = newSale.timestamp;
    }
  }

  db.sales.push(newSale as any);

  logAudit(cashierId, cashierName, cashierRole, "SALE_CREATED", "Sale", invoiceNumber, `Processed ${invoiceNumber} for $${grandTotal.toFixed(2)} via ${paymentMethod}`);
  saveDb();

  res.status(201).json(newSale);
});

// Refunds & Returns
app.post("/api/sales/:id/refund", (req: Request, res: Response) => {
  const sale = db.sales.find(s => s.id === req.params.id || s.invoiceNumber === req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found" });

  const { cashierId, cashierName, reason, items, refundPaymentMethod } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: "Refund must specify items" });
  }

  let totalRefund = 0;
  const refundItems = [];

  for (const it of items) {
    const originalItem = sale.items.find((orig: any) => orig.productId === it.productId);
    if (!originalItem) continue;

    const refundQty = Math.min(Number(it.quantity) || 1, originalItem.quantity);
    const itemRefundAmount = (originalItem.lineTotal / originalItem.quantity) * refundQty;
    totalRefund += itemRefundAmount;

    refundItems.push({
      productId: it.productId,
      productName: originalItem.productName,
      quantity: refundQty,
      unitPrice: originalItem.unitPrice,
      refundAmount: itemRefundAmount,
      restock: it.restock !== false
    });

    // Restock product if requested
    if (it.restock !== false) {
      const product = db.products.find(p => p.id === it.productId);
      if (product) {
        const prev = product.currentStock;
        product.currentStock += refundQty;
        db.stockMovements.push({
          id: "mov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          productName: product.name,
          previousStock: prev,
          newStock: product.currentStock,
          changeQty: refundQty,
          type: "refund",
          referenceId: sale.invoiceNumber,
          userId: cashierId,
          userName: cashierName,
          date: new Date().toISOString(),
          reason: `Restocked from refund on ${sale.invoiceNumber}: ${reason}`
        });
      }
    }
  }

  const refundNumber = `REF-${new Date().getFullYear()}-${String(db.refunds.length + 501).padStart(5, "0")}`;
  const refundRecord = {
    id: "ref-" + Date.now(),
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    refundNumber,
    timestamp: new Date().toISOString(),
    cashierId: cashierId || "u-mgr",
    cashierName: cashierName || "Manager",
    reason: reason || "Customer request",
    refundAmount: Number(totalRefund.toFixed(2)),
    paymentMethod: refundPaymentMethod || sale.paymentMethod,
    items: refundItems
  };

  db.refunds.push(refundRecord);

  // Update sale status
  if (totalRefund >= sale.grandTotal) {
    sale.status = "refunded";
  } else {
    sale.status = "partially_refunded";
  }

  logAudit(cashierId, cashierName, "manager", "REFUND_PROCESSED", "Sale", refundNumber, `Refunded $${totalRefund.toFixed(2)} on invoice ${sale.invoiceNumber}`);
  saveDb();

  res.json({ refund: refundRecord, sale });
});

// Purchases & Stock In
app.get("/api/purchases", (req: Request, res: Response) => {
  res.json(db.purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
});

app.post("/api/purchases", (req: Request, res: Response) => {
  const { supplierId, supplierName, items, notes, status, userId, userName } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: "Purchase must have items" });

  let subtotal = 0;
  let taxTotal = 0;

  for (const it of items) {
    const lineTotal = Number(it.quantity) * Number(it.costPrice);
    subtotal += lineTotal;
    taxTotal += lineTotal * ((Number(it.taxRate) || 0) / 100);
  }

  const grandTotal = Number((subtotal + taxTotal).toFixed(2));
  const poNumber = `PO-${new Date().getFullYear()}-${String(db.purchases.length + 101).padStart(5, "0")}`;

  const newPurchase = {
    id: "po-" + Date.now(),
    poNumber,
    supplierId: supplierId || "",
    supplierName: supplierName || "Direct Supplier",
    date: new Date().toISOString(),
    items: items.map((it: any) => ({
      ...it,
      lineTotal: Number((it.quantity * it.costPrice).toFixed(2))
    })),
    subtotal: Number(subtotal.toFixed(2)),
    taxTotal: Number(taxTotal.toFixed(2)),
    grandTotal,
    status: status || "received",
    notes: notes || "",
    createdAt: new Date().toISOString()
  };

  // If status is received, immediately increase inventory & create batches
  if (newPurchase.status === "received") {
    for (const it of items) {
      const product = db.products.find(p => p.id === it.productId);
      if (product) {
        const prev = product.currentStock;
        product.currentStock += Number(it.quantity);
        if (it.costPrice) product.costPrice = Number(it.costPrice);

        // Add or update batch
        const batchNumber = it.batchNumber || `B-${newPurchase.poNumber}`;
        if (!product.batches) product.batches = [];
        (product.batches as any[]).push({
          id: "b-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
          productId: product.id,
          batchNumber,
          mfgDate: it.mfgDate || new Date().toISOString().split("T")[0],
          expiryDate: it.expiryDate || "",
          quantity: Number(it.quantity),
          costPrice: Number(it.costPrice),
          supplierId,
          status: calculateExpiryStatus(it.expiryDate)
        });

        // Record stock movement
        db.stockMovements.push({
          id: "mov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          productName: product.name,
          previousStock: prev,
          newStock: product.currentStock,
          changeQty: Number(it.quantity),
          type: "purchase",
          referenceId: poNumber,
          userId: userId || "u-mgr",
          userName: userName || "Manager",
          date: newPurchase.date,
          reason: `Stock received via Purchase Order ${poNumber}`
        });
      }
    }

    // Update supplier totals
    const supplier = db.suppliers.find(s => s.id === supplierId);
    if (supplier) {
      supplier.totalPurchased += grandTotal;
      supplier.outstandingPayable += grandTotal;
    }
  }

  db.purchases.push(newPurchase);
  logAudit(userId || "u-mgr", userName || "Manager", "manager", "PURCHASE_CREATED", "Purchase", poNumber, `Created purchase order ${poNumber} for $${grandTotal.toFixed(2)}`);
  saveDb();

  res.status(201).json(newPurchase);
});

// Mark Purchase Order as Received
app.put("/api/purchases/:id/receive", (req: Request, res: Response) => {
  const { userId, userName } = req.body;
  const po = db.purchases.find(p => p.id === req.params.id);
  if (!po) return res.status(404).json({ error: "Purchase order not found" });
  if (po.status === "received") return res.json(po);

  po.status = "received";

  for (const it of po.items) {
    const manufacturingDate = (it as { mfgDate?: string }).mfgDate;
    const product = db.products.find(p => p.id === it.productId);
    if (product) {
      const prev = product.currentStock;
      product.currentStock += Number(it.quantity);
      if (it.costPrice) product.costPrice = Number(it.costPrice);

      const batchNumber = it.batchNumber || `B-${po.poNumber}`;
      if (!product.batches) product.batches = [];
      (product.batches as any[]).push({
        id: "b-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
        productId: product.id,
        batchNumber,
        mfgDate: manufacturingDate || new Date().toISOString().split("T")[0],
        expiryDate: it.expiryDate || "",
        quantity: Number(it.quantity),
        costPrice: Number(it.costPrice),
        supplierId: po.supplierId,
        status: calculateExpiryStatus(it.expiryDate)
      });

      db.stockMovements.push({
        id: "mov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        productId: product.id,
        productName: product.name,
        previousStock: prev,
        newStock: product.currentStock,
        changeQty: Number(it.quantity),
        type: "purchase",
        referenceId: po.poNumber,
        userId: userId || "u-mgr",
        userName: userName || "Manager",
        date: new Date().toISOString(),
        reason: `PO Inbound shipment confirmed: ${po.poNumber}`
      });
    }
  }

  // Update supplier payable
  const supplier = db.suppliers.find(s => s.id === po.supplierId);
  if (supplier) {
    supplier.totalPurchased += po.grandTotal;
    supplier.outstandingPayable += po.grandTotal;
  }

  logAudit(userId || "u-mgr", userName || "Manager", "manager", "PO_RECEIVED", "Purchase", po.poNumber, `Marked PO ${po.poNumber} as Received ($${po.grandTotal.toFixed(2)})`);
  saveDb();
  res.json(po);
});

// Pending orders can be corrected before goods are received. Received POs are
// locked because their quantities are already reflected in inventory.
app.put("/api/purchases/:id", (req: Request, res: Response) => {
  const po = db.purchases.find(p => p.id === req.params.id);
  if (!po) return res.status(404).json({ error: "Purchase order not found" });
  if (po.status === "received") return res.status(400).json({ error: "Received purchase orders are locked to protect stock records" });
  const { supplierId, supplierName, notes, status } = req.body;
  if (supplierId !== undefined) po.supplierId = supplierId;
  if (supplierName !== undefined) po.supplierName = supplierName;
  if (notes !== undefined) po.notes = notes;
  if (status === "ordered" || status === "pending" || status === "cancelled") po.status = status;
  logAudit("admin", "Admin", "manager", "PO_UPDATED", "Purchase", po.poNumber, `Updated purchase order ${po.poNumber}`);
  saveDb();
  res.json(po);
});

// Delete Purchase Order
app.delete("/api/purchases/:id", (req: Request, res: Response) => {
  const index = db.purchases.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Purchase order not found" });
  if (db.purchases[index].status === "received") return res.status(400).json({ error: "Received purchase orders are locked to protect stock records" });
  const removed = db.purchases.splice(index, 1)[0];
  logAudit("admin", "Admin", "manager", "PO_DELETED", "Purchase", removed.poNumber, `Deleted purchase order ${removed.poNumber}`);
  saveDb();
  res.json({ success: true, id: removed.id });
});

// Inventory Movements & Adjustments
app.get("/api/inventory/movements", (req: Request, res: Response) => {
  res.json(db.stockMovements.slice(-200).reverse());
});

// Expired Inventory Disposal / Batch Removal
app.post("/api/inventory/expired/dispose", (req: Request, res: Response) => {
  const { productId, batchId, reason, actionType, userId, userName } = req.body;
  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const prevStock = product.currentStock;
  let disposedQty = 0;

  if (batchId && product.batches) {
    const bIdx = product.batches.findIndex((b: any) => b.id === batchId || b.batchNumber === batchId);
    if (bIdx !== -1) {
      disposedQty = (product.batches as any[])[bIdx].quantity || product.currentStock;
      product.batches.splice(bIdx, 1);
    } else {
      disposedQty = product.currentStock;
      product.batches = [];
    }
  } else {
    disposedQty = product.currentStock;
    product.batches = [];
  }

  product.currentStock = Math.max(0, product.currentStock - disposedQty);

  const mov = {
    id: "mov-" + Date.now(),
    productId: product.id,
    productName: product.name,
    previousStock: prevStock,
    newStock: product.currentStock,
    changeQty: -disposedQty,
    type: "expiry_writeoff",
    referenceId: "DISP-" + Date.now(),
    userId: userId || "admin",
    userName: userName || "Admin",
    date: new Date().toISOString(),
    reason: reason || "Expired inventory write-off & disposal"
  };
  db.stockMovements.push(mov);

  if (actionType === "delete_product") {
    const pIdx = db.products.findIndex(p => p.id === productId);
    if (pIdx !== -1) db.products.splice(pIdx, 1);
  }

  logAudit(userId || "admin", userName || "Admin", "manager", "EXPIRED_DISPOSAL", "Inventory", product.id, `Disposed ${disposedQty} units of expired ${product.name}: ${reason}`);
  saveDb();
  res.json({ success: true, product, movement: mov });
});

// Batch Threshold Configuration
app.post("/api/products/batch-threshold", (req: Request, res: Response) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ error: "Updates array required" });

  for (const up of updates) {
    const prod = db.products.find(p => p.id === up.id);
    if (prod) {
      if (up.minStock !== undefined) prod.minStock = Math.max(0, Number(up.minStock));
      if (up.maxStock !== undefined) prod.maxStock = Math.max(1, Number(up.maxStock));
    }
  }
  logAudit("admin", "Admin", "manager", "THRESHOLD_UPDATED", "Inventory", "BATCH", `Updated minimum stock threshold for ${updates.length} items`);
  saveDb();
  res.json({ success: true, updatedCount: updates.length });
});

app.post("/api/inventory/adjustment", (req: Request, res: Response) => {
  const { productId, changeQty, type, reason, userId, userName } = req.body;
  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const prev = product.currentStock;
  const diff = Number(changeQty);
  product.currentStock = Math.max(0, product.currentStock + diff);

  const mov = {
    id: "mov-" + Date.now(),
    productId: product.id,
    productName: product.name,
    previousStock: prev,
    newStock: product.currentStock,
    changeQty: diff,
    type: type || "adjustment",
    referenceId: "ADJ-" + Date.now(),
    userId: userId || "admin",
    userName: userName || "Admin",
    date: new Date().toISOString(),
    reason: reason || "Manual inventory adjustment"
  };

  db.stockMovements.push(mov);
  logAudit(userId || "admin", userName || "Admin", "manager", "STOCK_ADJUSTMENT", "Inventory", product.id, `Adjusted stock by ${diff > 0 ? "+" : ""}${diff} (${product.name}): ${reason}`);
  saveDb();

  res.json({ product, movement: mov });
});

// Customers
app.get("/api/customers", (req: Request, res: Response) => {
  res.json(db.customers);
});

app.post("/api/customers", (req: Request, res: Response) => {
  const { name, phone, email, address, customerType, companyName, taxNumber, creditTerms, wholesaleDiscountPercent, minimumOrderQuantity, priceListName, deliveryAddress, deliveryCharge, preferredPaymentMethod, defaultOrderStatus, photo } = req.body;
  if (!name) return res.status(400).json({ error: "Customer name is required" });

  const newCustomer = {
    id: "cust-" + Date.now(),
    name,
    phone: phone || "",
    email: email || "",
    address: address || "",
    customerType: customerType || "registered",
    companyName: companyName || "",
    taxNumber: taxNumber || "",
    creditTerms: creditTerms || "",
    wholesaleDiscountPercent: Number(wholesaleDiscountPercent || 0),
    minimumOrderQuantity: Number(minimumOrderQuantity || 0),
    priceListName: priceListName || "",
    deliveryAddress: deliveryAddress || address || "",
    deliveryCharge: Number(deliveryCharge || 0),
    preferredPaymentMethod: preferredPaymentMethod || undefined,
    defaultOrderStatus: defaultOrderStatus || "pending",
    photo: photo || "",
    totalPurchases: 0,
    outstandingBalance: 0,
    visitCount: 0,
    lastPurchaseDate: undefined
  };

  db.customers.push(newCustomer);
  logAudit("cashier", "Cashier", "cashier", "CUSTOMER_CREATED", "Customer", newCustomer.id, `Created customer record: ${name}`);
  saveDb();
  res.status(201).json(newCustomer);
});

app.put("/api/customers/:id", (req: Request, res: Response) => {
  const customer = db.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  Object.assign(customer, req.body);
  saveDb();
  res.json(customer);
});

app.delete("/api/customers/:id", (req: Request, res: Response) => {
  if (req.params.id === "cust-walkin") return res.status(400).json({ error: "The default Walk-in Customer cannot be deleted" });
  const index = db.customers.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Customer not found" });
  const removed = db.customers.splice(index, 1)[0];
  logAudit("admin", "Admin", "admin", "CUSTOMER_DELETED", "Customer", removed.id, `Deleted customer ${removed.name}`);
  saveDb();
  res.json({ success: true, id: removed.id });
});

// Suppliers
app.get("/api/suppliers", (req: Request, res: Response) => {
  res.json(db.suppliers);
});

app.post("/api/suppliers", (req: Request, res: Response) => {
  const { name, company, contactPerson, phone, email, address, categories, photo } = req.body;
  if (!name) return res.status(400).json({ error: "Supplier name is required" });

  const newSupplier = {
    id: "sup-" + Date.now(),
    name,
    company: company || name,
    contactPerson: contactPerson || "",
    phone: phone || "",
    email: email || "",
    address: address || "",
    outstandingPayable: 0,
    balance: 0,
    totalPurchased: 0,
    categories: categories || []
    ,photo: photo || ""
  };

  db.suppliers.push(newSupplier);
  logAudit("admin", "Admin", "admin", "SUPPLIER_CREATED", "Supplier", newSupplier.id, `Added supplier ${name}`);
  saveDb();
  res.status(201).json(newSupplier);
});

app.put("/api/suppliers/:id", (req: Request, res: Response) => {
  const supplier = db.suppliers.find(item => item.id === req.params.id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  const { name, company, contactPerson, phone, email, address, categories, photo } = req.body;
  Object.assign(supplier, {
    ...(name !== undefined ? { name } : {}),
    ...(company !== undefined ? { company } : {}),
    ...(contactPerson !== undefined ? { contactPerson } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(categories !== undefined ? { categories } : {}),
    ...(photo !== undefined ? { photo } : {})
  });
  logAudit("admin", "Admin", "admin", "SUPPLIER_UPDATED", "Supplier", supplier.id, `Updated supplier ${supplier.name}`);
  saveDb();
  res.json(supplier);
});

app.delete("/api/suppliers/:id", (req: Request, res: Response) => {
  const index = db.suppliers.findIndex(supplier => supplier.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Supplier not found" });
  const removed = db.suppliers.splice(index, 1)[0];
  logAudit("admin", "Admin", "admin", "SUPPLIER_DELETED", "Supplier", removed.id, `Deleted supplier ${removed.name}`);
  saveDb();
  res.json({ success: true, id: removed.id });
});

// Reports & Dashboard Stats
app.get("/api/reports/dashboard", (req: Request, res: Response) => {
  const warningDays = db.settings.expiryWarningDays || 30;
  const todayDateStr = new Date().toISOString().split("T")[0];

  const todaySalesList = db.sales.filter(s => s.timestamp.startsWith(todayDateStr) && s.status !== "refunded");
  const todaySales = todaySalesList.reduce((sum, s) => sum + s.grandTotal, 0);

  // Calculate today's profit
  let todayCost = 0;
  todaySalesList.forEach(s => {
    s.items.forEach((it: any) => {
      todayCost += (it.costPrice || 0) * it.quantity;
    });
  });
  const todayProfit = Math.max(0, todaySales - todayCost);

  const todayPurchases = db.purchases
    .filter(p => p.date.startsWith(todayDateStr))
    .reduce((sum, p) => sum + p.grandTotal, 0);

  const totalProducts = db.products.length;
  const totalCustomers = db.customers.length;
  const totalSuppliers = db.suppliers.length;

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let expiringCount = 0;
  let expiredCount = 0;

  db.products.forEach(p => {
    if (p.currentStock === 0) outOfStockCount++;
    else if (p.currentStock <= p.minStock) lowStockCount++;

    const status = calculateExpiryStatus(p.expiryDate, warningDays);
    if (status === "expired") expiredCount++;
    else if (status === "expiring_soon") expiringCount++;
  });

  // Sales by Cashier
  const cashierMap: Record<string, { cashierId: string; name: string; sales: number; count: number }> = {};
  db.sales.forEach(s => {
    if (!cashierMap[s.cashierId]) {
      cashierMap[s.cashierId] = { cashierId: s.cashierId, name: s.cashierName, sales: 0, count: 0 };
    }
    cashierMap[s.cashierId].sales += s.grandTotal;
    cashierMap[s.cashierId].count += 1;
  });

  // Sales by Payment Method
  const paymentMap: Record<string, { method: string; total: number; count: number }> = {};
  db.sales.forEach(s => {
    const m = s.paymentMethod;
    if (!paymentMap[m]) {
      paymentMap[m] = { method: m, total: 0, count: 0 };
    }
    paymentMap[m].total += s.grandTotal;
    paymentMap[m].count += 1;
  });

  // Top Selling Products
  const prodSalesMap: Record<string, { productId: string; name: string; qty: number; revenue: number; image?: string }> = {};
  db.sales.forEach(s => {
    s.items.forEach((it: any) => {
      if (!prodSalesMap[it.productId]) {
        prodSalesMap[it.productId] = { productId: it.productId, name: it.productName, qty: 0, revenue: 0, image: it.image };
      }
      prodSalesMap[it.productId].qty += it.quantity;
      prodSalesMap[it.productId].revenue += it.lineTotal;
    });
  });

  const topSellingProducts = Object.values(prodSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Past 7 Days Trend
  const salesTrend: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    const daySales = db.sales
      .filter(s => s.timestamp.startsWith(dStr) && s.status !== "refunded")
      .reduce((sum, s) => sum + s.grandTotal, 0);

    const dayPurchases = db.purchases
      .filter(p => p.date.startsWith(dStr))
      .reduce((sum, p) => sum + p.grandTotal, 0);

    salesTrend.push({
      date: dStr.substring(5), // MM-DD
      sales: Number(daySales.toFixed(2)),
      profit: Number((daySales * 0.38).toFixed(2)), // estimated margin
      purchases: Number(dayPurchases.toFixed(2))
    });
  }

  res.json({
    todaySales: Number(todaySales.toFixed(2)),
    todayPurchases: Number(todayPurchases.toFixed(2)),
    todayProfit: Number(todayProfit.toFixed(2)),
    transactionsCount: todaySalesList.length,
    totalProducts,
    totalCustomers,
    totalSuppliers,
    lowStockCount,
    outOfStockCount,
    expiringCount,
    expiredCount,
    salesByCashier: Object.values(cashierMap),
    salesByPaymentMethod: Object.values(paymentMap),
    topSellingProducts,
    recentSales: db.sales.slice(-8).reverse(),
    salesTrend
  });
});

// Notifications
app.get("/api/notifications", (req: Request, res: Response) => {
  res.json(db.notifications);
});

app.post("/api/notifications/mark-read", (req: Request, res: Response) => {
  const { id, all } = req.body;
  if (all) {
    db.notifications.forEach(n => n.read = true);
  } else if (id) {
    const notif = db.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
  }
  saveDb();
  res.json({ success: true });
});

// Audit Logs
app.get("/api/audit-logs", (req: Request, res: Response) => {
  res.json(db.auditLogs.slice(0, 150));
});

// Settings
app.get("/api/settings", (req: Request, res: Response) => {
  res.json(db.settings);
});

app.put("/api/settings", (req: Request, res: Response) => {
  const updated = { ...db.settings, ...req.body };
  db.settings = updated;
  logAudit("admin", "Admin", "admin", "SETTINGS_UPDATED", "Settings", "SYS-CONFIG", "System & POS configuration updated");
  saveDb();
  res.json(db.settings);
});

// Offline-First Sync Endpoint
app.post("/api/sync", (req: Request, res: Response) => {
  const { offlineSales } = req.body;
  if (!offlineSales || !Array.isArray(offlineSales) || offlineSales.length === 0) {
    return res.json({ syncedCount: 0, message: "No offline sales to sync" });
  }

  let synced = 0;
  for (const saleData of offlineSales) {
    // Avoid double counting if already present
    if (db.sales.some(s => s.id === saleData.id || s.invoiceNumber === saleData.invoiceNumber)) {
      continue;
    }

    const sale = {
      ...saleData,
      offlineSynced: true,
      timestamp: saleData.timestamp || new Date().toISOString()
    };

    // Deduct stock for offline sale
    for (const item of sale.items) {
      const product = db.products.find(p => p.id === item.productId);
      if (product) {
        product.currentStock = Math.max(0, product.currentStock - item.quantity);
        db.stockMovements.push({
          id: "mov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          productName: product.name,
          previousStock: product.currentStock + item.quantity,
          newStock: product.currentStock,
          changeQty: -item.quantity,
          type: "sale",
          referenceId: sale.invoiceNumber,
          userId: sale.cashierId,
          userName: sale.cashierName,
          date: sale.timestamp,
          reason: `Offline Sync POS Sale ${sale.invoiceNumber}`
        });
      }
    }

    db.sales.push(sale);
    synced++;
  }

  saveDb();
  res.json({
    syncedCount: synced,
    totalSales: db.sales.length,
    message: `Successfully synchronized ${synced} offline transaction(s)`
  });
});

// AI Assistant & Business Insights Endpoint. Local mode keeps all analysis on this server.
app.post("/api/ai/query", async (req: Request, res: Response) => {
  const { query, userRole, userName } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const ai = getAIClient();
    if (!ai) {
      // Return smart local data analysis if Gemini API key not present
      const answer = fallbackAIQuery(query);
      return res.json({
        response: answer.text,
        structuredData: answer.structuredData,
        modelUsed: "local-rules-v1"
      });
    }

    // Context preparation: sanitize and prepare live POS data for Gemini
    const summaryData = {
      totalProductsCount: db.products.length,
      totalSalesCount: db.sales.length,
      totalCustomers: db.customers.length,
      totalSuppliers: db.suppliers.length,
      lowStockProducts: db.products
        .filter(p => p.currentStock <= p.minStock)
        .map(p => ({ name: p.name, currentStock: p.currentStock, minStock: p.minStock })),
      expiredProducts: db.products
        .filter(p => calculateExpiryStatus(p.expiryDate) === "expired")
        .map(p => ({ name: p.name, expiryDate: p.expiryDate, stock: p.currentStock })),
      expiringSoonProducts: db.products
        .filter(p => calculateExpiryStatus(p.expiryDate) === "expiring_soon")
        .map(p => ({ name: p.name, expiryDate: p.expiryDate, stock: p.currentStock })),
      recentSales: db.sales.slice(-5).map(s => ({
        invoiceNumber: s.invoiceNumber,
        total: s.grandTotal,
        paymentMethod: s.paymentMethod,
        cashier: s.cashierName,
        date: s.timestamp
      })),
      allProductsSample: db.products.slice(0, 10).map(p => ({
        name: p.name,
        price: p.sellingPrice,
        cost: p.costPrice,
        stock: p.currentStock,
        category: p.category
      }))
    };

    const prompt = `You are the AI Business Intelligence & POS Assistant for "Apex Retail System".
The asking user is: ${userName || "Staff"} (Role: ${userRole || "Cashier"}).
Answer the user's business or inventory query accurately and concisely using this live store data:
${JSON.stringify(summaryData, null, 2)}

User Question: "${query}"

Guidelines:
1. Provide a direct, professional, factual answer based strictly on the provided store data.
2. If asking about low stock or expiry, list the exact items with numbers.
3. Be concise, scannable, and helpful. Use bullet points where appropriate.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    res.json({
      response: response.text || "No response generated",
      modelUsed: "gemini-3.8-flash"
    });
  } catch (err: any) {
    console.error("Gemini API error:", err);
    // Fallback to local heuristic query engine gracefully
    const answer = fallbackAIQuery(query);
    res.json({
      response: answer.text,
      structuredData: answer.structuredData,
      modelUsed: "local-rules-v1",
      note: "Answered using local database intelligence"
    });
  }
});

// Fallback AI Query Engine for offline or non-API scenarios
function fallbackAIQuery(query: string) {
  const q = query.toLowerCase();
  const today = new Date().toISOString().split("T")[0];
  const completedSales = db.sales.filter(s => s.status === "completed");
  const todaySales = completedSales.filter(s => s.timestamp.startsWith(today));
  const salesRevenue = (sales: typeof completedSales) => sales.reduce((sum, sale) => sum + Number(sale.grandTotal || 0), 0);
  const salesProfit = (sales: typeof completedSales) => sales.reduce((sum, sale) => {
    const grossProfit = sale.items.reduce((itemSum: number, item: any) => itemSum + (Number(item.lineTotal) - Number(item.costPrice || 0) * Number(item.quantity || 0)), 0);
    return sum + grossProfit;
  }, 0);

  if (q.includes("profit") || q.includes("today's sales") || q.includes("today sales") || q.includes("sales today")) {
    const total = salesRevenue(todaySales);
    const profit = salesProfit(todaySales);
    const margin = total > 0 ? (profit / total) * 100 : 0;
    return {
      text: `Today's completed sales are **$${total.toFixed(2)}** across **${todaySales.length}** transactions. Estimated gross profit is **$${profit.toFixed(2)}** (${margin.toFixed(1)}% margin). This uses recorded item cost and line totals, before operating expenses and tax settlement.`,
      structuredData: todaySales
    };
  }

  if (q.includes("low stock") || q.includes("low in stock")) {
    const low = db.products.filter(p => p.currentStock <= p.minStock);
    const list = low.map(p => `• **${p.name}**: ${p.currentStock} ${p.unit} remaining (Threshold: ${p.minStock})`).join("\n");
    return {
      text: low.length > 0
        ? `We have **${low.length}** products currently at or below minimum threshold:\n${list}`
        : "All inventory is currently above minimum stock thresholds.",
      structuredData: low
    };
  }

  if (q.includes("expire") || q.includes("expired") || q.includes("expiring")) {
    const expired = db.products.filter(p => calculateExpiryStatus(p.expiryDate) === "expired");
    const expiring = db.products.filter(p => calculateExpiryStatus(p.expiryDate) === "expiring_soon");
    let msg = "";
    if (expired.length > 0) {
      msg += `🚨 **Expired Products (${expired.length}):**\n` + expired.map(p => `• ${p.name} (Qty: ${p.currentStock}, Exp: ${p.expiryDate})`).join("\n") + "\n\n";
    }
    if (expiring.length > 0) {
      msg += `⚠️ **Expiring Soon (${expiring.length}):**\n` + expiring.map(p => `• ${p.name} (Qty: ${p.currentStock}, Exp: ${p.expiryDate})`).join("\n");
    }
    if (!msg) msg = "No products are currently expired or expiring within 30 days.";
    return {
      text: msg,
      structuredData: { expired, expiring }
    };
  }

  if (q.includes("cashier") || q.includes("staff") || q.includes("performing")) {
    const performance: Record<string, { name: string; sales: number; revenue: number }> = {};
    todaySales.forEach(sale => {
      const key = sale.cashierId || sale.cashierName;
      if (!performance[key]) performance[key] = { name: sale.cashierName || "Unknown", sales: 0, revenue: 0 };
      performance[key].sales += 1;
      performance[key].revenue += Number(sale.grandTotal || 0);
    });
    const ranked = Object.values(performance).sort((a, b) => b.revenue - a.revenue);
    return {
      text: ranked.length
        ? `Today's cashier performance:\n${ranked.map((cashier, index) => `${index + 1}. **${cashier.name}** — ${cashier.sales} sale(s), $${cashier.revenue.toFixed(2)} revenue`).join("\n")}`
        : "No completed sales have been recorded today, so there is no cashier performance to rank yet.",
      structuredData: ranked
    };
  }

  if (q.includes("price") || q.includes("markdown") || q.includes("discount") || q.includes("strategy")) {
    const atRisk = db.products.filter(p => calculateExpiryStatus(p.expiryDate) === "expiring_soon" && p.currentStock > 0);
    return {
      text: atRisk.length
        ? `Recommended expiry markdowns:\n${atRisk.map(p => `• **${p.name}** — ${p.currentStock} ${p.unit}(s), expires ${p.expiryDate}: start with a 15% markdown; review daily and increase to 25% only if stock remains close to expiry.`).join("\n")}\n\nProtect margin by applying markdowns only to at-risk batches and pairing them with faster-moving items.`
        : "There are no in-stock products currently marked as expiring soon. Keep normal pricing and review the expiry dashboard daily.",
      structuredData: atRisk
    };
  }

  if (q.includes("top") || q.includes("best selling")) {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    db.sales.forEach(s => {
      s.items.forEach((it: any) => {
        if (!map[it.productId]) map[it.productId] = { name: it.productName, qty: 0, revenue: 0 };
        map[it.productId].qty += it.quantity;
        map[it.productId].revenue += it.lineTotal;
      });
    });
    const top = Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const list = top.map((t, idx) => `${idx + 1}. **${t.name}** — ${t.qty} units sold ($${t.revenue.toFixed(2)})`).join("\n");
    return {
      text: `Top performing products by unit volume:\n${list}`,
      structuredData: top
    };
  }

  // General summary
  return {
    text: `Local Store Summary:\n• Active products: **${db.products.length}**\n• Completed sales: **${completedSales.length}** ($${salesRevenue(completedSales).toFixed(2)})\n• Registered customers: **${db.customers.length}**\n• Active suppliers: **${db.suppliers.length}**\n\nAsk about sales and profit, low stock, expiry, cashier performance, product rankings, or markdowns.`,
    structuredData: null
  };
}

// AI Business Insights Generator
app.get("/api/ai/insights", (req: Request, res: Response) => {
  const insights = [];

  // Check low stock
  const lowStock = db.products.filter(p => p.currentStock <= p.minStock);
  if (lowStock.length > 0) {
    insights.push({
      id: "ins-stock-" + Date.now(),
      type: "stock_risk",
      severity: "high",
      title: "Immediate Stock Replenishment Needed",
      description: `${lowStock.length} products are critically low or out of stock (${lowStock.map(p => p.name).slice(0, 3).join(", ")}).`,
      recommendation: "Issue purchase orders to primary suppliers to avoid lost checkout revenue.",
      metric: `${lowStock.length} items at risk`
    });
  }

  // Check expiry risk
  const expiring = db.products.filter(p => {
    const s = calculateExpiryStatus(p.expiryDate);
    return s === "expiring_soon" || s === "expired";
  });
  if (expiring.length > 0) {
    const atRiskValue = expiring.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
    insights.push({
      id: "ins-exp-" + Date.now(),
      type: "expiry_risk",
      severity: "medium",
      title: "Perishable Inventory Expiry Warning",
      description: `${expiring.length} product batches are approaching expiry with an estimated capital liability of $${atRiskValue.toFixed(2)}.`,
      recommendation: "Apply promotional 15-25% flash discounts or bundle with high-velocity items to accelerate clearance.",
      metric: `$${atRiskValue.toFixed(2)} at risk`
    });
  }

  // Check dead stock (items in stock with 0 sales)
  const soldIds = new Set<string>();
  db.sales.forEach(s => s.items.forEach((it: any) => soldIds.add(it.productId)));
  const deadStock = db.products.filter(p => !soldIds.has(p.id) && p.currentStock > 10);
  if (deadStock.length > 0) {
    insights.push({
      id: "ins-dead-" + Date.now(),
      type: "dead_stock",
      severity: "low",
      title: "Slow-Moving / Unsold Inventory Identified",
      description: `${deadStock.length} products have recorded 0 sales in recent shifts (${deadStock.map(p => p.name).slice(0, 2).join(", ")}).`,
      recommendation: "Review front-of-store shelf placement or run a weekend category feature campaign.",
      metric: `${deadStock.length} slow items`
    });
  }

  // Opportunity Insight
  insights.push({
    id: "ins-opp-" + Date.now(),
    type: "opportunity",
    severity: "low",
    title: "Beverage & Snack Cross-Selling Potential",
    description: "Cold beverages and snack categories show 68% checkout co-occurrence in peak afternoon hours.",
    recommendation: "Ensure quick-access grab-and-go cooler displays near primary checkout counter.",
    metric: "+14% basket size"
  });

  res.json(insights);
});

// Vite Middleware integration for development and production build serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Apex Retail System Server active on port ${PORT}`);
  });
}

startServer();
