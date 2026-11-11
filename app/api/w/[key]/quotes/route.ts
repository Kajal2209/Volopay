import { handle } from "@/lib/http";
import { createQuote } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return handle(async () => {
    const q = await createQuote(key, {
      title: "Untitled quote",
      from: { name: "Your name" },
      client: { name: "Client name" },
      items: [{ description: "Item", quantity: 1, unitPrice: 0 }],
    });
    return { editId: q.editId };
  });
}
