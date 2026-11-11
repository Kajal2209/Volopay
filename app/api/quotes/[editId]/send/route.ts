import { handle } from "@/lib/http";
import { markSent } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ editId: string }> }) {
  const { editId } = await params;
  return handle(async () => {
    const q = await markSent(editId);
    return { status: q.status, updatedAt: q.updatedAt };
  });
}
