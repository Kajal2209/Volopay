import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AppError, notFound } from "./errors";
import { quoteCreateShape, quoteContentShape } from "./schema";
import * as store from "./store";
import { computeTotals, formatMoney } from "./totals";
import type { Quote } from "./types";
import { dashboardUrl, editUrl, shareUrl } from "./urls";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const STATUS_LABEL: Record<Quote["status"], string> = {
  draft: "Draft (not sent yet)",
  sent: "Sent",
  viewed: "Viewed by client",
  accepted: "Accepted",
  declined: "Declined",
};

function describeQuote(q: Quote, base: string): string {
  const t = computeTotals(q);
  const lines = [
    `**${q.title}** for ${q.client.name}${q.client.company ? ` (${q.client.company})` : ""}`,
    `Total: ${formatMoney(t.total, q.currency)}  ·  Status: ${STATUS_LABEL[q.status]}`,
  ];
  if (q.acceptedBy) lines.push(`Accepted by ${q.acceptedBy.name} at ${q.acceptedBy.at}`);
  if (q.declinedReason) lines.push(`Client's reason for declining: ${q.declinedReason}`);
  lines.push(
    `Edit link (private, for you): ${editUrl(base, q.editId)}`,
    `Client link (send this to the client): ${shareUrl(base, q.shareId)}`,
    `editId: ${q.editId}`,
  );
  return lines.join("\n");
}

const ok = (text: string): ToolResult => ({ content: [{ type: "text", text }] });
const fail = (text: string): ToolResult => ({ content: [{ type: "text", text }], isError: true });

async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) return fail(e.message);
    console.error("[quotelink mcp]", e);
    return fail("QuoteLink hit an unexpected error. Please try again.");
  }
}

export function buildMcpServer(wsKey: string, base: string): McpServer {
  const server = new McpServer(
    { name: "quotelink", version: "1.0.0" },
    {
      instructions:
        "QuoteLink stores client quotes and hosts them at a link where the client can accept online. " +
        "You write the quote content; QuoteLink saves it, lets the user edit it, and tracks whether the client viewed or accepted it. " +
        "After creating or updating a quote, always show the user both the edit link and the client link.",
    },
  );

  async function ownQuote(editId: string): Promise<Quote> {
    const q = await store.getQuoteByEditId(editId);
    if (!q || q.workspaceKey !== wsKey) throw notFound("No quote with that editId in this workspace.");
    return q;
  }

  server.registerTool(
    "create_quote",
    {
      title: "Create quote",
      description:
        "Create a client-ready quote in QuoteLink. Write specific, well-scoped line items with realistic prices for the market and currency, " +
        "include a delivery timeline and clear payment terms (deposit, revisions, what's excluded). " +
        "Only ask the user first if the client's name or the currency is genuinely unknown. " +
        "Afterwards, show the user BOTH links and suggest they review the edit link before sending the client link.",
      inputSchema: quoteCreateShape,
    },
    (args) =>
      guard(async () => {
        const q = await store.createQuote(wsKey, args);
        return ok(`Quote created.\n\n${describeQuote(q, base)}`);
      }),
  );

  server.registerTool(
    "list_quotes",
    {
      title: "List quotes",
      description: "List every quote in this QuoteLink workspace with its total, status (draft/sent/viewed/accepted/declined) and links.",
      annotations: { readOnlyHint: true },
    },
    () =>
      guard(async () => {
        const quotes = await store.listQuotes(wsKey);
        if (!quotes.length) return ok(`No quotes yet. Dashboard: ${dashboardUrl(base, wsKey)}`);
        return ok(
          `${quotes.length} quote(s). Dashboard: ${dashboardUrl(base, wsKey)}\n\n` +
            quotes.map((q) => describeQuote(q, base)).join("\n\n"),
        );
      }),
  );

  server.registerTool(
    "get_quote",
    {
      title: "Get quote",
      description: "Get one quote's full content and current status (for example to check whether the client accepted).",
      inputSchema: { editId: z.string().min(1).describe("The quote's editId") },
      annotations: { readOnlyHint: true },
    },
    ({ editId }) =>
      guard(async () => {
        const q = await ownQuote(editId);
        const items = q.items
          .map((i) => `- ${i.description}: ${i.quantity} × ${formatMoney(i.unitPrice, q.currency)}`)
          .join("\n");
        const extra = [
          q.timeline && `Timeline: ${q.timeline}`,
          q.terms && `Terms: ${q.terms}`,
          q.notes && `Notes: ${q.notes}`,
          q.validUntil && `Valid until: ${q.validUntil}`,
          `Tax: ${q.taxPercent}%  ·  Discount: ${formatMoney(q.discount, q.currency)}`,
        ]
          .filter(Boolean)
          .join("\n");
        return ok(`${describeQuote(q, base)}\n\nItems:\n${items}\n\n${extra}`);
      }),
  );

  server.registerTool(
    "update_quote",
    {
      title: "Update quote",
      description:
        "Change an existing quote. Pass only the fields to change; `items`, if given, replaces the whole list. " +
        "Accepted quotes are locked: use revise_quote to make a new version instead.",
      inputSchema: {
        editId: z.string().min(1).describe("The quote's editId"),
        ...Object.fromEntries(Object.entries(quoteContentShape).map(([k, v]) => [k, v.optional()])),
      } as { editId: z.ZodString } & { [K in keyof typeof quoteContentShape]: z.ZodOptional<(typeof quoteContentShape)[K]> },
    },
    ({ editId, ...patch }) =>
      guard(async () => {
        await ownQuote(editId);
        const q = await store.updateQuote(editId, patch);
        return ok(`Quote updated.\n\n${describeQuote(q, base)}`);
      }),
  );

  server.registerTool(
    "revise_quote",
    {
      title: "Revise quote",
      description:
        "Copy an existing quote (usually an accepted or declined one) into a new editable draft with new links. The original stays unchanged.",
      inputSchema: { editId: z.string().min(1).describe("The editId of the quote to copy") },
    },
    ({ editId }) =>
      guard(async () => {
        await ownQuote(editId);
        const q = await store.reviseQuote(editId);
        return ok(`New draft created from the original.\n\n${describeQuote(q, base)}`);
      }),
  );

  return server;
}
