import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  Clock,
  Users,
  CreditCard,
  Banknote,
  ArrowUpRight,
  Sparkles,
  PlusCircle,
  Scan,
  RefreshCw
} from "lucide-react";
import { DashboardStats, SystemSettings, Product, Sale } from "../types";

interface DashboardViewProps {
  stats: DashboardStats | null;
  settings: SystemSettings;
  products: Product[];
  recentSales: Sale[];
  onNavigate: (view: string) => void;
  onOpenScanner: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function DashboardView({
  stats,
  settings,
  products,
  recentSales,
  onNavigate,
  onOpenScanner,
  onRefresh,
  isLoading
}: DashboardViewProps) {
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month">("today");

  // Fallback defaults
  const todaySales = stats?.todaySales || 0;
  const todayProfit = stats?.todayProfit || 0;
  const transactionsCount = stats?.transactionsCount || 0;
  const lowStockCount = stats?.lowStockCount || 0;
  const outOfStockCount = stats?.outOfStockCount || 0;
  const expiringCount = stats?.expiringCount || 0;
  const expiredCount = stats?.expiredCount || 0;
  const totalStockValue = stats?.totalStockValue || 0;

  const topProductsList = (stats?.topProducts || stats?.topSellingProducts || []) as any[];

  const getPaymentTotal = (methodName: string) => {
    if (Array.isArray(stats?.salesByPaymentMethod)) {
      return stats.salesByPaymentMethod.find(m => m.method === methodName)?.total || 0;
    }
    return (stats?.salesByPaymentMethod as any)?.[methodName] || 0;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Store Command Center & Analytics
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time retail performance, inventory valuation, and expiry risk monitoring.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate("pos")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-neutral-800 transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Launch POS</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-neutral-300 text-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-100 transition"
          >
            <Scan className="w-4 h-4 text-blue-600" />
            <span>Scan Item</span>
          </button>

          <button
            onClick={() => onNavigate("ai")}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-neutral-900 to-neutral-800 text-amber-300 rounded-xl text-xs font-bold shadow-xs hover:opacity-95 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Copilot</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 bg-white border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-100 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <button onClick={() => onNavigate("sales")} className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs text-left hover:border-emerald-300 hover:shadow-sm transition" title="Open sales and receipts">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Today's Net Sales
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono mt-2">
            ${todaySales.toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
            <span>{transactionsCount} checkouts today</span>
            <span className="text-emerald-600 font-bold flex items-center text-[11px]">
              <ArrowUpRight className="w-3 h-3" /> Live
            </span>
          </div>
        </button>

        {/* Estimated Profit */}
        <button onClick={() => onNavigate("reports")} className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs text-left hover:border-blue-300 hover:shadow-sm transition" title="Open analytics and profit reports">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Gross Profit Margin
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono mt-2">
            ${todayProfit.toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
            <span>Margin: {todaySales > 0 ? ((todayProfit / todaySales) * 100).toFixed(1) : "0.0"}%</span>
            <span className="text-blue-600 font-semibold text-[11px]">COGS tracked</span>
          </div>
        </button>

        {/* Inventory Stock Value */}
        <button onClick={() => onNavigate("inventory")} className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs text-left hover:border-neutral-400 hover:shadow-sm transition" title="Open inventory catalog">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Inventory Asset Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono mt-2">
            ${totalStockValue.toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
            <span>{products.length} catalog items</span>
            <span className="text-neutral-700 font-semibold text-[11px]">At Cost Price</span>
          </div>
        </button>

        {/* Expiry & Stock Risk Card */}
        <button onClick={() => onNavigate("inventory")} className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs text-left hover:border-amber-300 hover:shadow-sm transition" title="Inspect stock and expiry alerts">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Stock & Expiry Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
              {expiringCount + expiredCount}
            </span>
            <span className="text-xs text-neutral-400 font-medium">perishable risks</span>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
            <span className="text-red-600 font-bold">{lowStockCount + outOfStockCount} low/zero stock</span>
            <span className="text-neutral-900 font-bold text-[11px]">Inspect →</span>
          </div>
        </button>
      </div>

      {/* Row 2: Top Selling Products & Cashier Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Products */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Top Revenue Generators</h3>
                <p className="text-xs text-neutral-500">Highest grossing items across checkouts</p>
              </div>
              <button
                onClick={() => onNavigate("products")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View Catalog
              </button>
            </div>

            <div className="space-y-3">
              {topProductsList.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-neutral-900">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-neutral-500">{item.qty || item.quantity || 0} units</span>
                    <span className="font-bold text-neutral-900">${(item.revenue || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Breakdown Pill Bar */}
          <div className="mt-6 pt-4 border-t border-neutral-100">
            <span className="text-xs font-bold text-neutral-700 block mb-2">Payment Tenders Today</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Cash</span>
                <span className="text-sm font-mono font-bold text-neutral-900">
                  ${getPaymentTotal("cash").toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Card</span>
                <span className="text-sm font-mono font-bold text-neutral-900">
                  ${getPaymentTotal("card").toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Wallet / Transfer</span>
                <span className="text-sm font-mono font-bold text-neutral-900">
                  ${(getPaymentTotal("digital_wallet") + getPaymentTotal("bank_transfer")).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cashier Team Performance */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Cashier Performance</h3>
              <p className="text-xs text-neutral-500">Sales volume per active staff</p>
            </div>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3">
            {(stats?.salesByCashier || []).map((cashier: any, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900">{cashier.name}</div>
                  <div className="text-[11px] text-neutral-500">{cashier.count} completed orders</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black font-mono text-neutral-900">${(cashier.sales ?? cashier.total ?? 0).toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Active Terminal</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Transactions Stream */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Recent Checkout Invoices</h3>
            <p className="text-xs text-neutral-500">Real-time point of sale transactions ledger</p>
          </div>
          <button
            onClick={() => onNavigate("sales")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            All Sales Records →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                <th className="pb-2">Invoice #</th>
                <th className="pb-2">Time</th>
                <th className="pb-2">Cashier</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Items</th>
                <th className="pb-2">Method</th>
                <th className="pb-2 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentSales.slice(0, 6).map(sale => (
                <tr key={sale.id} className="hover:bg-neutral-50 transition">
                  <td className="py-2.5 font-mono font-bold text-neutral-900">{sale.invoiceNumber}</td>
                  <td className="py-2.5 text-neutral-500">
                    {new Date(sale.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2.5 font-medium text-neutral-800">{sale.cashierName}</td>
                  <td className="py-2.5 text-neutral-600">{sale.customerName || "Walk-in"}</td>
                  <td className="py-2.5 font-mono text-neutral-600">
                    {sale.items.reduce((a, b) => a + b.quantity, 0)} pcs
                  </td>
                  <td className="py-2.5">
                    <span className="capitalize px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium text-[11px]">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-neutral-900">
                    ${sale.grandTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
