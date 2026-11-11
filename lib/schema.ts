import { z } from "zod";
import { validation } from "./errors";
import type { QuoteContent } from "./types";

/** Accepts 1500, "1500", "1,500", "₹ 1500"; rejects "" and null instead of turning them into 0. */
const num = (schema: z.ZodNumber) =>
  z.preprocess((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "string") {
      const cleaned = v.replace(/[,\s₹$€£]/g, "");
      return cleaned === "" ? undefined : Number(cleaned);
    }
    return v;
  }, schema);
const money = num(z.number().min(0));
const optText = z.string().trim().max(5000).optional();

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Each line item needs a description"),
  quantity: num(z.number().min(0)).default(1),
  unitPrice: money,
});

/** Field shapes, shared by the zod object below and by the MCP tool definitions. */
export const quoteContentShape = {
  title: z.string().trim().min(1).max(200).describe("Short quote title, e.g. 'Website redesign for Acme Corp'"),
  from: z
    .object({ name: z.string().trim().min(1), email: optText })
    .describe("The freelancer or agency sending the quote"),
  client: z
    .object({ name: z.string().trim().min(1), company: optText, email: optText })
    .describe("The client receiving the quote"),
  currency: z
    .string()
    .trim()
    .min(3)
    .max(4)
    .transform((s) => s.toUpperCase())
    .describe("ISO currency code such as INR, USD, EUR (default INR)"),
  items: z.array(lineItemSchema).min(1, "Add at least one line item").describe("Line items with quantity and unit price"),
  taxPercent: num(z.number().min(0).max(100)).describe("Tax percent applied after discount, e.g. 18 for GST (default 0)"),
  discount: money.describe("Flat discount amount in the quote currency (default 0)"),
  timeline: optText.describe("Delivery timeline, e.g. '3 weeks'"),
  terms: optText.describe("Payment terms, revision policy, what's included / excluded"),
  notes: optText.describe("Any extra note to the client"),
  validUntil: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validUntil must be YYYY-MM-DD")])
    .optional()
    .describe("Last day the client can accept, YYYY-MM-DD"),
};

/** Fields Claude may omit when creating a quote, and what they default to. */
const createDefaults = { currency: "INR", taxPercent: 0, discount: 0 } as const;

export const quoteCreateShape = {
  ...quoteContentShape,
  currency: quoteContentShape.currency.optional(),
  taxPercent: quoteContentShape.taxPercent.optional(),
  discount: quoteContentShape.discount.optional(),
};

export const quoteContentSchema = z.object(quoteCreateShape);
// No defaults here: an update must only touch the fields it names.
export const quoteUpdateSchema = z.object(quoteContentShape).partial();

function toValidationError(err: z.ZodError) {
  return validation(
    err.issues.map((i) => `${i.path.join(".") || "quote"}: ${i.message}`).join("; "),
  );
}

export function parseContent(input: unknown): QuoteContent {
  const r = quoteContentSchema.safeParse(input);
  if (!r.success) throw toValidationError(r.error);
  const d = r.data;
  if (d.validUntil === "") delete d.validUntil;
  return {
    ...d,
    currency: d.currency ?? createDefaults.currency,
    taxPercent: d.taxPercent ?? createDefaults.taxPercent,
    discount: d.discount ?? createDefaults.discount,
  } as QuoteContent;
}

export function parseUpdate(input: unknown): Partial<QuoteContent> {
  const r = quoteUpdateSchema.safeParse(input ?? {});
  if (!r.success) throw toValidationError(r.error);
  // drop keys zod filled with undefined so they don't overwrite stored values
  return Object.fromEntries(
    Object.entries(r.data).filter(([, v]) => v !== undefined),
  ) as Partial<QuoteContent>;
}
