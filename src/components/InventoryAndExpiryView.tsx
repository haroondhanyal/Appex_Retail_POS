import { useState, useMemo } from "react";
import type React from "react";
import {
  Package,
  AlertTriangle,
  Clock,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  DollarSign,
  X,
  Trash2,
  Search,
  Filter,
  Save,
  Truck,
  TrendingDown,
  ShieldAlert,
  Archive
} from "lucide-react";
import { Product, StockMovement, SystemSettings, User } from "../types";

interface InventoryAndExpiryViewProps {
  products: Product[];
  movements: StockMovement[];
  settings: SystemSettings;
  currentUser: User;
  onAdjustStock: (payload: any) => Promise<void>;
  onUpdateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  onDeleteProduct?: (id: string) => Promise<void>;
  onDisposeExpired?: (payload: {
    productId: string;
    batchId?: string;
    reason: string;
    actionType?: "dispose" | "delete_product";
  }) => Promise<void>;
  onUpdateBatchThresholds?: (updates: { id: string; minStock?: number; maxStock?: number }[]) => Promise<void>;
  onNavigateToPurchases?: () => void;
}

export function InventoryAndExpiryView({
  products,
  movements,
  settings,
  currentUser,
  onAdjustStock,
  onUpdateProduct,
  onDeleteProduct,
  onDisposeExpired,
  onUpdateBatchThresholds,
  onNavigateToPurchases
}: InventoryAndExpiryViewProps) {
  const [activeTab, setActiveTab] = useState<"expiry" | "threshold" | "movements">("expiry");
  const [expiryDaysThreshold, setExpiryDaysThreshold] = useState<number>(settings.expiryWarningDays || 30);

  // Modals
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showAddExpiredModal, setShowAddExpiredModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);

  // Adjustment State
  const [adjType, setAdjType] = useState<string>("manual_count");
  const [adjQty, setAdjQty] = useState<number>(0);
  const [adjReason, setAdjReason] = useState("");

  // Add Expired Form State
  const [expiredProductId, setExpiredProductId] = useState(products[0]?.id || "");
  const [expiredBatchNumber, setExpiredBatchNumber] = useState(`EXP-${Date.now().toString().slice(-4)}`);
  const [expiredDate, setExpiredDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiredQuantity, setExpiredQuantity] = useState(5);
  const [expiredReason, setExpiredReason] = useState("Spoiled / Past Best Before Date on shelf");
  const [expiredAction, setExpiredAction] = useState<"dispose_now" | "mark_expired">("dispose_now");

  // Threshold Management State
  const [thresholdSearch, setThresholdSearch] = useState("");
  const [thresholdFilter, setThresholdFilter] = useState<"all" | "low" | "optimal" | "overstocked">("all");
  const [pendingThresholds, setPendingThresholds] = useState<{ [productId: string]: { minStock: number; maxStock: number } }>({});
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Perishable risk analysis
  const expiryAnalysis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredItems: { product: Product; daysDiff: number; riskValue: number }[] = [];
    const expiringSoonItems: { product: Product; daysDiff: number; riskValue: number }[] = [];
    let totalRiskValue = 0;

    products.forEach(p => {
      if (!p.expiryDate) return;
      const exp = new Date(p.expiryDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const riskVal = p.currentStock * p.costPrice;

      if (diffDays <= 0) {
        expiredItems.push({ product: p, daysDiff: diffDays, riskValue: riskVal });
        totalRiskValue += riskVal;
      } else if (diffDays <= expiryDaysThreshold) {
        expiringSoonItems.push({ product: p, daysDiff: diffDays, riskValue: riskVal });
        totalRiskValue += riskVal;
      }
    });

    return {
      expiredItems,
      expiringSoonItems,
      totalRiskValue: Number(totalRiskValue.toFixed(2))
    };
  }, [products, expiryDaysThreshold]);

  // Threshold Analysis
  const thresholdAnalysis = useMemo(() => {
    const lowStockItems: Product[] = [];
    const optimalItems: Product[] = [];
    const overstockedItems: Product[] = [];

    products.forEach(p => {
      if (p.currentStock <= p.minStock) {
        lowStockItems.push(p);
      } else if (p.maxStock && p.currentStock > p.maxStock) {
        overstockedItems.push(p);
      } else {
        optimalItems.push(p);
      }
    });

    const unitsToReorder = lowStockItems.reduce((acc, p) => {
      const target = p.maxStock || p.minStock * 2;
      return acc + Math.max(0, target - p.currentStock);
    }, 0);

    return { lowStockItems, optimalItems, overstockedItems, unitsToReorder };
  }, [products]);

  // Filtered Threshold Products
  const filteredThresholdProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        !thresholdSearch ||
        p.name.toLowerCase().includes(thresholdSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(thresholdSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(thresholdSearch.toLowerCase());

      if (!matchSearch) return false;

      if (thresholdFilter === "low") return p.currentStock <= p.minStock;
      if (thresholdFilter === "optimal") return p.currentStock > p.minStock && (!p.maxStock || p.currentStock <= p.maxStock);
      if (thresholdFilter === "overstocked") return p.maxStock && p.currentStock > p.maxStock;
      return true;
    });
  }, [products, thresholdSearch, thresholdFilter]);

  const handleApplyClearanceDiscount = async (product: Product, discountPercent: number) => {
    try {
      await onUpdateProduct(product.id, { discount: discountPercent });
      alert(`Applied ${discountPercent}% clearance discount to ${product.name}`);
    } catch (e: any) {
      alert("Failed to apply discount");
    }
  };

  // Stock Adjustment Submit
  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjQty === 0) {
      alert("Please specify a non-zero adjustment quantity");
      return;
    }
    setIsSubmitting(true);
    try {
      await onAdjustStock({
        productId: selectedProduct.id,
        changeQty: adjQty,
        type: adjType,
        reason: adjReason || "Manual inventory reconciliation",
        userId: currentUser.id,
        userName: currentUser.name
      });
      setShowAdjustmentModal(false);
      setAdjQty(0);
      setAdjReason("");
    } catch (err: any) {
      alert(err.message || "Adjustment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Expired Product / Batch Entry
  const handleAddExpiredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === expiredProductId);
    if (!prod) return;

    setIsSubmitting(true);
    try {
      if (expiredAction === "dispose_now") {
        if (onDisposeExpired) {
          await onDisposeExpired({
            productId: prod.id,
            reason: `${expiredReason} (Date: ${expiredDate}, Batch: ${expiredBatchNumber})`,
            actionType: "dispose"
          });
        } else {
          // Fallback to stock adjustment
          await onAdjustStock({
            productId: prod.id,
            changeQty: -Math.min(prod.currentStock, expiredQuantity),
            type: "expiry_writeoff",
            reason: `Disposed expired batch ${expiredBatchNumber}: ${expiredReason}`,
            userId: currentUser.id,
            userName: currentUser.name
          });
        }
      } else {
        // Mark product as expired
        await onUpdateProduct(prod.id, {
          expiryDate: expiredDate,
          batchNumber: expiredBatchNumber
        });
      }

      setShowAddExpiredModal(false);
      alert(`Expired stock event logged successfully.`);
    } catch (err: any) {
      alert(err.message || "Failed to record expired stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Dispose Single Expired Product
  const handleDeleteExpiredProduct = async (product: Product, actionType: "dispose" | "delete_product") => {
    const isDelete = actionType === "delete_product";
    const confirmMsg = isDelete
      ? `Permanently delete expired product "${product.name}" from catalog?\n\nThis will erase the item completely.`
      : `Write off and dispose ${product.currentStock} units of expired "${product.name}"?\n\nInventory will be cleared to 0 and an audit write-off recorded.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (onDisposeExpired) {
        await onDisposeExpired({
          productId: product.id,
          reason: `Expired on ${product.expiryDate} disposal`,
          actionType
        });
      } else if (isDelete && onDeleteProduct) {
        await onDeleteProduct(product.id);
      } else {
        await onAdjustStock({
          productId: product.id,
          changeQty: -product.currentStock,
          type: "expiry_writeoff",
          reason: `Expired on ${product.expiryDate} disposal`,
          userId: currentUser.id,
          userName: currentUser.name
        });
      }
      alert(`Expired stock for ${product.name} successfully ${isDelete ? "deleted" : "disposed"}.`);
    } catch (err: any) {
      alert(err.message || "Failed to process expired stock disposal");
    }
  };

  // Batch Dispose All Expired
  const handleBatchDisposeAll = async () => {
    if (expiryAnalysis.expiredItems.length === 0) return;
    const count = expiryAnalysis.expiredItems.length;
    const confirmMsg = `Are you sure you want to write-off and dispose ALL ${count} expired inventory products?\n\nTotal write-off value: $${expiryAnalysis.totalRiskValue.toFixed(2)}`;
    if (!window.confirm(confirmMsg)) return;

    try {
      for (const { product } of expiryAnalysis.expiredItems) {
        if (onDisposeExpired) {
          await onDisposeExpired({
            productId: product.id,
            reason: `Batch expired disposal: ${product.name} expired on ${product.expiryDate}`,
            actionType: "dispose"
          });
        } else {
          await onAdjustStock({
            productId: product.id,
            changeQty: -product.currentStock,
            type: "expiry_writeoff",
            reason: `Batch expired write-off on ${product.expiryDate}`,
            userId: currentUser.id,
            userName: currentUser.name
          });
        }
      }
      alert(`Successfully disposed of all ${count} expired inventory items.`);
    } catch (err: any) {
      alert(err.message || "Batch disposal encountered an error");
    }
  };

  // Threshold Change Tracker
  const handleThresholdChange = (productId: string, field: "minStock" | "maxStock", val: number) => {
    setPendingThresholds(prev => {
      const prod = products.find(p => p.id === productId);
      const current = prev[productId] || { minStock: prod?.minStock || 10, maxStock: prod?.maxStock || 100 };
      return {
        ...prev,
        [productId]: {
          ...current,
          [field]: Math.max(0, val)
        }
      };
    });
  };

  // Save Pending Thresholds
  const handleSaveAllThresholds = async () => {
    const entries = Object.entries(pendingThresholds) as [string, { minStock: number; maxStock: number }][];
    if (entries.length === 0) {
      alert("No threshold changes have been modified.");
      return;
    }

    setIsSavingThresholds(true);
    try {
      if (onUpdateBatchThresholds) {
        const updates = entries.map(([id, val]) => ({
          id,
          minStock: val.minStock,
          maxStock: val.maxStock
        }));
        await onUpdateBatchThresholds(updates);
      } else {
        for (const [id, val] of entries) {
          await onUpdateProduct(id, val);
        }
      }
      setPendingThresholds({});
      alert(`Successfully updated threshold settings for ${entries.length} product(s).`);
    } catch (err: any) {
      alert(err.message || "Failed to update thresholds");
    } finally {
      setIsSavingThresholds(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-neutral-800" />
            <span>Inventory Valuation, Expiry & Threshold Control</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Perishable goods tracking, batch disposal write-offs, threshold stock reorder management, and audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAddExpiredModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <ShieldAlert className="w-4 h-4 text-red-300" />
            <span>+ Log Expired Stock</span>
          </button>

          <button
            onClick={() => {
              setSelectedProduct(products[0] || null);
              setShowAdjustmentModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition shadow-xs"
          >
            <Sliders className="w-4 h-4" />
            <span>Manual Adjustment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        {/* At-Risk Capital */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Expired Capital Risk
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 font-mono mt-2">
            ${expiryAnalysis.totalRiskValue.toFixed(2)}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {expiryAnalysis.expiredItems.length} expired & {expiryAnalysis.expiringSoonItems.length} near expiry
          </div>
        </div>

        {/* Below Threshold Reorder Alert */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Below Threshold (Low Stock)
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-2">
            {thresholdAnalysis.lowStockItems.length} SKUs
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {thresholdAnalysis.unitsToReorder} units recommended to replenish
          </div>
        </div>

        {/* Healthy Threshold */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Optimal Stock Levels
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-2">
            {thresholdAnalysis.optimalItems.length} SKUs
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Stock within configured min/max targets
          </div>
        </div>

        {/* Stock Movements */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Stock Trace Logged
            </span>
            <Layers className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono mt-2">
            {movements.length} events
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Inbound POs, sales, write-offs & counts
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("expiry")}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === "expiry"
              ? "border-neutral-900 text-neutral-900 font-black"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Perishables & Expired Stock ({expiryAnalysis.expiredItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("threshold")}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === "threshold"
              ? "border-neutral-900 text-neutral-900 font-black"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-600" />
          <span>Threshold Stock & Reorder Levels ({thresholdAnalysis.lowStockItems.length} Low)</span>
        </button>

        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === "movements"
              ? "border-neutral-900 text-neutral-900 font-black"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Stock Movement Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: PERISHABLES & EXPIRED STOCK MATRIX */}
      {activeTab === "expiry" && (
        <div className="space-y-6">
          {/* Section: Expired Products (Immediate Action) */}
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-red-50/70 border-b border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                <h3 className="font-bold text-xs text-red-900 uppercase tracking-wider">
                  Expired Products Management (Immediate Disposal / Deletion)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                  {expiryAnalysis.expiredItems.length} Items Expired
                </span>

                {expiryAnalysis.expiredItems.length > 0 && (
                  <button
                    onClick={handleBatchDisposeAll}
                    className="flex items-center gap-1 px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dispose All Expired ({expiryAnalysis.expiredItems.length})</span>
                  </button>
                )}
              </div>
            </div>

            {expiryAnalysis.expiredItems.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-neutral-700">No expired stock currently on shelves.</p>
                <p className="text-[11px] text-neutral-400">All perishables are within valid freshness dates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 font-semibold bg-neutral-50">
                      <th className="py-3 px-4">Item Details</th>
                      <th className="py-3 px-3">Batch Code</th>
                      <th className="py-3 px-3">Expiry Date</th>
                      <th className="py-3 px-3 text-center">Expired Units</th>
                      <th className="py-3 px-3 text-right">Cost Loss</th>
                      <th className="py-3 px-4 text-right">Disposal & Deletion Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {expiryAnalysis.expiredItems.map(({ product, daysDiff, riskValue }) => (
                      <tr key={product.id} className="hover:bg-red-50/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-9 h-9 rounded-lg object-cover bg-neutral-100 shrink-0"
                              />
                            )}
                            <div>
                              <div className="font-bold text-neutral-900">{product.name}</div>
                              <div className="text-[10px] font-mono text-neutral-400">
                                SKU: {product.sku} • {product.category}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-neutral-700">
                          {product.batchNumber || "B-INIT"}
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-red-700 font-bold block">{product.expiryDate}</span>
                          <span className="text-[10px] text-red-500 font-mono">
                            {Math.abs(daysDiff)} days past expiry
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-black text-red-700">
                          {product.currentStock} {product.unit}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-red-700 font-bold">
                          ${riskValue.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Write-off / Dispose Stock */}
                            <button
                              onClick={() => handleDeleteExpiredProduct(product, "dispose")}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              title="Zero out expired inventory and log disposal movement"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Dispose Stock</span>
                            </button>

                            {/* Permanently Delete Product */}
                            <button
                              onClick={() => handleDeleteExpiredProduct(product, "delete_product")}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-red-100 text-neutral-700 hover:text-red-700 rounded-lg text-xs font-bold transition border border-neutral-300"
                              title="Permanently remove this expired product from store database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Product</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Expiring Soon (Clearance) */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="font-bold text-xs text-amber-900 uppercase tracking-wider">
                  Expiring Within {expiryDaysThreshold} Days (Clearance Opportunities)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 font-medium">Horizon:</span>
                {[7, 15, 30, 60].map(days => (
                  <button
                    key={days}
                    onClick={() => setExpiryDaysThreshold(days)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                      expiryDaysThreshold === days
                        ? "bg-amber-800 text-white"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {expiryAnalysis.expiringSoonItems.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">
                No items expiring within {expiryDaysThreshold} days.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 font-semibold bg-neutral-50">
                      <th className="py-2.5 px-4">Item</th>
                      <th className="py-2.5 px-3">Batch #</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3 text-center">Days Remaining</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Current Discount</th>
                      <th className="py-2.5 px-4 text-right">Clearance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {expiryAnalysis.expiringSoonItems.map(({ product, daysDiff }) => (
                      <tr key={product.id} className="hover:bg-amber-50/30 transition">
                        <td className="py-3 px-4 font-bold text-neutral-900">{product.name}</td>
                        <td className="py-3 px-3 font-mono text-neutral-600">{product.batchNumber || "N/A"}</td>
                        <td className="py-3 px-3 text-amber-800 font-medium">{product.expiryDate}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                          {daysDiff} days
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {product.currentStock} {product.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {product.discount > 0 ? `${product.discount}% OFF` : "Standard Price"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApplyClearanceDiscount(product, 25)}
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[11px] font-bold"
                            >
                              25% OFF
                            </button>
                            <button
                              onClick={() => handleApplyClearanceDiscount(product, 50)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold"
                            >
                              50% OFF
                            </button>
                          </div>
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

      {/* TAB 2: THRESHOLD STOCK & REORDER CONTROL */}
      {activeTab === "threshold" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products to adjust thresholds..."
                value={thresholdSearch}
                onChange={e => setThresholdSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-xs font-medium">
                {(["all", "low", "optimal", "overstocked"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setThresholdFilter(f)}
                    className={`px-2.5 py-1 rounded-md transition capitalize ${
                      thresholdFilter === f
                        ? "bg-white text-neutral-900 font-bold shadow-2xs"
                        : "text-neutral-600"
                    }`}
                  >
                    {f === "all" ? "All Items" : f === "low" ? "Below Min (Reorder)" : f}
                  </button>
                ))}
              </div>

              {Object.keys(pendingThresholds).length > 0 && (
                <button
                  onClick={handleSaveAllThresholds}
                  disabled={isSavingThresholds}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save ({Object.keys(pendingThresholds).length}) Thresholds</span>
                </button>
              )}

              {onNavigateToPurchases && thresholdAnalysis.lowStockItems.length > 0 && (
                <button
                  onClick={onNavigateToPurchases}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generate Inbound PO</span>
                </button>
              )}
            </div>
          </div>

          {/* Threshold Table */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Current Stock</th>
                    <th className="py-3 px-3 text-center">Min Threshold</th>
                    <th className="py-3 px-3 text-center">Max Capacity</th>
                    <th className="py-3 px-3">Stock Ratio</th>
                    <th className="py-3 px-4 text-center">Threshold Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredThresholdProducts.map(prod => {
                    const pending = pendingThresholds[prod.id];
                    const minVal = pending?.minStock !== undefined ? pending.minStock : prod.minStock;
                    const maxVal = pending?.maxStock !== undefined ? pending.maxStock : prod.maxStock || prod.minStock * 4;

                    const isLow = prod.currentStock <= minVal;
                    const isOver = prod.currentStock > maxVal;
                    const isModified = pending !== undefined;

                    const stockPct = maxVal > 0 ? Math.min(100, Math.round((prod.currentStock / maxVal) * 100)) : 50;

                    return (
                      <tr
                        key={prod.id}
                        className={`hover:bg-neutral-50/80 transition ${
                          isModified ? "bg-blue-50/30" : isLow ? "bg-amber-50/20" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {prod.image && (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-8 h-8 rounded-md object-cover bg-neutral-100 shrink-0"
                              />
                            )}
                            <div>
                              <span className="font-bold text-neutral-900 block">{prod.name}</span>
                              <span className="text-[10px] font-mono text-neutral-400">
                                {prod.sku} • Cost ${prod.costPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-neutral-600 font-medium">
                          {prod.category}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold ${
                              isLow
                                ? "bg-amber-100 text-amber-800"
                                : isOver
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {prod.currentStock} {prod.unit}
                          </span>
                        </td>

                        {/* Min Stock Editor */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleThresholdChange(prod.id, "minStock", minVal - 5)}
                              className="w-5 h-5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={minVal}
                              onChange={e =>
                                handleThresholdChange(prod.id, "minStock", Number(e.target.value))
                              }
                              className="w-14 px-1.5 py-0.5 text-center font-mono font-bold bg-white border border-neutral-300 rounded text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleThresholdChange(prod.id, "minStock", minVal + 5)}
                              className="w-5 h-5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Max Stock Editor */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleThresholdChange(prod.id, "maxStock", maxVal - 10)}
                              className="w-5 h-5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={maxVal}
                              onChange={e =>
                                handleThresholdChange(prod.id, "maxStock", Number(e.target.value))
                              }
                              className="w-16 px-1.5 py-0.5 text-center font-mono font-bold bg-white border border-neutral-300 rounded text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleThresholdChange(prod.id, "maxStock", maxVal + 10)}
                              className="w-5 h-5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Stock vs Capacity Progress */}
                        <td className="py-3 px-3">
                          <div className="w-24 space-y-1">
                            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isLow ? "bg-amber-500" : isOver ? "bg-blue-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${stockPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-400 font-mono block text-center">
                              {stockPct}% of max
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Critical Low</span>
                            </span>
                          ) : isOver ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                              <span>Overstocked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Optimal</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENTS AUDIT TRAIL */}
      {activeTab === "movements" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
              Stock Ledger & Movement History
            </h3>
            <span className="text-xs font-mono font-semibold text-neutral-500">
              Showing last {movements.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-semibold bg-neutral-50">
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-center">Previous</th>
                  <th className="py-2.5 px-3 text-center">Change</th>
                  <th className="py-2.5 px-3 text-center">New Stock</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reason / Ref</th>
                  <th className="py-2.5 px-4">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {movements.slice(0, 50).map(m => {
                  const isPositive = m.changeQty > 0;
                  return (
                    <tr key={m.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">
                        {new Date(m.date).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-neutral-900">{m.productName}</td>
                      <td className="py-3 px-3 text-center font-mono text-neutral-500">{m.previousStock}</td>
                      <td className="py-3 px-3 text-center font-mono font-black">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${m.changeQty}` : m.changeQty}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-neutral-900">
                        {m.newStock}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            m.type === "sale"
                              ? "bg-blue-50 text-blue-700"
                              : m.type === "purchase"
                              ? "bg-emerald-50 text-emerald-700"
                              : m.type === "expiry"
                              ? "bg-red-100 text-red-800"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-600 max-w-[220px] truncate" title={m.reason}>
                        {m.reason}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-700">{m.userName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: LOG EXPIRED STOCK */}
      {showAddExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 flex flex-col">
            <div className="px-6 py-4 bg-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-300" />
                <div>
                  <h3 className="font-bold text-base">Log & Write-Off Expired Stock</h3>
                  <p className="text-xs text-red-200">Remove unsellable or expired perishable items</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddExpiredModal(false)}
                className="p-1 rounded-lg hover:bg-red-700 text-red-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpiredSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Select Product *</label>
                <select
                  value={expiredProductId}
                  onChange={e => setExpiredProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (In stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Expired Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={expiredQuantity}
                    onChange={e => setExpiredQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Batch / Lot Number
                  </label>
                  <input
                    type="text"
                    value={expiredBatchNumber}
                    onChange={e => setExpiredBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={expiredDate}
                  onChange={e => setExpiredDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Disposal / Write-off Reason *
                </label>
                <select
                  value={expiredReason}
                  onChange={e => setExpiredReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                >
                  <option value="Spoiled / Past Best Before Date on shelf">
                    Spoiled / Past Best Before Date on shelf
                  </option>
                  <option value="Damaged packaging / seal broken">
                    Damaged packaging / seal broken
                  </option>
                  <option value="Cold chain breakdown / Temp breach">
                    Cold chain breakdown / Temp breach
                  </option>
                  <option value="Customer return - unsellable condition">
                    Customer return - unsellable condition
                  </option>
                  <option value="Regulatory recall / Manufacturer withdrawal">
                    Regulatory recall / Manufacturer withdrawal
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Disposal Immediate Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpiredAction("dispose_now")}
                    className={`p-3 rounded-xl border text-left transition ${
                      expiredAction === "dispose_now"
                        ? "border-red-600 bg-red-50 text-red-900"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="font-bold text-xs">Dispose & Zero Out Stock</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      Deduct from stock immediately and log waste audit
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpiredAction("mark_expired")}
                    className={`p-3 rounded-xl border text-left transition ${
                      expiredAction === "mark_expired"
                        ? "border-amber-600 bg-amber-50 text-amber-900"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="font-bold text-xs">Flag as Expired Only</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      Keep stock count but flag for manager audit
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpiredModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? "Logging..." : "Confirm & Log Expired"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL STOCK ADJUSTMENT */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200 flex flex-col">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Reconcile / Adjust Stock</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Target Product</label>
                <select
                  value={selectedProduct.id}
                  onChange={e => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) setSelectedProduct(found);
                  }}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Adjustment Type</label>
                <select
                  value={adjType}
                  onChange={e => setAdjType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                >
                  <option value="manual_count">Physical Stock Count / Inventory Audit</option>
                  <option value="expiry_writeoff">Expired / Spoiled Goods Write-off</option>
                  <option value="damage">Damaged in Store</option>
                  <option value="theft_shrinkage">Shrinkage / Unaccounted Shortage</option>
                  <option value="supplier_return">Vendor Return / RMA</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Change Quantity (Positive for additions, Negative for deductions)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjQty(prev => prev - 1)}
                    className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={adjQty}
                    onChange={e => setAdjQty(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-center font-mono font-bold text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjQty(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Resulting stock:{" "}
                  <span className="font-mono font-bold text-neutral-900">
                    {Math.max(0, selectedProduct.currentStock + adjQty)} {selectedProduct.unit}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Reason / Reference *</label>
                <input
                  type="text"
                  placeholder="e.g. Annual physical count variance, broken bottle"
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isSubmitting ? "Adjusting..." : "Apply Adjustment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
