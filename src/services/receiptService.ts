import { Sale, SystemSettings, Refund } from "../types";

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
