import { useState, useMemo } from "react";
import type React from "react";
import {
  Plus,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  X,
  Trash2,
  Camera,
  Search,
  FileText,
  Printer,
  ChevronRight,
  Barcode,
  Calendar,
  Layers,
  AlertCircle
  ,Pencil
} from "lucide-react";
import { Purchase, Product, Supplier, User } from "../types";
import { ImageCaptureUpload } from "./ImageCaptureUpload";

interface InboundPOItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  batchNumber: string;
  expiryDate: string;
  image?: string;
  // If this item is a brand new product being inbounded at receiving dock:
  isNewProduct?: boolean;
  sellingPrice?: number;
  barcode?: string;
  category?: string;
  minStock?: number;
}

interface PurchasesViewProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  currentUser: User;
  onCreatePurchase: (data: any) => Promise<void>;
  onReceivePurchase?: (id: string) => Promise<void>;
  onDeletePurchase?: (id: string) => Promise<void>;
  onUpdatePurchase?: (id: string, data: Partial<Purchase>) => Promise<void>;
  onCreateProduct?: (data: Partial<Product>) => Promise<void>;
}

export function PurchasesView({
  purchases,
  products,
  suppliers,
  currentUser,
  onCreatePurchase,
  onReceivePurchase,
  onDeletePurchase,
  onUpdatePurchase,
  onCreateProduct
}: PurchasesViewProps) {
  const [showNewPOModal, setShowNewPOModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "ordered">("all");

  // Form State
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [poStatus, setPoStatus] = useState<"received" | "ordered">("received");
  const [poNotes, setPoNotes] = useState("");
  const [poItems, setPoItems] = useState<InboundPOItem[]>([
    {
      productId: products[0]?.id || "",
      productName: products[0]?.name || "Item",
      quantity: 40,
      costPrice: products[0]?.costPrice || 2.5,
      batchNumber: `B-${Date.now().toString().slice(-4)}`,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      image: products[0]?.image || ""
    }
  ]);

  // Modal for Live Picture & New Inbound Item
  const [dockItemModalOpen, setDockItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [dockItemData, setDockItemData] = useState<{
    name: string;
    barcode: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    minStock: number;
    batchNumber: string;
    expiryDate: string;
    image: string;
  }>({
    name: "",
    barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
    category: "Beverages",
    costPrice: 2.0,
    sellingPrice: 4.5,
    quantity: 50,
    minStock: 15,
    batchNumber: `INB-${Date.now().toString().slice(-4)}`,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    image: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReceivingAction, setIsReceivingAction] = useState(false);
  const [isEditingPO, setIsEditingPO] = useState(false);
  const [poEditNotes, setPoEditNotes] = useState("");
  const [poEditSupplierId, setPoEditSupplierId] = useState("");

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalSpend = purchases.reduce(
      (acc, po) => acc + (po.grandTotal || po.totalAmount || 0),
      0
    );
    const receivedCount = purchases.filter(po => po.status === "received").length;
    const pendingCount = purchases.filter(po => po.status === "ordered" || po.status === "pending").length;
    const totalUnits = purchases.reduce(
      (acc, po) => acc + (po.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0),
      0
    );
    return { totalSpend, receivedCount, pendingCount, totalUnits };
  }, [purchases]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(po => {
      const matchSearch =
        !searchQuery ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || po.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, searchQuery, statusFilter]);

  // Add Item Row
  const addItemRow = () => {
    const prod = products[0];
    setPoItems(prev => [
      ...prev,
      {
        productId: prod?.id || "",
        productName: prod?.name || "Product",
        quantity: 20,
        costPrice: prod?.costPrice || 2.0,
        batchNumber: `B-${Date.now().toString().slice(-4)}`,
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        image: prod?.image || ""
      }
    ]);
  };

  const removeItemRow = (idx: number) => {
    setPoItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: keyof InboundPOItem, value: any) => {
    setPoItems(prev =>
      prev.map((item, i) => {
        if (i === idx) {
          if (field === "productId") {
            const p = products.find(prod => prod.id === value);
            return {
              ...item,
              productId: value,
              productName: p ? p.name : item.productName,
              costPrice: p ? p.costPrice : item.costPrice,
              image: p ? p.image : item.image
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Open Dock New Product / Photo capture
  const handleOpenDockIntake = (indexToEdit?: number) => {
    if (typeof indexToEdit === "number") {
      setEditingItemIndex(indexToEdit);
      const it = poItems[indexToEdit];
      setDockItemData({
        name: it.productName,
        barcode: it.barcode || `890${Math.floor(100000000 + Math.random() * 900000000)}`,
        category: it.category || "Beverages",
        costPrice: it.costPrice,
        sellingPrice: it.sellingPrice || it.costPrice * 1.5,
        quantity: it.quantity,
        minStock: it.minStock || 15,
        batchNumber: it.batchNumber,
        expiryDate: it.expiryDate,
        image: it.image || ""
      });
    } else {
      setEditingItemIndex(null);
      setDockItemData({
        name: "",
        barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
        category: "Beverages",
        costPrice: 2.0,
        sellingPrice: 4.5,
        quantity: 50,
        minStock: 15,
        batchNumber: `INB-${Date.now().toString().slice(-4)}`,
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        image: ""
      });
    }
    setDockItemModalOpen(true);
  };

  // Save dock item
  const handleSaveDockItem = async () => {
    if (!dockItemData.name.trim()) {
      alert("Please specify the item / product name.");
      return;
    }

    if (editingItemIndex !== null) {
      // Update existing item row
      setPoItems(prev =>
        prev.map((it, idx) =>
          idx === editingItemIndex
            ? {
                ...it,
                productName: dockItemData.name,
                image: dockItemData.image,
                costPrice: Number(dockItemData.costPrice),
                quantity: Number(dockItemData.quantity),
                batchNumber: dockItemData.batchNumber,
                expiryDate: dockItemData.expiryDate,
                barcode: dockItemData.barcode,
                sellingPrice: Number(dockItemData.sellingPrice),
                minStock: Number(dockItemData.minStock)
              }
            : it
        )
      );
    } else {
      // Create new product if needed
      let prodId = "new-" + Date.now();
      if (onCreateProduct) {
        try {
          await onCreateProduct({
            name: dockItemData.name,
            barcode: dockItemData.barcode,
            category: dockItemData.category,
            costPrice: Number(dockItemData.costPrice),
            sellingPrice: Number(dockItemData.sellingPrice),
            currentStock: 0, // will be restocked by PO
            minStock: Number(dockItemData.minStock),
            maxStock: Number(dockItemData.minStock) * 5,
            image: dockItemData.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
            supplierId
          });
        } catch (e) {
          console.warn("Catalog registration:", e);
        }
      }

      setPoItems(prev => [
        ...prev,
        {
          productId: prodId,
          productName: dockItemData.name,
          quantity: Number(dockItemData.quantity),
          costPrice: Number(dockItemData.costPrice),
          batchNumber: dockItemData.batchNumber,
          expiryDate: dockItemData.expiryDate,
          image: dockItemData.image,
          barcode: dockItemData.barcode,
          sellingPrice: Number(dockItemData.sellingPrice),
          minStock: Number(dockItemData.minStock),
          isNewProduct: true
        }
      ]);
    }

    setDockItemModalOpen(false);
  };

  const subtotal = poItems.reduce((sum, it) => sum + it.quantity * it.costPrice, 0);
  const tax = Number((subtotal * 0.05).toFixed(2));
  const grandTotal = Number((subtotal + tax).toFixed(2));

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert("Please add at least one product to the purchase order.");
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedSupplier = suppliers.find(s => s.id === supplierId);
      const itemsPayload = poItems.map(it => {
        const prod = products.find(p => p.id === it.productId);
        return {
          productId: it.productId,
          productName: it.productName || (prod ? prod.name : "Inbound Item"),
          sku: prod?.sku || `SKU-${Date.now().toString().slice(-4)}`,
          quantity: Number(it.quantity),
          costPrice: Number(it.costPrice),
          taxRate: 5,
          discountPercent: 0,
          lineTotal: Number((it.quantity * it.costPrice).toFixed(2)),
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          image: it.image
        };
      });

      await onCreatePurchase({
        supplierId,
        supplierName: selectedSupplier ? selectedSupplier.name : "Direct Supplier",
        items: itemsPayload,
        subtotal: Number(subtotal.toFixed(2)),
        taxTotal: tax,
        grandTotal,
        totalAmount: grandTotal,
        status: poStatus,
        notes: poNotes,
        receivedBy: currentUser.name,
        userId: currentUser.id,
        userName: currentUser.name
      });

      setShowNewPOModal(false);
      alert(`Inbound Purchase Order successfully recorded. Status: ${poStatus.toUpperCase()}`);
    } catch (err: any) {
      alert(err.message || "Failed to create purchase order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark PO as received action
  const handleReceivePO = async (po: Purchase) => {
    if (!onReceivePurchase) return;
    if (po.status === "received") {
      alert("This Purchase Order has already been received and restocked.");
      return;
    }

    const confirmReceive = window.confirm(
      `Confirm inbound receipt of PO #${po.poNumber}?\n\nThis will immediately increase catalog inventory and record stock movements.`
    );
    if (!confirmReceive) return;

    setIsReceivingAction(true);
    try {
      await onReceivePurchase(po.id);
      setSelectedPO(prev => (prev ? { ...prev, status: "received" } : null));
      alert(`PO #${po.poNumber} has been marked as RECEIVED and inventory has been restocked.`);
    } catch (err: any) {
      alert(err.message || "Failed to receive purchase order.");
    } finally {
      setIsReceivingAction(false);
    }
  };

  // Delete PO action
  const handleDeletePO = async (po: Purchase) => {
    if (!onDeletePurchase) return;
    const confirmDel = window.confirm(
      `Are you sure you want to delete PO #${po.poNumber}? This action cannot be undone.`
    );
    if (!confirmDel) return;

    try {
      await onDeletePurchase(po.id);
      setSelectedPO(null);
      alert(`PO #${po.poNumber} deleted successfully.`);
    } catch (err: any) {
      alert(err.message || "Failed to delete purchase order.");
    }
  };

  const openPOEdit = (po: Purchase) => {
    setPoEditNotes(po.notes || "");
    setPoEditSupplierId(po.supplierId);
    setIsEditingPO(true);
  };

  const handleUpdatePO = async () => {
    if (!selectedPO || !onUpdatePurchase) return;
    const supplier = suppliers.find(item => item.id === poEditSupplierId);
    try {
      await onUpdatePurchase(selectedPO.id, { supplierId: poEditSupplierId, supplierName: supplier?.name || selectedPO.supplierName, notes: poEditNotes });
      setSelectedPO({ ...selectedPO, supplierId: poEditSupplierId, supplierName: supplier?.name || selectedPO.supplierName, notes: poEditNotes });
      setIsEditingPO(false);
      alert("Purchase order details updated.");
    } catch (err: any) { alert(err.message || "Failed to update purchase order."); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-neutral-800" />
            <span>Inbound POS & Stock Purchases</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Log supplier shipments, snap live dock pictures, capture batch expiry dates, and restock inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPOModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Inbound PO</span>
          </button>
        </div>
      </div>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
            Total Inbound Capital
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-neutral-900 block mt-1">
            ${metrics.totalSpend.toFixed(2)}
          </span>
          <span className="text-[10px] text-neutral-500">Cumulative procurement cost</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Received & Restocked
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 block mt-1">
            {metrics.receivedCount} POs
          </span>
          <span className="text-[10px] text-neutral-500">Catalog inventory credited</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
            Pending Deliveries
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-700 block mt-1">
            {metrics.pendingCount} POs
          </span>
          <span className="text-[10px] text-neutral-500">Awaiting dock receipt</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
            Units Inbounded
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-blue-700 block mt-1">
            {metrics.totalUnits} Units
          </span>
          <span className="text-[10px] text-neutral-500">Total physical item intake</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by PO# or Supplier Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(["all", "received", "ordered"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize shrink-0 ${
                statusFilter === tab
                  ? "bg-neutral-900 text-white shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab === "all" ? "All Orders" : tab === "received" ? "Received / Restocked" : "Ordered (Pending)"}
            </button>
          ))}
        </div>
      </div>

      {/* Inbound Purchases Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <th className="py-3.5 px-4">PO Number</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-3">Supplier</th>
                <th className="py-3.5 px-3 text-center">Items / Units</th>
                <th className="py-3.5 px-3 text-right">Inbound Total</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="font-semibold text-xs">No purchase orders found matching your criteria</p>
                    <button
                      onClick={() => setShowNewPOModal(true)}
                      className="mt-3 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold"
                    >
                      Create First Inbound PO
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(po => {
                  const total = po.grandTotal || po.totalAmount || 0;
                  const totalItems = po.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;

                  return (
                    <tr
                      key={po.id}
                      onClick={() => { setIsEditingPO(false); setSelectedPO(po); }}
                      className="hover:bg-neutral-50/80 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900" />
                        <span>{po.poNumber}</span>
                      </td>

                      <td className="py-3.5 px-3 text-neutral-500 font-mono">
                        {po.date ? new Date(po.date).toLocaleDateString() : "N/A"}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-neutral-800">
                        {po.supplierName}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono text-neutral-700">
                        <span className="font-bold">{totalItems}</span> units ({po.items?.length || 0} items)
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-black text-neutral-900">
                        ${total.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                            po.status === "received"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {po.status === "received" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{po.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-bold text-neutral-700 group-hover:text-neutral-900 group-hover:underline inline-flex items-center gap-1">
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VIEW PO DETAILS / GOODS RECEIVED NOTE (GRN) */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-400">PO Voucher</span>
                  <span className="font-black text-base">{selectedPO.poNumber}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      selectedPO.status === "received"
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {selectedPO.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Supplier: {selectedPO.supplierName} • Created {new Date(selectedPO.date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Status Alert if Pending */}
              {selectedPO.status !== "received" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Clock className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold">Shipment In Transit / Pending Dock Arrival</span>
                      <p className="text-[11px] text-amber-700">
                        Products will be added to active inventory once you confirm dock receipt.
                      </p>
                    </div>
                  </div>
                  {onReceivePurchase && (
                    <button
                      onClick={() => handleReceivePO(selectedPO)}
                      disabled={isReceivingAction}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-xs shrink-0"
                    >
                      {isReceivingAction ? "Restocking..." : "Mark as Received"}
                    </button>
                  )}
                </div>
              )}

              {isEditingPO && selectedPO.status !== "received" && (
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 space-y-2">
                  <div className="font-bold text-blue-900">Update PO Details</div>
                  <select value={poEditSupplierId} onChange={e => setPoEditSupplierId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-blue-200 text-xs bg-white">
                    {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                  <textarea value={poEditNotes} onChange={e => setPoEditNotes(e.target.value)} placeholder="PO notes" className="w-full px-3 py-2 rounded-lg border border-blue-200 text-xs min-h-16" />
                  <div className="flex justify-end gap-2"><button onClick={() => setIsEditingPO(false)} className="px-3 py-1.5 text-xs font-bold text-neutral-600">Cancel</button><button onClick={handleUpdatePO} className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-bold">Save Changes</button></div>
                </div>
              )}

              {/* Items List */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                      <th className="py-2.5 px-3">Item Details</th>
                      <th className="py-2.5 px-3">Batch & Expiry</th>
                      <th className="py-2.5 px-3 text-right">Cost</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selectedPO.items?.map((it, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/60">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {it.image && (
                              <img
                                src={it.image}
                                alt={it.productName}
                                className="w-8 h-8 rounded-md object-cover bg-neutral-100 shrink-0"
                              />
                            )}
                            <div>
                              <span className="font-bold text-neutral-900 block">{it.productName}</span>
                              <span className="text-[10px] font-mono text-neutral-400">
                                {it.sku || "INB-ITEM"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-mono text-neutral-800 block">
                            {it.batchNumber || "B-DEFAULT"}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            Exp: {it.expiryDate || "Non-perishable"}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                          ${Number(it.costPrice).toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-900">
                          {it.quantity}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                          ${(Number(it.quantity) * Number(it.costPrice)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    ${(selectedPO.subtotal || selectedPO.grandTotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Inbound Freight & Tax:</span>
                  <span className="font-mono">${(selectedPO.taxTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-base text-emerald-700">
                    ${(selectedPO.grandTotal || selectedPO.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedPO.notes && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-600">
                  <span className="font-bold text-neutral-800 block text-[11px]">Notes:</span>
                  <p className="text-[11px] mt-0.5">{selectedPO.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
              <div>
                {onDeletePurchase && selectedPO.status !== "received" && (
                  <button
                    onClick={() => handleDeletePO(selectedPO)}
                    className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete PO</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedPO.status !== "received" && onUpdatePurchase && <button onClick={() => openPOEdit(selectedPO)} className="px-3 py-1.5 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" />Edit PO</button>}
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4 text-neutral-500" />
                  <span>Print Slip</span>
                </button>

                <button
                  onClick={() => setSelectedPO(null)}
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW INBOUND PURCHASE ORDER */}
      {showNewPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  <span>Create Inbound Stock Purchase Order</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Receive supplier inventory, snap live dock pictures, and define batch expiration
                </p>
              </div>
              <button
                onClick={() => setShowNewPOModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePOSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Top Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Select Supplier *
                  </label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Inbound Order Status
                  </label>
                  <select
                    value={poStatus}
                    onChange={e => setPoStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium"
                  >
                    <option value="received">Received (Immediately Restock Catalog)</option>
                    <option value="ordered">Ordered (Pending Inbound Arrival)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Receiving Clerk
                  </label>
                  <input
                    type="text"
                    value={currentUser.name}
                    disabled
                    className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-600"
                  />
                </div>
              </div>

              {/* Items Section Header */}
              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Inbound Line Items ({poItems.length})
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Add catalog items or snap live photos for new dock intake items
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDockIntake()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>+ New Item (Snap Photo)</span>
                  </button>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Catalog Item</span>
                  </button>
                </div>
              </div>

              {/* Items Table / Cards */}
              <div className="space-y-3">
                {poItems.map((item, idx) => {
                  const lineTotal = item.quantity * item.costPrice;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        {/* Item selector & Image */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-[200px] w-full">
                          <div
                            onClick={() => handleOpenDockIntake(idx)}
                            className="relative group w-12 h-12 rounded-lg border border-neutral-300 bg-white overflow-hidden cursor-pointer shrink-0 shadow-2xs"
                            title="Click to snap or replace picture"
                          >
                            <img
                              src={
                                item.image ||
                                "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80"
                              }
                              alt="Item"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Camera className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>

                          <div className="flex-1">
                            {item.isNewProduct ? (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                                  Dock Intake (New Item)
                                </span>
                                <div className="font-bold text-xs text-neutral-900">
                                  {item.productName}
                                </div>
                              </div>
                            ) : (
                              <select
                                value={item.productId}
                                onChange={e => updateItemRow(idx, "productId", e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-900"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (${p.costPrice.toFixed(2)})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Snap picture shortcut button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDockIntake(idx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-300 rounded-lg text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 transition shrink-0"
                        >
                          <Camera className="w-3 h-3 text-neutral-600" />
                          <span>{item.image ? "Change Photo" : "Attach Photo"}</span>
                        </button>

                        {/* Delete Row */}
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-neutral-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Inputs Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                            Quantity (Units)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItemRow(idx, "quantity", Number(e.target.value))}
                            className="w-full px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                            Cost Price ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.costPrice}
                            onChange={e => updateItemRow(idx, "costPrice", Number(e.target.value))}
                            className="w-full px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                            Batch Number
                          </label>
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={e => updateItemRow(idx, "batchNumber", e.target.value)}
                            className="w-full px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={e => updateItemRow(idx, "expiryDate", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-neutral-300 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-semibold text-neutral-600">
                        Line Total: <span className="font-mono font-black text-neutral-900">${lineTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Inbound Delivery Notes / Tracking #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivery via DHL Express Hub #4, pallets inspected and verified"
                  value={poNotes}
                  onChange={e => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>

              {/* Total Calculation */}
              <div className="bg-neutral-100 p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-neutral-600">
                  <span>Subtotal: </span>
                  <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
                  <span className="mx-2">•</span>
                  <span>Est. Freight & Tax (5%): </span>
                  <span className="font-mono font-bold">${tax.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Grand Total:
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-700">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPOModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isSubmitting ? "Recording..." : "Save Inbound PO"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCK INTAKE MODAL: CAPTURE PHOTO / ADD DOCK PRODUCT */}
      {dockItemModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingItemIndex !== null ? "Update Inbound Item Photo" : "Inbound Intake: Snap Picture"}
                </h3>
              </div>
              <button
                onClick={() => setDockItemModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Camera / Device Upload Component */}
              <ImageCaptureUpload
                value={dockItemData.image}
                onChange={imgUrl => setDockItemData(prev => ({ ...prev, image: imgUrl }))}
                label="Product / Item Live Picture"
              />

              <div className="space-y-3 pt-2 border-t border-neutral-200">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Product / Item Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Organic Almond Milk 1L"
                    value={dockItemData.name}
                    onChange={e => setDockItemData({ ...dockItemData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                      Barcode
                    </label>
                    <input
                      type="text"
                      value={dockItemData.barcode}
                      onChange={e => setDockItemData({ ...dockItemData, barcode: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                      Category
                    </label>
                    <select
                      value={dockItemData.category}
                      onChange={e => setDockItemData({ ...dockItemData, category: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                    >
                      <option value="Beverages">Beverages</option>
                      <option value="Bakery & Snacks">Bakery & Snacks</option>
                      <option value="Dairy & Eggs">Dairy & Eggs</option>
                      <option value="Fresh Produce">Fresh Produce</option>
                      <option value="Household">Household</option>
                      <option value="Personal Care">Personal Care</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                      Cost Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={dockItemData.costPrice}
                      onChange={e =>
                        setDockItemData({ ...dockItemData, costPrice: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                      Selling Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={dockItemData.sellingPrice}
                      onChange={e =>
                        setDockItemData({ ...dockItemData, sellingPrice: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                      Inbound Qty
                    </label>
                    <input
                      type="number"
                      value={dockItemData.quantity}
                      onChange={e =>
                        setDockItemData({ ...dockItemData, quantity: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                      Batch Code
                    </label>
                    <input
                      type="text"
                      value={dockItemData.batchNumber}
                      onChange={e =>
                        setDockItemData({ ...dockItemData, batchNumber: e.target.value })
                      }
                      className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={dockItemData.expiryDate}
                      onChange={e =>
                        setDockItemData({ ...dockItemData, expiryDate: e.target.value })
                      }
                      className="w-full px-1.5 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono text-[10px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDockItemModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDockItem}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save to Inbound PO</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
