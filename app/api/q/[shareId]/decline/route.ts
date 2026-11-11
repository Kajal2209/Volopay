import { handle, jsonBody } from "@/lib/http";
import { declineQuote, toPublicQuote } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const { reason } = await jsonBody(req);
  return handle(async () => ({
    quote: toPublicQuote(await declineQuote(shareId, reason ? String(reason) : undefined)),
  }));
}
