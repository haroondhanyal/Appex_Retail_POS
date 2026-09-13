import { useState } from "react";
import type React from "react";
import {
  Store,
  Sliders,
  Shield,
  Volume2,
  Printer,
  Users,
  CheckCircle2,
  Plus,
  Edit,
  Save,
  Palette,
  Check,
  Trash2,
  Eye,
  Clock
} from "lucide-react";
import { SystemSettings, User, ThemeType, Role, ROLE_LABELS, StaffActivity } from "../types";
import { api } from "../services/api";

const STAFF_ROLE_OPTIONS: { role: Role; description: string; access: string }[] = [
  { role: "cashier", description: "Runs checkout, scans products, and manages receipts.", access: "POS, receipts, AI Copilot" },
  { role: "salesperson", description: "Helps customers and completes counter sales.", access: "POS, receipts, AI Copilot" },
  { role: "sales_agent", description: "Assists customers with product discovery and counter sales.", access: "POS, own receipts, AI Copilot" },
  { role: "manager", description: "Operates the store, catalogue, purchasing, and reports.", access: "Operational portal" },
  { role: "warehouse_manager", description: "Controls stock, expiry, adjustments, and inbound deliveries.", access: "Warehouse portal" },
  { role: "admin", description: "Owns full access, configuration, audit records, and staff control.", access: "All portals" }
];

const AVAILABLE_THEMES: {
  id: ThemeType;
  name: string;
  category: "Store Color Accents" | "Dark & Low-Glare";
  description: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  previewClass: string;
  badge: string;
}[] = [
  {
    id: "grey",
    name: "Classic Slate",
    category: "Store Color Accents",
    description: "Balanced graphite & neutral grey. Clean and executive.",
    primaryColor: "#18181b",
    accentColor: "#4f46e5",
    bgColor: "#f4f4f5",
    previewClass: "bg-neutral-800 text-white",
    badge: "Default"
  },
  {
    id: "blue",
    name: "Sapphire Ocean",
    category: "Store Color Accents",
    description: "Deep enterprise navy and electric blue. High clarity.",
    primaryColor: "#1d4ed8",
    accentColor: "#2563eb",
    bgColor: "#eff6ff",
    previewClass: "bg-blue-600 text-white",
    badge: "Enterprise"
  },
  {
    id: "green",
    name: "Emerald Fresh",
    category: "Store Color Accents",
    description: "Organic grocery & fresh supermarket emerald greens.",
    primaryColor: "#059669",
    accentColor: "#10b981",
    bgColor: "#ecfdf5",
    previewClass: "bg-emerald-600 text-white",
    badge: "Supermarket"
  },
  {
    id: "purple",
    name: "Royal Purple",
    category: "Store Color Accents",
    description: "Fashion boutique, cosmetics & luxury violet accents.",
    primaryColor: "#7c3aed",
    accentColor: "#8b5cf6",
    bgColor: "#f5f3ff",
    previewClass: "bg-purple-600 text-white",
    badge: "Boutique"
  },
  {
    id: "amber",
    name: "Warm Amber",
    category: "Store Color Accents",
    description: "Bakery, cafe & deli warm caramel and amber hues.",
    primaryColor: "#d97706",
    accentColor: "#f59e0b",
    bgColor: "#fffbeb",
    previewClass: "bg-amber-600 text-white",
    badge: "Bakery / Cafe"
  },
  {
    id: "rose",
    name: "Ruby Crimson",
    category: "Store Color Accents",
    description: "Dynamic retail red & bold coral checkout vibe.",
    primaryColor: "#e11d48",
    accentColor: "#f43f5e",
    bgColor: "#fff1f2",
    previewClass: "bg-rose-600 text-white",
    badge: "Bold Retail"
  },
  {
    id: "teal",
    name: "Teal Modern",
    category: "Store Color Accents",
    description: "Modern pharmacy, health mart & optical teal.",
    primaryColor: "#0d9488",
    accentColor: "#14b8a6",
    bgColor: "#f0fdfa",
    previewClass: "bg-teal-600 text-white",
    badge: "Pharmacy"
  },
  {
    id: "light",
    name: "Clean Light",
    category: "Store Color Accents",
    description: "Minimalist ultra-clean light mode with crisp borders.",
    primaryColor: "#262626",
    accentColor: "#525252",
    bgColor: "#ffffff",
    previewClass: "bg-neutral-100 text-neutral-900 border border-neutral-300",
    badge: "Minimal"
  },
  {
    id: "dark",
    name: "Midnight Dark",
    category: "Dark & Low-Glare",
    description: "Deep charcoal dark theme for eye comfort and night shifts.",
    primaryColor: "#09090b",
    accentColor: "#60a5fa",
    bgColor: "#18181b",
    previewClass: "bg-neutral-950 text-neutral-100 border border-neutral-800",
    badge: "Dark Mode"
  },
  {
    id: "black_grey",
    name: "Onyx Titanium",
    category: "Dark & Low-Glare",
    description: "Carbon and titanium matte black theme.",
    primaryColor: "#171717",
    accentColor: "#a8a29e",
    bgColor: "#262626",
    previewClass: "bg-neutral-900 text-neutral-100",
    badge: "Carbon"
  },
  {
    id: "high_contrast",
    name: "Solar High Contrast",
    category: "Dark & Low-Glare",
    description: "Vibrant yellow on deep black for maximum daylight visibility.",
    primaryColor: "#facc15",
    accentColor: "#000000",
    bgColor: "#000000",
    previewClass: "bg-black text-yellow-400 border border-yellow-400",
    badge: "High-Vis"
  }
];

