import { notFound } from "@/lib/errors";
import { editorCookie, handle, readCookie } from "@/lib/http";
import { getQuoteByShareId, markViewed } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  return handle(async () => {
    const q = await getQuoteByShareId(shareId);
    if (!q) throw notFound("Quote not found.");
    // The freelancer previewing their own quote shouldn't count as the client viewing it.
    if (readCookie(req, editorCookie(q.editId))) return { status: q.status };
    return { status: (await markViewed(shareId)).status };
  });
}
