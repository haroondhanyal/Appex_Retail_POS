import { useState } from "react";
import { ShieldAlert, Search, Filter, Clock, UserCheck } from "lucide-react";
import { AuditLog } from "../types";

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export function AuditLogsView({ logs }: AuditLogsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = logs.filter(log => {
    const matchSearch =
      !searchQuery ||
      (log.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((log.entityId || log.referenceId || log.entity || "").toLowerCase().includes(searchQuery.toLowerCase()));

    const matchAction = actionFilter === "all" || log.action === actionFilter;

    return matchSearch && matchAction;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Security & Audit Trail Logs
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Immutable trace of user checkouts, price edits, refunds, stock adjustments, and administrative events.
          </p>
        </div>

        <div className="text-xs font-mono font-bold text-neutral-700 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl">
          Logged Events: {logs.length}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search audit trail by user, event, or keyword..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700"
        >
          <option value="all">All Action Types</option>
          <option value="CHECKOUT">CHECKOUT</option>
          <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
          <option value="REFUND">REFUND</option>
          <option value="PRICE_UPDATE">PRICE_UPDATE</option>
          <option value="PRODUCT_CREATED">PRODUCT_CREATED</option>
          <option value="PURCHASE_ORDER">PURCHASE_ORDER</option>
          <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">User / Role</th>
                <th className="py-3 px-3">Action Event</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-4 text-neutral-500 font-mono">
                    {new Date(log.timestamp).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "medium"
                    })}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-neutral-900">{log.userName}</div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">{log.userRole || log.role}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-neutral-600 font-medium">
                    {log.entityType || log.entity} {(log.entityId || log.referenceId) ? `(#${log.entityId || log.referenceId})` : ""}
                  </td>
                  <td className="py-3 px-4 text-neutral-800">{log.details || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
