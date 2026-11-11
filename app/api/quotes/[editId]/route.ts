import { notFound } from "@/lib/errors";
import { handle, jsonBody } from "@/lib/http";
import { getQuoteByEditId, updateQuote } from "@/lib/store";
import { computeTotals } from "@/lib/totals";
import type { Quote } from "@/lib/types";

type Ctx = { params: Promise<{ editId: string }> };

// The edit link grants one quote, not the whole workspace: never send the workspace key.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const forEditor = ({ workspaceKey, ...q }: Quote) => ({ quote: q, totals: computeTotals(q) });

export async function GET(_req: Request, { params }: Ctx) {
  const { editId } = await params;
  return handle(async () => {
    const quote = await getQuoteByEditId(editId);
    if (!quote) throw notFound("Quote not found.");
    return forEditor(quote);
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { editId } = await params;
  const { baseUpdatedAt, ...patch } = await jsonBody(req);
  return handle(async () =>
    forEditor(
      await updateQuote(editId, patch, {
        baseUpdatedAt: typeof baseUpdatedAt === "string" ? baseUpdatedAt : undefined,
      }),
    ),
  );
}
