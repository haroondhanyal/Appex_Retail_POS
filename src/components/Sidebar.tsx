import {
  ShoppingBag,
  LayoutDashboard,
  Package,
  AlertTriangle,
  Receipt,
  Truck,
  Users,
  BarChart3,
  Sparkles,
  ShieldAlert,
  Settings,
  Scan,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { UserRole } from "../types";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userRole: UserRole;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenScanner: () => void;
}

export function Sidebar({
  activeView,
  onNavigate,
  userRole,
  isCollapsed,
  onToggleCollapse,
  onOpenScanner
}: SidebarProps) {
  const navItems = [
    { id: "pos", label: "POS Checkout", icon: ShoppingBag, roles: ["admin", "manager", "cashier"] },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
    { id: "products", label: "Products & Barcodes", icon: Package, roles: ["admin", "manager"] },
    { id: "inventory", label: "Expiry & Stock Valuation", icon: AlertTriangle, roles: ["admin", "manager"] },
    { id: "sales", label: "Sales & Receipts", icon: Receipt, roles: ["admin", "manager", "cashier"] },
    { id: "purchases", label: "Inbound POs", icon: Truck, roles: ["admin", "manager"] },
    { id: "directory", label: "Directory", icon: Users, roles: ["admin", "manager"] },
    { id: "reports", label: "Analytics & P&L", icon: BarChart3, roles: ["admin", "manager"] },
    { id: "ai", label: "AI Retail Copilot", icon: Sparkles, roles: ["admin", "manager", "cashier"], highlight: true },
    { id: "audit", label: "Security & Audit", icon: ShieldAlert, roles: ["admin"] },
    { id: "settings", label: "Store Settings", icon: Settings, roles: ["admin", "manager"] }
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside
      className={`bg-white border-r border-neutral-200 flex flex-col transition-all duration-200 select-none z-20 shrink-0 ${
        isCollapsed ? "w-16" : "w-56 lg:w-60"
      }`}
    >
      {/* Fast Scan Action Button */}
      <div className="p-3 border-b border-neutral-100">
        <button
          onClick={onOpenScanner}
          className={`w-full py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-neutral-800 transition ${
            isCollapsed ? "px-0" : "px-3"
          }`}
          title="Open Native Barcode Scanner"
        >
          <Scan className="w-4 h-4 text-emerald-400 shrink-0" />
          {!isCollapsed && <span>Quick Barcode Scan</span>}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? "bg-neutral-900 text-white shadow-xs"
                  : item.highlight
                  ? "text-amber-700 bg-amber-50/70 hover:bg-amber-100/70"
                  : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? "text-white"
                    : item.highlight
                    ? "text-amber-600"
                    : "text-neutral-500"
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer Collapse Toggle */}
      <div className="p-2 border-t border-neutral-100 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[11px] font-medium text-neutral-400 pl-2">
            Role: <span className="uppercase font-bold text-neutral-700">{userRole}</span>
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition ml-auto"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
