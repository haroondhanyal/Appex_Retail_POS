import { useState } from "react";
import { DollarSign, TrendingUp, BarChart3, PieChart, Printer, Download, Calendar } from "lucide-react";
import { DashboardStats, SystemSettings, Product, Sale } from "../types";

interface ReportsViewProps {
  stats: DashboardStats | null;
  settings: SystemSettings;
  sales: Sale[];
  products: Product[];
}

export function ReportsView({ stats, settings, sales, products }: ReportsViewProps) {
  const [reportRange, setReportRange] = useState<"daily" | "weekly" | "monthly">("daily");

  const totalRevenue = stats?.todaySales || 0;
  const totalProfit = stats?.todayProfit || 0;
  const cogs = Math.max(0, totalRevenue - totalProfit);
  const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  // Category sales breakdown calculation
  const categorySales: { [cat: string]: { revenue: number; units: number } } = {};
  sales.forEach(s => {
    s.items.forEach(it => {
      const prod = products.find(p => p.id === it.productId);
      const cat = prod?.category || "General";
      if (!categorySales[cat]) categorySales[cat] = { revenue: 0, units: 0 };
      categorySales[cat].revenue += it.lineTotal;
      categorySales[cat].units += it.quantity;
    });
  });

  const categoryEntries = Object.entries(categorySales).sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Financial & Sales Analytics Reports
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Gross revenue, Cost of Goods Sold (COGS), margins, and payment tender reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setReportRange("daily")}
              className={`px-3 py-1 rounded-lg transition ${reportRange === "daily" ? "bg-neutral-900 text-white shadow-2xs" : "text-neutral-600"}`}
            >
              Daily
            </button>
            <button
              onClick={() => setReportRange("weekly")}
              className={`px-3 py-1 rounded-lg transition ${reportRange === "weekly" ? "bg-neutral-900 text-white shadow-2xs" : "text-neutral-600"}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setReportRange("monthly")}
              className={`px-3 py-1 rounded-lg transition ${reportRange === "monthly" ? "bg-neutral-900 text-white shadow-2xs" : "text-neutral-600"}`}
            >
              Monthly
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Financial Statement Bento Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-wider">
          Executive Profit & Loss Statement (P&L)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-500 block uppercase">Gross Net Sales</span>
            <span className="text-2xl font-black font-mono text-neutral-900 block mt-1">
              ${totalRevenue.toFixed(2)}
            </span>
            <span className="text-[10px] text-neutral-400">Total tender received</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-500 block uppercase">COGS (Wholesale)</span>
            <span className="text-2xl font-black font-mono text-neutral-700 block mt-1">
              ${cogs.toFixed(2)}
            </span>
            <span className="text-[10px] text-neutral-400">Cost of goods sold</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 block uppercase">Gross Profit</span>
            <span className="text-2xl font-black font-mono text-emerald-700 block mt-1">
              ${totalProfit.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-600">Net after product costs</span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-800 block uppercase">Profit Margin</span>
            <span className="text-2xl font-black font-mono text-blue-700 block mt-1">
              {marginPct}%
            </span>
            <span className="text-[10px] text-blue-600">Healthy retail margin</span>
          </div>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-wider">
          Revenue Distribution by Category
        </h3>

        <div className="space-y-3">
          {categoryEntries.length === 0 ? (
            <p className="text-xs text-neutral-400">No category transactions recorded yet.</p>
          ) : (
            categoryEntries.map(([cat, data], idx) => {
              const pct = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-900">
                      {cat} ({data.units} units sold)
                    </span>
                    <span className="font-mono text-neutral-900">
                      ${data.revenue.toFixed(2)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
