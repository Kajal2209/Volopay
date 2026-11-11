import { handle, jsonBody } from "@/lib/http";
import { acceptQuote, toPublicQuote } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const { name } = await jsonBody(req);
  return handle(async () => ({ quote: toPublicQuote(await acceptQuote(shareId, String(name ?? ""))) }));
}
