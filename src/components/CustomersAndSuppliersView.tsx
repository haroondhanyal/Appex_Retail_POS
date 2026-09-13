import { useState } from "react";
import type React from "react";
import { Users, Truck, Plus, Search, Phone, Mail, Award, DollarSign, X } from "lucide-react";
import { Customer, Supplier } from "../types";

interface CustomersAndSuppliersViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  onCreateCustomer: (data: Partial<Customer>) => Promise<void>;
  onCreateSupplier: (data: Partial<Supplier>) => Promise<void>;
}

export function CustomersAndSuppliersView({
  customers,
  suppliers,
  onCreateCustomer,
  onCreateSupplier
}: CustomersAndSuppliersViewProps) {
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");
  const [searchQuery, setSearchQuery] = useState("");

  // Customer Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", phone: "", email: "", address: "" });

  // Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [suppForm, setSuppForm] = useState({ name: "", contactPerson: "", company: "", phone: "", email: "", address: "" });

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name) return;
    try {
      await onCreateCustomer(custForm);
      setShowCustomerModal(false);
      setCustForm({ name: "", phone: "", email: "", address: "" });
    } catch (err: any) {
      alert(err.message || "Failed to add customer");
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppForm.name) return;
    try {
      await onCreateSupplier(suppForm);
      setShowSupplierModal(false);
      setSuppForm({ name: "", contactPerson: "", company: "", phone: "", email: "", address: "" });
    } catch (err: any) {
      alert(err.message || "Failed to add supplier");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Customer Directory & Supplier Partners
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Maintain retail loyalty contacts, VIP credit balances, and wholesale vendor accounts.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "customers") setShowCustomerModal(true);
            else setShowSupplierModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === "customers" ? "Add Customer" : "Add Supplier"}</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "customers"
                ? "bg-neutral-900 text-white shadow-2xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Retail Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("suppliers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "suppliers"
                ? "bg-neutral-900 text-white shadow-2xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Suppliers & Vendors ({suppliers.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* TAB 1: CUSTOMERS */}
      {activeTab === "customers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.map(cust => (
            <div key={cust.id} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900">{cust.name}</h4>
                  <p className="text-[11px] text-neutral-400 font-mono">ID: {cust.id}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>{cust.points || 0} pts</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{cust.phone}</span>
                </div>
                {cust.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{cust.email}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-sans">Total Spent</span>
                  <span className="font-bold text-neutral-900">${(cust.totalSpent || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-sans">Credit Balance</span>
                  <span className={`font-bold ${(cust.balance || 0) > 0 ? "text-red-600" : "text-neutral-900"}`}>
                    ${(cust.balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSuppliers.map(supp => (
            <div key={supp.id} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs space-y-3">
              <div>
                <h4 className="font-bold text-sm text-neutral-900">{supp.name}</h4>
                <p className="text-xs text-neutral-500 font-medium">{supp.company}</p>
              </div>

              <div className="space-y-1 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-neutral-400">Rep:</span>
                  <span>{supp.contactPerson}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{supp.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{supp.email}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-500">Payable Balance:</span>
                <span className="font-mono font-bold text-neutral-900">${supp.balance.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Add New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={e => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={custForm.phone}
                  onChange={e => setCustForm({ ...custForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={custForm.email}
                  onChange={e => setCustForm({ ...custForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Add New Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Vendor / Partner Name *</label>
                <input
                  type="text"
                  required
                  value={suppForm.name}
                  onChange={e => setSuppForm({ ...suppForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Company / Entity</label>
                <input
                  type="text"
                  value={suppForm.company}
                  onChange={e => setSuppForm({ ...suppForm, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={suppForm.contactPerson}
                  onChange={e => setSuppForm({ ...suppForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Phone</label>
                <input
                  type="text"
                  value={suppForm.phone}
                  onChange={e => setSuppForm({ ...suppForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono"
                />
              </div>
              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
