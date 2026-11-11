import { describe, expect, it } from "vitest";
import { parseContent } from "@/lib/schema";
import { AppError } from "@/lib/errors";

const base = {
  title: "T",
  from: { name: "Me" },
  client: { name: "You" },
  items: [{ description: "x", unitPrice: "1500" }],
};

describe("quote content schema", () => {
  it("coerces numeric strings and defaults quantity to 1", () => {
    const q = parseContent(base);
    expect(q.items[0].unitPrice).toBe(1500);
    expect(q.items[0].quantity).toBe(1);
    expect(q.taxPercent).toBe(0);
    expect(q.discount).toBe(0);
    expect(q.currency).toBe("INR");
  });

  it("uppercases currency", () => {
    expect(parseContent({ ...base, currency: "usd" }).currency).toBe("USD");
  });

  it("rejects negative prices with a readable validation error", () => {
    try {
      parseContent({ ...base, items: [{ description: "x", unitPrice: -5 }] });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("VALIDATION");
      expect((e as AppError).message).toContain("unitPrice");
    }
  });

  it("requires at least one item", () => {
    expect(() => parseContent({ ...base, items: [] })).toThrow(AppError);
  });

  it("rejects a malformed validUntil", () => {
    expect(() => parseContent({ ...base, validUntil: "next friday" })).toThrow(AppError);
  });
});

describe("formatted numbers from Claude", () => {
  it("accepts '1,500' and '₹1500' and rejects an empty price", () => {
    expect(parseContent({ ...base, items: [{ description: "x", unitPrice: "1,500" }] }).items[0].unitPrice).toBe(1500);
    expect(parseContent({ ...base, items: [{ description: "x", unitPrice: "₹ 1500" }] }).items[0].unitPrice).toBe(1500);
    expect(() => parseContent({ ...base, items: [{ description: "x", unitPrice: "" }] })).toThrow(AppError);
  });
});
