import { useState, useMemo } from "react";
import type React from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  AlertTriangle,
  Clock,
  Scan,
  CheckCircle2,
  X,
  Package,
  Layers,
  Sliders,
  Camera
} from "lucide-react";
import { Product, Supplier, SystemSettings } from "../types";
import { ImageCaptureUpload } from "./ImageCaptureUpload";

interface ProductManagementProps {
  products: Product[];
  suppliers: Supplier[];
  settings: SystemSettings;
  onCreateProduct: (data: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onOpenScanner: () => void;
}

export function ProductManagement({
  products,
  suppliers,
  settings,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onOpenScanner
}: ProductManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "low_stock" | "out_of_stock" | "expiring" | "expired">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Barcode Generator Modal
  const [viewingBarcodeProduct, setViewingBarcodeProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    sku: "",
    barcode: "",
    category: "Beverages",
    brand: "",
    costPrice: 0,
    sellingPrice: 0,
    taxRate: settings.defaultTaxRate,
    discount: 0,
    currentStock: 0,
    minStock: 5,
    maxStock: 100,
    unit: "pcs",
    batchNumber: "",
    mfgDate: "",
    expiryDate: "",
    image: "",
    description: "",
    supplierId: suppliers[0]?.id || ""
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => p.category && s.add(p.category));
    return ["All", ...Array.from(s)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());

      let matchStatus = true;
      if (statusFilter === "low_stock") matchStatus = p.currentStock <= p.minStock && p.currentStock > 0;
      if (statusFilter === "out_of_stock") matchStatus = p.currentStock <= 0;
      if (statusFilter === "expiring") matchStatus = p.expiryStatus === "expiring_soon";
      if (statusFilter === "expired") matchStatus = p.expiryStatus === "expired";

      return matchCat && matchSearch && matchStatus;
    });
  }, [products, selectedCategory, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "SKU-" + Math.floor(1000 + Math.random() * 9000),
      barcode: "890" + Math.floor(100000000 + Math.random() * 900000000),
      category: "Beverages",
      brand: "House Brand",
      costPrice: 1.5,
      sellingPrice: 3.0,
      taxRate: settings.defaultTaxRate,
      discount: 0,
      currentStock: 25,
      minStock: 5,
      maxStock: 100,
      unit: "pcs",
      batchNumber: "B-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 900),
      mfgDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80",
      description: "",
      supplierId: suppliers[0]?.id || ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleGenerateBarcode = () => {
    const generated = "890" + Math.floor(1000000000 + Math.random() * 9000000000);
    setFormData(prev => ({ ...prev, barcode: generated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.barcode) {
      alert("Product name and barcode are required");
      return;
    }
    setIsSaving(true);
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, formData);
      } else {
        await onCreateProduct(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (window.confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) {
      try {
        await onDeleteProduct(p.id);
      } catch (err: any) {
        alert(err.message || "Failed to delete product");
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-neutral-50">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Product Inventory & Barcodes
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage catalog items, pricing tiers, barcodes, and supplier associations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-100 transition"
          >
            <Scan className="w-4 h-4 text-emerald-600" />
            <span>Scan to Find</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, SKU or barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-hidden"
        >
          {categories.map(c => (
            <option key={c} value={c}>
              Category: {c}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-2.5 py-1 rounded-md transition ${statusFilter === "all" ? "bg-white text-neutral-900 font-bold shadow-2xs" : "text-neutral-600"}`}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter("low_stock")}
            className={`px-2.5 py-1 rounded-md transition ${statusFilter === "low_stock" ? "bg-white text-amber-700 font-bold shadow-2xs" : "text-neutral-600"}`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setStatusFilter("expiring")}
            className={`px-2.5 py-1 rounded-md transition ${statusFilter === "expiring" ? "bg-white text-amber-700 font-bold shadow-2xs" : "text-neutral-600"}`}
          >
            Expiring Soon
          </button>
          <button
            onClick={() => setStatusFilter("expired")}
            className={`px-2.5 py-1 rounded-md transition ${statusFilter === "expired" ? "bg-white text-red-700 font-bold shadow-2xs" : "text-neutral-600"}`}
          >
            Expired
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <th className="py-3 px-4">Item / SKU</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Cost</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.map(p => {
                const isOutOfStock = p.currentStock <= 0;
                const isLowStock = p.currentStock <= p.minStock && !isOutOfStock;
                const isExpired = p.expiryStatus === "expired";
                const isExpiring = p.expiryStatus === "expiring_soon";

                return (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-neutral-900 line-clamp-1">{p.name}</div>
                          <div className="text-[11px] font-mono text-neutral-400">SKU: {p.sku}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => setViewingBarcodeProduct(p)}
                        className="inline-flex items-center gap-1 font-mono text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded text-[11px] transition"
                        title="Click to view/print barcode label"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                        <span>{p.barcode}</span>
                      </button>
                    </td>

                    <td className="py-3 px-3 text-neutral-600 font-medium">{p.category}</td>

                    <td className="py-3 px-3 text-right font-mono text-neutral-500">${p.costPrice.toFixed(2)}</td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                      ${p.sellingPrice.toFixed(2)}
                      {p.discount > 0 && (
                        <span className="text-[10px] text-emerald-600 block">(-{p.discount}%)</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                            isOutOfStock
                              ? "bg-red-100 text-red-700"
                              : isLowStock
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                        <span
                          className={`text-[10px] font-mono mt-0.5 ${
                            isLowStock ? "text-amber-700 font-bold" : "text-neutral-400"
                          }`}
                          title={`Threshold: Alert when stock reaches ${p.minStock}`}
                        >
                          Min: {p.minStock} {isLowStock && "⚠️ Low"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {p.expiryDate ? (
                        <span
                          className={`text-[11px] font-medium block ${
                            isExpired
                              ? "text-red-600 font-bold"
                              : isExpiring
                              ? "text-amber-600 font-bold"
                              : "text-neutral-600"
                          }`}
                        >
                          {p.expiryDate}
                          {isExpired && " (Expired)"}
                          {isExpiring && " (Soon)"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">N/A</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-lg border border-neutral-200 text-red-600 hover:bg-red-50"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : "Create New Product"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Barcode with Auto-Generate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-700">Barcode / EAN *</label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Generate New
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                {/* Stock Level */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Low Stock Warning Threshold */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Low Stock Alert (Min)</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Batch Number */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Batch / Lot Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Expiry Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                  />
                </div>

                {/* Image Live Camera & Upload */}
                <div className="sm:col-span-2">
                  <ImageCaptureUpload
                    value={formData.image}
                    onChange={imgUrl => setFormData({ ...formData, image: imgUrl })}
                    label="Product Picture (Live Camera / Device Upload)"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE PREVIEW & LABEL PRINT MODAL */}
      {viewingBarcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-neutral-200 text-center">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-sm text-neutral-900 text-left">{viewingBarcodeProduct.name}</h4>
                <p className="text-[11px] text-neutral-500 text-left">Retail Shelf Label</p>
              </div>
              <button onClick={() => setViewingBarcodeProduct(null)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            {/* Visual Barcode Rendering */}
            <div className="p-4 bg-white border-2 border-dashed border-neutral-300 rounded-xl inline-block w-full">
              <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1">
                {settings.businessName}
              </div>
              <div className="text-xl font-black font-mono text-neutral-900 mb-2">
                ${viewingBarcodeProduct.sellingPrice.toFixed(2)}
              </div>

              {/* Barcode line pattern simulation */}
              <div className="h-14 flex items-center justify-center gap-0.5 bg-neutral-50 p-2 rounded">
                {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 1, 4, 2, 1, 2, 3, 1, 2, 1, 3, 2, 4, 1, 2, 3].map((w, i) => (
                  <span
                    key={i}
                    className="bg-neutral-900 h-full inline-block"
                    style={{ width: `${w * 1.5}px` }}
                  />
                ))}
              </div>
              <div className="text-xs font-mono font-bold text-neutral-800 tracking-widest mt-1.5">
                {viewingBarcodeProduct.barcode}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800"
              >
                Print Shelf Tag
              </button>
              <button
                onClick={() => setViewingBarcodeProduct(null)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