interface SettingsViewProps {
  settings: SystemSettings;
  users: User[];
  currentUser: User;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  onCreateUser: (data: Partial<User>) => Promise<void>;
  onUpdateUser: (id: string, data: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export function SettingsView({
  settings,
  users,
  currentUser,
  onUpdateSettings,
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}: SettingsViewProps) {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New User Form Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [staffActivity, setStaffActivity] = useState<StaffActivity | null>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [newUserForm, setNewUserForm] = useState<Pick<User, "name" | "username" | "role" | "email" | "phone">>({
    name: "",
    username: "",
    role: "cashier",
    email: "",
    phone: ""
  });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.username) return;
    try {
      await onCreateUser(newUserForm);
      setShowUserModal(false);
      setNewUserForm({ name: "", username: "", role: "cashier", email: "", phone: "" });
      alert("New user account created.");
    } catch (err: any) {
      alert(err.message || "Failed to create user");
    }
  };

  const handleToggleUserActive = async (user: User) => {
    if (user.id === currentUser.id) {
      alert("You cannot deactivate your own active session account.");
      return;
    }
    try {
      await onUpdateUser(user.id, { active: !user.active });
    } catch (err: any) {
      alert(err.message || "Failed to toggle user status");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      alert("You cannot remove the account currently using this portal.");
      return;
    }
    if (!window.confirm(`Remove ${user.name}'s staff account? This cannot be undone.`)) return;
    try {
      await onDeleteUser(user.id);
    } catch (err: any) {
      alert(err.message || "Failed to remove staff account");
    }
  };

