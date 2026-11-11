import type { QuoteContent, Totals } from "./types";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeTotals(
  q: Pick<QuoteContent, "items" | "taxPercent" | "discount">,
): Totals {
  const subtotal = round2(
    q.items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0),
  );
  const discount = round2(Number(q.discount) || 0);
  const base = Math.max(0, subtotal - discount);
  const tax = round2((base * (Number(q.taxPercent) || 0)) / 100);
  const total = round2(base + tax);
  return { subtotal, discount, tax, total };
}

export function formatMoney(amount: number, currency: string): string {
  const code = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
  }
}
