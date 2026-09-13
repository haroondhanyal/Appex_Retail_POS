import { Sale, SystemSettings, Refund } from "../types";

export type ReceiptPrintFormat = "thermal" | "a4";

export function formatThermalReceiptText(sale: Sale, settings: SystemSettings): string {
  const line = "------------------------------------------";
  const doubleLine = "==========================================";
  const curr = settings.currencySymbol || "$";

  let out = "";
  out += centerText(settings.businessName, 42) + "\n";
  if (settings.tagline) out += centerText(settings.tagline, 42) + "\n";
  out += centerText(settings.address, 42) + "\n";
  out += centerText(`Tel: ${settings.phone} | Tax ID: ${settings.taxNumber}`, 42) + "\n";
  out += doubleLine + "\n";
  out += `INVOICE: ${sale.invoiceNumber}\n`;
  out += `DATE: ${new Date(sale.timestamp).toLocaleString()}\n`;
  out += `CASHIER: ${sale.cashierName} (${sale.cashierRole.toUpperCase()})\n`;
  out += `CUSTOMER: ${sale.customerName || "Walk-in Customer"}\n`;
  out += line + "\n";
  out += padRight("ITEM", 22) + padLeft("QTY", 4) + padLeft("PRICE", 8) + padLeft("TOTAL", 8) + "\n";
  out += line + "\n";

  sale.items.forEach(it => {
    out += padRight(it.productName.substring(0, 22), 22) +
      padLeft(String(it.quantity), 4) +
      padLeft(curr + it.unitPrice.toFixed(2), 8) +
      padLeft(curr + it.lineTotal.toFixed(2), 8) + "\n";
    if (it.discountPercent > 0) {
      out += `  * Item Disc (${it.discountPercent}%)\n`;
    }
  });

  out += line + "\n";
  out += padRight("SUBTOTAL:", 30) + padLeft(curr + sale.subtotal.toFixed(2), 12) + "\n";
  if (sale.itemDiscountsTotal > 0) {
    out += padRight("ITEM DISCOUNTS:", 30) + padLeft("-" + curr + sale.itemDiscountsTotal.toFixed(2), 12) + "\n";
  }
  if (sale.cartDiscountAmount > 0) {
    out += padRight(`CART DISCOUNT (${sale.cartDiscountPercent}%):`, 30) + padLeft("-" + curr + sale.cartDiscountAmount.toFixed(2), 12) + "\n";
  }
  out += padRight("TAX:", 30) + padLeft(curr + sale.taxTotal.toFixed(2), 12) + "\n";
  out += doubleLine + "\n";
  out += padRight("GRAND TOTAL:", 28) + padLeft(curr + sale.grandTotal.toFixed(2), 14) + "\n";
  out += doubleLine + "\n";

  out += padRight("PAYMENT METHOD:", 26) + padLeft(sale.paymentMethod.toUpperCase(), 16) + "\n";
  out += padRight("AMOUNT TENDERED:", 26) + padLeft(curr + (sale.paymentDetails?.amountReceived || sale.grandTotal).toFixed(2), 16) + "\n";
  out += padRight("CHANGE RETURNED:", 26) + padLeft(curr + (sale.paymentDetails?.change || 0).toFixed(2), 16) + "\n";

  out += "\n" + line + "\n";
  out += centerText(settings.receiptFooter || "Thank you for your business!", 42) + "\n";
  out += centerText(`* * * ${sale.invoiceNumber} * * *`, 42) + "\n";
  out += "\n\n";

  return out;
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  return " ".repeat(leftPadding) + text;
}

function padRight(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  return text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  return " ".repeat(width - text.length) + text;
}

export function downloadReceiptAsFile(sale: Sale, settings: SystemSettings) {
  const content = formatThermalReceiptText(sale, settings);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Receipt-${sale.invoiceNumber}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number | undefined | null): string {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character] || character));
}