  const handleViewActivity = async (user: User) => {
    setIsLoadingActivity(true);
    try {
      setStaffActivity(await api.getUserActivity(user.id));
    } catch (err: any) {
      alert(err.message || "Failed to load staff activity");
    } finally {
      setIsLoadingActivity(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Store Settings & Staff Accounts
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure store receipt branding, tax rules, expiry compliance policies, and staff roles.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Business Profile */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <Store className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
              Store & Receipt Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Business / Store Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Tagline / Slogan</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Physical Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Telephone Contact</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Tax / VAT Registration #</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Receipt Footer Message</label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={e => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section: Visual Multi-Color Themes */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-neutral-700" />
              <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
                Store Multi-Color Themes & Visual Identity
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500">
              Active: <strong className="text-neutral-900 uppercase">{formData.theme}</strong>
            </span>
          </div>

          <p className="text-xs text-neutral-500">
            Select a multi-color theme optimized for your store archetype. Changes apply instantly across the entire POS register, headers, and navigation.
          </p>

          <div className="space-y-4 pt-1">
            {/* Vibrant Store Accents */}
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                Vibrant Retail Store Colors
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {AVAILABLE_THEMES.filter(t => t.category === "Store Color Accents").map(t => {
                  const isSelected = formData.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, theme: t.id }));
                        onUpdateSettings({ theme: t.id });
                      }}
                      className={`relative p-3 rounded-xl border text-left transition-all group ${
                        isSelected
                          ? "border-neutral-900 ring-2 ring-neutral-900/10 bg-neutral-50/80 shadow-xs"
                          : "border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                            style={{ backgroundColor: t.primaryColor }}
                          />
                          <span className="font-bold text-xs text-neutral-900">{t.name}</span>
                        </div>
                        {isSelected ? (
                          <span className="w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-neutral-400 group-hover:text-neutral-600">
                            {t.badge}
                          </span>
                        )}
                      </div>

                      {/* Mini Preview Bar */}
                      <div className="flex h-2 w-full rounded-full overflow-hidden mb-2 border border-black/5">
                        <div className="flex-1" style={{ backgroundColor: t.primaryColor }} />
                        <div className="flex-1" style={{ backgroundColor: t.accentColor }} />
                        <div className="w-6" style={{ backgroundColor: t.bgColor }} />
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-tight line-clamp-2">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark & High Contrast Modes */}
            <div className="pt-2 border-t border-neutral-100">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                Dark & Low-Glare Modes
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {AVAILABLE_THEMES.filter(t => t.category === "Dark & Low-Glare").map(t => {
                  const isSelected = formData.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, theme: t.id }));
                        onUpdateSettings({ theme: t.id });
                      }}
                      className={`relative p-3 rounded-xl border text-left transition-all group ${
                        isSelected
                          ? "border-neutral-900 ring-2 ring-neutral-900/10 bg-neutral-50/80 shadow-xs"
                          : "border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-neutral-700 shadow-2xs shrink-0"
                            style={{ backgroundColor: t.primaryColor }}
                          />
                          <span className="font-bold text-xs text-neutral-900">{t.name}</span>
                        </div>
                        {isSelected ? (
                          <span className="w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-neutral-400 group-hover:text-neutral-600">
                            {t.badge}
                          </span>
                        )}
                      </div>

                      {/* Mini Preview Bar */}
                      <div className="flex h-2 w-full rounded-full overflow-hidden mb-2 border border-black/5">
                        <div className="flex-1" style={{ backgroundColor: t.primaryColor }} />
                        <div className="flex-1" style={{ backgroundColor: t.accentColor }} />
                        <div className="w-6" style={{ backgroundColor: t.bgColor }} />
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-tight">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: POS Rules & Expiry Compliance */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <Sliders className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
              Financial, Inventory & Safety Policies
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Default Sales Tax (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.defaultTaxRate}
                onChange={e => setFormData({ ...formData, defaultTaxRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Expiry Horizon (Days)</label>
              <input
                type="number"
                value={formData.expiryWarningDays}
                onChange={e => setFormData({ ...formData, expiryWarningDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* Safety Toggles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Prevent Expired Product Checkout</span>
                <span className="text-[11px] text-neutral-500">
                  Block cashiers from scanning or selling expired perishables without manager override
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.preventExpiredSales}
                onChange={e => setFormData({ ...formData, preventExpiredSales: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Allow Negative Stock Checkouts</span>
                <span className="text-[11px] text-neutral-500">
                  Permit cashiers to complete sales when inventory quantity drops below zero
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.allowNegativeStock}
                onChange={e => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Scanner & Checkout Audio Sounds</span>
                <span className="text-[11px] text-neutral-500">
                  Play physical barcode laser beep and checkout confirmation chords
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.enableSoundEffects}
                onChange={e => setFormData({ ...formData, enableSoundEffects: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Store Configuration"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: Staff Users & Access Control */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-700" />
            <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
              Staff Accounts & Permissions
            </h3>
          </div>
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff User</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {STAFF_ROLE_OPTIONS.map(option => {
            const count = users.filter(user => user.role === option.role).length;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => {
                  setNewUserForm(current => ({ ...current, role: option.role }));
                  setShowUserModal(true);
                }}
                className="text-left p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:border-blue-300 hover:bg-blue-50 transition"
                title={`Create ${ROLE_LABELS[option.role]} account`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-neutral-900">{ROLE_LABELS[option.role]}</span>
                  <span className="text-[10px] font-bold rounded-full bg-white px-1.5 py-0.5 text-neutral-600">{count}</span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">{option.access}</p>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                <th className="py-2.5">Name</th>
                <th className="py-2.5">Username</th>
                <th className="py-2.5">Role</th>
                <th className="py-2.5">Email / Phone</th>
                <th className="py-2.5 text-center">Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="py-2.5 font-bold text-neutral-900">{u.name}</td>
                  <td className="py-2.5 font-mono text-neutral-600">{u.username}</td>
                  <td className="py-2.5">
                    <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="py-2.5 text-neutral-500">{u.email || u.phone || "—"}</td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleViewActivity(u)}
                      className="mr-1 p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                      title="View login, activity, and sales"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleUserActive(u)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        u.active ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                      }`}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      disabled={u.id === currentUser.id}
                      className="ml-1 p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Remove staff account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isLoadingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white px-5 py-4 text-xs font-bold text-neutral-700">Loading staff activity…</div>
        </div>
      )}

      {staffActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl border border-neutral-200 flex flex-col">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{staffActivity.user.name} — Staff Detail</h3>
                <p className="text-[11px] text-neutral-300 mt-0.5">{ROLE_LABELS[staffActivity.user.role]} · Last login: {staffActivity.user.lastLogin ? new Date(staffActivity.user.lastLogin).toLocaleString() : "Never"}</p>
              </div>
              <button onClick={() => setStaffActivity(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-neutral-200 p-3"><span className="block text-neutral-500">Portal sessions</span><strong className="text-lg">{staffActivity.sessions.length}</strong></div>
                <div className="rounded-xl border border-neutral-200 p-3"><span className="block text-neutral-500">Recorded sales</span><strong className="text-lg">{staffActivity.sales.length}</strong></div>
                <div className="rounded-xl border border-neutral-200 p-3"><span className="block text-neutral-500">Activity events</span><strong className="text-lg">{staffActivity.auditLogs.length}</strong></div>
              </div>
              <section>
                <h4 className="font-black text-neutral-900 mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Login / logout time tracker</h4>
                <div className="space-y-2">{staffActivity.sessions.length ? staffActivity.sessions.map(session => (
                  <div key={session.id} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 flex justify-between gap-3"><span>Login: <strong>{new Date(session.loginAt).toLocaleString()}</strong></span><span className={session.active ? "font-bold text-emerald-700" : "text-neutral-600"}>{session.active ? "Currently logged in" : `Logout: ${session.logoutAt ? new Date(session.logoutAt).toLocaleString() : "—"}`}</span></div>
                )) : <p className="text-neutral-500">No tracked portal sessions yet.</p>}</div>
              </section>
              <section>
                <h4 className="font-black text-neutral-900 mb-2">Recent POS sales</h4>
                <div className="space-y-2">{staffActivity.sales.length ? staffActivity.sales.map(sale => (
                  <div key={sale.id} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 flex justify-between gap-3"><span><strong>{sale.invoiceNumber}</strong> · {new Date(sale.timestamp).toLocaleString()}</span><strong>${sale.grandTotal.toFixed(2)}</strong></div>
                )) : <p className="text-neutral-500">No sales recorded for this staff account.</p>}</div>
              </section>
              <section>
                <h4 className="font-black text-neutral-900 mb-2">Recent activity</h4>
                <div className="space-y-2">{staffActivity.auditLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3"><strong>{log.action}</strong><span className="ml-2 text-neutral-500">{new Date(log.timestamp).toLocaleString()}</span><p className="mt-1 text-neutral-600">{log.details}</p></div>
                ))}</div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* NEW USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Add Staff User</h3>
              <button onClick={() => setShowUserModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.username}
                  onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as User["role"] })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                >
                  {STAFF_ROLE_OPTIONS.map(option => (
                    <option key={option.role} value={option.role}>{ROLE_LABELS[option.role]}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  {STAFF_ROLE_OPTIONS.find(option => option.role === newUserForm.role)?.description}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={newUserForm.phone}
                  onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
