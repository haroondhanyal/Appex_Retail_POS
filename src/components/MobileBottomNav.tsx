import { ShoppingBag, Scan, Receipt, Package, Sparkles } from "lucide-react";
import { UserRole } from "../types";

interface MobileBottomNavProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenScanner: () => void;
  userRole: UserRole;
}

export function MobileBottomNav({
  activeView,
  onNavigate,
  onOpenScanner,
  userRole
}: MobileBottomNavProps) {
  const tabs = [
    { id: "pos", label: "POS", icon: ShoppingBag, roles: ["admin", "manager", "cashier", "salesperson"] },
    { id: "sales", label: "Sales", icon: Receipt, roles: ["admin", "manager", "cashier", "salesperson"] },
    { id: "scan", label: "Scan", icon: Scan, isAction: true, roles: ["admin", "manager", "cashier", "salesperson"] },
    { id: "products", label: "Products", icon: Package, roles: ["admin", "manager"] },
    { id: "inventory", label: "Stock", icon: Package, roles: ["warehouse_manager"] },
    { id: "ai", label: "AI Copilot", icon: Sparkles, roles: ["admin", "manager", "warehouse_manager", "cashier", "salesperson"] }
  ];

  return (
    <nav className="md:hidden bg-white border-t border-neutral-200 fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-1.5 px-2 select-none shadow-lg">
      {tabs.filter(tab => tab.roles.includes(userRole)).map(tab => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;

        if (tab.isAction) {
          return (
            <button
              key={tab.id}
              onClick={onOpenScanner}
              className="flex flex-col items-center justify-center -mt-4 p-2 rounded-full bg-neutral-900 text-white shadow-lg border-2 border-white active:scale-95 transition"
              title="Camera Scanner"
            >
              <Scan className="w-5 h-5 text-emerald-400" />
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center min-w-[50px] py-1 transition ${
              isActive ? "text-neutral-900 font-bold" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-neutral-900" : "text-neutral-400"}`} />
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
