import { handle } from "@/lib/http";
import { reviseQuote } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ editId: string }> }) {
  const { editId } = await params;
  return handle(async () => ({ editId: (await reviseQuote(editId)).editId }));
}
