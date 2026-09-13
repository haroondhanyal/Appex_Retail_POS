import { useState } from "react";
import type React from "react";
import { Users, Truck, Plus, Search, Phone, Mail, Award, DollarSign, X, MapPin, Tags, Pencil, Trash2 } from "lucide-react";
import { Customer, CustomerType, Supplier } from "../types";
import { ImageCaptureUpload } from "./ImageCaptureUpload";

interface CustomersAndSuppliersViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  onCreateCustomer: (data: Partial<Customer>) => Promise<void>;
  onCreateSupplier: (data: Partial<Supplier>) => Promise<void>;
  onUpdateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onUpdateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export function CustomersAndSuppliersView({
  customers,
  suppliers,
  onCreateCustomer,
  onCreateSupplier,
  onUpdateCustomer,
  onDeleteCustomer,
  onUpdateSupplier,
  onDeleteSupplier
}: CustomersAndSuppliersViewProps) {
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | "all">("all");
  const customerTypes: { id: CustomerType; label: string; description: string }[] = [
    { id: "walk_in", label: "Walk-in", description: "Quick counter sales" },
    { id: "registered", label: "Registered", description: "Saved customer profiles" },
    { id: "online", label: "Online", description: "Website & social orders" },
    { id: "corporate", label: "Corporate", description: "Company billing & NTN" },
    { id: "wholesale", label: "Wholesale", description: "Bulk price & MOQ" },
    { id: "delivery", label: "Delivery", description: "Address, rider & COD" }
  ];

  // Customer Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const emptyCustomerForm = { name: "", phone: "", email: "", address: "", customerType: "registered" as CustomerType, companyName: "", taxNumber: "", creditTerms: "", wholesaleDiscountPercent: 0, minimumOrderQuantity: 0, priceListName: "", deliveryAddress: "", deliveryCharge: 0, photo: "" };
  const [custForm, setCustForm] = useState(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [suppForm, setSuppForm] = useState({ name: "", contactPerson: "", company: "", phone: "", email: "", address: "", photo: "" });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const customerTypeOf = (customer: Customer): CustomerType =>
    customer.customerType || (customer.id === "cust-walkin" ? "walk_in" : "registered");

  const filteredCustomers = customers.filter(c => {
    const matchesType = customerTypeFilter === "all" || customerTypeOf(c) === customerTypeFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(query) || c.phone.includes(searchQuery) || Boolean(c.email && c.email.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  const filteredSuppliers = suppliers.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.company || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name) return;
    try {
      if (editingCustomerId) await onUpdateCustomer(editingCustomerId, custForm);
      else await onCreateCustomer(custForm);
      setShowCustomerModal(false);
      setCustForm(emptyCustomerForm);
      setEditingCustomerId(null);
    } catch (err: any) {
      alert(err.message || "Failed to add customer");
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppForm.name) return;
    try {
      if (editingSupplierId) await onUpdateSupplier(editingSupplierId, suppForm);
      else await onCreateSupplier(suppForm);
      setShowSupplierModal(false);
      setSuppForm({ name: "", contactPerson: "", company: "", phone: "", email: "", address: "", photo: "" });
      setEditingSupplierId(null);
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
            Manage walk-in, registered, online, corporate, wholesale, and delivery customer profiles.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "customers") {
              if (customerTypeFilter !== "all" && customerTypeFilter !== "walk_in") setCustForm({ ...emptyCustomerForm, customerType: customerTypeFilter });
              setEditingCustomerId(null);
              setShowCustomerModal(true);
            } else { setEditingSupplierId(null); setShowSupplierModal(true); }
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
        <>
          <section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div><h2 className="text-sm font-black text-neutral-900">Customer Types</h2><p className="text-[11px] text-neutral-500">Select a type to view its customers or add a new profile.</p></div>
              <button onClick={() => setCustomerTypeFilter("all")} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${customerTypeFilter === "all" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>All ({customers.length})</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {customerTypes.map(type => {
                const count = customers.filter(customer => customerTypeOf(customer) === type.id).length;
                return <button key={type.id} onClick={() => setCustomerTypeFilter(type.id)} className={`text-left rounded-xl border p-3 transition ${customerTypeFilter === type.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 hover:border-neutral-400 bg-neutral-50"}`}>
                  <div className="text-xs font-black">{type.label}</div><div className={`text-[10px] mt-1 ${customerTypeFilter === type.id ? "text-neutral-300" : "text-neutral-500"}`}>{type.description}</div><div className={`text-lg font-black mt-2 ${customerTypeFilter === type.id ? "text-white" : "text-neutral-900"}`}>{count}</div>
                </button>;
              })}
            </div>
          </section>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-neutral-800">{customerTypeFilter === "all" ? "All Customers" : `${customerTypes.find(type => type.id === customerTypeFilter)?.label} Customers`} ({filteredCustomers.length})</h2>
            {customerTypeFilter !== "all" && <button onClick={() => setCustomerTypeFilter("all")} className="text-xs font-bold text-blue-600">Clear filter</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.map(cust => (
            <div key={cust.id} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">{cust.photo && <img src={cust.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-200" />}<h4 className="font-bold text-sm text-neutral-900">{cust.name}</h4></div>
                  <p className="text-[11px] text-neutral-400 font-mono">{customerTypeOf(cust).replace("_", " ")} · ID: {cust.id}</p>
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
                {(cust.customerType === "online" || cust.customerType === "delivery") && <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" /><span>{cust.deliveryAddress || cust.address || "Delivery address required"}</span></div>}
                {cust.customerType === "corporate" && <div><span className="font-semibold">{cust.companyName || "Company"}</span>{cust.taxNumber ? ` · NTN: ${cust.taxNumber}` : ""}</div>}
                {cust.customerType === "wholesale" && <div>Wholesale: {cust.wholesaleDiscountPercent || 0}% off · MOQ {cust.minimumOrderQuantity || 0}</div>}
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
                <div className="flex gap-1 font-sans">
                  <button onClick={() => { setEditingCustomerId(cust.id); setCustForm({ ...emptyCustomerForm, ...cust, customerType: customerTypeOf(cust) }); setShowCustomerModal(true); }} className="p-1.5 rounded-lg border border-neutral-200 text-blue-700 hover:bg-blue-50" title="Edit customer"><Pencil className="w-3.5 h-3.5" /></button>
                  {cust.id !== "cust-walkin" && <button onClick={() => { if (window.confirm(`Delete customer ${cust.name}?`)) onDeleteCustomer(cust.id).catch(error => alert(error.message)); }} className="p-1.5 rounded-lg border border-neutral-200 text-red-600 hover:bg-red-50" title="Delete customer"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSuppliers.map(supp => (
            <div key={supp.id} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs space-y-3">
              <div>
                <div className="flex items-center gap-2">{supp.photo && <img src={supp.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-200" />}<h4 className="font-bold text-sm text-neutral-900">{supp.name}</h4></div>
                <p className="text-xs text-neutral-500 font-medium">{supp.company || "Vendor Partner"}</p>
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
                  <span>{supp.email || "No email added"}</span>
                </div>
                {supp.address && <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" /><span>{supp.address}</span></div>}
              </div>

              {!!supp.categories?.length && (
                <div className="flex flex-wrap gap-1">{supp.categories.map(category => <span key={category} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"><Tags className="w-2.5 h-2.5" />{category}</span>)}</div>
              )}

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-500">Payable Balance:</span>
                <span className="font-mono font-bold text-neutral-900">${(supp.outstandingPayable ?? supp.balance ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-1 border-t border-neutral-100 pt-2">
                <button onClick={() => { setEditingSupplierId(supp.id); setSuppForm({ name: supp.name, contactPerson: supp.contactPerson || "", company: supp.company || "", phone: supp.phone || "", email: supp.email || "", address: supp.address || "", photo: supp.photo || "" }); setShowSupplierModal(true); }} className="p-1.5 rounded-lg border border-neutral-200 text-blue-700 hover:bg-blue-50" title="Edit supplier"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (window.confirm(`Delete supplier ${supp.name}?`)) onDeleteSupplier(supp.id).catch(error => alert(error.message)); }} className="p-1.5 rounded-lg border border-neutral-200 text-red-600 hover:bg-red-50" title="Delete supplier"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <h3 className="font-bold text-base">{editingCustomerId ? "Update Customer" : "Add New Customer"}</h3>
              <button onClick={() => setShowCustomerModal(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3">
              <ImageCaptureUpload value={custForm.photo} onChange={photo => setCustForm({ ...custForm, photo })} label="Customer Picture (optional)" />
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Customer Type *</label>
                <select value={custForm.customerType} onChange={e => setCustForm({ ...custForm, customerType: e.target.value as CustomerType })} className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs">
                  <option value="registered">Registered Customer</option><option value="online">Online Customer</option><option value="corporate">Corporate / Business</option><option value="wholesale">Wholesale Customer</option><option value="delivery">Delivery Customer</option>
                </select>
              </div>
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
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Address</label>
                <input value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })} className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs" />
              </div>
              {(custForm.customerType === "online" || custForm.customerType === "delivery") && <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-neutral-700 block mb-1">Delivery Address</label><input value={custForm.deliveryAddress} onChange={e => setCustForm({ ...custForm, deliveryAddress: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div><div><label className="text-xs font-bold text-neutral-700 block mb-1">Delivery Charge</label><input type="number" min="0" value={custForm.deliveryCharge} onChange={e => setCustForm({ ...custForm, deliveryCharge: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div></div>}
              {custForm.customerType === "corporate" && <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-neutral-700 block mb-1">Company Name</label><input value={custForm.companyName} onChange={e => setCustForm({ ...custForm, companyName: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div><div><label className="text-xs font-bold text-neutral-700 block mb-1">Tax / NTN</label><input value={custForm.taxNumber} onChange={e => setCustForm({ ...custForm, taxNumber: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div><div className="col-span-2"><label className="text-xs font-bold text-neutral-700 block mb-1">Credit / Payment Terms</label><input value={custForm.creditTerms} onChange={e => setCustForm({ ...custForm, creditTerms: e.target.value })} placeholder="e.g. Net 30" className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div></div>}
              {custForm.customerType === "wholesale" && <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-bold text-neutral-700 block mb-1">Discount %</label><input type="number" min="0" max="100" value={custForm.wholesaleDiscountPercent} onChange={e => setCustForm({ ...custForm, wholesaleDiscountPercent: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div><div><label className="text-xs font-bold text-neutral-700 block mb-1">MOQ</label><input type="number" min="0" value={custForm.minimumOrderQuantity} onChange={e => setCustForm({ ...custForm, minimumOrderQuantity: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div><div><label className="text-xs font-bold text-neutral-700 block mb-1">Price List</label><input value={custForm.priceListName} onChange={e => setCustForm({ ...custForm, priceListName: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" /></div></div>}
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
                  {editingCustomerId ? "Update Customer" : "Save Customer"}
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
              <h3 className="font-bold text-base">{editingSupplierId ? "Update Supplier" : "Add New Supplier"}</h3>
              <button onClick={() => setShowSupplierModal(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-3">
              <ImageCaptureUpload value={suppForm.photo} onChange={photo => setSuppForm({ ...suppForm, photo })} label="Supplier / Vendor Picture (optional)" />
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
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Email</label>
                <input type="email" value={suppForm.email} onChange={e => setSuppForm({ ...suppForm, email: e.target.value })} className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Address</label>
                <input type="text" value={suppForm.address} onChange={e => setSuppForm({ ...suppForm, address: e.target.value })} className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs" />
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
                  {editingSupplierId ? "Update Supplier" : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