/** Branded, full-page receipt used for A4 / PDF printing. */
export function formatA4ReceiptHtml(sale: Sale, settings: SystemSettings): string {
  const currency = settings.currencySymbol || "$";
  const customerName = sale.customerName || "Valued Customer";
  const lineRows = sale.items.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.productName)}</strong><small>${escapeHtml(item.sku)}${item.batchNumber ? ` · Batch ${escapeHtml(item.batchNumber)}` : ""}</small></td>
      <td class="center">${item.quantity}</td>
      <td class="amount">${currency}${item.unitPrice.toFixed(2)}</td>
      <td class="amount">${currency}${item.lineTotal.toFixed(2)}</td>
    </tr>`).join("");
  const discountRows = [
    sale.itemDiscountsTotal > 0 ? ["Item discounts", `-${currency}${sale.itemDiscountsTotal.toFixed(2)}`] : null,
    sale.cartDiscountAmount > 0 ? [`Cart discount (${sale.cartDiscountPercent}%)`, `-${currency}${sale.cartDiscountAmount.toFixed(2)}`] : null
  ].filter(Boolean).map(row => `<div><span>${row![0]}</span><strong>${row![1]}</strong></div>`).join("");

  return `
    <article class="a4-receipt">
      <div class="watermark">AR</div>
      <header class="receipt-header">
        <div class="brand-mark">AR</div>
        <div><p class="eyebrow">OFFICIAL SALES RECEIPT</p><h1>${escapeHtml(settings.businessName || "Apex Retail")}</h1><p>${escapeHtml(settings.tagline || "Retail made simple")}</p></div>
        <div class="invoice-badge"><span>INVOICE</span><strong>${escapeHtml(sale.invoiceNumber)}</strong><small>${escapeHtml(new Date(sale.timestamp).toLocaleString())}</small></div>
      </header>
      <section class="meta-grid">
        <div><span>BILLED TO</span><strong>${escapeHtml(customerName)}</strong><p>${escapeHtml(sale.customerPhone || "Walk-in purchase")}</p></div>
        <div><span>STORE DETAILS</span><strong>${escapeHtml(settings.address)}</strong><p>${escapeHtml(settings.phone)} · ${escapeHtml(settings.email)}</p></div>
        <div><span>SERVED BY</span><strong>${escapeHtml(sale.cashierName)}</strong><p>${escapeHtml(sale.cashierRole.toUpperCase())} · ${escapeHtml(sale.paymentMethod.replaceAll("_", " "))}</p></div>
      </section>
      <table><thead><tr><th>ITEM</th><th class="center">QTY</th><th class="amount">UNIT PRICE</th><th class="amount">TOTAL</th></tr></thead><tbody>${lineRows}</tbody></table>
      <section class="summary">
        <div class="payment-note"><span>PAYMENT</span><strong>${escapeHtml(sale.paymentMethod.replaceAll("_", " "))}</strong><p>Amount received: ${currency}${(sale.paymentDetails?.amountReceived || sale.grandTotal).toFixed(2)}<br/>Change returned: ${currency}${(sale.paymentDetails?.change || 0).toFixed(2)}</p></div>
        <div class="totals"><div><span>Subtotal</span><strong>${currency}${sale.subtotal.toFixed(2)}</strong></div>${discountRows}<div><span>Tax</span><strong>${currency}${sale.taxTotal.toFixed(2)}</strong></div><div class="grand"><span>GRAND TOTAL</span><strong>${currency}${sale.grandTotal.toFixed(2)}</strong></div></div>
      </section>
      <footer><div class="footer-logo">AR</div><h2>Thank you, ${escapeHtml(customerName)}!</h2><p>We truly appreciate your visit to ${escapeHtml(settings.businessName || "Apex Retail")}. ${escapeHtml(settings.receiptFooter || "We look forward to serving you again.")}</p><small>Keep this receipt for returns, exchanges, and your purchase record. · Tax ID: ${escapeHtml(settings.taxNumber)}</small></footer>
    </article>`;
}

/** Opens a receipt-only document. In Chrome, choose “Save to PDF” in the print dialog. */
export function printReceipt(sale: Sale, settings: SystemSettings, format: ReceiptPrintFormat = "thermal") {
  const printWindow = window.open("", "_blank", "width=760,height=900");
  if (!printWindow) {
    alert("The print window was blocked. Please allow pop-ups for this site and try again.");
    return;
  }
  printWindow.opener = null;

  const isA4 = format === "a4";
  const documentTitle = `Receipt-${sale.invoiceNumber}`;
  printWindow.document.title = documentTitle;
  printWindow.document.head.innerHTML = `
    <meta charset="utf-8" />
    <title>${documentTitle}</title>
    <style>
      @page { size: ${isA4 ? "A4" : "80mm auto"}; margin: ${isA4 ? "16mm" : "4mm"}; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; background: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      pre { margin: 0; white-space: pre-wrap; font-size: ${isA4 ? "12px" : "10px"}; line-height: 1.35; }
      .receipt { width: ${isA4 ? "100%" : "72mm"}; margin: 0 auto; }
      .a4-receipt { position: relative; min-height: 265mm; overflow: hidden; font-family: Arial, Helvetica, sans-serif; color: #172033; padding: 2mm; }
      .watermark { position: absolute; right: -30mm; top: 70mm; z-index: 0; font-size: 210mm; line-height: .7; font-weight: 900; color: #0f766e; opacity: .035; transform: rotate(-18deg); pointer-events: none; }
      .receipt-header, .meta-grid, table, .summary, footer { position: relative; z-index: 1; }
      .receipt-header { display:flex; align-items:center; gap:5mm; padding-bottom: 6mm; border-bottom: 2px solid #0f766e; }
      .brand-mark, .footer-logo { display:flex; align-items:center; justify-content:center; background:#0f766e; color:#fff; font-weight:900; border-radius:5mm; letter-spacing:-1px; }
      .brand-mark { width:18mm; height:18mm; font-size:8mm; }.footer-logo { width:9mm; height:9mm; font-size:4mm; margin:0 auto 3mm; }
      .eyebrow, .meta-grid span, .invoice-badge span, .payment-note span { margin:0 0 1mm; color:#0f766e; font-size:8pt; font-weight:800; letter-spacing:1.3px; }.receipt-header h1 { margin:0; font-size:22pt; letter-spacing:-.6px; }.receipt-header p { margin:1mm 0 0; font-size:9pt; color:#5d6778; }.invoice-badge { margin-left:auto; text-align:right; }.invoice-badge strong { display:block; font-size:13pt; }.invoice-badge small { display:block; margin-top:2mm; color:#5d6778; font-size:8pt; }
      .meta-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4mm; padding:6mm 0; }.meta-grid div { padding:3mm; border-left:2px solid #d7eee9; }.meta-grid strong { display:block; font-size:9pt; }.meta-grid p { margin:1mm 0 0; color:#64748b; font-size:8pt; line-height:1.45; }
      table { width:100%; border-collapse:collapse; margin-top:2mm; } th { padding:3mm; background:#0f766e; color:#fff; text-align:left; font-size:8pt; letter-spacing:.7px; } td { padding:3.5mm 3mm; border-bottom:1px solid #dce5e3; font-size:9pt; vertical-align:top; } td small { display:block; margin-top:1mm; color:#718096; font-size:7.5pt; }.amount { text-align:right; white-space:nowrap; }.center { text-align:center; }
      .summary { display:flex; justify-content:space-between; gap:12mm; margin-top:8mm; }.payment-note { padding:4mm; background:#f0fdfa; border-radius:3mm; min-width:65mm; align-self:flex-start; }.payment-note strong { display:block; text-transform:capitalize; font-size:11pt; }.payment-note p { margin:2mm 0 0; color:#536273; font-size:8.5pt; line-height:1.6; }.totals { width:70mm; }.totals div { display:flex; justify-content:space-between; padding:1.8mm 0; font-size:9pt; }.totals .grand { margin-top:2mm; padding:3mm; background:#172033; color:#fff; border-radius:2mm; font-size:11pt; }.totals .grand strong { font-size:13pt; }
      footer { text-align:center; margin-top:auto; padding:14mm 8mm 0; color:#526172; } footer h2 { margin:0; color:#172033; font-size:14pt; } footer p { max-width:140mm; margin:2mm auto 3mm; font-size:9pt; line-height:1.55; } footer small { font-size:7.5pt; color:#80909f; }
    </style>`;
  const receipt = printWindow.document.createElement(isA4 ? "div" : "pre");
  receipt.className = isA4 ? "receipt" : "receipt";
  if (isA4) receipt.innerHTML = formatA4ReceiptHtml(sale, settings);
  else receipt.textContent = formatThermalReceiptText(sale, settings);
  printWindow.document.body.appendChild(receipt);
  printWindow.focus();
  printWindow.print();
}

export async function shareReceipt(sale: Sale, settings: SystemSettings): Promise<boolean> {
  const content = formatThermalReceiptText(sale, settings);
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Receipt ${sale.invoiceNumber} - ${settings.businessName}`,
        text: content
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}
