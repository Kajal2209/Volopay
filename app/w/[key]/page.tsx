import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getWorkspace, listQuotes } from "@/lib/store";
import { computeTotals, formatMoney } from "@/lib/totals";
import { timeAgo } from "@/lib/format";
import { baseUrlFromHeaders, mcpUrl } from "@/lib/urls";
import { DEMO_KEY } from "@/lib/seed";
import { StatusBadge, TopBar, btn } from "@/app/components/bits";
import { UrlField } from "@/app/components/CopyButton";
import { NewQuoteButton } from "./NewQuoteButton";

export const dynamic = "force-dynamic";

export default async function Dashboard({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const ws = await getWorkspace(key);
  if (!ws) notFound();
  const quotes = await listQuotes(key);
  const base = baseUrlFromHeaders(await headers());
  const accepted = quotes.filter((q) => q.status === "accepted");
  const won = accepted.reduce((s, q) => s + computeTotals(q).total, 0);
  const oneCurrency = accepted.every((q) => q.currency === accepted[0]?.currency);
  const isDemo = key === DEMO_KEY;

  return (
    <main>
      <TopBar>
        <Link className={btn.ghost} href="/">
          Connect Claude
        </Link>
      </TopBar>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{isDemo ? "Demo workspace" : "Your quotes"}</h1>
            <p className="mt-1 text-muted">
              {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
              {accepted.length > 0 &&
                (oneCurrency ? (
                  <>
                    , {accepted.length} accepted worth{" "}
                    <span className="font-medium text-ink">{formatMoney(won, accepted[0].currency)}</span>
                  </>
                ) : (
                  <>, {accepted.length} accepted</>
                ))}
            </p>
          </div>
          <NewQuoteButton wsKey={key} />
        </div>

        {isDemo && (
          <p className="mt-6 rounded-md border border-rule bg-paper px-4 py-3 text-sm">
            This shared demo is open to everyone and resets every 30 minutes. For your own private workspace, use{" "}
            <Link className={btn.ghost} href="/">
              Get my workspace
            </Link>
            .
          </p>
        )}

        {quotes.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-rule bg-paper p-8">
            <h2 className="text-lg font-semibold">No quotes yet</h2>
            <p className="mt-1 max-w-xl text-muted">
              Ask Claude for one. Try: “Create a quote for Acme Corp for a 5-page website, 2 revision rounds, 50% upfront,
              in INR.” It will show up here.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg border border-rule bg-paper">
            <ul className="divide-y divide-rule">
              {quotes.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1 basis-60">
                    <Link href={`/edit/${q.editId}`} className="font-medium hover:underline">
                      {q.title}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {q.client.name}
                      {q.client.company && `, ${q.client.company}`}
                    </p>
                  </div>
                  <span className="money font-medium sm:w-32 sm:text-right">
                    {formatMoney(computeTotals(q).total, q.currency)}
                  </span>
                  <span className="w-24">
                    <StatusBadge status={q.status} />
                  </span>
                  <span className="w-24 text-sm text-muted">{timeAgo(q.updatedAt)}</span>
                  <span className="flex gap-4">
                    <Link className={btn.ghost} href={`/edit/${q.editId}`}>
                      {q.status === "accepted" ? "Open" : "Edit"}
                    </Link>
                    <Link className={btn.ghost} href={`/q/${q.shareId}`} target="_blank">
                      Client view
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isDemo && (
          <section className="mt-10 max-w-2xl">
            <h2 className="font-semibold">Your Claude connector link</h2>
            <p className="mb-3 text-sm text-muted">
              Add it in Claude under Settings → Connectors → Add custom connector.
            </p>
            <UrlField url={mcpUrl(base, key)} label="Copy link" />
          </section>
        )}
      </div>
    </main>
  );
}
