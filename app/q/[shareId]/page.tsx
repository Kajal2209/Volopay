import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuoteByShareId, isExpired, toPublicQuote } from "@/lib/store";
import { ClientQuote } from "./ClientQuote";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const q = await getQuoteByShareId((await params).shareId);
  return {
    title: q ? `${q.title} – quote from ${q.from.name}` : "Quote",
    robots: { index: false },
  };
}

export default async function ClientPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const q = await getQuoteByShareId(shareId);
  if (!q) notFound();
  return <ClientQuote initial={toPublicQuote(q)} expired={isExpired(q)} />;
}
