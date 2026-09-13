import { useState, useMemo } from "react";
import {
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  Percent,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Landmark,
  Layers,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  Printer,
  Share2,
  Download,
  AlertTriangle,
  X,
  PlusCircle,
  Tag
} from "lucide-react";
import {
  Product,
  CartItem,
  Customer,
  PaymentMethod,
  Sale,
  SystemSettings,
  User as AuthUser
} from "../types";
import { playBeepSound, playSuccessSound, playErrorSound } from "../services/sound";
import { formatThermalReceiptText, downloadReceiptAsFile, printReceipt, shareReceipt } from "../services/receiptService";

interface POSScreenProps {
  products: Product[];
  customers: Customer[];
  currentUser: AuthUser;
  settings: SystemSettings;
  onCompleteSale: (saleData: any) => Promise<Sale>;
  onOpenScanner: () => void;
  onRefreshProducts: () => void;
}

interface HeldCart {
  id: string;
  name: string;
  items: CartItem[];
  customer: Customer | null;
  heldAt: string;
}

export function POSScreen({
  products,
  customers,
  currentUser,
  settings,
  onCompleteSale,
  onOpenScanner,
  onRefreshProducts
}: POSScreenProps) {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    customers.find(c => c.id === "cust-walkin") || customers[0] || null
  );

  // Discounts & notes
  const [cartDiscountPercent, setCartDiscountPercent] = useState<number>(0);
  const [cartNotes, setCartNotes] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderStatus, setOrderStatus] = useState<"pending" | "confirmed" | "packed" | "shipped" | "delivered">("confirmed");
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [riderName, setRiderName] = useState("");

  // Held carts queue
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Item discount editing
  const [editingItemDiscountId, setEditingItemDiscountId] = useState<string | null>(null);
  const [tempItemDiscount, setTempItemDiscount] = useState<number>(0);

  // Payment checkout modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountTendered, setAmountTendered] = useState<string>("");
  const [splitDetails, setSplitDetails] = useState({ cash: 0, card: 0, wallet: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [expiredWarningProduct, setExpiredWarningProduct] = useState<Product | null>(null);

  // Completed sale receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState<"thermal" | "a4">("thermal");

  // Quick Customer Add Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  // Filter Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add product to cart
  const addToCart = (product: Product) => {
    // Check expired policy
    if (settings.preventExpiredSales && product.expiryStatus === "expired") {
      setExpiredWarningProduct(product);
      playErrorSound(settings.enableSoundEffects);
      return;
    }

    playBeepSound(settings.enableSoundEffects);

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => {
          if (item.product.id === product.id) {
            const nextQty = item.quantity + 1;
            const lineSub = nextQty * item.unitPrice * (1 - item.itemDiscountPercent / 100);
            return {
              ...item,
              quantity: nextQty,
              lineTotal: Number(lineSub.toFixed(2))
            };
          }
          return item;
        });
      } else {
        const itemDiscount = product.discount || 0;
        const lineSub = product.sellingPrice * (1 - itemDiscount / 100);
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.sellingPrice,
            itemDiscountPercent: itemDiscount,
            taxRate: product.taxRate || settings.defaultTaxRate,
            lineTotal: Number(lineSub.toFixed(2))
          }
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    playBeepSound(settings.enableSoundEffects);
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            const lineSub = nextQty * item.unitPrice * (1 - item.itemDiscountPercent / 100);
            return {
              ...item,
              quantity: nextQty,
              lineTotal: Number(lineSub.toFixed(2))
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const applyItemDiscount = (productId: string, discount: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const discountPct = Math.max(0, Math.min(100, discount));
          const lineSub = item.quantity * item.unitPrice * (1 - discountPct / 100);
          return {
            ...item,
            itemDiscountPercent: discountPct,
            lineTotal: Number(lineSub.toFixed(2))
          };
        }
        return item;
      })
    );
    setEditingItemDiscountId(null);
  };

  // Cart Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let itemDiscountsTotal = 0;
    let taxTotal = 0;

    cart.forEach(item => {
      const regularLineTotal = item.quantity * item.unitPrice;
      const discountedLine = regularLineTotal * (1 - item.itemDiscountPercent / 100);
      subtotal += regularLineTotal;
      itemDiscountsTotal += regularLineTotal - discountedLine;

      const itemTax = discountedLine * (item.taxRate / 100);
      taxTotal += itemTax;
    });

    const netBeforeCartDiscount = subtotal - itemDiscountsTotal;
    const cartDiscountAmount = netBeforeCartDiscount * (cartDiscountPercent / 100);
    const grandTotal = Math.max(0, netBeforeCartDiscount - cartDiscountAmount + taxTotal + deliveryCharge);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      itemDiscountsTotal: Number(itemDiscountsTotal.toFixed(2)),
      cartDiscountAmount: Number(cartDiscountAmount.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  }, [cart, cartDiscountPercent, deliveryCharge]);

  // Hold / Resume Cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHold: HeldCart = {
      id: "hold-" + Date.now(),
      name: `Cart #${heldCarts.length + 1} (${selectedCustomer?.name || "Walk-in"})`,
      items: [...cart],
      customer: selectedCustomer,
      heldAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setHeldCarts(prev => [...prev, newHold]);
    setCart([]);
    setCartDiscountPercent(0);
    setCartNotes("");
    playBeepSound(settings.enableSoundEffects);
  };

  const handleResumeCart = (held: HeldCart) => {
    setCart(held.items);
    setSelectedCustomer(held.customer);
    setHeldCarts(prev => prev.filter(h => h.id !== held.id));
    setShowHeldModal(false);
    playSuccessSound(settings.enableSoundEffects);
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Clear all items from current cart?")) {
      setCart([]);
      setCartDiscountPercent(0);
      setCartNotes("");
    }
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    if (selectedCustomer?.customerType === "wholesale" && selectedCustomer.minimumOrderQuantity) {
      const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
      if (totalUnits < selectedCustomer.minimumOrderQuantity) {
        alert(`Wholesale minimum order is ${selectedCustomer.minimumOrderQuantity} units. Current cart has ${totalUnits}.`);
        return;
      }
    }
    setAmountTendered(String(calculations.grandTotal));
    setSelectedPaymentMethod("cash");
    setShowPaymentModal(true);
  };

  // Process and Submit Payment
  const handleConfirmPayment = async (overrideExpired = false) => {
    setIsProcessing(true);
    try {
      const tenderedNum = Number(amountTendered) || calculations.grandTotal;
      const changeDue = Math.max(0, tenderedNum - calculations.grandTotal);

      const salePayload = {
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        cashierRole: currentUser.role,
        customerId: selectedCustomer?.id || "cust-walkin",
        customerName: selectedCustomer?.name || "Walk-in Customer",
        customerPhone: selectedCustomer?.phone || "N/A",
        customerType: selectedCustomer?.customerType || "walk_in",
        orderNumber: orderNumber || undefined,
        orderStatus: orderNumber ? orderStatus : undefined,
        deliveryAddress: selectedCustomer?.deliveryAddress || selectedCustomer?.address || undefined,
        deliveryCharge,
        riderName: riderName || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          image: item.product.image,
          unitPrice: item.unitPrice,
          costPrice: item.product.costPrice,
          quantity: item.quantity,
          discountPercent: item.itemDiscountPercent,
          taxRate: item.taxRate,
          lineTotal: item.lineTotal,
          batchNumber: item.product.batchNumber
        })),
        subtotal: calculations.subtotal,
        itemDiscountsTotal: calculations.itemDiscountsTotal,
        cartDiscountPercent,
        cartDiscountAmount: calculations.cartDiscountAmount,
        taxTotal: calculations.taxTotal,
        grandTotal: calculations.grandTotal,
        paymentMethod: selectedPaymentMethod,
        paymentDetails: {
          amountReceived: tenderedNum,
          change: Number(changeDue.toFixed(2)),
          cardReference: selectedPaymentMethod === "card" ? "AUTH-" + Math.floor(1000 + Math.random() * 9000) : undefined
        },
        notes: cartNotes,
        overrideExpiredCheck: overrideExpired
      };

      const completed = await onCompleteSale(salePayload);
      playSuccessSound(settings.enableSoundEffects);

      // Reset cart and open receipt dialog
      setCart([]);
      setCartDiscountPercent(0);
      setCartNotes("");
      setOrderNumber("");
      setDeliveryCharge(0);
      setRiderName("");
      setShowPaymentModal(false);
      setCompletedSale(completed);
      setShowReceiptModal(true);
      onRefreshProducts();
    } catch (err: any) {
      playErrorSound(settings.enableSoundEffects);
      alert(err.message || "Failed to process sale");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick cash buttons
  const cashOptions = [
    calculations.grandTotal,
    Math.ceil(calculations.grandTotal / 5) * 5,
    Math.ceil(calculations.grandTotal / 10) * 10,
    Math.ceil(calculations.grandTotal / 20) * 20,
    50,
    100
  ].filter((v, idx, arr) => arr.indexOf(v) === idx && v >= calculations.grandTotal);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-100">
      {/* LEFT: Product Catalog & Fast Touch Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-neutral-200 bg-white">
        {/* Search & Action Bar */}
        <div className="p-3 border-b border-neutral-200 bg-neutral-50 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search product by name, SKU or barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-neutral-800 transition active:scale-95 shrink-0"
            title="Scan with Camera"
          >
            <Scan className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Camera Scanner</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 border-b border-neutral-200 overflow-x-auto flex items-center gap-1.5 scrollbar-none bg-white">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 auto-rows-max">
          {filteredProducts.map(product => {
            const isOutOfStock = product.currentStock <= 0;
            const isLowStock = product.currentStock <= product.minStock && !isOutOfStock;
            const isExpired = product.expiryStatus === "expired";
            const isExpiringSoon = product.expiryStatus === "expiring_soon";

            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOutOfStock && !settings.allowNegativeStock}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition relative group overflow-hidden ${
                  isOutOfStock && !settings.allowNegativeStock
                    ? "opacity-50 border-neutral-200 bg-neutral-50 cursor-not-allowed"
                    : "border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm active:scale-[0.98]"
                }`}
              >
                {/* Product Image */}
                <div className="w-full h-28 rounded-lg overflow-hidden bg-neutral-100 mb-2 relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  {/* Stock tag */}
                  <span
                    className={`absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs ${
                      isOutOfStock
                        ? "bg-red-600 text-white"
                        : isLowStock
                        ? "bg-amber-500 text-white"
                        : "bg-black/60 text-white"
                    }`}
                  >
                    {isOutOfStock ? "Out of Stock" : `${product.currentStock} in stock`}
                  </span>

                  {/* Expiry Warning Tag */}
                  {isExpired && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-600 text-white uppercase tracking-wider">
                      Expired
                    </span>
                  )}
                  {isExpiringSoon && !isExpired && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white uppercase tracking-wider">
                      Expiring Soon
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider truncate block">
                      {product.category}
                    </span>
                    <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-100">
                    <span className="text-sm font-extrabold text-neutral-900 font-mono">
                      ${product.sellingPrice.toFixed(2)}
                    </span>
                    <span className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-xs group-hover:bg-neutral-900 group-hover:text-white transition">
                      +
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: High-Speed Checkout Cart */}
      <div className="w-full md:w-96 lg:w-[420px] bg-neutral-50 flex flex-col h-full border-t md:border-t-0 shadow-lg shrink-0">
        {/* Customer & Parked Carts Bar */}
        <div className="p-3 border-b border-neutral-200 bg-white flex items-center justify-between gap-2">
          {/* Customer Selector */}
          <div className="flex-1 flex items-center gap-1.5">
            <User className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={selectedCustomer?.id || "cust-walkin"}
              onChange={e => {
                const found = customers.find(c => c.id === e.target.value);
                setSelectedCustomer(found || null);
                setDeliveryCharge(found?.deliveryCharge || 0);
                setOrderStatus(found?.defaultOrderStatus || "confirmed");
                setCartDiscountPercent(found?.customerType === "wholesale" ? found.wholesaleDiscountPercent || 0 : 0);
              }}
              className="w-full bg-transparent text-xs font-semibold text-neutral-800 focus:outline-hidden"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone !== "N/A" ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {(selectedCustomer?.customerType === "online" || selectedCustomer?.customerType === "delivery") && (
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="Order #" className="w-24 px-2 py-1 border border-neutral-200 rounded-md" />
              <input value={riderName} onChange={e => setRiderName(e.target.value)} placeholder="Rider" className="w-20 px-2 py-1 border border-neutral-200 rounded-md" />
              <input type="number" min="0" step="0.01" value={deliveryCharge || ""} onChange={e => setDeliveryCharge(Number(e.target.value) || 0)} placeholder="Delivery" className="w-20 px-2 py-1 border border-neutral-200 rounded-md" title="Delivery charge" />
              <select value={orderStatus} onChange={e => setOrderStatus(e.target.value as typeof orderStatus)} className="px-1 py-1 border border-neutral-200 rounded-md bg-white">
                <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="packed">Packed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1">
            {/* Park / Hold Cart */}
            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 transition"
              title="Park / Hold Current Cart"
            >
              <PauseCircle className="w-4 h-4" />
            </button>

            {/* Resume Held Carts */}
            <button
              onClick={() => setShowHeldModal(true)}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 relative transition"
              title="Resume Held Carts"
            >
              <PlayCircle className="w-4 h-4" />
              {heldCarts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {heldCarts.length}
                </span>
              )}
            </button>

            {/* Clear Cart */}
            <button
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="p-1.5 rounded-lg border border-neutral-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition"
              title="Clear Cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 p-6">
              <Scan className="w-12 h-12 text-neutral-300 mb-2 stroke-1" />
              <p className="font-semibold text-xs text-neutral-600">Cart is Empty</p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">
                Scan barcodes or tap products from the catalog to build checkout basket.
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product.id}
                className="bg-white rounded-xl p-2.5 border border-neutral-200 flex items-center gap-2.5 shadow-2xs"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="text-xs font-bold text-neutral-900 truncate leading-tight">
                      {item.product.name}
                    </h5>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-neutral-400 hover:text-red-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="font-mono text-neutral-600">
                      ${item.unitPrice.toFixed(2)}
                      {item.itemDiscountPercent > 0 && (
                        <span className="text-[10px] text-emerald-600 font-bold ml-1">
                          (-{item.itemDiscountPercent}%)
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-neutral-900 text-sm">
                      ${item.lineTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity & Discount Controls */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-100">
                    <button
                      onClick={() => {
                        setEditingItemDiscountId(item.product.id);
                        setTempItemDiscount(item.itemDiscountPercent);
                      }}
                      className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-0.5 bg-neutral-100 px-1.5 py-0.5 rounded-md"
                    >
                      <Percent className="w-3 h-3" />
                      Disc: {item.itemDiscountPercent}%
                    </button>

                    <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-5 h-5 rounded-md bg-white text-neutral-700 flex items-center justify-center font-bold text-xs hover:bg-neutral-200 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-5 h-5 rounded-md bg-white text-neutral-700 flex items-center justify-center font-bold text-xs hover:bg-neutral-200 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Discount input popup */}
                  {editingItemDiscountId === item.product.id && (
                    <div className="mt-2 p-2 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center gap-2">
                      <span className="text-[11px] font-medium text-neutral-600">Discount %:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tempItemDiscount}
                        onChange={e => setTempItemDiscount(Number(e.target.value))}
                        className="w-16 px-1.5 py-1 bg-white border border-neutral-300 rounded-md text-xs font-mono"
                      />
                      <button
                        onClick={() => applyItemDiscount(item.product.id, tempItemDiscount)}
                        className="px-2 py-1 bg-neutral-900 text-white rounded-md text-[11px] font-bold"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Grand Charge Section */}
        <div className="p-4 bg-white border-t border-neutral-200 shadow-lg">
          {/* Discount & Tax Breakdown */}
          <div className="space-y-1.5 text-xs text-neutral-600 pb-3 border-b border-neutral-100">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">${calculations.subtotal.toFixed(2)}</span>
            </div>

            {calculations.itemDiscountsTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Item Discounts:</span>
                <span className="font-mono">-${calculations.itemDiscountsTotal.toFixed(2)}</span>
              </div>
            )}

            {/* Cart overall discount selector */}
            <div className="flex items-center justify-between text-neutral-700">
              <span className="flex items-center gap-1">
                Cart Discount:
                <select
                  value={cartDiscountPercent}
                  onChange={e => setCartDiscountPercent(Number(e.target.value))}
                  className="ml-1 text-[11px] bg-neutral-100 border border-neutral-300 rounded px-1 py-0.5 font-semibold"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                </select>
              </span>
              <span className="font-mono text-emerald-600">
                {calculations.cartDiscountAmount > 0 ? `-$${calculations.cartDiscountAmount.toFixed(2)}` : "$0.00"}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Tax ({settings.defaultTaxRate}%):</span>
              <span className="font-mono">${calculations.taxTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex items-baseline justify-between py-3">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Total Payable
              </span>
              <span className="text-[11px] text-neutral-400">
                {cart.reduce((a, b) => a + b.quantity, 0)} items in basket
              </span>
            </div>
            <div className="text-2xl font-black text-neutral-900 font-mono tracking-tight">
              ${calculations.grandTotal.toFixed(2)}
            </div>
          </div>

          {/* Large Action Checkout Button */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <Banknote className="w-5 h-5 text-emerald-400" />
            <span>Charge ${calculations.grandTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Payment Checkout</h3>
                <p className="text-xs text-neutral-400">
                  Customer: {selectedCustomer?.name || "Walk-in"} • Cashier: {currentUser.name}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Grand Total Callout */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-center">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Total Payable Amount
                </span>
                <div className="text-3xl font-black text-neutral-900 font-mono mt-1">
                  ${calculations.grandTotal.toFixed(2)}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cash", label: "Cash", icon: Banknote },
                    { id: "card", label: "Card", icon: CreditCard },
                    { id: "digital_wallet", label: "Wallet", icon: Smartphone },
                    { id: "bank_transfer", label: "Transfer", icon: Landmark },
                    { id: "split", label: "Split Pay", icon: Layers }
                  ].map(pm => {
                    const Icon = pm.icon;
                    const isSelected = selectedPaymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(pm.id as PaymentMethod)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                          isSelected
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Tendered / Cash Quick Selector */}
              {selectedPaymentMethod === "cash" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                    Cash Amount Received
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-neutral-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={amountTendered}
                      onChange={e => setAmountTendered(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-lg font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  {/* Quick tender suggestions */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cashOptions.map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmountTendered(String(amt))}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-mono font-bold bg-neutral-50 hover:bg-neutral-100"
                      >
                        ${amt.toFixed(2)}
                      </button>
                    ))}
                  </div>

                  {/* Change Due */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 mt-2">
                    <span className="text-xs font-bold text-emerald-900">Change Due to Customer:</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">
                      ${Math.max(0, (Number(amountTendered) || 0) - calculations.grandTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Card / Wallet notes */}
              {selectedPaymentMethod !== "cash" && selectedPaymentMethod !== "split" && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
                  <p className="font-semibold text-neutral-900">Payment Gateway Terminal Ready</p>
                  <p className="mt-0.5">
                    Insert or tap customer card/device on terminal. Terminal authorization will be recorded on invoice.
                  </p>
                </div>
              )}

              {/* Transaction Notes */}
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1">
                  Order / Invoice Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special customer request or gift packaging..."
                  value={cartNotes}
                  onChange={e => setCartNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmPayment(false)}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isProcessing ? "Processing..." : "Complete Transaction"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPIRED PRODUCT RESTRICTION MODAL */}
      {expiredWarningProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-center font-extrabold text-neutral-900 text-base">
              Expired Product Restricted
            </h3>
            <p className="text-center text-xs text-neutral-600 mt-1">
              <strong>{expiredWarningProduct.name}</strong> (Batch: {expiredWarningProduct.batchNumber || "N/A"}) expired on{" "}
              <strong>{expiredWarningProduct.expiryDate}</strong>.
            </p>
            <p className="text-xs text-neutral-500 mt-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
              System safety policy prevents checkout of expired perishable items unless authorized by manager or admin.
            </p>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setExpiredWarningProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
              >
                Dismiss Item
              </button>
              {currentUser.role === "admin" || currentUser.role === "manager" ? (
                <button
                  onClick={() => {
                    const p = expiredWarningProduct;
                    setExpiredWarningProduct(null);
                    // Add with override
                    setCart(prev => [
                      ...prev,
                      {
                        product: p,
                        quantity: 1,
                        unitPrice: p.sellingPrice,
                        itemDiscountPercent: 0,
                        taxRate: p.taxRate,
                        lineTotal: p.sellingPrice
                      }
                    ]);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
                >
                  Override & Add
                </button>
              ) : (
                <div className="text-[11px] text-red-600 font-semibold self-center">
                  Manager sign-in required to override.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PARKED / HELD CARTS MODAL */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-neutral-900">Parked / Held Carts ({heldCarts.length})</h3>
              <button onClick={() => setShowHeldModal(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {heldCarts.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-6">No held carts currently parked.</p>
              ) : (
                heldCarts.map(held => (
                  <div
                    key={held.id}
                    className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-neutral-900">{held.name}</div>
                      <div className="text-[11px] text-neutral-500">
                        {held.items.length} item(s) • Parked at {held.heldAt}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResumeCart(held)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800"
                    >
                      Resume
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED RECEIPT & INVOICE MODAL */}
      {showReceiptModal && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Sale Completed Successfully</h4>
                <p className="text-xs text-emerald-400 font-mono">Invoice #{completedSale.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt format toggle */}
            <div className="px-5 py-2 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <span className="text-xs font-medium text-neutral-600">Receipt Format:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setReceiptFormat("thermal")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    receiptFormat === "thermal" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  80mm Thermal
                </button>
                <button
                  onClick={() => setReceiptFormat("a4")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    receiptFormat === "a4" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  A4 Tax Invoice
                </button>
              </div>
            </div>

            {/* Printable Receipt Preview */}
            <div className="flex-1 overflow-y-auto p-4 bg-neutral-100 flex justify-center">
              <div
                id="printable-receipt"
                className="bg-white p-5 rounded-lg shadow-xs border border-neutral-200 w-full max-w-xs font-mono-receipt text-xs text-neutral-900 select-text"
              >
                <pre className="whitespace-pre-wrap leading-tight">
                  {formatThermalReceiptText(completedSale, settings)}
                </pre>
              </div>
            </div>

            {/* Actions: Print, Share, Download, New Sale */}
            <div className="p-4 bg-white border-t border-neutral-200 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => printReceipt(completedSale, settings, receiptFormat)}
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => downloadReceiptAsFile(completedSale, settings)}
                  className="p-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => shareReceipt(completedSale, settings)}
                  className="p-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold"
                  title="Share via System Share Sheet"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition"
              >
                Start Next Sale (F2)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
