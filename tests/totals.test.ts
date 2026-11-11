import { describe, expect, it } from "vitest";
import { computeTotals, formatMoney } from "@/lib/totals";

describe("computeTotals", () => {
  it("applies discount before tax", () => {
    const t = computeTotals({
      items: [
        { description: "a", quantity: 2, unitPrice: 1000 },
        { description: "b", quantity: 1, unitPrice: 500 },
      ],
      taxPercent: 18,
      discount: 500,
    });
    expect(t).toEqual({ subtotal: 2500, discount: 500, tax: 360, total: 2360 });
  });

  it("rounds to 2 decimals", () => {
    const t = computeTotals({
      items: [{ description: "a", quantity: 3, unitPrice: 33.333 }],
      taxPercent: 0,
      discount: 0,
    });
    expect(t.subtotal).toBe(100);
    expect(t.total).toBe(100);
  });

  it("clamps the taxable base at zero when discount exceeds subtotal", () => {
    const t = computeTotals({
      items: [{ description: "a", quantity: 1, unitPrice: 100 }],
      taxPercent: 18,
      discount: 500,
    });
    expect(t.tax).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats INR with rupee sign and Indian grouping", () => {
    const s = formatMoney(2360, "INR");
    expect(s).toContain("₹");
    expect(s).toContain("2,360");
  });

  it("does not throw on unknown currency codes", () => {
    expect(() => formatMoney(5, "XYZ1")).not.toThrow();
    expect(formatMoney(5, "XYZ1")).toContain("5");
  });
});
