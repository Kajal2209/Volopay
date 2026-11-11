import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getQuoteByShareId, getWorkspace } from "@/lib/store";
import { WS_COOKIE } from "@/lib/http";
import { baseUrlFromHeaders, dashboardUrl, mcpUrl } from "@/lib/urls";
import { formatDate } from "@/lib/format";
import { QuoteDocument } from "./components/QuoteDocument";
import { GetWorkspace } from "./components/GetWorkspace";
import { Stamp, TopBar, btn } from "./components/bits";

export const dynamic = "force-dynamic";

const PROMPTS = [
  "Create a quote for Acme Corp: a 5-page marketing website, 2 revision rounds, 50% upfront, in INR, valid for 14 days.",
  "Quote Brew Lab Coffee for a monthly social media retainer: 12 posts and 4 reels a month.",
  "Did Acme accept my quote yet? If they declined, revise it with a 10% discount.",
];

export default async function Home() {
  const base = baseUrlFromHeaders(await headers());
  const key = (await cookies()).get(WS_COOKIE)?.value;
  const ws = key ? await getWorkspace(key) : null;
  const initial = ws ? { key: ws.key, mcpUrl: mcpUrl(base, ws.key), dashboardUrl: dashboardUrl(base, ws.key) } : null;
  const sample = await getQuoteByShareId("demo-share-2");

  return (
    <main>
      <TopBar>
        {ws && (
          <Link className={btn.ghost} href={`/w/${ws.key}`}>
            My dashboard
          </Link>
        )}
        <Link className={btn.ghost} href="/w/demo">
          Demo
        </Link>
      </TopBar>

      <section className="mx-auto grid max-w-5xl gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-20">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            Your Claude writes the quote. QuoteLink gets it signed.
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg text-muted">
            Tell Claude what the job is. The quote lands in QuoteLink, where you tweak the numbers and send your client
            one link. They open it, type their name, and accept. You see it happen.
          </p>
          <div className="mt-8 rounded-lg border border-rule bg-paper p-5">
            <GetWorkspace initial={initial} />
          </div>
        </div>

        {sample && (
          <div className="relative lg:pl-6" aria-label="Example of an accepted quote">
            <div className="absolute inset-x-6 -bottom-3 top-3 rotate-2 rounded-sm border border-rule bg-paper/70 lg:inset-x-10" aria-hidden />
            <div className="relative -rotate-1">
              <QuoteDocument
                compact
                quote={sample}
                stamp={
                  sample.acceptedBy && (
                    <Stamp kind="accepted" name={sample.acceptedBy.name} date={formatDate(sample.acceptedBy.at)} land />
                  )
                }
              />
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-rule bg-paper">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Connect it to Claude</h2>
            <ol className="mt-6 space-y-5">
              {[
                ["Get your connector link", "Use the button above. It's private to you."],
                [
                  "Add it to Claude",
                  "In Claude, open Settings → Connectors → Add custom connector. Name it QuoteLink and paste your link.",
                ],
                ["Ask for a quote", "In a new chat, turn on QuoteLink from the tools menu and describe the job."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="money flex size-7 shrink-0 items-center justify-center rounded-full border border-ink text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link className={`${btn.ghost} mt-6 inline-block`} href="/connect">
              Full setup guide, including Claude Code
            </Link>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Things to ask Claude</h2>
            <ul className="mt-6 space-y-3">
              {PROMPTS.map((p) => (
                <li key={p} className="rounded-md border border-rule bg-desk/50 px-4 py-3 text-[15px]">
                  “{p}”
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold">Claude does the writing</h3>
            <p className="mt-1 text-muted">Scope, line items, prices and terms come from your own Claude plan.</p>
          </div>
          <div>
            <h3 className="font-semibold">You stay in control</h3>
            <p className="mt-1 text-muted">Every quote opens in an editor. Change a price and the totals update.</p>
          </div>
          <div>
            <h3 className="font-semibold">Your client just clicks Accept</h3>
            <p className="mt-1 text-muted">
              No PDFs, no &ldquo;please sign and scan&rdquo;. You see when they viewed it and when they said yes.
            </p>
          </div>
        </div>
        <p className="mt-12 border-t border-rule pt-6 text-sm text-muted">
          QuoteLink has no AI inside. Your own Claude does the writing; QuoteLink keeps it live.{" "}
          <Link className={btn.ghost} href="/w/demo">
            Browse the demo workspace
          </Link>
        </p>
      </section>
    </main>
  );
}
