"use client";

import Link from "next/link";
import { useState } from "react";
import { btn } from "@/app/components/bits";
import { CopyButton, UrlField } from "@/app/components/CopyButton";

interface Ws {
  key: string;
  mcpUrl: string;
}

const PLACEHOLDER = "https://…/api/mcp?ws=YOUR-KEY";

export function ConnectGuide({ initial }: { initial: Ws | null }) {
  const [ws, setWs] = useState<Ws | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = ws?.mcpUrl ?? PLACEHOLDER;
  const codeCmd = `claude mcp add --transport http --scope user quotelink "${url}"`;

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", { method: "POST" });
      if (!res.ok) throw new Error();
      setWs(await res.json());
    } catch {
      setError("Couldn't create a workspace. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-12">
      <section className="rounded-lg border border-rule bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Your connector link</h2>
        {ws ? (
          <>
            <p className="mb-3 mt-1 text-sm text-muted">
              Private to you. Every quote Claude creates with it lands in{" "}
              <Link className={btn.ghost} href={`/w/${ws.key}`}>
                your dashboard
              </Link>
              .
            </p>
            <UrlField url={ws.mcpUrl} label="Copy link" />
          </>
        ) : (
          <>
            <p className="mb-4 mt-1 text-sm text-muted">
              You need one before connecting. It&rsquo;s free, with no sign-up, and the steps below fill in with it.
            </p>
            <button className={btn.primary} onClick={create} disabled={busy}>
              {busy ? "Creating…" : "Get my workspace"}
            </button>
            {error && <p className="mt-2 text-sm text-decline">{error}</p>}
          </>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Claude on the web or desktop app</h2>
        <ol className="mt-5 space-y-4">
          <Step n={1} title="Open connector settings">
            In Claude, go to <b className="font-medium text-ink">Settings → Connectors</b> and choose{" "}
            <b className="font-medium text-ink">Add custom connector</b>.
          </Step>
          <Step n={2} title="Paste your link">
            Name it <code className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[0.9em] text-ink">QuoteLink</code>, paste your connector link as
            the URL, and add it. No sign-in is needed.
          </Step>
          <Step n={3} title="Turn it on in a chat">
            Start a new chat, open the tools menu, make sure <b className="font-medium text-ink">QuoteLink</b> is
            switched on, then describe the job.
          </Step>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Claude Code</h2>
        <ol className="mt-5 space-y-4">
          <Step n={1} title="Add QuoteLink in your terminal">
            <span className="block">Run this once. It makes QuoteLink available in every project.</span>
            <span className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="money block min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md bg-ink px-3 py-2.5 text-sm text-white">
                {codeCmd}
              </code>
              {ws && <CopyButton text={codeCmd} label="Copy command" variant="primary" />}
            </span>
          </Step>
          <Step n={2} title="Check it's connected">
            Start <code className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[0.9em] text-ink">claude</code> and type{" "}
            <code className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[0.9em] text-ink">/mcp</code>. QuoteLink should be listed as
            connected.
          </Step>
          <Step n={3} title="Ask for a quote">
            For example: &ldquo;Use QuoteLink to create a quote for Acme Corp for the API integration we just scoped, 3
            weeks, 40% upfront.&rdquo; Claude Code can price work straight from the code it&rsquo;s looking at.
          </Step>
        </ol>
        <p className="mt-4 text-sm text-muted">
          To remove it later: <code className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[0.9em] text-ink">claude mcp remove quotelink</code>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">What you can ask</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            "Create a quote for Acme Corp: a 5-page marketing website, 2 revision rounds, 50% upfront, in INR, valid for 14 days.",
            "Show me all my quotes and which ones the client has opened.",
            "Did Brew Lab accept the retainer quote?",
            "Acme declined. Revise it with a 10% discount and a shorter timeline.",
          ].map((p) => (
            <li key={p} className="rounded-md border border-rule bg-paper px-4 py-3 text-[15px]">
              “{p}”
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-rule pt-8">
        <h2 className="text-lg font-semibold">If something doesn&rsquo;t work</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-medium">Claude says &ldquo;Unknown QuoteLink workspace&rdquo;</dt>
            <dd className="text-muted">The link was cut off or mistyped. Copy it again from this page and re-add the connector.</dd>
          </div>
          <div>
            <dt className="font-medium">Claude doesn&rsquo;t use QuoteLink</dt>
            <dd className="text-muted">
              Check it&rsquo;s switched on for the chat (web/desktop) or listed in <code>/mcp</code> (Claude Code), then
              mention QuoteLink by name in your request.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Using a different browser</dt>
            <dd className="text-muted">
              Your workspace lives in your connector link, not your browser. Open the dashboard link Claude gives you
              after creating a quote.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="money flex size-7 shrink-0 items-center justify-center rounded-full border border-ink text-sm font-semibold">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <div className="text-muted">{children}</div>
      </div>
    </li>
  );
}
