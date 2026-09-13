import { useState, useMemo } from "react";
import type React from "react";
import {
  Search,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Download,
  Share2,
  X
} from "lucide-react";
import { Sale, SystemSettings, User } from "../types";
import { formatThermalReceiptText, downloadReceiptAsFile, shareReceipt } from "../services/receiptService";

interface SalesHistoryViewProps {
  sales: Sale[];
  settings: SystemSettings;
  currentUser: User;
  onRefundSale: (saleId: string, payload: any) => Promise<void>;
}

export function SalesHistoryView({
  sales,
  settings,
  currentUser,
  onRefundSale
}: SalesHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Modals
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Refund form state
  const [refundReason, setRefundReason] = useState("Customer return");
  const [restockInventory, setRestockInventory] = useState(true);
  const [refundItems, setRefundItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchSearch =
        !searchQuery ||
        s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.cashierName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchPayment = paymentFilter === "all" || s.paymentMethod === paymentFilter;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [sales, searchQuery, statusFilter, paymentFilter]);

  const openRefundDialog = (sale: Sale) => {
    setSelectedSale(sale);
    // Default: refund all items
    setRefundItems(sale.items.map(it => ({ productId: it.productId, quantity: it.quantity })));
    setShowRefundModal(true);
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setIsProcessingRefund(true);
    try {
      await onRefundSale(selectedSale.id, {
        reason: refundReason,
        restockInventory,
        items: refundItems,
        refundedByUserId: currentUser.id,
        refundedByUserName: currentUser.name
      });
      setShowRefundModal(false);
      alert("Refund processed successfully and receipt updated.");
    } catch (err: any) {
      alert(err.message || "Failed to process refund");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Sales Ledger & Refund Processing
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit customer invoices, reprint thermal receipts, and issue inventory returns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-mono font-bold text-neutral-800">
            Total Sales: {sales.length}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by invoice #, customer name or cashier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-hidden"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially Refunded</option>
        </select>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value)}
          className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-hidden"
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="digital_wallet">Digital Wallet</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="split">Split Payment</option>
        </select>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredSales.map(sale => {
                const isRefunded = sale.status === "refunded";
                const isPartial = sale.status === "partially_refunded";

                return (
                  <tr key={sale.id} className="hover:bg-neutral-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {sale.invoiceNumber}
                      {sale.offlineSynced === false && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-sans">
                          Offline
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-neutral-500 font-mono">
                      {new Date(sale.timestamp).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short"
                      })}
                    </td>

                    <td className="py-3 px-3 font-medium text-neutral-800">{sale.cashierName}</td>

                    <td className="py-3 px-3 text-neutral-600">{sale.customerName || "Walk-in Customer"}</td>

                    <td className="py-3 px-3">
                      <span className="capitalize font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                        {sale.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                      ${sale.grandTotal.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          isRefunded
                            ? "bg-red-100 text-red-700"
                            : isPartial
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {sale.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowReceiptModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          title="View & Reprint Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {!isRefunded && (
                          <button
                            onClick={() => openRefundDialog(sale)}
                            className="p-1.5 rounded-lg border border-neutral-200 text-amber-700 hover:bg-amber-50"
                            title="Process Refund / Return"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT PREVIEW MODAL */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-neutral-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Receipt: #{selectedSale.invoiceNumber}</h4>
              <button onClick={() => setShowReceiptModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-neutral-100 flex justify-center">
              <div
                id="printable-receipt"
                className="bg-white p-5 rounded-lg shadow-xs border border-neutral-200 w-full max-w-xs font-mono-receipt text-xs text-neutral-900 select-text"
              >
                <pre className="whitespace-pre-wrap leading-tight">
                  {formatThermalReceiptText(selectedSale, settings)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-neutral-200 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => downloadReceiptAsFile(selectedSale, settings)}
                className="p-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold"
                title="Download Receipt TXT"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => shareReceipt(selectedSale, settings)}
                className="p-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold"
                title="Share Receipt"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND & RETURN MODAL */}
      {showRefundModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Issue Refund / Return</h3>
                <p className="text-xs text-neutral-400">Invoice: {selectedSale.invoiceNumber}</p>
              </div>
              <button onClick={() => setShowRefundModal(false)}>
                <X className="w-5 h-5 text-neutral-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleExecuteRefund} className="p-6 space-y-4">
              {/* Item selection table */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-2">
                  Items to Return & Quantity
                </label>
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-2 text-center">Purchased</th>
                        <th className="py-2 px-3 text-right">Return Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {selectedSale.items.map(it => {
                        const current = refundItems.find(r => r.productId === it.productId);
                        return (
                          <tr key={it.productId}>
                            <td className="py-2 px-3 font-semibold text-neutral-900">{it.productName}</td>
                            <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={it.quantity}
                                value={current ? current.quantity : 0}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setRefundItems(prev => {
                                    const filtered = prev.filter(p => p.productId !== it.productId);
                                    if (val > 0) filtered.push({ productId: it.productId, quantity: val });
                                    return filtered;
                                  });
                                }}
                                className="w-16 px-2 py-1 border border-neutral-300 rounded-lg text-right font-mono text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Restock Checkbox */}
              <div className="flex items-center gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <input
                  type="checkbox"
                  id="restock-cb"
                  checked={restockInventory}
                  onChange={e => setRestockInventory(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="restock-cb" className="text-xs font-semibold text-neutral-800 cursor-pointer">
                  Return items back into inventory stock
                </label>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Reason for Refund</label>
                <select
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium"
                >
                  <option value="Customer remorse / return">Customer remorse / return</option>
                  <option value="Defective or damaged item">Defective or damaged item</option>
                  <option value="Expired item returned">Expired item returned</option>
                  <option value="Incorrect item billed">Incorrect item billed</option>
                  <option value="Other / Management override">Other / Management override</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund || refundItems.length === 0}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {isProcessingRefund ? "Processing..." : "Confirm & Issue Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
